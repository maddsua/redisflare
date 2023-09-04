import type { APIResponse, ClientRequest } from '../../types/restapi.ts';
import type { AccessToken } from '../../types/auth.ts';

const mkRestResponse = (response: APIResponse, statusCode?: number, headers?: Record<string, string>) => new Response(JSON.stringify(response), {
	headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
	status: statusCode || response.success ? 200 : 400
});

export default async (request: Request, env: Deno.Env) => {

	//	setup access tokens
	const authTokens: AccessToken[] = [
		{
			key: env.get('MASTER_TOKEN') as string,
			write_access: true
		},
		{
			key: env.get('PUBLIC_TOKEN') as string,
			write_access: false
		}
	].filter(item => item.key);

	//	check that this worker has at least one access token to compare to
	if (!authTokens.length) {
		console.error('No valid auth token found for this worker');
		return mkRestResponse({
			success: false,
			error_text: 'server configuration error'
		}, 503);
	}

	//	construct a request URL object
	const requestUrl = new URL(request.url);

	//	handle worker health check request
	if (requestUrl.pathname === '/health') {

		if (requestUrl.searchParams.get('report') === 'json') return mkRestResponse({
			success: true,
			date: new Date().getTime()
		});

		return new Response(null, {
			status: 200
		});
	}

	//	retrieve request payload
	const isJsonContentType = request.headers.get('content-type')?.includes('json');
	const requestPayload = isJsonContentType ? await (() => new Promise<ClientRequest | null>(resolve => (async () => {
		const body = await request.text();
		resolve(JSON.parse(body));
	})().catch(_error => resolve(null))))() : null;

	//	look for access token on client and compate it to the valid one
	const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s/, '') || requestUrl.searchParams.get('token') || requestPayload?.auth_token;

	//	reject request if not authorized
	const auth = authTokens.find(item => item.key === bearer);
	if (!auth) {

		console.error('Unsuccessful login attempt from:'/*, clientMetadata(request)*/);

		//	fake required time to make a timing attack harder
		await new Promise<void>(resolve => setTimeout(resolve, Math.round(Math.random() * 500)));

		return mkRestResponse({
			success: false,
			error_text: 'unauthorized: provide a valid token to continue'
		}, 403);
	}

	//	handle auth check request
	if (requestUrl.pathname === '/auth') {

		if (requestUrl.searchParams.get('report') === 'json') return mkRestResponse({
			success: true,
			rights: auth.write_access ? 'rw' : 'r'
		}, 204);

		return new Response(null, {
			status: 204
		});
	}

	//	perform CRUD operations
	if (['/', '/crud'].some(url => requestUrl.pathname === url)) {

		const record_id = requestUrl.searchParams.get('record_id') || requestPayload?.record_id;

		//	check that we have a record id
		if (typeof record_id !== 'string' || !record_id?.length) return mkRestResponse({
			success: false,
			error_text: 'record_id is not provided or is empty'
		}, 400);

		//	check that record_id is not too long
		/*if (record_id.length > cf_limits.max_key_size) {
			console.error('Record ID is too long');
			return mkRestResponse({
				success: false,
				error_text: `record_id is too long. ${cf_limits.max_key_size} bytes MAX`
			}, 400);
		}*/

		//	perform CRUD ops depending on http method
		try {

			if (request.method === 'OPTIONS') {

				return new Response(null, {
					headers: {
						Allow: 'OPTIONS, GET, POST, PUT, PATCH, DELETE'
					},
					status: 204
				});

			} else if (request.method === 'GET') {
				const recordContent = localStorage.getItem(record_id);
				return mkRestResponse({
					success: true,
					context: 'read',
					data: recordContent || null
				});
			
			} else if (!auth.write_access) {

				return mkRestResponse({
					success: false,
					error_text: 'write access denied'
				});

			} else if (['POST', 'PUT', 'PATCH'].some(method => method === request.method)) {

				const recordContent = requestPayload?.data || requestUrl.searchParams.get('data') || await request.text();
				let successWriteCode = 200;
				let successWriteText: 'create' | 'update' = 'update';

				//	check that we have some data to write
				if (!recordContent?.length) {
					console.warn('No data set');
					return mkRestResponse({
						success: false,
						error_text: 'no data payload received'
					}, 400);
				}

				//	and the data is not too big
				/*if (recordContent.length > cf_limits.max_record_size) {
					console.warn('Data length too long');
					return mkRestResponse({
						success: false,
						error_text: `data size too big. ${cf_limits.max_record_size} bytes MAX`
					}, 400);
				}*/

				//	PATCH can only be used to update existing record
				if (request.method === 'PATCH') {
					successWriteCode = 202;
					const existingRecord = localStorage.getItem(record_id);
					if (!existingRecord) return mkRestResponse({
						success: false,
						error_text: `cannot update record: record does not exist`
					}, 400);
				
				}
				
				//	PUT can only be used to create a new record
				else if (request.method === 'PUT') {
					successWriteCode = 201;
					successWriteText = 'create';
					const existingRecord = localStorage.getItem(record_id);
					if (existingRecord) return mkRestResponse({
						success: false,
						error_text: `cannot create record: record already exist`
					}, 400);
				}

				//	POST method just bypasses the previous logic altogether

				//	perform write and return
				await localStorage.setItem(record_id, recordContent);

				return mkRestResponse({
					success: true,
					context: successWriteText,
				}, successWriteCode);

			} else if (request.method === 'DELETE') {

				//	delete record
				await localStorage.removeItem(record_id);

				return mkRestResponse({
					success: true,
					context: 'delete'
				}, 202);
			}
			
		} catch (error) {
			console.error('CRUD operation failed:', error);
			return mkRestResponse({
				success: false,
				error_text: 'CRUD operation failed'
			}, 500);
		}

		return mkRestResponse({
			success: false,
			error_text: 'unsupported http method'
		}, 405)
	}

	//	extended kv ops

	//	list all records
	if (requestUrl.pathname === '/list') {

		if (!auth.write_access) {
			return mkRestResponse({
				success: false,
				error_text: 'write access is required to list records'
			}, 403);

		} else if (request.method !== 'GET') {
			console.warn('Invalid method for LIST operation');
			return mkRestResponse({
				success: false,
				error_text: 'you cannot mutate data using this operation'
			}, 405, { 'Allow': 'GET' });
		}

		try {

			const list = Object.entries(localStorage);

			return mkRestResponse({
				success: true,
				entries: list.map(([key, _value]) => ({
					record_id: key,
				})),
				list_complete: true
			}, 200);
			
		} catch (error) {
			console.error('LIST operation failed:', error);
			return mkRestResponse({
				success: false,
				error_text: 'LIST operation failed'
			}, 500);
		}
	}

	//	fallback response
	return mkRestResponse({
		success: false,
		error_text: 'requested path did not match any'
	}, 400);

};

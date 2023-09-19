import type { Env } from './env';
import type { StorageInterface } from './storage';
import type { MutationRequest } from '../../types/restapi';
import type { AccessToken } from '../../types/auth';

import { mkRestResponse } from './rest';
import { ServerError } from './error';

export default async (request: Request, env: Env, kvstore: StorageInterface) => {

	//	setup access tokens
	const authTokens: AccessToken[] = [
		{
			key: env.MASTER_TOKEN as string,
			write_access: true
		},
		{
			key: env.PUBLIC_TOKEN as string,
			write_access: false
		}
	].filter(item => item.key);

	try {

		//	check that this worker has at least one access token to compare to
		if (!authTokens.length)
			throw new ServerError('No valid auth token found for this worker', 'server configuration error', 503);

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
		const requestPayload = isJsonContentType ? await (() => new Promise<MutationRequest | null>(resolve => (async () => {
			const body = await request.text();
			resolve(JSON.parse(body));
		})().catch(_error => resolve(null))))() : null;
		
		//	look for access token on client and compate it to the valid one
		const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s/, '') || requestUrl.searchParams.get('token') || requestPayload?.auth_token;

		//	reject request if not authorized
		const auth = authTokens.find(item => item.key === bearer);
		if (!auth) {
			//	fake required time to make a timing attack harder
			await new Promise<void>(resolve => setTimeout(resolve, Math.round(Math.random() * 500)));
			throw new ServerError('Unsuccessful login attempt', 'unauthorized: provide a valid token to continue', 403);
		}

		//	handle auth check request
		if (requestUrl.pathname === '/auth') {

			if (requestUrl.searchParams.get('report') === 'json') return mkRestResponse({
				success: true,
				rights: auth.write_access ? 'rw' : 'r'
			});

			return new Response(null, {
				status: 200
			});
		}

		//	perform CRUD operations
		if (['/', '/crud'].some(url => requestUrl.pathname === url)) {

			const record_id = requestUrl.searchParams.get('record_id') || requestPayload?.record_id;

			//	check that we have a record id
			if (typeof record_id !== 'string' || !record_id?.length)
				throw new ServerError('record_id is not provided or is empty');

			//	perform CRUD ops depending on http method
			if (request.method === 'OPTIONS') {

				return new Response(null, {
					headers: {
						Allow: 'OPTIONS, GET, POST, PUT, PATCH, DELETE'
					},
					status: 204
				});

			} else if (request.method === 'GET') {

				const recordContent = await kvstore.read(record_id);
				return mkRestResponse({
					success: true,
					context: 'read',
					data: recordContent || null
				});
			
			} else if (!auth.write_access) {

				throw new ServerError(`write access denied for record: "${record_id}"`, undefined, 400);

			} else if (['POST', 'PUT', 'PATCH'].some(method => method === request.method)) {

				const isTextContentType = request.headers.get('content-type')?.includes('text');
				const recordContent = requestPayload?.data || (isTextContentType ? await request.text() : undefined);

				let successWriteCode = 200;
				let successWriteText: 'create' | 'update' = 'update';

				//	check that we have some data to write
				if (!recordContent?.length)
					throw new ServerError(`no data payload received for record: "${record_id}"`, undefined, 400);

				//	PATCH can only be used to update existing record
				if (request.method === 'PATCH') {
					successWriteCode = 202;
					const existingRecord = await kvstore.read(record_id);
					if (!existingRecord) throw new ServerError(`cannot update record: record "${record_id}" record does not exist`, undefined, 400);
				}
				
				//	PUT can only be used to create a new record
				else if (request.method === 'PUT') {
					successWriteCode = 201;
					successWriteText = 'create';
					const existingRecord = await kvstore.read(record_id);
					if (existingRecord) throw new ServerError(`cannot create record: record "${record_id}" already exist`, undefined, 400);
				}

				//	POST method just bypasses the previous logic altogether
				//	perform write and return
				await kvstore.write(record_id, recordContent);

				return mkRestResponse({
					success: true,
					context: successWriteText,
				}, successWriteCode);

			} else if (request.method === 'DELETE') {

				//	delete record
				await kvstore.delete(record_id);

				return mkRestResponse({
					success: true,
					context: 'delete'
				}, 202);
			}

			throw new ServerError('unsupported http method', undefined, 405);
		}

		//	extended kv ops
		//	list all records
		if (requestUrl.pathname === '/list') {

			if (!auth.write_access) {

				throw new ServerError('write access is required to list records', undefined, 403);

			} else if (request.method !== 'GET') {
				console.warn('Invalid method for LIST operation');
				return mkRestResponse({
					success: false,
					error_text: 'you cannot mutate data using this operation'
				}, 405, { 'Allow': 'GET' });
			}

			const list = await kvstore.list({
				prefix: requestUrl.searchParams.get('prefix'),
				cursor: requestUrl.searchParams.get('page')
			});

			return mkRestResponse({
				success: true,
				entries: list.keys.map(item => ({
					record_id: item.name,
					expiration: item.expiration,
					metadata: item.metadata
				})),
				next_page: list.cursor,
				list_complete: list.list_complete
			}, 200);
		}
		
	} catch (error) {

		const isCustomError = error instanceof ServerError;
		
		console.error(`Request rejected:`, isCustomError ? error.message : error);

		return new Response(JSON.stringify({
			success: false,
			error_text: isCustomError ? error.clientMessage : 'unknown error'
		}), {
			headers: {
				'content-type': 'application/json'
			},
			status: isCustomError ? (error?.responseCode || 400) : 500
		});
	}

	//	fallback response
	return mkRestResponse({
		success: false,
		error_text: 'requested path did not match any'
	}, 400);
};

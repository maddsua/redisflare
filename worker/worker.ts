import { maybeJSON, clientMetadata } from "./rest";
import { RedisflareResponse } from '../apitypes';

const consts = {
	max_record_size: 26214400,
	max_key_size: 512
};

const methods = {
	set: '/set',
	get: '/get',
	delete: '/del',
	list: '/list'
};

interface Env {
	STORAGE: KVNamespace;
	AUTHTOKEN: string;
}

const apiRespond = (response: RedisflareResponse, statusCode?: number, headers?: HeadersInit) => new Response(JSON.stringify(response), {
	headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
	status: statusCode || response.error_text ? 400 : 200
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {

		//	check that the worker has a token to compare to
		const accessToken = env.AUTHTOKEN;
		if (typeof accessToken !== 'string') {
			console.error('No valid auth token found for this worker');
			return apiRespond({
				success: false,
				context: 'auth',
				error_text: 'Server configuration error'
			}, 503);
		}

		//	construct a URL objects
		const rqUrl = new URL(request.url);
		
		//	look for access token on client and compate it to the valid one
		const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s/, '') || rqUrl.searchParams.get('token');
		if (bearer !== accessToken) {

			console.error('Unsuccessful login attempt from:', clientMetadata(request));

			//	fake required time to make a timing attack harder
			await new Promise<void>(resolve => setTimeout(resolve, Math.round(Math.random() * 500)));

			return apiRespond({
				success: false,
				context: 'auth',
				error_text: 'Unauthorized: provide a valid token to continue'
			}, 403);
		}

		//	extract request data
		let recordID: string | null = rqUrl.searchParams.get('record_id');
		let recordSetData: string | null = rqUrl.searchParams.get('data');

		if (['PUT','POST'].some(method => method === request.method)) {
			const requestBody = await request.text();
			const possibleJSON = request.headers.get('content-type')?.includes('json') ? maybeJSON(requestBody) : null;
			recordSetData = recordSetData || possibleJSON?.['data'] || requestBody;
			recordID = recordID || possibleJSON?.['record_id'];
		}

		//	these methods require a valid record_id
		if ([
			methods.delete,
			methods.get,
			methods.set
		].some(method => method === rqUrl.pathname)) {

			//	check that we have a record id
			if (typeof recordID !== 'string') {
				console.warn('No record id for GET function');
				return apiRespond({
					success: false,
					context: 'get record',
					error_text: 'Record ID is not specified in search query params'
				}, 400);
			}

			//	check that record_id is not too long
			if (recordID.length > consts.max_key_size) {
				console.error('Record ID is too long');
				return apiRespond({
					success: false,
					context: 'get record',
					error_text: `Record ID is too long. ${consts.max_key_size} bytes MAX`
				}, 400);
			}
		}

		//	perform actions on KV
		switch (rqUrl.pathname) {
			
			case methods.get: {

				//	this action accepts only GET requests
				if (request.method !== 'GET') {
					console.warn('Invalid method for GET function');
					return apiRespond({
						success: false,
						context: 'get record',
						error_text: 'Request method must be GET'
					}, 405, {
						'Allow': 'GET'
					});
				}

				//	return the record
				return apiRespond({
					success: true,
					context: 'get',
					data: await env.STORAGE.get(recordID) || null
				});

			} break;

			case methods.set: {

				//	ensure correct http method
				if (!['GET','POST','PUT'].some(method => method === request.method)) {
					console.warn('Invalid method for SET function');
					return apiRespond({
						success: false,
						context: 'set record',
						error_text: 'Come on, just POST here'
					}, 405, {
						'Allow': 'GET, POST, PUT'
					});
				}

				//	check that we have some data to write
				if (!recordSetData?.length) {
					console.warn('No data set');
					return apiRespond({
						success: false,
						context: 'set record',
						error_text: 'Empty data field or body'
					}, 400);
				}

				//	and the data is not too big
				if (recordSetData.length > consts.max_record_size) {
					console.warn('Data length too long');
					return apiRespond({
						success: false,
						context: 'set record',
						error_text: 'Data length too long'
					}, 400);
				}

				//	perform write and return
				await env.STORAGE.put(recordID, recordSetData);

				return apiRespond({
					success: true,
					context: 'set record',
				}, 202);

			} break;

			case methods.delete: {

				//	ensure correct http method
				if (!['GET','DELETE'].some(method => method === request.method)) {
					console.warn('Invalid method for DEL function');
					return apiRespond({
						success: false,
						context: 'delete record',
						error_text: 'Request method must be GET or DELETE'
					}, 405, {
						'Allow': 'GET, DELETE'
					});
				}

				//	delete record
				await env.STORAGE.delete(recordID);

				return apiRespond({
					success: true,
					context: 'del'
				}, 202);

			} break;

			case methods.list: {

				//	ensure correct http method
				if (request.method !== 'GET') {
					console.warn('Invalid method for LIST function');
					return apiRespond({
						success: false,
						context: 'list records',
						error_text: 'Request method must be GET'
					}, 405, {
						'Allow': 'GET'
					});
				}

				const list = await env.STORAGE.list({
					prefix: rqUrl.searchParams.get('prefix'),
					cursor: rqUrl.searchParams.get('page')
				});

				return apiRespond({
					success: true,
					context: 'list records',
					data: list.keys.map(item => ({
						record_id: item.name,
						expiration: item.expiration,
						metadata: item.metadata
					})),
					next_page: list['cursor'],
					list_complete: list.list_complete
				}, 200);

			} break;
		
			default: break;
		}

		//	fallback response
		return apiRespond({
			success: false,
			context: 'none',
			error_text: 'Unknown command'
		}, 400)
	}
};

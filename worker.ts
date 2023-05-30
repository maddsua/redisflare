import { sleep, maybeJSON, RESTponse } from "./junk";

const consts = {
	max_record_size: 26214400,
	max_key_size: 512
};

const methods = {
	set: '/set',
	get: '/get',
	delete: '/del'
};

interface Env {
	STORAGE: KVNamespace
	AUTHTOKEN: string
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {

		//	check that the worker has a token to compare to
		const accessToken = env.AUTHTOKEN;
		if (typeof accessToken !== 'string') {
			console.error('No valid auth token found for this worker');
			return RESTponse({
				success: false,
				reason: 'Server configuration error'
			}, null, 503);
		}

		//	construct a URL object
		const url = new URL(request.url);
		
		//	check that the user has a valid token
		const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s/, '') || url.searchParams.get('token');
		if (bearer !== accessToken) {
			//	fake time that is required to perform token validation
			await sleep(Math.round(Math.random() * 250));
			return RESTponse({
				success: false,
				reason: 'Unauthorized: provide a valid token to continue'
			}, {
				'WWW-Authenticate': 'Bearer'
			}, 401);
		}

		//	extract request data
		let recordID: string | null = url.searchParams.get('record_id');
		let recordSetData: string | null = url.searchParams.get('data');

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
		].some(method => method === url.pathname)) {

			//	check that we have a record id
			if (typeof recordID !== 'string') {
				console.warn('No record id for GET function');
				return RESTponse({
					success: false,
					reason: 'Record ID is not specified in search query params'
				}, null, 400);
			}

			//	check that record_id is not too long
			if (recordID.length > consts.max_key_size) {
				console.error('Record ID is too long');
				return RESTponse({
					success: false,
					reason: `Record ID is too long. ${consts.max_key_size} bytes MAX`
				}, null, 400);
			}
		}

		//	perform actions on KV
		switch (url.pathname) {
			
			case methods.get: {

				//	this action accepts only GET requests
				if (request.method !== 'GET') {
					console.warn('Invalid method for GET function');
					return RESTponse(null, {
						'Allow': 'GET'
					}, 405);
				}

				//	return the record
				return RESTponse({
					success: true,
					context: 'get',
					data: await env.STORAGE.get(recordID) || null
				});

			} break;

			case methods.set: {

				//	ensure correct http method
				if (!['GET','POST','PUT'].some(method => method === request.method)) {
					console.warn('Invalid method for SET function');
					return RESTponse({
						success: false,
						reason: 'Come on, just POST here'
					}, {
						'Allow': 'GET, POST, PUT'
					}, 405);
				}

				//	check that we have some data to write
				if (!recordSetData?.length) {
					console.warn('No data set');
					return RESTponse({
						success: false,
						reason: 'Empty data field or body'
					}, null, 400);
				}

				//	and the data is not too big
				if (recordSetData.length > consts.max_record_size) {
					console.warn('Data length too long');
					return RESTponse({
						success: false,
						reason: 'Data length too long'
					}, null, 400);
				}

				//	perform write and return
				await env.STORAGE.put(recordID, recordSetData);

				return RESTponse({
					success: true,
					context: 'set'
				}, null, 202);

			} break;

			case methods.delete: {

				//	ensure correct http method
				if (!['GET','DELETE'].some(method => method === request.method)) {
					console.warn('Invalid method for DEL function');
					return RESTponse({
						success: false,
						reason: 'Must be GET or DELETE'
					}, {
						'Allow': 'GET, DELETE'
					}, 405);
				}

				//	delete record
				await env.STORAGE.delete(recordID);

				return RESTponse({
					success: true,
					context: 'del'
				}, null, 202);

			} break;
		
			default: break;
		}

		//	fallback response
		return RESTponse({
			success: false,
			reason: 'Unknown command'
		}, null, 400)
	}
};

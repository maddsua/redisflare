import { sleep, maybeJSON, RESTponse } from "./junk";

const consts = {
	max_record_size: 26214400,
	max_key_size: 512
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

		//	just to be a bit more comfy
		const url = new URL(request.url);
		const pathname = url.pathname;
		const recordID = url.searchParams.get('record_id');

		//	check that the user has a valid token
		const bearer = request.headers.get('Authorization')?.replace('Bearer', '')?.replace(/\s/g, '') || url.searchParams.get('token');
		if (bearer !== accessToken) {
			await sleep(Math.round(Math.random() * 100));
			return RESTponse({
				success: false,
				reason: 'Unauthorized: provide a valid token to continue'
			}, {
				'WWW-Authenticate': 'Bearer'
			}, 401);
		}

		//	perform actions on KV
		switch (pathname) {
			
			case '/get': {

				//	this action accepts only GET requests
				if (request.method !== 'GET') {
					console.warn('Invalid method for GET function');
					return RESTponse(null, {
						'Allow': 'GET'
					}, 405);
				}

				//	check that we have a record id
				if (!recordID) {
					console.warn('No record id for GET function');
					return RESTponse({
						success: false,
						reason: 'Record ID is not specified in search query params'
					}, null, 400);
				}

				//	check that record id is not too long
				if (recordID?.length > consts.max_key_size) {
					console.error('Record ID is too long');
					return RESTponse({
						success: false,
						reason: `Record ID is too long. ${consts.max_key_size} bytes MAX`
					}, null, 400);
				}

				//	return the record
				return RESTponse({
					success: true,
					context: 'get',
					data: await env.STORAGE.get(recordID) || null
				});

			} break;

			case '/set': {

				if (!['GET','POST'].some(method => method === request.method)) {
					console.warn('Invalid method for SET function');
					return RESTponse({
						success: false,
						reason: 'Come on, just POST here'
					}, {
						'Allow': 'GET, POST'
					}, 405);
				}

				let setRecordID: string;
				let setRecordData: string;

				if (request.method === 'GET') {
					setRecordID = recordID;
					setRecordData = url.searchParams.get('data');
				} else {
					const requestBody = await request.text();
					const possibleJSON = request.headers.get('content-type')?.includes('json') ? maybeJSON(requestBody) : null;
					setRecordID = possibleJSON?.['record_id'] || recordID;
					setRecordData = possibleJSON?.['data'] || requestBody;
				}

				//	check that we have a record id
				if (typeof setRecordID !== 'string') {
					console.warn('No record id for SET function');
					return RESTponse({
						success: false,
						reason: 'Record ID is not specified in search query params nor in the payload\'s record_id field'
					}, null, 400);
				}

				//	check that record id is not too long
				if (setRecordID?.length > consts.max_key_size) {
					console.error('Record ID is too long');
					return RESTponse({
						success: false,
						reason: `Record ID is too long. ${consts.max_key_size} bytes MAX`
					}, null, 400);
				}

				//	check that we have some data to write
				if (!setRecordData?.length) {
					console.warn('No data set');
					return RESTponse({
						success: false,
						reason: 'Empty data field or body'
					}, null, 400);
				}

				//	and the data is not too big
				if (setRecordData.length > consts.max_record_size) {
					console.warn('Data length too long');
					return RESTponse({
						success: false,
						reason: 'Data length too long'
					}, null, 400);
				}

				//	perform write and return
				await env.STORAGE.put(recordID, setRecordData);

				return RESTponse({
					success: true,
					context: 'set'
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

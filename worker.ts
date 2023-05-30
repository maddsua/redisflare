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

		//	just to be i bit more comfy
		const url = new URL(request.url);
		const pathname = url.pathname;
		const recordID = url.searchParams.get('id');

		if (recordID?.length > consts.max_key_size) {
			console.error('Record ID is too long');
			return RESTponse({
				success: false,
				reason: `Record ID is too long. ${consts.max_key_size} bytes MAX`
			}, null, 400);
		}

		//	check that the user has a valid token
		const bearer = request.headers.get('Authorization') || url.searchParams.get('token');
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

				if (request.method !== 'GET') {
					console.warn('Invalid method for GET function');
					return RESTponse(null, {
						'Allow': 'GET'
					}, 405);
				}

				if (!recordID) {
					console.warn('No record id for GET function');
					return RESTponse({
						success: false,
						reason: 'Record ID is not specified in search query params'
					}, null, 400);
				}

				return RESTponse({
					success: true,
					context: 'get',
					data: await env.STORAGE.get(recordID) || null
				});

			} break;

			case '/set': {

				if (request.method !== 'POST') {
					console.warn('Invalid method for GET function');
					return RESTponse({
						success: false,
						reason: 'Come on, just POST here'
					}, {
						'Allow': 'POST'
					}, 405);
				}

				const isJSON = request.headers.get('content-type')?.includes('json');
				const requestBody = await request.text();
				const data = isJSON ? maybeJSON(requestBody)?.['data'] : requestBody;

				if (!data?.length) {
					console.warn('No data set');
					return RESTponse({
						success: false,
						reason: 'Empty data field or body'
					}, null, 400);
				}

				if (data.length > consts.max_record_size) {
					console.warn('Data length too long');
					return RESTponse({
						success: false,
						reason: 'Data length too long'
					}, null, 400);
				}

				await env.STORAGE.put(recordID, data);

				return RESTponse({
					success: true,
					context: 'set'
				}, null, 202);

			} break;
		
			default: break;
		}

		return RESTponse({
			success: false,
			reason: 'Unknown command'
		}, null, 400)
	}
};

import type { APIResponse } from '../../types/restapi';

export const mkRestResponse = (response: APIResponse, statusCode?: number, headers?: Record<string, string>) => new Response(JSON.stringify(response), {
	headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
	status: statusCode || (response.success ? 200 : 400)
});

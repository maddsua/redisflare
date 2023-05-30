export const sleep = async (timeout: number) => new Promise<void>(resolve => setTimeout(resolve, timeout));

export const RESTponse = (body?: object, headers?: Record<string, string>, status?: number) => new Response(body ? JSON.stringify(body) : null, {
	headers: body ? Object.assign(headers || {}, { 'content-type': 'application/json' }) : headers,
	status
});

export const maybeJSON = (body: string) => {
	try {
		return JSON.parse(body);
	} catch (error) {
		null;
	}
};

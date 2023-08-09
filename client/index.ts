import type { RedisflareResponse, RedisflareRequest } from '../common/apitypes';

export interface AuthData {
	domain: string;
	token: string;
};

export interface ClientReturnValue {
	success: RedisflareResponse['success'];
	error?: Error;
	data?: RedisflareResponse['data'];
};

type FetchType = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
let fetcher: FetchType | undefined = undefined;
export const setFetcher = (_fetcher: FetchType) => fetcher = _fetcher;

const noFetchMessage = `On Node, you need to provide a fetch function using setFetcher() before using the client. This is required due to Node devs being slowpokes with implementing proper fetch api. This error will be removed once a LTS version of Node will fully support the fetch api.`;

export const get = (auth: AuthData, recordID: string) => new Promise<ClientReturnValue>(resolve => {

	if (!fetcher) {
		resolve({ success: false, error: new Error(noFetchMessage) });
		return;
	}

	const remoteUrl = new URL(`https://${auth.domain}/get`);
	remoteUrl.searchParams.append('record_id', recordID);
	remoteUrl.searchParams.append('token', auth.token);

	fetcher(remoteUrl).then(rsp => rsp.json()).then((data: RedisflareResponse) => {
		if (!data.success) throw new Error(data.error_text || 'Unknown error');
		resolve(data);
	}).catch(error => resolve({ success: false, error: new Error((error as Error)?.message || error) }));

});

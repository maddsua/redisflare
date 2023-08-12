import type { RedisflareResponse, RedisflareRequest } from '../common/apitypes';

export interface AuthData {
	host: string;
	token: string;
};

export interface ClientReturnValue {
	success: RedisflareResponse['success'];
	error?: Error;
	data?: RedisflareResponse['data'];
};

type FetchType = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

export class Redisflare {

	_fetch: FetchType;
	_authdata: AuthData | undefined = undefined;

	constructor(fetcher?: FetchType) {
		if (process?.versions?.node && !fetcher) throw new Error('Hold on cowboy, it seems that youre running node, and Node is notorious in being an ass of an runtime, so you need to bring your own fetch function. Import node-fetch and pass it to this constructor. This error will be removed once a LTS version of Node will fully support the fetch api.');
		this._fetch = fetcher || fetch;
	}

	async auth(credentials: AuthData) {

		const remote = new URL(credentials.host);
		remote.pathname = '/ping';
		remote.searchParams.set('token', credentials.token);

		return new Promise<true | Error>(resolve => this._fetch(remote).then(data => data.json()).then((data: RedisflareResponse) => {
			const authorized = data.success && data.context === 'ping';
			if (authorized) this._authdata = credentials;
			resolve(authorized ? true : new Error(`Returned status: ${data.error_text || 'unknown error'}`))
		}).catch(error => resolve(new Error((error instanceof Error)? error.message : error))));
	};

};

/*
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
*/
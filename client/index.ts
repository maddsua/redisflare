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

interface RestData {
	model: `/${ 'get' | 'set' | 'list' | 'delete' | 'ping' }`;
	recordID?: string;
	data?: any;
};

type FetchType = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

export class Redisflare {

	_fetch: FetchType;
	_authdata: AuthData | undefined = undefined;

	constructor(fetcher?: FetchType) {
		if (process?.versions?.node && !fetcher) throw new Error('Hold on cowboy, it seems that youre running node, and Node is notorious in being an ass of an runtime, so you need to bring your own fetch function. Import node-fetch and pass it to this constructor. This error will be removed once a LTS version of Node will fully support the fetch api.');
		this._fetch = fetcher || fetch;
	}

	async _rest(setup: RestData): Promise<ClientReturnValue> {

		if (!this._authdata) return {
			success: false,
			error: new Error('Client unauthorized')
		};

		const remote = new URL(this._authdata.host);
		remote.pathname = setup.model;
		remote.searchParams.set('token', this._authdata.host);
		if (setup.recordID) remote.searchParams.set('record_id', setup.recordID);

		return new Promise<ClientReturnValue>(resolve => {

			this._fetch(remote, {
				method: setup.data ? 'POST' : 'GET',
				body: setup.data || undefined
			}).then(data => data.json()).then((data: RedisflareResponse) => {

				if (!data.success) resolve({
					success: false,
					error: new Error(data.error_text || 'Unknown error')
				});

				resolve({
					success: data.success,
					data: data.data
				});

			}).catch(error => resolve({
				success: false,
				error: new Error((error instanceof Error ? error.message : error ) || 'Unknown error')
			}));
		});
	};

	async auth(credentials: AuthData): Promise<true | Error> {

		const remote = new URL(credentials.host);
		remote.pathname = '/ping';
		remote.searchParams.set('token', credentials.token);

		return new Promise<true | Error>(resolve => this._fetch(remote).then(data => data.json()).then((data: RedisflareResponse) => {
			const authorized = data.success && data.context === 'ping';
			if (authorized) this._authdata = credentials;
			resolve(authorized ? true : new Error(`Returned status: ${data.error_text || 'unknown error'}`))
		}).catch(error => resolve(new Error((error instanceof Error)? error.message : error))));
	};

	async get(recordID: string): Promise<ClientReturnValue> {
		return this._rest({
			model: '/get',
			recordID
		});
	};

	async del(recordID: string): Promise<ClientReturnValue> {
		return this._rest({
			model: '/delete',
			recordID
		});
	};

	async set(recordID: string, data: string): Promise<ClientReturnValue> {
		return this._rest({
			model: '/delete',
			recordID,
			data
		});
	};
};

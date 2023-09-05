import type { APIResponse, BaseErrorResponse, ReadResponse, ListResponse } from '../../types/restapi.ts';
import type { ListedRecord } from '../../types/kvExtended.ts';

interface ClientAuthData {
	host: string;
	token: string;
}

export const validateCredentials = (creds?: Partial<ClientAuthData> | null): Error | null => {

	if (!creds) return new Error('[Client auth failed] Client unauthorized');

	if (!creds.host) return new Error('[Client auth failed] Host address missing');
	if (!/^http?s:\/\/(([a-z0-9\-\_]+\.)+[a-z]+)|(localhost)(:\d+)?\/?$/i.test(creds.host))
		return new Error('[Client auth failed] Hosd address format invalid');

	if (!creds.token) return new Error('[Client auth failed] Access token missing');
	if (!/^rdfl_/i.test(creds.token))
		return new Error('[Client auth failed] Access token format invalid');

	return null;
}

export class Redisflare {

	_authdata: ClientAuthData | null = null;
	_rights: string | null = null;

	constructor(authData?: ClientAuthData) {
		if (!authData) return;
		this._authdata = authData;
	}

	async authenticate(authData: ClientAuthData): Promise<true | Error> {

		if (!authData.host.startsWith('http'))
			return new Error('Host should use http schema');

		const remote = new URL(authData.host);
		remote.pathname = '/auth';
		remote.searchParams.set('token', authData.token);
		remote.searchParams.set('report', 'json');

		const response = await fetch(remote).then(data => data.json()) as APIResponse;

		const authorized = 'rights' in response && response.success;
		if (authorized) {
			this._authdata = authData;
			this._rights = response.rights;
			return true;
		}

		return new Error(`Auth error: ${(response as BaseErrorResponse).error_text || 'unknown error'}`)
	}

	async get(record_id: string): Promise<string | null> {

		const credsError = validateCredentials(this._authdata);
		if (credsError) throw credsError;

		const requestUrl = new URL(this._authdata!.host);
		requestUrl.searchParams.set('record_id', record_id);

		const reponse = await fetch(requestUrl, {
			headers: {
				'Authorization': `Bearer ${this._authdata!.token}`
			}
		}).then(data => data.json()) as ReadResponse;

		if (!reponse.success) throw new Error(reponse.error_text);
		return reponse.data;
	}

	async set(record_id: string, data: string): Promise<void> {

		const credsError = validateCredentials(this._authdata);
		if (credsError) throw credsError;

		const requestUrl = new URL(this._authdata!.host);
		requestUrl.searchParams.set('record_id', record_id);

		const reponse = await fetch(requestUrl, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this._authdata!.token}`,
				'content-type': 'text/plain'
			},
			body: data
		}).then(data => data.json()) as APIResponse;

		if (!reponse.success) throw new Error(reponse.error_text);
	}

	async del(record_id: string): Promise<void> {

		const credsError = validateCredentials(this._authdata);
		if (credsError) throw credsError;

		const requestUrl = new URL(this._authdata!.host);
		requestUrl.searchParams.set('record_id', record_id);

		const reponse = await fetch(requestUrl, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${this._authdata!.token}`
			}
		}).then(data => data.json()) as ListResponse;

		if (!reponse.success) throw new Error(reponse.error_text);
	}

	async list(props?: { prefix?: string; page?: string }): Promise<ListedRecord> {

		const credsError = validateCredentials(this._authdata);
		if (credsError) throw credsError;

		const requestUrl = new URL(this._authdata!.host);
		requestUrl.pathname = '/list';
		Object.entries(props || {}).filter(item => item[0] && item[1]).forEach(item => requestUrl.searchParams.set(item[0], item[1]));

		const reponse = await fetch(requestUrl, {
			headers: {
				'Authorization': `Bearer ${this._authdata!.token}`
			}
		}).then(data => data.json()) as ListResponse;

		if (!reponse.success) throw new Error(reponse.error_text);

		return {
			entries: reponse.entries,
			list_complete: reponse.list_complete
		};
	}
}

import type { APIResponse, BaseErrorResponse, ReadResponse, ListResponse } from '../../types/restapi.ts';
import type { ListedRecord } from '../../types/kvExtended.ts';

interface ClientAuthData {
	host: string;
	token: string;
};

type ReturnSuccess = {
	success: true;
};
type ReturnFailure = {
	success: false;
	error: Error;
};

type SetAndDelRetVal = ReturnSuccess | ReturnFailure;

export const validateCredentials = (creds?: Partial<ClientAuthData> | null) => {

	if (!creds) return new Error('[Client auth failed] Client unauthorized');

	if (!creds.host) return new Error('[Client auth failed] Host address missing');
	if (!/^http?s:\/\/(([a-z0-9\-\_]+\.)+[a-z]+)|(localhost)(:\d+)?\/?$/i.test(creds.host))
		return new Error('[Client auth failed] Hosd address format invalid');

	if (!creds.token) return new Error('[Client auth failed] Access token missing');
	if (!/^rdfl_/i.test(creds.token))
		return new Error('[Client auth failed] Access token format invalid');

	return null;
};

export class Redisflare {

	_authdata: ClientAuthData | null = null;
	_rights: string | null = null;

	constructor(authData?: ClientAuthData) {
		if (!authData) return;
		this._authdata = authData;
	};

	async authenticate(authData: ClientAuthData): Promise<true | Error> {

		if (!authData.host.startsWith('http'))
			return new Error('Host should use http schema');

		const remote = new URL(authData.host);
		remote.pathname = '/auth';
		remote.searchParams.set('token', authData.token);
		remote.searchParams.set('report', 'json');

		return new Promise<true | Error>(resolve => fetch(remote).then(data => data.json()).then((data: APIResponse) => {
			const authorized = 'rights' in data && data.success;
			if (authorized) {
				this._authdata = authData;
				this._rights = data.rights;
			}
			resolve(authorized ? true : new Error(`Auth error: ${(data as BaseErrorResponse).error_text || 'unknown error'}`))
		}).catch(error => resolve(new Error((error instanceof Error)? error.message : error))));
	};

	async get(record_id: string): Promise<{ error: Error } | { data: string | null }> {

		try {

			const credsError = validateCredentials(this._authdata);
			if (credsError) throw credsError;

			const requestUrl = new URL(this._authdata!.host);
			requestUrl.searchParams.set('record_id', record_id);

			const reponse = await (await fetch(requestUrl, {
				headers: {
					'Authorization': `Bearer ${this._authdata!.token}`
				}
			})).json() as ReadResponse;

			if (!reponse.success) throw new Error(reponse.error_text);
			return { data: reponse.data };

		} catch (error) {
			return { error: new Error((error instanceof Error ? error.message : error ) || 'Unknown error') };
		}
	};

	async set(record_id: string, data: string): Promise<{ error: Error | undefined }> {

		try {

			const credsError = validateCredentials(this._authdata);
			if (credsError) throw credsError;

			const requestUrl = new URL(this._authdata!.host);
			requestUrl.searchParams.set('record_id', record_id);

			const reponse = await (await fetch(requestUrl, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this._authdata!.token}`,
					'content-type': 'text/plain'
				},
				body: data
			})).json() as APIResponse;

			if (!reponse.success) throw new Error(reponse.error_text);

			return { error: undefined };
			
		} catch (error) {
			return { error: new Error((error instanceof Error ? error.message : error ) || 'Unknown error') };
		}
	};

	async del(record_id: string): Promise<{ error: Error | undefined }> {

		try {

			const credsError = validateCredentials(this._authdata);
			if (credsError) throw credsError;

			const requestUrl = new URL(this._authdata!.host);
			requestUrl.searchParams.set('record_id', record_id);

			const reponse = await (await fetch(requestUrl, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${this._authdata!.token}`
				}
			})).json() as ListResponse;

			if (!reponse.success) throw new Error(reponse.error_text);

			return { error: undefined };
			
		} catch (error) {
			return { error: new Error((error instanceof Error ? error.message : error ) || 'Unknown error') };
		}
	};

	async list(props?: { prefix?: string; page?: string }): Promise<ListedRecord | { error: Error }> {

		try {

			const credsError = validateCredentials(this._authdata);
			if (credsError) throw credsError;

			const requestUrl = new URL(this._authdata!.host);
			requestUrl.pathname = '/list';
			Object.entries(props || {}).filter(item => item[0] && item[1]).forEach(item => requestUrl.searchParams.set(item[0], item[1]));

			const reponse = await (await fetch(requestUrl, {
				headers: {
					'Authorization': `Bearer ${this._authdata!.token}`
				}
			})).json() as ListResponse;

			if (!reponse.success) throw new Error(reponse.error_text);

			return {
				entries: reponse.entries,
				list_complete: reponse.list_complete
			};

		} catch (error) {
			return { error: new Error((error instanceof Error ? error.message : error ) || 'Unknown error') };
		}
	};
};

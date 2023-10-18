import type { APIResponse, BaseErrorResponse, ReadResponse, ListResponse } from '../../types/restapi.ts';
import type { ListedRecord } from '../../types/kvExtended.ts';

interface ClientCredentials {
	remote: string;
	token: string;
}

export class Redisflare {

	authdata: {
		remote: URL;
		token: string;
	};
	rights: string | undefined;

	constructor(creds: ClientCredentials) {

		if (!creds) throw new Error('Client credentials not provided');
		else if (!creds.remote) throw new Error('Remote URL missing');
		else if (!creds.token) throw new Error('Access token missing');

		const remoteURL = new URL(creds.remote);
		remoteURL.pathname = '/';
		remoteURL.search = '';

		this.authdata = {
			remote: remoteURL,
			token: creds.token
		};
	}

	async authenticate() {

		const requestUrl = new URL(this.authdata.remote.href);
		requestUrl.pathname = '/auth';
		requestUrl.searchParams.set('token', this.authdata.token);
		requestUrl.searchParams.set('report', 'json');

		const response = await fetch(requestUrl).then(data => data.json()) as APIResponse;

		const authorized = 'rights' in response && response.success;
		if (!authorized) throw new Error(`Auth error: ${(response as BaseErrorResponse).error_text || 'unknown error'}`);

		this.rights = response.rights;

		return {
			host: this.authdata.remote.host,
			rights: this.rights
		};
	}

	async get(record_id: string): Promise<string | null> {

		const requestUrl = new URL(this.authdata.remote.href);
		requestUrl.searchParams.set('record_id', record_id);

		const reponse = await fetch(requestUrl, {
			headers: {
				'Authorization': `Bearer ${this.authdata!.token}`
			}
		}).then(data => data.json()) as ReadResponse;

		if (!reponse.success) throw new Error(reponse.error_text);
		return reponse.data;
	}

	async set(record_id: string, data: string): Promise<void> {

		const requestUrl = new URL(this.authdata.remote.href);
		requestUrl.searchParams.set('record_id', record_id);

		const reponse = await fetch(requestUrl, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.authdata!.token}`,
				'content-type': 'text/plain'
			},
			body: data
		}).then(data => data.json()) as APIResponse;

		if (!reponse.success) throw new Error(reponse.error_text);
	}

	async del(record_id: string): Promise<void> {

		const requestUrl = new URL(this.authdata.remote.href);
		requestUrl.searchParams.set('record_id', record_id);

		const reponse = await fetch(requestUrl, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${this.authdata!.token}`
			}
		}).then(data => data.json()) as ListResponse;

		if (!reponse.success) throw new Error(reponse.error_text);
	}

	async list(props?: { prefix?: string; page?: string }): Promise<ListedRecord> {

		const requestUrl = new URL(this.authdata.remote.href);
		requestUrl.pathname = '/list';
		Object.entries(props || {}).filter(item => item[0] && item[1]).forEach(item => requestUrl.searchParams.set(item[0], item[1]));

		const reponse = await fetch(requestUrl, {
			headers: {
				'Authorization': `Bearer ${this.authdata!.token}`
			}
		}).then(data => data.json()) as ListResponse;

		if (!reponse.success) throw new Error(reponse.error_text);

		return {
			entries: reponse.entries,
			list_complete: reponse.list_complete
		};
	}
}

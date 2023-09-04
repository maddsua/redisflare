import type { APIResponse, BaseErrorResponse, CRUDResponse } from '../../types/restapi.ts';

interface ClientAuthData {
	host: string;
	token: string;
};

interface ClientReturnSuccess {
	success: true;
	data: string | null;
};
interface ClientReturnFailure {
	success: false;
	error: Error;
};

type ClientReturnValue = ClientReturnSuccess | ClientReturnFailure;

export class Redisflare {

	_authdata: ClientAuthData | null = null;
	_rights: string | null = null;

	constructor(authData?: ClientAuthData) {
		if (!authData) return;
		this._authdata = authData;
	};

	_formatCRUDEndpointURL(record_id: string) {

		if (!this._authdata) throw new Error('Client unauthorized');

		const remote = new URL(this._authdata.host);
		remote.pathname = '/crud';
		remote.searchParams.set('token', this._authdata.host);
		remote.searchParams.set('record_id', record_id);
		return remote;
	};

	async auth(authData: ClientAuthData): Promise<true | Error> {

		if (!authData.host.startsWith('http'))
			return new Error('Host should use http schema');

		const remote = new URL(authData.host);
		remote.pathname = '/auth';
		remote.searchParams.set('token', authData.token);

		return new Promise<true | Error>(resolve => fetch(remote).then(data => data.json()).then((data: APIResponse) => {
			const authorized = 'rights' in data && data.success;
			if (authorized) {
				this._authdata = authData;
				this._rights = data.rights;
			}
			resolve(authorized ? true : new Error(`Auth error: ${(data as BaseErrorResponse).error_text || 'unknown error'}`))
		}).catch(error => resolve(new Error((error instanceof Error)? error.message : error))));
	};

	async get(record_id: string): Promise<ClientReturnValue> {

		try {

			const remote = this._formatCRUDEndpointURL(record_id);
			const reponse = await (await fetch(remote)).json() as APIResponse;

			if (!reponse.success) throw new Error(reponse.error_text);

			return {
				success: true,
				data: (reponse as CRUDResponse).data as string | null
			};
			
		} catch (error) {
			return {
				success: false,
				error: new Error((error instanceof Error ? error.message : error ) || 'Unknown error')
			}
		}
	};

	async del(record_id: string): Promise<ClientReturnValue> {

		try {

			const remote = this._formatCRUDEndpointURL(record_id);
			const reponse = await (await fetch(remote, {
				method: 'DELETE'
			})).json() as APIResponse;

			if (!reponse.success) throw new Error(reponse.error_text);

			return {
				success: true,
				data: (reponse as CRUDResponse).data as string | null
			};
			
		} catch (error) {
			return {
				success: false,
				error: new Error((error instanceof Error ? error.message : error ) || 'Unknown error')
			}
		}
	};

	async set(record_id: string, data: string): Promise<ClientReturnValue> {

		try {

			const remote = this._formatCRUDEndpointURL(record_id);
			const reponse = await (await fetch(remote, {
				method: 'POST',
				headers: {
					'content-type': 'text/plain'
				},
				body: data
			})).json() as APIResponse;

			if (!reponse.success) throw new Error(reponse.error_text);

			return {
				success: true,
				data: (reponse as CRUDResponse).data as string | null
			};
			
		} catch (error) {
			return {
				success: false,
				error: new Error((error instanceof Error ? error.message : error ) || 'Unknown error')
			}
		}
	};
};

export class ServerError extends Error {

	clientMessage?: string;
	responseCode?: number;

	constructor(message: string, clientMessage?: string | null, responseCode?: number) {
		super(message);
		this.name = 'ServerSideError';
		this.clientMessage = (clientMessage || (clientMessage !== null ? message : undefined));
		this.responseCode = responseCode;
	}
};

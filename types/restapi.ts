
export type MutationRequest = {
	auth_token?: string;
	record_id?: string;
	data?: string;
};


export type BaseSuccessResponse = {
	success: true;
};
export type BaseErrorResponse = {
	success: false;
	error_text: string;
};
export type BaseResponse = BaseSuccessResponse | BaseErrorResponse;


export type ReadResponse = (BaseSuccessResponse & {
	context: 'read';
	data: string | null;
}) | BaseErrorResponse;

export type CreateResponse = (BaseSuccessResponse & {
	context: 'create';
}) | BaseErrorResponse;

export type UpdateResponse = (BaseSuccessResponse & {
	context: 'update';
}) | BaseErrorResponse;

export type DeleteResponse = (BaseSuccessResponse & {
	context: 'delete';
}) | BaseErrorResponse;

export type CRUDResponse = ReadResponse | CreateResponse | UpdateResponse | DeleteResponse;


export type ListResponse = (BaseSuccessResponse & {
	entries: Array<{
		record_id: string;
		expiration?: number;
		metadata?: unknown;
	}>;
	next_page?: string;
	list_complete: boolean;
}) | BaseErrorResponse;

export type HealthReportResponse = BaseSuccessResponse & {
	date: number;
};

export type AuthCheckResponse = BaseSuccessResponse & {
	rights: string;
};


export type APIResponse = BaseResponse | CRUDResponse | ListResponse | AuthCheckResponse | HealthReportResponse;

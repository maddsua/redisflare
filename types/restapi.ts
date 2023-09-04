
export type BaseSuccessResponse = {
	success: true;
};
export type BaseErrorResponse = {
	success: false;
	error_text: string;
};
export type BaseResponse = BaseSuccessResponse | BaseErrorResponse;

export type CRUDResponse = BaseSuccessResponse & {
	context?: 'create' | 'update' | 'read' | 'delete';
	data?: string | null;
};

export type ListResponse = BaseSuccessResponse & {
	entries: Array<{
		record_id: string;
		expiration?: number;
		metadata?: unknown;
	}>;
	next_page?: string;
	list_complete: boolean;
};

export type InstanceHealthReportResponse = BaseSuccessResponse & {
	date?: number;
};

export type AuthCheckResponse = BaseSuccessResponse & {
	rights: string;
};

export type APIResponse = BaseResponse | CRUDResponse | ListResponse | AuthCheckResponse | InstanceHealthReportResponse;

export type ClientRequest = {
	auth_token?: string;
	record_id?: string;
	data?: string;
};

export interface BaseResponse {
	success: boolean;
	context: string;
	error_text?: string;
	data?: string;
};

export interface RedisflareListResponse extends Omit<BaseResponse, 'data'> {
	data: Array<{
		record_id: string;
		expiration?: number;
		metadata?: unknown;
	}>;
	next_page?: string;
	list_complete: boolean;
}

export type RedisflareResponse = BaseResponse | RedisflareListResponse;

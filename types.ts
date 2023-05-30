//	types v1.0.3

export type RedisflareResponse = {
	success: boolean;
	context?: string;
	reason?: string;
	data?: string;
};

export type RedisflareListResponse = Omit<RedisflareResponse, 'data'> & {
	data: Array<{
		record_id: string
		expiration?: number
		metadata?: Record<string, string>
	}>;
	next_page?: string;
	list_complete: boolean;
}


export interface ListedRecord {
	entries: Array<{
		record_id: string;
		expiration?: number;
		metadata?: unknown;
	}>;
	next_page?: string;
	list_complete: boolean;
};


export interface StoreListOptions {
	limit?: number;
	prefix?: string | null;
	cursor?: string | null;
};

interface StoreListingKey {
	name: string;
	expiration?: number;
	metadata?: unknown;
};

export interface StoreListing {
	list_complete: boolean;
	keys: StoreListingKey[];
	cursor?: string;
};

export interface StorageInterface {
	read: (recordID: string) => Promise<string | null>;
	write: (recordID: string, data: string) => Promise<void>;
	delete: (recordID: string) => Promise<void>;
	list: (options?: StoreListOptions) => Promise<StoreListing>;
};

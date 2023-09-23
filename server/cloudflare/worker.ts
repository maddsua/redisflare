import type { StorageInterface } from '../shared/storage';
import { Env } from '../shared/env';
import { ServerError } from '../shared/error';
import redisflareServer from '../shared/server';

interface CFEnv extends Env {
	STORAGE: KVNamespace;
};

const cf_limits = {
	max_record_size: 26214400,
	max_key_size: 512
};

const ensureLimits = {
	recordLength: (recordID: string) => {
		if (recordID.length > cf_limits.max_key_size) throw new ServerError(`record_id is too long for key: "${recordID}"`, `record_id is too long. ${cf_limits.max_key_size} bytes MAX`);
	},
	dataLength: (length: number, recordID: string) => {
		if (length > cf_limits.max_record_size) throw new ServerError(`data size too big for key: "${recordID}"`, `data size too big. ${cf_limits.max_record_size} bytes MAX`);
	}
};

const clientMetadata = (rq: Request) => `${rq?.cf?.country || 'unknown country'} ${rq?.cf?.region || 'unknown region'} ${rq?.cf?.city || 'unknown city'}, ASN: ${rq?.cf?.asn}, postal: ${rq?.cf?.postalCode}, DMA: ${rq?.cf?.metroCode}`;

export default {

	async fetch(request: Request, env: CFEnv, ctx: ExecutionContext) {

		const cfKVStore: StorageInterface = {
			read(recordID) {
				ensureLimits.recordLength(recordID);
				return env.STORAGE.get(recordID);
			},
			write(recordID, data) {
				ensureLimits.recordLength(recordID);
				ensureLimits.dataLength(data.length, recordID);
				return env.STORAGE.put(recordID, data);
			},
			delete(recordID) {
				ensureLimits.recordLength(recordID);
				return env.STORAGE.delete(recordID);
			},
			list(options) {
				return env.STORAGE.list(options);
			}
		};

		return redisflareServer(request, env, cfKVStore);
	}
};

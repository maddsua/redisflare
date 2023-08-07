export interface AuthData {
	domain: string;
	token: string;
};

type FetchType = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
let fetcher: FetchType | undefined = undefined;
export const setFetcher = (_fetcher: FetchType) => fetcher = _fetcher;

export const get = (auth: AuthData, recordID: string) => new Promise<string>(resolve => {

	if (!fetcher) return {

	};

	fetcher(`https://${auth.domain}/get?record_id=${recordID}&token=${auth.token}`).then(rsp => rsp.json()).then((data) => {

		if (!data.success) throw new Error(`Request failed: ${data.reason}`);

		if (!data.data) {
			console.warn('No such db record, gonna create it later');
			resolve(structuredClone(defaultData))
			return;
		}

		const remoteMetrics = JSON.parse(data.data);
		if (typeof remoteMetrics['updated'] !== 'number') throw new Error('Mangled DB record.');
		resolve(remoteMetrics);

	}).catch(error => {
		console.error('DB read failed:', error);
		resolve(null);
	});

});

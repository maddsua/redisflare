export interface AuthData {
	domain: string;
	token: string;
};

type FetchType = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let fetcher: FetchType | undefined = undefined;

export const setFetcher = (_fetcher: FetchType) => fetcher = _fetcher;

//const safeRest = ()
export const RESTponse = (body?: object, headers?: Record<string, string>, status?: number) => new Response(body ? JSON.stringify(body) : null, {
	headers: body ? Object.assign(headers || {}, { 'content-type': 'application/json' }) : headers,
	status
});

export const maybeJSON = (body: string) => {
	try {
		return JSON.parse(body);
	} catch (error) {
		null;
	}
};

export const clientMetadata = (rq: Request) => `${rq.cf.country || "unknown country"} ${rq.cf.region || "unknown region"} ${rq.cf.city || "unknown city"}, ASN: ${rq.cf.asn}, postal: ${rq.cf.postalCode}, DMA: ${rq.cf.metroCode}`;

export const stripDomainName = (href: string | undefined) => href.replace(/http(s?):\/\//, '')?.replace(/\/.*/, '');

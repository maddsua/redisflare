import "https://deno.land/std@0.201.0/dotenv/load.ts";

import type { StorageInterface } from '../shared/storage.ts';
import redisflareServer from '../shared/server.ts';

const config = {
	port: 16770
};

const portEnvVarSet = Deno.env.get('PORT');
if (portEnvVarSet) {
	const portNumber = parseInt(portEnvVarSet);
	if (!isNaN(portNumber)) config.port = portNumber;
}

const server = Deno.listen({ port: config.port });
console.log(`Redisflare (Deno standalone) started at: http://localhost:${config.port}/`);

for await (const conn of server) {
	httpHandler(conn);
}

async function httpHandler(conn: Deno.Conn) {

	const httpConn = Deno.serveHttp(conn);

	for await (const requestEvent of httpConn) {

		try {

			const denoKVStore: StorageInterface = {
				read(recordID) {
					return new Promise(resolve => resolve(localStorage.getItem(recordID)));
				},
				write(recordID, data) {
					return new Promise(resolve => resolve(localStorage.setItem(recordID, data)));
				},
				delete(recordID) {
					return new Promise(resolve => resolve(localStorage.removeItem(recordID)));
				},
				list(options) {
					return new Promise(resolve => {
						const keyList = Object.entries(localStorage).map(([key, _value]) => ({
							name: key,
						}));
						resolve({
							keys: options?.prefix ? keyList.filter(item => item.name.startsWith(options.prefix as string)) : keyList,
							list_complete: true
						});
					});
				}
			};

			const response = await redisflareServer(requestEvent.request, Deno.env.toObject(), denoKVStore);
			requestEvent.respondWith(response);
			console.log(`${requestEvent.request.method} ${requestEvent.request.url} : ${response.status}`);

		} catch (error) {

			console.error('Unhandled runtime error:', error);

			const errorResponse = new Response(JSON.stringify({
				success: false,
				error_text: 'instance have crashed'
			}), {
				headers: {
					'content-type': 'application/json'
				},
				status: 500
			});

			requestEvent.respondWith(errorResponse)
		}
	}
}

import "https://deno.land/std@0.201.0/dotenv/load.ts";
import dbhandler from './dbhandler.ts';

const config = {
	port: 8080
};

const portEnvVarSet = Deno.env.get('PORT');
if (portEnvVarSet) {
	let portNumber = parseInt(portEnvVarSet);
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

			const response = await dbhandler(requestEvent.request, Deno.env);
			requestEvent.respondWith(response);

		} catch (error) {

			console.error('Unhandled runtime error:', error);

			const errorResponse = new Response(JSON.stringify({
				success: false,
				error_message: 'instance have crashed'
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

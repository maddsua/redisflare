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
		const response = await dbhandler(requestEvent.request, Deno.env);
		requestEvent.respondWith(response);
	}
}

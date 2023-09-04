import { Redisflare } from '../../../client/deno/mod.ts';

const client = new Redisflare();

const authData = {
	host: 'http://localhost:8080/',
	token: 'token123'
};

console.log(await client.authenticate(authData));

console.log(await client.set('test', 'test data'));

console.log(await client.get('test'));
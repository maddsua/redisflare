import { Redisflare } from '../../../client/deno/mod.ts';

const client = new Redisflare();

const authData = {
	host: 'http://localhost:8080/',
	token: 'rdfl_token123'
};

console.log(await client.authenticate(authData));

let gotTestData = await client.get('test');
if (!gotTestData) {
	console.log(await client.set('test', 'test data'));
	gotTestData = await client.get('test');
}

console.log(gotTestData);

console.log(await client.list());

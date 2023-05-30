# redisflare

Okay, so I got tired of my stack being 10014800 completely different apps and platforms, and this is an attempt to get myself a "cloud redis" on Cloudflare.

More specifically, I want a REST API to just get and put some strings. That's it. Upstash is really nice, but it's layoff time.

## Deploying

1. Install the npm deps. Run `npm i`

2. Generate an access token. Run `npm run tokengen`. Paste it to the `wrangler.toml`. Check the example config in [wrangler.ex.toml](./wrangler.ex.toml)

3. Create KV storage on Cloudflare. Use wrangler CLI or their UI. Copy it's id to `wrangler.toml`

4. Run `npm run deploy` to deploy it, Captain.

5. ????

6. Now you have your own Upstash 😎👍. No offense to their team, it's me just being a d.

## API

### Get record

Method: `GET`

Url: `{hostname}/get`

Query params:
 - `token`: string
 - `record_id`: string

Example: `http://127.0.0.1:8787/get?token=token123&record_id=test`

Response: 
```json
{
  "success": true,
  "context": "get",
  "data": "test_data"
}
```

### Set record

Methods: `POST`, `GET`

Url: `{hostname}/set`

GET example: `http://127.0.0.1:8787/set?token=token123&record_id=test&data=test_data`

Query params:
 - `token`: string (optional, for GET method)
 - `record_id`: string (optional, for GET method)
 - `data`: string (optional, for GET method)


POST example: `http://127.0.0.1:8787/set`

Headers:
```javascript
{
  "Authorization": "Bearer token123"
}
```

\* Note: The token is just a random string not up to any standards, and because of that, it is not required to prefix it with "Bearer". But you may want to do that for whatever reason

Request body:
```json
{
  "record_id": "test",
  "data": "test_data"
}
```

Response:

```json
{
  "success": true,
  "context": "set"
}
```

### Remove record

Method: `GET`, `DELETE`

Url: `{hostname}/del`

Query params:
 - `token`: string
 - `record_id`: string

Example: `http://127.0.0.1:8787/del?token=token123&record_id=test`

Response: 
```json
{
  "success": true,
  "context": "del"
}
```

### List records

Method: `GET`

Url: `{hostname}/list`

Query params:
 - `prefix`: string (optional)
 - `page`: string (optional)

Example: `http://127.0.0.1:8787/del?token=token123&prefix=test`

Response: 
```json
{
  "success": true,
  "context": "list",
  "data": [
    {
      "record_id": "test"
    },
    {
      "record_id": "test2"
    }
  ],
  "list_complete": true
}
```

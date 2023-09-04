# redisflare

Okay, so I got tired of my stack being 10014800 completely different apps and platforms, and this is an attempt to get myself a "cloud redis" on Cloudflare.

More specifically, I want a REST API to just get and put some strings. That's it. Upstash is really nice, but it's layoff time.


## Deploying

In terms of deploying, you have two options for now:

- Deploy to cloudflare workers, here is their docs: <https://developers.cloudflare.com/workers/>
- Deploy standalone version (powered by Deno and is using localStorage API under the hood) to docker container

Don't forget to generate a secure access token, or else some scriptkiddy may bite you in the ass. Use `tokengen` to do that.

## API

### Authentication

Add a `token` search query param to the request, an `Authorization` header with format `Bearer your_token` or add a `auth_token` property on a JSON object you send in POST, PUT or PATCH requests.

\* Note: The token is just a random string not up to any standards, and because of that, it is not required to prefix it with "Bearer". But you may want to do that for whatever reason

### CRUD opertations

Endpoint: `https://hostname/` or `https://hostname/crud`

### Read

Method: `GET`

Query params:
 - `token`: string
 - `record_id`: string

Headers: 
- Authorization: Bearer token123

Example: `http://127.0.0.1:8787/crud?token=token123&record_id=test`

Response: 
```json
{
  "success": true,
  "context": "read",
  "data": "test_data"
}
```

### Create, Update

Methods: `POST`, `PUT`, `PATCH`

The difference between those methods as follows:

- PUT: Creates a new record, fails if one already exist
- PATCH: Updates a record, fails if one does not exist
- POST: Bypasses the former logic and just writes data anyway

Query params:
 - `token`: string
 - `record_id`: string

Headers: 
- Authorization: Bearer token123

GET example: `http://127.0.0.1:8787/crud?token=token123&record_id=test&data=test_data`

Request body:
```json
{
  "auth_token": "token123",
  "record_id": "test",
  "data": "test_data"
}
```

Alternatively, you can set `Content-Type` to text/plain and send the entire body as record value!

Response:

```json
{
  "success": true,
  "context": "create"
}
```

### Delete

Method: `DELETE`

Query params:
 - `token`: string
 - `record_id`: string

Example: `http://127.0.0.1:8787/crud?token=token123&record_id=test`

Response: 
```json
{
  "success": true,
  "context": "delete"
}
```

## Extended operations

### List all records

Method: `GET`

Endpoint: `https://hostname/list`

Query params:
 - `prefix`: string (optional)
 - `page`: string (optional)

Example: `http://127.0.0.1:8787/list?token=token123&prefix=test`

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

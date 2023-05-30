# redisflare

Okay, so I got tired of my stack being 10014800 completely different apps and platforms, and this is an attempt to get myself a "cloud redis" on Cloudflare.

More specificly, I want a REST API to just get and put some strings. That's it. Upstash is really nice, but it's layoff time.

## Deploying

1. Install the npm deps. Run `npm i`

2. Generate an access token. Run `npm run tokengen`. Paste it to the `wrangler.toml`. Check the example config in [wrangler.ex.toml](./wrangler.ex.toml)

3. Create KV storage on Cloudflare. Use wrangler CLI or their UI. Copy it's id to `wrangler.toml`

4. Run `npm run deploy` to deploy it, Captain.

5. ????

6. Now you have your own Upstash 😎👍. No offence to their team, it's me just being a d.


# Frankies Headless Frontend

Run the frontend:

```bash
npm run dev
```

Copy `../.env.example` to `.env` and fill in real values for production.

Default URLs:

- Frontend: `http://localhost:3000`
- WordPress CMS: `http://localhost:8883/wp-admin/`

The frontend proxies data from:

`http://localhost:8883/wp-json/frankies-headless/v1/site`

## Production configuration

Set these environment variables in the process manager or hosting platform:

- `PORT`: frontend port. Defaults to `3000`.
- `WP_API_URL`: full WordPress REST payload URL. Defaults to `http://localhost:8883/wp-json/frankies-headless/v1/site`.
- `PUBLIC_SITE_URL`: public site origin used for canonical and Open Graph URL rewriting. Example: `https://www.frankiesburrito.com`
- `API_CACHE_TTL_MS`: in-memory payload cache TTL. Defaults to `5000`.
- `UPSTREAM_TIMEOUT_MS`: timeout for WordPress API and proxied asset requests. Defaults to `10000`.

## Production behavior

- `GET /healthz` returns `200` only when the upstream WordPress payload URL is healthy; otherwise it returns `503`.
- Unknown non-file routes now return a real `404` page instead of a `200` homepage fallback.
- HTML and CMS bridge responses are `no-store`; static assets are long-cacheable.
- Basic response hardening is enabled with `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and `Cross-Origin-Resource-Policy`.
- Gzip/Brotli compression is applied automatically when the client supports it.
- Invalid `WP_API_URL` or `PUBLIC_SITE_URL` values now fail fast during startup instead of producing broken runtime behavior.

## Verification

```bash
npm run check
node server.js
```

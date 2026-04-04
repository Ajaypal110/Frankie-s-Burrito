# Frankies Burrito

This repository contains a local WordPress Studio site plus a small Node-based headless frontend.

## Services

- WordPress CMS: `http://localhost:8883/wp-admin/`
- Frontend: `http://localhost:3000`
- Public site payload: `http://localhost:8883/wp-json/frankies-headless/v1/site`

## Environment Files

- Local secrets and runtime config live in `.env`.
- The committed template is `.env.example`.
- `wp-config.php` now loads the repo-root `.env` for WordPress salts.
- `headless-frontend/server.js` loads the same `.env` for frontend config.

## Production Checklist

1. Set production values for `WP_API_URL`, `PUBLIC_SITE_URL`, and all eight WordPress auth keys and salts.
2. Ensure the frontend host can reach the WordPress payload URL over the production network.
3. Confirm `GET /healthz` returns `200` only when the WordPress payload is reachable.
4. Confirm `GET /api/site` returns the expected payload from the production CMS.
5. Verify the main public routes load correctly: `/`, `/about`, `/locations`, `/press`, `/agoura-hills`, and `/agoura-hillsmenu`.
6. Keep `.env`, local SQLite data, and runtime logs out of version control.

## Vercel

- Deploy the repo root to Vercel. `vercel.json` routes all requests to `api/index.js`, which runs the frontend from `headless-frontend/server.js`.
- In Vercel project settings, set `WP_API_URL` to the public WordPress JSON endpoint, not `localhost`.
- Set `PUBLIC_SITE_URL` to the Vercel production domain or your custom domain.
- `localhost` values from `.env` only work for local development and will break the deployed frontend.

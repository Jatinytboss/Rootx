# rootX UPTIMER — Render deployment

## Build & start

- Build command: `npm install && npm run build:node`
- Start command: `npm run start`
- Node version: 22

## Environment variables

| Key | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (Atlas or self-hosted) |
| `MONGODB_DB` | Database name, e.g. `rootx_uptimer` |
| `AUTH_JWT_SECRET` | Long random string used to sign login tokens |
| `MONITOR_CRON_SECRET` | Long random string protecting the manual sweep endpoint |
| `CHECK_API_URL` | Optional, defaults to `https://api.rootx.run/add` |
| `MONITOR_TICK_MS` | Optional, how often the server scans for due monitors (default 5000) |

## How monitoring works

Every website is checked through the rootX check API:

```
GET https://api.rootx.run/add?url=<your-url>
```

The server runs a built-in loop that wakes every few seconds, finds each monitor
whose own interval has elapsed, checks it, and stores the result in MongoDB.
This runs forever — a monitor keeps being checked until the user pauses or
deletes it. No external cron job is required.

If the check API is unreachable, the server falls back to requesting the URL
directly so monitoring never stops.

On Render's free plan the web service sleeps when idle; use a paid instance (or
a simple external ping) to keep the loop alive 24/7. A manual sweep endpoint is
also available:

```
curl -X POST https://<your-app>.onrender.com/api/public/cron/run-checks \
  -H "Authorization: Bearer $MONITOR_CRON_SECRET"
```

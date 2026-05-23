# Ops Baseline: Hybrid React + Go + Laravel

## Recommended Runtime Topology
- `nginx` as single ingress and trust boundary
- `react-app` for UI
- `laravel` for auth/session + WRITE source of truth
- `go-api` for READ default

See:
- `docker-compose.hybrid.yml`
- `ops/nginx/hybrid.conf`

## Reverse Proxy Strategy
- `/` -> React dev server / static app
- `/api/*` -> Laravel API (fallback + write)
- `/go-api/*` -> Go API (primary read)
- `/revisions*` -> Laravel web routes (existing submit paths)

## Auth Trust Boundary for Go READ
- Proxy injects:
  - `X-Trusted-Proxy: 1`
  - `X-Auth-Signature: <shared-key>`
- Go middleware (`trustBoundary`) denies `/api/*` requests if header check fails.
- Configure `TRUST_PROXY_SHARED_KEY` in Go env.

## Env Separation Strategy
- React:
  - `VITE_API_BASE=/go-api/api`
  - `VITE_LARAVEL_API_BASE=/api`
  - `VITE_PARITY_VERIFY=1` (staging) or `0` (prod if noisy)
- Go:
  - `GO_API_ADDR=0.0.0.0:8081`
  - `TRUST_PROXY_SHARED_KEY=<secret>`
- Laravel:
  - keep existing `.env` and session/csrf config

## Centralized Logging / Error Handling
- Nginx access/error logs as ingress source.
- Go logs 401 when trust boundary fails.
- React parity warnings remain non-blocking (console warnings).
- Keep Laravel logs as source for write-path failures.

## Health Checks / Monitoring
- Nginx: `/healthz` basic probe.
- Go: `/api/health`.
- Add alerts for:
  - Go 5xx rate
  - fallback rate from React to Laravel
  - Laravel 419/401 spikes

## Kill-Switch / Fallback Strategy
- Immediate safe switch: set `VITE_API_BASE` to Laravel (`/api`) and/or disable Go upstream in proxy.
- Keep Laravel READ/WRITE endpoints available during migration.

## Compatibility Notes
- No auth rewrite introduced.
- No frontend redesign.
- WRITE flow remains Laravel.

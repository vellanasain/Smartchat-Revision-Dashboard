# React + Go Migration

This project is being migrated in parallel so the current Laravel app stays usable as the source of truth.

## Current Stack

- Laravel remains available on `http://127.0.0.1:8080`
- Go API preview runs on `http://127.0.0.1:8081`
- React preview runs on `http://127.0.0.1:5173`

## Completed First Slice

- Go API scaffold in `go-api/`
- React app scaffold in `react-app/`
- Shared visual CSS copied from the approved Laravel UI
- Revision dashboard endpoint:
  - `GET /api/revisions`
  - Supports `q`, `filter`, `marketing_id`, `web_id`, `page`, `per_page`
- User endpoints:
  - `GET /api/users/marketing`
  - `GET /api/users/website`
- Debug endpoint:
  - `GET /api/debug/logs?lines=300`
- React dashboard renders revision stats, filters, table rows, and logs preview.

## Run Locally

From `go-api/`:

```bash
go run ./cmd/server
```

From `react-app/`:

```bash
npm.cmd run dev
```

The Go API reads database settings from the root `.env` file.

## Migration Order

1. Match the Laravel revisions index exactly.
2. Add React pagination behavior.
3. Add create revision flow.
4. Add edit revision workflow.
5. Add update/delete endpoints in Go.
6. Add auth/admin guard before exposing beyond local network.
7. Cut over only after React + Go has parity with Laravel.

## Notes

- Keep Laravel as fallback while React + Go is still catching up.
- Do not redesign during migration; reuse the approved CSS and layout.
- Debug/log routes must be protected or disabled before production.

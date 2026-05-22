# Hybrid Auth & Session Architecture Plan (React + Go + Laravel)

## Current State (Stabilization Phase)
- React is the primary UI surface for revisions.
- Go API is the default READ source with Laravel fallback.
- Laravel remains the source of truth for WRITE flow and existing auth/session behavior.
- Runtime parity checks already reduce READ contract drift risk.

## Recommendation Summary
Use a **Laravel-session-first hybrid** as the immediate safe architecture:

1. Keep Laravel as Identity Provider and session authority for now.
2. Serve React and Laravel under the same parent site domain so browser cookies remain first-party.
3. Move Go behind the same gateway/domain and require a signed identity context from Laravel (or gateway) for protected Go routes.
4. Keep CSRF enforcement on Laravel write endpoints unchanged; do not weaken current protections.
5. Introduce phased tokenization only when WRITE endpoints begin moving to Go.

This avoids a risky full auth rewrite while preserving existing production behavior.

## Auth Option Analysis

### Option A — Keep Laravel Session/Cookie as primary (Recommended now)
**How it works**
- User logs in via Laravel as today.
- Browser stores Laravel session cookie (HttpOnly, Secure, SameSite=Lax/Strict depending cross-site needs).
- React uses same-origin requests for Laravel-protected actions.
- Go receives trusted user context from gateway/Laravel bridge (not from raw client claims).

**Pros**
- Lowest migration risk.
- Compatible with current WRITE flow.
- Minimal frontend changes.

**Cons**
- Go cannot independently authenticate users without a bridge/gateway contract.
- Requires careful proxy/domain setup.

### Option B — Laravel Sanctum (cookie SPA mode)
**How it works**
- Keep cookie-based auth with CSRF protection, but formalize SPA API auth via Sanctum.
- React performs CSRF bootstrap and uses same-site cookie auth for protected endpoints.

**Pros**
- Secure and Laravel-native for SPA.
- Easier incremental API protection standardization.

**Cons**
- Still Laravel-centric; Go still needs trust propagation or token introspection strategy.

### Option C — JWT as universal token for Go/Laravel
**How it works**
- Move toward bearer tokens and validate JWT in both Laravel and Go.

**Pros**
- Clean service-to-service model.
- Scales for microservice boundaries.

**Cons**
- Highest migration complexity now.
- CSRF model changes; token leakage/XSS risk posture differs.
- Not ideal before WRITE migration is complete.

## Recommended Target for This Project (Near-term)
### Phase 0 (Now): Session-first hardening
- Keep Laravel login/session source unchanged.
- Ensure all write actions remain Laravel-authenticated.
- Keep React fallback behavior intact.

### Phase 1: Trust boundary for Go READ
- Put Go behind reverse proxy under same site (e.g., `/go-api/*`) to avoid cross-site cookie issues.
- Add gateway middleware that injects verified user identity headers for Go only after Laravel session check.
- Go trusts only gateway-signed/allowlisted headers (reject direct spoofed headers).

### Phase 2: Protected Go WRITE pilot (small scope)
- For first migrated WRITE endpoint, use Laravel-verified identity context + CSRF-compatible flow if browser-initiated.
- Add server-side authorization parity checks against Laravel roles/policies.

### Phase 3: Decide long-term token model
- Either remain session+Sanctum hybrid or adopt JWT once most WRITE has moved and auth rules are consolidated.

## React ↔ Go Authentication Guidance
For now, React should **not** own auth state independently.
- Keep browser session cookie flow as source.
- Prefer same-origin API paths in production gateway.
- Keep `credentials: include` for cookie continuity.

## Go Session Verification Strategy
Do **not** let Go parse Laravel session cookie directly as first approach.
Recommended incremental strategy:
1. Gateway verifies Laravel session.
2. Gateway injects headers like `X-User-Id`, `X-User-Role`, `X-Auth-Signature`.
3. Go middleware validates source + signature/HMAC + timestamp.
4. Go handlers use normalized user context.

## CSRF Strategy for Hybrid Stack
- Laravel write endpoints: continue CSRF token checks exactly as-is.
- Go read endpoints: CSRF not required for safe GET.
- Future Go write endpoints: if browser cookie-authenticated, enforce CSRF equivalent (double-submit or gateway-issued anti-CSRF token).

## Deployment / Domain Structure (Safest)
Use one primary app origin for browser traffic:
- `https://app.example.com` (React + Laravel routes)
- Reverse proxy routes:
  - `/api/*` -> Laravel API (current source for WRITE and fallback)
  - `/go-api/*` or `/api/v2/*` -> Go API

Benefits:
- First-party cookies
- simpler CSRF/cookie behavior
- fewer CORS pitfalls

## Incremental Hardening Checklist (No rewrite)
1. Add gateway-level auth context injection for Go (READ first).
2. Add Go middleware to reject missing/invalid signed auth context on protected routes.
3. Add parity test script comparing Laravel vs Go auth-required READ responses for a signed-in user.
4. Add observability: auth context mismatch logs, fallback-rate dashboards, 401/419 trend alerts.
5. Keep rollback switch: React env flag to force Laravel-only reads if incidents occur.

## Why this is safest for current phase
- Preserves existing working login/session semantics.
- Avoids risky simultaneous auth + WRITE migration.
- Gives clear path to secure Go authorization without breaking existing flow.

# Security Origin Guard 03

**Sprint:** SECURITY-ORIGIN-GUARD-03
**Date:** 2026-07-14
**Preceded by:** SECURITY-DEPENDENCY-HYGIENE-02 (`docs/SECURITY_DEPENDENCY_HYGIENE_02.md`)
**Helper:** `lib/security/origin.ts`

Adds a centralized Origin-header check to every cookie/session-based
mutating API route in the app, as defense-in-depth against cross-site
request forgery (CSRF). Does not touch CSP, rate limiting, middleware,
Supabase, Sentry, `.env` files, roles, RLS, or business logic.

## Threat model (sintesi)

A state-changing request (`POST`/`PUT`/`PATCH`/`DELETE`) riding on the
browser's ambient Supabase session cookie, forged from a page hosted on a
different origin — the classic CSRF pattern (malicious `<form>` auto-submit,
or a fetch/XHR call from an attacker-controlled page that still carries the
victim's cookies because the browser attaches them automatically to any
request to this app's domain).

Two facts about this codebase shape the design:

1. **Every mutating route already requires session-level authorization**
   (`requireKoraAdmin` / `requireCompanyUser` / `requireWorkerUser` /
   `requirePartnerUser` / `getCurrentWorkerUser`, or — for
   `app/api/auth/logout` — a direct `supabase.auth.getUser()` call). The
   Origin guard is an *additional* layer on top of that, not a replacement.
2. **Every one of those helpers accepts two auth paths** — see
   `lib/auth/kora-session.ts` `resolveUser()`: a cookie-based session
   (browser flow) **or** an `Authorization: Bearer <token>` header
   (programmatic clients / tests). A cross-site page cannot make the
   victim's browser attach an arbitrary `Authorization` header the way it
   attaches cookies — so any request authenticated that way carries no CSRF
   risk, regardless of its Origin.

Real browser-driven CSRF attempts (fetch, XHR, and even simple `<form>`
submissions to a different origin) always carry an `Origin` header — this
has been standard browser behavior for state-changing requests for years.
That is what makes the policy in the next section both safe and
non-disruptive.

## Policy adottata

Implemented in `checkOrigin()` (pure decision function) /
`assertSameOrigin()` (route-level guard clause), `lib/security/origin.ts`:

1. **Safe methods (`GET`, `HEAD`, `OPTIONS`) are never checked.** Defense in
   depth against a future copy-paste mistake — no route in this sprint
   calls the guard from a read-only handler in the first place.
2. **`Authorization: Bearer <token>` present → allowed, unconditionally.**
   Not vulnerable to CSRF (see threat model above); every route that
   supports this header also supports cookie sessions, so this rule is
   evaluated per-request, not per-route.
3. **`Origin` header absent → allowed.** See "Comportamento con Origin
   assente" below.
4. **`Origin` header present → must exactly match an allowed origin, or
   `403 Forbidden`.** Matching is done on the parsed `protocol + '//' +
   host` (via the standard `URL` parser), not string prefix/substring
   matching — see "Resistenza ai bypass" below.

## Origini consentite

No invented domains, no wildcards, no `*`. Two sources, both already relied
on elsewhere in this codebase:

1. **`request.nextUrl.origin`** — the origin this specific request arrived
   on, as Next.js resolves it (from `Host`, and — on reverse-proxy
   deployments such as Vercel — `X-Forwarded-Host`/`X-Forwarded-Proto`).
   This is the same resolution already trusted throughout the codebase for
   building redirect and callback URLs (`middleware.ts`,
   `app/auth/callback/route.ts`, `app/link/[token]/activate/route.ts`, and
   others). Using it means the guard **adapts automatically** to
   production, staging, local dev, and any Vercel preview deployment with
   no extra configuration and no enumeration of URLs.
2. **`process.env.NEXT_PUBLIC_SITE_URL`**, if set — the existing canonical
   app URL, already used across the codebase (e.g.
   `app/api/admin/workers/bulk-provision/route.ts`,
   `lib/worker-cv/share-token.ts`) and documented in
   `.env.local.example`. Covers deployments where the public URL
   legitimately differs from what Next.js resolves internally. No new
   environment variable was introduced; no `.env*` file was modified.

Both are normalized (parsed via `URL`, lowercased, reduced to
`protocol://host`) before comparison.

## Comportamento con Origin assente

**Decision: allow.** Reasoned as follows, not assumed:

- A genuine browser-driven CSRF attempt against these routes will carry an
  `Origin` header in essentially all current browsers — rejecting only
  *mismatched* Origins already stops the real attack.
- Rejecting *absent* Origin as well would have blocked, with no
  corresponding security benefit: `curl`/Postman-based manual testing and
  debugging against a real session cookie (a normal workflow for an
  admin-heavy pilot product like this one), any current or future test
  harness that constructs requests directly, and any legitimate non-browser
  HTTP client — none of which send `Origin` by default, and all of which
  are already gated by the route's own session/bearer check regardless.
- This is why the design deliberately does **not** use a "reject unless
  proven safe" default for the missing-header case — that would fail
  "non accettarle automaticamente senza motivazione" in spirit as much as
  a blind allow would, whereas this reasoning is explicit and testable
  (see `tests/unit/security-origin-guard-03.test.ts`, "nessun header
  Origin" case).

## Resistenza ai bypass

Matching is exact-set-membership on `URL`-parsed `protocol://host`, not
string comparison on the raw header. This structurally defeats every
bypass class the sprint asked to test (`tests/unit/security-origin-guard-03.test.ts`
covers each explicitly):

- **Protocollo diverso** (`http://` vs `https://`) → different normalized
  string, rejected.
- **Porta diversa** (`:8443` vs default) → `URL.host` includes non-default
  ports, rejected.
- **Maiuscole/minuscole** → `URL` lowercases protocol and host during
  parsing; a legitimately-cased allowed origin is still recognized (tested
  as a non-regression case, not just a bypass case).
- **Sottodominio non atteso** (`evil.app.kora.example`) → different host,
  rejected.
- **Suffisso di dominio** (`app.kora.example.evil.example`) → different
  host, rejected — this is the classic naive-`startsWith`/`includes` bypass
  class, defeated by using `URL` parsing instead of substring matching.
- **Credenziali nell'URL** (`https://app.kora.example@evil.example`) → the
  `URL` parser resolves this to `host = evil.example`,
  `username = app.kora.example` — the userinfo component is stripped before
  comparison, so this does not smuggle a trusted-looking string past the
  check.
- **`Origin: null`** (sandboxed/opaque browser contexts) and other
  unparseable values → `new URL(...)` throws → treated as
  `origin_malformed` → rejected. Distinguished internally from "absent",
  which is allowed (see above) — a header that is *present but garbage* is
  a different, more suspicious signal than one that is simply not sent.

## Route inventory e classificazione

**87 route handler files analyzed** (85 under `app/api/**`, plus
`app/auth/callback/route.ts` and `app/link/[token]/activate/route.ts`).
**45 files / 46 method-handlers** accept `POST`, `PUT`, `PATCH`, or
`DELETE` — the full list is enumerated in
`tests/unit/security-origin-guard-03-routes.test.ts` (the "inventario
completo" test asserts both counts and that every one imports and calls
the guard).

- **Protette: 45/45.** Every mutating route in the codebase today is
  browser/session-based (cookie or bearer via the shared `resolveUser()`),
  and every one is called only via same-origin relative `fetch()` from
  KORA's own client components (confirmed — no server-to-server internal
  HTTP call to any `/api/**` route was found in the codebase).
- **Escluse: none today.** A dedicated grep across `app/api/**` for
  webhook/cron/signature/shared-secret patterns found no matches beyond
  false positives in Italian comment text ("cronologia", "percorso").
  There is currently no webhook, cron job, or externally-triggered
  integration route in this codebase to exclude. **If one is added in the
  future, it must not receive this guard** — see "Come aggiungere una
  nuova route" below.
- **Dubbie → risolte per design, non per esclusione di file:** every
  `require*User`/`getCurrentWorkerUser` helper accepts *both* a cookie
  session and a `Bearer` token on the *same* route (see threat model point
  2). This made file-level classification ("this route is bearer-only, so
  exclude it") impossible — several routes (e.g.
  `app/api/admin/operator-flow/route.ts`, whose own comment documents
  "KORA_ADMIN Supabase session only (cookie or Authorization: Bearer
  <token>)") genuinely serve both call patterns. Resolved by making the
  bearer-exemption a **per-request** check inside `checkOrigin()` itself
  (item 2 of the policy above), rather than a per-route inclusion/exclusion
  decision.
- `app/link/[token]/activate/route.ts` was *not* treated as a "public
  token-authenticated route" to exclude: the `[token]` path segment
  identifies which physical KORA Link/worker is being activated, but the
  actual authorization is `getCurrentWorkerUser(request)` (the worker's own
  session) — the token is not itself a bearer credential. It is protected
  like any other worker/session route.
- No `OPTIONS` handler, no CORS header (`Access-Control-Allow-Origin` or
  otherwise), and no CORS logic of any kind exists anywhere in the app
  (verified via repo-wide grep) or in `middleware.ts`. No CORS was
  introduced by this sprint, and none needed to be preserved.

## Route escluse e motivazione

None. See "Route inventory" above — no webhook/cron/public-token/
server-to-server mutating route exists in the codebase today.

## Limitazioni note

- This guard defends against browser-ambient-cookie CSRF specifically. It
  is **not** a replacement for, and does not weaken:
  - session authentication (`require*User` / `getCurrentWorkerUser`),
  - role/tenant authorization (`assertTenantAccess`, app_metadata role
    checks),
  - Row-Level Security policies,
  - or the `SameSite` attribute already set on the Supabase session cookie.
  All of those remain fully in effect, unchanged, on every route this
  sprint touched.
- `NEXT_PUBLIC_SITE_URL` is trusted as configured — if it is ever
  misconfigured to point at the wrong deployment, the guard would allow
  that (wrong) origin. This is an existing trust assumption already made by
  the several routes that use this variable for building absolute URLs; it
  was not introduced by this sprint.
- If a legitimate reverse proxy in front of a future deployment does not
  forward `X-Forwarded-Host`/`X-Forwarded-Proto` correctly,
  `request.nextUrl.origin` could resolve incorrectly. This is a
  pre-existing property of how the rest of the codebase already treats
  `request.nextUrl`/`request.url` (e.g. `middleware.ts`'s own redirects),
  not a new assumption.

## Come aggiungere in futuro una nuova route mutante

1. If the new route is a genuine browser/session-based mutation (called by
   this app's own client code, protected by `require*User` /
   `getCurrentWorkerUser`, or an equivalent direct cookie check): add
   ```ts
   import { assertSameOrigin } from '@/lib/security/origin';
   ```
   and, as the **first statement** in the handler body (before any auth or
   business logic):
   ```ts
   const originGuard = assertSameOrigin(request);
   if (originGuard) return originGuard;
   ```
2. If the new route is a **webhook, cron job, or server-to-server
   integration** authenticated by a shared secret or provider signature
   (not a Supabase session and not the dual cookie/bearer pattern above):
   **do not** call `assertSameOrigin`. Document why in the route's own
   header comment, the way `app/api/admin/operator-flow/route.ts` already
   documents its dual auth model.
3. Add the route to the inventory test in
   `tests/unit/security-origin-guard-03-routes.test.ts` so the "inventario
   completo" check keeps covering it.

## Test aggiunti

- `tests/unit/security-origin-guard-03.test.ts` — 22 tests against
  `checkOrigin()`/`assertSameOrigin()` directly (constructed `NextRequest`
  objects): same-origin, explicit configured origin, absent Origin, bearer
  exemption (including case-insensitive `bearer`), safe methods (GET/HEAD/
  OPTIONS), local dev (no config), and every bypass class listed above
  (protocol, port, subdomain, suffix, credentials-in-URL, `Origin: null`,
  malformed string, case-insensitivity as a non-regression), plus a check
  that the `403` body never contains the origin values or any secret.
- `tests/unit/security-origin-guard-03-routes.test.ts` — 21 tests,
  source-level structural audit (same convention as
  `tests/unit/b161-worker-pib-routes.test.ts`): representative routes
  across every auth pattern found (`KORA_ADMIN` single/dual-method,
  `COMPANY_ADMIN`, `WORKER`, multi-role `commons/posts`, direct-cookie
  `auth/logout`, dynamic `[token]` KORA Link route) call the guard as the
  literal first statement, before any existing auth call; `GET` handlers
  are unaffected; no route has more than one guard call; and a full
  45-route/46-method inventory check that every mutating route found in
  this sprint both imports and calls `assertSameOrigin`.

Full suite after this sprint: 246 test files, 10110 tests passed, 30
skipped — the same 30 skipped as the pre-sprint baseline (no test removed,
skipped, or weakened by this sprint).

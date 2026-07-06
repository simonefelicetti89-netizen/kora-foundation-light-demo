# Gate 2 — Staging App Environment Wiring

> Archived: canonical Gate 2 status now lives in docs/GATE2_STATUS.md.

**Status:** Audit complete — ready for local staging run or Vercel Preview  
**Staging Supabase project:** `haqflkurpmeaxpikozjl` (dedicated staging only)  
**Production:** NOT touched  
**Date:** 2026-06-22  
**HEAD at audit:** `395aeb1`

> **Migration 027 NOT applied.**  
> **Migration 029 NOT applied.** Emergency safety net only.  
> **DO NOT** commit secrets or key values. **DO NOT** print secrets or passwords.  
> **DO NOT** set production Supabase project in staging env vars.

---

## 1. Discovery Summary

### No Vercel project link found

No `.vercel/` directory exists in the repo. No `vercel.json` file exists. The app has
not been linked to a Vercel project via CLI in this working copy.

### App reads three primary Supabase env vars

| Env Var | Used by | Public / Secret | Required for smoke |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser client, server client, middleware | **Public** (client-side) | ✓ Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser client, server client, middleware | **Public** (treat as sensitive) | ✓ Required |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only admin/service client | **Secret** (server-only, never expose to browser) | ✓ Required for admin API routes |

### Additional app env vars

| Env Var | Purpose | Value for staging smoke |
|---|---|---|
| `NEXT_PUBLIC_KORA_DEFAULT_ENV` | App mode: `demo` \| `live` \| `future` | **`live`** — switches from demo seed to Supabase connection |
| `KORA_GATE_2_STATUS` | Informational gate flag | `open` |
| `KORA_GATE_3_STATUS` | Informational gate flag | `open` |
| `KORA_GATE_5_STATUS` | Informational gate flag | `open` |
| `AUDIT_HASH_SALT` | One-way hash salt for IP/UA in audit log | Any non-empty string for staging |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error reporting | Leave empty for staging smoke |
| `SENTRY_AUTH_TOKEN` | Source map upload | Leave empty — not needed for smoke |

### Middleware behavior with missing env vars

`middleware.ts` checks for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
before attempting session refresh. If either is missing, it passes the request through
without auth (`NextResponse.next()`). This means: **if env vars are not set, all auth
guards are bypassed silently.** For smoke tests, env vars MUST be set.

### Auth callback route

`/auth/callback` is the Supabase PKCE callback. It must be reachable at the staging URL.
For local runs: `http://localhost:3000/auth/callback`.
In Supabase Dashboard → Authentication → URL Configuration → **Site URL** must match the
staging app origin, and **Redirect URLs** must include `<staging-origin>/auth/callback`.

---

## 2. Required Supabase Dashboard Setting (staging project only)

Before running the app against staging, confirm in Supabase Dashboard →
project `haqflkurpmeaxpikozjl` → Authentication → URL Configuration:

| Setting | Value for local staging run |
|---|---|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/callback` |

For a Vercel Preview URL, add the preview URL to Redirect URLs as well.

> Values shown are examples for local dev. Do not print the actual Supabase project URL
> in this document. Obtain it from: Dashboard → `haqflkurpmeaxpikozjl` → Settings → API.

---

## 3. Recommended Staging Deployment Strategy

### Recommendation: Strategy C — Local Staging Run

**Rationale:**
- No Vercel project link exists — Vercel Preview requires linking first
- Local run is fastest, safest, and sufficient for browser smoke tests
- Middleware and auth cookie behavior are identical between local and deployed
- No secrets leave the local machine
- Secrets stored in a gitignored `.env.staging.local` file

**Suitable for:**
- Manual browser smoke tests (company login, worker login, RLS boundary UX)
- One-person or small team validation before Gate 2 close

**Not suitable for:**
- Shared team testing (requires a deployed URL)
- CI/CD integration

### Strategy A — Vercel Preview (future option)

When a shared staging URL is needed:

1. `vercel link` → link to a Vercel project (new or existing)
2. In Vercel Dashboard → Project → Settings → Environment Variables:
   - Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_KORA_DEFAULT_ENV=live`,
     `AUDIT_HASH_SALT` — all scoped to **Preview** environment only
   - **DO NOT** set these in the **Production** environment scope
3. Push a branch or trigger a preview deploy
4. Add the preview URL to Supabase `haqflkurpmeaxpikozjl` → Auth → Redirect URLs
5. Run smoke tests against the preview URL

---

## 4. Staging Env Var Mapping (redacted)

Create a local file: `.env.staging.local`  
**This file is gitignored (`/.env*`) — NEVER commit it.**  
**DO NOT print its contents in any log, terminal, or document.**  
**Store it in 1Password or equivalent outside the repository.**

```
# ── KORA Staging Environment — LOCAL USE ONLY ─────────────────────────────────
# Supabase staging project: haqflkurpmeaxpikozjl
# DO NOT use production Supabase values here.
# DO NOT commit this file. DO NOT print these values.
# ─────────────────────────────────────────────────────────────────────────────

# Supabase staging URL — obtain from:
# Dashboard → haqflkurpmeaxpikozjl → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://haqflkurpmeaxpikozjl.supabase.co

# Supabase staging anon key — obtain from:
# Dashboard → haqflkurpmeaxpikozjl → Settings → API → Project API keys → anon / public
# Treat as sensitive — do not log, print, or expose in browser console.
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key — from Dashboard, not committed>

# Supabase staging service role key — server-side ONLY, NEVER expose to browser.
# Obtain from: Dashboard → haqflkurpmeaxpikozjl → Settings → API → service_role
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key — from Dashboard, not committed>

# Set to "live" so the app uses Supabase connections instead of demo seed data.
NEXT_PUBLIC_KORA_DEFAULT_ENV=live

# Gate flags — informational only, not enforced at runtime.
KORA_GATE_2_STATUS=open
KORA_GATE_3_STATUS=open
KORA_GATE_5_STATUS=open

# Audit log salt — any non-empty string for staging.
AUDIT_HASH_SALT=staging-audit-salt-local

# Sentry — leave empty for staging smoke tests.
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

---

## 5. Pre-Deploy Checks

Before running the app against staging:

- [ ] Confirm `origin/main` is at `395aeb1` (or current HEAD after subsequent commits)
- [ ] Confirm staging Supabase project ref is `haqflkurpmeaxpikozjl`
- [ ] Confirm production Supabase env vars are NOT in `.env.staging.local`
- [ ] Confirm migration 027 NOT applied to staging
- [ ] Confirm migration 029 NOT applied to staging
- [ ] Confirm `.env.staging.local` is gitignored (verify with `git status`)
- [ ] Confirm Site URL and Redirect URLs are set in Supabase Auth settings for staging
- [ ] Confirm passwords for synthetic users are stored outside the repo

---

## 6. Local Staging Run Steps

```bash
# 1. Create .env.staging.local with staging values (from Dashboard — do not print)
#    Place at repo root. Confirm it is gitignored with: git status

# 2. Start dev server with staging env
cp .env.staging.local .env.local   # or use dotenv-cli / direnv
npm run dev

# Alternative with dotenv-cli:
# npx dotenv -e .env.staging.local -- npm run dev

# 3. Open browser: http://localhost:3000/company/login
# 4. Run smoke tests from docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §6.5–6.7
```

> If using `cp .env.staging.local .env.local`, ensure `.env.local` is NOT committed.
> After smoke tests, restore original `.env.local` if needed.

---

## 7. Deployment Checklist (Vercel Preview — when needed)

Supabase env vars:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — scoped to **Preview** only (not Production)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — scoped to **Preview** only
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — scoped to **Preview** only (server-side)
- [ ] `NEXT_PUBLIC_KORA_DEFAULT_ENV=live` — scoped to **Preview** only
- [ ] `AUDIT_HASH_SALT` — scoped to **Preview** only
- [ ] Confirm production env scope is unchanged after setting preview vars

Deploy:

- [ ] Trigger preview deploy (branch push or Vercel Dashboard manual deploy)
- [ ] Capture preview URL (format: `https://kora-xxx.vercel.app` or similar)
- [ ] Add preview URL to Supabase Auth → Redirect URLs for `haqflkurpmeaxpikozjl`
- [ ] Do NOT expose URL in any public document

---

## 8. Post-Deploy / Post-Start Checks

- [ ] `http://localhost:3000` (or preview URL) loads without error
- [ ] `/company/login` renders login form
- [ ] `/worker/login` or `/login` renders login form
- [ ] `/auth/callback` is reachable (will 400 without a valid code — that is correct)
- [ ] Login as `company-admin@staging.kora.internal` succeeds
- [ ] Redirect lands at `/company/workspace`
- [ ] STAGE-001 data visible (workspace loads without 0-row error)
- [ ] No individual PIB visible in any company-facing view
- [ ] Login as `worker-a@staging.kora.internal` succeeds
- [ ] Redirect lands at `/worker/workspace`
- [ ] No cross-worker data visible

---

## 9. Browser Smoke Test Handoff

After confirming the app is running against staging, execute:

**`docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §6.5 — Company UI Route Smoke`**  
**`docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §6.6 — Worker UI Route Smoke`**

Priority order per §6.5–6.6:
1. `company-admin@staging.kora.internal` → company workspace → verify no individual PIB
2. `worker-a@staging.kora.internal` → worker workspace → 1 attended booking, LIFE PIB
3. `worker-b@staging.kora.internal` → worker workspace → 1 approved booking, GROWTH PIB
4. `worker-c@staging.kora.internal` → worker workspace → 0 bookings, CONNECTION PIB
5. Any worker: attempt to navigate to another worker's `/worker/workspace` → expect 403 or redirect

---

## 10. Migration State

| Migration | Status |
|---|---|
| 001–026 | ✓ Applied |
| 027 | **NOT applied** — DO NOT apply before Gate 2 + Gate 3 close |
| 028 | ✓ Applied |
| 029 | NOT applied — emergency safety net only |

---

**Document version:** v1.0  
**Prepared:** 2026-06-22  
**Gate status:** Gate 2 OPEN · Gate 3 OPEN  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched

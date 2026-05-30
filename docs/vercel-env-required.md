# KORA Foundation Light — Environment Variables for Vercel

This document lists all environment variables required to deploy KORA on Vercel.
Configure these in the Vercel dashboard under **Project Settings → Environment Variables**.

**Important:** Never commit `.env.local` or any file containing actual values.
This document lists variable names only — no values.

---

## Required for the app to function

These must be set for every environment (Production, Preview, Development on Vercel).

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (client + server) | Supabase project REST API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (client + server) | Supabase anon/publishable key — safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | Supabase service role key — bypasses RLS. **Never expose to client.** |

**Note on middleware:** If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the middleware safely skips session refresh and passes requests through. Route-level auth still enforces access control. The app will not crash.

---

## Required for operator flow

| Variable | Scope | Purpose |
|---|---|---|
| `KORA_OPERATOR_SECRET` | Server-side only | Deprecated fallback auth for `/api/admin/operator-flow` (dev-only, blocked in production). See `docs/technical-backlog.md` TODO-002 for removal plan. |

**Production note:** `KORA_OPERATOR_SECRET` is BLOCKED in production (`NODE_ENV === 'production'`). The operator flow requires a real KORA_ADMIN session — the secret fallback does nothing in production. You may omit this variable from the production environment.

---

## Dev/test only — do NOT set in production

These variables are used exclusively by `/api/test/*` routes, which return `404` in production regardless.

| Variable | Scope | Purpose |
|---|---|---|
| `KORA_TEST_SEED_SECRET` | Server-side only | Shared secret for all `/api/test/*` route guards |
| `KORA_TEST_USER_PASSWORD` | Server-side only | Password for synthetic test auth users (`*@example.test`) |

**Security:** Do not set these in the Vercel Production environment. If accidentally set, they pose no risk since the test routes return `404` in production — but it is cleaner to omit them.

---

## Automatically set by Vercel

| Variable | Notes |
|---|---|
| `NODE_ENV` | Set to `production` by Vercel automatically. Controls test route 404 guards and operator secret block. |

---

## Summary by environment

| Variable | Production | Preview | Local dev |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Required | ✅ Required | ✅ Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Required | ✅ Required | ✅ Required |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Required | ✅ Required | ✅ Required |
| `KORA_OPERATOR_SECRET` | ⚠️ Optional (blocked anyway) | ⚠️ Optional | ✅ Set for dev |
| `KORA_TEST_SEED_SECRET` | ❌ Omit | ❌ Omit | ✅ Set for dev |
| `KORA_TEST_USER_PASSWORD` | ❌ Omit | ❌ Omit | ✅ Set for dev |

---

## Steps to configure on Vercel

1. Go to Vercel Dashboard → your project → **Settings → Environment Variables**
2. Add `NEXT_PUBLIC_SUPABASE_URL` — apply to Production + Preview + Development
3. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` — apply to Production + Preview + Development
4. Add `SUPABASE_SERVICE_ROLE_KEY` — apply to Production + Preview, **Server-side only** (do not mark as exposed to browser)
5. Redeploy the project

After setting these three variables, `MIDDLEWARE_INVOCATION_FAILED` will be resolved and the operator flow will function correctly.

# KORA Access Provisioning Doctrine

**Version:** 1.0 — B119 Foundation Light
**Authority:** KORA_ADMIN
**Status:** Enforced in Foundation Light

---

## Core Principle

**KORA non registra utenti pubblici: attiva identita gia provisionate.**

There is no self-signup, no public registration, no user-initiated account creation.
Every real user in KORA exists because a KORA_ADMIN created or invited them explicitly.
The first login is activation only — not account creation.

---

## No Self-Signup

KORA does not support public self-signup in any form:

- No `supabase.auth.signUp()` call exists on any client-side route.
- No public route creates a Supabase auth user.
- No form on any public page can create an account.
- Role selection is never client-controlled — roles are assigned server-side via `app_metadata.kora_role`.
- Tenant assignment is never client-controlled — `app_metadata.kora_tenant_id` is set by KORA_ADMIN only.

---

## Provisioning Lifecycle

```
KORA_ADMIN provisions user
  → Supabase invite sent (inviteUserByEmail) OR user created via admin.createUser
  → app_metadata.kora_role assigned (server-side, non-writable by client)
  → app_metadata.kora_tenant_id assigned (server-side, non-writable by client)
  → kora_status = 'active'
  → User receives email invite
  → User clicks link → /auth/callback → /auth/set-password (first login)
  → First login = activation, not registration
```

The user never chooses their role. The user never chooses their tenant. Both are set by KORA_ADMIN and stored in `app_metadata` — not in `user_metadata`, which users can write.

---

## Supported Roles

| Role | Provisioned By | Route |
|---|---|---|
| `KORA_ADMIN` | Manual / Supabase Dashboard | `/api/admin/provision` |
| `COMPANY_ADMIN` | KORA_ADMIN via `/api/admin/companies/provision` | `/company/workspace` |
| `WORKER` | KORA_ADMIN via `/api/admin/workers/provision` | `/worker/workspace` |
| `COMPANY_VIEWER` | Legacy only — not a new provisioning role | `/company/workspace` (read-only) |
| `PARTNER` | Future — not active in Foundation Light | — |

**COMPANY_VIEWER** is legacy-compatible: existing sessions remain valid.
New provisioning (`/api/admin/companies/provision`) only accepts `COMPANY_ADMIN`.

---

## Tenant Isolation

- One company = one tenant (`analytics.tenant` row, unique `tenant_code`).
- A COMPANY_ADMIN or WORKER belongs to exactly one tenant.
- Tenant assignment is cross-checked at provisioning: if a user email already exists and is assigned to a different tenant, provisioning returns a `409 conflict` — no cross-tenant leakage.
- Workers cannot self-select their company.
- Companies cannot self-create their tenant.

---

## Request Access Flow

`/request-access` is a public informational page:

- No Supabase calls. No account creation.
- Provides a mailto link to send a request to KORA.
- Copy states explicitly: "La richiesta non crea un account. KORA valutera e, se approvata, inviera un invito."
- A submitted request does not guarantee access. KORA_ADMIN reviews and provisions if approved.

---

## Enforcement Points

| Layer | Mechanism |
|---|---|
| Client | No `signUp()` call anywhere |
| Login page | No registration form; "Accesso su invito" badge |
| Middleware | `app_metadata.kora_role` determines routing; client cannot inject role |
| API routes | `requireKoraAdmin()`, `requireCompanyUser()`, `requireWorkerUser()` on every route |
| `app_metadata` | Only writable via Service Role key (server-side admin); not writable by authenticated user |
| Provisioning API | `VALID_ROLES` enforced; cross-tenant conflict detection |

---

## Privacy and Tenant Isolation Motivation

The no-self-signup doctrine exists to enforce the KORA privacy boundary:

- A worker must never reach another company's tenant data.
- A company must never access worker-private My KORA data.
- An unauthenticated visitor must never receive any organizational data.

Controlled provisioning ensures every user arrives in the correct tenant context with the correct role — before they can access any data.

---

## What This Doctrine Does NOT Restrict

- Password recovery (`/auth/forgot-password`) remains open to all authenticated and unauthenticated users.
- The unified login page (`/login`) remains public.
- The `/request-access` informational page remains public.
- Existing COMPANY_VIEWER sessions and auth flows are not broken.
- KORA_ADMIN provisioning routes are not affected by this doctrine — they are the enforcement mechanism.

---

*Document authority: B119 Foundation Light. All provisioning decisions flow through KORA_ADMIN.*

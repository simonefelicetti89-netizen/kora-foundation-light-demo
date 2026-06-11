# Worker Privacy & Sharing — Foundation Light

**Sprint:** B126 (updated from B122)  
**Status:** Foundation Light v0.1 — CV share link active; LinkedIn/public snapshot deferred

---

## What this covers

B122 introduces the Worker Privacy & Sharing settings panel: a clear, non-evaluative screen where workers understand exactly what stays private, what is aggregated at company level, and what future sharing controls will look like under their control.

---

## Route: `/worker/privacy`

**Access:** WORKER only. `requireWorkerUser` enforced server-side.  
**Identity:** `workerId` and `tenantId` always from session — never from URL or request body.  
**No migration:** this sprint is informational only. No sharing toggles activated.

---

## Privacy model — canonical

### Always private (worker-only)

These are never accessible to employer roles:

- Dynamic Impact CV (`/worker/dynamic-cv`)
- Participation history (`personal.worker_participation`)
- Personal interests and private notes (`private_note` field)
- Onboarding status
- Individual wellbeing and training data

### Aggregated — visible to employer as anonymous aggregate only

The employer sees only company-level aggregates with `SAFE_AGGREGATION_THRESHOLD = 10`. Below 10 workers in a group, data is suppressed entirely.

- Activation rate (company-level average)
- Pillar distribution (no individual attribution)
- KORA Index (organizational indicator, not individual)

### Active sharing controls — B126

**Dynamic Impact CV share link (active):**
- Worker creates a controlled share link at `/worker/dynamic-cv`
- Token: 32 bytes CSPRNG → hex (64 chars), unguessable
- DB stores SHA-256 hash only — raw token shown once to worker, never persisted
- Default expiry: 30 days from creation
- Revocable at any time by the worker
- Link contains only the raw token — no worker_id, no tenant_id
- Employer access: **not permitted** — no company route can access CV share data
- Public view: `/cv/share/[token]` — public-safe subset of CV (no score, no ranking, no private_note)
- KORA_ADMIN cannot generate share links for real workers

**What public-safe CV excludes:**
- `worker_id` (internal UUID never shown)
- `tenant_id` (internal UUID never shown)
- Email (not shown in B126)
- `private_note` (always excluded)
- Ranking, score, percentile, comparison with colleagues

**What public-safe CV shows:**
- `display_name`
- Pillar profile (counts per pillar)
- Experiences (title, pillar, status label, date)
- Privacy disclaimer footer (non-suppressible)

### Future sharing controls (still deferred)

- Anonymous public snapshot (explicit consent, always revocable)
- LinkedIn sharing

---

## Architectural decisions

- **B126: `personal.worker_cv_share` migration (011).** Token hash stored, raw token shown once and discarded. Table has no company RLS policy.
- **B126: Public share route `/cv/share/[token]`.** Server-side token lookup via service role. Authenticated workers can also access it (WORKER_ALLOWED_PREFIXES updated in middleware).
- **B126: Printable view `/worker/dynamic-cv/print`.** Server component, WORKER only. Browser Cmd+P → PDF. No Chromium required (same strategy as Decision Pack).
- **B126: KORA_ADMIN cannot generate share links for real workers.** Admin preview shows disabled CTA with explicit banner.
- **`private_note` is never surfaced outside the worker owner.** Not in CV, not in public share view, not in admin preview, not in any aggregate.
- **Token never logged.** No `console.log`, no error message includes raw token.

---

## Components

| Path | Role | Purpose |
|---|---|---|
| `app/worker/privacy/page.tsx` | WORKER | Server page — auth check, renders client |
| `app/worker/privacy/_components/PrivacySettingsClient.tsx` | WORKER | Client panel — CV share link active, others deferred |
| `app/api/worker/privacy-settings/route.ts` | WORKER | GET — returns informational privacy status |
| `app/admin/preview/worker/privacy/page.tsx` | KORA_ADMIN | Synthetic preview for admin presentation |
| `app/worker/dynamic-cv/print/page.tsx` | WORKER | Printable CV view — WORKER only, browser print |
| `app/api/worker/dynamic-cv/share/route.ts` | WORKER | POST — create share link (token returned once) |
| `app/api/worker/dynamic-cv/shares/route.ts` | WORKER | GET — list own share links (no token_hash) |
| `app/api/worker/dynamic-cv/shares/[id]/revoke/route.ts` | WORKER | PATCH — revoke own share link |
| `app/cv/share/[token]/page.tsx` | PUBLIC | Public share view — server-side token lookup |
| `lib/worker-cv/share-token.ts` | Utility | Token generation, hashing, expiry, URL builder |
| `supabase/migrations/011_worker_cv_share.sql` | Migration | `personal.worker_cv_share` table with RLS |

---

## Sidebar navigation

Worker sidebar: `Privacy & Condivisione` now routes to `/worker/privacy` (live).  
Admin preview mode: routes to `/admin/preview/worker/privacy` (synthetic fixture, no real data).

---

## Definition of done

### B122 (closed)
- Worker has a clear, honest privacy panel at `/worker/privacy`
- No active sharing or public link is introduced
- No individual worker data is exposed to employer routes
- All sharing controls are visibly disabled with "Prossimamente"
- Admin preview is synthetic — no real worker queries

### B126 (closed)
- Worker can create a controlled share link for Dynamic Impact CV
- Token is 32-byte CSPRNG hex — unguessable
- DB stores SHA-256 hash only — raw token never persisted
- Default expiry 30 days — visible to worker
- Worker can revoke any active share link
- Public view (`/cv/share/[token]`) shows public-safe CV (no score, no ranking, no private_note, no worker_id, no tenant_id)
- Revoked and expired links show explicit invalidation pages (not 404)
- Employer access: no company RLS policy, no company route path
- KORA_ADMIN preview shows disabled CTA with "Esempio sintetico" banner
- Printable view at `/worker/dynamic-cv/print` — WORKER only, browser print
- Middleware updated: `/cv/share/` in WORKER_ALLOWED_PREFIXES and AppShell PUBLIC_ROUTE_PREFIXES
- No token logged in any file

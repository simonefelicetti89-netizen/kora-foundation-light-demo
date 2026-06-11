# Worker Privacy & Sharing — Foundation Light

**Sprint:** B122  
**Status:** Foundation Light v0.1 — informational panel, no active sharing

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

### Future sharing controls (all disabled in Foundation Light)

These controls will be activated in post-pilot versions under strict worker consent:

- CV sharing (selective, revocable)
- Anonymous public snapshot (explicit consent, always revocable)
- LinkedIn sharing

---

## Architectural decisions

- **No `cv_share_enabled` column in this sprint.** The spec deferred migration until sharing is actually activated. Adding a column with no enforcement is misleading.
- **No public link generation.** Any public link must be revocable and token-based — that infrastructure is post-pilot.
- **No export PDF in this sprint.** PDF export is deferred per B122 spec.
- **`private_note` is never surfaced outside the worker owner.** Not in CV, not in admin preview, not in any aggregate.

---

## Components

| Path | Role | Purpose |
|---|---|---|
| `app/worker/privacy/page.tsx` | WORKER | Server page — auth check, renders client |
| `app/worker/privacy/_components/PrivacySettingsClient.tsx` | WORKER | Client panel — fetches from API, renders privacy model |
| `app/api/worker/privacy-settings/route.ts` | WORKER | GET — returns informational privacy status |
| `app/admin/preview/worker/privacy/page.tsx` | KORA_ADMIN | Synthetic preview for admin presentation |

---

## Sidebar navigation

Worker sidebar: `Privacy & Condivisione` now routes to `/worker/privacy` (live).  
Admin preview mode: routes to `/admin/preview/worker/privacy` (synthetic fixture, no real data).

---

## Definition of done (B122)

B122 is closed when:
- Worker has a clear, honest privacy panel at `/worker/privacy`
- No active sharing or public link is introduced
- No individual worker data is exposed to employer routes
- All sharing controls are visibly disabled with "Prossimamente"
- Admin preview is synthetic — no real worker queries

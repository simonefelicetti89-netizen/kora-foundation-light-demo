# KORA Privacy Escalation Model

**Document:** B81-B Worker Identity Foundation  
**Date:** 2026-06-07  
**Status:** Canonical. Documentation only — no privileged access implemented in Foundation Light.

---

## Canonical Principle

> **KORA_ADMIN ≠ automatic access to worker PIB.**

Platform administration does not grant access to individual worker data. These are separate authority domains by design. Conflating them would make every platform operator a privacy risk to every worker on the platform.

---

## Role Boundaries

### Company Admin (`COMPANY_ADMIN`)

**Can see:**
- KORA Index™ (company-level, 10 components)
- Activation rates, pillar distribution (company-level aggregates)
- Department/cohort trends — only if group size ≥ 10 (`safe_aggregation_threshold`)
- Worker roster metadata: department, site, cluster, `my_kora_enabled` status, consent status (granted/pending/revoked) — but never the content of consent
- Verification rate and Confidence Score (company-level)

**Cannot see — ever:**
- Individual PIB score for any worker
- Worker event timeline (what events, when, what category)
- Dynamic Impact CV (any worker's)
- Health data, psychological details, clinical notes
- Booking choices or service participation history
- Consent record content (what was agreed to, with which parties)
- Any group below N=10 (re-identification risk — suppressed by `PrivacyVisibilityService`)
- `worker_kora_id` — this is worker-owned and KORA-held, never company-accessible

---

### KORA Admin (`KORA_ADMIN`)

**Can do:**
- Manage platform operations (tenant provisioning, company onboarding, scoring pipeline)
- Access all company-level KORA outputs (as diagnostic operator)
- Review demo content and synthetic data (My KORA PREVIEW mode)
- Configure tenant settings and pipeline parameters

**Does NOT have ordinary access to:**
- Real individual worker PIB
- Real worker event timelines
- Real Dynamic CV content for identified workers
- Any real My KORA personal layer content

**Foundation Light behaviour:** `MyKoraPreviewService.canAccess()` currently permits KORA_ADMIN to view My KORA pages because all data is synthetic. This is acceptable in PREVIEW mode where no real worker identity exists.

**Pilot+ constraint:** When real worker identities and real PIB exist, KORA_ADMIN access to the worker personal layer must be gated separately. See Privacy Escalation Role below.

---

### Worker (`WORKER`)

**Owns:**
- `worker_kora_id` — permanent, portable, KORA-issued identity
- Their PIB — private, computed from their events, never employer-visible
- Dynamic Impact CV — worker decides what to share and with whom
- Consent toggles — worker controls all consent dimensions
- Event timeline — full record of their activities at category level (not clinical detail)
- Right to revoke consent — zeroes contribution to company aggregates from revocation date

**Cannot see:**
- Other workers' data in any form
- Company-level scoring internals
- Pipeline configuration or raw ingestion data

---

## Privacy Escalation Role

A **Privacy Escalation Role** is a temporary, audited, scoped elevation of access — distinct from ordinary KORA_ADMIN. It exists to handle exceptional circumstances only.

### When it applies

| Scenario | Description |
|---|---|
| Worker support request | Worker reports data error in their PIB or timeline |
| Rectification | Worker exercises GDPR right to rectification |
| Privacy audit | Regulatory or legal review of specific worker records |
| Worker consent dispute | Verification that consent was correctly recorded |
| Incident response | Specific breach investigation affecting identified worker(s) |

### Requirements before escalation

Every escalation access event must satisfy all of the following:

1. **Documented reason** — a written justification citing the specific worker and specific scenario
2. **Audit log entry** — immutable log of who accessed what, when, and why
3. **Scoped access** — limited to the specific worker and specific data category requested (no bulk access)
4. **Temporary access** — time-bounded (e.g., 24 hours), automatically revoked after expiry
5. **Worker notification** — the worker is notified that their data was accessed (unless legally prohibited in a specific jurisdiction)

### What escalation access does NOT grant

- Access to any other worker's data
- Ability to modify PIB values directly (only the pipeline may produce PIB)
- Employer-visible export of individual data
- Permanent elevated access

### Implementation note

This document defines the canonical model. Privileged access is **not implemented** in Foundation Light. When Pilot+ is deployed:
- A separate `PrivacyEscalationService` handles escalation requests
- All escalation events are written to an immutable audit table
- Access tokens are short-lived and scoped to specific `worker_kora_id` + data category
- No UI displays escalated data in any employer-visible context

---

## Pseudonymization Boundary

The mapping `worker_kora_id → worker_pseudonym_id` is the most privacy-sensitive artifact in the KORA system.

- It is held **only in the KORA privacy layer** — never exposed to companies, partners, or advisors
- It enables pipeline attribution (per-worker UEF records) without exposing real identity
- Revoking worker consent requires that the pseudonymization mapping is either deleted or replaced (re-pseudonymization), invalidating historical company-facing aggregate records that depended on it
- The mapping is never logged in plain text, never serialized to company-accessible storage

---

## Summary Table

| Data type | Company Admin | KORA Admin | Worker (self) | Privacy Escalation |
|---|---|---|---|---|
| KORA Index (company) | ✓ | ✓ | — | — |
| Pillar distribution (company) | ✓ | ✓ | — | — |
| Individual PIB | ✗ | ✗ | ✓ | ✓ (audited, scoped) |
| Event timeline | ✗ | ✗ | ✓ | ✓ (audited, scoped) |
| Dynamic CV | ✗ | ✗ | ✓ | ✓ (audited, scoped) |
| Consent records | ✗ | ✗ | ✓ | ✓ (audited, scoped) |
| Health data | ✗ | ✗ | ✓ | ✓ (audited, scoped) |
| Pseudonym mapping | ✗ | ✗ | ✗ | ✓ (audited, scoped) |
| `worker_kora_id` | ✗ | admin only | ✓ | ✓ |

---

*This document is authoritative for KORA privacy model decisions. Any implementation that contradicts it must be corrected before deployment.*

# KORA Link — Status

**Last verified date:** 2026-07-04
**Last verified commit:** KORA-LINK-S2 (KL-19)
**Audience:** CTO, technical advisor, anyone deciding what to work on next

---

## Scope

The current, single-source answer to "what is KORA Link's status and is it in scope right now." Detailed gate-by-gate history lives in `KORA_LINK_GATE_REPORT.md` (most recent: KL-11, 2026-07-01; KL-19 addendum added 2026-07-04) and `KORA_LINK_CHANGELOG.md` (KL-01 through KL-07+, running log) — this doc summarizes and doesn't replace them.

## The one-line answer

**KORA Link is frozen and is not part of the current pilot path.** Runtime skeleton code exists behind a default-off feature flag; it is not enabled anywhere, has zero coupling to the golden path, and further progress is blocked on CTO/DPO/legal review gates that have not started or are still open.

---

## What is proven

- **Zero coupling to the golden path.** No golden-path file (data intake, UEF, scoring, KORA Index, Decision Pack) imports anything from a `kora-link` path — confirmed during the GOLDEN-01 audit. Work on KORA Link cannot accidentally regress the pilot path, and pilot-path work does not need to account for KORA Link.
- **Default-off, safely.** `KORA_LINK_ENABLED` defaults to `false`; only an explicit `'true'` env value enables it (case-sensitive, no ambiguous truthy fallback) — per `lib/kora-link/config.ts`'s `isKoraLinkEnabled()`, test-covered.
- **Gate 1 (runtime base) is complete** per `KORA_LINK_GATE_REPORT.md` (KL-11, 2026-07-01): token core, runtime config, rate-limit adapter, public route helper, and a public route page skeleton (`app/link/[token]/page.tsx`) exist, with dedicated test coverage (253 KORA-Link-specific tests cited in that report).
- **Gate 2 (schema 034 review) is substantively closed at the engineering level** — KORA-LINK-S2 (KL-19, 2026-07-04): of the 8 open TODOs, 5 were CTO/engineering-decidable and are now resolved with documented rationale directly in `supabase/proposed/034_kora_link_schema.sql`'s header (FK cross-schema policy confirmed consistent with migration 033 precedent and now RLS-proven by RLS-03/05/06; TTL enforcement confirmed already implemented at the SECURITY DEFINER query layer in 036, not deferred to app-layer as originally framed; `link_delivery_records` confirmed in-scope for v1 pilot logistics; stable-secret/no-`key_version` rotation policy confirmed sufficient for pilot scale; schema naming and PostgreSQL-version compatibility confirmed consistent with repo convention). The remaining 3 are genuine Gate 3 (DPO/legal) blockers, not engineering questions — see Gate 3 row below. New regression-lock coverage: `tests/unit/kora-link-schema034-review.test.ts`. As a byproduct, a naming inconsistency between `035`'s spec-only function names and `036`'s actual implemented names was found and reconciled (comment-only fix, no RLS/function logic touched).

## What is NOT proven / explicitly blocked

Per `KORA_LINK_GATE_REPORT.md` (KL-11) and the KL-19 addendum, as of 2026-07-04:

| Gate | Status |
|---|---|
| Gate 1 — Runtime Base | Complete |
| Gate 2 — Schema 034 Review (CTO) | **Substantively closed (engineering), KL-19 2026-07-04** — 5/8 TODOs resolved with documented rationale; human CTO ratification still pending (formality, no open engineering questions remain) |
| Gate 3 — Privacy/DPO/Legal | Open — privacy notice not approved; 3 items carried over from 034 review (audit log retention duration, `request_fingerprint` hashing strategy, `delivered_to_label`/consent-notice content) now precisely scoped as BLOCKER comments in `034`'s header |
| Gate 4 — RLS 035 Review | Open — **draft exists** (`supabase/proposed/035_kora_link_rls.sql`, RLS policies: KORA_ADMIN-only across all 9 tables), but incomplete: the worker-self-select policy on `link_assignments` and both SECURITY DEFINER lookup functions (`fn_public_lookup_link`, `fn_activate_link_for_worker` — already implemented in `036`, not yet enabled via policy in `035`) are commented out. No company-facing SELECT policy exists at all yet. Not reviewed/applied. KL-19 did not touch this file's RLS logic (034's engineering review does not extend to 035's own, separate review) — only reconciled stale header/spec-name references. |
| Gate 5 — Staging Env (`KORA_LINK_ENABLED=true`) | Open — not ready, depends on Gates 2+3+4 |
| Gate 6 — Public Route Enablement | Skeleton complete, requires Gates 2+3+5 |
| Gate 7 — Worker Activation flow | Open — not started |
| Gate 8 — Partner Scan | Open — explicitly out of v1 scope |
| Gate 9 — Production Readiness | Open — depends on all prior gates |

This table was re-verified directly against `main` during KORA-LINK-S1 (2026-07-04) — the 035 row above was corrected accordingly (KL-11 had said "not yet drafted"; a draft exists but is incomplete) — and updated again same-day during KORA-LINK-S2 (KL-19) for the Gate 2/3 status change. See `KORA_LINK_ADR.md` for the pilot architecture decision and full current-state inventory (docs, proposed SQL, runtime code, feature flags).

---

## Why it's frozen (product decision, not just gate status)

Per repeated founder-level framing across this sprint: the current strategic priority is proving the service-assisted golden path is credible for external CTO review and a friendly pilot client. KORA Link adds no leverage toward that goal and is explicitly out of scope for the current pilot model — a real pilot company today does not need NFC/QR activation to get a working, credible KORA Index and Decision Pack.

---

## What NOT to do

- Don't enable `KORA_LINK_ENABLED` in any shared environment without the blocking gates above actually closing first.
- Don't treat "frozen" as "delete it" — the Gate 1 skeleton is real, tested work; freezing means not proceeding, not discarding.
- Don't let KORA Link work block or get bundled into golden-path/pilot-readiness work — they're intentionally decoupled, keep it that way in both directions.

## Related docs

`KORA_LINK_ADR.md` (pilot architecture decision + current-state inventory), `KORA_LINK_GATE_REPORT.md`, `KORA_LINK_CHANGELOG.md`, `ARCHITECTURE.md` §8, `STATUS.md`.

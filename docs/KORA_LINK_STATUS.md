# KORA Link — Status

**Last verified date:** 2026-07-03
**Last verified commit:** `8210247` (main)
**Audience:** CTO, technical advisor, anyone deciding what to work on next

---

## Scope

The current, single-source answer to "what is KORA Link's status and is it in scope right now." Detailed gate-by-gate history lives in `KORA_LINK_GATE_REPORT.md` (most recent: KL-11, 2026-07-01) and `KORA_LINK_CHANGELOG.md` (KL-01 through KL-07+, running log) — this doc summarizes and doesn't replace them.

## The one-line answer

**KORA Link is frozen and is not part of the current pilot path.** Runtime skeleton code exists behind a default-off feature flag; it is not enabled anywhere, has zero coupling to the golden path, and further progress is blocked on CTO/DPO/legal review gates that have not started or are still open.

---

## What is proven

- **Zero coupling to the golden path.** No golden-path file (data intake, UEF, scoring, KORA Index, Decision Pack) imports anything from a `kora-link` path — confirmed during the GOLDEN-01 audit. Work on KORA Link cannot accidentally regress the pilot path, and pilot-path work does not need to account for KORA Link.
- **Default-off, safely.** `KORA_LINK_ENABLED` defaults to `false`; only an explicit `'true'` env value enables it (case-sensitive, no ambiguous truthy fallback) — per `lib/kora-link/config.ts`'s `isKoraLinkEnabled()`, test-covered.
- **Gate 1 (runtime base) is complete** per `KORA_LINK_GATE_REPORT.md` (KL-11, 2026-07-01): token core, runtime config, rate-limit adapter, public route helper, and a public route page skeleton (`app/link/[token]/page.tsx`) exist, with dedicated test coverage (253 KORA-Link-specific tests cited in that report).

## What is NOT proven / explicitly blocked

Per `KORA_LINK_GATE_REPORT.md` (KL-11), as of its date:

| Gate | Status |
|---|---|
| Gate 1 — Runtime Base | Complete |
| Gate 2 — Schema 034 Review (CTO) | Open — pending CTO, 8 TODOs in the draft migration |
| Gate 3 — Privacy/DPO/Legal | Open — privacy notice not approved |
| Gate 4 — RLS 035 Review | Open — not started, migration 035 not yet drafted |
| Gate 5 — Staging Env (`KORA_LINK_ENABLED=true`) | Open — not ready, depends on Gates 2+3+4 |
| Gate 6 — Public Route Enablement | Skeleton complete, requires Gates 2+3+5 |
| Gate 7 — Worker Activation flow | Open — not started |
| Gate 8 — Partner Scan | Open — explicitly out of v1 scope |
| Gate 9 — Production Readiness | Open — depends on all prior gates |

This table was not re-verified against the live `feat/kora-link-v1-platform` branch as part of this reconciliation — treat it as "last known state per KL-11" and check that branch/report directly for anything more recent.

---

## Why it's frozen (product decision, not just gate status)

Per repeated founder-level framing across this sprint: the current strategic priority is proving the service-assisted golden path is credible for external CTO review and a friendly pilot client. KORA Link adds no leverage toward that goal and is explicitly out of scope for the current pilot model — a real pilot company today does not need NFC/QR activation to get a working, credible KORA Index and Decision Pack.

---

## What NOT to do

- Don't enable `KORA_LINK_ENABLED` in any shared environment without the blocking gates above actually closing first.
- Don't treat "frozen" as "delete it" — the Gate 1 skeleton is real, tested work; freezing means not proceeding, not discarding.
- Don't let KORA Link work block or get bundled into golden-path/pilot-readiness work — they're intentionally decoupled, keep it that way in both directions.

## Related docs

`KORA_LINK_GATE_REPORT.md`, `KORA_LINK_CHANGELOG.md`, `ARCHITECTURE.md` §8, `STATUS.md`.

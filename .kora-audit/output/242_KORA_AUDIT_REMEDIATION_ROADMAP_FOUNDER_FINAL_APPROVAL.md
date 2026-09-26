# 242 — KORA — AUDIT REMEDIATION ROADMAP — FOUNDER FINAL APPROVAL

**Date:** 2026-09-22
**Type:** Founder approval record. **No roadmap semantics changed. No implementation.**
**Approves:** Registry 219 after DELTA 3 (audit-remediation canonicalization) and the R0
execution-tracking patch, as documented by report `241`.
**Product truth at approval:** `integration/kora-canonical-product-2026-09-22` @
`3a383072b96290b44620566a242d22f0cc23b01a`

---

## 1. FOUNDER FINAL APPROVAL — GRANTED

Founder approval is **GRANTED** for the roadmap state described by Registry 219 after the R0
execution-tracking patch, together with report `241`.

**Approved canonical tuple:**

| Metric | Approved value |
|---|---|
| Nodes | **137** |
| COMPLETE | **63** |
| READY | **34** |
| BLOCKED | **40** |
| Hard edges | **213** |
| Conditional edges | **5** |
| Scope triggers | **4, all INACTIVE** |
| Cycles | **0** |
| Self-dependencies | **0** |
| Dangling references | **0** |

## 2. APPROVED AS CANONICAL

- **`KORA-WP-126`–`131`** — the `PX-C` program (Visual Acceptance Infrastructure; KORA_ADMIN,
  Company, Worker and Partner Experience Remediation; Cross-Environment Visual Acceptance Gate)
- **`KORA-WP-132`** — Canonical Intake Actor Model Remediation
- **`KORA-WP-133`** — Data Intake Architectural Decomposition
- **`KORA-WP-134`** — Company Routing Contract Remediation
- **`KORA-WP-135`** — FORCE RLS Completion Review
- **`KORA-WP-136`** — Advisor Cross-Company Operations
- **`KORA-WP-137`** — Advisor Review Discovery
- **`KORA-WP-070`** acceptance extension (Admin IA coherence, no dead targets, founder/lab separation)
- **`KORA-WP-072`** acceptance extension (navigation coherence, WP-125-native composition)
- **`KORA-WP-085`** transition to `BLOCKED` behind `KORA-WP-133`
- **`R0-A` / `R0-B` / `R0-C` / `R0-D`** — the non-WP execution track
- **Controlled Pilot Gate**, **Paid External Pilot Gate**, **Production Gate**
- the current dependency and sequencing structure

## 3. FOUNDER EXECUTION CONFIRMATIONS

- **`KORA-WP-068` remains `READY` and may proceed.**
- **`R0-A` and `R0-B` may proceed in parallel with `KORA-WP-068`.**
- **`R0-C` remains `R0_BLOCKED` until `R0-B` is completed** — consistent with the derived state recorded
  in Section AI.2, not a new constraint.
- **`R0-D` may proceed independently.**

No implementation was started by this approval.

## 4. WHAT THIS RECORD DOES NOT DO

This record changes **no** roadmap semantics. No WP scope, number, dependency, status, acceptance text
or `R0` state was altered in order to record approval. Specifically unchanged: `KORA-WP-126`–`137`
scopes and statuses; `KORA-WP-070`/`072` acceptance; `KORA-WP-085` `BLOCKED`; the PX-C structure; intake
sequencing (`132` → `133` → `085`); middleware remediation; FORCE RLS treatment; Advisor post-pilot
treatment; the three gates; the existing frontier; and the four initial `R0` states
(`R0-A` `R0_OPEN`, `R0-B` `R0_OPEN`, `R0-C` `R0_BLOCKED`, `R0-D` `R0_OPEN`).

Untouched, as required: Registry 102, Historical Registry 142, `CLAUDE.md`, Gate 3, `KORA-WP-117`,
`KORA-WP-019`, `KORA-WP-120`, `KORA-WP-069`. No scope trigger activated — all four remain INACTIVE.
`scripts/provision-next-review.mjs` was never addressed.

## 5. VERIFICATION AT APPROVAL

Registry 219 was re-parsed after the approval marker was written. Section B specifications = 137;
Section C nodes = 137; **exact correspondence**. The canonical tuple above was reproduced mechanically,
not asserted. Cycles, self-dependencies and dangling references remain **0 / 0 / 0**.

## 6. GOVERNANCE PRESERVATION

The 2026-09-22 Layer-A preservation set predates Registry 219's DELTA 3 and reports `241`/`242`. An
**additive** governance backup was therefore created alongside it, without overwriting it:

`~/KORA-backup/2026-09-22-roadmap-approved/`

It preserves the current canonical governance corpus — Registry 219 as approved, reports `192`–`242`,
and the Registry 102 / 142 references required for reconstruction — with SHA-256 checksums. No secret,
no `.env*`, and no Product Git modification. `.kora-audit/**` was **not** force-added to Product Git.

**Off-machine copy of the new set remains REQUIRED and is a Founder action**, exactly as it was for the
2026-09-22 set.

## 7. RECOMMENDED FIRST EXECUTION WAVE

Per the Founder confirmations in §3, and requiring no further decision:

1. **`R0-B`** — canonical deploy-line declaration. Highest leverage: it is the sole precondition of
   `R0-C`, and `R0-C` is a Controlled Pilot Gate condition. Unblocking it early unblocks the gate path.
2. **`R0-A`** — CI real-DB enforcement. Independent, cheap, and closes the defect whereby the
   repository's full-suite figure overstates continuously enforced coverage.
3. **`KORA-WP-068`** — My Sharing/Discover Extension. `READY`, sole hard dep `033` `COMPLETE`, unaffected
   by audit remediation, and safely parallel with the two `R0` items above.
4. **`R0-D`** — governance publication. Independent; gated at Paid External Pilot, so it may run at a
   slower cadence than 1–3.

`R0-C` follows automatically once `R0-B` reaches `R0_COMPLETE`. `KORA-WP-132` is the highest-priority
Product remediation but is a **Controlled Pilot Gate** condition, not a `KORA-WP-068` precondition, so it
need not precede this wave.

---

**FOUNDER FINAL APPROVAL GRANTED 2026-09-22 — 137 NODES — EXECUTION NOT YET STARTED**

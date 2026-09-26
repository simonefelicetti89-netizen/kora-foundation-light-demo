# 263 — `KORA-WP-138` — PAID EXTERNAL PILOT GATE BINDING

**Date:** 2026-09-24 · **Act:** Founder gate-contract clarification · **Scope:** governance only
**Lineage:** `OBS-02` discovery report `261` §15.4 → adjudication and package definition report `262` → this binding

> **`KORA-WP-138` COMPLETE is now an explicit requirement of the PAID EXTERNAL PILOT gate.**
> **The Controlled Pilot gate is not amended and its closure remains valid.** No Product code, test or
> remediation was executed. No node, edge or status changed.

---

## 1. PRIOR CONTRACT — verbatim baseline

Read from Registry 219 Section AJ before editing, not from the instruction:

> **PAID EXTERNAL PILOT GATE** — additionally requires: **Gate 3 closure**; `KORA-WP-134` COMPLETE
> (Company routing contract); **`R0-D` = `R0_COMPLETE`**; `KORA-WP-131` PASSED for customer-exposed personas
> (implying `126`–`129`); no material customer-facing dead route; external legal conditions satisfied.

Section AJ's governing preamble, unchanged: *"Three ordered gates. Each is cumulative: a later gate requires
every earlier gate's conditions."*

## 2. CHANGE — one requirement appended

`KORA-WP-138` was **added** in the Registry's existing gate syntax (`` `KORA-WP-NNN` COMPLETE (parenthetical) ``,
matching the `KORA-WP-134` precedent). Every prior requirement is preserved verbatim, in order; **none was
replaced, weakened, reordered semantically or removed.** The resulting clause:

> …; external legal conditions satisfied; **`KORA-WP-138` COMPLETE** (authenticated Company runtime environment
> canonicalization — an authenticated Company session must resolve the canonical scoring environment to live, so
> canonical Company surfaces consume live scoring and cannot fall into demo behaviour).

The requirement names the package explicitly. It was deliberately **not** paraphrased into a vague condition
such as "environment issues resolved".

A dated Founder gate-contract clarification blockquote records the rationale, the `OBS-02` lineage, the
Controlled Pilot's continued validity, and the Production propagation below.

## 3. CONTROLLED PILOT — UNCHANGED

The Controlled Pilot contract is **byte-identical** (0 lines touched, verified by diff). Its closure remains
**CLOSED / VALID**: `OBS-02` violates none of its six conditions (report `261` §15.7) because that gate is
limited to the authorized **synthetic / anonymous / non-live** scope. Report `261` was not modified, the six
conditions were not reinterpreted, and `KORA-WP-138` was **not** added to that gate.

## 4. PRODUCTION — NOT EDITED, BINDS MECHANICALLY

The Production gate contract is **byte-identical** (0 lines touched). It nevertheless now requires
`KORA-WP-138`, because Section AJ's gates are **cumulative by construction**: *"a later gate requires every
earlier gate's conditions."* The single Paid External Pilot binding therefore **propagates mechanically** to
Production.

**The requirement is deliberately not duplicated there.** Duplicating it would create two places to keep in
sync — precisely the derived-truth drift class that report `257` diagnosed and the DELTA Atomic Update Contract
exists to prevent. Binding it into Production a second time would also be a separate Founder decision, and is
not taken here.

## 5. `KORA-WP-138` ROW — UNCHANGED

**0 lines touched** (verified by diff). Status remains **READY**; Hard Deps, acceptance, scope, milestone,
rollback, tests and the visual-evidence contract are all untouched. No dedicated field edit was required: the
row already carried *"Pilot Status: NOT BASE PILOT SCOPE — **BLOCKS PAID EXTERNAL PILOT AND PRODUCTION**"* from
DELTA 4, so per the ruling it was left as-is.

## 6. DERIVED TRUTH — UNCHANGED, AS EXPECTED

A gate prerequisite is **not** a graph edge, and none was manufactured.

| Quantity | Value | Change |
|---|---|---|
| Nodes | **138** | unchanged |
| COMPLETE / READY / BLOCKED / TOTAL | **64 / 35 / 39 / 138** | unchanged |
| Hard edges | **213** | unchanged |
| Conditional edges · scope triggers · cycles | 5 · 4 (all INACTIVE) · 0 | unchanged |

No derived section required regeneration, because a gate-contract edit mechanically affects none of them.

## 7. VALIDATION

`npm run governance:registry-check` → **PASS WITH KNOWN GOVERNANCE EXCEPTIONS** — all fail-closed structural
invariants pass (`INV-01` 138 specs ↔ 138 nodes; `INV-02` 138; `INV-03` 213; `INV-04` exact Section M match;
`INV-05`/`INV-06`/`INV-07`/`INV-11`/`INV-14` pass). `INV-08` remains the pre-existing **NOT_DERIVABLE**
governance exception, unchanged and not cleared. `git diff --check` clean. **The checker was not weakened.**

## 8. REPORTING CONVENTION

A **new numbered report** was used rather than an update to `262`, because a gate-contract mutation is a
distinct governance act from a package definition and warrants its own dated lineage entry. Number `263` is the
next mechanically available (highest existing: `262`).

## 9. SAFETY

No Product code, no test change, no `KORA-WP-138`/`133`/`117` execution, no Controlled Pilot reopening, no
Gate 3 change, no `F-12` resolution, no Production contract edit, `main` untouched, governance branch not
pushed.

---

**`KORA-WP-138`: BOUND TO PAID EXTERNAL PILOT GATE. CONTROLLED PILOT: CLOSED — UNCHANGED.**

**END OF 263**

# 257 — KORA REGISTRY GOVERNANCE DRIFT — ROOT-CAUSE REPORT

**Date:** 2026-09-23
**Scope:** Registry 219, Registry 102, Registry 142, `CLAUDE.md` §8, the `.kora-audit` completion/R0 corpus
**Method:** read-only mechanical parsing of the registries' own sections, plus the defect record established across reports `243`–`256` and this session's surgical corrections
**Status of this document:** governance evidence

**This report authorizes no Product implementation. It does not execute `R0-D`. It does not resolve `F-12`. It does not modify Registry `102`.** It contains no secrets, credentials, hostnames or tokens.

---

## 1. EXECUTIVE EXPLANATION

Registry 219 stores, as hand-written prose, a substantial body of data that is **mechanically derivable from two authoritative sections (B and C)**: node counts, hard-edge counts, the single-thread topological order, status aggregates, the execution frontier and — through Section AE — migration ordering.

Every DELTA correctly updated the **sources** and only partially updated the **derived copies**. Nothing detected the gap, because **no automated validation of the governance registries existed**.

The decisive evidence is an asymmetry inside KORA itself:

| Registry | Machine-validated? |
|---|---|
| Product architecture registry — `lib/architecture/registry.ts`, `validateArchitectureRegistry()`, asserted by a unit test | **YES** |
| Governance registries — `102`, `142`, `219` | **NO** — zero references in `tests/`, `scripts/` or `.github/` |

KORA already knew how to mechanically validate a registry and did so for the *lower-authority* one. The *higher-authority* one — which governs what gets built, and which `R0-D` will publish to external auditors — had no equivalent.

A second, independent cause is that a **safety-relevant blocker lives outside the row that governs it** (`KORA-WP-069` / `F-12`). No amount of derived-data discipline would have caught that; it is an authority-model defect.

---

## 2. ROOT CAUSES, ranked by structural importance

1. **Derived data stored manually** — six derived quantities maintained by hand.
2. **Append-only DELTA drift** — deltas updated sources and a *subset* of derived copies, with no contract defining the full dependent set.
3. **No mechanical validation** — the amplifier. Every defect below was detectable by a parser in seconds; none was detected for months.
4. **Duplicated current truth** — the same fact restated in prose outside its canonical table.
5. **Authority split + compensating control outside the canonical row** — `WP-069` / `F-12`.
6. **Schema limitation** — the 32-field Section B schema contains **no mechanical status field**, so per-WP status exists nowhere in the registry.
7. **Current/historical mixing without markers** — a *process* failure: the convention exists and is good; it was applied inconsistently.
8. **Frozen sections with current-sounding headings**, and a **hardcoded execution frontier**.

---

## 3. DEFECT → ROOT-CAUSE MATRIX

| Defect | Source of truth | Derived / mirrored representation | Change event | Missed update | Stale claim | Consequence | Mechanism |
|---|---|---|---|---|---|---|---|
| Section F `Nodes: 125` | Sections B+C | Section F bullet | DELTA 3 (+12 nodes) | bullet not regenerated | `125` vs canonical `137` | false `STATE_MATCH = NO` on any re-derivation | derived-manual, delta drift |
| Section F `Hard edges: 197` | Section C | Section F bullet | DELTA 3 (+16 edges) | bullet not regenerated | `197` vs `213` | DAG verification mismatch | derived-manual, delta drift |
| Section M topology (124 nodes) | Section C | Section M list | DELTA 2 (+`125`), DELTA 3 (+`126`–`137`) | **neither delta mentions Section M** (0 references in AH-4 and AH-5) | 13 nodes missing | **Section AE binds migration order to Section M**; `135`/`136`/`137` carry conditional `ADDITIVE` impact and had no defined order | derived-manual, delta drift |
| Section F topology count (124) | Section M | Section F bullet | as above | — | *accurate about its referent* | **masked** the real defect; only re-derivation exposed that Section M was stale | derived-of-derived |
| R0-A residual | execution reality | AI.3 prose | CI ran green (report `251`, run `35770205003`) | prose not struck | "first real CI execution still pending" | redundant re-proof of CI | current/historical mixing |
| Line 835 R0 gloss | AI.2 table | prose gloss | R0-A completed (report `245`) | gloss not updated | "`R0-A` … remains `R0_OPEN`" | contradicted the table three lines above | duplicated truth |
| Section AG command | status ledger | hardcoded WP list | `001/002/003/005/012` all completed | list never revisited | `IMPLEMENT KORA-WP-001` | reopening COMPLETE work, forbidden by AH-5 | hardcoded frontier |
| Sections H/I/J `CURRENT` labels | status ledger | frozen inherited text | same completions | frozen by design | "CURRENT … may begin simultaneously" | frozen material read as live | frozen + current-sounding heading |
| `WP-069` / `F-12` | doc `54` §CORE-006; `CLAUDE.md` §8 | WP row in `102`, mirrored in `219` | audit `104` RT-P1-002 prescribed the field | **never applied to any registry** | `External Blockers: none` | Section A promises Section B suffices → unsafe path, held only by `CLAUDE.md` | authority split, mirror drift, schema |
| R0-D corpus Context | filesystem reality | AI.3 prose | corpus grew; two files committed | no marker | "exists only in backup" | misinforms an auditor | current/historical mixing |
| `END OF 133`; Section AF "this file (`142`)" | file identity | lineage residue | file renumbered `133`→`142`→`219` | no marker | wrong file identity | misinforms an auditor | mirror/lineage residue |

**Why the process allowed it:** a DELTA's definition of done was *"the new packages are specified and the graph is consistent"* — never *"every representation derived from the graph has been regenerated."* AH-5 is a careful, high-quality delta; it still silently left four derived artifacts stale. That is the clearest proof the failure is architectural, not a lapse of care.

---

## 4. HUMAN ERROR vs SYSTEM DESIGN

| Defect class | Primary cause | Recurs with careful humans? |
|---|---|---|
| Section F counts, Section M topology | registry architecture — derived data stored manually | **YES, certainly** |
| DELTA partial propagation | process — no atomic contract | **YES** |
| Section AG / H/I/J frontier | architecture — hardcoded frontier | **YES** |
| `WP-069` / `F-12` | authority ambiguity + schema limitation | **YES** |
| Per-WP status unavailable | schema limitation | **YES** |
| Line 835, R0-A residual, corpus Context | editorial omission against an existing good convention | reduced, not eliminated |
| Section AF "(142)" | one-off transcription | unlikely |

**Seven of eight classes recur regardless of care.** That is the finding.

---

## 5. SINGLE-SOURCE-OF-TRUTH MAP

| Concept | Canonical source | Manual derived representations | Copies justified? | Generation / validation |
|---|---|---|---|---|
| Node set | Section B ↔ Section C | — | n/a | INV-01 |
| Node count | B/C | Section F bullet · status-ledger aggregate · AH-5 tuple · preamble namespace statements (**4**) | **NO** | regenerate + INV-02 |
| Hard-edge count | Section C | Section F bullet · aggregate · AH-5 · Section C intro (**4**) | **NO** | regenerate + INV-03 |
| Topological order | Section C | Section M (artifact) · Section F count · **Section AE consumer** | artifact YES, count NO | regenerate + INV-04/05/14 |
| Conditional edges / triggers | Sections D / E | Section F · aggregate | **NO** | INV-07 |
| Per-WP mechanical status | **nowhere in 219** | aggregate only | **gap, not duplication** | INV-08 = NOT_DERIVABLE |
| R0 status | **AI.2 table** | prose in six further places | **NO** — reference, do not restate | prose must not contradict the table |
| Execution frontier | derivable (§9) | Sections H, I, J, AG (**4**) | **NO** | derive; never hardcode |
| External blockers | the WP's own Section B row | `CLAUDE.md` §8 for `F-12` | **NO — must be in the row** | INV-11 |
| Registry authority | **`CLAUDE.md` §8** | 219 preamble, Section AF, closing line (**3**) | **NO** | single statement + pointer |
| Gate prerequisites | Section AJ | R0-C closure marker restatement | **YES — different semantic axis** (requirement, not state) | keep |

---

## 6. DELTA ATOMIC UPDATE CONTRACT

Now binding, recorded in Registry 219 Section A.

| Class | Items |
|---|---|
| **SOURCE — update** | Section B specifications · Section C hard edges · Sections D/E where applicable · external blockers in the authoritative WP definition |
| **DERIVED — regenerate, never hand-edit** | node counts · hard-edge counts · conditional-edge and scope-trigger counts · **Section M recomputed from Section C** · Section F topology count · status aggregate where mechanically derivable |
| **VALIDATION — must hold** | B ↔ C exact node-set match · 0 cycles · 0 self-dependencies · 0 dangling references · 0 topological violations · Section AE migration-order consumers consistent · frozen/superseded frontier material still marked · authority statements still valid |

Items "Section M regenerated", "Section F topology count" and "status aggregate" are precisely what DELTA 2 and DELTA 3 missed.

---

## 7. HISTORICAL-PRESERVATION CONTRACT

Registry 219 already uses four idioms; the contract makes their selection deterministic rather than inventing anything.

| Old text is… | Treatment | Precedent in the file |
|---|---|---|
| A **derived artifact** (counts, topology, aggregates) | update in place + one-sentence justification note | Section M at DELTA 1 and DELTA 3 |
| A **claim/sentence** now false | `~~struck~~ — **SUPERSEDED/CLOSED <date> (report N)**` | the R0-A note and residual |
| A **count sentence** kept for lineage | `**AMENDED <date>** … the sentence above is STALE and is preserved only as historical` | **Section C intro — the gold standard** |
| An **event/state transition** | dated `>` blockquote appended to the chronology | Section AI |
| **Frozen reproduced material** with current-sounding wording | leave body verbatim; add an adjacent dated clarification | Sections H/I/J, Section AF |

**Binding rule, smallest form:**

> Any present-tense claim about current state must be either **(a)** inside a canonical table/artifact that the DELTA contract requires regenerating, or **(b)** carry an **adjacent** date, report reference or supersession marker. Prose satisfying neither is a defect by construction.

That single test identified **every** defect found, including line 835.

---

## 8. MACHINE-VALIDATABLE INVARIANTS

Implemented in `lib/governance/registry-consistency.ts`; run via `npm run governance:registry-check`.

| ID | Expected condition | Severity | Fail-closed | Implemented |
|---|---|---|---|---|
| INV-01 | Section B ID set == Section C node set; no duplicates, no gaps | CRITICAL | YES | YES |
| INV-02 | declared node counts == parsed count, in every live location | HIGH | YES | YES |
| INV-03 | declared hard-edge counts == parsed count | HIGH | YES | YES |
| INV-04 | Section M node set == Section C node set | CRITICAL | YES | YES |
| INV-05 | topological violations == 0 | CRITICAL | YES | YES |
| INV-06 | cycles == 0, self-deps == 0, dangling refs == 0 | CRITICAL | YES | YES |
| INV-07 | conditional-edge and trigger counts agree | MEDIUM | YES | YES |
| INV-08 | status aggregate == node count | HIGH | — | **NOT_DERIVABLE** — no per-WP status field exists |
| INV-11 | every OPEN external blocker appears in its authoritative WP row | **CRITICAL (safety)** | — | **KNOWN_EXCEPTION** — Registry 102 omits `F-12` |
| INV-14 | every migration-bearing WP appears in Section M | HIGH | YES | YES |
| INV-09/10/12/13/15 | R0 prose vs AI.2 table · no COMPLETE WP in a current command · frozen CURRENT sections marked · no undated current-state prose · 102 ↔ 219 mirror agreement | MEDIUM–HIGH | warn | **not implemented** — robust parsing would require heuristics with false-positive risk; specified for a future pass |

Two parsing subtleties the registry's own idiom forces, both covered by tests: conditional edges are counted from Section D table rows only (a sixth textual match lives in Section F prose, which the registry itself flags); and superseded aggregates are written `~~headline~~` followed by **unstruck** detail, so live text is taken as each line up to its first strikethrough.

---

## 9. EXECUTION-FRONTIER DERIVATION MODEL

```
executable_now(WP) :=
      mechanical_status(WP) == READY                       # implies hard deps COMPLETE
  AND every conditional dep whose trigger is ACTIVE is satisfied
  AND every external blocker on WP is CLOSED               # INV-11 guarantees visibility
  AND no unsatisfied sequencing overlay applies to WP
  AND WP is not Founder-deferred
  AND WP's milestone is not gated by an unmet gate condition (Section AJ)

frontier := { WP | executable_now(WP) }                    # a SET, never a single command

tracks:
  R0   : next := lowest-ordered R0 item at R0_OPEN with all preconditions satisfied
  WP   : the frontier above, partitioned by milestone
  GATE : the unmet prerequisites of the nearest gate (priorities, not executable WPs)

authority:  WP <= 110 -> Registry 102 ;  WP >= 111 -> Registry 219   (CLAUDE.md §8)
```

Output is **always a set across three tracks**. Section AG's error was compressing a multi-track set into one hardcoded imperative.

---

## 10. P0 / P1 / P2 REMEDIATION

### P0 — required before governance can be called robust
- **P0-1 · Registry invariant checker.** Prevents the derived-data and delta-drift classes. Changes no authority, no WP semantics; reads registries, modifies none. Automation required. **DONE — this batch.**
- **P0-2 · DELTA atomic update contract, binding.** Prevents partial propagation. No authority or semantic change. **DONE — Registry 219 Section A.**
- **P0-3 · External-blocker visibility (INV-11).** Prevents the `WP-069` safety class. **NOT DONE and cannot be done here:** it requires the blocker to appear in the authoritative row, i.e. in Registry `102`, which is designated untouched. Founder ruling required.

### P1 — during R0-D / publication hardening
- **P1-4 · Supersession contract made explicit**, plus warn-level INV-12/13.
- **P1-5 · Derived-representation inventory** — a short table naming each derived section and its source.
- **P1-6 · Reduce R0-status restatements** to references to the AI.2 table.

### P2 — long-term
- **P2-7 · Per-WP mechanical status field.** Closes INV-08. Changes the 32-field schema — a real semantic change requiring a ruling, touching both `102` and `219`.
- **P2-8 · Frozen-section labelling convention.**
- **P2-9 · Retire remaining mirror residue.**

---

## 11. RELATION TO R0-D

`R0-D`'s acceptance is *"an external auditor can reconstruct Registry → completion report → canonical SHA → code → visual evidence, without Product Git contamination."*

- **P0-1 belongs BEFORE `R0-D` publishes.** Publishing a registry with known internal contradictions directly weakens the reconstruction guarantee `R0-D` exists to provide.
- **It is not `R0-D`'s own scope.** `R0-D` is publication mechanics, not registry content correctness.
- **Afterwards it becomes permanent governance hygiene** — a Registry Consistency Check on every future DELTA, conceptually a release gate, not a WP. No WP number is assigned by this report.

**One operational consequence, recorded because it bears on `R0-D`:** `.kora-audit/` is gitignored, so the registries the checker validates **never reach CI**. The checker therefore runs locally and skips cleanly where the corpus is absent. Wiring it into CI is a separate governance decision that depends on how `R0-D` chooses to publish the corpus; it is recommended, not performed here.

**`R0-D` remains `R0_OPEN` and was not executed. Nothing in this report satisfies any of its acceptance criteria.**

---

## 12. WHAT MUST REMAIN HISTORICAL

Deliberately preserved — normalising these would destroy the audit trail:

- The **Section AI chronology** (reports `251`→`252`→`253`→`254`→`256`) — dated, self-limiting, and the actual evidence record.
- The **status ledger** with its full `~~struck~~` history of superseded aggregates — that *is* the transition history.
- **Founder decisions and approval markers.**
- **Completion records** in AI.3.
- **Registries `102` and `142` as immutable canon.**
- **Section AJ's restatement of R0 states as gate requirements** — a different semantic axis, correctly duplicated.
- **Frozen "reproduced unchanged" material** (Sections H/I/J, AF) — clarified adjacently, never rewritten.

The correct target is **derived data regenerated and validated; historical data preserved and marked** — not deduplication, and not a normalized database.

---

## 13. KNOWN UNRESOLVED AUTHORITY EXCEPTION — Registry 102 / WP-069 / F-12

- `F-12` (pseudonymous vs anonymous handling of individual worker Listening responses) is an **EXTERNAL LEGAL DECISION**, source doc `54` §CORE-006, and is **OPEN / UNRESOLVED**. No resolution or waiver exists anywhere in the corpus.
- `CLAUDE.md` §8 states `KORA-WP-069` must not start until `F-12` is explicitly resolved, and that its status is otherwise `BLOCKED — EXTERNAL LEGAL GATE`.
- Audit `104` finding RT-P1-002 prescribed adding `F-12` as an explicit External Blocker on `KORA-WP-069`. **That correction was never applied to any registry.**
- **Registry `102` — the sole authority for `KORA-WP-001`–`110` — contains zero occurrences of `F-12`** and its `WP-069` row still reads `External Blockers: none`.
- Registry `219`'s mirror row **was** corrected on 2026-09-23 and now surfaces the gate. **Registry 219 is fail-closed for its own readers; Registry 102 is not.**
- Consequence: **`CLAUDE.md` §8 remains the only operative control on the authoritative path.** The checker reports this as `KNOWN_EXCEPTION`, never `PASS`, and it is not allowlisted or suppressed.
- **This report does not resolve `F-12` and does not modify Registry `102`.** Closing it requires a Founder ruling on whether `102` may be amended.

---

## FINAL ASSESSMENT

**REGISTRY DRIFT ROOT CAUSE: MIXED — STRUCTURAL + PROCESS + AUTHORITY SPLIT**

Structural causes explain the Section F / Section M / Section AG cluster and would recur without P0-1 and P0-2. Process causes explain line 835, the R0-A residual and the corpus Context — a good convention applied inconsistently. The authority split explains `WP-069` / `F-12` alone, is the only strand with a safety dimension, and is addressable only by P0-3.

# 277 — Benchmark V2 "Gates A–I": executable authority repair (Repair Model C)

Status: PUBLISHED
Date: 2026-09-27
Act: governance correction — executable acceptance authority only
Governing registry: `.kora-audit/output/219_*` (canonical executable registry)
Governance baseline: `480e31914a1bc463daa57013307e7047b7c0782d`
Canonical Product (unchanged by this pass): `1f786de15b97d04e83abb96a2f8075083a71c772`

**No Product code written. No package executed. No gate advanced. No lifecycle status changed.**

---

## 1. The finding — CASE 3, AUTHORITY NEVER VERSIONED

DELTA 5 (report `266`, commit `1151ab2`, 2026-09-25) amended five packages to accept against
"**Benchmark V2 Gates A–I**". Section `AN` records Benchmark V2 "by reference, never duplication", and that
reference resolves to a governance lineage — Product Experience Quality Audit → Benchmark V2 → Page-by-Page Audit →
Implementation Program — which was **never versioned**.

The consequence is narrow and serious: an acceptance clause that cannot be evaluated. It blocks **closure**, not
execution.

## 2. Why the historical wording cannot be recovered

Read-only forensics across **every local and remote ref**, path-scoped to `.kora-audit`, `docs`, `lib`, `tests`,
`components`, `app`, `design`, `public`:

| | Gate A | B | **C** | D | E | F | G | **H** | I |
|---|---|---|---|---|---|---|---|---|---|
| commits ever containing the string | 2 | 2 | **0** | 4 | 1 | 4 | 1 | **0** | 6 |

**"Gate C" and "Gate H" have never appeared in any tracked blob, on any ref, at any point in this repository's
history.** A nine-item A–I enumeration therefore cannot ever have been committed. No commit has ever contained both
"Gate D" and "Gate H" (intersection = 0).

Every other occurrence is independently accounted for and unrelated: `Gate DPO` / `Gate Decision` / `Gate Dependency`
(Gate 3 work), `Eligibility Gate Engine`, `Gate Factor (GF)` and `Methodology & Gate Footer` (superseded formula
naming), `Gate G-3`/`G-4` (a numbered recommendation), `Gate Affected` (a table column), `Founder Gate A`/`Founder
Gate B` (`KORA-WP-007`'s own pre-push review gates), `KORA-WP-124`'s package-local `Gate I`, and the `(A)`–`(J)`
acceptance letters of `KORA-WP-138` and `143`.

**The ratifying commit proves the omission directly.** `1151ab2` — *"docs(governance): integrate Product Experience
Benchmark V2"* — changed exactly **three** files: Registry `219` (+157), report `266` (+162, new) and one governance
test (±8). It committed **no Benchmark V2 document and no gate text**. Its own body states the design
("by reference rather than duplication") and calls the upstream artefact "**my own** Implementation Program",
confirming the chain was conversational. `1151ab2` is contained only in `gate3/prelive-privacy-remediation`.

**This defect class has precedent.** `docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md` (`d4a815e`, 2026-09-25) records that
report `268` found `KORA-WP-140`'s acceptance clauses naming "nine roles and seven states … enumerated nowhere in the
repository, and therefore could not be objectively tested". That instance was repaired by narrow Founder
re-ratification. The gates were not covered by it — that document contains **zero** gate letters.

## 3. Founder decision — REPAIR MODEL C, prospective

Recorded 2026-09-27. The unexecutable reference is replaced, **for future execution and acceptance only**, by the
executable acceptance taxonomy Registry `219` already carries in its own `KORA-WP-126` entry.

### 3.1 What is explicitly NOT asserted

The Founder **declined** to answer the historical-semantic question this report's predecessor raised, on the ground
that the answer is not provable. Accordingly this repair does **not** state:

- that "Gates A–I" were the `KORA-WP-126` taxonomy;
- that the phrase was a naming mistake;
- any retrospective definition of the nine gates;
- any mapping from the taxonomy's 17 criteria onto nine gates.

**17 ≠ 9, and no evidence connects them.** No reconstruction was performed, and none is implied by adjacency.

### 3.2 Historical truth preserved

The historical wording is **retained everywhere it appears**. Nothing is deleted or rewritten. Section `AN`'s
by-reference scope list — which names "the enforcement model and **Gates A–I**" — is left verbatim as the record of
what Benchmark V2 ratification covered. Report `266` and the DELTA 5 adjudication rationale are untouched. The repair
is additive: each affected acceptance clause keeps its original phrase and gains a pointer to the executable
authority.

## 4. The executable authority — referenced, not duplicated

Per the Founder's durability requirement, the taxonomy is **not** copied into a new artefact. Registry `219` already
states it verbatim in the `KORA-WP-126` entry, and that text is now designated the executable acceptance authority:

- **10 MECHANICAL** — typography tokens/scale/floor · spacing token rules · route archetype declaration ·
  surface-role constraints where mechanically safe · the seven-state resolution contract · page-length and
  mobile-ratio measurement · navigation budget/label/internal-state rules · the no-bare-threshold-metric contract.
- **4 REVIEW-ENFORCED** — hierarchy · scanability · actionability · craft.
- **3 FOUNDER JUDGMENT** — Logo-Off · premium moments · final visual acceptance.

with that entry's binding rule that the last two classes "**must NOT be given fragile automated tests**".

No criterion is added, removed, reworded or reinterpreted. **No competing source of truth is created**: this repair
adds one subsection (`AN.10`) that points at existing text, and six inline pointers that point at `AN.10`.

### 4.1 Provenance of the taxonomy

It is not derived from the gates. `lib/px-acceptance/benchmark-checks.ts` cites its source as *"DELTA 5 (report
`266`) expanded WP126 … and named what it owns"*, and Registry `219`'s `KORA-WP-126` amendment contains that list
verbatim in the same three classes. `CRITERION_CLASS` in `lib/px-acceptance/acceptance-record.ts` encodes exactly
those 17 entries. The taxonomy is therefore **independently ratified governance**, already implemented and CI-green
on the canonical Product line — which is precisely why it is executable where the gates are not.

## 5. Affected clauses — five packages, six clauses

The prior forensic pass named four packages. Repository truth shows **five**: `KORA-WP-128` also carries an
executable acceptance clause. All six edits append the identical pointer and change nothing else.

| # | WP | field | before (excerpt) | after |
|---|---|---|---|---|
| 1 | **127** | Acceptance | `Acceptance now includes **Benchmark V2 Gates A–I applicable to KORA_ADMIN**` | …unchanged… ` — unexecutable as written; resolves per `AN.10`` |
| 2 | **128** | Acceptance | `Acceptance now includes Benchmark V2 Gates A–I.` | …unchanged… ` — unexecutable as written; resolves per `AN.10`.` |
| 3 | **129** | Acceptance | `Acceptance now includes **Benchmark V2 Gates A–I applicable to the Worker environment**` | …unchanged… ` — unexecutable as written; resolves per `AN.10`` |
| 4 | **131** | Acceptance | `assessed on **Gates A–I**` | …unchanged… ` — unexecutable as written; resolves per `AN.10`` |
| 5 | **143** | Tests | `Gates A–I on the cockpit` | …unchanged… ` — unexecutable as written; resolves per `AN.10`` |
| 6 | **143** | Acceptance `(I)` | `**(I)** Gates A–I pass on the cockpit` | …unchanged… ` — unexecutable as written; resolves per `AN.10`` |

### 5.1 Occurrences deliberately NOT edited

Five further occurrences are preserved untouched, because they record history or reasoning rather than gating a
package, and `AN.10`'s resolution rule already covers any executable force they carry:

- `KORA-WP-128` §6 adjudication rationale — "share one acceptance cycle (Gates A–I on Company Tier A/B)";
- the `M`-series milestone conditions (two occurrences);
- Section `AN`'s by-reference scope list — **the historical record**;
- `AN.8` programme Definition of Done — programme-level, not package acceptance, and per `AN.4` "programme Definition
  of Done, not package acceptance".

Editing these would have rewritten the historical record or exceeded an authority repair.

## 6. Consequences

| package | consequence |
|---|---|
| **`KORA-WP-129`** | The acceptance-closure blocker **caused solely by the missing A–I definition is removed**. It remains **READY** and is **not** complete. Remaining surface migration, `ROUTE_ARCHETYPE` declarations, `KORA-WP-140` state-grammar adoption, WP-125-native recomposition, navigation consistency, the "privacy surface integrated rather than adjacent" Founder judgment, the `dynamic-cv/print` page error and the remaining Founder Reviews are all **unaffected and outstanding**. Cohorts W1/W2/W3 remain frozen and unauthorized. |
| **`KORA-WP-127`** | Remains **READY**. The separate "**36 canonical Admin surfaces**" contract/evidence discrepancy is **untouched, unresolved and unobscured** by this repair; completion still requires it plus the remaining Product work. |
| **`KORA-WP-128`** | Remains **READY**. Acceptance authority repaired only. |
| **`KORA-WP-131`** | Remains **BLOCKED**. It **consumes** the taxonomy as the final cross-environment gate and does not define it; it **never absorbs remediation** — a failure returns work to its owning package. Its dependency logic is untouched and this repair does not make it READY. |
| **`KORA-WP-143`** | Remains **READY and unstarted**. Its Company cockpit/IA scope is **not** absorbed into `128`. |
| **`126`, `139`–`142`** | **COMPLETE, not reopened.** No implementation changed. |

## 7. `AN.9` secondary authority gap — CLASS A, HISTORICAL EVIDENCE GAP ONLY

`AN.9` cites `docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md` as a FROZEN canonical input; that file exists only on
unpublished Gate-3 ancestry. Classified against the Founder's own test — *are the `KORA-WP-126` taxonomy and the
completed `139`–`142` contracts sufficient for current execution without it?* **Yes.**

The enumerations it froze are **code-resident on the canonical Product line** and imported directly by
`lib/px-acceptance/benchmark-checks.ts`, verified at `1f786de`:

| enumeration | canonical value | matches the frozen input |
|---|---|---|
| `TYPE_ROLES` | **9** | "EXACTLY NINE" |
| `SURFACE_ROLES` | **9** | "EXACTLY NINE" |
| `SURFACE_STATES` | **7** | "EXACTLY SEVEN" |
| `TYPE_FLOOR_PX` / `TYPE_READING_FLOOR_PX` | 11 / 12 | yes |
| `SPACE_STEPS` | [4, 8, 16, 24, 32, 48] | yes |

`KORA-WP-139` and `140` are COMPLETE, so the document's governance purpose is discharged by shipped code. **No
current executable authority depends on it.** No repair is made here; Gate 3 is not published and the file is not
copied. The smallest separate correction, if the Founder later wants the provenance durable on a published line, is a
single decision to publish that one `docs/` file independently of Gate-3 ancestry — **not proposed, not applied**.

## 8. Validation performed, and its stated limitation

**Limitation, stated rather than hidden:** `npm run governance:registry-check` and
`lib/governance/registry-consistency.ts` exist only on unpublished Gate-3 ancestry and are absent from `main`, the
audit line and the canonical Product line. This repair therefore **could not be validated by the registry verifier**.
It remains **PENDING ENFORCEMENT IMPLEMENTATION**; it was not copied, recreated or published. The governance contract
binds regardless, and **no verifier output is fabricated in this report**.

Strongest legitimate validation available on the published governance line, all read-only and mechanical:

- `AL.2` COMPLETE set parsed mechanically = **70**; distinct `KORA-WP` ids in the registry = **144**;
- `KORA-WP-129` derived by `AL.1` as **READY** (∉ `AL.2`; Hard Dep `126` ∈ `AL.2`);
- occurrence census before/after: **11** occurrences of "Gates A–I" before, **11** after — none deleted, six now
  carrying a pointer;
- exactly **one** new subsection (`AN.10`); no existing subsection renamed, reordered or removed;
- Product files changed: **0** (proven in §9).

## 9. Change set

Two files, both governance, both on the audit line:

- `.kora-audit/output/277_KORA_BENCHMARK_V2_EXECUTABLE_AUTHORITY_REPAIR.md` — this report (new);
- `.kora-audit/output/219_…_REGISTRY_….md` — `AN.10` added; six inline pointers.

**No file under `app/`, `components/`, `lib/`, `services/`, `tests/`, `supabase/`, `public/` or `docs/` is touched.**
No SQL, no migration, no schema, no RLS, no Product code. `main` untouched. Canonical Product untouched at
`1f786de`. `KORA-WP-117` WIP untouched. Gate 3 not published.

# 276 — KORA-WP-129 Wave 4b (T1 + T2): Founder Review outcome, byte-identity lock supersession, and the non-visual proof

Status: PUBLISHED
Date: 2026-09-27
Governing registry: `.kora-audit/output/219_*` (canonical executable registry)
Governing contract: Registry 219 Section A — Founder Review Publication Contract (report 274)
Work package: `KORA-WP-129` — remains **READY** (not COMPLETE)

---

## 1. Why this record exists

Report 274 bound the Founder Review Publication Contract: a candidate is built
and validated locally, a review package is produced, the Founder decides, and
**only then** is proof pushed. CI green is necessary technical evidence, never
publication authority.

This pass is the first full execution of that contract end to end, and it
exercised the one branch the contract had not yet been tested against: a
Founder acceptance granted on one SHA, followed by an authorised change, and
therefore the question of whether that acceptance still holds.

---

## 2. What the Founder reviewed and decided

**Reviewed candidate:** `3e6373d` — "KORA-WP-129 Wave 4b T1 — migrate the two
evidenced Worker surfaces".

**Decision (T1):** ACCEPT FOR PUBLICATION — both Worker surfaces
(`/worker/workspace`, `/worker/privacy`).

**Decision (T2):** AUTHORISED, narrowly. The KORA-WP-047 byte-identity lock on
`components/ui/EmptyState.tsx` "may be superseded ONLY to permit the
non-rendering deterministic readiness instrumentation", and the byte-identical
implementation lock was to be replaced with "a stronger behavioural/semantic
invariant".

**Founder condition, carried verbatim:** "If T2 unexpectedly causes ANY
user-visible change: STOP. The prior Founder visual acceptance does not
automatically carry over to a visually changed candidate."

**Published candidate:** `1f786de` = `3e6373d` + T2 only.

The provenance is therefore: *reviewed* `3e6373d` → *published* `1f786de`,
delta = the authorised non-visual T2 change and nothing else. This record
exists so that the difference between the reviewed SHA and the published SHA
is never silently lost.

---

## 3. What T2 actually is

`components/ui/EmptyState.tsx` gains exactly one non-rendering attribute on its
existing root element:

```
data-px-resolved="true"
```

No element, style, class, text, or ARIA semantic is changed.

**The gap it closes.** KORA-WP-126's capture protocol refuses to record
evidence for a surface that has not declared readiness — `assertReadinessDeclared()`,
added after the protocol was caught capturing "Caricamento in corso…" as
Product evidence. `EmptyState` predates KORA-WP-140 and emitted nothing a
capture could wait on, so any surface resolving through it (via `NoDataState`)
could not be evidenced at all.

**Why not `data-px-state`.** That attribute is KORA-WP-140's grammar and names
one of seven kinds. `EmptyState` does not implement that grammar. Reusing the
attribute would either claim a semantic the component lacks or invent an eighth
kind. `data-px-resolved` is an orthogonal readiness flag — no second state
system, and no semantic change to the component.

**Loading stays distinguishable.** KORA-WP-140's own `Loading` renders through
`StateFrame` with `data-px-state="LOADING"` and never sets the resolved marker,
so a loading surface can never satisfy it. This is asserted, not assumed.

---

## 4. The lock supersession — what replaced it, and why it is stronger

The superseded assertion was `it('EmptyState is byte-identical to the baseline')`
plus the `'components/ui/EmptyState.tsx'` entry in `BASELINE_DIGEST`.

A byte digest can only detect **that** the file changed. It cannot say what the
file is allowed to change into, and it fails identically for a genuine
accessibility regression and for a comment. Six behavioural assertions replace
it and constrain **what** may change:

1. the KORA-WP-047 access-denied `role="alert"` is still emitted;
2. that role is emitted for `access-denied` and for **nothing else** — enforced
   by requiring exactly one `role={...}` expression in the file, so the
   assertion cannot be satisfied by adding a second one elsewhere;
3. the variant → token mapping is intact;
4. the visible output contract holds — title, body, action, `aria-hidden` icon;
5. the readiness marker is non-rendering and claims no `data-px-state`;
6. a loading surface can never satisfy the resolved marker.

Suite `tests/unit/kora-wp-140-surface-state-grammar.test.ts`: **48 → 52 tests.**

Assertion 2 is the one that makes this a net strengthening rather than a
trade: the byte lock protected the accessibility behaviour only incidentally,
by freezing the whole file. The replacement protects the behaviour directly,
and additionally forbids the specific regression the byte lock never
articulated — a second `role` being introduced.

---

## 5. The non-visual proof

The Founder's condition required proof, not assertion. The first attempt at
this proof was **invalid** and is recorded here as such: the surfaces were
recaptured after re-seeding, and the synthetic tenant's generated email is
rendered on the page, so all six images differed for a reason that had nothing
to do with T2. A second attempt under one seed gave 5/6 identical with
`worker-workspace desktop` differing.

That single difference did **not** reproduce. It was an artefact of on-demand
compilation in the dev server, and the proof was re-run under conditions where
that confound cannot exist.

**Final protocol.** One fixed synthetic seed, seeded once and never re-seeded.
Production builds only (`next build` + `next start`), so no route is compiled
on demand. `.next` wiped before every arm. Three arms, so that determinism and
the T2 comparison are established inside the same harness:

```
WITHOUT_A  →  WITH_T2  →  WITHOUT_B
```

**Result — all six KORA-WP-129 captures byte-identical across all three arms:**

| capture | digest (sha256, first 16) | verdict |
|---|---|---|
| `worker-workspace__desktop` | `271d520ffbcb0256` | identical ×3 |
| `worker-workspace__mobile`  | `cf0b6d2f16b33a63` | identical ×3 |
| `worker-workspace__rail`    | `0f4e46479a6b2180` | identical ×3 |
| `worker-privacy__desktop`   | `85303ee59456a474` | identical ×3 |
| `worker-privacy__mobile`    | `66cecf8c82b6b133` | identical ×3 |
| `worker-privacy__rail`      | `6f016812d674a0c5` | identical ×3 |

`WITHOUT_A == WITHOUT_B` establishes the harness is deterministic;
`WITH_T2 == WITHOUT_A` establishes T2 changes nothing.

**Measurements unchanged from the accepted candidate:** `/worker/workspace`
1628px desktop / 2468px mobile (ratio 1.516); `/worker/privacy` 1332px desktop
/ 2022px mobile (ratio 1.518). Per AN.1 the ratio is a detector, never a
target; it is recorded here because it must not move, not because it should
improve.

**Supporting structural facts.** `git diff --name-only 3e6373d 1f786de -- app/worker`
returns **0 files**. `EmptyState` appears in **none** of the five T1 files, so
it cannot be in either accepted surface's render tree — the byte-identity of
the captures is the confirmation of that, not the whole of the argument.

**Conclusion:** T2 is mechanically non-visual. Per the Founder's own terms, the
T1 visual acceptance carries forward to `1f786de`.

### 5.1 The evidence PNGs are deliberately unchanged

The committed evidence under `docs/product/visual-evidence/kora-wp-129/` is the
artefact the Founder reviewed, and it is published byte-for-byte as reviewed. A
recapture would differ only by the synthetic tenant's generated email; swapping
it in would quietly replace the reviewed artefact with an unreviewed one. The
proof digests above are recorded in this report instead. This is the intended
reading of the contract: the reviewed artefact is the published artefact.

---

## 6. Local validation

| check | result |
|---|---|
| `tsc --noEmit` | clean |
| `npm test` | 443 files, 14094 passed, 349 skipped, 5 todo |
| `npm run lint` | 0 errors (5970 pre-existing warnings, unchanged) |
| `npm run build` | success |
| privacy suites (5, **unmodified**) | 375 passed |
| R0-A DB-gated suites vs. real local Postgres | 6 files, 190 passed, 0 skipped |

The five privacy suites were verified **unmodified** (`git status --porcelain`
returned zero entries for them) before being run, so their passing is evidence
about the code and not about the tests.

---

## 6A. CI evidence — and a flakiness finding that must not be mistaken for acceptance

Per report 274, CI green is necessary technical evidence and never publication
authority. The Founder decision in §2 is the authority; this section is the
evidence.

The exact candidate SHA `1f786de` was run **three times, unchanged**, because
the first two runs failed — in *different jobs*:

| run | branch | blocking (ts/tests/build/lint) | DB-backed gate | E2E smoke | E2E golden |
|---|---|---|---|---|---|
| #350 | `…-ci-proof-2026-09-27` | success | **failure** | success | success |
| re-run | `…-ci-proof-2026-09-27-r2` | **failure** (Build) | success | success | success |
| final | `…-ci-proof-2026-09-27-r3` | success | success | success | success |

**Run `36306016080` is fully green on all four jobs at `1f786de`.** The
canonical line was then fast-forwarded `00e70b5..1f786de` and its own CI run
`36306261832` is green on all four jobs.

Two runs of *identical* code failing in *different* jobs is the signature of
runner flakiness, not a code defect. The candidate was not modified between
runs, and this is stated plainly rather than presented as "CI green" — a union
of two partially-green runs is **not** evidence of a green build, which is why a
third run was taken rather than treating the union as sufficient.

### 6A.1 The DB-gate failure is a known, already-cleared flake

Run #350's annotation was precise: **"1 R0-A DB-gated test(s) failed"** — one
test of 190.

The same gate, failing at the same two steps, is already on record: run **#340**
failed it at SHA `467893cf`, while run **#339 passed at that identical SHA**.
`467893cf` is an ancestor **already published on the canonical line**. So this
failure mode is a reproduced-then-self-cleared flake on code that is already
accepted, and it is not attributable to T1 or T2.

Locally, the byte-identical CI command was run against a real local Supabase at
the candidate SHA: **6 files, 190 passed, 0 skipped, 0 failed.**

Causal implausibility is worth stating too: the R0-A suites are
`commons-schema-usage-grant`, `wp-045-first-pilot-e2e-scenario`, and the
KORA-WP-112/113/116/117 Living KORAL suites. T1 changed inline typography and
spacing in four Worker UI files; T2 added one data attribute to `EmptyState`.
There is no path from either to those suites. The concurrency-sensitive
KORA-WP-116 suite is the most plausible flake site.

### 6A.2 The Build failure has a structural cause, and it is pre-existing

`app/layout.tsx:2` imports `Plus_Jakarta_Sans` from `next/font/google`, so
`next build` **downloads the font from Google at build time**. The build is
therefore network-dependent, and a transient fetch failure presents exactly as
observed: a ~21s Build step failure with no compile diagnostic, after
TypeScript and unit tests have already passed.

This import predates T1 and T2 — it arrived with the KORA-WP-139 typography
work and is already on the canonical line. It is recorded here as a **finding**,
not fixed: no fix was authorised in this pass, and converting the family to
`next/font/local` is a Product change requiring its own authorisation.

**Recommendation for a future authorised pass:** vendor the family via
`next/font/local` so the build stops depending on a third-party fetch. The same
change would also remove a build-time external dependency that
`lib/legal/privacy-content.ts` already has to explain to data subjects.

Note also that CI logs and artifacts were not readable in this session — the
GitHub API returned 403/401 without authentication and `gh` is not installed.
The diagnosis above rests on publicly readable check-run annotations, step
timings, and local reproduction. No credential was improvised to work around
this.

---

## 7. Publication scope — what this actually put on the canonical line

The candidate branch descends from a long integration line, and a naive
`main...candidate` diff lists 41 SQL migrations including `090`. That reading is
wrong and is recorded here because it is the trap this session already fell into
once, when pushing an audit branch also published an unreviewed ancestor.

`origin/main` is **not** the canonical line. The canonical head is
`origin/integration/kora-canonical-product-2026-09-22` at `00e70b5`, and the
candidate is **+2** from it — exactly T1 and T2. Migrations 050–090 were already
published on that line by prior authorised work; this push does not republish
them and does not create, apply, or modify any.

**Files added to canonical by this publication — 12, and zero SQL:**

- 4 × T1 Worker source files under `app/worker/`
- 1 × `components/ui/EmptyState.tsx` (T2)
- 1 × `tests/unit/kora-wp-140-surface-state-grammar.test.ts` (lock supersession)
- 6 × T1 evidence PNGs

**Published refs:** canonical `integration/kora-canonical-product-2026-09-22`
fast-forwarded `00e70b5..1f786de`; proof branches
`integration/pxc-wave4b-ci-proof-2026-09-27`, `…-r2`, `…-r3` retained as
evidence (all three at the same SHA — see §6A).

Verified: `git diff --name-only <canonical> 1f786de | grep -icE '\.sql$|migrations'` = **0**.

Constraints honoured: no staging writes; no migration, schema, RLS, or backfill;
no migration 090; no Gate-3 integration; no secrets; no force push; `main`
untouched; WP117 WIP untouched; no PR opened; `main` not merged. The local
A/B harness was bound to local Supabase only (`127.0.0.1:54321`), verified to
contain zero references to the production project `azdnepfmwrmacruykskm` or to
staging `haqflkurpmeaxpikozjl`, and the local stack was torn down afterwards.

---

## 8. Registry position

`KORA-WP-129` remains **READY**, not COMPLETE. Per Section AL.1, COMPLETE means
recorded in AL.2, and READY/BLOCKED are derived, never written. Wave 4b T1
migrated the two surfaces for which Founder-accepted evidence exists; the
remaining Worker surfaces are undischarged debt and are not addressed here.

No AL.2 entry is made by this report.

---

## 9. What this pass deliberately did not do

- did not start the next KORA-WP-129 cohort;
- did not begin Wave 4b for KORA-WP-127 or KORA-WP-128;
- did not start KORA-WP-130, KORA-WP-131, or KORA-WP-143;
- did not resolve the open KORA-WP-127 "36 canonical Admin surfaces"
  discrepancy, which remains recorded and unresolved in report 275;
- did not revisit `/pilot`, which stands FOUNDER-DEFERRED per report 275, with
  its current screenshots explicitly **not** Founder-accepted visual quality.

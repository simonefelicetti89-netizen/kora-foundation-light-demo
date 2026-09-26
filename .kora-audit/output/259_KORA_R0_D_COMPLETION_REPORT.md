# 259 — KORA R0-D — GOVERNANCE PUBLICATION COMPLETION

**Date:** 2026-09-23 · **Track:** `R0` non-WP remediation / release governance

> **R0-D STATUS: `R0_COMPLETE`**
>
> `KORA-GOVERNANCE-v2` is published as the first immutable release of a private governance repository, outside the Product deploy line. Integrity and all three end-to-end reconstructions were verified **from a fresh clone of the published copy**, not from the local bundle.

---

## 1. R0-D ACCEPTANCE, AND HOW IT IS MET

| Contract clause | Evidence |
|---|---|
| *"a private governance repository"* | `simonefelicetti89-netizen/kora-governance`, **private**, created by the Founder; publication performed into it |
| *"without Product Git contamination"* | The bundle is published to a **separate repository**. In the Product repo it remains under the gitignored `.kora-audit/`, with **0 bundle files tracked** |
| *"an external auditor can reconstruct Registry → completion report → canonical SHA → code → applicable evidence"* | Three reconstructions **PASS**, run from the published copy — §4 |
| *"a demonstrated end-to-end reconstruction performed from the published artefact alone"* | Performed from a **fresh clone** at a separate path; the local bundle was not used — §4 |
| *"a numbered report"* | This document |

## 2. PUBLICATION

| Property | Value |
|---|---|
| Repository | **`simonefelicetti89-netizen/kora-governance`** — **PRIVATE** |
| Release | **`KORA-GOVERNANCE-v2`** |
| Remote commit | **`2138a48ca1edcb00820b92b29c01bfacf1232464`** |
| Immutable ref | annotated tag **`KORA-GOVERNANCE-v2`** → tag object `dddfbe9c4047ccd27c2214810598251497c65f95` → commit `2138a48…` |
| Layout | `KORA-GOVERNANCE-v2/` at repository root — **additive**: `v3`, `v4` … occupy sibling directories and never overwrite a published release |
| Contents | 292 files, all under `KORA-GOVERNANCE-v2/`; **`KORA-GOVERNANCE-v1` deliberately not published** |
| Signing | **UNSIGNED — VERSIONED + HASH-VERIFIED** (no signing infrastructure exists; no key was invented) |

A pre-publication secret scan across every text file returned **0 matches**.

## 3. INTEGRITY — VERIFIED FROM THE REMOTE

| Check | Result |
|---|---|
| Manifest entries | **291** |
| `shasum -a 256 -c MANIFEST.sha256` from the fresh clone | **291 OK, 0 not-OK** |
| `MANIFEST.sha256` digest from the remote | **`83ebc75d48b545aa21d17de53b95b8f722b8deb260f1f09ad9965f49f2019d7c`** |
| Match against the expected digest | **YES — identical** |

Bundle contents were not modified at any point: the digest is byte-identical before copy, after copy, and from the fresh clone.

## 4. DEMONSTRATED RECONSTRUCTION — FROM THE PUBLISHED COPY

Links 1, 2 and 5 resolved **inside the published bundle**; links 3 and 4 resolved against the referenced Product repository, as `RECONSTRUCTION.md` instructs an auditor to do.

| Case | Registry | → report | → canonical SHA | → code | → applicable evidence | Verdict |
|---|---|---|---|---|---|---|
| **R0-A** | `R0_COMPLETE` in published Registry 219 | `245` + `244` present | `ec0ff454` resolves | `ci.yml` and `r0a-db-gate-enforcement.test.ts` resolve at SHA | CI / enforcement: run **`35770205003`**, present in **6** published files. Visual **N/A** per the 2026-09-23 ruling | **PASS** |
| **R0-C** | `R0_COMPLETE` in published Registry 219 | `256`, 1153 lines | `1e981f80` resolves | full tree at SHA | Runtime / exact-SHA: `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` cited **10×**, **7** domains `PASS — EXACT-SHA RUNTIME VERIFIED`. Visual **N/A** per the ruling | **PASS** |
| **WP-124/125** | 22 references | `231` and `233` present | `84128e8` resolves | 120 directories at SHA | **26 durable screenshots, 26/26 hash-verified.** Visual **APPLICABLE and satisfied** | **PASS** |

**3 PASS, 0 PARTIAL, 0 FAIL.** No evidence was fabricated or reproduced at any stage.

## 5. VISUAL-EVIDENCE TREATMENT

Per the Founder ruling of 2026-09-23 (report `258` §2a), carried in the published `EVIDENCE_INDEX.md` §0: visual evidence is **NOT APPLICABLE** to `R0-A` (CI / real-DB enforcement / infrastructure) and `R0-C` (integrated staging / runtime / exact-SHA), and **APPLICABLE** to `KORA-WP-124`/`125`, where 26 durable screenshots satisfy it. `NOT APPLICABLE` and `MISSING` are distinct classes in the published index and are never interchanged. The model is not generalised beyond the ruling.

## 6. PRODUCT GIT CONTAMINATION — READING B, SATISFIED

The published artefact stands alone and does not rely on Product Git as its publication mechanism. The four individually Founder-authorized governance artefacts tracked in Product Git branches remain permitted bounded exceptions. The default rule is intact: **`.kora-audit/**` is not added to Product Git**, and the bundle itself has **0 tracked files** there.

## 7. GATES — NONE ADVANCED

`R0-D` = `R0_COMPLETE` satisfies **only** the `R0-D` prerequisite of the **Paid External Pilot** gate. Every other prerequisite is unchanged and unmet:

- **Controlled Pilot** — still requires `KORA-WP-132` = COMPLETE (currently READY). `R0-D` was never one of its prerequisites.
- **Paid External Pilot** — still requires Gate 3 closure, `KORA-WP-134`, `KORA-WP-131`, no material customer-facing dead route, and external legal conditions satisfied (including `F-12`).
- **Production** — still requires every other condition in Section AJ.

No Production deployment, Production authorization, `main` merge or Gate 3 completion is implied. `main` remains `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc`.

## 8. OUTSTANDING NON-BLOCKING DEBT

`F-12` **OPEN** — external legal gate on `KORA-WP-069`, which stays mechanically READY and execution-BLOCKED · `EV-R02` open, closable only by Platform Engineering / I0 infrastructure review · `INV-08` **NOT_DERIVABLE**, pending the per-WP status schema decision · `KORA-WP-117` Founder-deferred · Gate 3 and Gate 5 **OPEN** · the registry consistency checker is not wired into CI — now newly feasible as governance CI over the published repository, and recommended as the next hygiene step · `KORA-WP-132` READY, not COMPLETE.

## 9. RELEASE DISCIPLINE GOING FORWARD

`KORA-GOVERNANCE-v2` is immutable. Any future correction produces **`v3`** as a new sibling directory and a new tag; no published release is ever edited in place. The live authoritative registries remain the pinned source artefacts at their commits — the published repository stores audit snapshots, not competing authority.

**`KORA-GOVERNANCE-v1`** was superseded before publication because its evidence index predated the applicability ruling, and was never published. It is retained locally, unmodified, as a pre-publication draft only.

---

**R0-D STATUS: `R0_COMPLETE`** — 2026-09-23, this report, release `KORA-GOVERNANCE-v2`, remote commit `2138a48ca1edcb00820b92b29c01bfacf1232464`, manifest digest `83ebc75d48b545aa21d17de53b95b8f722b8deb260f1f09ad9965f49f2019d7c`.

# 258 — KORA R0-D — GOVERNANCE PUBLICATION / AUDITABILITY

**Date:** 2026-09-23 · **Track:** `R0` non-WP remediation / release governance
**Bundle produced:** `KORA-GOVERNANCE-v1` · **Manifest digest:** `8d0ace131593955b65d1a97437cb8220ff3fe56bebc1eea1728600977e52f583`

> **R0-D STATUS: `R0_OPEN`**
>
> **One** completion blocker remains: the bundle has **not** been published, because no private governance repository exists and its creation requires Founder account action. The bundle is fully prepared, hash-verified and reconstruction-tested locally, and **all three reconstruction cases now PASS** following the Founder evidence-applicability ruling of 2026-09-23 recorded in §2a.

---

## 1. THE EXACT R0-D CONTRACT

From Registry 219 §AI.2 / §AI.3, verbatim:

- **Preconditions:** `none`
- **Constraint:** *"`.kora-audit/**` is NOT to be added to Product Git **by default** — that would put Founder rulings and audit prose into the deploy line"*
- **Options:** *"a private governance repository; a signed/versioned governance artefact; an equivalent durable audit package"*
- **Acceptance:** *"an external auditor can reconstruct **Registry → completion report → canonical SHA → code → visual evidence**, without Product Git contamination"*
- **Required evidence:** *"a demonstrated end-to-end reconstruction performed from the published artefact alone"*
- **Completion record:** *"a numbered report"* — this document
- **Gate affected:** PAID EXTERNAL PILOT

## 2. FOUNDER RULINGS APPLIED (2026-09-23)

1. **Publication destination — PRIVATE GOVERNANCE REPOSITORY.** Private, versioned, immutable releases, future auditor read access, not a source of live Product runtime code, not a second mutable authoritative registry.
2. **Product Git contamination — READING B.** The published artefact must stand alone and must not rely on Product Git as the publication mechanism. The four individually authorized governance artefacts already tracked in Product Git branches are permitted bounded exceptions and do not invalidate `R0-D`. The default rule stands: `.kora-audit/**` is not added to Product Git.
3. **Visual evidence.** Prose saying "Founder Visual Acceptance" alone is **not** sufficient. Durable non-sensitive artefacts are required where the reconstruction needs them. Nothing sensitive may be preserved. Where exact-SHA reproduction is impossible or unsafe, the gap is disclosed, never fabricated.

## 2a. FOUNDER EVIDENCE-APPLICABILITY RULING — 2026-09-23

**Ruling.** For `R0-D` audit reconstruction, **visual evidence is NOT APPLICABLE to `R0-A` and `R0-C`**; it **remains APPLICABLE to `KORA-WP-124` / `125`**.

**Rationale, as ruled.** `R0-A` is CI / real-DB enforcement / infrastructure validation. `R0-C` is integrated staging / runtime / exact-SHA validation. Neither is a visual product-acceptance package, so their applicable chain is **Registry → completion report → canonical SHA → code → applicable technical/runtime evidence**. A screenshot or recording is not a required evidence class for them.

**What this ruling is not.** It is not fabrication of missing evidence, not a waiver of an applicable visual requirement, and not permission to relabel missing *applicable* evidence as PASS. Where visual acceptance is semantically applicable — Product/UI work — visual evidence remains required, and `WP-124`/`125`'s existing durable screenshots remain authoritative.

**No evidence was fabricated or reproduced in response to this ruling.** The R0-C Playwright artefacts remain destroyed for their original privacy reason; nothing was regenerated to fill a gap that the ruling instead declared inapplicable.

## 3. PUBLICATION MODEL SELECTED

An **immutable, versioned, hash-verified bundle** (`KORA-GOVERNANCE-v1`) destined for a private governance repository. Assembled exclusively from **committed blobs at pinned SHAs** and **deliberately generated `R0-D` artefacts**. No working-tree content entered the bundle; the main worktree's 3 modified and 9 untracked Living KORAL files are structurally excluded and none touches `.kora-audit/`.

Ref isolation: the bundle **references** immutable SHAs rather than publishing from a live branch, so it inherits neither the `gate3/prelive-privacy-remediation` remediation lifecycle nor `audit/mega-code-truth-2026-09`, and creates no second authoritative registry.

## 4. BUNDLE CONTENTS AND PROVENANCE

**289 files.** `shasum -a 256 -c MANIFEST.sha256` → **289/289 OK**.

| Source status | Files | Meaning |
|---|---|---|
| `tracked` | 31 | extracted from committed blobs at pinned SHAs |
| `untracked-corpus` | 253 | governance corpus on disk, never tracked (`.kora-audit/` is gitignored) |
| `generated-r0d` | 5 | README, indexes, reconstruction instructions, checker attestation |

| Artefact | Source commit |
|---|---|
| Registry 102 (authoritative `001`–`110`) | `8c89e5a6b616a16fa310c6bee1bd6015a52df6f0` |
| Registry 219 (authoritative `111`+), reports 256 and 257 | `09daffa82d9d7e072be14f33f09b15c5bb29c873` |
| 26 visual-evidence PNGs | `84128e81b0bb5a617bb7c3ac7802d1a5491c2a84` |
| `CLAUDE.md` (authority §8) | `8c89e5a6…` |

Registry blob integrity verified at assembly: the bundled `102` and `219` are byte-identical to the blobs at their pinned commits (`5357e3d9…` and `381d6fd0…` respectively).

**Signing: UNSIGNED — VERSIONED + HASH-VERIFIED.** No signing infrastructure exists in this project; no key was invented, as the contract permits a versioned artefact.

## 5. CHECKER ATTESTATION AT PUBLICATION TIME

137 Section B specifications · 137 Section C nodes, exact 1:1 · 213 hard edges · 5 conditional edges · 4 inactive scope triggers · 137-node topological order · 0 cycles · 0 self-dependencies · 0 dangling references · 0 topological violations.

`INV-01/02/03/04/05/06/07/11/14 = PASS` · **`INV-08 = NOT_DERIVABLE`** — the registry schema carries no per-WP mechanical status field. Disclosed, never converted to PASS.

## 6. DEMONSTRATED END-TO-END RECONSTRUCTION

Performed from the bundle plus read access to the Product repository.

| Case | Registry | → report | → canonical SHA | → code | → visual evidence | Verdict |
|---|---|---|---|---|---|---|
| **A · R0-A** | OK | `245` present (165 lines), plus evidence report `244` | `ec0ff454` resolves | `ci.yml` + `r0a-db-gate-enforcement.test.ts` (163 lines, independently re-runnable) both resolve at SHA | **PASS (applicable class: CI / enforcement / infrastructure)** — 32 gates enforced, 0 exclusions, 186 real-database assertions; GitHub run **`35770205003`**, conclusion `success`, recorded in Registry 219 and reports `251`/`252`, all inside the bundle. **Visual: N/A per the 2026-09-23 ruling** | **PASS** |
| **B · R0-C** | OK | `256` present, 1153 lines, 14-row A–N matrix | `1e981f80` resolves | full Product tree at SHA | **PASS (applicable class: staging / runtime / exact-SHA)** — 7 domains recorded `PASS — EXACT-SHA RUNTIME VERIFIED`; deployment `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` cited 10× in report `256` and consistently in Registry 219. **Visual: N/A per the 2026-09-23 ruling** | **PASS** |
| **C · WP-124/125** | OK, 22 references | `231` and `233` present | `84128e8` resolves | 120 Product directories at SHA | **26 durable screenshots**, 8 surfaces × 375/768/1440, extracted from committed blobs, **26/26 hash-verified**, synthetic demo data only. **Visual: APPLICABLE and satisfied** | **PASS** |

**3 PASS, 0 PARTIAL, 0 FAIL.** No `PARTIAL` was reinterpreted as `PASS`: the two former `PARTIAL` verdicts changed because the evidence *class* was ruled inapplicable, and every applicable link was then re-verified to resolve.

## 7. WHY R0-D IS NOT COMPLETE

**Blocker 1 — EXTERNAL PUBLICATION ACTION REQUIRED.** The only configured git remote is the **Product** repository (`kora-foundation-light-demo`). No private governance repository exists or is configured, and `gh` is not installed, so creation and authentication require Founder account action. Publication was **stopped before creation**, exactly as Ruling 1 directs. Nothing was published to Product Git as a substitute and no public destination was considered.

**Blocker 2 — CLOSED 2026-09-23.** The former visual-evidence blocker was resolved by the Founder evidence-applicability ruling in §2a, not by producing artefacts: visual evidence is `N/A` for `R0-A` and `R0-C`, and every applicable evidence link for both was re-verified to resolve from the bundle. **No other applicable evidence gap was found.**

## 8. WHAT THIS REPORT DOES NOT DO

It does not mark `R0-D` complete · does not transition Registry 219's `R0-D` state · does not advance the Controlled Pilot, Paid External Pilot or Production gates · does not resolve `F-12`, `EV-R02`, Gate 3 or Gate 5 · does not execute any `KORA-WP` · does not touch `main`, Production, migrations or Product runtime behaviour.

## 9. OUTSTANDING NON-BLOCKING DEBT

`F-12` OPEN (external legal; gates Paid External Pilot) · `EV-R02` open, closable only by Platform Engineering / I0 infrastructure review · `INV-08` not derivable pending a schema decision · `KORA-WP-117` Founder-deferred · Gate 3 and Gate 5 OPEN · checker not wired into CI, since `.kora-audit/` never reaches CI — a dedicated governance-CI over published artefacts becomes possible once a publication destination exists · `KORA-WP-132` READY, not COMPLETE, which is what currently gates the Controlled Pilot.

## 10. REMAINING COMPLETION REQUIREMENTS

1. Create or designate the private governance repository (**Founder action**).
2. Publish `KORA-GOVERNANCE-v1` there as an immutable release; record the destination and release identifier.
3. ~~Resolve the visual-evidence link for `R0-C`.~~ — **CLOSED 2026-09-23 by Founder evidence-applicability ruling (§2a).**
4. Re-run the demonstrated reconstruction **from the published artefact alone** and record three PASS verdicts. *(All three already PASS locally; the re-run must be performed against the published artefact.)*
5. Issue the `R0-D` completion record and only then transition Registry 219.

**Bundle-version note.** `KORA-GOVERNANCE-v1`'s own `EVIDENCE_INDEX.md` still carries the pre-ruling classification, because this update was scoped to report `258` only. Since `v1` is unpublished, it should be regenerated as `v2` carrying the §2a ruling **before** publication, so the published artefact stands alone and agrees with this report.

---

**R0-D STATUS: `R0_OPEN`**
Sole remaining blocker: **private governance repository creation / authorization + publication**. Every applicable reconstruction link resolves; the bundle awaits a durable off-machine destination.

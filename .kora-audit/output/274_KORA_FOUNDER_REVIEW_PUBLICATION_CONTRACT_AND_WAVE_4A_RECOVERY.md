# 274 — KORA FOUNDER REVIEW PUBLICATION CONTRACT — GOVERNANCE CORRECTION AND PX-C WAVE 4a RECOVERY

**Date:** 2026-09-27 · **Type:** governance correction (binding) + recorded process exception
**Authority:** Founder ruling 2026-09-27, "APPROVE GOVERNANCE CORRECTION WITH ONE AMENDMENT"
**Applied to:** Registry 219 § Section A (authoritative) · `CLAUDE.md` §8 (pointer only)

---

## 1. THE DEFECT

During PX-C Wave 4a (`KORA-WP-127`/`129`/`128`) the sequence executed was:

```
implement → commit → PUSH proof branch → CI #346 → FAST-FORWARD CANONICAL → CI #347 → report to Founder
```

Canonical Product publication therefore occurred **before** the Founder had seen the result. Four green CI jobs
were treated as sufficient authority to publish. **They are not.** Exact-SHA CI is technical evidence; only the
Founder authorizes publication of a user-visible change.

The Registry side was handled correctly — nothing was marked COMPLETE — so this is a **publication-sequence**
defect, not a completion-truth defect.

## 2. THE HISTORICAL WORKFLOW, RECONSTRUCTED FROM EVIDENCE

Reports `269` (WP140), `270` (WP139) and `271` (WP141+142) record a consistent order. Report `271` is decisive
because it states the branch condition explicitly: the candidate lived on
`feature/kora-index-approved-design-v2`, **"local only, never pushed"**, 11 commits; **Founder Visual
Acceptance was granted on that exact frozen SHA**; only then did CI #339 run on a pushed proof branch. Reports
`269` and `270` both open with *"THE FOUNDER RULING, RECORDED BEFORE ANYTHING ELSE"* / *"THE FOUNDER RULING,
FIRST"*.

| | Historical | Wave 4a |
|---|---|---|
| Candidate commits before review | yes, local | yes, local |
| Candidate **pushed** before review | **no** | **yes** |
| CI before review | no | yes |
| **Canonical publication before review** | **never** | **yes** |

Report `267` (`KORA-WP-138`, runtime canonicalization) records completion with no Founder Visual Acceptance at
all — confirming the visual gate was always applied by **nature of the work**, not to every package.

## 3. THE CORRECTION

Registry 219 § Section A now carries the **FOUNDER REVIEW PUBLICATION CONTRACT** (binding). Its full text is in
the Registry and is not duplicated here. Its substance:

- a materially user-visible candidate may not be **pushed for proof** nor **integrated into canonical** before
  Founder Review and explicit publication authorization;
- the Founder reviews the exact frozen **local** candidate SHA;
- **exact-SHA CI is never publication authority**;
- applicability turns on **material effect, not filename**; a path detector may flag conservatively but may
  never mechanically waive review where a user-visible effect exists;
- Technical Acceptance, Founder Review and Formal Founder Visual Acceptance remain three distinct things, and
  Founder Review is mandatory even where a WP requires no formal acceptance record;
- `KORA-WP-126` prepares review and never replaces it;
- `INV-15` is specified but **PENDING ENFORCEMENT IMPLEMENTATION**.

`CLAUDE.md` §8 receives a **pointer only**, on the governance line.

## 4. `INV-15` — WHY IT IS PENDING

The governance harness (`lib/governance/registry-consistency.ts`,
`scripts/governance/registry-consistency-check.ts`, the `governance:registry-check` script) exists **only** on
the unpublished `gate3/prelive-privacy-remediation` line. Per the Founder ruling, Gate 3 must **not** be
published to obtain it, and no unrelated Product or migration history may be pulled into canonical for it.
Duplicating the harness onto the governance line to host one invariant would create a second copy of governance
tooling — the duplicated-truth defect report `257` already catalogued.

`INV-15` is therefore **specified and recorded, not implemented**. **The contract is binding regardless of
enforcement availability.** Existing invariants `INV-01`–`INV-08`, `INV-11`, `INV-14` all still PASS with the
contract added.

## 5. RESIDUAL — CANONICAL PRODUCT `CLAUDE.md`

The pointer is applied on the governance line. Canonical Product's own `CLAUDE.md` still lacks it, because this
pass is explicitly forbidden from mutating Product. Until a separate Product authorization carries the pointer
across, a session working from canonical Product will not see the routing line — the Registry contract still
binds, but the reminder does not travel with the checkout. **Recorded, not silently accepted.**

## 6. PX-C WAVE 4a — RECORDED PROCESS EXCEPTION

Wave 4a is published at `87fbdfa9621462f3d82e727726520fa590d2d4aa`, reached before this gate existed.

**History is not rewritten. The publication is not silently reverted. No retrospective Founder approval is
inferred.** Founder judgment is recovered explicitly, per package, with before/after evidence brought to the
Founder rather than referenced.

The complete user-visible delta of `81d3cf3f9158017659a80429c1c3a522ca769f7d` →
`87fbdfa9621462f3d82e727726520fa590d2d4aa` is five files, three visual:

| File | Change | Visual |
|---|---|---|
| `lib/navigation/admin-nav-groups.ts` | Admin rail restructure (`KORA-WP-127`) | **yes** |
| `app/pilot/page.tsx` | dead nav entry + hero CTA removed (`KORA-WP-128`) | **yes** |
| `app/company/financial/page.tsx` | dead "Demo Guide →" button removed (`KORA-WP-128`) | **yes, not observable on the seeded fixture** |
| `app/company/activation/page.tsx` | `data-testid` only | no |
| `app/company/reports/page.tsx` | `data-testid` only | no |

### 6.1 `KORA-WP-129` — classified NON-VISUAL
Wave 4a produced **no user-visible Worker change**: no navigation restructured, no page body altered. Only a
guard and evidence were delivered. It is subject to normal technical acceptance and **no visual approval is
requested for an unchanged surface**. `KORA-WP-129` nevertheless remains **READY** — its WP contract is
incomplete (system migration onto `139`–`142` is Wave 4b).

### 6.2 `KORA-WP-127` and `KORA-WP-128` — Founder judgment requested
Both carry a real visible delta and are put to the Founder individually, never bundled.

### 6.3 `/company/financial` — stated limitation, no fabricated evidence
The removed "Demo Guide →" button lives in the **populated** body. The seeded golden-path tenant has no
completed pipeline, renders `NOT_YET_AVAILABLE`, and never displayed the button. Before and after captures are
**byte-identical** (`d70def4b238c8f4a`). The change is real in code and would be visible to a data-bearing
tenant; **no visible before/after is claimed where none was observable.**

## 7. WHAT THIS REPORT DOES NOT DO

It does not complete any package, change any status, resolve the unresolved `KORA-WP-127` "36 canonical Admin
surfaces" contract/evidence discrepancy — which remains separate and still blocks eventual `KORA-WP-127`
COMPLETE — or authorize Wave 4b. Registry 219 continues to derive **COMPLETE 70 · READY 39 · BLOCKED 35 ·
TOTAL 144**, with `KORA-WP-127`/`129`/`128` **READY** and `KORA-WP-131` **BLOCKED**.

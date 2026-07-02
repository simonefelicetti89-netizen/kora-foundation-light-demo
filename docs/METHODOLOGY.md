# KORA — Methodology Reference

**Last verified date:** 2026-07-03
**Last verified commit:** `8210247` (main)
**Audience:** CTO, technical partner, methodology reviewer, KORA_ADMIN

---

## Scope

A concise, current reference for the KORA Index methodology's naming, structure, and versioning. This is a summary/index, not the canonical methodology specification — full detail lives in `docs/10-architecture-v3-layer-specification.md` (canonical, per CLAUDE.md's authority hierarchy), `docs/kora-scoring-kernel-contract.md` (technical contract), and `CLAUDE.md` §3–§6 (constitutional summary). Where this doc and those disagree, those win.

This doc exists because version labeling has historically drifted across surfaces (see KORA-INDEX-VERSION-02 and GOLDEN-04-DOCS) — its job is to be the one place that's unambiguous about which label means what.

---

## Two distinct version axes — do not conflate

| Axis | Value | Where it's used |
|---|---|---|
| **Public / client-facing product version** | **KORA Index v1.0** | UI labels, reports, Decision Pack, API metadata, `methodology_version_id` field. Source: `lib/constants/kora.ts` (`KORA_INDEX_VERSION`, `METHODOLOGY_VERSION`). |
| **Internal methodology/architecture generation** | **KORA Methodology Architecture v3** | Internal docs, the 10-component macroblock structure itself. Never shown as a public version number. |

Forbidden on any client-facing/report/PDF surface (superseded, per `tests/unit/b100-versioning-consistency.test.ts`): `KORA Index v0.1`, `KORA Index v2.0`, `KORA Index v3`, `KORA Index™ v3`, `KORA Methodology v0.1` (as a public-facing string — as internal build-stage shorthand in CLAUDE.md-style constitutional text it's a different, legitimate usage).

---

## The 10 components (current names)

Pre-Sprint-1 component names (`NI`, `VR`, `CO`, `WB`, `EQ`) are superseded. Some historical docs and the unmerged `docs/consolidation` branch still used the old names in places at the time of writing — current code (`lib/constants/kora.ts`) uses:

| Code | Name | Macroblock | Meaning |
|---|---|---|---|
| `AR` | Activation Rate | REACH (25%) | Share of workforce with ≥1 approved IU |
| `MAR` | Meaningful Activation Rate | REACH (25%) | Share with IU above materiality threshold |
| `EVQ` | Evidence Quality | QUALITY (30%) | Solidity/verifiability of evidence sources backing approved IU (was `VR`) |
| `INT` | Normalized Intensity | QUALITY (30%) | Total IU per active worker, normalized against target (was `NI`) |
| `CONT` | Continuity | QUALITY (30%) | Share of workers with cross-period sustained engagement (was `CO`) |
| `EQW` | Equity Workers | EQUITY (25%) | IU distribution across active workers, Gini-based — `insufficient_data` in Foundation Light base (was `WB`) |
| `EQS` | Equity Segments | EQUITY (25%) | Activation-rate equity across departments/sites (N≥10) (was part of `EQ`) |
| `PC` | Pillar Coverage | EQUITY (25%) | Number of pillars with meaningful presence |
| `PB` | Pillar Balance | EQUITY (25%) | Evenness of IU distribution across pillars |
| `CS` | Confidence Score | External (weight = 0) | Data completeness, source quality, verification weight — always shown alongside, never merged into the Index |

**EQW and EQS are distinct** — worker-level vs. segment-level equity. Neither should be called just "EQ." Evidence quality is EVQ + CS + EV (the IU formula factor), not a component of EQW/EQS.

Macroblock weights: REACH 25% (AR 12.5 + MAR 12.5), QUALITY 30% (EVQ ~10 + INT ~10 + CONT ~10), EQUITY 25% (EQW ~7.5 + EQS ~5 + PC ~6.25 + PB ~6.25), BTI 20% (from the BTI Engine, not summed from individual component values). Weights are read from `lib/methodology-config/v0.1.ts` via `getMacroblockWeights()` — **never hardcoded** in components or services.

---

## Impact Units formula (unchanged, canonical)

```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

| Factor | Range | Description |
|---|---|---|
| NM | 0.0–2.0 | Normalized Magnitude |
| BC | pillar-specific | Base Contribution Matrix |
| CQ | 0.0–1.0 | Completeness Quality |
| EV | 0.0–1.0 | Evidence Verification |
| CF | 0.0–1.0 | Continuity Factor |
| AGF | 0.00–1.00 | Anti-Gaming Factor — mandatory, independent; AGF=0 → IU=0 |
| DF | 1.00–1.30 | Durability Factor — optional, LEGACY pillar only |
| EXF | 1.00–1.20 | Externality Factor — optional, IMPACT pillar only |
| SF | 0.80–1.10 | Strategic Fit — optional, requires documented evidence |

Full formula semantics: `docs/kora-scoring-kernel-contract.md` §10, CLAUDE.md §3.

---

## Calibration status (non-suppressible)

Every KORA Index output carries:

```
methodology_version_id: "KORA Index v1.0"
calibration_status: "pre_empirical_calibration"
productionReady: false
```

Macroblock and component weights are pre-Delphi provisional scaffolding. The empirical calibration process (Delphi Study) is post-pilot. KORA Index values from different companies should not be compared until that calibration completes. This is not optional UI copy — it's a required, non-suppressible field on every KORA Index surface (CLAUDE.md §6, §17).

---

## Five pillars (unchanged)

`LIFE`, `GROWTH`, `CONNECTION`, `IMPACT`, `LEGACY` — see CLAUDE.md §4 for domain definitions. Every UEF record is classified into exactly one pillar.

---

## KORA Contribution — not a component

KORA Contribution is a companion indicator measuring collective/ecosystem engagement. It is displayed separately and is **never** merged into the KORA Index computation — this is a constitutional rule (CLAUDE.md §5, §17), not a current-implementation detail that might change casually.

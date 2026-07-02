# KORA Scoring Kernel — Technical Contract

**Version:** B71 Handoff Reference  
**Date:** 2026-06-06  
**Audience:** Next — external technical partner receiving this repository  
**Calibration status:** `pre_empirical_calibration` — methodology v0.1, not empirically validated

---

## 1. Purpose

This document is the technical handoff contract for the KORA Scoring Kernel. It defines what the kernel is, what it is not, its input/output contract, canonical execution flow, privacy invariants, and which parts a technical partner should reuse versus treat as provisional.

> **Alignment note (post KORA-INDEX-VERSION-02):** the 10-component names and
> `methodology_version_id` value below were updated to match current code
> (`lib/constants/kora.ts`, CLAUDE.md §5). Component renames since the
> original B71 handoff: `NI → INT`, `VR → EVQ`, `CO → CONT`, `WB → EQW`,
> `EQ → EQS` — same underlying concepts, current names. The IU formula,
> factor ranges, and privacy invariants below are unchanged and still
> canonical.

---

## 2. What the kernel is

The KORA Scoring Kernel is a **deterministic, rule-based computation engine** that:

- Classifies welfare and HR program records as eligible / limited / blocked / review_required
- Computes Impact Units (IU) per record per pillar using the canonical formula
- Aggregates IU through a mandatory PIB (Personal Impact Balance) intermediate layer
- Rolls up to a company-level KORA Index with 4 macroblocks and 10 diagnostic components
- Computes a Confidence Score (external to the KORA Index) as a data reliability indicator
- Enforces an Activation Safeguard (CLEAR / WARNING / FLAGGED) against gaming and under-activation

The kernel is located in `lib/kora-engine/` and has **no Next.js, Supabase, or UI dependencies**. It is designed to be portable.

---

## 3. What the kernel is not

- Not an ML or AI model — fully rule-based, no probabilistic outputs
- Not a worker surveillance system — workers are never ranked, rated, or individually scored for employers
- Not empirically calibrated — weights are v0.1 pre-Delphi scaffolding, not validated against real populations
- Not a compliance or regulatory tool — outputs require human interpretation
- Not a real-time stream processor — designed for batch scoring (one pipeline run per data upload)
- Not an HR analytics system — no correlation engine, no predictive analytics

---

## 4. Input contract

```typescript
runKoraPipeline({
  tenantId: string;                                // company tenant identifier
  batchId?: string;                                // optional batch label for audit trail
  records: Array<RawUploadedRecord | NormalizedUEFRecord>;  // cleaned upload records
  workforcePopulation?: number;                    // total headcount (enables AR/MAR)
  scoringMode?: ScoringMode;                       // override: 'computed' | 'insufficient_data'
})
```

**`RawUploadedRecord`** (from `lib/kora-engine/types.ts`):
```typescript
{
  recordId: string;
  batchId: string;
  rowIndex: number;
  detectedRecordType: string;
  raw: Record<string, unknown>;   // original column headers preserved
}
```

Key `raw` fields consumed by the engine (Italian or English column names accepted):
- `nome_iniziativa` / `initiative_name` — program name (eligibility classification)
- `categoria` / `category` — program category
- `partecipanti` / `participants` — participant count (AR/MAR/IU scaling)
- `importo` / `amount` — program spend (BTI)
- `obbligatorio` / `mandatory` — mandatory flag (blocks if true + no voluntary signal)
- `b6_evidence_level` — evidence tier L0–L4 (EV factor)
- `b6_approved_for_iu` — operator approval flag (IU computation gate)
- `b6_uef_record_id` — UEF record identifier for audit trail

---

## 5. Output contract

```typescript
KoraComputationResult {
  tenantId: string;
  batchId: string;
  scoringMode: 'computed' | 'insufficient_data';
  eligibilitySummary: EligibilitySummary;
  pillarDistribution: Record<Pillar, number>;
  bti: BTIResult;                       // Budget-to-Human-Impact
  activation: ActivationResult;         // AR, MAR, Activation Safeguard
  koraIndex: KoraIndexResult;           // 4 macroblocks, 10 components, value 0–100
  confidence: ConfidenceResult;         // CS — external to KORA Index
  componentSignals: ComponentSignals;   // EVQ, INT, CONT raw signals
  pibAggregation: CompanyPIBAggregation; // PIB mandatory intermediate (Stage 11)
  iuSummary: ImpactUnitComputationSummary;  // aggregate IU totals (employer-safe)
  iuResults: ImpactUnitComputationResult[]; // per-record IU with factor trace (server-only)
  explainabilityTrace: ExplainabilityEntry[];
  reachSemantics?: ReachSemanticsResult;
  warnings: string[];
  createdAt: string;
}
```

**Key output invariants:**
- `scoringMode === 'insufficient_data'` when records array is empty or pipeline errors
- `koraIndex.calibrationStatus === 'pre_empirical_calibration'` always
- `koraIndex.productionReady === false` always (Foundation Light v0.1)
- `confidence.externalToIndex === true` — CS does not influence KORA Index value
- `pibAggregation.pibSnapshotsAvailable === false` (Foundation Light aggregate model)
- `iuResults` are server-side only — never exposed to employer-facing API responses

---

## 6. Canonical execution flow

```
Upload row (RawUploadedRecord)
  │
  ▼ Step 1: Guard — empty input → scoringMode=insufficient_data
  │
  ▼ Step 2: Eligibility Gate™  [lib/kora-engine/eligibility-gate.ts — CANONICAL]
  │         eligible | limited | blocked | review_required
  │
  ▼ Step 3: Pillar Mapping  [lib/kora-engine/pillar-mapping.ts]
  │         LIFE | GROWTH | CONNECTION | IMPACT | LEGACY
  │
  ▼ Step 4: Impact Units™  [services/iu-computation/IUComputationService.ts] — canonical Stage 10
  │         IU = NM × BC × CQ × EV × CF × AGF
  │         iuResults[] — server-side only
  │
  ▼ Step 5: Care Economy Tagging  [lib/kora-engine/care-economy-mapping.ts]
  │         premium signal detection (informational, no KORA Index impact in v0.1)
  │
  ▼ Step 6: Budget Evidence Assessment  [lib/kora-engine/budget-evidence.ts]
  │         L0–L4 evidence tier per record
  │
  ▼ Step 7: Component Signals  [lib/kora-engine/component-engine.ts]
  │         EVQ (Evidence Quality), INT (Normalized Intensity), CONT (Continuity)
  │
  ▼ Step 8: BTI Engine™  [lib/kora-engine/bti-engine.ts]
  │         Budget-to-Human-Impact: spend routing, Activation Debt, BTI Score
  │
  ▼ Step 9: Activation Engine  [lib/kora-engine/activation-engine.ts] — canonical Stage 13
  │         AR, MAR, Activation Safeguard (CLEAR / WARNING / FLAGGED)
  │         Department and site concentration analysis
  │
  ▼ Step 10: PIB Aggregation™  [services/pib-aggregation/PIBAggregationService.ts] — canonical Stage 11
  │         MANDATORY INTERMEDIATE — AG-01 canonical rule
  │         estimationBasis='aggregate_estimate' in Foundation Light v0.1
  │         pibSnapshotsAvailable=false (individual PIBs require Pilot+)
  │
  ▼ Step 11: Eligibility Summary
  │
  ▼ Step 12: Pillar Distribution
  │
  ▼ Step 13: Confidence Score  [lib/kora-engine/confidence-engine.ts] — canonical Stage 14
  │         CS — external to KORA Index, always displayed alongside
  │
  ▼ Step 14: KORA Index Engine™  [lib/kora-engine/kora-index-engine.ts] — canonical Stage 14
  │         4 macroblocks × component signals → KORA Index 0–100
  │
  ▼ Step 15: Explainability Trace  [lib/kora-engine/explainability.ts]
  │         9-stage aggregate trace, zero identity values
  │
  ▼ Step 16: Reach Semantics  [lib/kora-engine/reach-semantics.ts]
             Board-safe AR/MAR separation (explanatory layer)
```

---

## 7. Canonical eligibility engine

**`lib/kora-engine/eligibility-gate.ts` is the only eligibility classifier that controls scoring.**

It determines whether a record:
- Generates IU (Impact Units)
- Contributes to the KORA Index
- Advances to PIB Aggregation

There is a second file: `services/eligibility-gate/EligibilityGateService.ts`. This is a **taxonomy/preprocessing classifier** used only in the admin BCM mapping UI. It takes `{name, description, category}` and matches against the BCM action taxonomy. It does NOT control scoring. These two classifiers may disagree on edge cases — the canonical engine always wins.

See headers in both files for full documentation.

---

## 8. KORA Index v1.0 — macroblocks and weights

Weights are read from `lib/methodology-config/v0.1.ts` via `getMacroblockWeights()`. Never hardcoded in engine files.

| Macroblock | Code | Weight | Components |
|---|---|---|---|
| Activation Reach | `REACH` | 25% | AR (12.5%) + MAR (12.5%) |
| Activation Quality | `QUALITY` | 30% | EVQ (~10%) + INT (~10%) + CONT (~10%) |
| Distribution & Equity | `EQUITY` | 25% | EQW (~7.5%) + EQS (~5%) + PC (~6.25%) + PB (~6.25%) |
| Budget-to-Human-Impact | `BTI` | 20% | BTI Score from BTI Engine |

Confidence Score (CS) weight = 0. It is external to the KORA Index — displayed alongside, never merged into the index value.

---

## 9. Ten diagnostic components

| Code | Name | Macroblock | Meaning |
|---|---|---|---|
| `AR` | Activation Rate | REACH | Share of workforce with ≥1 approved IU |
| `MAR` | Meaningful Activation Rate | REACH | Share with IU above materiality threshold |
| `EVQ` | Evidence Quality | QUALITY | Solidity/verifiability of evidence sources backing approved IU |
| `INT` | Normalized Intensity | QUALITY | Total IU per active worker, normalized against the configured target |
| `CONT` | Continuity | QUALITY | Share of workers with cross-period sustained engagement |
| `EQW` | Equity Workers | EQUITY | IU distribution across active workers (Gini-based) — `insufficient_data` in Foundation Light base (requires individual PIB distribution) |
| `EQS` | Equity Segments | EQUITY | Equity of activation rate across departments/sites (N≥10) — requires per-department headcount |
| `PC` | Pillar Coverage | EQUITY | Number of pillars with meaningful presence |
| `PB` | Pillar Balance | EQUITY | Evenness of IU distribution across pillars |
| `CS` | Confidence Score | — (external) | Data completeness, source quality, verification weight |

**EQW and EQS are distinct components.** EQW measures worker-level IU distribution equity; EQS measures segment-level (department/site) activation-rate equity. Neither is evidence quality — evidence quality is handled by EVQ, CS, and EV (IU formula correction factor).

---

## 10. Impact Units formula

```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

| Factor | Range | Description |
|---|---|---|
| NM | 0.0–2.0 | Normalized Magnitude — event intensity scaling |
| BC | pillar-specific | Base Contribution Matrix — LIFE: 1.20, GROWTH: 1.10, CONNECTION: 1.00, IMPACT: 1.00, LEGACY: 1.10 |
| CQ | 0.0–1.0 | Completeness Quality — data completeness score |
| EV | 0.0–1.0 | Evidence Verification — L3 verified: 0.90, L2 partial: 0.75, L1 self-declared: 0.60, L0: ~0.30 |
| CF | 0.0–1.0 | Continuity Factor — cross-period engagement signal |
| AGF | 0.00–1.00 | Anti-Gaming Factor — mandatory; AGF=0 disqualifies the event (IU=0) |
| DF | 1.00–1.30 | Durability Factor — optional, LEGACY pillar only |
| EXF | 1.00–1.20 | Externality Factor — optional, IMPACT pillar only |
| SF | 0.80–1.10 | Strategic Fit — optional, any pillar, requires documented evidence |

AGF is always computed and is independent. A disqualified record produces IU = 0 regardless of other factors.

---

## 11. PIB Aggregation — Foundation Light v0.1 status

PIB (Personal Impact Balance) is the **mandatory intermediate layer** between IU computation (Stage 10) and KORA Index (Stage 14). This is AG-01 canonical rule — the KORA Index must always be computed via PIB aggregation, never directly from raw IU totals.

**Foundation Light v0.1 limitation:**  
UEF records are program-level aggregates (one row per initiative, not per worker). Individual PIBSnapshots (`workerPseudonymId → IU per pillar`) are not computable from the aggregate upload model.

Current state:
- `pibAggregation.pibSnapshotsAvailable === false`
- `pibAggregation.estimationBasis === 'aggregate_estimate'`
- EQW (Equity Workers) = `null` / `insufficient_data` (requires individual PIB distribution)
- AR/MAR derived from activation engine bounded-reach estimate

This is an architecture limitation of the v0.1 aggregate upload model, not a design defect. When My KORA worker platform is live (Pilot+) with individual participation confirmation, individual PIBs will be computable and this limitation lifts.

---

## 12. BTI Intelligence — status

BTI (Budget-to-Human-Impact) is fully operational in Foundation Light v0.1:
- Classifies every spend record by treatment: deep_activation / economic_relief / blocked_compliance / non_valued
- Computes Activation Debt (spend allocated to blocked/non-valued items)
- Produces BTI Score (0–100) used as the BTI macroblock (20% of KORA Index)
- Budget evidence quality L0–L4 assessed per record

---

## 13. Privacy invariants

These are non-negotiable. Any implementation consuming this kernel must preserve them.

**N≥10 threshold:**  
Employer-visible segments (departments, sites, seniority bands, contract types) must be suppressed when group size < 10. Groups below threshold are bucketed into an "Other" aggregate only when the bucket total ≥ 10. This prevents re-identification.

**No employer access to individual PIB:**  
`PIBAggregationService.getWorkerPIBSummary()` returns `{available: false}` for all non-worker roles. This is hard-enforced, not a display toggle. No employer-facing API path may receive individual PIB data.

**Tenant isolation:**  
`tenantId` is always sourced from the server-side session (`app_metadata.kora_tenant_id`). It is never trusted from client input, URL parameters, or request body. Any API route that accepts `tenantId` from the client must re-validate it against the session before using it.

**PIB is never employer-visible:**  
PIB is a worker-private mandatory intermediate layer. It appears in My KORA (worker-only) and inside the scoring engine. It is never passed to any company workspace API response.

---

## 14. Calibration status

All scoring outputs carry:

```
methodology_version_id: "KORA Index v1.0"
calibration_status: "pre_empirical_calibration"
productionReady: false
```

These fields are non-suppressible on any KORA Index surface.

**What pre_empirical_calibration means:**
- Macroblock weights (REACH 25%, QUALITY 30%, EQUITY 25%, BTI 20%) are provisional scaffolding
- Component effective weights (e.g., AR = 12.5%) are pre-Delphi
- The Delphi Study expert calibration process is post-pilot
- Outputs are pilot-grade diagnostic intelligence, not certified or regulatory-grade
- KORA Index values from different companies should not be compared until empirical calibration is complete

---

## 15. What Next should reuse

These components are stable, tested, and form the portable KORA kernel:

| Component | Location | Reuse notes |
|---|---|---|
| Scoring engine | `lib/kora-engine/` | Fully portable — no UI/DB deps |
| Canonical eligibility gate | `lib/kora-engine/eligibility-gate.ts` | Reuse as-is |
| Pillar mapping | `lib/kora-engine/pillar-mapping.ts` | Reuse as-is |
| IU computation service | `services/iu-computation/IUComputationService.ts` | Reuse interface |
| PIB aggregation service | `services/pib-aggregation/PIBAggregationService.ts` | Reuse AG-01 structure |
| BTI engine | `lib/kora-engine/bti-engine.ts` | Reuse as-is |
| Methodology config | `lib/methodology-config/v0.1.ts` | Version-bump for calibration updates |
| Activation Safeguard thresholds | `lib/methodology-config/v0.1.ts` | D-21 thresholds |
| Eligibility classification contract | `services/eligibility-gate/EligibilityGateService.ts` | Interface is stable |
| SQL migrations | `supabase/migrations/001–005` | Use as data model reference |
| Auth session helpers | `lib/auth/kora-session.ts` | `requireKoraAdmin`, `requireCompanyUser` |
| TypeScript type contracts | `lib/types/`, `lib/kora-engine/types.ts` | All interfaces are stable |

---

## 16. What Next should not treat as final

| Component | Status | Notes |
|---|---|---|
| UI (all pages) | Demo/pilot | Not production interface |
| Worker platform (My KORA) | Preview | No live worker identity |
| Macroblock weights | Pre-calibration | Will change post-Delphi |
| Component effective weights | Pre-calibration | Will change post-Delphi |
| Demo pages / role switcher | Demo tooling | Not for production |
| Future Vision screens | Static mockups | No runtime logic |
| `EligibilityGateService` keyword patterns | Provisional | Expand with pilot data |
| PIB individual snapshots | Not available | Requires Pilot+ worker platform |
| EQW Gini coefficient | Not computed | Requires individual PIB distribution |
| CONT cross-period continuity | Estimated | Requires multi-batch data |

---

*Document version: B71 · 2026-06-06 · pre_empirical_calibration · Foundation Light v0.1*

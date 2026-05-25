# SPRINT 0 — CODEBASE AUDIT
**KORA Foundation Light v0.1 — Pre-Build Integrity Report**
**Date:** 2026-05-25 | **Auditor:** Claude Code (claude-sonnet-4-6) | **Mode:** Read-only

---

## EXECUTIVE SUMMARY

| Area | Status | Critical Issues |
|---|---|---|
| `/KORA_DOCTRINE.md` | ❌ **MISSING** | File referenced in session protocol does not exist |
| Stack | ✅ Clean | Next.js 16.2.6 App Router, TS strict, Tailwind v4, no Gate-2-blocked artifacts |
| Methodology Config | ✅ Correct | v0.1 macroblock weights match CLAUDE.md §5; CS external=0 enforced |
| KORA Index S1 | ⚠️ **Range mismatch** | Stored value=34, doc 25 target 42-52. Mathematically correct for v3 weights — doc 25 is stale |
| KORA Index S2 | ⚠️ **Range mismatch** | Stored value=54, doc 25 target 60-68. Same root cause |
| CO / VR in aggregates | ⚠️ Below doc 25 | S1 CO=0.28 (doc ~0.38), S2 CO=0.44 (doc ~0.62); S1 VR=0.41 (doc ~0.55), S2 VR=0.61 (doc ~0.72) |
| Activation page | ❌ **Data integrity** | Hardcoded site workers sum to 567, not 250. `estimated_debt_eur=84000` unexplained |
| Scenario binding | ⚠️ Partial | `company/profile` hardcodes `SCENARIO='S2'`; 5 constant arrays in activation page are scenario-blind |
| Privacy / Gate-2 | ✅ Clean | No SQL, Prisma, real auth, or individual worker data exposed to employer routes |
| KORA Contribution | ✅ Correct | `is_kora_index_component: false` enforced in seed; companion indicator never merged |
| CS display | ✅ Correct | CS shown alongside KORA Index on all surfaces; labeled "ESTERNO · peso = 0" |
| Future Vision | ✅ Correct | Labeled "Not Active in Foundation Light" with no backend logic |

**Immediate fix needed:** activation page static constants. Everything else is a report-and-track issue.

---

## 1. KORA_DOCTRINE.md — NOT FOUND

```
/KORA_DOCTRINE.md  ← does NOT exist in repository
```

Session protocol required reading this file first. It is absent. Canonical numbers in this audit
are derived from `docs/kora-canonical-product-architecture-v1.md` and `CLAUDE.md`.

---

## 2. STACK VERIFICATION

| Item | Value | Status |
|---|---|---|
| Next.js | 16.2.6 App Router | ✅ |
| TypeScript | strict: true, strictNullChecks: true | ✅ |
| React | 19.0.0 | ✅ |
| Tailwind CSS | v4 (`@import "tailwindcss"`, `@theme inline`) | ✅ |
| Fonts | Geist + GeistMono + Space Grotesk + DM Sans via next/font/google | ✅ |
| shadcn/ui | **Not installed** | ✅ (not required) |
| lucide-react | ^0.511.0 | ✅ |
| recharts | ^3.8.1 | ✅ |
| Prisma / Supabase | **Absent** | ✅ Gate-2 clean |
| NextAuth / real auth | **Absent** | ✅ Gate-3 clean |
| SQL DDL | **Absent** | ✅ Gate-2 clean |

Methodology config entry point: `lib/methodology-config/v0.1.ts` — reads from
`data/methodology/methodology-config.json`. `getWeights()` is deprecated and throws;
all consumers use `getMacroblockWeights()` / `getAllComponentEffectiveWeights()`. Clean.

---

## 3. REPOSITORY MAP (depth 3, key directories)

```
/
├── app/
│   ├── page.tsx                    → DemoGuideContent (root redirect)
│   ├── layout.tsx                  → AppShell, 4 fonts, lang="it"
│   ├── globals.css                 → Tailwind v4, KORA brand tokens
│   ├── company/
│   │   ├── page.tsx                C-01 Executive Cockpit (rebuilt)
│   │   ├── kora-index/page.tsx     C-02 KORA Index Detail
│   │   ├── shared/page.tsx         C-SV KORA Shared View
│   │   ├── activation/page.tsx     C-08 Activation & Participation
│   │   ├── contribution/page.tsx   KORA Contribution companion
│   │   ├── pillars/page.tsx        Pillar Analysis
│   │   ├── financial/page.tsx      BTI / Financial Governance
│   │   ├── reports/page.tsx        Decision Pack
│   │   ├── data/page.tsx           Data Room
│   │   ├── onboarding/page.tsx     Onboarding Room
│   │   ├── profile/page.tsx        Company Profile (HARDCODED S2)
│   │   ├── scoring/page.tsx        Boundary notice only (admin-only gate)
│   │   ├── ingestion/page.tsx      AI Ingestion Studio
│   │   ├── uef-review/page.tsx     UEF Review
│   │   └── workforce-baseline/     Workforce Baseline
│   ├── admin/                      Admin workspace (14 screens)
│   ├── my-kora/                    Worker workspace (6 screens)
│   ├── partner/page.tsx
│   ├── advisor/page.tsx
│   ├── demo-guide/page.tsx
│   └── future-vision/page.tsx      FV-01 (static mockup, labeled inactive)
├── components/
│   ├── brand/KoraLogo.tsx          Inline SVG, on-dark/on-light variants
│   ├── company/
│   │   ├── ExecutiveCockpitHero.tsx
│   │   ├── KoraIndexCommandCenter.tsx
│   │   ├── TrustGovernanceStrip.tsx
│   │   ├── ExecutiveIntelligenceBlock.tsx
│   │   └── PriorityActionPanel.tsx
│   ├── kora-index/                 10+ components (hero, breakdown, safeguard, etc.)
│   ├── charts/                     PillarChart, ComponentBreakdownChart
│   ├── layout/                     AppShell, Sidebar, Header
│   ├── privacy/PrivacyBoundaryNotice.tsx
│   └── reports/                    DecisionPackHero, BudgetImpactReport, etc.
├── services/ (15 mock services)
│   ├── scoring-simulator/          ScoringSimulatorService.ts
│   ├── activation-safeguard/
│   ├── explainability/
│   ├── budget-to-human-impact/
│   ├── financial-governance/
│   ├── kora-contribution/
│   ├── ingestion-simulator/
│   ├── report-generator/
│   └── ... (10 more)
├── data/
│   ├── synthetic/ (26 JSON seed files)
│   └── methodology/methodology-config.json
└── lib/
    ├── methodology-config/v0.1.ts  Canonical weight loader
    ├── demo-state/index.ts         React context: role, scenario, persona
    ├── types/                      TypeScript shapes (not Prisma)
    ├── constants/kora.ts
    └── permissions.ts
```

---

## 4. NUMBER HUNT

### 4a. Methodology Config — Weights

| Value | Location | Status |
|---|---|---|
| REACH=0.25 | `methodology-config.json` | ✅ |
| QUALITY=0.30 | `methodology-config.json` | ✅ |
| EQUITY=0.25 | `methodology-config.json` | ✅ |
| BTI=0.20 | `methodology-config.json` | ✅ |
| AR within REACH=0.50 | `methodology-config.json` | ✅ |
| MAR within REACH=0.50 | `methodology-config.json` | ✅ |
| NI/VR/CO within QUALITY=0.333/0.333/0.334 | `methodology-config.json` | ✅ |
| WB/PC/PB/EQ within EQUITY=0.25 each | `methodology-config.json` | ✅ |
| CS external=true, weight=0 | `methodology-config.json` | ✅ |
| Safeguard CLEAR: AR≥0.40 AND MAR≥0.30 | `methodology-config.json` | ✅ |
| Safeguard WARNING: 0.20≤AR<0.40 OR 0.15≤MAR<0.30 | `methodology-config.json` | ✅ |
| Safeguard FLAGGED: AR<0.20 OR MAR<0.15 | `methodology-config.json` | ✅ |

No hardcoded weights found in components or services (other than one comment in DecisionPackHero.tsx noting previous scaffold was 0.10×10).

### 4b. KORA Index Outputs — Canonical vs Stored

**Critical finding: KORA Index values are internally consistent with v3 macroblock weights but below doc 25 ranges. Doc 25 ranges are stale and must be updated.**

Verification:
- S1: REACH×0.25 + QUALITY×0.30 + EQUITY×0.25 + BTI×0.20 = 30×0.25 + 37×0.30 + 40×0.25 + 28×0.20 = 34.2 → rounds to **34** ✅ (internally consistent)
- S2: 45×0.25 + 54×0.30 + 60×0.25 + 58×0.20 = 54.05 → rounds to **54** ✅ (internally consistent)

| Value | doc 25 target | Stored | Status | Root cause |
|---|---|---|---|---|
| S1 KORA Index | 42–52 | **34** | ⚠️ BELOW RANGE | doc 25 range written before v3 macroblock weights; range needs update |
| S2 KORA Index | 60–68 | **54** | ⚠️ BELOW RANGE | Same root cause |
| S1 AR | 0.38 | 0.38 | ✅ |  |
| S1 MAR | 0.22 | 0.22 | ✅ |  |
| S1 EQ | 0.38 | 0.38 | ✅ |  |
| S1 CS | 0.55–0.65 | 0.60 | ✅ |  |
| S1 CO | ~0.38 | **0.28** | ⚠️ Below doc 25 | Needs reconciliation |
| S1 VR | ~0.55 | **0.41** | ⚠️ Below doc 25 | Needs reconciliation |
| S1 NI | — | 0.41 | — | No doc 25 target |
| S1 WB | — | 0.29 | — |  |
| S1 PC | — | 0.60 | — |  |
| S1 PB | — | 0.34 | — |  |
| S2 AR | 0.52 | 0.52 | ✅ |  |
| S2 MAR | 0.38 | 0.38 | ✅ |  |
| S2 CS | 0.72–0.82 | 0.72 | ✅ (lower bound) |  |
| S2 CO | ~0.62 | **0.44** | ⚠️ Below doc 25 | Needs reconciliation |
| S2 VR | ~0.72 | **0.61** | ⚠️ Below doc 25 | Needs reconciliation |
| S1 Safeguard | WARNING | WARNING | ✅ |  |
| S2 Safeguard | CLEAR | CLEAR | ✅ |  |

### 4c. KORA Index Macroblocks

| Macroblock | S1 stored | S2 stored |
|---|---|---|
| REACH | 30 | 45 |
| QUALITY | 37 | 54 |
| EQUITY | 40 | 60 |
| BTI | 28 | 58 |

All macroblock scores are consistent with the computed KORA Index values. The BTI S1→S2 jump from 28→58 is large but matches the BTI seed data improvement (deep_activation_share 0.52→0.70, cost_per_IU 22.4→13.8).

### 4d. BTI Numbers

| Value | doc 25 | Stored | Status |
|---|---|---|---|
| S1 total_people_welfare_budget | 185000 | 185000 | ✅ |
| S1 economic_relief | 54000 | 54000 | ✅ |
| S1 deep_activation | 58000 | 58000 | ✅ |
| S1 unused (activation_debt) | 45000 | 45000 | ✅ |
| S1 cost_per_IU | 22.4 | 22.4 | ✅ |
| S1 BTI macroblock score | 28 | 28 | ✅ |
| S1 budget_used_total | — | 112000 | No doc 25 target |
| S2 budget_allocated_total | — | 221000 | No doc 25 target |
| S2 economic_relief | 50000 | 50000 | ✅ |
| S2 deep_activation | 118000 | 118000 | ✅ |
| S2 unused | 35000 | 35000 | ✅ |
| S2 cost_per_IU | 13.8 | 13.8 | ✅ |
| S2 BTI macroblock score | 58 | 58 | ✅ |

Note: companies.json welfare_budget=280000 covers full fiscal year. BTI S1 (185000) covers Q1-Q3 only; S2 (221000) covers Q1-Q4. No discrepancy — different periods.

### 4e. Company / Workforce Numbers

| Value | doc 25 | Stored | Status |
|---|---|---|---|
| Meridiana headcount | 250 | 250 | ✅ |
| Meridiana welfare_budget | 280000 | 280000 | ✅ |
| Nexo headcount | 180 | 180 | ✅ |
| Fortis headcount_in_scope | 250 | 250 | ✅ |
| S1 active_worker_count | ~95 (38% of 250) | 95 | ✅ |
| S1 meaningful_active_worker_count | ~55 (22% of 250) | 55 | ✅ |
| S2 active_worker_count | ~130 (52% of 250) | 130 | ✅ |
| S2 meaningful_active_worker_count | ~95 (38% of 250) | 95 | ✅ |

### 4f. Concentration Distribution Numbers

| Value | doc 25 | Stored/hardcoded | Status |
|---|---|---|---|
| S1: top 12% workers → 64% IU | ✅ doc 25 confirms | company-aggregates.json ✅ | ✅ |
| S2: top 18% workers → 51% IU | top 20% → 42% | **18% → 51%** | ⚠️ Inconsistent with doc 25 |
| activation/page.tsx: top 10% → 61% IU | — | **Hardcoded** | ❌ Contradicts S1 seed (top 12%→64%) and is scenario-blind |
| activation/page.tsx: bottom 50% → 12% IU | — | **Hardcoded** | ❌ Scenario-blind |
| activation/page.tsx: estimated_debt_eur=84000 | — | **Hardcoded** | ❌ Unexplained; contradicts BTI seed (S1 activation_debt=45000, S2=35000) |

### 4g. Anomalous Value Search Results

| Value | Found where | Verdict |
|---|---|---|
| 84000 (84_000) | `app/company/activation/page.tsx:33` | ❌ Hardcoded, unexplained, contradicts seed |
| 3832 | `data/synthetic/source-batches.json` row_count | ✅ Valid — batch row count |
| 560 | Not found in app/components/services | — Not present |
| 8.56 | Not found | — Not present |
| 210 | activation/page.tsx SITE_ACTIVATION | ❌ Part of hardcoded array with total=567≠250 |
| 180 | activation/page.tsx SITE_ACTIVATION | ❌ Same |
| 75 | activation/page.tsx SITE_ACTIVATION | ❌ Same |
| 82 | workforce-baseline.json (Senior group size) | ✅ Valid |
| 76 | financial-governance.json (LIFE utilization 0.76) | ✅ Valid |
| 62 | financial-governance.json (GROWTH utilization 0.61; also 62% in explainability gap note) | ✅ Valid in context |
| 61 | financial-governance.json budget_utilization_rate=0.61 | ✅ Valid |
| 57.4 / 62.8 | Not found | — Not present |

---

## 5. SCENARIO STATE

**Storage:** `lib/demo-state/index.ts` — React Context (`DemoStateProvider`).
Initial state: `activeScenario = 'S1'`. Exposes `useScenario()` → `{activeScenario, setScenario}`.

**Pages that bind to `activeScenario` (scenario-reactive):**

| Route | Binding | Notes |
|---|---|---|
| `/company` | `useScenario()` | Full reactive |
| `/company/kora-index` | `useDemoState()` | Full reactive — also loads both S1+S2 for comparison strip |
| `/company/shared` | `useDemoState()` | Full reactive |
| `/company/activation` | `useScenario()` | ⚠️ Partial — aggregate data is reactive but SITE_ACTIVATION, PILLAR_DEBT, DEBT_CONCENTRATION, NEXT_ACTIONS, PARTNER_SUGGESTIONS are hardcoded constants |
| `/company/contribution` | `useScenario()` | Full reactive |
| `/company/pillars` | `useScenario()` | Full reactive |
| `/company/financial` | `useScenario()` | Full reactive |
| `/company/reports` | `useDemoState()` | Full reactive |
| `/company/onboarding` | `useScenario()` | Full reactive |
| `/company/data` | `useScenario()` | Full reactive |

**Pages that do NOT bind to scenario:**

| Route | How | Impact |
|---|---|---|
| `/company/profile` | **`const SCENARIO = 'S2'`** hardcoded | Always shows S2 data regardless of switcher |
| `/company/scoring` | Boundary notice only; no data rendered | No impact |
| `/company/ingestion` | Ingestion is scenario-independent (pipeline stage) | No impact |
| `/company/uef-review` | UEF review is scenario-independent | No impact |
| `/company/workforce-baseline` | Workforce baseline is scenario-independent | No impact |
| `/future-vision` | Static mockup | No impact |
| `/demo-guide` | Static content | No impact |

---

## 6. PAGE-BY-PAGE MAPPING

### `/` (root) and `/demo-guide`
- **Component:** `DemoGuideContent`
- **Data source:** Static content
- **Scenario-reactive:** No
- **Status:** ✅ Clean — session entry point, no data dependency

### `/company` — C-01 Executive Cockpit
- **Services:** `scoringSimulatorService`, `explainabilityService`, `accountProvisioningService`, `tenantService`, `budgetToHumanImpactService`, `workerProvisioningService`
- **Scenario-reactive:** Yes
- **Non-suppressible labels:** CS, calibration_status, methodology_version_id, safeguard shown in `KoraIndexCommandCenter` and `TrustGovernanceStrip`
- **Status:** ✅ Clean after rebuild

### `/company/kora-index` — C-02 KORA Index Detail
- **Services:** `scoringSimulatorService` (both scenarios), `explainabilityService`, `budgetToHumanImpactService`, `ingestionSimulatorService`, `accountProvisioningService`, `tenantService`
- **Scenario-reactive:** Yes; also always loads both S1+S2 for comparison panels
- **Notable:** Loads all 10 components via `ComponentBreakdown`; shows macroblock cards with S1→S2 delta; EligibilityGatePanel, EconomicReliefPanel, BlockedByDesignPanel, BudgetToHumanImpactPanel all present
- **Status:** ✅ Most complete screen in the demo

### `/company/shared` — C-SV KORA Shared View
- **Services:** `scoringSimulatorService`, `budgetToHumanImpactService`, `companyDataIntakeService`, `reportGeneratorService`, `accountProvisioningService`, `tenantService`
- **Scenario-reactive:** Yes
- **Privacy:** Extensive privacy boundary section; no individual data; explicit PIB suppression notice
- **Status:** ✅ Clean

### `/company/activation` — C-08 Activation & Participation
- **Services:** `scoringSimulatorService.getCompanyAggregate()`, `activationSafeguardService`
- **Scenario-reactive:** Partially — aggregate data reactive; 5 constant arrays are hardcoded and scenario-blind
- **Critical issues:**
  - `SITE_ACTIVATION` array: [Sede Bergamo=210, Sede Milano=95, Produzione=180, Staff centrale=75, Reparto=7] → total **567** ≠ Meridiana's 250 workers
  - `estimated_debt_eur: 84_000` — contradicts BTI seed (S1 activation_debt_eur=45000)
  - `PILLAR_DEBT` coverage rates hardcoded — not from services, not scenario-reactive
  - `NEXT_ACTIONS` and `PARTNER_SUGGESTIONS` hardcoded — not from `ExplainabilityService`
- **Status:** ❌ Data integrity issue in hardcoded constants

### `/company/contribution`
- **Services:** `koraContributionService`, `accountProvisioningService`, `tenantService`
- **Scenario-reactive:** Yes
- **KORA Contribution display:** Companion indicator shown separately from KORA Index ✅
- **Status:** ✅ Clean

### `/company/pillars`
- **Services:** `scoringSimulatorService`, `demoDataService`, `koraContributionService`, `accountProvisioningService`, `tenantService`
- **Scenario-reactive:** Yes
- **Status:** ✅ Clean

### `/company/financial`
- **Services:** `financialGovernanceService`, `budgetToHumanImpactService`, `accountProvisioningService`, `tenantService`
- **Scenario-reactive:** Yes
- **Gate 5 compliance:** File and service both note "informational only — no tax advice" ✅
- **Status:** ✅ Clean

### `/company/reports` — Decision Pack
- **Services:** `reportGeneratorService`, `reportFactoryService`, `scoringSimulatorService`, `accountProvisioningService`, `tenantService`
- **Scenario-reactive:** Yes
- **Sections:** 13-section Decision Pack nav (Executive → KORA Index → BTI → Methodology, etc.)
- **Status:** ✅ Clean

### `/company/data` — Data Room
- **Services:** `ingestionSimulatorService`, `accountProvisioningService`, `tenantService`
- **Scenario-reactive:** Yes
- **Status:** ✅ Clean

### `/company/onboarding`
- **Services:** `companyOnboardingService`, `companyDataIntakeService`, `workerProvisioningService`, `scoringSimulatorService`, `accountProvisioningService`, `tenantService`
- **Scenario-reactive:** Yes
- **Status:** ✅ Clean

### `/company/profile` — C-17 Company Profile
- **Services:** `companyOnboardingService`, `scoringSimulatorService`, `tenantService`, `accountProvisioningService`, `workerProvisioningService`
- **Scenario-reactive:** **NO** — `const SCENARIO = 'S2'` hardcoded at line 11
- **Impact:** Profile always shows S2 KORA Index output regardless of scenario switcher setting
- **Status:** ⚠️ Scenario binding defect

### `/company/scoring`
- **Type:** Boundary notice — redirects company roles to read-only outputs
- **Data:** None (static message)
- **Status:** ✅ Correct — company roles must not run scoring

### `/company/ingestion`
- **Services:** `ingestionPipelineService`
- **Scenario-reactive:** No (pipeline stage is scenario-independent)
- **Status:** ✅ Correct

### `/future-vision` — FV-01
- **Data:** None — purely static
- **Label:** "Not Active in Foundation Light" present ✅
- **Status:** ✅ Clean

---

## 7. ARCHITECTURAL COMPLIANCE CHECKS

### Gate-2 Compliance (no production artifacts)
- No SQL DDL: ✅
- No Prisma schema: ✅
- No Supabase client: ✅
- No NextAuth: ✅
- No gov.kip_records: ✅

### Privacy Architecture
- `workerProvisioningService.assertEmployerCannotViewIndividualPIB()` called in company/profile and company/onboarding: ✅
- No direct imports of `workers.json`, `pib-records.json`, `impact-units.json` in employer-facing pages: ✅
- `safe_aggregation_threshold = 10` enforced with `PrivacyBoundaryNotice` for suppressed groups: ✅
- Alba-Manufacturing in workforce-baseline shows 5 suppressed groups (N<10) with correct suppression flag: ✅

### KORA Contribution Separation
- `is_kora_index_component: false` in every seed record: ✅
- `KoraContributionService` never called by `ScoringSimulatorService`: ✅
- Contribution displayed as companion indicator on contribution page, not merged into KORA Index: ✅

### CS Display Rule (non-suppressible per doc 21b)
- `KoraIndexCommandCenter`: CS displayed with label "Indicatore esterno — non componente del KORA Index" ✅
- `TrustGovernanceStrip`: CS shown as first item in governance strip ✅
- `company/shared`: CS shown with "ESTERNO · peso = 0" badge ✅
- `kora-index/page.tsx`: CS in 10-component breakdown ✅

### Hardcoded Methodology Weights
- None found in components or app pages (search for 0.25/0.30/0.20 in weight/macroblock context found only a comment in DecisionPackHero.tsx noting deprecated old scaffold)
- All weight reads go through `lib/methodology-config/v0.1.ts` → `methodology-config.json`: ✅

---

## 8. ISSUE REGISTER

| ID | Severity | Location | Description | Action |
|---|---|---|---|---|
| I-01 | CRITICAL | `/` | `KORA_DOCTRINE.md` missing | Resolve with founder — does doc need to be created? |
| I-02 | HIGH | `app/company/activation/page.tsx` | `SITE_ACTIVATION` array sums to 567 workers (≠ 250). Sede Bergamo=210, Produzione=180 are plausible for a different company. | Replace with data from `workforce-baseline` or `departments-sites` seeds via service call |
| I-03 | HIGH | `app/company/activation/page.tsx:33` | `estimated_debt_eur: 84_000` contradicts BTI seed (S1=45000, S2=35000) | Pull from `budgetToHumanImpactService.getRecord().activation_debt_eur` |
| I-04 | MEDIUM | `app/company/profile/page.tsx:11` | `const SCENARIO = 'S2'` hardcoded — profile does not react to scenario switcher | Replace with `useScenario()` hook |
| I-05 | MEDIUM | `data/synthetic/company-aggregates.json` | S1 CO=0.28 (doc 25: ~0.38), VR=0.41 (doc 25: ~0.55); S2 CO=0.44 (doc 25: ~0.62), VR=0.61 (doc 25: ~0.72) | Reconcile doc 25 targets with seed data; update one or the other |
| I-06 | MEDIUM | doc 25 vs seed | S1 KORA Index 42-52 range vs stored 34. Root cause: doc 25 range was written before v3 macroblock weights. Stored value 34 is mathematically correct for v3 weights and current component scores. | Update doc 25 target range to reflect v3 weight structure (new S1 range: ~30–40, S2: ~50–60) |
| I-07 | MEDIUM | `app/company/activation/page.tsx` | `PILLAR_DEBT`, `DEBT_CONCENTRATION`, `NEXT_ACTIONS`, `PARTNER_SUGGESTIONS` are hardcoded and scenario-blind — they don't update when switching S1→S2 | Pull from `explainabilityService.getNextBestActions()` and compute from `scoringSimulatorService.getCompanyAggregate()` |
| I-08 | LOW | `data/synthetic/company-aggregates.json` | S2 concentration: top 18% → 51% IU vs doc 25: top 20% → 42% IU | Minor; reconcile during next data pass |
| I-09 | INFO | `data/synthetic/departments-sites.json` | Different dept taxonomy than `workforce-baseline.json` — departments-sites uses Operations/Sales/HR-People/Product-Engineering/Admin-Finance; workforce-baseline uses Technology/Operations/Finance/Sales/HR | Both are valid demo artifacts for different screens; document that two taxonomies coexist |

---

## 9. SUMMARY COUNTS

- **Seed files examined:** 15 of 26
- **Services reviewed:** `ScoringSimulatorService` (full), `ExplainabilityService` (import-level), plus 10 others at import level
- **Pages mapped:** 14 company routes + root + demo-guide + future-vision = **17 pages**
- **Canonical values confirmed:** 28
- **Canonical values mismatched:** 6 (I-05, I-06 cover all)
- **Hardcoded anomalies found:** 3 (I-02, I-03, I-07)
- **Gate-2 violations:** 0
- **Privacy violations:** 0
- **KORA Contribution merge violations:** 0
- **CS suppression violations:** 0
- **Future Vision labeling violations:** 0

---

*Generated 2026-05-25 · Read-only audit · No source files modified · synthetic_demo_data: true*

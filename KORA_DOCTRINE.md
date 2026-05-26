# KORA — Doctrine & Canonical Reference

> **Read this file before any change to the codebase.**
> Every sprint prompt assumes you have read this and will respect it.
> If a request seems to conflict with this doctrine, **stop and ask** before proceeding.

---

## 1. What KORA Is (and Is Not)

KORA is a **Human Impact Intelligence Platform**.

KORA measures **what happens after spend** — not the spend itself, not compliance, not individual workers.

### KORA IS:
- A Human Impact Intelligence Platform
- An Activation Orchestration Layer
- An Evidence & Trust Layer
- A Privacy-first, worker-owned layer
- A Board-ready decision system

### KORA IS NOT:
- A welfare platform
- An HR tool
- A wellbeing tracker
- A surveillance system for workers
- A marketplace of services
- An expense governance / fiscal compliance tool
- A social network
- A worker ranking / gamification system
- A payment processor / fund custodian

If a feature, label, or copy moves the product toward any of the "IS NOT" categories above, it is a doctrinal violation. Flag it.

---

## 2. Non-Negotiable Principles

These ten principles override any other consideration. Code, copy, and UX must respect all ten.

1. **KORA measures organizations, not individuals.** Output is always company-level aggregate.
2. **The Worker PIB (Personal Impact Balance) is private to the worker.** Never visible to employer. Never queryable by company-scoped roles.
3. **Companies only see anonymized aggregates above privacy threshold N ≥ 10 workers per segment.** Smaller segments are suppressed.
4. **The Confidence Score is EXTERNAL to the KORA Index.** Weight = 0. It signals data reliability, not impact. Never aggregate it with the KORA Index. Never display it as a "component" of the Index.
5. **The Activation Safeguard is an interpretive gate, NOT a scoring component.** It can be CLEAR / WARNING / FLAGGED, but does not enter the KORA Index calculation.
6. **Mandatory compliance is BLOCKED by design.** D.Lgs 81/08 safety training, DVR/DUVRI, DPI, sorveglianza sanitaria, GDPR mandatory, 231, patentini obbligatori = 0 IU, 0 KORA Index contribution, 0 PIB, 0 KORA Contribution. Not penalized — excluded by design.
7. **Cash-like / economic relief benefits are LIMITED.** Buoni pasto, fuel cards, gift cards, generic fringe benefits, generalist vouchers = tracked in BTI engine as `economic_relief_spend`, but generate 0 IU.
8. **Eligible programs are voluntary, additional, and verifiable.** Childcare, caregiving, mental health, extra prevention, upskilling, mentoring, inclusion, volunteering, territory, future/pension.
9. **Raw budget does NOT directly feed the KORA Index.** The BTI Score (a methodological output from the BudgetToHumanImpactEngine) contributes as one of four macroblocks (20% weight). Budget is signal, not score.
10. **No worker gamification.** No XP, levels, badges, leaderboards, "ore donate", individual CO2 metrics, individual rankings. Worker-side experience = PIB (private), Dynamic Impact CV (worker-owned), Consent Vault.

---

## 3. Domain Model (Canonical Entities)

### Tenant types
```text
tenant.type        = "demo" | "real"
tenant.dataMode    = "synthetic_seed" | "uploaded_data" | "integration"
tenant.scoringMode = "seeded_demo" | "computed" | "insufficient_data"
```

**Rules:**
- A `demo` tenant uses synthetic seed. OK.
- A `real` tenant MUST NEVER use synthetic seed values to fill missing data.
- If a `real` tenant has no data → `scoringMode = "insufficient_data"` → show "Data required", not fake numbers.

### Pillars (5)
- **LIFE** — health, wellbeing, prevention, psychological support, nutrition, physical activity
- **GROWTH** — training, skills, professional development, certifications, digital upskilling
- **CONNECTION** — mentoring, peer support, collaboration, internal communities, team cohesion
- **IMPACT** — volunteering, social projects, environmental initiatives, territorial contribution
- **LEGACY** — knowledge transfer, senior-junior mentoring, cultural continuity, pension/future

### KORA Index — 4 Macroblocks
| Macroblock | Weight | Components |
|---|---|---|
| Activation Reach | 25% | AR, MAR |
| Activation Quality | 30% | NI, VR, CO |
| Distribution & Equity | 25% | WB, PC, PB, EQ |
| Budget-to-Human-Impact (BTI) | 20% | BudgetToHumanImpactEngine output |

**Confidence Score (CS)** = external indicator, weight 0, never aggregated into Index.

### Eligibility Gate — 3 buckets
| Status | Generates IU | KORA Index | PIB | KORA Contribution |
|---|---|---|---|---|
| **Eligible** | yes | yes | yes | yes |
| **Limited** | no — tracked in BTI as `economic_relief_spend` | no | no | no |
| **Blocked** | no — by design | no | no | no |

### Activation Safeguard — gate
- `CLEAR` = AR ≥ 40% AND MAR ≥ 30%
- `WARNING` = at least one of AR, MAR below CLEAR threshold (but above FLAGGED)
- `FLAGGED` = severe under-activation (define conservatively: AR < 20% OR MAR < 10%)

---

## 4. Budget Evidence & Economic Confidence

### Core principle

> **"Il budget non è un dato valido se non ha una fonte. In assenza di evidenza economica, KORA può classificare l'iniziativa e leggerne i segnali di attivazione, ma la componente economica entra nel Budget-to-Human-Impact solo come dato dichiarato o stimato, con confidence esplicita."**

Operational equivalent: **"Budget is not a valid economic claim unless it has a source."**

Budget allocated ≠ budget activated. Budget spent ≠ human impact. These are not optional disclaimers — they are the operating logic of the BTI Engine.

---

### Every economic value used by KORA must carry

Every record that enters the BTI Engine must carry all of the following fields. If any is absent, the record may still be classified and analyzed for activation signals, but its economic contribution must be reduced, excluded, or marked low-confidence.

| Field | Meaning |
|---|---|
| `amount` | Numeric amount in EUR (or null if not available) |
| `source` | Document reference, file name, or system name |
| `evidenceLevel` | L0–L4 tier (see below) |
| `evidenceType` | Category of the source document |
| `status` | `documented` / `declared` / `estimated` / `not_available` / `not_applicable` |
| `confidence` | 0–1 numeric confidence assigned by the evidence tier |
| `btiTreatment` | How this record enters the BTI Engine |
| `estimationMethod` | Required if status = `estimated` — must name the method |
| `notes` | Any limitations or context the Decision Pack must disclose |

TypeScript contract: `BudgetEvidence` in `lib/kora-engine/types.ts`.

---

### Evidence levels (L0 → L4)

| Level | Code | Description | Typical BTI treatment |
|---|---|---|---|
| 0 | `L0_NO_EVIDENCE` | No evidence available. Economic value cannot be treated as reliable. | `excluded_from_bti` |
| 1 | `L1_SELF_DECLARED` | Company-declared value, HR estimate, self-declared spreadsheet. No supporting document. | `tracked_only` or low-confidence `confidence_weighted` |
| 2 | `L2_INTERNAL_DOCUMENT` | Internal budget report, accounting export, payroll aggregate, internal cost center extract. | `confidence_weighted` (medium/high) |
| 3 | `L3_THIRD_PARTY_DOCUMENT` | Invoice, contract, purchase order, welfare provider export, LMS export. Issued by an external party. | `confidence_weighted` or `full_weight` |
| 4 | `L4_VERIFIED_EVIDENCE` | Advisor-reviewed or KORA-reviewed evidence with audit trail. Highest confidence. | `full_weight` |

**L0 and L1 records never receive full BTI weight.** They contribute to the Evidence Debt / Trust Ledger and lower the Confidence Score.

---

### Budget status

| Status | Meaning |
|---|---|
| `documented` | Amount is supported by an external or internal document. Tier L2–L4. |
| `declared` | Amount supplied by the company without strong documentation. Tier L1. Usable with explicit confidence penalty. |
| `estimated` | Amount estimated by KORA using a named method (e.g. sector benchmark, headcount formula). `estimationMethod` field is mandatory. |
| `not_available` | No usable economic value exists. The record cannot contribute to BTI. Activation signals may still be analyzed. |
| `not_applicable` | Policy or non-monetary record where no direct budget should be invented (e.g. smart working policy, right to disconnect). Budget is structurally absent, not merely missing. |

---

### BTI treatment

| Treatment | When applied |
|---|---|
| `full_weight` | Documented Eligible spend (L3–L4) — enters BTI at full methodological weight. |
| `confidence_weighted` | Declared or estimated Eligible spend — enters BTI with explicit confidence multiplier. |
| `tracked_only` | Limited economic relief (buoni pasto, vouchers, fringe) — tracked as `economic_relief_spend` in BTI Engine. Generates 0 IU. |
| `excluded_from_bti` | L0 evidence, Blocked compliance, or records where evidence is too weak for any economic contribution. |
| `not_applicable` | Policy records or non-monetary activations. Budget is absent by nature, not by gap. Do not invent a value. |

---

### Missing budget evidence rule

If budget evidence is missing or weak:

1. The record **can still be classified** by the Eligibility Gate (Eligible / Limited / Blocked).
2. **Pillar mapping can still occur** — the record contributes to pillar signals even without a budget value.
3. **Activation signals can still be analyzed** — program presence, participation, and engagement are not dependent on budget documentation.
4. The **economic BTI contribution must be reduced, excluded, or marked low-confidence** — never filled in with synthetic or assumed values.
5. The **Decision Pack must disclose** the limitation: how much of the BTI input is documented vs. declared vs. estimated vs. non-valued.

---

### Policy records

Structural organizational policies (smart working, right to disconnect, no-meeting zones, unlimited leave, flexible working, solidarity leave, hybrid work) must **not invent economic values**.

These records may be:
- **classified** by Eligibility Gate (most are Eligible if voluntary and formalized beyond legal minimum);
- **mapped to pillars** (typically LIFE, CONNECTION, LEGACY);
- **analyzed as activation / policy signals** (coverage, accessibility, equity of access);
- **included in Future Readiness, Mental Capital Infrastructure, or Care Economy previews** when appropriate;

but their `budgetStatus` must be `not_applicable` (if there is no direct spend) or `estimated` only with an explicit `estimationMethod`. The BTI treatment for policy records is `not_applicable`.

Do not convert a "smart working" policy into a fictional EUR amount to fill the BTI calculation.

---

### Decision Pack requirement

Every Decision Pack output that includes a BTI section must distinguish:

- **Documented budget** — supported by L2–L4 evidence;
- **Declared budget** — L1, company-stated, without external verification;
- **Estimated budget** — explicit estimation method, no external source;
- **Non-valued / not applicable** — structurally absent or non-monetary.

Budget Evidence Quality must affect the **Confidence Score**. However, the Confidence Score remains **external to the KORA Index** (weight = 0). It signals data reliability — it does not alter the KORA Index value.

---

### Guardrail

**Raw budget must never directly feed the KORA Index.**

Only the methodological output of the `BudgetToHumanImpactEngine` may contribute to the KORA Index — as the BTI macroblock, at 20% weight, read from `lib/methodology-config/v0.1.ts`. No component or service may take a raw budget amount and add it to the Index computation directly.

---

### Cross-reference

The TypeScript contract for this doctrine is in:
- `lib/kora-engine/types.ts` — `BudgetEvidence`, `BudgetEvidenceLevel`, `BudgetStatus`, `BudgetEvidenceType`, `BTITreatment`, `BTIResult`

---

## 5. Canonical Scenarios — Single Source of Truth

**All numbers below are AUTHORITATIVE. If you see different numbers elsewhere in the code, the code is wrong, not these numbers.**

### Meridiana Group S.r.l. — primary demo tenant
- Sector: manufacturing / industrial
- Workers: 250
- Period: Q1–Q3 2025

#### Workforce breakdown (MUST sum to 250)

**By department** (5 departments, sum = 100% / 250 workers):
| Department | % | Workers | AR |
|---|---|---|---|
| Operations | 36% | 90 | 11% |
| Product & Engineering | 24% | 60 | 62% |
| Sales | 16% | 40 | 38% |
| Admin & Finance | 16% | 40 | 30% |
| HR & People | 8% | 20 | 88% |

**By site** (4 sites, sum = 100% / 250 workers):
| Site | % | Workers |
|---|---|---|
| Sede Milano (HQ) | 40% | 100 |
| Plant Bergamo (Operations) | 36% | 90 |
| Sede Torino | 14% | 35 |
| Remoto / distribuito | 10% | 25 |

**Important:** Department "Operations" and Site "Plant Bergamo" largely coincide (both ~90 workers, both with low AR). They are NOT the same dimension but they describe the same operational reality. Disambiguate in copy when needed.

#### Scenario S1 — Baseline (default scenario)
```yaml
kora_index: 34          # /100
confidence_score: 60    # %, EXTERNAL, weight 0
activation_safeguard: WARNING

# Components (analytical, fed into macroblocks):
AR:  38  # Activation Rate
MAR: 22  # Meaningful Activation Rate
NI:  41  # Normalized Intensity
VR:  41  # Verification Rate
CO:  28  # Continuity
WB:  29  # Worker Balance
PC:  60  # Pillar Coverage
PB:  34  # Pillar Balance
EQ:  38  # Equity

# Macroblocks (computed):
reach:   30  # Activation Reach
quality: 37  # Activation Quality
equity:  40  # Distribution & Equity
bti:     28  # Budget-to-Human-Impact

# Worker concentration:
top_12_pct_generates: 64  # %, of IU
bottom_50_pct_generates: 12  # %, of IU

# Pillar share (sum = 100%):
LIFE:       44
GROWTH:     27
CONNECTION: 12
IMPACT:     11
LEGACY:     6

# Budget:
budget_total:           185000  # EUR
budget_used:            112000
deep_activation_spend:   58000  # 52% of used
economic_relief_spend:   54000  # 48% of used
activation_debt:         45000  # unconverted budget
cost_per_iu:             22.4   # EUR

# Eligibility Gate counts:
eligible_records: 1276
limited_records:  3820
blocked_records:   318
```

#### Scenario S2 — Improved (labeled explicitly)
```yaml
kora_index: 54          # /100
confidence_score: 72    # %
activation_safeguard: CLEAR

AR:  52
MAR: 38
NI:  57

# Macroblocks:
reach:   45
quality: 54
equity:  60
bti:     58

# Budget:
budget_total:           221000  # EUR
deep_activation_spend:  118000  # 70%
economic_relief_spend:   50000  # 30%
activation_debt:         35000
cost_per_iu:             13.8
```

#### Activation Debt — disambiguation
There is ONE Activation Debt only: **€45.000 in S1, €35.000 in S2**, defined as "unconverted budget" (budget welfare non speso o speso in economic relief che non genera IU).

The previously-existing value **€84.000** ("valore attivazione persa") on the Activation Debt page is **wrong / deprecated — do not use it**. If found in code, remove and replace with €45.000.

---

## 6. Forbidden Patterns

The following appear in current code (Vercel demo) or in agency drafts (kora.nxtcloud.it). They are doctrinal violations. **Never reintroduce. If found, remove.**

- ❌ Tagline "Governance della Spesa Aziendale" or any variant
- ❌ Worker gamification: XP, levels ("Impact Maker"), badges, "ore donate" by name, individual CO2 saved
- ❌ Partner views with worker names (Silvia Russo, Giovanni Ferrari, ecc.)
- ❌ "Compliance garantita" or similar guarantees
- ❌ "Crediti" assigned per beneficiary per fiscal perimeter (welfare-platform pattern)
- ❌ "Perimetri fiscali" as a primary user concept (it's metadata, not product)
- ❌ Confidence Score displayed as a component of the KORA Index
- ❌ Worker-level data exposed to company-scoped views

---

## 7. Code Conventions

- **All canonical numbers come from a single source file**: `lib/demo/demo-tenants.ts` (or equivalent — verify in audit).
- **No hardcoded numbers in components.** Every `34`, `54`, `38%`, `€45.000` must be read from the seed.
- **Engine logic, when implemented, lives in `lib/kora-engine/`** as pure TypeScript functions with `calculationTrace` output. No black boxes.
- **Italian primary**, English only for technical labels (`methodology_version_id`, `calibration_status`, `production_ready`, `scoringMode`).
- **Methodology version** currently in use: `KORA-METHOD-v0.1.0`, `calibration_status: pre_empirical_calibration`, `production_ready: false`. Every computed output must carry these tags.

---

## 8. Voice & Tone

- Sober, infrastructural, executive. Not "feel-good HR".
- Disclaimers: ONE methodology box at page footer, max 3 bullets. Never repeat the same disclaimer in multiple sections of the same page.
- "Correlazione ≠ causalità" applies but is stated once per page, not five times.
- Avoid superlatives. KORA does not "transform" or "revolutionize". KORA "measures", "signals", "supports decisions".

---

## 9. When in Doubt

If a request seems to:
- Violate one of the 10 principles
- Contradict canonical scenario numbers
- Move the product toward "IS NOT" categories
- Require inventing numbers for a `real` tenant

→ **Stop. Do not proceed silently. Surface the conflict and wait for clarification.**

---

*This file is the contract between human intent and AI execution.*
*Last update: Sprint 4 — §4 Budget Evidence & Economic Confidence added.*

# KORA Contribution — Methodology Document
**Version:** v0.2 (pre-empirical calibration) — Version B active  
**Previous:** v0.1 (Version A — legacy FL fallback only)  
**Status:** Foundation Light — synthetic data only  
**Date:** 2026-06-23 (updated 2026-06-23)  
**Gate status:** Gate 3 OPEN — production live signals blocked

> **Version A (v0.1) is no longer the primary public model.**  
> Version B (v0.2) is now the active methodology direction.  
> Public output is maturity band + confidence + component signals — no single 0–100 score.

---

## 1. Definition

**KORA Contribution** is a companion indicator that measures an organization's verified collective and ecosystem contribution — the extent to which the organization acts as an active participant in a broader human-impact ecosystem, beyond its internal activation.

It measures:
- Initiatives created, promoted, or supported by the organization
- Cross-company bookings and participation (KORA Space)
- External participant events (community/territory activation)
- Partner and territory activation
- Continuity and scalability of collective initiatives
- Ecosystem breadth (number of distinct contribution families and partners)

---

## 2. What KORA Contribution Is NOT

| KORA Contribution IS… | KORA Contribution is NOT… |
|---|---|
| A company-level ecosystem engagement indicator | A KORA Index component |
| An aggregate companion indicator | A personal or individual score |
| Displayed separately from KORA Index | Merged into the KORA Index computation |
| Privacy-safe aggregate signals only | A worker ranking or performance metric |
| Pre-empirical calibration (v0.1) | An ESG certification or regulatory output |
| Factual, tone-neutral narrative | A gamification or reward mechanism |

**Constitutional rule:** KORA Contribution must NEVER be added to the KORA Index computation or displayed as an 11th component. This is a red line (CLAUDE.md §17.7).

---

## 3. Relationship with KORA Space

**KORA Space** (implemented as `commons.post`) is the primary operational source of cross-company contribution signals. KORA Space is where organizations create and promote cross-company initiatives.

When a worker attends a KORA Space initiative:
1. `commons.booking` records the attendance (worker-private)
2. `attributeContributionForBooking()` writes 2 rows to `commons.contribution_event`:
   - `role='promoter'` (the initiative host organization — impact_weight: 1.00)
   - `role='origin_employer'` (the attending worker's organization — impact_weight: 0.50)
3. Both rows are aggregate-safe — no worker identity is exposed to company roles

KORA Space events are contribution-eligible **only as aggregate signals** — never individual.

---

## 4. Relationship with KORA Index

KORA Contribution and KORA Index are **completely separate computations**:

| Dimension | KORA Index | KORA Contribution |
|---|---|---|
| What it measures | Internal organizational activation (10 components) | Ecosystem and collective engagement |
| Formula | 4-macroblock weighted (REACH 25%, QUALITY 30%, EQUITY 25%, BTI 20%) | 5-component provisional score (sum = 100) |
| Output | 0–100 score + Confidence Score + Safeguard | Companion indicator (no Pilot+ single score) |
| Components | AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB, BTI | Separate — see §6 |
| Display | Primary indicator | Shown separately, labeled "Indicatore Companion" |
| Feeds the other? | No | No |

**Critical invariant:** `CONTRIBUTION_ALTERS_KORA_INDEX = false`. No contribution event alters any KORA Index macroblock or component value.

---

## 5. Contribution Signal Sources

| Signal | Source | How it enters |
|---|---|---|
| Cross-company booking attended | `commons.booking` → `markAttended()` | `attributeContributionForBooking()` |
| External participant event | `commons.post` external_participants_count | `attributeContributionForExternalParticipants()` |
| Partner-led initiative | `commons.post` with partner link | Eligible via `partner_service` event_nature |
| Territorial volunteering | UEF with `territorial_impact` action_family | `isContributionEligibleEvent()` → pipeline |
| Collective mentoring | UEF with `future_and_legacy` action_family | `isContributionEligibleEvent()` → pipeline |
| Collective community event | UEF with `inclusion_and_connection` family | `isContributionEligibleEvent()` → pipeline |
| Aggregated feedback / recurring requests | Future signal — not in Foundation Light | — |

---

## 6. Formula / Config Status

### Version B (v0.2) — Active public model

Public presentation: **maturity band + confidence + 5-component breakdown**. No single 0–100 score as primary output.

Computed by `computeContributionV2()` in `KoraContributionService.ts`. All weights/thresholds read from `data/methodology/methodology-config.json → kora_contribution_v2` via `getContributionConfigV2()` — never hardcoded.

| Component | Calculation | Weight |
|---|---|---|
| Activation Depth | `1 - exp(-totalIU / IU_reference)` — concave, rewards intensity not count | 30 |
| Evidence Quality | Shrinkage-adjusted: `(verified + k·prior) / (N + k)` — avoids small-N extremes | 25 |
| Ecosystem Contribution | `ecosystem_events / N` — fraction with cross-company/partner/territorial signal | 20 |
| Adoption & Reach | `1 - exp(-N / event_reference)` — concave saturation on event count | 15 |
| Strategic Breadth | `(family_diversity + pillar_diversity) / 2` — diversity, not token presence | 10 |
| **Total** | | **100** |

**Maturity bands (from internal score):** Systemic (≥75), Active (≥50), Emerging (≥20), Nascent (<20)

**Insufficient signal:** shown if N events < 2 OR confidence < 0.20 — maturity band not shown.

**Confidence (separate, non-additive):**  
`confidence = nFactor × 0.50 + evidenceQuality × 0.30 + ecosystemSignal × 0.20`  
Confidence is displayed alongside the maturity band but does NOT enter the band computation.

**Signal sources eligible for V2:**  
Company initiatives, cross-company initiatives, partner/territory initiatives, KORA-originated initiatives (if adopted/supported), KORA-enabled initiatives (if adopted/supported), aggregate bookings, aggregate participation.

**KORA-originated/KORA-enabled initiatives:** eligible only if adopted/supported/activated by the organization — no automatic bonus for KORA-sourced initiatives.

### Version A (v0.1) — LEGACY / FL internal fallback only

Version A (`computeProvisionalScore()`) is retired from public presentation. The 5-component 0–100 score (`family_breadth/initiatives_norm/evidence_quality/territorial/ecosystem`) was replaced because it overweighted breadth and binary thresholds over real activation.

Version A is retained as internal FL fallback only. The `contributionScore` and `contributionLevel` fields remain in `ContributionSummary` for backward compatibility but are no longer the primary public output.

### Pilot+ live path — NO single score

The Pilot+ live dashboard does **not** expose a single aggregate score. It shows:
- `ContributionPromoterView`: aggregate initiatives promoted, participations received, pillar breakdown, narrative
- `ContributionOriginEmployerView`: aggregate participations sent, distinct initiatives, distinct promoters, pillar breakdown, narrative

This follows the no-single-score doctrine in `lib/commons/contribution-views.ts:5–6`.

---

## 7. Foundation Light vs Pilot+

| Feature | Foundation Light | Pilot+ |
|---|---|---|
| Data source | Synthetic seed (`kora-contribution-outputs.json`) | Live `commons.contribution_event` DB |
| Score displayed | Provisional 0–100, labeled demo-only | No single score (doctrine) |
| `production_ready` gate | `false` for all FL tenants | `true` required |
| DB path | Never triggered | `getContributionLive()`, `getContributionPromoterView()`, `getContributionOriginEmployerView()` |
| API `/contribution/live` | Returns 404 | Returns live aggregate views |
| `synthetic_demo_data` | `true` | `true` (pre-Gate 3) |

---

## 8. Privacy Boundary

**What companies (COMPANY_ADMIN / COMPANY_VIEWER) MAY see:**
- Aggregate contribution counts (total initiatives, participations)
- Pillar breakdown (IU distribution by pillar)
- Evidence distribution (verified/partial/self_declared counts)
- Narrative text (factual, no individual identification)
- Ecosystem partner count (no partner names unless public)

**What companies MUST NEVER see:**
- Individual worker participation in any initiative
- `worker_identity_id` or any linking between worker and booking
- `source_booking_id` in origin_employer view
- Personal "contribution scores" per worker
- "Mario participated more than Luca" comparisons of any kind
- Individual worker activity timelines from KORA Space

**Enforcement:**
- `commons.booking`: no COMPANY RLS policy → direct SELECT returns 0 rows
- `commons.booking_aggregate_for_promoter()` SECURITY DEFINER → only {status, count} pairs
- `getContributionOriginEmployerView()`: SELECT excludes `source_booking_id`, `worker_identity_id`
- Privacy threshold: group size < 10 → suppressed (safe_aggregation_threshold)

---

## 9. Eligibility Rules

An event/initiative is contribution-eligible if it satisfies at least one of:

1. **Action family match:** `action_family` in `['territorial_impact', 'inclusion_and_connection', 'future_and_legacy']`
2. **Event nature match:** `event_nature` in `['collective_initiative', 'territorial_initiative', 'partner_service']`

**Bare pillar match alone is NOT sufficient** (C-5 fix). An individual IMPACT training event must not become contribution-eligible solely because it maps to the IMPACT pillar.

**Specific exclusions:**
- `economic_relief` action_family → not eligible (cash-like benefit)
- `blocked_compliance` action_family → not eligible (mandatory/legal baseline)
- `professional_growth` action_family → not eligible (unless also has eligible event_nature)
- Individual-only events (no collective or partner signal) → not eligible

**`collective_upskilling` → partner-led only:** If a collective upskilling initiative has a partner (`partner_id` set), it receives `event_nature='partner_service'` and is eligible as ecosystem activation. Non-partner upskilling is not contribution-eligible.

---

## 10. Known Remaining Limitations

| ID | Limitation | Status |
|---|---|---|
| C-9 | `attributeContributionForBooking()` writes 2 rows sequentially — no transaction | Mitigated by idempotency; atomic fix in `supabase/proposed/026_contribution_atomic_attribution.sql` (pending Gate 3 + CTO review) |
| C-10 | Seed values and pipeline-computed values are not synchronized | Acceptable for demo; post-pilot seed path removed |
| C-6 | Naming collision: `ContributionRole` (pipeline enum) vs KORA Contribution | Documented disambiguation comment in `lib/live/contribution-lineage.ts`; rename recommended in future sprint |
| — | No aggregated feedback or recurring request signals in Foundation Light | Planned for Pilot+ signal expansion |
| — | Methodology weights (30/20/25/15/10) are pre-empirical — not validated | Delphi Study calibration post-pilot |

---

## 11. Production / Gate 3 Constraints

**Gate 3 is currently OPEN.**

Blocked until Gate 3 closes:
- Real worker accounts participating in cross-company initiatives
- Live `commons.contribution_event` writes from real bookings
- Production apply of migration 025 (`commons.booking` + `commons.contribution_event` tables)
- Production apply of proposed migration 026 (atomic attribution RPC)
- Live KORA Contribution dashboard showing real Pilot+ data
- Real partner and territory activation tracking

Not blocked by Gate 3 (available in Foundation Light):
- Foundation Light demo dashboard with synthetic seed data
- Pipeline-computed provisional score from demo inputs
- Schema definition and proposed migrations (for review)
- Doctrine, methodology config, eligibility logic
- Test coverage of all above

**Gate 3 applies to:** real worker identity records, real cross-company bookings, real HRIS integrations, production authentication. Do NOT close Gate 3 in code — it requires a formal legal/privacy review.

---

## 12. Files and Entry Points

| File | Purpose |
|---|---|
| `lib/kora-contribution/contribution-methodology.ts` | Doctrine constants — import for test assertions |
| `lib/kora-engine/contribution-family-detector.ts` | `isContributionEligibleEvent()` — eligibility logic |
| `lib/methodology-config/v0.1.ts` — `getContributionConfig()` | Weights and levels from config |
| `data/methodology/methodology-config.json` → `kora_contribution` | Single source of truth for weights |
| `services/kora-contribution/KoraContributionService.ts` | All contribution computation paths |
| `lib/commons/contribution-views.ts` | Pilot+ view types (no score field) |
| `lib/commons/contribution-narrative.ts` | Deterministic Italian narrative functions |
| `lib/commons/cross-company-attribution.ts` | PIB + Contribution attribution hooks |
| `lib/live/contribution-lineage.ts` | Pipeline role classifier (see naming note) |
| `supabase/migrations/025_commons_booking_contribution.sql` | Schema for commons.booking + contribution_event (Gate 2 OPEN) |
| `supabase/proposed/026_contribution_atomic_attribution.sql` | Atomic attribution RPC (Gate 3 pending) |
| `data/synthetic/kora-contribution-outputs.json` | Seed data for Foundation Light demo |
| `data/synthetic/collective-initiatives.json` | Seed collective initiatives (aggregate only) |
| `tests/unit/kora-contribution-hardening.test.ts` | Doctrine + hardening tests (18 assertions) |
| `tests/unit/kora-contribution-pipeline.test.ts` | Pipeline + eligibility tests |
| `tests/unit/b166-bookings-contribution.test.ts` | Booking + attribution structural tests |
| `tests/unit/b167-contribution-dashboard.test.ts` | Dashboard + narrative tests |

---

*Document auto-generated from KORA Contribution Hardening Sprint (2026-06-23). Methodology v0.1 pre-empirical calibration.*

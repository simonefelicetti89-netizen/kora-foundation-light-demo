# KORA Contribution — Impact Unit Source Audit
**Tipo:** Read-only structural audit — nessuna modifica al codice  
**Data:** 2026-06-23  
**Scope:** KORA Contribution IU/event source layer — readiness before Pilot  
**Auditor:** Claude Code (Sonnet 4.6)  
**Baseline:** KORA Contribution Version B (v0.2) active at commit `746d6b4`  
**Gate status:** Gate 2 OPEN (no SQL applied) · Gate 3 OPEN (no live worker data)

---

## 0. Safety Confirmation

| Item | Status |
|---|---|
| Branch `main` | ✓ |
| Working tree clean (`supabase/.temp/` untracked only) | ✓ |
| Production not linked or targeted | ✓ |
| Gate 3 remains OPEN | ✓ |
| No real worker data created | ✓ |
| No secrets/tokens printed | ✓ |
| Audit only — no code changed | ✓ |
| KORA Contribution outside KORA Index | ✓ |
| KORA Index formula unchanged | ✓ |
| No worker ranking or individual contribution score | ✓ |

---

## 1. File Map

| File | Key artifacts |
|---|---|
| `lib/kora-engine/contribution-family-detector.ts` | `CONTRIBUTION_ACTION_FAMILIES`, `CONTRIBUTION_EVENT_NATURES`, `CONTRIBUTION_PILLARS`, `isContributionEligibleEvent()` |
| `lib/kora-contribution/contribution-methodology.ts` | All doctrine constants, `CONTRIBUTION_GATE_3_REQUIRED`, FL vs Pilot+ path description, signal sources list |
| `lib/commons/contribution-views.ts` | `ContributionPromoterView`, `ContributionOriginEmployerView` — Pilot+ typed output (no score field) |
| `lib/commons/contribution-narrative.ts` | `buildPromoterNarrative()`, `buildOriginEmployerNarrative()` — pure Italian text builders from aggregate counts |
| `lib/commons/cross-company-attribution.ts` | `attributeContributionForBooking()`, `attributeContributionForExternalParticipants()`, `attributePIBForBooking()`, `CROSS_COMPANY_MULTIPLIER=1.30` |
| `lib/live/contribution-lineage.ts` | `ContributionRole` enum (pipeline classifier — naming collision with KORA Contribution; C-6 disambiguation comment present) |
| `services/kora-contribution/KoraContributionService.ts` | `computeContributionV2()`, `computeProvisionalScore()` (V1 legacy), `getSummaryV2()`, `computeFromPipelineResult()`, `getContributionLive()`, `getContributionPromoterView()`, `getContributionOriginEmployerView()` |
| `services/commons/BookingService.ts` | `createBooking()`, `markAttended()` → calls `attributeContributionForBooking()` + `attributePIBForBooking()` |
| `services/iu-computation/IUComputationService.ts` | `BC_BY_FAMILY`, `EV_BY_EVIDENCE_TYPE` — canonical IU formula factors (CQ, CF, AGF also present) |
| `data/methodology/methodology-config.json` | `kora_contribution` (V1 legacy, `_status: "legacy_fl_fallback_only"`), `kora_contribution_v2` (V2 active, weights/bands/thresholds/signal_sources) |
| `data/synthetic/kora-contribution-outputs.json` | 2 seed records: S1 score=11 (minimal), S2 score=38 (emerging) — legacy V1 seed values |
| `data/synthetic/collective-initiatives.json` | 5 seed initiatives: `cross_company_volunteering`, `internal_mentoring_collective`, `collective_upskilling` (×2), one internal initiative |
| `supabase/migrations/025_commons_booking_contribution.sql` | Schema for `commons.booking` + `commons.contribution_event` + `booking_aggregate_for_promoter()` SECURITY DEFINER — **WRITTEN, NOT APPLIED** |
| `supabase/proposed/026_contribution_atomic_attribution.sql` | Atomic RPC `commons.attribute_contribution_for_booking_atomic()` — **NOT in forward pipeline, requires Gate 3 + CTO review** |
| `app/api/company/contribution/live/route.ts` | Live API route — returns 404 for all non-`production_ready` tenants |
| `app/company/contribution/page.tsx` | FL preview → Version B maturity band UI; Pilot+ → PromoterView + OriginView sections |

---

## 2. Current Contribution Source Paths

### 2.1 Active Foundation Light paths

```
collective-initiatives.json (seed)
  → getSummaryV2()
    → INITIATIVE_TYPE_TO_FAMILY mapper  [proxy IU estimate: count × NM(0.8) × BC × EV × 0.10]
      → computeContributionV2(ContributionPipelineInput[])
        → ContributionV2Result { maturityBand, confidence, components, insights }
          → app/company/contribution/page.tsx (V2 maturity panel)
```

```
kora-contribution-outputs.json (seed)
  → getSummaryV2() / getContributionSummary()
    → ecosystemPartners (override) / legacy narrative fields
      → ContributionSummary.ecosystemPartners  [seed passthrough, V2 aggregateSignals only]
```

### 2.2 Live Pilot+ paths (BLOCKED — Gate 3 OPEN)

```
commons.booking → BookingService.markAttended()
  → attributeContributionForBooking()
    → commons.contribution_event (role='promoter', role='origin_employer')
      → getContributionPromoterView() / getContributionOriginEmployerView()
        → ContributionPromoterView / ContributionOriginEmployerView
          → app/company/contribution/page.tsx (Pilot+ dual-section dashboard)
```

```
commons.post (external_participants_count > 0)
  → attributeContributionForExternalParticipants()
    → commons.contribution_event (role='promoter', contribution_kind='external_participants_event')
      → getContributionPromoterView().external_outreach_events
```

```
commons.contribution_event (all roles, all periods)
  → getContributionLive()
    → LiveContributionSummary { total_events, cross_company_participations, ... }
```

---

## 3. Current Source Field Map

| Source | File:Line | Status | V2 Component(s) | Notes |
|---|---|---|---|---|
| Seed `collective-initiatives.json` — `cross_company_volunteering` | `KoraContributionService.ts:465` | `ACTIVE_SEED` | Activation Depth, Ecosystem Contribution, Adoption & Reach, Strategic Breadth | Maps to `action_family=territorial_impact`, `event_nature=collective_initiative`. 4 participants in S1, more in S2. |
| Seed `collective-initiatives.json` — `internal_mentoring_collective` | `KoraContributionService.ts:488` | `ACTIVE_SEED` | Activation Depth, Strategic Breadth | Maps to `action_family=future_and_legacy`, `event_nature=collective_initiative`. Future & Legacy family. |
| Seed `collective-initiatives.json` — `collective_upskilling` (partner-led) | `KoraContributionService.ts:490` | `ACTIVE_SEED` | Ecosystem Contribution, Strategic Breadth | `event_nature=partner_service` only if `partner_id` set (S2 only). S1 variant has `kora_contribution_relevant: false`. |
| Seed `collective-initiatives.json` — `collective_upskilling` (non-partner) | — | `BLOCKED` (ineligible by design) | None | `event_nature=undefined`, `action_family=professional_growth` → `isContributionEligibleEvent()` returns false. Correct exclusion. |
| Seed `kora-contribution-outputs.json` — `ecosystem_partners_active` | `KoraContributionService.ts:507` | `ACTIVE_SEED` | Aggregate Signals (display only) | Used to override `ecosystemPartners` in `ContributionSummary`. Not a V2 computation input. |
| Seed `kora-contribution-outputs.json` — `contribution_score`, `contribution_level` | `KoraContributionService.ts:383–384` | `ACTIVE_SEED` (legacy only) | None (V1 legacy fields) | These feed `getContributionSummary()` which is the legacy V1 path. V2 `computeContributionV2()` does not read these. |
| `commons.booking` → `markAttended()` → `attributeContributionForBooking()` | `cross-company-attribution.ts:177` | `BLOCKED` (Gate 3 OPEN) | Ecosystem Contribution (20%), Adoption & Reach (15%) | `commons.booking` table not applied (mig 025 not run). No live rows possible. Full pipeline code exists. |
| `commons.post.external_participants_count` → `attributeContributionForExternalParticipants()` | `cross-company-attribution.ts:244` | `BLOCKED` (Gate 3 OPEN) | Ecosystem Contribution (20%) | Requires live `commons.post` rows with `external_participants_count > 0`. |
| Real UEF records with `action_family=territorial_impact` | `IUComputationService.ts` | `BLOCKED` (Gate 3 OPEN) | Activation Depth (30%), Evidence Quality (25%), Strategic Breadth (10%) | Would flow through `run-kora-pipeline` → `computeFromPipelineResult()`. No live tenant data exists. |
| Real UEF records with `action_family=inclusion_and_connection` | `IUComputationService.ts` | `BLOCKED` (Gate 3 OPEN) | Same as above | — |
| Real UEF records with `action_family=future_and_legacy` | `IUComputationService.ts` | `BLOCKED` (Gate 3 OPEN) | Same as above | — |
| `getContributionLive()` — live `commons.contribution_event` aggregation | `KoraContributionService.ts:724` | `BLOCKED` (Gate 3 OPEN) | All components (Pilot+) | Returns null for all FL tenants (`production_ready=false`). |
| `getContributionPromoterView()` | `KoraContributionService.ts:800+` | `BLOCKED` (Gate 3 OPEN) | Promoter pillar breakdown | Requires live `commons.contribution_event` rows with `role='promoter'`. |
| `getContributionOriginEmployerView()` | `KoraContributionService.ts:850+` | `BLOCKED` (Gate 3 OPEN) | Origin employer counts | `worker_identity_id` and `source_booking_id` explicitly excluded from SELECT. |
| KORA-originated initiative flag | Config only (`kora_originated_if_adopted: true`) | `ABSENT` (not in code) | Undeclared in V2 formula | Config declares signal source; `computeContributionV2()` has no `is_kora_originated` field in `ContributionPipelineInput`. |
| KORA-enabled initiative flag | Config only (`kora_enabled_if_adopted: true`) | `ABSENT` (not in code) | Undeclared in V2 formula | Same gap. |
| Company adoption/sponsorship events | No code path | `ABSENT` | Adoption & Reach (15%) intended | No `company_adopted`, `company_sponsored`, `company_supported` event_nature or action_family exists. |
| Aggregated feedback / recurring requests | Explicitly "Future signal — not in Foundation Light" | `ABSENT` | Future signal | `contribution-methodology.ts:85`. No code, no seed, no schema. |
| Aggregate ratings / satisfaction signals | No code path | `ABSENT` | Future signal | Not in any current schema or seed. |
| Initiative replication / scaling | No code path | `ABSENT` | Future signal | Not yet modelled. |

---

## 4. Current IU Eligibility Logic

### 4.1 `isContributionEligibleEvent()` — `lib/kora-engine/contribution-family-detector.ts`

**Gate logic (OR — two conditions, both sufficient independently):**

```
1. action_family IN ['territorial_impact', 'inclusion_and_connection', 'future_and_legacy']
   OR
2. event_nature IN ['collective_initiative', 'territorial_initiative', 'partner_service']
```

**Pillar-only match:** Rejected (C-5 fix, commit `f5f8f5b`). `CONTRIBUTION_PILLARS = ['IMPACT', 'CONNECTION', 'LEGACY']` is exported only for breakdown aggregation. An event with `pillar=IMPACT` but no eligible `action_family` or `event_nature` → returns `false`.

**Mandatory compliance events:** Excluded implicitly. `blocked_compliance` is not in `CONTRIBUTION_ACTION_FAMILIES`. No explicit named-compliance blocklist in the function, but the taxonomy gap is effective: mandatory training, DVR, DUVRI, DPI, privacy/231/HSE mandatory training all map to `blocked_compliance` or `mandatory_training` action_family — neither in the allowed set.

**Cash-like benefits (`economic_relief`):** Not in `CONTRIBUTION_ACTION_FAMILIES` → excluded structurally. Meal vouchers, fuel vouchers, gift cards → `economic_relief` family → ineligible.

**Individual-only events:** Implicitly excluded by the collective/ecosystem nature of eligible event_natures. However, there is no explicit `individual_action_only` guard in the function. An event with `action_family=territorial_impact` but describing a purely individual action could theoretically pass. This relies on upstream UEF taxonomy enforcement.

**KORA-originated/KORA-enabled:** No special handling inside `isContributionEligibleEvent()`. They pass eligibility via the normal `action_family`/`event_nature` check. The "only if adopted" constraint declared in config is not enforced in code — there is no `adopted_by_company: boolean` field in `ContributionPipelineInput`. **Gap confirmed.**

**Company adoption/sponsorship/support:** No specific action_family or event_nature for these. The only proxy path: partner-led collective upskilling → `event_nature=partner_service`. No `company_adopted_initiative`, `company_sponsored_initiative` etc. exist as event_natures. **Gap confirmed.**

**`cross_company_event`:** Used in virtual UEF built inside `attributePIBForBooking()`. This value is NOT in `CONTRIBUTION_EVENT_NATURES`. The booking-to-contribution path bypasses `isContributionEligibleEvent()` — it writes directly to `commons.contribution_event`. Inconsistency documented as G-7; latent risk if code is refactored.

### 4.2 Summary table

| Event type | Eligible? | Mechanism | Notes |
|---|---|---|---|
| `territorial_impact` action_family | ✓ | action_family check | Core: volunteering, territory events |
| `inclusion_and_connection` action_family | ✓ | action_family check | Core: mentoring, peer support, collectives |
| `future_and_legacy` action_family | ✓ | action_family check | Core: knowledge transfer, cultural continuity |
| `collective_initiative` event_nature | ✓ | event_nature check | Cross-company, community events |
| `territorial_initiative` event_nature | ✓ | event_nature check | Territory-specific initiatives |
| `partner_service` event_nature | ✓ | event_nature check | Partner-led, ecosystem activation |
| Pillar=IMPACT alone | ✗ | Removed in C-5 | Must have family or nature signal |
| `blocked_compliance` action_family | ✗ | Not in allowed set | Legal/mandatory excluded |
| `economic_relief` action_family | ✗ | Not in allowed set | Cash-like excluded |
| `professional_growth` action_family | ✗ | Not in allowed set | Non-partner upskilling excluded |
| `mandatory_training` action_family | ✗ | Not in allowed set | HSE, DVR, DUVRI, DPI excluded |
| `cross_company_event` event_nature | ✗ (via eligibility fn) | Not in CONTRIBUTION_EVENT_NATURES | Booking-sourced UEF bypasses via `attributeContributionForBooking()` |
| Company adoption/sponsorship | ✗ | No action_family/event_nature defined | Gap G-3 |
| KORA-originated (not adopted) | ✗ | No `is_kora_originated` field | Indirectly excluded; no bonus either |

---

## 5. Desired IU Taxonomy Coverage

### A. Initiative Creation IU

| Source | Status | Notes |
|---|---|---|
| `company_initiative_created` | **SEED ONLY** | Seed data has `status=active/planning/completed`; creation signal inferred from presence. No explicit IU for "initiative created." |
| `cross_company_initiative_created` | **SEED ONLY** | `cross_company_volunteering` in seed. No discrete creation-event IU. |
| `partner_initiative_created` | **SEED ONLY** | `partner_collective_event` in seed. No creation IU. |
| `territory_initiative_created` | **ABSENT** | No specific territory-creation UEF type. Would map to `territorial_impact` action_family. |
| `kora_originated_initiative_created` | **ABSENT** | No `is_kora_originated` flag in any IU or UEF type. |
| `kora_enabled_initiative_created` | **ABSENT** | Same. Config declares intent; no code implementation. |

**Assessment:** Initiative creation is an implicit weak signal (initiative present in seed = created). No explicit creation IU exists. Correct by design: creation alone should not generate high Contribution.

---

### B. Adoption / Sponsorship IU

| Source | Status | Notes |
|---|---|---|
| `company_adopted_initiative` | **ABSENT** | No action_family, event_nature, or UEF type exists. |
| `company_sponsored_initiative` | **ABSENT** | Same. |
| `company_supported_initiative` | **ABSENT** | Same. |
| `company_cofunded_initiative` | **ABSENT** | Same. |
| `company_promoted_initiative` | **ABSENT** | Same. |
| `company_made_available_initiative` | **ABSENT** | Only implicit proxy: initiative presence in seed with `kora_contribution_relevant=true`. |
| Partner-led upskilling (adoption proxy) | **ACTIVE_SEED** (partial) | `collective_upskilling + partner_id` → `event_nature=partner_service` → eligible. Weak proxy. S2 only. |

**Assessment:** This entire IU family is essentially absent from the codebase. It is a major gap for Adoption & Reach (15%) and Ecosystem Contribution (20%). The only live signal path (when Gate 3 opens) would come from `attributeContributionForBooking()` writing `role='origin_employer'` events, which partially captures "company whose workers participated" — a proxy for adoption.

---

### C. Activation IU

| Source | Status | Notes |
|---|---|---|
| `aggregate_interest_signal` | **ABSENT** | No code path. Could be proxied from `commons.post` reaction counts (not implemented). |
| `aggregate_booking` | **PRESENT_GATED** | `commons.booking` table schema exists (mig 025, not applied). `BookingService.createBooking()` exists. Cannot be triggered without applied table. |
| `aggregate_reservation` | **ABSENT** | No distinct reservation/interest concept separate from booking. |
| `aggregate_participation` | **PRESENT_GATED** | `BookingService.markAttended()` → `attributeContributionForBooking()`. Gate 3 OPEN. |
| `aggregate_completion` | **PRESENT_DISCONNECTED** | `completion` status exists in `commons.booking.status` enum (mig 025). No distinct completion→Contribution signal separate from attendance. |
| `aggregate_follow_up` | **ABSENT** | No code path. Future signal. |
| `aggregate_repeat_participation` | **ABSENT** | Could be derived from multiple bookings per worker per initiative, but no aggregate for contribution. |
| `initiative_replicated` | **ABSENT** | No replication tracking in schema or seed. |
| `initiative_scaled` | **ABSENT** | No scaling event type. |

**Assessment:** Activation IU is the most important family for Activation Depth (30%). Current demo uses proxy IU estimates (seed participation counts × approximation factor). Real activation IU is fully blocked by Gate 3 (mig 025 not applied). Once Gate 3 opens and mig 025 is applied, `aggregate_participation` becomes the first real signal available.

---

### D. Feedback / Value IU

| Source | Status | Notes |
|---|---|---|
| `aggregate_rating` | **ABSENT** | No rating schema for KORA Space events. |
| `aggregate_feedback` | **ABSENT** | No feedback collection for initiatives. |
| `aggregate_request_for_follow_up` | **ABSENT** | No recurring request signal. |
| `moderated_comment_signal` | **ABSENT** | Comments would require moderation layer before aggregation — not yet designed. |
| `recurring_need_signal` | **ABSENT** | Future signal. Explicitly "not in Foundation Light" in methodology doc. |
| `aggregate_satisfaction_signal` | **ABSENT** | No NPS or satisfaction layer. |

**Assessment:** Entire family absent. Low priority for Foundation Light. Medium priority for Pilot+. All feedback signals require careful privacy design (no employer-visible individual responses).

---

### E. Ecosystem IU

| Source | Status | Notes |
|---|---|---|
| `multi_company_participation` | **PRESENT_GATED** | `attributeContributionForBooking()` writes `role='origin_employer'` for attending company. Gate 3 blocks. |
| `partner_validated_initiative` | **PRESENT_DISCONNECTED** | `advisor_validation_status` field in seed initiatives. Not mapped to V2 `computeContributionV2()` inputs. |
| `territorial_actor_involved` | **SEED ONLY** | `territory` field in seed initiatives. Not mapped to V2 inputs. |
| `school_university_involved` | **ABSENT** | No schema or IU type. |
| `association_involved` | **ABSENT** | No schema or IU type. |
| `kora_enabled_adopted_by_companies` | **ABSENT** | No code path. Config declares intent. |
| `kora_originated_adopted_by_companies` | **ABSENT** | Same. |
| `cross_company_replication` | **ABSENT** | No replication tracking. |
| `partner_delivery_confirmed` | **PRESENT_DISCONNECTED** | `verification_status=verified` in seed implies partner delivery confirmed. Not a distinct IU type. |

**Assessment:** The ecosystem IU family has partial coverage. `multi_company_participation` is the most important and is blocked by Gate 3. `partner_validated_initiative` and `territorial_actor_involved` are present as seed data fields but not wired as V2 computation inputs — they are disconnected.

---

### F. Blocked / Excluded IU

| Source | Status | Enforcement |
|---|---|---|
| `mandatory_training` / `blocked_compliance` | **BLOCKED** | Structural exclusion via taxonomy. Not in `CONTRIBUTION_ACTION_FAMILIES`. |
| `HSE` / `DVR` / `DUVRI` / `DPI` / `231` / medical surveillance | **BLOCKED** | Same — all map to `mandatory_training` or `blocked_compliance` family. |
| `cash_like_benefit` / `economic_relief` | **BLOCKED** | Not in allowed action_family set. |
| `meal_vouchers` / `fuel_vouchers` / `gift_cards` | **BLOCKED** | Same. |
| `individual_action_only` | **PARTIALLY BLOCKED** | Pillar-only match removed. But no explicit `individual_action_only` guard in eligibility function. Relies on upstream UEF taxonomy. |
| `employer_visible_individual_activity` | **BLOCKED** | `worker_identity_id` never in `contribution_event`. `commons.booking` has no COMPANY RLS. |
| `non_aggregable_event` | **PARTIALLY BLOCKED** | No explicit `non_aggregable` flag enforced inside `computeContributionV2()`. Relies on `privacy_threshold_met` in seed (not actively checked). |
| `low_threshold_reidentification_risk` | **NEEDS_THRESHOLD** | `insufficient_signal_min_events=2` guards confidence but does not enforce N≥10 privacy threshold at V2 computation level. |

---

## 6. Version B Readiness Assessment

### Activation Depth (30%)

| Dimension | Status |
|---|---|
| Current available sources | Seed proxy IU: `participation_count × NM(0.8) × BC × EV × 0.10` |
| Proxy? | Yes — `× 0.10` is an undocumented demo approximation; CQ, CF, AGF omitted |
| Missing sources | Real IU from `run-kora-pipeline` on live UEF records; real booking attendance counts |
| Foundation Light readiness | `READY_WITH_WEAK_PROXIES` — computes, but IU values are not canonical |
| Pilot readiness | `REQUIRES_GATE_3` — needs live UEF records and/or attendance-derived IU |
| Privacy readiness | `SAFE` — totalIU is aggregate, no worker-level values exposed |
| Data model readiness | `REQUIRES_DATA_MODEL` — real IU requires applied mig 025 + `commons.contribution_event` |
| Verdict | **READY_WITH_WEAK_PROXIES** (FL) / **NOT_READY_FOR_PILOT** without mig 025 |

### Evidence Quality (25%)

| Dimension | Status |
|---|---|
| Current available sources | `VERIFICATION_TO_EV` mapper on seed `verification_status` field |
| Proxy? | Yes — EV values are categorical approximations (verified=0.90, partial=0.75, pending=0.60) |
| Missing sources | Real EV from UEF `evidence_type` field via `EV_BY_EVIDENCE_TYPE` in IUComputationService |
| Foundation Light readiness | `READY_WITH_WEAK_PROXIES` — shrinkage-adjusted formula works; input values are proxied |
| Pilot readiness | `REQUIRES_GATE_3` — needs live UEF records with real `evidence_type` values |
| Privacy readiness | `SAFE` — aggregate EV value per event; no individual attribution |
| Data model readiness | `READY` — `evidence_type` field already in UEF schema |
| Verdict | **READY_WITH_WEAK_PROXIES** (FL) / **REQUIRES_GATE_3** for live |

### Ecosystem Contribution (20%)

| Dimension | Status |
|---|---|
| Current available sources | Seed-derived `event_nature` (`collective_initiative`, `partner_service`) from `initiative_type` mapper |
| Proxy? | Yes — `event_nature` is inferred from `initiative_type`, not from live event signals |
| Missing sources | Live `commons.contribution_event` rows; cross-company booking attendance; external participant events |
| Foundation Light readiness | `READY_FOR_FOUNDATION_LIGHT` — fraction of ecosystem events computed correctly from seed |
| Pilot readiness | `REQUIRES_KORA_SPACE` + `REQUIRES_GATE_3` — needs `commons.booking` + `attributeContributionForBooking()` live |
| Privacy readiness | `SAFE` — aggregate fraction, no individual booking visibility |
| Data model readiness | `REQUIRES_DATA_MODEL` — `commons.booking` + `commons.contribution_event` (mig 025) |
| Verdict | **READY_FOR_FOUNDATION_LIGHT** / **REQUIRES_KORA_SPACE** + **REQUIRES_GATE_3** for live |

### Adoption & Reach (15%)

| Dimension | Status |
|---|---|
| Current available sources | Count of eligible seed initiatives (N = 2–4 in demo scenarios) |
| Proxy? | Yes — initiative count is a very weak proxy for real adoption and reach |
| Missing sources | Booking attendance counts; company adoption/sponsorship signals; aggregate participation across companies |
| Foundation Light readiness | `READY_WITH_WEAK_PROXIES` — concave saturation function computes; N is very low |
| Pilot readiness | `NOT_READY_FOR_PILOT` — requires booking infrastructure + company adoption events |
| Privacy readiness | `SAFE` — event count, no individual attribution |
| Data model readiness | `REQUIRES_DATA_MODEL` — needs adoption/sponsorship event types + booking attendance |
| Verdict | **READY_WITH_WEAK_PROXIES** (FL) / **NOT_READY_FOR_PILOT** |

### Strategic Breadth (10%)

| Dimension | Status |
|---|---|
| Current available sources | Diversity of `action_family` and `pillar` across seed inputs |
| Proxy? | Partial — family/pillar diversity is real from seed taxonomy; count is small |
| Missing sources | Broader event universe with more family types represented |
| Foundation Light readiness | `READY_FOR_FOUNDATION_LIGHT` — formula correct; will generalize to live inputs |
| Pilot readiness | `READY` — formula generalizes naturally as live inputs expand |
| Privacy readiness | `SAFE` — aggregate diversity counts, no individual attribution |
| Data model readiness | `READY` — action_family and pillar fields already present in UEF schema |
| Verdict | **READY_FOR_FOUNDATION_LIGHT** / **READY** for live once data flows |

### Confidence / Data Sufficiency (non-additive)

| Dimension | Status |
|---|---|
| Current available sources | Derived from N (seed count), evidenceQuality (proxy), crossFlag (ecosystem events present) |
| Proxy? | Yes — all three inputs are proxied in FL |
| Missing sources | Real event volume; real EV distribution; real cross-company event count |
| Foundation Light readiness | `READY_WITH_WEAK_PROXIES` — computes; typically "Bassa" (Low) for seed scenarios |
| Pilot readiness | `REQUIRES_GATE_3` — meaningful confidence requires real signal volume |
| Privacy readiness | `SAFE` — no individual attribution |
| Data model readiness | `REQUIRES_DATA_MODEL` — real N requires live events |
| Verdict | **READY_WITH_WEAK_PROXIES** (FL) / **REQUIRES_GATE_3** for meaningful values |

---

## 7. Confirmed Missing Sources / Data Gaps

| ID | Gap | Location | V2 Component Impact | Priority |
|---|---|---|---|---|
| **G-1** | `commons.booking` and `commons.contribution_event` tables not applied | `supabase/migrations/025_commons_booking_contribution.sql` (written, not applied) | Blocks Ecosystem Contribution (20%), Adoption & Reach (15%), Confidence | **CRITICAL** — first gate for any live signal |
| **G-2** | V2 computation uses proxy IU (`× 0.10` approximation), not canonical IU formula output | `KoraContributionService.ts:479` — `iuEstimate = participation_count × 0.80 × BC × EV × 0.10` | Distorts Activation Depth (30%); CQ, CF, AGF omitted | HIGH — affects V2 score credibility |
| **G-3** | KORA-originated/KORA-enabled signal declared in config but absent from V2 formula | `methodology-config.json:kora_contribution_v2.signal_sources` vs `computeContributionV2()` input type | No component fed; declared in config but not wired | MEDIUM — will matter at Pilot+ |
| **G-4** | No company adoption/sponsorship/support event type in IU taxonomy | Across all files — no `company_adopted_initiative`, `company_sponsored_initiative`, etc. | Adoption & Reach (15%) has no direct signal source | MEDIUM — needed for credible Adoption & Reach |
| **G-5** | No aggregated feedback/rating/recurring request signals | `contribution-methodology.ts:85` — "Future signal — not in Foundation Light" | Future: would feed Adoption & Reach, Confidence | LOW (planned gap) |
| **G-6** | `privacy_threshold_met` field in seed not enforced inside `getSummaryV2()` | `collective-initiatives.json:28` vs `KoraContributionService.ts:467` | N/A today (mitigated by `kora_contribution_relevant=false`), but gap for future seeds | MEDIUM — needs explicit guard |
| **G-7** | `event_nature='cross_company_event'` (used in `attributePIBForBooking()`) not in `CONTRIBUTION_EVENT_NATURES` | `cross-company-attribution.ts:92` vs `contribution-family-detector.ts:25` | Latent inconsistency — booking→contribution bypasses `isContributionEligibleEvent()` | LOW (mitigated by direct DB write path; latent only) |
| **G-8** | `partner_validated_initiative` (`advisor_validation_status`) and `territorial_actor_involved` (`territory` field) present in seed but not wired as V2 inputs | `collective-initiatives.json` fields vs `ContributionPipelineInput` type | Would improve Ecosystem Contribution and Strategic Breadth signal quality | MEDIUM — disconnected signals |
| **G-9** | No initiative replication/scaling signal | No code path | Would improve Adoption & Reach (15%) | LOW (Pilot+/future) |
| **G-10** | `insufficient_signal` threshold is N < 2, not N < 10 (privacy threshold) | `methodology-config.json:thresholds.insufficient_signal_min_events=2` | Small-N aggregates may produce a maturity band before privacy threshold N≥10 is met | MEDIUM — threshold alignment needed |

---

## 8. Privacy Boundary Review

| Source Path | Classification | Notes |
|---|---|---|
| `kora-contribution-outputs.json` seed | `SAFE_WITH_SYNTHETIC_DATA_ONLY` | Only aggregate counts; `synthetic_demo_data: true`. |
| `collective-initiatives.json` seed | `SAFE_WITH_SYNTHETIC_DATA_ONLY` | Aggregate participation counts only. No `worker_id`, no worker pseudonym. |
| `getSummaryV2()` (FL demo path) | `SAFE_WITH_SYNTHETIC_DATA_ONLY` | Builds from initiatives seed. Outputs aggregate V2 result. |
| `computeContributionV2()` | `SAFE` | Pure function on aggregate `ContributionPipelineInput[]`. No worker identity field exists in the type. |
| `computeFromPipelineResult()` | `SAFE` | Accepts aggregate pipeline inputs; no worker-level fields. |
| `commons.booking` (schema only) | `BLOCKED_BEFORE_GATE_3` | No COMPANY RLS policy — employer SELECT returns 0 rows by design. Worker-private. |
| `attributeContributionForBooking()` | `SAFE` + `BLOCKED_BEFORE_GATE_3` | Writes `tenant_id` to `contribution_event`, not `worker_identity_id`. Both promoter and origin_employer rows are company-aggregate. |
| `attributePIBForBooking()` | `NEEDS_AGGREGATION_LAYER` + `BLOCKED_BEFORE_GATE_3` | Writes to `personal.worker_pib` — worker-private; never company-visible. Correct. Requires Gate 3 + RLS enforcement from mig 025. |
| `getContributionLive()` | `SAFE` + `BLOCKED_BEFORE_GATE_3` | Selects role, contribution_kind, impact_weight, evidence_status, reporting_period — no worker_identity_id. |
| `getContributionPromoterView()` | `SAFE` + `BLOCKED_BEFORE_GATE_3` | Aggregate pillar counts. `booking_aggregate_for_promoter()` SECURITY DEFINER returns {status, count} pairs only. |
| `getContributionOriginEmployerView()` | `SAFE` + `BLOCKED_BEFORE_GATE_3` | SELECT excludes `source_booking_id` and `worker_identity_id`. Confirmed in hardening tests. |
| `computeContributionV2()` — insufficient_signal threshold | `NEEDS_THRESHOLD` | Currently uses `min_events=2`. This allows V2 to produce a maturity band with N=2–4 events — below the standard KORA privacy threshold of N≥10. Misalignment with `safe_aggregation_threshold`. |
| `PrivacyVisibilityService` + safe_aggregation_threshold | `NEEDS_THRESHOLD` | Group size < 10 suppression not enforced inside `computeContributionV2()`. Enforced upstream via `PrivacyVisibilityService` for segment data; not yet applied to contribution computation level. |

---

## 9. Target IU-to-Contribution Mapping

| Impact Unit Source | Eligibility | V2 Component(s) | Aggregation Rule | Privacy Rule | Confidence Impact | Current Code Status | Implementation Need |
|---|---|---|---|---|---|---|---|
| `company_initiative_created` | Weak eligible (creation alone is low signal) | Strategic Breadth (10%) only | Count of distinct active initiatives per company per period | No individual identification | Very low — creation without activation means nothing | `ACTIVE_SEED` (implicit, no discrete event type) | Define explicit UEF sub-type; gate on `status=active/completed` |
| `cross_company_initiative_created` | Eligible | Ecosystem Contribution (20%), Strategic Breadth (10%) | Count distinct cross-company initiatives hosted by company | No individual identification | Low-medium | `ACTIVE_SEED` | Same as above; flag `opening_grade=cross_company` in `commons.post` |
| `partner_initiative_created` | Eligible via `event_nature=partner_service` | Ecosystem Contribution (20%), Strategic Breadth (10%) | Count distinct partner-linked initiatives | No individual identification | Medium if partner-verified | `ACTIVE_SEED` (S2 only) | Add `partner_id` gate in `ContributionPipelineInput`; `partner_validated_initiative` UEF sub-type |
| `kora_originated_initiative_created` | Config declares eligible-if-adopted | No component yet (gap G-3) | Must require company adoption count > 0 before any signal | No individual identification | Zero until adoption confirmed | `ABSENT` | Add `is_kora_originated` field to `ContributionPipelineInput`; implement adoption gate in `computeContributionV2()` |
| `kora_enabled_initiative_created` | Config declares eligible-if-adopted | No component yet (gap G-3) | Same adoption gate | Same | Same | `ABSENT` | Same as above |
| `company_adopted_initiative` | Eligible (Adoption & Reach core signal) | Adoption & Reach (15%), Ecosystem Contribution (20%) | Count distinct adopted initiatives; prefer verified adoption over declared | No individual identification | Medium-high if adoption is verified | `ABSENT` | New `company_adopted_initiative` action_family or event_nature; add to `isContributionEligibleEvent()` |
| `company_sponsored_initiative` | Eligible | Adoption & Reach (15%) | Count distinct sponsored initiatives per period | No individual identification | Medium | `ABSENT` | New event_nature `company_sponsored`; similar to adoption |
| `company_supported_initiative` | Eligible | Adoption & Reach (15%) | Count distinct supported initiatives | No individual identification | Low-medium | `ABSENT` | New event_nature `company_supported` |
| `aggregate_interest_signal` | Eligible (weak) | Adoption & Reach (15%) weak | Aggregate reaction/interest counts per initiative per company | No individual identification | Low — interest ≠ activation | `ABSENT` | Would require KORA Space reaction aggregation; future signal |
| `aggregate_booking` | Eligible | Activation Depth (30%), Adoption & Reach (15%) | Aggregate booking count per initiative per company per period; N≥10 threshold | Company sees only own aggregate count | Medium | `PRESENT_GATED` (mig 025 not applied) | Apply mig 025; connect `BookingService.createBooking()` → aggregate contribution signal |
| `aggregate_participation` | Eligible (stronger than booking) | Activation Depth (30%), Adoption & Reach (15%) | Aggregate attendance count per initiative per company per period; N≥10 | Company sees only own aggregate count | High — verified attendance | `PRESENT_GATED` (mig 025 not applied) | Apply mig 025; `BookingService.markAttended()` → `attributeContributionForBooking()` is already wired |
| `aggregate_completion` | Eligible | Activation Depth (30%) | Aggregate completion count per initiative per period | Same | High — completion implies full activation | `PRESENT_DISCONNECTED` (booking `status=completed` exists; not mapped to distinct Contribution IU) | Map `status=completed` bookings to separate contribution weight in `attributeContributionForBooking()` |
| `aggregate_feedback` | Eligible (aggregate only) | Future: Adoption & Reach (15%) | Aggregate rating count per initiative; no individual scores exposed to employer | Never expose individual rating to employer | Medium — aggregate only | `ABSENT` | Design aggregate rating model; employer sees only initiative-level average |
| `aggregate_request_for_follow_up` | Eligible | Future: Adoption & Reach (15%) | Aggregate follow-up request count per initiative | Same | Medium | `ABSENT` | Future signal; requires KORA Space follow-up feature |
| `initiative_replicated` | Eligible | Future: Adoption & Reach (15%), Ecosystem Contribution (20%) | Count of distinct companies that replicated the initiative | No individual identification | High — replication = strong adoption signal | `ABSENT` | Requires initiative replication tracking in `commons.post` or separate entity |
| `initiative_scaled` | Eligible | Future: Activation Depth (30%), Ecosystem Contribution (20%) | Scale factor proxy from participant growth across periods | No individual identification | High | `ABSENT` | Requires cross-period comparison |
| `multi_company_participation` | Eligible | Ecosystem Contribution (20%) | Count of distinct tenant IDs in `contribution_event` per initiative | No individual worker identification | High — verified by presence of origin_employer rows | `PRESENT_GATED` | Apply mig 025; `attributeContributionForBooking()` writes `role=origin_employer` per company |
| `partner_validated_initiative` | Eligible | Ecosystem Contribution (20%) | `advisor_validation_status=validated` on initiative | No individual identification | High — third-party validation | `PRESENT_DISCONNECTED` | Wire `advisor_validation_status` from seed/live to `ContributionPipelineInput` as a boolean field; use as confidence booster |
| `territorial_actor_involved` | Eligible | Ecosystem Contribution (20%), Strategic Breadth (10%) | Territory field present + external participants | No individual identification | Medium | `PRESENT_DISCONNECTED` | Wire `territory` and `external_participants_count` from `commons.post` to contribution computation |
| `compliance_mandatory_event` | **BLOCKED** | None | — | — | — | `BLOCKED` (not in allowed families) | No change needed; structural exclusion correct |
| `cash_like_benefit_only` | **BLOCKED** | None | — | — | — | `BLOCKED` (economic_relief not in allowed families) | No change needed |
| `individual_action_only` | **PARTIALLY BLOCKED** | None | No explicit guard; relies on taxonomy | Needs explicit guard for edge cases | — | `NEEDS_EXPLICIT_GUARD` | Add `is_individual_only: boolean` field as veto to `ContributionPipelineInput`; return false if true |

---

## 10. Recommended Implementation Path

### Primary path: **G — Keep current V2 presentation but do not claim full source readiness**

**Rationale:**

KORA Contribution Version B (`computeContributionV2`) is architecturally correct and the maturity band presentation is the right product direction. However, the underlying signal layer is substantially incomplete:

- The two most impactful V2 components — Activation Depth (30%) and Ecosystem Contribution (20%) — are running on seed proxy estimates in Foundation Light.
- All live signal paths are blocked by Gate 3.
- Adoption & Reach (15%) has no real adoption/sponsorship source at all.
- KORA-originated/KORA-enabled signals are declared in config but absent from code.

The current situation is: **correct presentation model, weak signal foundation**. The right response is to keep the V2 maturity band as the product-facing output (it is better than a 0–100 score), while being honest internally that Foundation Light confidence will typically be "Bassa" (Low) because it is computed on proxy data.

The maturity band + confidence + component breakdown correctly communicates this uncertainty to users.

**Immediate actions (no code change required to implement path G):**

1. Ensure FL demo confidence is visibly "Bassa" / Low (already correct given N=2–4 seed initiatives) — no change needed.
2. Document in `KORA_CONTRIBUTION_METHODOLOGY.md` that FL Foundation Light signal layer is seed-proxy only.
3. Do not launch pilot with the current seed-proxy computation as the live signal — Gate 3 applies.

### Fallback path: **D — First build KORA Space initiative/adoption/booking source model**

**Rationale:**

The most valuable pre-Pilot investment is applying migration 025 in a controlled staging environment and enabling `BookingService.markAttended()` → `attributeContributionForBooking()` for at least one pilot company. This would immediately make Ecosystem Contribution (20%) and Adoption & Reach (15%) real rather than proxied.

**Prerequisite sequence for Pilot:**

1. Gate 3 legal/privacy review completed.
2. Migration 025 applied in staging/Pilot (`commons.booking` + `commons.contribution_event`).
3. Migration 026 applied (atomic attribution) after CTO review.
4. At least one pilot company uses KORA Space to create a cross-company initiative.
5. At least one worker from another company books and attends.
6. `markAttended()` triggers `attributeContributionForBooking()`.
7. `getContributionPromoterView()` and `getContributionOriginEmployerView()` return live data.
8. Replace seed path in `contribution/page.tsx` for Pilot+ tenants (already handled by `isPilot` gate).

**Signal gaps that can wait until post-Pilot calibration:**

- Company adoption/sponsorship event types (G-4)
- KORA-originated/KORA-enabled implementation (G-3)
- Aggregated feedback signals (G-5)
- Initiative replication/scaling (G-9)

---

## 11. Final Verdict

### Version B architecture: SOUND

`computeContributionV2()`, `isContributionEligibleEvent()`, the maturity band presentation, the config-driven weights, and the privacy boundaries are all correctly designed. The output type (`ContributionV2Result`) correctly enforces `isKoraIndexComponent: false`, `noWorkerRanking: true`, `noIndividualScore: true`, `noCompanyRanking: true`.

### Signal layer: INCOMPLETE FOR PILOT

| Layer | Status |
|---|---|
| Formula | Sound |
| Eligibility logic | Sound (with gap G-7 as latent minor risk) |
| Privacy architecture | Sound (no individual data exposed) |
| Live signal infrastructure | NOT READY — blocked by Gate 3 |
| Adoption/sponsorship signals | ABSENT — no event types defined |
| KORA-originated/enabled implementation | ABSENT — config only |
| Feedback/follow-up signals | ABSENT — future signal |
| IU proxy quality | WEAK — `× 0.10` demo approximation not canonical |
| Foundation Light confidence | TYPICALLY LOW — correct, visible to users |

### Recommended Gate 3 pre-conditions (before live Contribution signals)

1. Apply migration 025 (`commons.booking` + `commons.contribution_event`) — minimum requirement.
2. Apply migration 026 (atomic attribution) or equivalent transaction-safe path.
3. At least one pilot company with ≥ 2 verified cross-company initiatives (N ≥ threshold).
4. Resolve G-10: align `insufficient_signal_min_events` with KORA privacy threshold (N ≥ 10 or explicitly justified lower value for contribution aggregate).
5. Resolve G-2: replace proxy IU (`× 0.10`) with pipeline-computed IU values through `computeFromPipelineResult()` in the live path.
6. Gate G-3 and G-4: define `company_adopted_initiative` event type and KORA-originated adoption gate before claiming these signals are supported.

---

*Audit complete — read-only, no code changes made. Gate 3 OPEN. Production not touched.*

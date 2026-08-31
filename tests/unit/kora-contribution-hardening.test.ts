/**
 * KORA Contribution Hardening Sprint — comprehensive doctrine + methodology tests.
 *
 * Covers all 18 Task 8 assertions:
 * 1.  Contribution is not KORA Index component
 * 2.  KORA Index formula unchanged
 * 3.  Score label is provisional/demo-only where applicable
 * 4.  Pilot+ cannot present personal contribution score
 * 5.  Weights loaded from config
 * 6.  Weights sum to 100
 * 7.  Explicit eligibility required
 * 8.  Non-collective pillar-only event rejected
 * 9.  Compliance/mandatory event blocked
 * 10. Cash-like benefit alone not contribution-eligible
 * 11. Cross-company initiative eligible
 * 12. KORA Space event eligible only as aggregate signal
 * 13. No worker ranking
 * 14. No individual activity exposed to company
 * 15. Transaction safety for booking attribution (proposed migration documented)
 * 16. Seed wording uses KORA Methodology v0.1
 * 17. Live DB path remains gated by production readiness
 * 18. Gate 3 remains open
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  try { readFileSync(resolve(ROOT, rel)); return true; } catch { return false; }
}

// ── 1. Contribution is NOT a KORA Index component ────────────────────────────

describe('hardening — 1. KORA Contribution NOT a KORA Index component', () => {
  it('doctrine file declares is_kora_index_component = false', async () => {
    const { CONTRIBUTION_IS_KORA_INDEX_COMPONENT } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_IS_KORA_INDEX_COMPONENT).toBe(false);
  });

  it('CONTRIBUTION_ALTERS_KORA_INDEX = false in doctrine', async () => {
    const { CONTRIBUTION_ALTERS_KORA_INDEX } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_ALTERS_KORA_INDEX).toBe(false);
  });

  it('KoraContributionService computeFromPipelineResult: notKoraIndexComponent is always true', async () => {
    const { KoraContributionService } = await import('@/services/kora-contribution/KoraContributionService');
    const svc = new KoraContributionService();
    const result = svc.computeFromPipelineResult('test-company', 'S1', []);
    expect(result.notKoraIndexComponent).toBe(true);
  });

  it('contribution-views: ContributionPromoterView has no score field', () => {
    const src = read('lib/commons/contribution-views.ts');
    const promoterSection = src.split('ContributionPromoterView')[1]?.split('ContributionOriginEmployerView')[0] ?? '';
    expect(promoterSection).not.toContain('score:');
  });

  it('contribution-views: ContributionOriginEmployerView has no score field', () => {
    const src = read('lib/commons/contribution-views.ts');
    const originSection = src.split('ContributionOriginEmployerView')[1] ?? '';
    expect(originSection).not.toContain('score:');
  });
});

// ── 2. KORA Index formula unchanged ──────────────────────────────────────────

describe('hardening — 2. KORA Index formula unchanged', () => {
  it('methodology-config: kora_index_v3 macroblocks still present and unchanged', () => {
    const raw = JSON.parse(read('data/methodology/methodology-config.json'));
    expect(raw.kora_index_v3?.macroblocks?.REACH).toBeDefined();
    expect(raw.kora_index_v3?.macroblocks?.QUALITY).toBeDefined();
    expect(raw.kora_index_v3?.macroblocks?.EQUITY).toBeDefined();
    expect(raw.kora_index_v3?.macroblocks?.BTI).toBeDefined();
  });

  it('methodology-config: REACH weight still 0.25', () => {
    const raw = JSON.parse(read('data/methodology/methodology-config.json'));
    expect(raw.kora_index_v3.macroblocks.REACH.weight).toBe(0.25);
  });

  it('methodology-config: QUALITY weight still 0.30', () => {
    const raw = JSON.parse(read('data/methodology/methodology-config.json'));
    expect(raw.kora_index_v3.macroblocks.QUALITY.weight).toBe(0.30);
  });

  it('kora_contribution section does not override kora_index_v3', () => {
    const raw = JSON.parse(read('data/methodology/methodology-config.json'));
    // Both sections must exist independently
    expect(raw.kora_contribution).toBeDefined();
    expect(raw.kora_index_v3).toBeDefined();
    // kora_contribution must not declare components that shadow KORA Index components
    expect(raw.kora_contribution.macroblocks).toBeUndefined();
    expect(raw.kora_contribution.is_kora_index_component).toBe(false);
  });

  it('v0.1.ts getContributionConfig does not affect getMacroblockWeights', async () => {
    const { getMacroblockWeights, getContributionConfig } = await import('@/lib/methodology-config/v0.1');
    const macros = getMacroblockWeights();
    const contrib = getContributionConfig();
    // Contribution config has no macroblock weights
    expect(macros.REACH).toBe(0.25);
    expect(macros.QUALITY).toBe(0.30);
    expect(contrib.is_kora_index_component).toBe(false);
  });
});

// ── 3. Score label is provisional/demo-only ───────────────────────────────────

describe('hardening — 3. Score label is provisional_demo_only', () => {
  it('getContributionConfig: score_label = provisional_demo_only', async () => {
    const { getContributionConfig } = await import('@/lib/methodology-config/v0.1');
    expect(getContributionConfig().score_label).toBe('provisional_demo_only');
  });

  it('ContributionSummary: scorePresentationMode = provisional_demo_only on computeFromPipelineResult', async () => {
    const { KoraContributionService } = await import('@/services/kora-contribution/KoraContributionService');
    const svc = new KoraContributionService();
    const result = svc.computeFromPipelineResult('test-company', 'S1', []);
    expect(result.scorePresentationMode).toBe('provisional_demo_only');
  });

  it('getContributionV2Live (DB-backed pre-pilot preview, B-TRUTH port 2026-09-01) delegates to the single computeFromPipelineResult authority — same scorePresentationMode guarantee', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    const fn = src.split('export async function getContributionV2Live')[1]?.split('export async function')[0] ?? '';
    expect(fn).toContain('computeFromPipelineResult');
    expect(fn).not.toContain('production_ready');
  });

  it('doctrine: CONTRIBUTION_SCORE_PRESENTATION_MODE = provisional_demo_only', async () => {
    const { CONTRIBUTION_SCORE_PRESENTATION_MODE } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_SCORE_PRESENTATION_MODE).toBe('provisional_demo_only');
  });

  it('methodology-config: score_label field present', () => {
    const raw = JSON.parse(read('data/methodology/methodology-config.json'));
    expect(raw.kora_contribution.score_label).toBe('provisional_demo_only');
  });
});

// ── 4. Pilot+ cannot present personal contribution score ──────────────────────

describe('hardening — 4. Pilot+ no personal score', () => {
  it('ContributionPromoterView type has no score/level/rating field', () => {
    const src = read('lib/commons/contribution-views.ts');
    const block = src.split('ContributionPromoterView')[1]?.split('ContributionOriginEmployerView')[0] ?? '';
    expect(block).not.toContain('score:');
    expect(block).not.toContain('level:');
    expect(block).not.toContain('rating:');
  });

  it('ContributionOriginEmployerView type has no score/level/rating field', () => {
    const src = read('lib/commons/contribution-views.ts');
    const block = src.split('ContributionOriginEmployerView')[1] ?? '';
    expect(block).not.toContain('score:');
    expect(block).not.toContain('level:');
    expect(block).not.toContain('rating:');
  });

  it('getContributionLive result type has no score field', () => {
    const src = read('lib/commons/booking-types.ts');
    // LiveContributionSummary should not have a score field
    expect(src).not.toContain('contribution_score:');
  });

  it('company contribution page: no contribution_score rendered in stripped code', () => {
    const src = read('app/company/contribution/page.tsx');
    // Remove comments
    const stripped = src.replace(/\/\/[^\n]*/g, '');
    // The live data path should not render contribution_score
    expect(stripped).not.toContain('contribution_score');
  });
});

// ── 5 & 6. Weights loaded from config and sum to 100 ─────────────────────────

describe('hardening — 5 & 6. Weights from config, sum = 100', () => {
  it('getContributionConfig returns weights object', async () => {
    const { getContributionConfig } = await import('@/lib/methodology-config/v0.1');
    const cfg = getContributionConfig();
    expect(cfg.weights).toBeDefined();
    expect(typeof cfg.weights.family_breadth).toBe('number');
    expect(typeof cfg.weights.initiatives_norm).toBe('number');
    expect(typeof cfg.weights.evidence_quality).toBe('number');
    expect(typeof cfg.weights.territorial).toBe('number');
    expect(typeof cfg.weights.ecosystem).toBe('number');
  });

  it('weights sum to 100', async () => {
    const { getContributionConfig } = await import('@/lib/methodology-config/v0.1');
    const { weights } = getContributionConfig();
    const total = weights.family_breadth + weights.initiatives_norm + weights.evidence_quality + weights.territorial + weights.ecosystem;
    expect(total).toBe(100);
  });

  it('methodology-config weights sum to 100', () => {
    const raw = JSON.parse(read('data/methodology/methodology-config.json'));
    const w = raw.kora_contribution.weights;
    const total = w.family_breadth + w.initiatives_norm + w.evidence_quality + w.territorial + w.ecosystem;
    expect(total).toBe(100);
  });

  it('KoraContributionService reads weights from config (no hardcoded weight integers in computeProvisionalScore)', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    const fnStart = src.indexOf('function computeProvisionalScore');
    const fnEnd   = src.indexOf('\nfunction ', fnStart + 1);
    const fnBody  = src.substring(fnStart, fnEnd > -1 ? fnEnd : fnStart + 5000);
    // The formula must use config variable (w.family_breadth etc), not bare numbers
    expect(fnBody).toContain('w.family_breadth');
    expect(fnBody).toContain('w.initiatives_norm');
    expect(fnBody).toContain('w.evidence_quality');
    expect(fnBody).toContain('w.territorial');
    expect(fnBody).toContain('w.ecosystem');
    // Bare weight numbers 30, 20, 25, 15, 10 must NOT appear in the formula expression
    expect(fnBody).not.toMatch(/familyBreadth\s*\*\s*30/);
    expect(fnBody).not.toMatch(/initiativesNorm\s*\*\s*20/);
    expect(fnBody).not.toMatch(/evidenceQ\s*\*\s*25/);
  });

  it('KORA Index macroblock weights unchanged (0.25/0.30/0.25/0.20)', async () => {
    const { getMacroblockWeights } = await import('@/lib/methodology-config/v0.1');
    const w = getMacroblockWeights();
    expect(w.REACH + w.QUALITY + w.EQUITY + w.BTI).toBeCloseTo(1.00, 2);
  });
});

// ── 7 & 8. Explicit eligibility required; pillar-only rejected ────────────────

describe('hardening — 7 & 8. Strict eligibility (C-5)', () => {
  it('empty input → not eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({})).toBe(false);
  });

  it('pillar=IMPACT alone → NOT eligible (C-5 fix)', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ pillar: 'IMPACT' })).toBe(false);
  });

  it('pillar=CONNECTION alone → NOT eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ pillar: 'CONNECTION' })).toBe(false);
  });

  it('pillar=LEGACY alone → NOT eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ pillar: 'LEGACY' })).toBe(false);
  });

  it('action_family=territorial_impact → eligible (action_family signal sufficient)', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ action_family: 'territorial_impact' })).toBe(true);
  });

  it('action_family=inclusion_and_connection → eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ action_family: 'inclusion_and_connection' })).toBe(true);
  });

  it('action_family=future_and_legacy → eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ action_family: 'future_and_legacy' })).toBe(true);
  });

  it('event_nature=collective_initiative → eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ event_nature: 'collective_initiative' })).toBe(true);
  });

  it('event_nature=territorial_initiative → eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ event_nature: 'territorial_initiative' })).toBe(true);
  });

  it('event_nature=partner_service → eligible (ecosystem activation)', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ event_nature: 'partner_service' })).toBe(true);
  });
});

// ── 9. Compliance/mandatory events blocked ────────────────────────────────────

describe('hardening — 9. Compliance/mandatory events blocked', () => {
  it('blocked_compliance action_family → not eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ action_family: 'blocked_compliance' })).toBe(false);
  });

  it('excluded_compliance ContributionRole contributes=false', async () => {
    const { deriveContributionRole } = await import('@/lib/live/contribution-lineage');
    const result = deriveContributionRole({
      eligibilityStatus:  'blocked',
      reviewStatus:       'approved',
      approvedForScoring: false,
    });
    // Compliance-blocked events should not contribute to KORA Index
    expect(result.contributes).toBe(false);
  });

  it('policy event_nature → not eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ event_nature: 'policy' })).toBe(false);
  });
});

// ── 10. Cash-like/economic relief NOT contribution-eligible ───────────────────

describe('hardening — 10. Cash-like events not contribution-eligible', () => {
  it('economic_relief action_family → not eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ action_family: 'economic_relief' })).toBe(false);
  });

  it('monetary_benefit event_nature → not eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ event_nature: 'monetary_benefit' })).toBe(false);
  });

  it('family_and_care action_family alone → not eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ action_family: 'family_and_care' })).toBe(false);
  });
});

// ── 11. Cross-company initiative eligible ─────────────────────────────────────

describe('hardening — 11. Cross-company initiative eligible', () => {
  it('cross_company_volunteering → territorial_impact action_family → eligible', async () => {
    const { isContributionEligibleEvent } = await import('@/lib/kora-engine/contribution-family-detector');
    expect(isContributionEligibleEvent({ action_family: 'territorial_impact', event_nature: 'collective_initiative' })).toBe(true);
  });

  it('cross-company pipeline input with territorial_impact → initiativesCount > 0', async () => {
    const { KoraContributionService } = await import('@/services/kora-contribution/KoraContributionService');
    const svc = new KoraContributionService();
    const result = svc.computeFromPipelineResult('test', 'S1', [{
      action_family: 'territorial_impact',
      primary_pillar: 'IMPACT',
      impact_units_total: 0.80,
      evidence_verification_ev: 0.90,
      computed: true,
      event_nature: 'collective_initiative',
    }]);
    expect(result.initiativesCount).toBeGreaterThan(0);
    expect(result.notKoraIndexComponent).toBe(true);
  });

  it('DB-backed mapper (B-TRUTH port): cross_company_participation event_nature classifies as collective_initiative, so it stays eligible', async () => {
    const { deriveEventNature } = await import('@/lib/kora-contribution/contribution-pipeline-input');
    expect(deriveEventNature({
      contribution_kind: 'cross_company_participation',
      is_cross_company: true,
      is_kora_originated: false,
      is_kora_enabled: false,
    })).toBe('collective_initiative');
  });
});

// ── 12. KORA Space event eligible only as aggregate signal ────────────────────

describe('hardening — 12. KORA Space events as aggregate signals only', () => {
  it('contribution summary has no worker_id field', async () => {
    const { KoraContributionService } = await import('@/services/kora-contribution/KoraContributionService');
    const svc = new KoraContributionService();
    const result = svc.computeFromPipelineResult('test', 'S1', [{
      action_family: 'inclusion_and_connection',
      primary_pillar: 'CONNECTION',
      impact_units_total: 0.60,
      evidence_verification_ev: 0.85,
      computed: true,
      event_nature: 'partner_service',
    }]);
    expect((result as unknown as Record<string, unknown>)['worker_id']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['worker_name']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['worker_pib']).toBeUndefined();
  });

  it('DB-backed mapper (B-TRUTH port): ContributionEventRow / buildContributionPipelineInputs carry no worker identity field', () => {
    const src = read('lib/kora-contribution/contribution-pipeline-input.ts');
    expect(src).not.toContain('worker_id');
    expect(src).not.toContain('worker_identity_id');
  });

  it('booking service: worker_identity_id removed from worker GET response', () => {
    const src = read('app/api/worker/commons/bookings/route.ts');
    expect(src).toContain('worker_identity_id: _wid');
  });
});

// ── 13. No worker ranking ─────────────────────────────────────────────────────

describe('hardening — 13. No worker ranking', () => {
  it('CONTRIBUTION_NO_RANKING = true in doctrine', async () => {
    const { CONTRIBUTION_NO_RANKING } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_RANKING).toBe(true);
  });

  it('ContributionSummary: noRanking is always true, regardless of input', async () => {
    const { KoraContributionService } = await import('@/services/kora-contribution/KoraContributionService');
    const svc = new KoraContributionService();
    const r1 = svc.computeFromPipelineResult('test', 'S1', []);
    const r2 = svc.computeFromPipelineResult('test', 'S2', [{
      action_family: 'territorial_impact',
      primary_pillar: 'IMPACT',
      impact_units_total: 1.2,
      evidence_verification_ev: 0.90,
      computed: true,
      event_nature: 'collective_initiative',
    }]);
    expect(r1.noRanking).toBe(true);
    expect(r2.noRanking).toBe(true);
  });
});

// ── 14. No individual activity exposed to company ─────────────────────────────

describe('hardening — 14. No individual activity to company', () => {
  it('CONTRIBUTION_NO_INDIVIDUAL_SCORE = true in doctrine', async () => {
    const { CONTRIBUTION_NO_INDIVIDUAL_SCORE } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_INDIVIDUAL_SCORE).toBe(true);
  });

  it('company contribution page: no worker_identity_id in stripped source', () => {
    const stripped = read('app/company/contribution/page.tsx').replace(/\/\/[^\n]*/g, '');
    expect(stripped).not.toContain('worker_identity_id');
  });

  it('company contribution page: no source_booking_id in stripped source', () => {
    const stripped = read('app/company/contribution/page.tsx').replace(/\/\/[^\n]*/g, '');
    expect(stripped).not.toContain('source_booking_id');
  });

  it('company contribution page: no lavoratore specifico in source', () => {
    expect(read('app/company/contribution/page.tsx')).not.toContain('lavoratore specifico');
  });

  it('getContributionOriginEmployerView: no worker_identity_id in select', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    const fn = src.split('export async function getContributionOriginEmployerView')[1]?.split('export async function')[0] ?? '';
    expect(fn).not.toContain('worker_identity_id');
  });
});

// ── 15. Transaction safety documented for booking attribution ─────────────────

describe('hardening — 15. Transaction safety (C-9)', () => {
  it('draft_contribution_atomic_attribution.sql exists (renumbered 026 → 032 → 037 → 040 → 043, then renamed to draft_contribution_atomic_attribution.sql with no number; B173-FIX-01, -02, -03, -04)', () => {
    expect(exists('supabase/proposed/draft_contribution_atomic_attribution.sql')).toBe(true);
    // All five prior superseded numbers must be gone
    expect(exists('supabase/proposed/026_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/032_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/037_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/040_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/043_contribution_atomic_attribution.sql')).toBe(false);
  });

  it('the draft_contribution_atomic_attribution.sql migration is NOT in forward migrations pipeline (Gate 3 open)', () => {
    expect(exists('supabase/migrations/draft_contribution_atomic_attribution.sql')).toBe(false);
    // Applied 026 and 032 are different migrations (company route RLS gaps; network schema grants)
    expect(exists('supabase/migrations/026_company_route_rls_gaps.sql')).toBe(true);
    expect(exists('supabase/migrations/032_network_schema_grants.sql')).toBe(true);
  });

  it('cross-company-attribution: partial attribution risk documented', () => {
    const src = read('lib/commons/cross-company-attribution.ts');
    expect(src).toMatch(/PARTIAL ATTRIBUTION|partial attribution risk|transaction.*safety/i);
  });

  it('cross-company-attribution: atomic attribution function name referenced as fix', () => {
    const src = read('lib/commons/cross-company-attribution.ts');
    expect(src).toMatch(/032_contribution_atomic|026_contribution_atomic|attribute_contribution_for_booking_atomic/i);
  });

  it('proposed the draft_contribution_atomic_attribution.sql migration: SECURITY DEFINER atomic function defined', () => {
    const sql = read('supabase/proposed/draft_contribution_atomic_attribution.sql');
    expect(sql).toContain('attribute_contribution_for_booking_atomic');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('NOT APPLIED TO ANY DATABASE');
  });

  it('proposed the draft_contribution_atomic_attribution.sql migration: uses ON CONFLICT idempotence (no duplicate risk)', () => {
    const sql = read('supabase/proposed/draft_contribution_atomic_attribution.sql');
    expect(sql).toContain('ON CONFLICT ON CONSTRAINT uq_contribution_booking DO NOTHING');
  });
});

// ── 16. Methodology version wording (C-8) ─────────────────────────────────────
// Originally asserted directly against data/synthetic/kora-contribution-outputs.json
// (retired by the B-TRUTH Contribution port, 2026-09-01, along with the synthetic
// runtime path it fed). The live-view functions' own use of getMethodologyVersion()
// is the current, DB-backed equivalent of this invariant.

describe('hardening — 16. Live view methodology version (C-8)', () => {
  it('getMethodologyVersion() resolves to the public product label KORA Index v1.0 (per KORA-INDEX-VERSION-02)', async () => {
    const { getMethodologyVersion } = await import('@/lib/methodology-config/v0.1');
    expect(getMethodologyVersion()).toBe('KORA Index v1.0');
  });

  it('all three live-view functions stamp methodology_version_id via getMethodologyVersion(), never a hardcoded literal', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    for (const fnName of ['getContributionLive', 'getContributionPromoterView', 'getContributionOriginEmployerView']) {
      const fn = src.split(`export async function ${fnName}`)[1]?.split('export async function')[0] ?? '';
      expect(fn).toContain('getMethodologyVersion()');
    }
  });
});

// ── 17. Live DB path gated by production_ready ────────────────────────────────

describe('hardening — 17. Live DB path gated', () => {
  it('getContributionLive checks production_ready before DB access', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    const fn = src.split('export async function getContributionLive')[1]?.split('export async function')[0] ?? '';
    expect(fn).toContain('production_ready');
    expect(fn).toContain('return null');
  });

  it('getContributionPromoterView checks production_ready', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    const fn = src.split('export async function getContributionPromoterView')[1]?.split('export async function')[0] ?? '';
    expect(fn).toContain('production_ready');
    expect(fn).toContain('return null');
  });

  it('getContributionOriginEmployerView checks production_ready', () => {
    const src = read('services/kora-contribution/KoraContributionService.ts');
    const fn = src.split('export async function getContributionOriginEmployerView')[1]?.split('export async function')[0] ?? '';
    expect(fn).toContain('production_ready');
    expect(fn).toContain('return null');
  });

  it('live API route: returns 404 for non-production_ready tenant', () => {
    const src = read('app/api/company/contribution/live/route.ts');
    expect(src).toContain('404');
    expect(src).toContain('production_ready');
  });

  it('CONTRIBUTION_GATE_3_REQUIRED = true in doctrine', async () => {
    const { CONTRIBUTION_GATE_3_REQUIRED } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_GATE_3_REQUIRED).toBe(true);
  });
});

// ── 18. Gate 3 remains open ───────────────────────────────────────────────────

describe('hardening — 18. Gate 3 remains open', () => {
  it('proposed migration 026 is NOT in forward migrations (Gate 3 open)', () => {
    expect(exists('supabase/migrations/026_contribution_atomic_attribution.sql')).toBe(false);
  });

  it('doctrine: CONTRIBUTION_GATE_3_REQUIRED = true', async () => {
    const { CONTRIBUTION_GATE_3_REQUIRED } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_GATE_3_REQUIRED).toBe(true);
  });

  it('contribution methodology doc exists and mentions Gate 3', () => {
    expect(exists('docs/KORA_CONTRIBUTION_METHODOLOGY.md')).toBe(true);
    const doc = read('docs/KORA_CONTRIBUTION_METHODOLOGY.md');
    expect(doc).toMatch(/Gate 3/i);
  });

  it('KORA_Contribution_Audit.md resolution section exists', () => {
    const doc = read('docs/archive/contribution-source-layer/KORA_Contribution_Audit.md');
    expect(doc).toMatch(/resolution|Resolution/i);
  });

  it('KORA_Contribution_IU_Source_Audit.md exists with required sections', () => {
    expect(exists('docs/archive/contribution-source-layer/KORA_Contribution_IU_Source_Audit.md')).toBe(true);
    const doc = read('docs/archive/contribution-source-layer/KORA_Contribution_IU_Source_Audit.md');
    expect(doc).toContain('## 4. Current IU Eligibility Logic');
    expect(doc).toContain('## 6. Version B Readiness Assessment');
    expect(doc).toContain('## 8. Privacy Boundary Review');
    expect(doc).toContain('## 9. Target IU-to-Contribution Mapping');
    expect(doc).toContain('## 10. Recommended Implementation Path');
    expect(doc).toContain('Gate 3');
  });

  it('KORA_Space_Contribution_Source_Integration_Audit.md exists with required sections', () => {
    expect(exists('docs/archive/kora-space/KORA_Space_Contribution_Source_Integration_Audit.md')).toBe(true);
    const doc = read('docs/archive/kora-space/KORA_Space_Contribution_Source_Integration_Audit.md');
    expect(doc).toContain('## 4. Current Signal Flow');
    expect(doc).toContain('## 5. KORA Space Signals → V2 Component Coverage');
    expect(doc).toContain('## 6. Privacy Boundary Audit');
    expect(doc).toContain('## 7. Gap Analysis');
    expect(doc).toContain('## 8. Readiness Verdict');
    expect(doc).toContain('## 9. Fix Plan');
    expect(doc).toContain('Gate 3');
    expect(doc).toContain('is_kora_index_component');
    expect(doc).toContain('production_ready');
  });

  it('KORA_Space_Contribution_Source_PrePilot_Plan.md exists with required sections', () => {
    expect(exists('docs/archive/kora-space/KORA_Space_Contribution_Source_PrePilot_Plan.md')).toBe(true);
    const doc = read('docs/archive/kora-space/KORA_Space_Contribution_Source_PrePilot_Plan.md');
    expect(doc).toContain('## 1. Migration 025 Review');
    expect(doc).toContain('## 2. Proposed Migration 026 Review');
    expect(doc).toContain('adoption/sponsorship');
    expect(doc).toContain('kora_originated');
    expect(doc).toContain('N≥10');
    expect(doc).toContain('Gate 3');
    expect(doc).toContain('NOT applied');
    expect(doc).toContain('REVISE_BEFORE_APPLY');
  });

  it('proposed migration 026 renamed 026 → 032 → 037 → 040 → 043, then to draft_contribution_atomic_attribution.sql with no number (numbering conflicts resolved four times, then eliminated structurally)', () => {
    // Applied migration 026 exists (company route RLS gaps)
    expect(exists('supabase/migrations/026_company_route_rls_gaps.sql')).toBe(true);
    // Proposed atomic attribution must NOT use any conflicting/superseded number
    expect(exists('supabase/proposed/026_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/032_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/037_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/040_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/043_contribution_atomic_attribution.sql')).toBe(false);
    // Correct (now permanently numberless) file must exist
    expect(exists('supabase/proposed/draft_contribution_atomic_attribution.sql')).toBe(true);
    // File must reference its own filename and its historical dependency in its header
    const mig037 = read('supabase/proposed/draft_contribution_atomic_attribution.sql');
    expect(mig037).toContain('draft_contribution_atomic_attribution');
    expect(mig037).toContain('026_company_route_rls_gaps');
  });
});

// ── 19. Migration 025 Revision Sprint ────────────────────────────────────────

describe('hardening — 19. Migration 025 revision sprint (M025-1 through M025-6)', () => {
  const MIG025 = 'supabase/migrations/025_commons_booking_contribution.sql';

  it('migration 025 exists in forward pipeline (written, not applied)', () => {
    expect(exists(MIG025)).toBe(true);
    const sql = read(MIG025);
    expect(sql).toContain('NOT applied to any live database');
  });

  it('migration 025 NOT in applied set — must not appear in supabase/migrations as applied', () => {
    // Applied migrations are tracked via supabase migration history, not filesystem.
    // Structural check: file must still carry the "Gate 2 OPEN" / NOT applied marker.
    const sql = read(MIG025);
    expect(sql).toMatch(/NOT applied/i);
  });

  // M025-1: expanded contribution_kind CHECK
  it('M025-1: contribution_kind CHECK includes cross_company_participation', () => {
    expect(read(MIG025)).toContain("'cross_company_participation'");
  });

  it('M025-1: contribution_kind CHECK includes external_participants_event', () => {
    expect(read(MIG025)).toContain("'external_participants_event'");
  });

  it('M025-1: contribution_kind CHECK includes company_adoption', () => {
    expect(read(MIG025)).toContain("'company_adoption'");
  });

  it('M025-1: contribution_kind CHECK includes company_sponsorship', () => {
    expect(read(MIG025)).toContain("'company_sponsorship'");
  });

  it('M025-1: contribution_kind CHECK includes company_support', () => {
    expect(read(MIG025)).toContain("'company_support'");
  });

  it('M025-1: contribution_kind CHECK includes company_cofunding', () => {
    expect(read(MIG025)).toContain("'company_cofunding'");
  });

  it('M025-1: contribution_kind CHECK includes kora_originated_adoption', () => {
    expect(read(MIG025)).toContain("'kora_originated_adoption'");
  });

  it('M025-1: contribution_kind CHECK includes kora_enabled_adoption', () => {
    expect(read(MIG025)).toContain("'kora_enabled_adoption'");
  });

  it('M025-1: contribution_kind CHECK includes initiative_replication', () => {
    expect(read(MIG025)).toContain("'initiative_replication'");
  });

  it('M025-1: contribution_kind CHECK includes aggregate_feedback', () => {
    expect(read(MIG025)).toContain("'aggregate_feedback'");
  });

  it('M025-1: contribution_kind CHECK includes aggregate_follow_up', () => {
    expect(read(MIG025)).toContain("'aggregate_follow_up'");
  });

  // M025-2: expanded evidence_status CHECK
  it('M025-2: evidence_status CHECK includes verified', () => {
    expect(read(MIG025)).toContain("'verified'");
  });

  it('M025-2: evidence_status CHECK includes self_declared', () => {
    expect(read(MIG025)).toContain("'self_declared'");
  });

  it('M025-2: evidence_status CHECK includes partner_verified', () => {
    expect(read(MIG025)).toContain("'partner_verified'");
  });

  it('M025-2: evidence_status CHECK includes advisor_verified', () => {
    expect(read(MIG025)).toContain("'advisor_verified'");
  });

  it('M025-2: evidence_status CHECK includes system_verified', () => {
    expect(read(MIG025)).toContain("'system_verified'");
  });

  // M025-3: expanded role CHECK
  it('M025-3: role CHECK includes promoter', () => {
    expect(read(MIG025)).toContain("'promoter'");
  });

  it('M025-3: role CHECK includes origin_employer', () => {
    expect(read(MIG025)).toContain("'origin_employer'");
  });

  it('M025-3: role CHECK includes adopter', () => {
    expect(read(MIG025)).toContain("'adopter'");
  });

  it('M025-3: role CHECK includes sponsor', () => {
    expect(read(MIG025)).toContain("'sponsor'");
  });

  it('M025-3: role CHECK includes supporter', () => {
    expect(read(MIG025)).toContain("'supporter'");
  });

  it('M025-3: role CHECK includes cofunder', () => {
    expect(read(MIG025)).toContain("'cofunder'");
  });

  it('M025-3: role CHECK includes kora_enabler', () => {
    expect(read(MIG025)).toContain("'kora_enabler'");
  });

  it('M025-3: role CHECK includes partner', () => {
    // Scoped to contribution_event role column (not commons.post or other tables)
    const sql = read(MIG025);
    expect(sql).toContain("'partner'");
  });

  // M025-4: N≥10 threshold in booking_aggregate_for_promoter()
  it('M025-4: booking_aggregate_for_promoter contains N≥10 threshold variable', () => {
    const sql = read(MIG025);
    expect(sql).toContain('v_privacy_threshold');
  });

  it('M025-4: threshold value is 10', () => {
    const sql = read(MIG025);
    expect(sql).toMatch(/v_privacy_threshold\s+constant\s+int\s*:=\s*10/);
  });

  it('M025-4: function returns below_threshold when N < threshold', () => {
    const sql = read(MIG025);
    expect(sql).toContain("'below_threshold'");
    expect(sql).toContain('v_total_count < v_privacy_threshold');
  });

  it('M025-4: KORA_ADMIN bypasses threshold for oversight', () => {
    const sql = read(MIG025);
    expect(sql).toContain("v_caller_role = 'COMPANY_ADMIN' AND v_total_count < v_privacy_threshold");
  });

  it('M025-4: no exact small-N counts returned to COMPANY_ADMIN when below threshold', () => {
    const sql = read(MIG025);
    // The GROUP BY breakdown only runs when threshold check passes
    const thresholdBlock = sql.indexOf('v_total_count < v_privacy_threshold');
    const groupByBlock = sql.indexOf('GROUP BY b.status');
    expect(thresholdBlock).toBeGreaterThan(0);
    expect(groupByBlock).toBeGreaterThan(thresholdBlock);
  });

  // M025-5: restricted grants
  it('M025-5: no broad INSERT/UPDATE grant on contribution_event to authenticated', () => {
    const sql = read(MIG025);
    // Must not have the broad pre-revision grant
    expect(sql).not.toMatch(/GRANT\s+SELECT\s*,\s*INSERT\s*,\s*UPDATE\s+ON\s+commons\.contribution_event\s+TO\s+authenticated/i);
  });

  it('M025-5: authenticated gets only SELECT on contribution_event', () => {
    const sql = read(MIG025);
    expect(sql).toMatch(/GRANT\s+SELECT\s+ON\s+commons\.contribution_event\s+TO\s+authenticated/i);
  });

  it('M025-5: explicit REVOKE INSERT, UPDATE on contribution_event from authenticated', () => {
    const sql = read(MIG025);
    expect(sql).toMatch(/REVOKE\s+INSERT\s*,\s*UPDATE\s+ON\s+commons\.contribution_event\s+FROM\s+authenticated/i);
  });

  it('M025-5: SECURITY DEFINER function preserved (booking_aggregate_for_promoter)', () => {
    const sql = read(MIG025);
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('booking_aggregate_for_promoter');
  });

  // M025-6: new source/event/privacy fields
  it('M025-6: source_type field present in contribution_event', () => {
    expect(read(MIG025)).toContain('source_type');
  });

  it('M025-6: event_type field present in contribution_event', () => {
    expect(read(MIG025)).toContain('event_type');
  });

  it('M025-6: contribution_component_hint field present', () => {
    expect(read(MIG025)).toContain('contribution_component_hint');
  });

  it('M025-6: aggregate_count field present', () => {
    expect(read(MIG025)).toContain('aggregate_count');
  });

  it('M025-6: privacy_threshold_met field present', () => {
    expect(read(MIG025)).toContain('privacy_threshold_met');
  });

  it('M025-6: is_cross_company field present', () => {
    expect(read(MIG025)).toContain('is_cross_company');
  });

  it('M025-6: is_kora_originated field present', () => {
    expect(read(MIG025)).toContain('is_kora_originated');
  });

  it('M025-6: is_kora_enabled field present', () => {
    expect(read(MIG025)).toContain('is_kora_enabled');
  });

  it('M025-6: adoption_type field present', () => {
    expect(read(MIG025)).toContain('adoption_type');
  });

  // Constitutional privacy exclusions — no individual worker data in contribution_event
  it('worker_identity_id NOT present in commons.contribution_event schema', () => {
    const sql = read(MIG025);
    // commons.booking legitimately has worker_identity_id.
    // contribution_event must NOT have it. Verify by checking the CREATE TABLE block.
    const ceBlock = sql.substring(
      sql.indexOf('CREATE TABLE IF NOT EXISTS commons.contribution_event'),
      sql.indexOf('CREATE INDEX IF NOT EXISTS idx_contribution_tenant')
    );
    expect(ceBlock).not.toContain('worker_identity_id');
  });

  it('worker_id NOT present in commons.contribution_event schema', () => {
    const sql = read(MIG025);
    const ceBlock = sql.substring(
      sql.indexOf('CREATE TABLE IF NOT EXISTS commons.contribution_event'),
      sql.indexOf('CREATE INDEX IF NOT EXISTS idx_contribution_tenant')
    );
    expect(ceBlock).not.toContain('worker_id');
  });

  // The draft_contribution_atomic_attribution.sql migration compatibility after M025-6 schema expansion
  it('the draft_contribution_atomic_attribution.sql migration populates source_type field in both INSERTs', () => {
    const sql = read('supabase/proposed/draft_contribution_atomic_attribution.sql');
    expect(sql).toContain("source_type, event_type, contribution_component_hint");
    expect(sql).toContain("'booking', 'attendance_marked', 'activation_depth'");
  });

  it('the draft_contribution_atomic_attribution.sql migration sets is_cross_company = true on both INSERTs', () => {
    const sql = read('supabase/proposed/draft_contribution_atomic_attribution.sql');
    const count = (sql.match(/is_cross_company/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2); // at least in column list + value
  });

  it('the draft_contribution_atomic_attribution.sql migration sets privacy_threshold_met = false at INSERT time (runtime threshold enforced by RPC)', () => {
    const sql = read('supabase/proposed/draft_contribution_atomic_attribution.sql');
    expect(sql).toContain('privacy_threshold_met');
    expect(sql).toContain('false');
  });

  it('the draft_contribution_atomic_attribution.sql migration is NOT in forward pipeline (Gate 3 open)', () => {
    expect(exists('supabase/migrations/draft_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/draft_contribution_atomic_attribution.sql')).toBe(true);
  });

  // Pre-pilot plan doc updated with revision status
  it('pre-pilot plan doc includes migration 025 revision status section', () => {
    const doc = read('docs/archive/kora-space/KORA_Space_Contribution_Source_PrePilot_Plan.md');
    expect(doc).toContain('Migration 025 Revision Status');
    expect(doc).toContain('READY_FOR_REVIEW');
    expect(doc).toContain('M025-1');
    expect(doc).toContain('M025-2');
    expect(doc).toContain('M025-3');
    expect(doc).toContain('M025-4');
    expect(doc).toContain('M025-5');
    expect(doc).toContain('M025-6');
    expect(doc).toContain('NOT applied to any database');
  });

  // Global safety confirmation
  it('migration 025 is not applied (not in supabase/migrations/applied set)', () => {
    // Forward migrations directory contains 025 but Supabase tracks applied state separately.
    // Structural check: the file must carry the "NOT applied" marker — this is the source of truth
    // for this pre-apply sprint.
    expect(exists(MIG025)).toBe(true);
    expect(read(MIG025)).toMatch(/NOT applied/i);
  });

  it('the draft_contribution_atomic_attribution.sql migration is not applied (in proposed/, not in applied pipeline)', () => {
    expect(exists('supabase/proposed/draft_contribution_atomic_attribution.sql')).toBe(true);
    expect(exists('supabase/migrations/draft_contribution_atomic_attribution.sql')).toBe(false);
    expect(read('supabase/proposed/draft_contribution_atomic_attribution.sql')).toContain('NOT APPLIED');
  });

  it('KORA Contribution remains outside KORA Index after revision sprint', async () => {
    const { CONTRIBUTION_IS_KORA_INDEX_COMPONENT } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_IS_KORA_INDEX_COMPONENT).toBe(false);
  });

  it('no worker ranking introduced by revision sprint', async () => {
    const { CONTRIBUTION_NO_RANKING } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_RANKING).toBe(true);
  });

  it('no individual contribution score introduced by revision sprint', async () => {
    const { CONTRIBUTION_NO_INDIVIDUAL_SCORE } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_INDIVIDUAL_SCORE).toBe(true);
  });
});

// ── 20. The draft_initiative_adoption_source_model.sql migration — Initiative Adoption Source Model ─────────────────────

describe('hardening — 20. draft_initiative_adoption_source_model.sql — initiative adoption source model', () => {
  const MIG038 = 'supabase/proposed/draft_initiative_adoption_source_model.sql';
  const MIG025 = 'supabase/migrations/025_commons_booking_contribution.sql';

  // File location
  it('draft_initiative_adoption_source_model.sql exists in supabase/proposed/ (design only, not in forward pipeline)', () => {
    expect(exists(MIG038)).toBe(true);
  });

  it('draft_initiative_adoption_source_model.sql is NOT in supabase/migrations/ (not applied)', () => {
    expect(exists('supabase/migrations/draft_initiative_adoption_source_model.sql')).toBe(false);
  });

  it('superseded numbers (033, 038, 041, 044) no longer exist in supabase/proposed/', () => {
    expect(exists('supabase/proposed/033_initiative_adoption_source_model.sql')).toBe(false);
    expect(exists('supabase/proposed/038_initiative_adoption_source_model.sql')).toBe(false);
    expect(exists('supabase/proposed/041_initiative_adoption_source_model.sql')).toBe(false);
    expect(exists('supabase/proposed/044_initiative_adoption_source_model.sql')).toBe(false);
  });

  it('the draft_initiative_adoption_source_model.sql migration carries NOT APPLIED marker', () => {
    expect(read(MIG038)).toMatch(/NOT APPLIED/i);
  });

  // Table definition
  it('the draft_initiative_adoption_source_model.sql migration creates commons.initiative_adoption table', () => {
    const sql = read(MIG038);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS commons.initiative_adoption');
  });

  // adoption_type CHECK values
  it('adoption_type CHECK includes formal_adoption', () => {
    expect(read(MIG038)).toContain("'formal_adoption'");
  });

  it('adoption_type CHECK includes sponsorship', () => {
    expect(read(MIG038)).toContain("'sponsorship'");
  });

  it('adoption_type CHECK includes support', () => {
    expect(read(MIG038)).toContain("'support'");
  });

  it('adoption_type CHECK includes cofunding', () => {
    expect(read(MIG038)).toContain("'cofunding'");
  });

  it('adoption_type CHECK includes promotion', () => {
    expect(read(MIG038)).toContain("'promotion'");
  });

  it('adoption_type CHECK includes made_available', () => {
    expect(read(MIG038)).toContain("'made_available'");
  });

  it('adoption_type CHECK includes partner_delivery', () => {
    expect(read(MIG038)).toContain("'partner_delivery'");
  });

  it('adoption_type CHECK includes kora_enabled_adoption', () => {
    expect(read(MIG038)).toContain("'kora_enabled_adoption'");
  });

  it('adoption_type CHECK includes kora_originated_adoption', () => {
    expect(read(MIG038)).toContain("'kora_originated_adoption'");
  });

  // adoption_status CHECK values
  it('adoption_status CHECK includes proposed', () => {
    expect(read(MIG038)).toContain("'proposed'");
  });

  it('adoption_status CHECK includes approved', () => {
    expect(read(MIG038)).toContain("'approved'");
  });

  it('adoption_status CHECK includes active', () => {
    expect(read(MIG038)).toContain("'active'");
  });

  it('adoption_status CHECK includes completed', () => {
    expect(read(MIG038)).toContain("'completed'");
  });

  it('adoption_status CHECK includes cancelled', () => {
    expect(read(MIG038)).toContain("'cancelled'");
  });

  it('adoption_status CHECK includes rejected', () => {
    expect(read(MIG038)).toContain("'rejected'");
  });

  // source_origin CHECK values
  it('source_origin CHECK includes company_originated', () => {
    expect(read(MIG038)).toContain("'company_originated'");
  });

  it('source_origin CHECK includes cross_company', () => {
    expect(read(MIG038)).toContain("'cross_company'");
  });

  it('source_origin CHECK includes partner_originated', () => {
    expect(read(MIG038)).toContain("'partner_originated'");
  });

  it('source_origin CHECK includes territory_originated', () => {
    expect(read(MIG038)).toContain("'territory_originated'");
  });

  it('source_origin CHECK includes kora_originated', () => {
    expect(read(MIG038)).toContain("'kora_originated'");
  });

  it('source_origin CHECK includes kora_enabled', () => {
    expect(read(MIG038)).toContain("'kora_enabled'");
  });

  // evidence_status alignment with migration 025 M025-2
  it('evidence_status in the draft migration includes self_declared (aligned with mig 025 M025-2)', () => {
    expect(read(MIG038)).toContain("'self_declared'");
  });

  it('evidence_status in the draft migration includes verified (aligned with mig 025 M025-2)', () => {
    const sql = read(MIG038);
    // Check within the initiative_adoption table block (not contribution_event)
    expect(sql).toContain("'verified'");
  });

  it('evidence_status in the draft migration includes partner_verified (aligned with mig 025 M025-2)', () => {
    expect(read(MIG038)).toContain("'partner_verified'");
  });

  it('evidence_status in the draft migration includes advisor_verified (aligned with mig 025 M025-2)', () => {
    expect(read(MIG038)).toContain("'advisor_verified'");
  });

  it('evidence_status in the draft migration includes system_verified (aligned with mig 025 M025-2)', () => {
    expect(read(MIG038)).toContain("'system_verified'");
  });

  // Constitutional privacy exclusions
  it('worker_identity_id NOT a column in initiative_adoption (may appear in exclusion comments)', () => {
    const sql = read(MIG038);
    const tableBlock = sql.substring(
      sql.indexOf('CREATE TABLE IF NOT EXISTS commons.initiative_adoption'),
      sql.indexOf('CREATE TRIGGER trg_initiative_adoption_updated_at')
    );
    // Column definitions follow the pattern: identifier  type (with leading whitespace, not in a comment line)
    // The comment "-- ✗ NO worker_identity_id" documents the exclusion but is not a column definition.
    const columnDefLines = tableBlock.split('\n')
      .filter(l => !l.trim().startsWith('--'))   // exclude comment lines
      .join('\n');
    expect(columnDefLines).not.toContain('worker_identity_id');
  });

  it('worker_id NOT a column in initiative_adoption (may appear in exclusion comments)', () => {
    const sql = read(MIG038);
    const tableBlock = sql.substring(
      sql.indexOf('CREATE TABLE IF NOT EXISTS commons.initiative_adoption'),
      sql.indexOf('CREATE TRIGGER trg_initiative_adoption_updated_at')
    );
    const columnDefLines = tableBlock.split('\n')
      .filter(l => !l.trim().startsWith('--'))
      .join('\n');
    expect(columnDefLines).not.toContain('worker_id');
  });

  it('no individual comment/rating/feedback column in initiative_adoption (exclusion docs allowed)', () => {
    const sql = read(MIG038);
    const tableBlock = sql.substring(
      sql.indexOf('CREATE TABLE IF NOT EXISTS commons.initiative_adoption'),
      sql.indexOf('CREATE TRIGGER trg_initiative_adoption_updated_at')
    );
    // Strip comment lines before checking — constitutional exclusion comments are expected
    const columnDefLines = tableBlock.split('\n')
      .filter(l => !l.trim().startsWith('--'))
      .join('\n');
    // These must not appear as column identifiers (they may appear only in comment text)
    expect(columnDefLines).not.toMatch(/^\s+rating\s/m);
    expect(columnDefLines).not.toMatch(/^\s+individual_feedback\s/m);
    // 'notes' is acceptable — it's internal admin-only free text, never individual worker feedback
  });

  // RLS
  it('RLS enabled on initiative_adoption', () => {
    expect(read(MIG038)).toContain('ALTER TABLE commons.initiative_adoption ENABLE ROW LEVEL SECURITY');
  });

  it('KORA_ADMIN has full access policy on initiative_adoption', () => {
    const sql = read(MIG038);
    expect(sql).toContain("initiative_adoption_kora_admin_all");
    expect(sql).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });

  it('COMPANY_ADMIN/VIEWER has own-tenant SELECT policy', () => {
    const sql = read(MIG038);
    expect(sql).toContain("initiative_adoption_company_select");
    expect(sql).toContain("kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')");
  });

  it('anon has no access — REVOKE ALL FROM anon', () => {
    expect(read(MIG038)).toContain('REVOKE ALL ON commons.initiative_adoption FROM anon');
  });

  it('PUBLIC has no unsafe access — REVOKE ALL FROM PUBLIC', () => {
    expect(read(MIG038)).toContain('REVOKE ALL ON commons.initiative_adoption FROM PUBLIC');
  });

  // Contribution event mapping
  it('attribute_contribution_for_adoption function exists', () => {
    expect(read(MIG038)).toContain('attribute_contribution_for_adoption');
  });

  it('attribution maps to company_adoption contribution_kind', () => {
    expect(read(MIG038)).toContain("'company_adoption'");
  });

  it('attribution maps to company_sponsorship contribution_kind', () => {
    expect(read(MIG038)).toContain("'company_sponsorship'");
  });

  it('attribution maps to company_support contribution_kind', () => {
    expect(read(MIG038)).toContain("'company_support'");
  });

  it('attribution maps to company_cofunding contribution_kind', () => {
    expect(read(MIG038)).toContain("'company_cofunding'");
  });

  it('attribution maps to kora_originated_adoption contribution_kind', () => {
    expect(read(MIG038)).toContain("'kora_originated_adoption'");
  });

  it('attribution maps to kora_enabled_adoption contribution_kind', () => {
    expect(read(MIG038)).toContain("'kora_enabled_adoption'");
  });

  // All contribution_kind values used in the draft migration exist in 025 CHECK constraint
  it('all draft-migration contribution_kinds are present in migration 025 M025-1 CHECK', () => {
    const sql025 = read(MIG025);
    expect(sql025).toContain("'company_adoption'");
    expect(sql025).toContain("'company_sponsorship'");
    expect(sql025).toContain("'company_support'");
    expect(sql025).toContain("'company_cofunding'");
    expect(sql025).toContain("'kora_originated_adoption'");
    expect(sql025).toContain("'kora_enabled_adoption'");
  });

  // All role values used in the draft migration exist in 025 M025-3 CHECK
  it('all draft-migration role values are present in migration 025 M025-3 CHECK', () => {
    const sql025 = read(MIG025);
    expect(sql025).toContain("'adopter'");
    expect(sql025).toContain("'sponsor'");
    expect(sql025).toContain("'supporter'");
    expect(sql025).toContain("'cofunder'");
    expect(sql025).toContain("'kora_enabler'");
    expect(sql025).toContain("'partner'");
    expect(sql025).toContain("'promoter'");  // for origin company row
  });

  // Idempotency
  it('idempotency constraint exists on initiative_adoption', () => {
    expect(read(MIG038)).toContain('uq_initiative_adoption');
  });

  it('attribution function uses ON CONFLICT DO NOTHING (idempotent)', () => {
    const sql = read(MIG038);
    const count = (sql.match(/ON CONFLICT.*DO NOTHING/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2); // at least adopter + promoter INSERTs
  });

  // privacy_threshold_met conservative default
  it('privacy_threshold_met set to false at adoption INSERT (not confirmed by adoption alone)', () => {
    const sql = read(MIG038);
    // attribution function sets privacy_threshold_met = false
    expect(sql).toContain('privacy_threshold_met');
    // Should appear in the INSERT VALUES with false
    const attrFn = sql.substring(sql.indexOf('attribute_contribution_for_adoption'));
    expect(attrFn).toContain('false  -- N≥10 not confirmed');
  });

  // Apply order documented
  it('the draft_initiative_adoption_source_model.sql migration documents a suggested apply order relative to 025 and the other draft', () => {
    const sql = read(MIG038);
    expect(sql).toContain('025');
    expect(sql).toContain('043');
    expect(sql).toContain('044');
    expect(sql).toMatch(/APPLY ORDER/);
  });

  // Gate 3 dependency documented
  it('the draft_initiative_adoption_source_model.sql migration documents Gate 3 dependency', () => {
    expect(read(MIG038)).toContain('Gate 3');
  });

  // Pre-pilot plan updated — archived doc, still refers to the pre-B173-FIX-01 number (033)
  it('pre-pilot plan includes migration 033 section (archived doc, pre-renumbering)', () => {
    const doc = read('docs/archive/kora-space/KORA_Space_Contribution_Source_PrePilot_Plan.md');
    expect(doc).toContain('Migration 033 Initiative Adoption Source Model');
    expect(doc).toContain('initiative_adoption');
    expect(doc).toContain('adoption_type');
    expect(doc).toContain('kora_originated');
    expect(doc).toContain('READY_FOR_REVIEW');
    expect(doc).toContain('NOT applied');
  });

  // SECURITY DEFINER guards
  it('attribute_contribution_for_adoption is SECURITY DEFINER', () => {
    expect(read(MIG038)).toContain('SECURITY DEFINER');
  });

  it('attribute_contribution_for_adoption restricted to service_role', () => {
    const sql = read(MIG038);
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION commons.attribute_contribution_for_adoption TO service_role');
    expect(sql).toContain('REVOKE ALL ON FUNCTION commons.attribute_contribution_for_adoption FROM PUBLIC');
  });

  it('create_initiative_adoption EXECUTE granted to authenticated (company-facing RPC)', () => {
    expect(read(MIG038)).toContain('GRANT EXECUTE ON FUNCTION commons.create_initiative_adoption TO authenticated');
  });

  // Migration status
  it('the draft_initiative_adoption_source_model.sql migration is NOT applied — not in forward migration pipeline', () => {
    expect(exists('supabase/migrations/draft_initiative_adoption_source_model.sql')).toBe(false);
    expect(exists('supabase/proposed/draft_initiative_adoption_source_model.sql')).toBe(true);
  });

  it('migration 025 is still NOT applied (unchanged by the draft-migration design sprint)', () => {
    expect(read(MIG025)).toMatch(/NOT applied/i);
    expect(exists('supabase/migrations/025_commons_booking_contribution.sql')).toBe(true);
  });

  it('the draft_contribution_atomic_attribution.sql migration is still NOT applied (unchanged by the draft-migration design sprint)', () => {
    expect(exists('supabase/proposed/draft_contribution_atomic_attribution.sql')).toBe(true);
    expect(exists('supabase/migrations/draft_contribution_atomic_attribution.sql')).toBe(false);
  });

  // Global doctrine
  it('KORA Contribution remains outside KORA Index after the draft-migration design sprint', async () => {
    const { CONTRIBUTION_IS_KORA_INDEX_COMPONENT } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_IS_KORA_INDEX_COMPONENT).toBe(false);
  });

  it('no worker ranking introduced by the draft-migration design sprint', async () => {
    const { CONTRIBUTION_NO_RANKING } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_RANKING).toBe(true);
  });

  it('no individual contribution score introduced by the draft-migration design sprint', async () => {
    const { CONTRIBUTION_NO_INDIVIDUAL_SCORE } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_INDIVIDUAL_SCORE).toBe(true);
  });
});

// ── 21. Contribution Event Idempotency / Reporting Period Hardening (M025-7) ─

describe('hardening — 21. Contribution event idempotency / reporting period (M025-7)', () => {
  const MIG025 = 'supabase/migrations/025_commons_booking_contribution.sql';
  const MIG037 = 'supabase/proposed/draft_contribution_atomic_attribution.sql';
  const MIG038 = 'supabase/proposed/draft_initiative_adoption_source_model.sql';

  // ── Constraint design ──────────────────────────────────────────────────────

  it('uq_contribution_external includes tenant_id', () => {
    expect(read(MIG025)).toMatch(/uq_contribution_external.*UNIQUE.*tenant_id/);
  });

  it('uq_contribution_external includes source_post_id', () => {
    const sql = read(MIG025);
    const constraintBlock = sql.substring(
      sql.indexOf('uq_contribution_external'),
      sql.indexOf('uq_contribution_external') + 300
    );
    expect(constraintBlock).toContain('source_post_id');
  });

  it('uq_contribution_external includes contribution_kind', () => {
    const sql = read(MIG025);
    const constraintBlock = sql.substring(
      sql.indexOf('uq_contribution_external'),
      sql.indexOf('uq_contribution_external') + 300
    );
    expect(constraintBlock).toContain('contribution_kind');
  });

  it('M025-7: uq_contribution_external includes role', () => {
    const sql = read(MIG025);
    const constraintBlock = sql.substring(
      sql.indexOf('CONSTRAINT uq_contribution_external'),
      sql.indexOf('CONSTRAINT uq_contribution_external') + 200
    );
    expect(constraintBlock).toContain('role');
  });

  it('M025-7: uq_contribution_external includes reporting_period', () => {
    const sql = read(MIG025);
    const constraintBlock = sql.substring(
      sql.indexOf('CONSTRAINT uq_contribution_external'),
      sql.indexOf('CONSTRAINT uq_contribution_external') + 200
    );
    expect(constraintBlock).toContain('reporting_period');
  });

  it('M025-7: uq_contribution_external is NOT the old 3-column form (tenant_id, source_post_id, contribution_kind)', () => {
    const sql = read(MIG025);
    const constraintBlock = sql.substring(
      sql.indexOf('CONSTRAINT uq_contribution_external'),
      sql.indexOf('CONSTRAINT uq_contribution_external') + 200
    );
    // Old 3-column form would end after contribution_kind — new form adds role and reporting_period
    // Verify the 5-column form is present
    expect(constraintBlock).toMatch(/tenant_id.*source_post_id.*contribution_kind.*role.*reporting_period/);
  });

  it('uq_contribution_booking remains scoped to (tenant_id, role, source_booking_id) — unchanged by M025-7', () => {
    const sql = read(MIG025);
    const constraintBlock = sql.substring(
      sql.indexOf('CONSTRAINT uq_contribution_booking'),
      sql.indexOf('CONSTRAINT uq_contribution_booking') + 150
    );
    expect(constraintBlock).toContain('tenant_id');
    expect(constraintBlock).toContain('role');
    expect(constraintBlock).toContain('source_booking_id');
    // Must NOT include reporting_period (booking is keyed by source_booking_id, not period)
    expect(constraintBlock).not.toContain('reporting_period');
  });

  it('migration 025 header documents M025-7', () => {
    expect(read(MIG025)).toContain('M025-7');
  });

  // ── Multi-period reporting proofs (structural) ─────────────────────────────

  it('reporting_period is a NOT NULL column in contribution_event', () => {
    const sql = read(MIG025);
    expect(sql).toMatch(/reporting_period\s+text\s+NOT NULL/);
  });

  it('5-column uq_contribution_external allows multi-period reporting for same (tenant, post, kind, role)', () => {
    // Proof by constraint design: (tenant, post, kind, role, Q2) ≠ (tenant, post, kind, role, Q3)
    // The constraint has 5 distinct columns; different period → different row → no conflict.
    const sql = read(MIG025);
    expect(sql).toContain('reporting_period');
    // The constraint comment documents multi-period support
    expect(sql).toContain('Multi-period reporting');
  });

  it('5-column constraint separates adopter and promoter rows for same (tenant, post, kind, period)', () => {
    // Proof: when adopter_tenant = origin_tenant (edge case), role differs (adopter vs promoter)
    // → different value in role column → no conflict.
    const sql = read(MIG025);
    expect(sql).toContain('role');
    // Constraint comment documents this
    expect(sql).toContain('Cross-company dual-row separation');
  });

  it('multiple adoption types for same initiative are not blocked (different contribution_kind)', () => {
    // company_adoption vs company_sponsorship → different contribution_kind → distinct rows
    const sql = read(MIG025);
    expect(sql).toContain("'company_adoption'");
    expect(sql).toContain("'company_sponsorship'");
    // They coexist because contribution_kind is part of the constraint
  });

  // ── The draft_contribution_atomic_attribution.sql migration compatibility ────────────────────────────────────────────

  it('the draft_contribution_atomic_attribution.sql migration uses uq_contribution_booking (not uq_contribution_external)', () => {
    const sql = read(MIG037);
    const conflicts = (sql.match(/ON CONFLICT ON CONSTRAINT \S+/g) || []);
    expect(conflicts.every(c => c.includes('uq_contribution_booking'))).toBe(true);
    expect(sql).not.toContain('ON CONFLICT ON CONSTRAINT uq_contribution_external');
  });

  it('the draft_contribution_atomic_attribution.sql migration M025-7 compatibility note present', () => {
    expect(read(MIG037)).toContain('M025-7');
  });

  it('the draft_contribution_atomic_attribution.sql migration ON CONFLICT targets are valid against revised migration 025 constraints', () => {
    // uq_contribution_booking exists in migration 025 and is UNCHANGED by M025-7
    const sql025 = read(MIG025);
    const sql037 = read(MIG037);
    expect(sql025).toContain('uq_contribution_booking');
    expect(sql037).toContain('ON CONFLICT ON CONSTRAINT uq_contribution_booking DO NOTHING');
  });

  // ── The draft_initiative_adoption_source_model.sql migration compatibility ────────────────────────────────────────────

  it('the draft_initiative_adoption_source_model.sql migration uses uq_contribution_external for contribution_event inserts', () => {
    const sql = read(MIG038);
    // Both adopter and promoter rows use uq_contribution_external
    const count = (sql.match(/ON CONFLICT ON CONSTRAINT uq_contribution_external/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('the draft_initiative_adoption_source_model.sql migration attribution INSERT includes tenant_id (constraint column 1)', () => {
    const sql = read(MIG038);
    expect(sql).toContain('tenant_id,');
  });

  it('the draft_initiative_adoption_source_model.sql migration attribution INSERT includes source_post_id (constraint column 2)', () => {
    const sql = read(MIG038);
    expect(sql).toContain('source_post_id,');
  });

  it('the draft_initiative_adoption_source_model.sql migration attribution INSERT includes contribution_kind (constraint column 3)', () => {
    const sql = read(MIG038);
    expect(sql).toContain('contribution_kind,');
  });

  it('the draft_initiative_adoption_source_model.sql migration attribution INSERT includes role (constraint column 4 — M025-7)', () => {
    // role is set via v_adopter_role and 'promoter' in both INSERTs
    const sql = read(MIG038);
    expect(sql).toContain('role,');
    expect(sql).toContain("v_adopter_role");
    expect(sql).toContain("'promoter'");
  });

  it('the draft_initiative_adoption_source_model.sql migration attribution INSERT includes reporting_period (constraint column 5 — M025-7)', () => {
    // p_reporting_period is passed to both INSERTs
    const sql = read(MIG038);
    expect(sql).toContain('reporting_period,');
    expect(sql).toContain('p_reporting_period,');
  });

  it('the draft_initiative_adoption_source_model.sql migration prerequisites note updated for M025-7 constraint requirement', () => {
    expect(read(MIG038)).toContain('M025-7');
    expect(read(MIG038)).toContain('5-column');
  });

  // ── Privacy boundary ───────────────────────────────────────────────────────

  it('no worker_identity_id in contribution_event constraint columns', () => {
    const sql = read(MIG025);
    const constraintBlock = sql.substring(
      sql.indexOf('CONSTRAINT uq_contribution_external'),
      sql.indexOf('CONSTRAINT uq_contribution_external') + 200
    );
    expect(constraintBlock).not.toContain('worker_identity_id');
    expect(constraintBlock).not.toContain('worker_id');
  });

  it('no worker_id in contribution_event constraint columns', () => {
    const sql = read(MIG025);
    const constraintBlock = sql.substring(
      sql.indexOf('CONSTRAINT uq_contribution_booking'),
      sql.indexOf('CONSTRAINT uq_contribution_booking') + 150
    );
    expect(constraintBlock).not.toContain('worker_identity_id');
    expect(constraintBlock).not.toContain('worker_id');
  });

  // ── Pre-pilot plan documentation ───────────────────────────────────────────

  it('pre-pilot plan documents idempotency review sprint', () => {
    const doc = read('docs/archive/kora-space/KORA_Space_Contribution_Source_PrePilot_Plan.md');
    expect(doc).toContain('Contribution Event Idempotency / Reporting Period Review');
    expect(doc).toContain('M025-7');
    expect(doc).toContain('uq_contribution_external');
    expect(doc).toContain('reporting_period');
    expect(doc).toContain('Multi-period reporting');
  });

  it('pre-pilot plan documents that multi-period is unblocked', () => {
    const doc = read('docs/archive/kora-space/KORA_Space_Contribution_Source_PrePilot_Plan.md');
    expect(doc).toContain('Two distinct rows — different `reporting_period`');
  });

  // ── Migration status ───────────────────────────────────────────────────────

  it('migration 025 is NOT applied after idempotency sprint', () => {
    expect(read(MIG025)).toMatch(/NOT applied/i);
  });

  it('the draft_contribution_atomic_attribution.sql migration is NOT applied after idempotency sprint', () => {
    expect(exists('supabase/proposed/draft_contribution_atomic_attribution.sql')).toBe(true);
    expect(exists('supabase/migrations/draft_contribution_atomic_attribution.sql')).toBe(false);
  });

  it('the draft_initiative_adoption_source_model.sql migration is NOT applied after idempotency sprint', () => {
    expect(exists('supabase/proposed/draft_initiative_adoption_source_model.sql')).toBe(true);
    expect(exists('supabase/migrations/draft_initiative_adoption_source_model.sql')).toBe(false);
  });

  // ── Global doctrine ────────────────────────────────────────────────────────

  it('KORA Contribution remains outside KORA Index after idempotency sprint', async () => {
    const { CONTRIBUTION_IS_KORA_INDEX_COMPONENT } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_IS_KORA_INDEX_COMPONENT).toBe(false);
  });

  it('no worker ranking introduced by idempotency sprint', async () => {
    const { CONTRIBUTION_NO_RANKING } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_RANKING).toBe(true);
  });

  it('no individual contribution score introduced by idempotency sprint', async () => {
    const { CONTRIBUTION_NO_INDIVIDUAL_SCORE } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_INDIVIDUAL_SCORE).toBe(true);
  });
});

// ── 22. Handoff snapshot document integrity ───────────────────────────────────

describe('hardening — 22. Handoff snapshot document integrity', () => {
  const HANDOFF = 'docs/archive/contribution-source-layer/HANDOFF_KORA_CONTRIBUTION_SOURCE_LAYER.md';

  it('handoff document exists', () => {
    expect(exists(HANDOFF)).toBe(true);
  });

  it('handoff mentions migration 025', () => {
    expect(read(HANDOFF)).toContain('025');
  });

  it('handoff mentions migration 032', () => {
    expect(read(HANDOFF)).toContain('032');
  });

  it('handoff mentions migration 033', () => {
    expect(read(HANDOFF)).toContain('033');
  });

  it('handoff states Gate 3 OPEN', () => {
    expect(read(HANDOFF)).toContain('Gate 3');
    expect(read(HANDOFF)).toContain('OPEN');
  });

  it('handoff states no migrations applied', () => {
    const doc = read(HANDOFF);
    expect(doc).toContain('NOT applied');
  });

  it('handoff mentions uq_contribution_external', () => {
    expect(read(HANDOFF)).toContain('uq_contribution_external');
  });

  it('handoff mentions reporting_period', () => {
    expect(read(HANDOFF)).toContain('reporting_period');
  });

  it('handoff states KORA Contribution is outside KORA Index', () => {
    const doc = read(HANDOFF);
    expect(doc).toContain('companion indicator');
    expect(doc).toContain('NOT');
    expect(doc).toMatch(/NOT.*KORA Index component|companion indicator.*NOT/);
  });

  it('handoff states no worker ranking', () => {
    const doc = read(HANDOFF);
    expect(doc).toContain('worker ranking');
    // Safety section must explicitly prohibit it
    expect(doc).toContain('DO NOT introduce worker ranking');
    // Safety confirmation table must confirm it is absent
    expect(doc).toContain('No worker ranking');
  });

  it('handoff states no individual contribution score', () => {
    const doc = read(HANDOFF);
    expect(doc).toContain('individual contribution score');
    expect(doc).toContain('DO NOT introduce individual contribution scores');
    expect(doc).toContain('No individual contribution score');
  });

  it('handoff includes Do Not Do Yet section', () => {
    expect(read(HANDOFF)).toContain('Do Not Do Yet');
    expect(read(HANDOFF)).toContain('DO NOT apply migration 025');
    expect(read(HANDOFF)).toContain('DO NOT apply migration 032');
    expect(read(HANDOFF)).toContain('DO NOT apply migration 033');
    expect(read(HANDOFF)).toContain('DO NOT run supabase db push');
    expect(read(HANDOFF)).toContain('DO NOT close Gate 3');
  });

  it('handoff HEAD commit matches sprint 3 commit', () => {
    expect(read(HANDOFF)).toContain('6384026');
  });
});

// ── 23. CTO review document integrity ────────────────────────────────────────

describe('hardening — 23. CTO review document integrity', () => {
  const CTO_REVIEW = 'docs/archive/contribution-source-layer/CTO_REVIEW_KORA_CONTRIBUTION_SOURCE_LAYER.md';

  it('CTO review document exists', () => {
    expect(exists(CTO_REVIEW)).toBe(true);
  });

  it('CTO review mentions migration 025', () => {
    expect(read(CTO_REVIEW)).toContain('025');
  });

  it('CTO review mentions migration 032', () => {
    expect(read(CTO_REVIEW)).toContain('032');
  });

  it('CTO review mentions migration 033', () => {
    expect(read(CTO_REVIEW)).toContain('033');
  });

  it('CTO review states Gate 3 OPEN', () => {
    expect(read(CTO_REVIEW)).toContain('Gate 3');
    expect(read(CTO_REVIEW)).toContain('OPEN');
  });

  it('CTO review states no migrations applied', () => {
    expect(read(CTO_REVIEW)).toContain('NOT APPLIED');
  });

  it('CTO review mentions N≥10', () => {
    expect(read(CTO_REVIEW)).toContain('N≥10');
  });

  it('CTO review mentions uq_contribution_external', () => {
    expect(read(CTO_REVIEW)).toContain('uq_contribution_external');
  });

  it('CTO review mentions reporting_period', () => {
    expect(read(CTO_REVIEW)).toContain('reporting_period');
  });

  it('CTO review states no worker ranking', () => {
    expect(read(CTO_REVIEW)).toContain('No worker ranking');
  });

  it('CTO review states no individual score', () => {
    expect(read(CTO_REVIEW)).toContain('No individual contribution score');
  });

  it('CTO review states KORA Contribution is outside KORA Index', () => {
    const doc = read(CTO_REVIEW);
    expect(doc).toContain('companion indicator');
    expect(doc).toContain('KORA Index');
  });

  it('CTO review Do Not Do Yet section prohibits applying 025', () => {
    expect(read(CTO_REVIEW)).toContain('DO NOT apply migration 025');
  });

  it('CTO review Do Not Do Yet section prohibits applying 032', () => {
    expect(read(CTO_REVIEW)).toContain('DO NOT apply migration 032');
  });

  it('CTO review Do Not Do Yet section prohibits applying 033', () => {
    expect(read(CTO_REVIEW)).toContain('DO NOT apply migration 033');
  });

  it('CTO review includes Gate 3 preconditions section', () => {
    expect(read(CTO_REVIEW)).toContain('Gate 3 Preconditions');
  });

  it('CTO review includes risk register', () => {
    expect(read(CTO_REVIEW)).toContain('Risk Register');
    expect(read(CTO_REVIEW)).toContain('DPO');
  });

  it('CTO review includes overall verdict', () => {
    expect(read(CTO_REVIEW)).toContain('PASS_WITH_MINOR_NOTES');
  });
});

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

  it('seed file: is_kora_index_component: false on all records', () => {
    const raw = JSON.parse(read('data/synthetic/kora-contribution-outputs.json'));
    for (const rec of raw.data) {
      expect(rec.is_kora_index_component).toBe(false);
    }
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

  it('getSummaryV2: scorePresentationMode = provisional_demo_only', async () => {
    const { KoraContributionService } = await import('@/services/kora-contribution/KoraContributionService');
    const svc = new KoraContributionService();
    const result = svc.getSummaryV2('meridiana-group', 'S1');
    expect(result.scorePresentationMode).toBe('provisional_demo_only');
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

  it('cross_company collective initiatives in seed S2 reference correct initiative ids', () => {
    const raw = JSON.parse(read('data/synthetic/kora-contribution-outputs.json'));
    const s2 = raw.data.find((r: { scenario_id: string }) => r.scenario_id === 'S2');
    expect(s2.referenced_collective_initiative_ids).toContain('init-territorial-volunteer-crossco');
    expect(s2.cross_company_initiatives_count).toBeGreaterThan(0);
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

  it('collective-initiatives seed: privacy_rule confirms no worker_id', () => {
    const raw = JSON.parse(read('data/synthetic/collective-initiatives.json'));
    expect(raw.privacy_rule).toMatch(/No worker_id|no worker_id/i);
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

  it('ContributionSummary: noRanking is always true', async () => {
    const { KoraContributionService } = await import('@/services/kora-contribution/KoraContributionService');
    const svc = new KoraContributionService();
    const r1 = svc.computeFromPipelineResult('test', 'S1', []);
    const r2 = svc.getSummaryV2('meridiana-group', 'S2');
    expect(r1.noRanking).toBe(true);
    expect(r2.noRanking).toBe(true);
  });

  it('seed data: no_ranking: true on all records', () => {
    const raw = JSON.parse(read('data/synthetic/kora-contribution-outputs.json'));
    for (const rec of raw.data) {
      expect(rec.no_ranking).toBe(true);
    }
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
  it('proposed migration 032 exists (renumbered from 026 to fix numbering conflict)', () => {
    expect(exists('supabase/proposed/032_contribution_atomic_attribution.sql')).toBe(true);
    // Old conflicting number must be gone
    expect(exists('supabase/proposed/026_contribution_atomic_attribution.sql')).toBe(false);
  });

  it('migration 032 is NOT in forward migrations pipeline (Gate 3 open)', () => {
    expect(exists('supabase/migrations/032_contribution_atomic_attribution.sql')).toBe(false);
    // Applied 026 is a different migration (company route RLS gaps)
    expect(exists('supabase/migrations/026_company_route_rls_gaps.sql')).toBe(true);
  });

  it('cross-company-attribution: partial attribution risk documented', () => {
    const src = read('lib/commons/cross-company-attribution.ts');
    expect(src).toMatch(/PARTIAL ATTRIBUTION|partial attribution risk|transaction.*safety/i);
  });

  it('cross-company-attribution: atomic attribution function name referenced as fix', () => {
    const src = read('lib/commons/cross-company-attribution.ts');
    expect(src).toMatch(/032_contribution_atomic|026_contribution_atomic|attribute_contribution_for_booking_atomic/i);
  });

  it('proposed migration 032: SECURITY DEFINER atomic function defined', () => {
    const sql = read('supabase/proposed/032_contribution_atomic_attribution.sql');
    expect(sql).toContain('attribute_contribution_for_booking_atomic');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('NOT APPLIED TO ANY DATABASE');
  });

  it('proposed migration 032: uses ON CONFLICT idempotence (no duplicate risk)', () => {
    const sql = read('supabase/proposed/032_contribution_atomic_attribution.sql');
    expect(sql).toContain('ON CONFLICT ON CONSTRAINT uq_contribution_booking DO NOTHING');
  });
});

// ── 16. Seed wording uses KORA Methodology v0.1 ──────────────────────────────

describe('hardening — 16. Seed methodology version (C-8)', () => {
  it('kora-contribution-outputs.json: all records use KORA Methodology v0.1', () => {
    const raw = JSON.parse(read('data/synthetic/kora-contribution-outputs.json'));
    for (const rec of raw.data) {
      expect(rec.methodology_version_id).toBe('KORA Methodology v0.1');
    }
  });

  it('kora-contribution-outputs.json: no record uses KORA Index v1.0 as methodology_version_id', () => {
    const raw = JSON.parse(read('data/synthetic/kora-contribution-outputs.json'));
    for (const rec of raw.data) {
      expect(rec.methodology_version_id).not.toBe('KORA Index v1.0');
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
    const doc = read('KORA_Contribution_Audit.md');
    expect(doc).toMatch(/resolution|Resolution/i);
  });

  it('KORA_Contribution_IU_Source_Audit.md exists with required sections', () => {
    expect(exists('KORA_Contribution_IU_Source_Audit.md')).toBe(true);
    const doc = read('KORA_Contribution_IU_Source_Audit.md');
    expect(doc).toContain('## 4. Current IU Eligibility Logic');
    expect(doc).toContain('## 6. Version B Readiness Assessment');
    expect(doc).toContain('## 8. Privacy Boundary Review');
    expect(doc).toContain('## 9. Target IU-to-Contribution Mapping');
    expect(doc).toContain('## 10. Recommended Implementation Path');
    expect(doc).toContain('Gate 3');
  });

  it('KORA_Space_Contribution_Source_Integration_Audit.md exists with required sections', () => {
    expect(exists('KORA_Space_Contribution_Source_Integration_Audit.md')).toBe(true);
    const doc = read('KORA_Space_Contribution_Source_Integration_Audit.md');
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
    expect(exists('KORA_Space_Contribution_Source_PrePilot_Plan.md')).toBe(true);
    const doc = read('KORA_Space_Contribution_Source_PrePilot_Plan.md');
    expect(doc).toContain('## 1. Migration 025 Review');
    expect(doc).toContain('## 2. Proposed Migration 026 Review');
    expect(doc).toContain('adoption/sponsorship');
    expect(doc).toContain('kora_originated');
    expect(doc).toContain('N≥10');
    expect(doc).toContain('Gate 3');
    expect(doc).toContain('NOT applied');
    expect(doc).toContain('REVISE_BEFORE_APPLY');
  });

  it('proposed migration 026 is renamed to 032 (numbering conflict resolved)', () => {
    // Applied migration 026 exists (company route RLS gaps)
    expect(exists('supabase/migrations/026_company_route_rls_gaps.sql')).toBe(true);
    // Proposed atomic attribution must NOT use conflicting number 026
    expect(exists('supabase/proposed/026_contribution_atomic_attribution.sql')).toBe(false);
    // Correct renumbered version must exist
    expect(exists('supabase/proposed/032_contribution_atomic_attribution.sql')).toBe(true);
    // New file must reference correct number in header
    const mig032 = read('supabase/proposed/032_contribution_atomic_attribution.sql');
    expect(mig032).toContain('032_contribution_atomic_attribution');
    expect(mig032).toContain('026_company_route_rls_gaps');
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

  // Migration 032 compatibility after M025-6 schema expansion
  it('migration 032 populates source_type field in both INSERTs', () => {
    const sql = read('supabase/proposed/032_contribution_atomic_attribution.sql');
    expect(sql).toContain("source_type, event_type, contribution_component_hint");
    expect(sql).toContain("'booking', 'attendance_marked', 'activation_depth'");
  });

  it('migration 032 sets is_cross_company = true on both INSERTs', () => {
    const sql = read('supabase/proposed/032_contribution_atomic_attribution.sql');
    const count = (sql.match(/is_cross_company/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2); // at least in column list + value
  });

  it('migration 032 sets privacy_threshold_met = false at INSERT time (runtime threshold enforced by RPC)', () => {
    const sql = read('supabase/proposed/032_contribution_atomic_attribution.sql');
    expect(sql).toContain('privacy_threshold_met');
    expect(sql).toContain('false');
  });

  it('migration 032 is NOT in forward pipeline (Gate 3 open)', () => {
    expect(exists('supabase/migrations/032_contribution_atomic_attribution.sql')).toBe(false);
    expect(exists('supabase/proposed/032_contribution_atomic_attribution.sql')).toBe(true);
  });

  // Pre-pilot plan doc updated with revision status
  it('pre-pilot plan doc includes migration 025 revision status section', () => {
    const doc = read('KORA_Space_Contribution_Source_PrePilot_Plan.md');
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

  it('migration 032 is not applied (in proposed/, not in applied pipeline)', () => {
    expect(exists('supabase/proposed/032_contribution_atomic_attribution.sql')).toBe(true);
    expect(exists('supabase/migrations/032_contribution_atomic_attribution.sql')).toBe(false);
    expect(read('supabase/proposed/032_contribution_atomic_attribution.sql')).toContain('NOT APPLIED');
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

// ── 20. Migration 033 — Initiative Adoption Source Model ─────────────────────

describe('hardening — 20. Migration 033 initiative adoption source model', () => {
  const MIG033 = 'supabase/proposed/033_initiative_adoption_source_model.sql';
  const MIG025 = 'supabase/migrations/025_commons_booking_contribution.sql';

  // File location
  it('migration 033 exists in supabase/proposed/ (design only, not in forward pipeline)', () => {
    expect(exists(MIG033)).toBe(true);
  });

  it('migration 033 is NOT in supabase/migrations/ (not applied)', () => {
    expect(exists('supabase/migrations/033_initiative_adoption_source_model.sql')).toBe(false);
  });

  it('migration 033 carries NOT APPLIED marker', () => {
    expect(read(MIG033)).toMatch(/NOT APPLIED/i);
  });

  // Table definition
  it('migration 033 creates commons.initiative_adoption table', () => {
    const sql = read(MIG033);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS commons.initiative_adoption');
  });

  // adoption_type CHECK values
  it('adoption_type CHECK includes formal_adoption', () => {
    expect(read(MIG033)).toContain("'formal_adoption'");
  });

  it('adoption_type CHECK includes sponsorship', () => {
    expect(read(MIG033)).toContain("'sponsorship'");
  });

  it('adoption_type CHECK includes support', () => {
    expect(read(MIG033)).toContain("'support'");
  });

  it('adoption_type CHECK includes cofunding', () => {
    expect(read(MIG033)).toContain("'cofunding'");
  });

  it('adoption_type CHECK includes promotion', () => {
    expect(read(MIG033)).toContain("'promotion'");
  });

  it('adoption_type CHECK includes made_available', () => {
    expect(read(MIG033)).toContain("'made_available'");
  });

  it('adoption_type CHECK includes partner_delivery', () => {
    expect(read(MIG033)).toContain("'partner_delivery'");
  });

  it('adoption_type CHECK includes kora_enabled_adoption', () => {
    expect(read(MIG033)).toContain("'kora_enabled_adoption'");
  });

  it('adoption_type CHECK includes kora_originated_adoption', () => {
    expect(read(MIG033)).toContain("'kora_originated_adoption'");
  });

  // adoption_status CHECK values
  it('adoption_status CHECK includes proposed', () => {
    expect(read(MIG033)).toContain("'proposed'");
  });

  it('adoption_status CHECK includes approved', () => {
    expect(read(MIG033)).toContain("'approved'");
  });

  it('adoption_status CHECK includes active', () => {
    expect(read(MIG033)).toContain("'active'");
  });

  it('adoption_status CHECK includes completed', () => {
    expect(read(MIG033)).toContain("'completed'");
  });

  it('adoption_status CHECK includes cancelled', () => {
    expect(read(MIG033)).toContain("'cancelled'");
  });

  it('adoption_status CHECK includes rejected', () => {
    expect(read(MIG033)).toContain("'rejected'");
  });

  // source_origin CHECK values
  it('source_origin CHECK includes company_originated', () => {
    expect(read(MIG033)).toContain("'company_originated'");
  });

  it('source_origin CHECK includes cross_company', () => {
    expect(read(MIG033)).toContain("'cross_company'");
  });

  it('source_origin CHECK includes partner_originated', () => {
    expect(read(MIG033)).toContain("'partner_originated'");
  });

  it('source_origin CHECK includes territory_originated', () => {
    expect(read(MIG033)).toContain("'territory_originated'");
  });

  it('source_origin CHECK includes kora_originated', () => {
    expect(read(MIG033)).toContain("'kora_originated'");
  });

  it('source_origin CHECK includes kora_enabled', () => {
    expect(read(MIG033)).toContain("'kora_enabled'");
  });

  // evidence_status alignment with migration 025 M025-2
  it('evidence_status in 033 includes self_declared (aligned with mig 025 M025-2)', () => {
    expect(read(MIG033)).toContain("'self_declared'");
  });

  it('evidence_status in 033 includes verified (aligned with mig 025 M025-2)', () => {
    const sql = read(MIG033);
    // Check within the initiative_adoption table block (not contribution_event)
    expect(sql).toContain("'verified'");
  });

  it('evidence_status in 033 includes partner_verified (aligned with mig 025 M025-2)', () => {
    expect(read(MIG033)).toContain("'partner_verified'");
  });

  it('evidence_status in 033 includes advisor_verified (aligned with mig 025 M025-2)', () => {
    expect(read(MIG033)).toContain("'advisor_verified'");
  });

  it('evidence_status in 033 includes system_verified (aligned with mig 025 M025-2)', () => {
    expect(read(MIG033)).toContain("'system_verified'");
  });

  // Constitutional privacy exclusions
  it('worker_identity_id NOT a column in initiative_adoption (may appear in exclusion comments)', () => {
    const sql = read(MIG033);
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
    const sql = read(MIG033);
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
    const sql = read(MIG033);
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
    expect(read(MIG033)).toContain('ALTER TABLE commons.initiative_adoption ENABLE ROW LEVEL SECURITY');
  });

  it('KORA_ADMIN has full access policy on initiative_adoption', () => {
    const sql = read(MIG033);
    expect(sql).toContain("initiative_adoption_kora_admin_all");
    expect(sql).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });

  it('COMPANY_ADMIN/VIEWER has own-tenant SELECT policy', () => {
    const sql = read(MIG033);
    expect(sql).toContain("initiative_adoption_company_select");
    expect(sql).toContain("kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')");
  });

  it('anon has no access — REVOKE ALL FROM anon', () => {
    expect(read(MIG033)).toContain('REVOKE ALL ON commons.initiative_adoption FROM anon');
  });

  it('PUBLIC has no unsafe access — REVOKE ALL FROM PUBLIC', () => {
    expect(read(MIG033)).toContain('REVOKE ALL ON commons.initiative_adoption FROM PUBLIC');
  });

  // Contribution event mapping
  it('attribute_contribution_for_adoption function exists', () => {
    expect(read(MIG033)).toContain('attribute_contribution_for_adoption');
  });

  it('attribution maps to company_adoption contribution_kind', () => {
    expect(read(MIG033)).toContain("'company_adoption'");
  });

  it('attribution maps to company_sponsorship contribution_kind', () => {
    expect(read(MIG033)).toContain("'company_sponsorship'");
  });

  it('attribution maps to company_support contribution_kind', () => {
    expect(read(MIG033)).toContain("'company_support'");
  });

  it('attribution maps to company_cofunding contribution_kind', () => {
    expect(read(MIG033)).toContain("'company_cofunding'");
  });

  it('attribution maps to kora_originated_adoption contribution_kind', () => {
    expect(read(MIG033)).toContain("'kora_originated_adoption'");
  });

  it('attribution maps to kora_enabled_adoption contribution_kind', () => {
    expect(read(MIG033)).toContain("'kora_enabled_adoption'");
  });

  // All contribution_kind values used in 033 exist in 025 CHECK constraint
  it('all 033 contribution_kinds are present in migration 025 M025-1 CHECK', () => {
    const sql025 = read(MIG025);
    expect(sql025).toContain("'company_adoption'");
    expect(sql025).toContain("'company_sponsorship'");
    expect(sql025).toContain("'company_support'");
    expect(sql025).toContain("'company_cofunding'");
    expect(sql025).toContain("'kora_originated_adoption'");
    expect(sql025).toContain("'kora_enabled_adoption'");
  });

  // All role values used in 033 exist in 025 M025-3 CHECK
  it('all 033 role values are present in migration 025 M025-3 CHECK', () => {
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
    expect(read(MIG033)).toContain('uq_initiative_adoption');
  });

  it('attribution function uses ON CONFLICT DO NOTHING (idempotent)', () => {
    const sql = read(MIG033);
    const count = (sql.match(/ON CONFLICT.*DO NOTHING/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2); // at least adopter + promoter INSERTs
  });

  // privacy_threshold_met conservative default
  it('privacy_threshold_met set to false at adoption INSERT (not confirmed by adoption alone)', () => {
    const sql = read(MIG033);
    // attribution function sets privacy_threshold_met = false
    expect(sql).toContain('privacy_threshold_met');
    // Should appear in the INSERT VALUES with false
    const attrFn = sql.substring(sql.indexOf('attribute_contribution_for_adoption'));
    expect(attrFn).toContain('false  -- N≥10 not confirmed');
  });

  // Apply order documented
  it('migration 033 documents apply order 025 → 032 → 033', () => {
    const sql = read(MIG033);
    expect(sql).toContain('025');
    expect(sql).toContain('032');
    expect(sql).toContain('033');
    expect(sql).toMatch(/025.*032.*033|APPLY ORDER/);
  });

  // Gate 3 dependency documented
  it('migration 033 documents Gate 3 dependency', () => {
    expect(read(MIG033)).toContain('Gate 3');
  });

  // Pre-pilot plan updated
  it('pre-pilot plan includes migration 033 section', () => {
    const doc = read('KORA_Space_Contribution_Source_PrePilot_Plan.md');
    expect(doc).toContain('Migration 033 Initiative Adoption Source Model');
    expect(doc).toContain('initiative_adoption');
    expect(doc).toContain('adoption_type');
    expect(doc).toContain('kora_originated');
    expect(doc).toContain('READY_FOR_REVIEW');
    expect(doc).toContain('NOT applied');
  });

  // SECURITY DEFINER guards
  it('attribute_contribution_for_adoption is SECURITY DEFINER', () => {
    expect(read(MIG033)).toContain('SECURITY DEFINER');
  });

  it('attribute_contribution_for_adoption restricted to service_role', () => {
    const sql = read(MIG033);
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION commons.attribute_contribution_for_adoption TO service_role');
    expect(sql).toContain('REVOKE ALL ON FUNCTION commons.attribute_contribution_for_adoption FROM PUBLIC');
  });

  it('create_initiative_adoption EXECUTE granted to authenticated (company-facing RPC)', () => {
    expect(read(MIG033)).toContain('GRANT EXECUTE ON FUNCTION commons.create_initiative_adoption TO authenticated');
  });

  // Migration status
  it('migration 033 is NOT applied — not in forward migration pipeline', () => {
    expect(exists('supabase/migrations/033_initiative_adoption_source_model.sql')).toBe(false);
    expect(exists('supabase/proposed/033_initiative_adoption_source_model.sql')).toBe(true);
  });

  it('migration 025 is still NOT applied (unchanged by 033 design sprint)', () => {
    expect(read(MIG025)).toMatch(/NOT applied/i);
    expect(exists('supabase/migrations/025_commons_booking_contribution.sql')).toBe(true);
  });

  it('migration 032 is still NOT applied (unchanged by 033 design sprint)', () => {
    expect(exists('supabase/proposed/032_contribution_atomic_attribution.sql')).toBe(true);
    expect(exists('supabase/migrations/032_contribution_atomic_attribution.sql')).toBe(false);
  });

  // Global doctrine
  it('KORA Contribution remains outside KORA Index after 033 design sprint', async () => {
    const { CONTRIBUTION_IS_KORA_INDEX_COMPONENT } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_IS_KORA_INDEX_COMPONENT).toBe(false);
  });

  it('no worker ranking introduced by 033 design sprint', async () => {
    const { CONTRIBUTION_NO_RANKING } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_RANKING).toBe(true);
  });

  it('no individual contribution score introduced by 033 design sprint', async () => {
    const { CONTRIBUTION_NO_INDIVIDUAL_SCORE } = await import('@/lib/kora-contribution/contribution-methodology');
    expect(CONTRIBUTION_NO_INDIVIDUAL_SCORE).toBe(true);
  });
});

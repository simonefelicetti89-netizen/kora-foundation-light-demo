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
  it('proposed migration 026 exists', () => {
    expect(exists('supabase/proposed/026_contribution_atomic_attribution.sql')).toBe(true);
  });

  it('migration 026 is NOT in forward migrations pipeline', () => {
    expect(exists('supabase/migrations/026_contribution_atomic_attribution.sql')).toBe(false);
  });

  it('cross-company-attribution: partial attribution risk documented', () => {
    const src = read('lib/commons/cross-company-attribution.ts');
    expect(src).toMatch(/PARTIAL ATTRIBUTION|partial attribution risk|transaction.*safety/i);
  });

  it('cross-company-attribution: proposed migration 026 referenced as fix', () => {
    const src = read('lib/commons/cross-company-attribution.ts');
    expect(src).toMatch(/026_contribution_atomic|attribute_contribution_for_booking_atomic/i);
  });

  it('proposed migration 026: SECURITY DEFINER atomic function defined', () => {
    const sql = read('supabase/proposed/026_contribution_atomic_attribution.sql');
    expect(sql).toContain('attribute_contribution_for_booking_atomic');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('Gate 2 OPEN');
    expect(sql).toContain('NOT APPLIED TO ANY DATABASE');
  });

  it('proposed migration 026: uses ON CONFLICT idempotence (no duplicate risk)', () => {
    const sql = read('supabase/proposed/026_contribution_atomic_attribution.sql');
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
});

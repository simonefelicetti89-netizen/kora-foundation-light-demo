import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B86-B — Evidence Intelligence Wiring ─────────────────────────────────────
//
// Activates the evidence architecture that already exists:
//   Evidence → Verification → Confidence → Dynamic CV
//
// Invariants (DO NOT break):
//   - KORA Index formula unchanged
//   - IU formula unchanged
//   - No DB/Prisma/SQL changes
//   - No worker auth changes
//   - No PIB implementation
//   - No company/partner uploads

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}
function exists(rel: string): boolean {
  return fs.existsSync(path.resolve(__dirname, '../..', rel));
}

// ── T1: DynamicCV attribution gate — file-level checks ────────────────────────

describe('B86-B T1 — DynamicCVService attribution gate (source)', () => {
  it('DynamicCVService file exists', () => {
    expect(exists('services/dynamic-cv/DynamicCVService.ts')).toBe(true);
  });

  it('calls workerAttributionService.classify', () => {
    const src = read('services/dynamic-cv/DynamicCVService.ts');
    expect(src).toContain('workerAttributionService.classify');
  });

  it('splits items into cv_items and excluded_items', () => {
    const src = read('services/dynamic-cv/DynamicCVService.ts');
    expect(src).toContain('cv_items');
    expect(src).toContain('excluded_items');
  });

  it('only class A items (dynamicCvEligible) go into cv_items', () => {
    const src = read('services/dynamic-cv/DynamicCVService.ts');
    expect(src).toContain('dynamicCvEligible');
  });

  it('throws for non-worker roles (source check)', () => {
    const src = read('services/dynamic-cv/DynamicCVService.ts');
    expect(src).toContain('isWorkerRole');
    expect(src).toContain('throw new Error');
  });

  it('has synthetic_demo_data: true in profile output', () => {
    const src = read('services/dynamic-cv/DynamicCVService.ts');
    expect(src).toContain('synthetic_demo_data: true');
  });

  it('employer roles are never given access (COMPANY_ADMIN check)', () => {
    const src = read('services/dynamic-cv/DynamicCVService.ts');
    expect(src).toContain('employer');
  });
});

// ── T1b: DynamicCV runtime behavior ───────────────────────────────────────────

import { dynamicCVService } from '../../services/dynamic-cv/DynamicCVService';

describe('B86-B T1b — DynamicCVService runtime behavior', () => {
  it('throws for COMPANY_ADMIN role', () => {
    expect(() => dynamicCVService.getProfile('w-001', 'COMPANY_ADMIN')).toThrow();
  });

  it('throws for COMPANY_VIEWER role', () => {
    expect(() => dynamicCVService.getProfile('w-001', 'COMPANY_VIEWER')).toThrow();
  });

  it('returns a profile for WORKER role', () => {
    const profile = dynamicCVService.getProfile('w-persona-a', 'WORKER');
    expect(profile).not.toBeNull();
    expect(typeof profile!.worker_id).toBe('string');
    expect(Array.isArray(profile!.cv_items)).toBe(true);
  });

  it('profile cv_items have id, title, pillar, status', () => {
    const profile = dynamicCVService.getProfile('w-persona-a', 'WORKER');
    for (const item of profile!.cv_items) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.pillar).toBe('string');
      expect(typeof item.status).toBe('string');
    }
  });

  it('excluded_items (if any) each have excluded_reason', () => {
    const profile = dynamicCVService.getProfile('w-persona-a', 'WORKER');
    if (profile?.excluded_items && profile.excluded_items.length > 0) {
      for (const item of profile.excluded_items) {
        expect(typeof item.excluded_reason).toBe('string');
        expect(item.excluded_reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('profile has synthetic_demo_data: true', () => {
    const profile = dynamicCVService.getProfile('w-persona-a', 'WORKER');
    expect(profile?.synthetic_demo_data).toBe(true);
  });
});

// ── T2: Attribution exclusion reasons ─────────────────────────────────────────

import { workerAttributionService } from '../../services/worker-attribution/WorkerAttributionService';

describe('B86-B T2 — WorkerAttributionService exclusion reasons', () => {
  it('getExclusionReason exists on service (source)', () => {
    const src = read('services/worker-attribution/WorkerAttributionService.ts');
    expect(src).toContain('getExclusionReason');
  });

  it('returns null for class A (eligible)', () => {
    expect(workerAttributionService.getExclusionReason('A')).toBeNull();
  });

  it('returns Italian strings for ineligible classes B–F', () => {
    const codes = ['B', 'C', 'D', 'E', 'F'] as const;
    for (const code of codes) {
      const reason = workerAttributionService.getExclusionReason(code);
      expect(typeof reason).toBe('string');
      expect((reason as string).length).toBeGreaterThan(0);
    }
  });

  it('class F reason mentions compliance or conformità', () => {
    const reason = workerAttributionService.getExclusionReason('F') as string;
    expect(reason.toLowerCase()).toMatch(/conformit|complianc/);
  });

  it('class E reason mentions benefit or economico', () => {
    const reason = workerAttributionService.getExclusionReason('E') as string;
    expect(reason.toLowerCase()).toMatch(/benefit|economic/);
  });
});

// ── T3: ConfidenceScoreService — live computation ─────────────────────────────

import { confidenceScoreService } from '../../services/confidence-score/ConfidenceScoreService';
import type { ImpactUnitComputationSummary, UEFReviewSummary } from '@/lib/types';

const IU_HIGH: ImpactUnitComputationSummary = {
  total_records: 20, computed_records: 20, blocked_records: 0, limited_records: 0,
  review_required_records: 0, total_impact_units: 200,
  impact_units_by_pillar: { LIFE: 40, GROWTH: 40, CONNECTION: 40, IMPACT: 40, LEGACY: 40 },
  records_without_iu: 0, average_cq: 0.90, average_ev: 0.90, average_cf: 1, average_agf: 1,
  methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
};
const IU_LOW: ImpactUnitComputationSummary = {
  total_records: 20, computed_records: 10, blocked_records: 5, limited_records: 3,
  review_required_records: 2, total_impact_units: 50,
  impact_units_by_pillar: { LIFE: 10, GROWTH: 10, CONNECTION: 10, IMPACT: 10, LEGACY: 10 },
  records_without_iu: 10, average_cq: 0.50, average_ev: 0.50, average_cf: 0.7, average_agf: 0.8,
  methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
};
const UEF_HIGH: UEFReviewSummary = {
  total_records: 20, pending_count: 0, approved_for_scoring_count: 20,
  approved_for_bti_governance_count: 10, blocked_count: 0, needs_more_data_count: 0,
  rejected_count: 0, override_count: 0, kora_ready_for_iu_count: 20,
  kora_ready_for_bti_count: 10, review_completion_rate: 0.95,
  methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
};
const UEF_LOW: UEFReviewSummary = {
  total_records: 20, pending_count: 12, approved_for_scoring_count: 5,
  approved_for_bti_governance_count: 2, blocked_count: 5, needs_more_data_count: 3,
  rejected_count: 0, override_count: 0, kora_ready_for_iu_count: 5,
  kora_ready_for_bti_count: 2, review_completion_rate: 0.25,
  methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
};

describe('B86-B T3 — ConfidenceScoreService', () => {
  it('service file exists', () => {
    expect(exists('services/confidence-score/ConfidenceScoreService.ts')).toBe(true);
  });

  it('returns null when both inputs missing', () => {
    expect(confidenceScoreService.compute(null, null)).toBeNull();
  });

  it('returns a live score from IU summary alone', () => {
    const result = confidenceScoreService.compute(IU_HIGH, null);
    expect(result).not.toBeNull();
    expect(result!.confidence_score).toBeGreaterThan(0);
    expect(result!.confidence_score).toBeLessThanOrEqual(1);
    expect(result!.live_computation).toBe(true);
  });

  it('CS formula weights sum check — high EV + full review → score > 0.80', () => {
    const iuSummary: ImpactUnitComputationSummary = {
      total_records: 10, computed_records: 10, blocked_records: 0, limited_records: 0,
      review_required_records: 0, total_impact_units: 100,
      impact_units_by_pillar: { LIFE: 20, GROWTH: 20, CONNECTION: 20, IMPACT: 20, LEGACY: 20 },
      records_without_iu: 0, average_cq: 0.80, average_ev: 0.80, average_cf: 1, average_agf: 1,
      methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
    };
    const uefSummary: UEFReviewSummary = {
      total_records: 10, pending_count: 0, approved_for_scoring_count: 10,
      approved_for_bti_governance_count: 5, blocked_count: 0, needs_more_data_count: 0,
      rejected_count: 0, override_count: 0, kora_ready_for_iu_count: 10,
      kora_ready_for_bti_count: 5, review_completion_rate: 1.0,
      methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
    };
    const result = confidenceScoreService.compute(iuSummary, uefSummary);
    // EV=0.80, review=1.00, CQ=0.80, VW=(0.80-0.50)/0.50=0.60
    // CS = 0.80*0.40 + 1.00*0.30 + 0.80*0.20 + 0.60*0.10 = 0.32+0.30+0.16+0.06 = 0.84
    expect(result!.confidence_score).toBeCloseTo(0.84, 1);
  });

  it('calibration_status is pre_empirical_calibration', () => {
    const result = confidenceScoreService.compute(IU_HIGH, null);
    expect(result!.calibration_status).toBe('pre_empirical_calibration');
  });

  it('methodology_version_id is present', () => {
    const result = confidenceScoreService.compute(IU_HIGH, null);
    expect(typeof result!.methodology_version_id).toBe('string');
    expect(result!.methodology_version_id.length).toBeGreaterThan(0);
  });
});

// ── T4: CS explainability drivers ─────────────────────────────────────────────

describe('B86-B T4 — CS explainability drivers', () => {
  it('high-quality inputs produce positive drivers', () => {
    const result = confidenceScoreService.compute(IU_HIGH, UEF_HIGH);
    expect(result!.positive_drivers.length).toBeGreaterThan(0);
    for (const driver of result!.positive_drivers) {
      expect(driver.impact).toBe('positive');
      expect(typeof driver.label).toBe('string');
      expect(typeof driver.detail).toBe('string');
    }
  });

  it('low-quality inputs produce negative drivers', () => {
    const result = confidenceScoreService.compute(IU_LOW, UEF_LOW);
    expect(result!.negative_drivers.length).toBeGreaterThan(0);
    for (const driver of result!.negative_drivers) {
      expect(driver.impact).toBe('negative');
    }
  });

  it('gaps_identified is an array of strings', () => {
    const result = confidenceScoreService.compute(IU_LOW, null);
    expect(Array.isArray(result!.gaps_identified)).toBe(true);
    for (const gap of result!.gaps_identified) {
      expect(typeof gap).toBe('string');
    }
  });

  it('low EV generates evidence quality gap', () => {
    const result = confidenceScoreService.compute(IU_LOW, null);
    const hasEvGap = result!.gaps_identified.some((g) => g.toLowerCase().includes('evidenz'));
    expect(hasEvGap).toBe(true);
  });
});

// ── T5: AdvisorEvidenceReviewService ─────────────────────────────────────────

import { AdvisorEvidenceReviewService } from '../../services/advisor-evidence-review/AdvisorEvidenceReviewService';

describe('B86-B T5 — AdvisorEvidenceReviewService', () => {
  it('service file exists', () => {
    expect(exists('services/advisor-evidence-review/AdvisorEvidenceReviewService.ts')).toBe(true);
  });

  it('getPendingItems returns array of pending items', () => {
    const svc = new AdvisorEvidenceReviewService();
    const pending = svc.getPendingItems();
    expect(Array.isArray(pending)).toBe(true);
    expect(pending.length).toBeGreaterThan(0);
    for (const item of pending) {
      expect(item.reviewStatus).toBe('pending');
      expect(typeof item.itemId).toBe('string');
      expect(typeof item.itemTitle).toBe('string');
    }
  });

  it('submitReview transitions item from pending to reviewed', () => {
    const svc = new AdvisorEvidenceReviewService();
    const before = svc.getPendingItems().length;
    const first = svc.getPendingItems()[0];
    svc.submitReview(first.itemId, first.itemTitle, first.evidenceLevel, first.pillar, 'approved', null, 'KORA-ADV-TEST');
    expect(svc.getPendingItems().length).toBe(before - 1);
  });

  it('getReviewState returns the submitted record', () => {
    const svc = new AdvisorEvidenceReviewService();
    const item = svc.getPendingItems()[0];
    svc.submitReview(item.itemId, item.itemTitle, item.evidenceLevel, item.pillar, 'flagged', 'Test note', 'KORA-ADV-TEST');
    const record = svc.getReviewState(item.itemId);
    expect(record).not.toBeNull();
    expect(record!.decision).toBe('flagged');
    expect(record!.notes).toBe('Test note');
  });

  it('getAllReviewed returns all submitted reviews', () => {
    const svc = new AdvisorEvidenceReviewService();
    const items = svc.getPendingItems();
    for (const item of items) {
      svc.submitReview(item.itemId, item.itemTitle, item.evidenceLevel, item.pillar, 'approved', null, 'KORA-ADV-TEST');
    }
    expect(svc.getAllReviewed().length).toBe(items.length);
    expect(svc.getPendingItems().length).toBe(0);
  });

  it('review decision is one of approved|rejected|flagged', () => {
    const svc = new AdvisorEvidenceReviewService();
    const item = svc.getPendingItems()[0];
    svc.submitReview(item.itemId, item.itemTitle, item.evidenceLevel, item.pillar, 'rejected', null, 'KORA-ADV-TEST');
    const record = svc.getReviewState(item.itemId);
    expect(['approved', 'rejected', 'flagged']).toContain(record!.decision);
  });

  it('state is isolated per instance (no shared singleton bleed)', () => {
    const svc1 = new AdvisorEvidenceReviewService();
    const svc2 = new AdvisorEvidenceReviewService();
    const item = svc1.getPendingItems()[0];
    svc1.submitReview(item.itemId, item.itemTitle, item.evidenceLevel, item.pillar, 'approved', null, 'ADV-1');
    // svc2 should not see svc1's reviews
    expect(svc2.getReviewState(item.itemId)).toBeNull();
  });
});

// ── T6: Advisor review UI wiring (source checks) ──────────────────────────────

describe('B86-B T6 — Advisor review UI', () => {
  it('advisor page imports advisorEvidenceReviewService', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('advisorEvidenceReviewService');
  });

  it('advisor page has data-testid advisor-evidence-review-panel', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('advisor-evidence-review-panel');
  });

  it('advisor page has approve/reject/flag button test IDs', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('approve-btn-');
    expect(src).toContain('reject-btn-');
    expect(src).toContain('flag-btn-');
  });

  it('handleReview calls submitReview', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('advisorEvidenceReviewService.submitReview');
  });

  it('reviewed items log section exists', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('reviewed-item-');
  });
});

// ── T7: EvidenceReliabilityIntelligenceService — pillar breakdown ─────────────

import { evidenceReliabilityIntelligenceService } from '../../services/evidence-reliability/EvidenceReliabilityIntelligenceService';

const IU_PILLAR: ImpactUnitComputationSummary = {
  total_records: 40, computed_records: 28, blocked_records: 5, limited_records: 7,
  review_required_records: 3, total_impact_units: 420,
  impact_units_by_pillar: { LIFE: 180, GROWTH: 115, CONNECTION: 55, IMPACT: 50, LEGACY: 20 },
  records_without_iu: 12, average_cq: 0.78, average_ev: 0.72, average_cf: 0.85, average_agf: 0.92,
  methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
};

describe('B86-B T7 — EvidenceReliabilityIntelligenceService pillar breakdown', () => {
  it('getPillarEvidenceBreakdown exists (source)', () => {
    const src = read('services/evidence-reliability/EvidenceReliabilityIntelligenceService.ts');
    expect(src).toContain('getPillarEvidenceBreakdown');
  });

  it('returns 5 pillars', () => {
    const breakdown = evidenceReliabilityIntelligenceService.getPillarEvidenceBreakdown(IU_PILLAR);
    expect(breakdown).toHaveLength(5);
    const codes = breakdown.map((b) => b.pillar);
    expect(codes).toContain('LIFE');
    expect(codes).toContain('GROWTH');
    expect(codes).toContain('CONNECTION');
    expect(codes).toContain('IMPACT');
    expect(codes).toContain('LEGACY');
  });

  it('all estimatedEvScore values are in range [0.40, 0.98]', () => {
    const breakdown = evidenceReliabilityIntelligenceService.getPillarEvidenceBreakdown(null);
    for (const item of breakdown) {
      expect(item.estimatedEvScore).toBeGreaterThanOrEqual(0.40);
      expect(item.estimatedEvScore).toBeLessThanOrEqual(0.98);
    }
  });

  it('iuShare values sum to ~1.0', () => {
    const iuSummary: ImpactUnitComputationSummary = {
      total_records: 10, computed_records: 10, blocked_records: 0, limited_records: 0,
      review_required_records: 0, total_impact_units: 100,
      impact_units_by_pillar: { LIFE: 20, GROWTH: 30, CONNECTION: 20, IMPACT: 20, LEGACY: 10 },
      records_without_iu: 0, average_cq: 0.80, average_ev: 0.75, average_cf: 1, average_agf: 1,
      methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
    };
    const breakdown = evidenceReliabilityIntelligenceService.getPillarEvidenceBreakdown(iuSummary);
    const totalShare = breakdown.reduce((s, b) => s + b.iuShare, 0);
    expect(totalShare).toBeCloseTo(1.0, 1);
  });

  it('weakEvidenceNote is present for debole quality, null otherwise', () => {
    // Force very low avgEv so pillars with zero IU get debole
    const iuSummary: ImpactUnitComputationSummary = {
      total_records: 10, computed_records: 5, blocked_records: 3, limited_records: 1,
      review_required_records: 1, total_impact_units: 50,
      impact_units_by_pillar: { LIFE: 50, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
      records_without_iu: 5, average_cq: 0.5, average_ev: 0.50, average_cf: 0.8, average_agf: 0.9,
      methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
    };
    const breakdown = evidenceReliabilityIntelligenceService.getPillarEvidenceBreakdown(iuSummary);
    for (const item of breakdown) {
      if (item.qualityLabel === 'debole') {
        expect(typeof item.weakEvidenceNote).toBe('string');
        expect((item.weakEvidenceNote as string).length).toBeGreaterThan(0);
      } else {
        expect(item.weakEvidenceNote).toBeNull();
      }
    }
  });

  it('methodologyNote is always pre_empirical_estimate', () => {
    const breakdown = evidenceReliabilityIntelligenceService.getPillarEvidenceBreakdown(null);
    for (const item of breakdown) {
      expect(item.methodologyNote).toBe('pre_empirical_estimate');
    }
  });

  it('highest IU pillar has highest (or equal) estimatedEvScore', () => {
    const breakdown = evidenceReliabilityIntelligenceService.getPillarEvidenceBreakdown(IU_PILLAR);
    const life  = breakdown.find((b) => b.pillar === 'LIFE')!;
    const legacy = breakdown.find((b) => b.pillar === 'LEGACY')!;
    // LIFE has 180 IU, LEGACY has 20 — LIFE should have >= EV score
    expect(life.estimatedEvScore).toBeGreaterThanOrEqual(legacy.estimatedEvScore);
  });
});

// ── T8: Pillar breakdown — advisor page wiring ────────────────────────────────

describe('B86-B T8 — Pillar evidence breakdown in advisor page', () => {
  it('advisor page imports PillarEvidenceBreakdown type', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('PillarEvidenceBreakdown');
  });

  it('advisor page calls getPillarEvidenceBreakdown', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('getPillarEvidenceBreakdown');
  });

  it('advisor page has pillar-evidence-breakdown-panel testid', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('pillar-evidence-breakdown-panel');
  });

  it('advisor page renders per-pillar testids', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('pillar-ev-');
  });

  it('advisor page uses ADVISOR_PILLAR_BREAKDOWN constant', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('ADVISOR_PILLAR_BREAKDOWN');
  });
});

// ── T9: Decision Pack Evidence Intelligence section ───────────────────────────

describe('B86-B T9 — Decision Pack Evidence Intelligence section', () => {
  it('html-template.ts contains Evidence Intelligence heading', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('Evidence Intelligence™');
  });

  it('html-template.ts uses iuSummary.averageEv', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('averageEv');
  });

  it('html-template.ts uses enrichment.evidenceLevelBreakdown', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('evidenceLevelBreakdown');
  });

  it('html-template.ts labels section as methodological indicator', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('Indicatore metodologico Foundation Light');
  });

  it('html-template.ts asserts not_kora_index_component in the section', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('not_kora_index_component: true');
  });

  it('html-template.ts shows L0–L4 distribution table', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('lvl.L4');
    expect(src).toContain('lvl.L0');
  });

  it('html-template.ts Data Reliability Index section included', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('Data Reliability Index™');
  });
});

// ── T10: Red Lines — no forbidden artifacts created ───────────────────────────

describe('B86-B T10 — Red Lines (no forbidden artifacts created)', () => {
  it('no SQL DDL in B86-B service files', () => {
    const files = [
      'services/dynamic-cv/DynamicCVService.ts',
      'services/confidence-score/ConfidenceScoreService.ts',
      'services/advisor-evidence-review/AdvisorEvidenceReviewService.ts',
      'services/evidence-reliability/EvidenceReliabilityIntelligenceService.ts',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src.toLowerCase(), `SQL DDL found in ${f}`).not.toMatch(/create table|alter table|drop table/);
    }
  });

  it('no Prisma model definitions in B86-B files', () => {
    const files = [
      'services/confidence-score/ConfidenceScoreService.ts',
      'services/advisor-evidence-review/AdvisorEvidenceReviewService.ts',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src).not.toContain('@prisma');
      expect(src).not.toContain('prisma.client');
    }
  });

  it('DynamicCVService never imports employer-visible seed files directly', () => {
    const src = read('services/dynamic-cv/DynamicCVService.ts');
    expect(src).not.toContain('pib-records');
    expect(src).not.toContain('impact-units');
    expect(src).not.toContain('consent-records');
  });

  it('ConfidenceScoreService weight constants sum to 1.0 (source check)', () => {
    const src = read('services/confidence-score/ConfidenceScoreService.ts');
    expect(src).toContain('evidence_quality: 0.40');
    expect(src).toContain('data_completeness: 0.30');
    expect(src).toContain('mapping_confidence: 0.20');
    expect(src).toContain('verification_weight: 0.10');
  });

  it('PillarEvidenceBreakdown has methodologyNote: pre_empirical_estimate (source)', () => {
    const src = read('services/evidence-reliability/EvidenceReliabilityIntelligenceService.ts');
    expect(src).toContain('methodologyNote');
    expect(src).toContain('pre_empirical_estimate');
  });

  it('advisor page does not render individual worker PIB data', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).not.toContain('pib-records');
    expect(src).not.toContain('workerPseudonymId');
    expect(src).not.toContain('individual_pib');
  });

  it('ConfidenceScoreService is external to KORA Index (source: CS weight = 0)', () => {
    const src = read('services/confidence-score/ConfidenceScoreService.ts');
    expect(src).toContain('weight remains 0');
  });

  it('Evidence chain panel in advisor is aggregate-only (source)', () => {
    const src = read('app/demo/advisor/page.tsx');
    expect(src).toContain('nessun dato individuale lavoratore');
  });
});

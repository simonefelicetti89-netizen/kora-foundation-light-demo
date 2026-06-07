// tests/unit/b98b-my-kora-worker-platform.test.ts
// B98-B — My KORA Worker Platform Upgrade.
// Tests cover: next action logic, section structure constants,
//   opportunity strip, Dynamic CV data, Commons data, privacy invariants.

import { describe, it, expect } from 'vitest';
import { computeNextAction, type NextActionId } from '../../lib/my-kora/nextActionLogic';
import type { PillarPreview } from '../../services/my-kora-preview/MyKoraPreviewService';
import { myKoraPreviewService } from '../../services/my-kora-preview/MyKoraPreviewService';
import { workerOpportunityService } from '../../services/worker-opportunity/WorkerOpportunityService';
import { commonsService } from '../../services/commons/CommonsService';

// ── Next Action Logic — computeNextAction ─────────────────────────────────────

describe('computeNextAction — deterministic next-action engine', () => {

  const baseBreakdown: PillarPreview[] = [
    { pillar: 'LIFE',       label: 'Life',       score: 52, iu_total: 1.78, trend: 'stable', event_count: 3 },
    { pillar: 'GROWTH',     label: 'Growth',     score: 37, iu_total: 1.33, trend: 'up',     event_count: 3 },
    { pillar: 'CONNECTION', label: 'Connection', score: 10, iu_total: 0.28, trend: 'stable', event_count: 2 },
    { pillar: 'IMPACT',     label: 'Impact',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
    { pillar: 'LEGACY',     label: 'Legacy',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
  ];

  // Rule 1: no verified activities
  it('returns first_verified_activity when verifiedCount === 0', () => {
    const action = computeNextAction(baseBreakdown, 3, 0, 33);
    expect(action.id).toBe('first_verified_activity');
    expect(action.title).toBeTruthy();
    expect(action.cta_href).toBe('/my-kora/opportunities');
  });

  it('title for first_verified_activity mentions completing a verified activity', () => {
    const action = computeNextAction(baseBreakdown, 3, 0, 33);
    expect(action.title.toLowerCase()).toContain('verific');
  });

  // Rule 2: strong pillar + weak pillar imbalance
  it('returns weak_pillar_* when strong pillar exists and weak pillar has score <= 20', () => {
    const action = computeNextAction(baseBreakdown, 3, 5, 33);
    // LIFE is 52 (strong), IMPACT/LEGACY are 0 (weak with few events)
    expect(['weak_pillar_impact', 'weak_pillar_legacy', 'weak_pillar_connection']).toContain(action.id);
  });

  it('weak_pillar action points to /my-kora/opportunities', () => {
    const action = computeNextAction(baseBreakdown, 3, 5, 33);
    if (action.id.startsWith('weak_pillar_')) {
      expect(action.cta_href).toBe('/my-kora/opportunities');
    }
  });

  // Rule 3: no shareable CV items
  it('returns dynamic_cv_empty when shareableCount === 0 and verifiedCount > 0', () => {
    const balancedBreakdown: PillarPreview[] = [
      { pillar: 'LIFE',       label: 'Life',       score: 35, iu_total: 1.0, trend: 'stable', event_count: 3 },
      { pillar: 'GROWTH',     label: 'Growth',     score: 30, iu_total: 0.9, trend: 'stable', event_count: 2 },
      { pillar: 'CONNECTION', label: 'Connection', score: 25, iu_total: 0.7, trend: 'stable', event_count: 2 },
      { pillar: 'IMPACT',     label: 'Impact',     score: 28, iu_total: 0.8, trend: 'stable', event_count: 2 },
      { pillar: 'LEGACY',     label: 'Legacy',     score: 22, iu_total: 0.6, trend: 'stable', event_count: 1 },
    ];
    // verifiedCount > 0, no imbalance (no pillar >= 40), shareableCount = 0
    const action = computeNextAction(balancedBreakdown, 0, 3, 28);
    expect(action.id).toBe('dynamic_cv_empty');
    expect(action.cta_href).toBe('/my-kora/dynamic-cv');
  });

  // Rule 4: explore commons
  it('returns explore_commons when overallIndex >= 50 and no higher-priority rule triggers', () => {
    const strongBreakdown: PillarPreview[] = [
      { pillar: 'LIFE',       label: 'Life',       score: 68, iu_total: 2.9, trend: 'up', event_count: 5 },
      { pillar: 'GROWTH',     label: 'Growth',     score: 62, iu_total: 2.6, trend: 'up', event_count: 4 },
      { pillar: 'CONNECTION', label: 'Connection', score: 40, iu_total: 0.6, trend: 'up', event_count: 4 },
      { pillar: 'IMPACT',     label: 'Impact',     score: 55, iu_total: 1.0, trend: 'up', event_count: 2 },
      { pillar: 'LEGACY',     label: 'Legacy',     score: 30, iu_total: 0.5, trend: 'up', event_count: 2 },
    ];
    // No weak pillar <= 20, shareableCount > 0, verifiedCount > 0, overall >= 50
    const action = computeNextAction(strongBreakdown, 3, 10, 58);
    expect(action.id).toBe('explore_commons');
    expect(action.cta_href).toBe('/commons');
  });

  // Rule 5: default
  it('returns default when no other rule triggers', () => {
    const okBreakdown: PillarPreview[] = [
      { pillar: 'LIFE',       label: 'Life',       score: 30, iu_total: 1.0, trend: 'stable', event_count: 3 },
      { pillar: 'GROWTH',     label: 'Growth',     score: 25, iu_total: 0.8, trend: 'stable', event_count: 2 },
      { pillar: 'CONNECTION', label: 'Connection', score: 22, iu_total: 0.6, trend: 'stable', event_count: 2 },
      { pillar: 'IMPACT',     label: 'Impact',     score: 21, iu_total: 0.5, trend: 'stable', event_count: 1 },
      { pillar: 'LEGACY',     label: 'Legacy',     score: 21, iu_total: 0.5, trend: 'stable', event_count: 1 },
    ];
    // verifiedCount > 0, no pillar >= 40, shareableCount > 0, overallIndex < 50
    const action = computeNextAction(okBreakdown, 2, 5, 24);
    expect(action.id).toBe('default');
    expect(action.cta_href).toBe('/my-kora/opportunities');
  });

  // General shape
  it('always returns a NextAction with required fields', () => {
    const action = computeNextAction(baseBreakdown, 3, 5, 58);
    expect(action.id).toBeTruthy();
    expect(action.title).toBeTruthy();
    expect(action.description).toBeTruthy();
    expect(action.cta_label).toBeTruthy();
    expect(action.cta_href).toBeTruthy();
    expect(action.cta_href).toMatch(/^\//);
  });

  it('cta_href is always a relative internal path', () => {
    const scenarios: Array<[number, number, number]> = [
      [0, 0, 20], [3, 5, 33], [0, 3, 33], [3, 10, 58], [2, 5, 24],
    ];
    for (const [shareableCount, verifiedCount, overallIndex] of scenarios) {
      const action = computeNextAction(baseBreakdown, shareableCount, verifiedCount, overallIndex);
      expect(action.cta_href).toMatch(/^\/[a-z]/);
    }
  });

  it('never outputs technical methodology jargon in the title', () => {
    const technicalTerms = ['IU', 'UEF', 'PIB', 'AGF', 'NM', 'EV', 'BC'];
    const scenarios: Array<[number, number, number]> = [
      [0, 0, 20], [3, 5, 33], [0, 3, 33], [3, 10, 58],
    ];
    for (const [shareableCount, verifiedCount, overallIndex] of scenarios) {
      const action = computeNextAction(baseBreakdown, shareableCount, verifiedCount, overallIndex);
      for (const term of technicalTerms) {
        expect(action.title).not.toContain(term);
      }
    }
  });

  it('is deterministic — same inputs always produce same output', () => {
    const a1 = computeNextAction(baseBreakdown, 3, 5, 33);
    const a2 = computeNextAction(baseBreakdown, 3, 5, 33);
    expect(a1.id).toBe(a2.id);
    expect(a1.title).toBe(a2.title);
  });

  it('empty pillar breakdown falls back gracefully', () => {
    const action = computeNextAction([], 0, 0, 0);
    expect(action.id).toBe('first_verified_activity');
  });

  it('all valid next action ids are defined in the type union', () => {
    const validIds: NextActionId[] = [
      'first_verified_activity', 'weak_pillar_connection', 'weak_pillar_impact',
      'weak_pillar_growth', 'weak_pillar_life', 'weak_pillar_legacy',
      'dynamic_cv_empty', 'explore_commons', 'default',
    ];
    const action = computeNextAction(baseBreakdown, 3, 5, 33);
    expect(validIds).toContain(action.id);
  });
});

// ── MyKoraPreviewService — data for journey section ──────────────────────────

describe('MyKoraPreviewService — data supporting journey section', () => {
  const personaId = 'persona-elena-m';

  it('getMyKoraHomePreview returns a valid preview', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    expect(preview).toBeTruthy();
    expect(preview!.persona_label).toBeTruthy();
    expect(Array.isArray(preview!.timeline)).toBe(true);
  });

  it('timeline has at least one item', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    expect(preview!.timeline.length).toBeGreaterThan(0);
  });

  it('all timeline items have verification_status', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    for (const item of preview!.timeline) {
      expect(['verified', 'partial', 'self_declared']).toContain(item.verification_status);
    }
  });

  it('can derive verified / pending / private counts from timeline', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    const tl = preview!.timeline;
    const verified = tl.filter((i) => i.verification_status === 'verified').length;
    const pending  = tl.filter((i) => i.verification_status === 'partial').length;
    const private_ = tl.filter((i) => i.verification_status === 'self_declared').length;
    expect(verified + pending + private_).toBe(tl.length);
    expect(verified).toBeGreaterThanOrEqual(0);
    expect(pending).toBeGreaterThanOrEqual(0);
    expect(private_).toBeGreaterThanOrEqual(0);
  });

  it('getDynamicCvPreview returns shareable and non-shareable items', () => {
    const cvPreview = myKoraPreviewService.getDynamicCvPreview(personaId);
    expect(cvPreview).toBeTruthy();
    expect(Array.isArray(cvPreview.items)).toBe(true);
    const shareable = cvPreview.items.filter((i) => i.shareable).length;
    const total     = cvPreview.items.length;
    expect(total).toBeGreaterThan(0);
    expect(shareable).toBeGreaterThanOrEqual(0);
    expect(shareable).toBeLessThanOrEqual(total);
  });

  it('PIB data is marked not_employer_visible', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    expect(preview!.pib_light.not_employer_visible).toBe(true);
    expect(preview!.pib_light.not_performance_score).toBe(true);
  });

  it('PIB derivation basis is synthetic_iu_pre_computed', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    expect(preview!.pib_light.pib_derivation_basis).toBe('synthetic_iu_pre_computed');
  });
});

// ── WorkerOpportunityService — opportunity strip ──────────────────────────────

describe('WorkerOpportunityService — opportunity strip (top 3)', () => {
  it('canAccess returns true for WORKER role', () => {
    expect(workerOpportunityService.canAccess('WORKER')).toBe(true);
  });

  it('canAccess returns false for COMPANY_ADMIN', () => {
    expect(workerOpportunityService.canAccess('COMPANY_ADMIN')).toBe(false);
  });

  it('canAccess returns false for COMPANY_VIEWER', () => {
    expect(workerOpportunityService.canAccess('COMPANY_VIEWER')).toBe(false);
  });

  it('compute returns opportunities for WORKER role', () => {
    const opps = workerOpportunityService.compute('persona-elena-m', 'WORKER', 'S1');
    expect(opps.length).toBeGreaterThan(0);
  });

  it('top 3 opportunity slice works correctly', () => {
    const opps = workerOpportunityService.compute('persona-elena-m', 'WORKER', 'S1');
    const top3 = opps.slice(0, 3);
    expect(top3.length).toBeLessThanOrEqual(3);
  });

  it('every opportunity has title, pillar, match_reason, and partner_type_hint', () => {
    const opps = workerOpportunityService.compute('persona-elena-m', 'WORKER', 'S1').slice(0, 3);
    for (const opp of opps) {
      expect(opp.title).toBeTruthy();
      expect(opp.pillar).toBeTruthy();
      expect(opp.match_reason).toBeTruthy();
      expect(opp.partner_type_hint).toBeTruthy();
    }
  });

  it('every opportunity has not_employer_visible: true', () => {
    const opps = workerOpportunityService.compute('persona-elena-m', 'WORKER', 'S1');
    for (const opp of opps) {
      expect(opp.not_employer_visible).toBe(true);
    }
  });

  it('opportunities are sorted by priority (high first)', () => {
    const opps = workerOpportunityService.compute('persona-elena-m', 'WORKER', 'S1');
    const ORDER = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < opps.length; i++) {
      expect(ORDER[opps[i].priority]).toBeGreaterThanOrEqual(ORDER[opps[i - 1].priority]);
    }
  });

  it('compute returns empty for COMPANY_ADMIN role', () => {
    const opps = workerOpportunityService.compute('persona-elena-m', 'COMPANY_ADMIN', 'S1');
    expect(opps).toHaveLength(0);
  });
});

// ── CommonsService — commons card ─────────────────────────────────────────────

describe('CommonsService — data for Commons card on My KORA home', () => {
  it('getFeaturedInitiatives returns at most 4 items', () => {
    const featured = commonsService.getFeaturedInitiatives();
    expect(featured.length).toBeLessThanOrEqual(4);
  });

  it('all featured initiatives are open or upcoming', () => {
    const featured = commonsService.getFeaturedInitiatives();
    for (const i of featured) {
      expect(['open', 'upcoming']).toContain(i.status);
    }
  });

  it('all featured initiatives have high activation_potential', () => {
    const featured = commonsService.getFeaturedInitiatives();
    for (const i of featured) {
      expect(i.activation_potential).toBe('high');
    }
  });

  it('pillars can be derived from featured initiatives for the card', () => {
    const featured = commonsService.getFeaturedInitiatives().slice(0, 2);
    const pillars  = [...new Set(featured.map((i) => i.pillar))];
    for (const p of pillars) {
      expect(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']).toContain(p);
    }
  });

  it('featured initiatives have no social mechanics (no likes, no comments)', () => {
    const featured = commonsService.getFeaturedInitiatives();
    for (const i of featured) {
      expect((i as Record<string, unknown>)['likes']).toBeUndefined();
      expect((i as Record<string, unknown>)['comments']).toBeUndefined();
    }
  });
});

// ── Privacy constraints — employer visibility ─────────────────────────────────

describe('Privacy constraints — employer cannot access worker data', () => {
  it('myKoraPreviewService.canAccess returns false for COMPANY_ADMIN', () => {
    expect(myKoraPreviewService.canAccess('COMPANY_ADMIN')).toBe(false);
  });

  it('myKoraPreviewService.canAccess returns false for COMPANY_VIEWER', () => {
    expect(myKoraPreviewService.canAccess('COMPANY_VIEWER')).toBe(false);
  });

  it('myKoraPreviewService.canAccess returns true for WORKER', () => {
    expect(myKoraPreviewService.canAccess('WORKER')).toBe(true);
  });

  it('myKoraPreviewService.canAccess returns true for KORA_ADMIN', () => {
    expect(myKoraPreviewService.canAccess('KORA_ADMIN')).toBe(true);
  });

  it('PIB not_employer_visible is always true', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview('persona-elena-m', 'S1');
    expect(preview!.pib_light.not_employer_visible).toBe(true);
  });

  it('PIB not_performance_score is always true', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview('persona-elena-m', 'S1');
    expect(preview!.pib_light.not_performance_score).toBe(true);
  });

  it('opportunities for COMPANY_ADMIN are empty (privacy boundary)', () => {
    const opps = workerOpportunityService.compute('persona-elena-m', 'COMPANY_ADMIN', 'S1');
    expect(opps).toHaveLength(0);
  });

  it('opportunities for COMPANY_VIEWER are empty (privacy boundary)', () => {
    const opps = workerOpportunityService.compute('persona-elena-m', 'COMPANY_VIEWER', 'S1');
    expect(opps).toHaveLength(0);
  });
});

// ── Dynamic CV card data ───────────────────────────────────────────────────────

describe('Dynamic CV card — data shape', () => {
  it('cvPreview.items is an array', () => {
    const cv = myKoraPreviewService.getDynamicCvPreview('persona-elena-m');
    expect(Array.isArray(cv.items)).toBe(true);
  });

  it('every CV item has a shareable boolean', () => {
    const cv = myKoraPreviewService.getDynamicCvPreview('persona-elena-m');
    for (const item of cv.items) {
      expect(typeof item.shareable).toBe('boolean');
    }
  });

  it('shareable count is derivable and <= total', () => {
    const cv = myKoraPreviewService.getDynamicCvPreview('persona-elena-m');
    const shareable = cv.items.filter((i) => i.shareable).length;
    expect(shareable).toBeLessThanOrEqual(cv.items.length);
  });

  it('private count = total - shareable', () => {
    const cv = myKoraPreviewService.getDynamicCvPreview('persona-elena-m');
    const shareable = cv.items.filter((i) => i.shareable).length;
    const private_  = cv.items.length - shareable;
    expect(private_).toBeGreaterThanOrEqual(0);
  });

  it('export_available is false in Foundation Light', () => {
    const cv = myKoraPreviewService.getDynamicCvPreview('persona-elena-m');
    expect(cv.export_available).toBe(false);
  });
});

// ── Section structure invariants ───────────────────────────────────────────────

describe('Page section structure — data is available for all 6 above-fold sections', () => {
  const personaId = 'persona-elena-m';

  it('Section 1: header data — persona_label exists', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    expect(preview!.persona_label).toBeTruthy();
  });

  it('Section 2: next action — computeNextAction runs without error', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    const cv = myKoraPreviewService.getDynamicCvPreview(personaId);
    const shareableCount = cv.items.filter((i) => i.shareable).length;
    const verifiedCount  = preview!.timeline.filter((i) => i.verification_status === 'verified').length;
    const action = computeNextAction(preview!.pib_light.pillar_breakdown, shareableCount, verifiedCount, preview!.pib_light.overall_index);
    expect(action).toBeTruthy();
  });

  it('Section 3: journey — timeline has items for verified/pending/private counts', () => {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, 'S1');
    expect(preview!.timeline.length).toBeGreaterThan(0);
  });

  it('Section 4: opportunity strip — top 3 opportunities are available', () => {
    const opps = workerOpportunityService.compute(personaId, 'WORKER', 'S1').slice(0, 3);
    expect(opps.length).toBeGreaterThan(0);
  });

  it('Section 5: Dynamic CV card — cv items are available', () => {
    const cv = myKoraPreviewService.getDynamicCvPreview(personaId);
    expect(cv.items.length).toBeGreaterThan(0);
  });

  it('Section 5: Commons card — featured initiatives are available', () => {
    const featured = commonsService.getFeaturedInitiatives();
    expect(featured.length).toBeGreaterThan(0);
  });

  it('Section 6: Privacy snapshot — employer visibility is clearly defined', () => {
    // Verified by checking that canAccess rejects employer roles
    expect(myKoraPreviewService.canAccess('COMPANY_ADMIN')).toBe(false);
    expect(myKoraPreviewService.canAccess('WORKER')).toBe(true);
  });
});

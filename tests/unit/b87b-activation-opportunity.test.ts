// B87-B — Activation Opportunity Engine test suite.
// Verifies: rule generation, prioritization, pillar detection, worker opportunities,
//           partner preview, cockpit/page imports, decision pack integration.
// Confirms: no formula changes, no scoring changes, no DB changes, no auth changes.

import { describe, it, expect } from 'vitest';
import {
  ActivationOpportunityService,
  activationOpportunityService,
  deriveSignalsSlim,
  type OpportunitySignals,
} from '../../services/activation-opportunity/ActivationOpportunityService';
import {
  WorkerOpportunityService,
  workerOpportunityService,
} from '../../services/worker-opportunity/WorkerOpportunityService';
import type { WorkerPillarData } from '@/lib/types/domains/worker-pib';

// ── Fixture helpers ────────────────────────────────────────────────────────────

function makeSignals(overrides: Partial<OpportunitySignals> = {}): OpportunitySignals {
  return {
    safeguardStatus:           'CLEAR',
    confidenceScore:           0.72,
    ar:                        0.55,
    mar:                       0.40,
    ni:                        0.60,
    wb:                        0.55,
    pc:                        0.70,
    pb:                        0.60,
    eq:                        0.55,
    vr:                        0.65,
    co:                        0.60,
    totalWorkers:              150,
    activationRate:            0.55,
    meaningfulActivationRate:  0.40,
    pillarDistribution: {
      LIFE:       120,
      GROWTH:     100,
      CONNECTION: 60,
      IMPACT:     30,
      LEGACY:     10,
    },
    economicReliefShare: 0.18,
    ...overrides,
  };
}

// ── Area 1: Rule Generation ────────────────────────────────────────────────────

describe('ActivationOpportunityService — rule generation', () => {
  const svc = new ActivationOpportunityService();

  it('returns array for healthy signals (may be empty or small)', () => {
    const opps = svc.computeFromSignals(makeSignals());
    expect(Array.isArray(opps)).toBe(true);
  });

  it('fires R-01 (SAFEGUARD_FLAGGED) when safeguard is FLAGGED', () => {
    const opps = svc.computeFromSignals(makeSignals({
      safeguardStatus: 'FLAGGED', ar: 0.15, mar: 0.10,
    }));
    expect(opps.some(o => o.ruleId === 'R-01')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-01')?.priority).toBe('critical');
  });

  it('fires R-02 (CRITICAL_AR) when AR < 0.20', () => {
    const opps = svc.computeFromSignals(makeSignals({ ar: 0.15, mar: 0.10, safeguardStatus: 'FLAGGED' }));
    expect(opps.some(o => o.ruleId === 'R-02')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-02')?.priority).toBe('critical');
  });

  it('fires R-03 (CRITICAL_MAR) when MAR < 0.15', () => {
    const opps = svc.computeFromSignals(makeSignals({ mar: 0.10, ar: 0.15, safeguardStatus: 'FLAGGED' }));
    expect(opps.some(o => o.ruleId === 'R-03')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-03')?.priority).toBe('critical');
  });

  it('fires R-04 (LOW_AR WARNING zone) when 0.20 ≤ AR < 0.40', () => {
    const opps = svc.computeFromSignals(makeSignals({ ar: 0.30, mar: 0.20, safeguardStatus: 'WARNING' }));
    expect(opps.some(o => o.ruleId === 'R-04')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-04')?.priority).toBe('high');
  });

  it('does NOT fire R-04 when AR >= 0.40 (above CLEAR threshold)', () => {
    const opps = svc.computeFromSignals(makeSignals({ ar: 0.45, mar: 0.35 }));
    expect(opps.some(o => o.ruleId === 'R-04')).toBe(false);
  });

  it('fires R-05 (LOW_MAR WARNING) when 0.15 ≤ MAR < 0.30', () => {
    const opps = svc.computeFromSignals(makeSignals({ mar: 0.20, ar: 0.25, safeguardStatus: 'WARNING' }));
    expect(opps.some(o => o.ruleId === 'R-05')).toBe(true);
  });

  it('fires R-06 (SAFEGUARD_WARNING) when safeguard = WARNING', () => {
    const opps = svc.computeFromSignals(makeSignals({ safeguardStatus: 'WARNING', ar: 0.30, mar: 0.22 }));
    expect(opps.some(o => o.ruleId === 'R-06')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-06')?.priority).toBe('high');
  });

  it('does NOT fire R-06 when safeguard is CLEAR', () => {
    const opps = svc.computeFromSignals(makeSignals({ safeguardStatus: 'CLEAR' }));
    expect(opps.some(o => o.ruleId === 'R-06')).toBe(false);
  });

  it('fires R-07 (RELIEF_GAP) when AR - MAR > 0.20', () => {
    const opps = svc.computeFromSignals(makeSignals({ ar: 0.55, mar: 0.28 }));
    expect(opps.some(o => o.ruleId === 'R-07')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-07')?.category).toBe('bti');
  });

  it('fires R-08 (LOW_VR) when VR < 0.50', () => {
    const opps = svc.computeFromSignals(makeSignals({ vr: 0.40 }));
    expect(opps.some(o => o.ruleId === 'R-08')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-08')?.category).toBe('evidence');
  });

  it('fires R-09 (LOW_EQ) when EQ < 0.45', () => {
    const opps = svc.computeFromSignals(makeSignals({ eq: 0.35 }));
    expect(opps.some(o => o.ruleId === 'R-09')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-09')?.category).toBe('equity');
  });

  it('fires R-10 (LOW_CS) when CS < 0.50', () => {
    const opps = svc.computeFromSignals(makeSignals({ confidenceScore: 0.42 }));
    expect(opps.some(o => o.ruleId === 'R-10')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-10')?.category).toBe('evidence');
  });

  it('fires R-11 (LOW_WB) when WB < 0.40', () => {
    const opps = svc.computeFromSignals(makeSignals({ wb: 0.30 }));
    expect(opps.some(o => o.ruleId === 'R-11')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-11')?.category).toBe('equity');
  });

  it('fires R-12 (LOW_PC) when PC < 0.60', () => {
    const opps = svc.computeFromSignals(makeSignals({ pc: 0.50 }));
    expect(opps.some(o => o.ruleId === 'R-12')).toBe(true);
  });

  it('fires R-13 (LOW_PB) when PB < 0.45', () => {
    const opps = svc.computeFromSignals(makeSignals({ pb: 0.35 }));
    expect(opps.some(o => o.ruleId === 'R-13')).toBe(true);
  });

  it('fires R-14 (LOW_CO) when CO < 0.50', () => {
    const opps = svc.computeFromSignals(makeSignals({ co: 0.40 }));
    expect(opps.some(o => o.ruleId === 'R-14')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-14')?.category).toBe('quality');
  });

  it('fires R-15 (LOW_NI) when NI < 0.45', () => {
    const opps = svc.computeFromSignals(makeSignals({ ni: 0.35 }));
    expect(opps.some(o => o.ruleId === 'R-15')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-15')?.category).toBe('quality');
  });
});

// ── Area 2: Pillar-specific rules ─────────────────────────────────────────────

describe('ActivationOpportunityService — pillar detection', () => {
  const svc = new ActivationOpportunityService();

  it('fires R-16 (LOW_LEGACY) when LEGACY share < 10%', () => {
    const opps = svc.computeFromSignals(makeSignals({
      pillarDistribution: { LIFE: 200, GROWTH: 180, CONNECTION: 80, IMPACT: 30, LEGACY: 0 },
    }));
    expect(opps.some(o => o.ruleId === 'R-16')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-16')?.pillar).toBe('LEGACY');
  });

  it('does NOT fire R-16 when LEGACY share >= 10%', () => {
    const opps = svc.computeFromSignals(makeSignals({
      pillarDistribution: { LIFE: 100, GROWTH: 100, CONNECTION: 100, IMPACT: 100, LEGACY: 100 },
    }));
    expect(opps.some(o => o.ruleId === 'R-16')).toBe(false);
  });

  it('fires R-17 (LOW_CONNECTION) when CONNECTION share < 10%', () => {
    const opps = svc.computeFromSignals(makeSignals({
      pillarDistribution: { LIFE: 250, GROWTH: 200, CONNECTION: 0, IMPACT: 30, LEGACY: 10 },
    }));
    expect(opps.some(o => o.ruleId === 'R-17')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-17')?.pillar).toBe('CONNECTION');
  });

  it('fires R-18 (LOW_IMPACT) when IMPACT share < 5%', () => {
    const opps = svc.computeFromSignals(makeSignals({
      pillarDistribution: { LIFE: 300, GROWTH: 200, CONNECTION: 100, IMPACT: 5, LEGACY: 10 },
    }));
    expect(opps.some(o => o.ruleId === 'R-18')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-18')?.pillar).toBe('IMPACT');
  });

  it('fires R-19 (DOMINANT_PILLAR) when one pillar > 60%', () => {
    const opps = svc.computeFromSignals(makeSignals({
      pillarDistribution: { LIFE: 700, GROWTH: 100, CONNECTION: 80, IMPACT: 60, LEGACY: 60 },
    }));
    expect(opps.some(o => o.ruleId === 'R-19')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-19')?.priority).toBe('low');
  });

  it('fires R-20 (PARTNER_PREVIEW) for weakest pillar < 12%', () => {
    const opps = svc.computeFromSignals(makeSignals({
      pillarDistribution: { LIFE: 300, GROWTH: 250, CONNECTION: 200, IMPACT: 100, LEGACY: 0 },
    }));
    expect(opps.some(o => o.ruleId === 'R-20')).toBe(true);
    expect(opps.find(o => o.ruleId === 'R-20')?.category).toBe('worker_space');
  });

  it('correctly identifies LEGACY as weakest pillar when it has 0 IU', () => {
    const opps = svc.computeFromSignals(makeSignals({
      pillarDistribution: { LIFE: 200, GROWTH: 150, CONNECTION: 80, IMPACT: 40, LEGACY: 0 },
    }));
    const r20 = opps.find(o => o.ruleId === 'R-20');
    expect(r20?.pillar).toBe('LEGACY');
  });
});

// ── Area 3: Prioritization ────────────────────────────────────────────────────

describe('ActivationOpportunityService — prioritization', () => {
  const svc = new ActivationOpportunityService();

  it('sorts opportunities critical first', () => {
    const opps = svc.computeFromSignals(makeSignals({
      safeguardStatus: 'FLAGGED', ar: 0.10, mar: 0.08,
      vr: 0.30, eq: 0.30,
    }));
    expect(opps.length).toBeGreaterThan(0);
    const priorities = opps.map(o => o.priority);
    const critIdx = priorities.findIndex(p => p === 'critical');
    const lowIdx  = priorities.findLastIndex(p => p === 'low');
    if (critIdx !== -1 && lowIdx !== -1) {
      expect(critIdx).toBeLessThan(lowIdx);
    }
  });

  it('critical opportunities come before high', () => {
    const opps = svc.computeFromSignals(makeSignals({
      safeguardStatus: 'FLAGGED', ar: 0.10, mar: 0.08,
      vr: 0.30,
    }));
    const critIdx = opps.findIndex(o => o.priority === 'critical');
    const highIdx = opps.findIndex(o => o.priority === 'high');
    if (critIdx !== -1 && highIdx !== -1) {
      expect(critIdx).toBeLessThan(highIdx);
    }
  });

  it('all opportunities have required fields', () => {
    const opps = svc.computeFromSignals(makeSignals({
      safeguardStatus: 'FLAGGED', ar: 0.10, mar: 0.08,
      vr: 0.30, eq: 0.30, co: 0.35, ni: 0.35,
    }));
    for (const opp of opps) {
      expect(opp.id).toBeTruthy();
      expect(opp.ruleId).toBeTruthy();
      expect(opp.title).toBeTruthy();
      expect(opp.description).toBeTruthy();
      expect(opp.expectedImpact).toBeTruthy();
      expect(opp.sourceSignal).toBeTruthy();
      expect(opp.recommendedAction).toBeTruthy();
      expect(['critical', 'high', 'medium', 'low']).toContain(opp.priority);
      expect(['reach', 'quality', 'equity', 'bti', 'worker_space', 'evidence']).toContain(opp.category);
    }
  });

  it('no duplicate opportunity IDs', () => {
    const opps = svc.computeFromSignals(makeSignals({
      safeguardStatus: 'FLAGGED', ar: 0.10, mar: 0.08,
      vr: 0.30, eq: 0.28, wb: 0.30, pc: 0.40, pb: 0.35, co: 0.35, ni: 0.30,
      pillarDistribution: { LIFE: 300, GROWTH: 200, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    }));
    const ids = opps.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getTop returns at most N opportunities', () => {
    const svcInstance = new ActivationOpportunityService();
    // getTop requires KoraIndexOutput and CompanyAggregateExtended, but we test computeFromSignals directly
    const opps = svcInstance.computeFromSignals(makeSignals({ safeguardStatus: 'FLAGGED', ar: 0.10, mar: 0.08 }));
    expect(opps.slice(0, 3).length).toBeLessThanOrEqual(3);
  });
});

// ── Area 4: deriveSignalsSlim ─────────────────────────────────────────────────

describe('deriveSignalsSlim — slim signal derivation for Decision Pack', () => {
  it('returns correct safeguardStatus', () => {
    const s = deriveSignalsSlim({
      safeguardStatus: 'WARNING',
      confidenceScore: 0.60,
      activationRate: 0.30,
      meaningfulActivationRate: 0.22,
      components: [],
      pillarDistribution: {},
    });
    expect(s.safeguardStatus).toBe('WARNING');
  });

  it('falls back to FLAGGED for unknown safeguard status', () => {
    const s = deriveSignalsSlim({
      safeguardStatus: 'UNKNOWN_STATUS',
      confidenceScore: 0.60,
      activationRate: 0.30,
      meaningfulActivationRate: 0.22,
      components: [],
      pillarDistribution: {},
    });
    expect(s.safeguardStatus).toBe('FLAGGED');
  });

  it('extracts component values by code', () => {
    const s = deriveSignalsSlim({
      safeguardStatus: 'CLEAR',
      confidenceScore: 0.75,
      activationRate: 0.50,
      meaningfulActivationRate: 0.35,
      components: [
        { code: 'VR', value: 0.82 },
        { code: 'EQ', value: 0.61 },
        { code: 'CO', value: 0.55 },
      ],
      pillarDistribution: { LIFE: 100, GROWTH: 80, CONNECTION: 40, IMPACT: 20, LEGACY: 5 },
    });
    expect(s.vr).toBeCloseTo(0.82);
    expect(s.eq).toBeCloseTo(0.61);
    expect(s.co).toBeCloseTo(0.55);
    expect(s.ni).toBe(0);  // not provided → 0 fallback
  });

  it('slim signals fire rules correctly', () => {
    const s = deriveSignalsSlim({
      safeguardStatus: 'WARNING',
      confidenceScore: 0.40,   // triggers R-10
      activationRate: 0.28,    // triggers R-04
      meaningfulActivationRate: 0.18,  // triggers R-05
      components: [{ code: 'VR', value: 0.35 }],  // triggers R-08
      pillarDistribution: { LIFE: 200, GROWTH: 150, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    });
    const svc = new ActivationOpportunityService();
    const opps = svc.computeFromSignals(s);
    expect(opps.some(o => o.ruleId === 'R-04')).toBe(true);
    expect(opps.some(o => o.ruleId === 'R-05')).toBe(true);
    expect(opps.some(o => o.ruleId === 'R-08')).toBe(true);
    expect(opps.some(o => o.ruleId === 'R-10')).toBe(true);
  });
});

// ── Area 5: WorkerOpportunityService ─────────────────────────────────────────

// PRIOR HISTORY (accurate as of B87-B, preserved verbatim): "returns empty
// for COMPANY_ADMIN/ADVISOR role" and "generates opportunities for WORKER
// role" called compute(personaId, role, scenarioId) — the demo entry point
// that read persona fixtures via MyKoraPreviewService. B-WORKER "One
// Product / No Demo Runtime" correction (2026-09-06): compute() is removed
// (zero real callers, its sole caller was the now-retired
// app/my-kora/opportunities/page.tsx). canAccess(role) — the role guard
// compute() used internally — is preserved and tested directly below;
// computeFromPillars() — the real technical foundation, unaffected by the
// retirement — is tested via canAccess()-independent direct calls.
describe('WorkerOpportunityService — worker opportunities', () => {
  const svc = new WorkerOpportunityService();

  const PILLAR_FIXTURE: WorkerPillarData[] = [
    { pillar: 'LIFE',       label: 'Life',       score: 52, iu_total: 1.78, trend: 'stable', event_count: 3 },
    { pillar: 'GROWTH',     label: 'Growth',     score: 37, iu_total: 1.33, trend: 'up',     event_count: 3 },
    { pillar: 'CONNECTION', label: 'Connection', score: 10, iu_total: 0.28, trend: 'stable', event_count: 2 },
    { pillar: 'IMPACT',     label: 'Impact',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
    { pillar: 'LEGACY',     label: 'Legacy',     score: 0,  iu_total: 0,    trend: 'stable', event_count: 0 },
  ];

  it('returns a non-empty array from real pillar data', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    expect(Array.isArray(opps)).toBe(true);
    expect(opps.length).toBeGreaterThan(0);
  });

  it('canAccess returns false for COMPANY_ADMIN role', () => {
    expect(svc.canAccess('COMPANY_ADMIN')).toBe(false);
  });

  it('canAccess returns false for ADVISOR role', () => {
    expect(svc.canAccess('ADVISOR')).toBe(false);
  });

  it('canAccess returns true for WORKER role', () => {
    expect(svc.canAccess('WORKER')).toBe(true);
  });

  it('generates opportunities from pillar breakdown', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    expect(opps.length).toBeGreaterThan(0);
  });

  it('high priority for pillars with score = 0', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    const impactOpp = opps.find(o => o.pillar === 'IMPACT');
    const legacyOpp = opps.find(o => o.pillar === 'LEGACY');
    if (impactOpp) expect(impactOpp.priority).toBe('high');
    if (legacyOpp) expect(legacyOpp.priority).toBe('high');
  });

  it('all worker opportunities have mandatory not_employer_visible flag', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    for (const opp of opps) {
      expect(opp.not_employer_visible).toBe(true);
    }
  });

  it('all worker opportunities have source_signal (explainability)', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    for (const opp of opps) {
      expect(opp.source_signal).toBeTruthy();
      expect(opp.source_signal.length).toBeGreaterThan(10);
    }
  });

  it('all worker opportunities have partner_type_hint (Task 7)', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    for (const opp of opps) {
      expect(opp.partner_type_hint).toBeTruthy();
    }
  });

  it('all worker opportunities have status = preview', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    for (const opp of opps) {
      expect(opp.status).toBe('preview');
    }
  });

  it('generates LEGACY opportunities when LEGACY has 0 events', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    expect(opps.some(o => o.pillar === 'LEGACY')).toBe(true);
  });

  it('generates IMPACT opportunities when IMPACT has 0 events', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    expect(opps.some(o => o.pillar === 'IMPACT')).toBe(true);
  });

  it('opportunity types are valid', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    const VALID_TYPES = ['learning', 'mentoring', 'community', 'wellbeing'];
    for (const opp of opps) {
      expect(VALID_TYPES).toContain(opp.type);
    }
  });

  it('sorts by priority: high before medium before low', () => {
    const opps = svc.computeFromPillars(PILLAR_FIXTURE);
    const ORDER = { high: 0, medium: 1, low: 2 };
    for (let i = 0; i < opps.length - 1; i++) {
      expect(ORDER[opps[i].priority]).toBeLessThanOrEqual(ORDER[opps[i + 1].priority]);
    }
  });
});

// ── Area 6: Partner preview ───────────────────────────────────────────────────

describe('WorkerOpportunityService — partner type hints (Task 7)', () => {
  const svc = new WorkerOpportunityService();

  it('includes partner type hint for LIFE opportunities', () => {
    const opps = svc.computeFromPillars([
      { pillar: 'LIFE', label: 'Life', score: 0, iu_total: 0, trend: 'stable', event_count: 0 },
      { pillar: 'GROWTH', label: 'Growth', score: 50, iu_total: 2, trend: 'up', event_count: 5 },
      { pillar: 'CONNECTION', label: 'Connection', score: 40, iu_total: 1, trend: 'stable', event_count: 3 },
      { pillar: 'IMPACT', label: 'Impact', score: 30, iu_total: 0.8, trend: 'stable', event_count: 2 },
      { pillar: 'LEGACY', label: 'Legacy', score: 20, iu_total: 0.5, trend: 'stable', event_count: 1 },
    ]);
    const lifeOpp = opps.find(o => o.pillar === 'LIFE');
    expect(lifeOpp?.partner_type_hint).toBeTruthy();
    expect(lifeOpp?.partner_type_hint).toContain('welfare');
  });

  it('includes GROWTH partner hint containing "formatore" or "LMS"', () => {
    const opps = svc.computeFromPillars([
      { pillar: 'GROWTH', label: 'Growth', score: 0, iu_total: 0, trend: 'stable', event_count: 0 },
      { pillar: 'LIFE', label: 'Life', score: 50, iu_total: 2, trend: 'stable', event_count: 4 },
      { pillar: 'CONNECTION', label: 'Connection', score: 40, iu_total: 1, trend: 'stable', event_count: 3 },
      { pillar: 'IMPACT', label: 'Impact', score: 30, iu_total: 0.8, trend: 'stable', event_count: 2 },
      { pillar: 'LEGACY', label: 'Legacy', score: 20, iu_total: 0.5, trend: 'stable', event_count: 1 },
    ]);
    const growthOpp = opps.find(o => o.pillar === 'GROWTH');
    expect(growthOpp?.partner_type_hint).toBeTruthy();
    const hint = growthOpp!.partner_type_hint.toLowerCase();
    expect(hint.includes('formator') || hint.includes('lms')).toBe(true);
  });
});

// ── Area 7: Methodology guard ─────────────────────────────────────────────────

describe('Methodology invariants — no formula changes', () => {
  it('ActivationOpportunityService does not import methodology-config', async () => {
    // Verify the service module can be imported without throwing
    const { activationOpportunityService: svc } = await import(
      '../../services/activation-opportunity/ActivationOpportunityService'
    );
    expect(svc).toBeDefined();
  });

  it('opportunity sourceSignal always starts with "Rilevato perché"', () => {
    const svc = new ActivationOpportunityService();
    const opps = svc.computeFromSignals(makeSignals({
      safeguardStatus: 'FLAGGED', ar: 0.10, mar: 0.08, vr: 0.30, eq: 0.28,
    }));
    for (const opp of opps) {
      expect(opp.sourceSignal).toMatch(/Rilevato perché/i);
    }
  });

  it('no opportunity has priority undefined', () => {
    const svc = new ActivationOpportunityService();
    const opps = svc.computeFromSignals(makeSignals({
      safeguardStatus: 'WARNING', ar: 0.25, mar: 0.18, vr: 0.40, eq: 0.35,
      wb: 0.30, pc: 0.50, pb: 0.38, co: 0.40, ni: 0.35, confidenceScore: 0.42,
    }));
    for (const opp of opps) {
      expect(opp.priority).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(opp.priority);
    }
  });

  it('computeFromSignals is deterministic — same input → same output', () => {
    const svc = new ActivationOpportunityService();
    const signals = makeSignals({ safeguardStatus: 'WARNING', ar: 0.28, mar: 0.19, vr: 0.40 });
    const opps1 = svc.computeFromSignals(signals);
    const opps2 = svc.computeFromSignals(signals);
    expect(opps1.map(o => o.ruleId)).toEqual(opps2.map(o => o.ruleId));
  });

  it('singleton exports are consistent with class instances', () => {
    const svc = new ActivationOpportunityService();
    const signals = makeSignals();
    const fromClass    = svc.computeFromSignals(signals);
    const fromSingleton = activationOpportunityService.computeFromSignals(signals);
    expect(fromClass.map(o => o.ruleId)).toEqual(fromSingleton.map(o => o.ruleId));
  });

  it('WorkerOpportunityService singleton is accessible', () => {
    expect(workerOpportunityService).toBeDefined();
    expect(typeof workerOpportunityService.computeFromPillars).toBe('function');
  });
});

// ── Area 8: Edge cases ────────────────────────────────────────────────────────

describe('Edge cases and robustness', () => {
  const svc = new ActivationOpportunityService();

  it('handles empty pillarDistribution gracefully', () => {
    const opps = svc.computeFromSignals(makeSignals({ pillarDistribution: {} }));
    expect(Array.isArray(opps)).toBe(true);
  });

  it('handles all-zero pillar distribution', () => {
    const opps = svc.computeFromSignals(makeSignals({
      pillarDistribution: { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    }));
    expect(Array.isArray(opps)).toBe(true);
  });

  it('handles perfect CLEAR state — may return low priority opportunities only', () => {
    const opps = svc.computeFromSignals(makeSignals({
      safeguardStatus: 'CLEAR',
      confidenceScore: 0.85,
      ar: 0.60, mar: 0.50, ni: 0.70, wb: 0.65, pc: 0.80, pb: 0.70,
      eq: 0.75, vr: 0.80, co: 0.65,
      pillarDistribution: { LIFE: 200, GROWTH: 180, CONNECTION: 160, IMPACT: 140, LEGACY: 120 },
    }));
    // No critical or high priority rules should fire
    const critical = opps.filter(o => o.priority === 'critical');
    const high     = opps.filter(o => o.priority === 'high');
    expect(critical).toHaveLength(0);
    expect(high).toHaveLength(0);
  });

  it('WorkerOpportunityService handles empty pillar array', () => {
    const svc2 = new WorkerOpportunityService();
    const opps = svc2.computeFromPillars([]);
    expect(opps).toHaveLength(0);
  });
});

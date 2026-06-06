import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeExecutiveIntelligence } from '../../services/executive-intelligence/ExecutiveIntelligenceService';
import type { ExecutiveIntelligenceInputs } from '../../services/executive-intelligence/ExecutiveIntelligenceService';

// ── B77-B: Executive Intelligence Layer™ unit tests ───────────────────────────
//
// Tests verify the four-question synthesis for six execution scenarios:
//   - Fragile organization (FLAGGED safeguard)
//   - Concentrated activation (WARNING + high equity gap)
//   - High limited share (economic relief dominance)
//   - Low confidence (data quality gap)
//   - Low evidence quality (weak EV)
//   - Strong activation (CLEAR + high KI)
//
// Also verifies:
//   - notKoraIndexComponent: true on every output
//   - no formula modifications
//   - no DB calls
//   - service reads existing signals only

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── Shared test fixtures ──────────────────────────────────────────────────────

const BASE_INPUTS: ExecutiveIntelligenceInputs = {
  koraIndexValue:           55,
  safeguardStatus:          'CLEAR',
  confidenceScore:          0.70,
  activationRate:           0.52,
  meaningfulActivationRate: 0.38,
  macroblocks:              [],
  equityAccess:             null,
  evidenceReliability:      null,
  lifeDiversity:            null,
  limitedShare:             0.15,
  economicReliefShare:      0.12,
};

function makeEquityHigh() {
  return {
    eqValue: 0.28,
    companyAverageActivation: 0.45,
    segmentCount: 6,
    visibleSegmentCount: 5,
    suppressedSegmentCount: 1,
    underActivatedSegments: [
      { segmentId: 'dept-ops', segmentLabel: 'Operations', activationRate: 0.15, gapVsAverage: -0.30, status: 'under_activated' as const },
      { segmentId: 'dept-prod', segmentLabel: 'Production', activationRate: 0.18, gapVsAverage: -0.27, status: 'under_activated' as const },
    ],
    overActivatedSegments: [],
    nearParitySegments: [],
    largestGap: 0.42,
    accessRiskLevel: 'alta' as const,
    narrative: '',
    recommendations: [],
    methodologyStatus: 'pre_empirical_calibration' as const,
    notKoraIndexComponent: true as const,
  };
}

function makeEvidenceWeak() {
  return {
    dataReliabilityValue: 0.48,
    verificationRate: 0.30,
    evidenceLevelDistribution: {
      weakShare: 0.58,
      acceptableShare: 0.30,
      strongShare: 0.12,
      primaryTier: 'weak' as const,
    },
    weakEvidenceInitiativeCount: 12,
    upgradeOpportunities: [],
    strongestEvidenceAreas: [],
    evidenceRiskLevel: 'alta' as const,
    advisorNarrative: '',
    recommendations: [],
    methodologyStatus: 'pre_empirical_calibration' as const,
    notKoraIndexComponent: true as const,
  };
}

// ── Scenario 1: Fragile organization (FLAGGED) ────────────────────────────────

describe('Scenario 1 — Fragile organization (FLAGGED safeguard)', () => {

  const inputs: ExecutiveIntelligenceInputs = {
    ...BASE_INPUTS,
    koraIndexValue:           28,
    safeguardStatus:          'FLAGGED',
    activationRate:           0.14,
    meaningfulActivationRate: 0.08,
    confidenceScore:          0.52,
  };

  it('organizationStatus is "Attivazione fragile"', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.organizationStatus).toBe('Attivazione fragile');
  });

  it('primaryConstraint references the FLAGGED threshold breach', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.primaryConstraint).toContain('14%');
    expect(result.primaryConstraint.toLowerCase()).toMatch(/soglia|insufficiente|attivazione/);
  });

  it('primaryAction is reach-expansion focused', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.primaryAction.toLowerCase()).toMatch(/partecipazione|base|attivata|soglia/);
  });

  it('executiveSummary mentions "Attivazione fragile"', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.executiveSummary).toContain('Attivazione fragile');
  });

});

// ── Scenario 2: Concentrated activation (WARNING + equity alta) ───────────────

describe('Scenario 2 — Concentrated activation (WARNING + high equity gap)', () => {

  const inputs: ExecutiveIntelligenceInputs = {
    ...BASE_INPUTS,
    koraIndexValue:   42,
    safeguardStatus:  'WARNING',
    activationRate:   0.29,
    equityAccess:     makeEquityHigh(),
  };

  it('organizationStatus is "Attivazione concentrata"', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.organizationStatus).toBe('Attivazione concentrata');
  });

  it('primaryConstraint describes the segment gap', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.primaryConstraint).toContain('42');  // largestGap in pp
    expect(result.primaryConstraint.toLowerCase()).toMatch(/segmenti|sotto-attivat|gap/);
  });

  it('wasteSignal reflects the large equity gap', () => {
    const result = computeExecutiveIntelligence(inputs);
    // equity gap is 42pp — should appear in waste signal
    expect(result.wasteSignal).toContain('42');
  });

  it('primaryAction targets under-activated segments', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.primaryAction.toLowerCase()).toMatch(/segmenti|inclusivo|distribuzione|gap/);
  });

});

// ── Scenario 3: High limited share (economic relief dominance) ────────────────

describe('Scenario 3 — High limited share (economic relief dominance)', () => {

  const inputs: ExecutiveIntelligenceInputs = {
    ...BASE_INPUTS,
    safeguardStatus:  'WARNING',
    limitedShare:     0.48,
    economicReliefShare: 0.52,
  };

  it('wasteSignal uses budget framing (economicReliefShare takes priority)', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.wasteSignal).toContain('52%');
    expect(result.wasteSignal.toLowerCase()).toMatch(/budget|benefit economico|impact unit/i);
  });

  it('primaryAction targets conversion of economic relief', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.primaryAction.toLowerCase()).toMatch(/benefit monetari|conversione|eligible|economic/);
  });

  it('wasteSignal does not use the word "sprecando" or "spreco"', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.wasteSignal.toLowerCase()).not.toContain('sprec');
    expect(result.wasteSignal.toLowerCase()).not.toContain('sprecando');
    expect(result.wasteSignal.toLowerCase()).not.toContain('waste');
  });

});

// ── Scenario 4: Low confidence (data quality gap) ─────────────────────────────

describe('Scenario 4 — Low confidence (data quality gap)', () => {

  const inputs: ExecutiveIntelligenceInputs = {
    ...BASE_INPUTS,
    safeguardStatus:  'CLEAR',
    koraIndexValue:   60,
    confidenceScore:  0.41,
  };

  it('confidenceNote signals low reliability', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.confidenceNote).toContain('41%');
    expect(result.confidenceNote.toLowerCase()).toMatch(/basso|verifica|strategiche/);
  });

  it('primaryAction targets data intake completion when evidence is not high-risk', () => {
    const result = computeExecutiveIntelligence(inputs);
    // With no equity or evidence risk, low confidence should surface
    expect(result.primaryAction.toLowerCase()).toMatch(/data intake|confidence|verifica|fonti/);
  });

});

// ── Scenario 5: Low evidence quality (weak EV) ────────────────────────────────

describe('Scenario 5 — Low evidence quality (weak EV / evidence risk alta)', () => {

  const inputs: ExecutiveIntelligenceInputs = {
    ...BASE_INPUTS,
    safeguardStatus:    'CLEAR',
    koraIndexValue:     48,
    evidenceReliability: makeEvidenceWeak(),
  };

  it('primaryConstraint calls out evidence weakness', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.primaryConstraint.toLowerCase()).toMatch(/evidenz|autodichiarato|verificat|confidence/);
  });

  it('primaryAction is evidence-upgrade focused', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.primaryAction.toLowerCase()).toMatch(/documentazione|l2|l3|fornitori|verifica/);
  });

  it('wasteSignal reflects weak evidence share', () => {
    const result = computeExecutiveIntelligence(inputs);
    // weakShare 0.58 → 58% should appear
    expect(result.wasteSignal).toContain('58%');
  });

});

// ── Scenario 6: Strong activation (CLEAR + high KI) ──────────────────────────

describe('Scenario 6 — Strong activation (CLEAR + KI ≥ 70)', () => {

  const inputs: ExecutiveIntelligenceInputs = {
    ...BASE_INPUTS,
    safeguardStatus:          'CLEAR',
    koraIndexValue:           74,
    activationRate:           0.68,
    meaningfulActivationRate: 0.55,
    confidenceScore:          0.81,
    limitedShare:             0.10,
    economicReliefShare:      0.08,
  };

  it('organizationStatus is "Attivazione diffusa e sostenibile"', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.organizationStatus).toBe('Attivazione diffusa e sostenibile');
  });

  it('wasteSignal is a neutral/positive signal (no critical finding)', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.wasteSignal.toLowerCase()).toMatch(/coerente|nessun segnale|concentrazione/);
  });

  it('primaryAction is maintenance-oriented', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.primaryAction.toLowerCase()).toMatch(/mantenere|verifica|verification rate/);
  });

  it('confidenceNote indicates high reliability', () => {
    const result = computeExecutiveIntelligence(inputs);
    expect(result.confidenceNote.toLowerCase()).toMatch(/elevato|decisioni operative/);
  });

});

// ── Output contract invariants ────────────────────────────────────────────────

describe('Output contract — notKoraIndexComponent and methodologyStatus', () => {

  it('every output has notKoraIndexComponent: true', () => {
    const scenarios: ExecutiveIntelligenceInputs[] = [
      { ...BASE_INPUTS, safeguardStatus: 'FLAGGED' },
      { ...BASE_INPUTS, safeguardStatus: 'WARNING' },
      { ...BASE_INPUTS, safeguardStatus: 'CLEAR', koraIndexValue: 72 },
    ];
    for (const s of scenarios) {
      const result = computeExecutiveIntelligence(s);
      expect(result.notKoraIndexComponent).toBe(true);
    }
  });

  it('every output has methodologyStatus: "pre_empirical_calibration"', () => {
    const result = computeExecutiveIntelligence(BASE_INPUTS);
    expect(result.methodologyStatus).toBe('pre_empirical_calibration');
  });

  it('all four questions are always answered (non-empty strings)', () => {
    const result = computeExecutiveIntelligence(BASE_INPUTS);
    expect(result.organizationStatus.length).toBeGreaterThan(0);
    expect(result.primaryConstraint.length).toBeGreaterThan(0);
    expect(result.wasteSignal.length).toBeGreaterThan(0);
    expect(result.primaryAction.length).toBeGreaterThan(0);
    expect(result.executiveSummary.length).toBeGreaterThan(0);
    expect(result.confidenceNote.length).toBeGreaterThan(0);
  });

  it('wasteSignal never contains "waste", "sprecando", or "spreco"', () => {
    const testCases: ExecutiveIntelligenceInputs[] = [
      { ...BASE_INPUTS, safeguardStatus: 'FLAGGED' },
      { ...BASE_INPUTS, limitedShare: 0.60 },
      { ...BASE_INPUTS, economicReliefShare: 0.65 },
      { ...BASE_INPUTS, evidenceReliability: makeEvidenceWeak() },
    ];
    for (const tc of testCases) {
      const result = computeExecutiveIntelligence(tc);
      expect(result.wasteSignal.toLowerCase()).not.toContain('waste');
      expect(result.wasteSignal.toLowerCase()).not.toContain('sprecando');
      expect(result.wasteSignal.toLowerCase()).not.toContain('spreco');
    }
  });

});

// ── Architectural invariants ──────────────────────────────────────────────────

describe('Architectural invariants — no formula changes, no DB, no scoring', () => {

  it('ExecutiveIntelligenceService has no DB imports', () => {
    const src = read('services/executive-intelligence/ExecutiveIntelligenceService.ts');
    expect(src).not.toContain('supabase');
    expect(src).not.toContain('createClient');
    expect(src).not.toContain('getSupabase');
    expect(src).not.toContain("from '@/lib/supabase");
  });

  it('ExecutiveIntelligenceService makes no fetch/network calls', () => {
    const src = read('services/executive-intelligence/ExecutiveIntelligenceService.ts');
    expect(src).not.toContain('fetch(');
    expect(src).not.toContain('axios');
  });

  it('ExecutiveIntelligenceService does not modify any score or formula', () => {
    const src = read('services/executive-intelligence/ExecutiveIntelligenceService.ts');
    expect(src).not.toContain('kora_index_value');
    expect(src).not.toContain('insert(');
    expect(src).not.toContain('update(');
    expect(src).not.toContain('upsert(');
  });

  it('ExecutiveIntelligencePanel has notKoraIndexComponent badge in footer', () => {
    const src = read('components/executive-intelligence/ExecutiveIntelligencePanel.tsx');
    expect(src).toContain('not_kora_index_component');
    expect(src).toContain('pre_empirical_calibration');
  });

  it('kora-index page renders ExecutiveIntelligencePanel above HeroDiagnosis', () => {
    const src = read('app/company/kora-index/page.tsx');
    const panelPos = src.indexOf('ExecutiveIntelligencePanel');
    const heroPos  = src.indexOf('HeroDiagnosis');
    expect(panelPos).toBeGreaterThan(0);
    expect(heroPos).toBeGreaterThan(panelPos);
  });

  it('methodology-config v0.1 weights are unchanged', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toContain('getMacroblockWeights');
    expect(src).toContain('REACH');
    expect(src).toContain('QUALITY');
    expect(src).toContain('EQUITY');
    expect(src).toContain('BTI');
  });

  it('KORA Index formula is not modified by B77-B', () => {
    const src = read('lib/types/index.ts');
    expect(src).toContain('IU = NM × BC × CQ × EV × CF × AGF');
    expect(src).toContain('anti_gaming_factor_agf');
  });

  it('no new DB migration files created by B77-B', () => {
    const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
    if (!fs.existsSync(migrationsDir)) return;
    const files = fs.readdirSync(migrationsDir);
    const b77bFiles = files.filter((f) => f.includes('b77b') || f.includes('executive_intelligence'));
    expect(b77bFiles).toHaveLength(0);
  });

  it('Decision Pack PdfData now includes executiveBrief field', () => {
    const src = read('lib/decision-pack/pdf-data.ts');
    expect(src).toContain('executiveBrief');
    expect(src).toContain('organizationStatus');
    expect(src).toContain('primaryConstraint');
    expect(src).toContain('wasteSignal');
    expect(src).toContain('primaryAction');
  });

  it('html-template renders executive brief page with four-question layout', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('buildExecutiveBriefPage');
    expect(src).toContain('COME STIAMO');
    expect(src).toContain('PERCHÉ');
    expect(src).toContain('OPPORTUNITÀ PRINCIPALE');
    expect(src).toContain('AZIONE PRIORITARIA');
  });

});

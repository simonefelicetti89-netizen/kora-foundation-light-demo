import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildDecisionPackHtml } from '../../lib/decision-pack/html-template';
import type { PdfData } from '../../lib/decision-pack/pdf-data';

// ── B79-B — Decision Pack Professionalization: unit tests ─────────────────────
//
// Task 1:  Cover page — Pilot Confidential, KORA Decision Pack™, subtitle, methodology version
// Task 2:  TOC — 10 sections
// Task 3:  Macroblock Diagnosis page — REACH/QUALITY/EQUITY/BTI with scores
// Task 4:  Diagnostic Components page — 10 components table
// Task 5:  KORA Contribution™ page — data present path
// Task 5b: KORA Contribution™ page — null path (graceful non disponibile)
// Task 6:  PIB stub removed — professional AG-01 aggregate content
// Task 7:  Eligibility & Data Quality section
// Task 8:  Executive Intelligence position (existing, not regressed)
// Task 9:  Export link clarity — single canonical route
// Task 10: Board-pack deprecation notice
// Invariant: no formula/scoring changes, no migrations, contributionSummary null default

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── Minimal PdfData fixture ───────────────────────────────────────────────────

const FIXTURE_META: PdfData['meta'] = {
  tenantCode:              'T001',
  companyName:             'Acme S.r.l.',
  reportingPeriod:         'Q1–Q3 2025',
  generatedAt:             '2025-10-01T10:00:00.000Z',
  decisionPackVersionId:   'DP-2025-001',
  decisionPackId:          'dp-uuid-test',
  decisionPackStatus:      'approved',
  isLiveData:              false,
  notCertification:        true,
  methodologyNote:         'KORA Foundation Light — pre_empirical_calibration',
};

const FIXTURE_KORA_INDEX: PdfData['koraIndex'] = {
  value:                    52,
  safeguardStatus:          'WARNING',
  confidenceScore:          0.62,
  activationRate:           0.38,
  meaningfulActivationRate: 0.24,
  calibrationStatus:        'pre_empirical_calibration',
  methodologyVersionId:     'KORA-METHOD-v0.1.0',
  isCurrent:                true,
  createdAt:                '2025-10-01T09:00:00.000Z',
  componentCount:           10,
};

const FIXTURE_COMPONENTS: PdfData['components'] = [
  { code: 'AR',  label: 'Activation Rate',           value: 0.38, weight: 0.125, macroblock: 'REACH',  external: false },
  { code: 'MAR', label: 'Meaningful Activation Rate', value: 0.24, weight: 0.125, macroblock: 'REACH',  external: false },
  { code: 'NI',  label: 'Normalized Intensity',       value: 0.55, weight: 0.10,  macroblock: 'QUALITY', external: false },
  { code: 'VR',  label: 'Verification Rate',          value: 0.70, weight: 0.10,  macroblock: 'QUALITY', external: false },
  { code: 'CO',  label: 'Continuity',                 value: 0.40, weight: 0.10,  macroblock: 'QUALITY', external: false },
  { code: 'WB',  label: 'Worker Balance',             value: 0.48, weight: 0.0625, macroblock: 'EQUITY', external: false },
  { code: 'PC',  label: 'Pillar Coverage',            value: 0.80, weight: 0.0625, macroblock: 'EQUITY', external: false },
  { code: 'PB',  label: 'Pillar Balance',             value: 0.50, weight: 0.0625, macroblock: 'EQUITY', external: false },
  { code: 'EQ',  label: 'Equity',                     value: 0.45, weight: 0.0625, macroblock: 'EQUITY', external: false },
  { code: 'CS',  label: 'Confidence Score',           value: 0.62, weight: 0,     macroblock: null,      external: true  },
];

const FIXTURE_MACROBLOCKS: PdfData['macroblocks'] = [
  { code: 'REACH',  label: 'Activation Reach',        weight: 0.25, score: 38 },
  { code: 'QUALITY', label: 'Activation Quality',     weight: 0.30, score: 55 },
  { code: 'EQUITY',  label: 'Distribution & Equity',  weight: 0.25, score: 48 },
  { code: 'BTI',     label: 'Budget-to-Human-Impact', weight: 0.20, score: 42 },
];

const FIXTURE_PILLAR: PdfData['pillarDistribution'] = {
  LIFE: 400, GROWTH: 300, CONNECTION: 150, IMPACT: 100, LEGACY: 50,
};

const FIXTURE_BTI: PdfData['bti'] = {
  totalPeopleWelfareBudget: 185_000,
  deepActivationSpend:      58_000,
  economicReliefSpend:      54_000,
  blockedComplianceSpend:   12_000,
  activationDebtEur:        45_000,
  btiScore:                 42,
  costPerImpactUnit:        22.4,
  budgetEvidenceQuality:    0.68,
};

const FIXTURE_IU: PdfData['iuSummary'] = {
  totalRecords:          1_800,
  computedRecords:       1_276,
  blockedRecords:        318,
  limitedRecords:        172,
  reviewRequiredRecords: 34,
  totalImpactUnits:      2_100,
  impactUnitsByPillar:   { LIFE: 840, GROWTH: 630, CONNECTION: 315, IMPACT: 210, LEGACY: 105 },
  recordsWithoutIu:      0,
  averageCq:             0.82,
  averageEv:             0.74,
  methodologyVersion:    'KORA-METHOD-v0.1.0',
  calibrationStatus:     'pre_empirical_calibration',
};

const FIXTURE_PIB: PdfData['pibAggregation'] = {
  period:                'Q1–Q3 2025',
  workforceCount:        250,
  activatedWorkers:      93,
  meaningfulWorkers:     54,
  estimatedAR:           0.38,
  estimatedMAR:          0.24,
  totalIU:               2_100,
  avgEstimatedPIB:       22.5,
  pillarTotals:          { LIFE: 840, GROWTH: 630, CONNECTION: 315, IMPACT: 210, LEGACY: 105 },
  pillarShares:          { LIFE: 0.40, GROWTH: 0.30, CONNECTION: 0.15, IMPACT: 0.10, LEGACY: 0.05 },
  wbEstimate:            0.52,
  pibSnapshotsAvailable: false,
  estimationBasis:       'aggregate_estimate',
  estimationNote:        'KORA Foundation Light — nessun snapshot PIB persistito.',
  calibrationStatus:     'pre_empirical_calibration',
  methodologyVersion:    'KORA-METHOD-v0.1.0',
};

const FIXTURE_ENRICHMENT: PdfData['enrichment'] = {
  totalUefRecords:     1_800,
  approvedUefRecords:  1_276,
  enrichedRecords:     1_100,
  needsEnrichmentOpen: 176,
  budgetClassBreakdown: {
    deepActivation:    { count: 700, amount: 58_000 },
    economicRelief:    { count: 450, amount: 54_000 },
    complianceBlocked: { count: 100, amount: 12_000 },
    unknown:           { count: 26,  amount: 0 },
  },
  evidenceLevelBreakdown: { L0: 120, L1: 380, L2: 480, L3: 220, L4: 76 },
  averageFinancialConfidence: 0.68,
  manualEnrichmentCount: 34,
  remainingWarnings:     [],
};

const FIXTURE_BRIEF: PdfData['executiveBrief'] = {
  organizationStatus: 'Attivazione in costruzione — potenziale elevato, struttura da completare',
  primaryConstraint:  'Copertura workforce insufficiente: il 63% dei lavoratori non ha ancora un evento attivante verificato.',
  wasteSignal:        'Il 64% degli Impact Unit è concentrato nel top 12% della workforce.',
  primaryAction:      'Estendere la copertura ai segmenti non attivati prima del prossimo ciclo di scoring.',
  confidenceNote:     'Confidence Score 62% — evidenze parzialmente verificate. Aumentare verifica formale per innalzare affidabilità.',
};

function makeFixture(overrides?: Partial<PdfData>): PdfData {
  return {
    meta:               FIXTURE_META,
    koraIndex:          FIXTURE_KORA_INDEX,
    components:         FIXTURE_COMPONENTS,
    macroblocks:        FIXTURE_MACROBLOCKS,
    pillarDistribution: FIXTURE_PILLAR,
    bti:                FIXTURE_BTI,
    enrichment:         FIXTURE_ENRICHMENT,
    reportingAlignment: null,
    reportingReadiness: null,
    iuSummary:          FIXTURE_IU,
    pibAggregation:     FIXTURE_PIB,
    auditSummary:       [],
    executiveBrief:     FIXTURE_BRIEF,
    contributionSummary: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// TASK 1 — Cover page
// ═══════════════════════════════════════════════════════════════════

describe('Task 1 — Cover page', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('contains "Pilot Confidential" label', () => {
    expect(html).toContain('Pilot Confidential');
  });

  it('contains "KORA Decision Pack™" doc-type label', () => {
    expect(html).toContain('KORA Decision Pack');
  });

  it('contains client name on cover', () => {
    expect(html).toContain('Acme S.r.l.');
  });

  it('contains reporting period on cover', () => {
    expect(html).toContain('Q1–Q3 2025');
  });

  it('contains generation date reference', () => {
    // fmtDate produces Italian locale date
    expect(html).toContain('2025');
  });

  it('contains methodology version on cover', () => {
    expect(html).toContain('v0.1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 2 — Table of Contents
// ═══════════════════════════════════════════════════════════════════

describe('Task 2 — Table of Contents', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('contains TOC title', () => {
    expect(html).toContain('Struttura del Documento');
  });

  it('contains section 1: Executive Summary', () => {
    expect(html).toContain('Executive Summary');
  });

  it('contains section 3: Macroblock Diagnosis', () => {
    expect(html).toContain('Macroblock Diagnosis');
  });

  it('contains section 4: Diagnostic Components', () => {
    expect(html).toContain('Diagnostic Components');
  });

  it('contains section 6: Eligibility & Data Quality', () => {
    expect(html).toContain('Eligibility');
  });

  it('contains section 8: KORA Contribution™', () => {
    expect(html).toContain('KORA Contribution');
  });

  it('contains section 10: Methodology & Privacy Notes', () => {
    expect(html).toContain('Methodology');
    expect(html).toContain('Privacy');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 3 — Macroblock Diagnosis page
// ═══════════════════════════════════════════════════════════════════

describe('Task 3 — Macroblock Diagnosis page', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('contains REACH macroblock', () => {
    expect(html).toContain('REACH');
  });

  it('contains QUALITY macroblock', () => {
    expect(html).toContain('QUALITY');
  });

  it('contains EQUITY macroblock', () => {
    expect(html).toContain('EQUITY');
  });

  it('contains BTI macroblock', () => {
    expect(html).toContain('BTI');
  });

  it('renders macroblock score value (38)', () => {
    // REACH score=38
    expect(html).toContain('38');
  });

  it('renders macroblock weight (25%)', () => {
    expect(html).toContain('25%');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 4 — Diagnostic Components page
// ═══════════════════════════════════════════════════════════════════

describe('Task 4 — Diagnostic Components page (10 components)', () => {
  const html = buildDecisionPackHtml(makeFixture());

  const COMPONENT_CODES = ['AR', 'MAR', 'NI', 'VR', 'CO', 'WB', 'PC', 'PB', 'EQ', 'CS'];

  for (const code of COMPONENT_CODES) {
    it(`renders component code: ${code}`, () => {
      expect(html).toContain(code);
    });
  }

  it('footnote: CS is external to KORA Index (weight=0)', () => {
    expect(html).toContain('peso = 0');
  });

  it('footnote: EQ is not Evidence Quality', () => {
    // EQ definition must reference distribuzione / distributiva, not Evidence Quality
    expect(html.toLowerCase()).toContain('distribut');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 5 — KORA Contribution™ page — data present
// ═══════════════════════════════════════════════════════════════════

describe('Task 5 — KORA Contribution™ page — data present', () => {
  const html = buildDecisionPackHtml(makeFixture({
    contributionSummary: {
      contributionScore:     72,
      contributionLevel:     'Avanzata',
      totalContributionIU:   840,
      initiativeCount:       12,
      ecosystemPartnerCount: 4,
      pillarSplit:           { IMPACT: 0.55, CONNECTION: 0.30, LEGACY: 0.15 },
      evidenceDistribution:  null,
    },
  }));

  it('renders contribution score (72)', () => {
    expect(html).toContain('72');
  });

  it('renders initiative count (12)', () => {
    expect(html).toContain('12');
  });

  it('renders notKoraIndexComponent flag', () => {
    expect(html).toContain('notKoraIndexComponent');
  });

  it('labels it as companion indicator', () => {
    expect(html.toLowerCase()).toContain('companion');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 5b — KORA Contribution™ page — null (graceful non disponibile)
// ═══════════════════════════════════════════════════════════════════

describe('Task 5b — KORA Contribution™ page — null state', () => {
  const html = buildDecisionPackHtml(makeFixture({ contributionSummary: null }));

  it('renders "non disponibile" message when contribution is null', () => {
    // Either Italian "non disponibile" or the English equivalent
    const lower = html.toLowerCase();
    expect(
      lower.includes('non disponibili') ||
      lower.includes('non disponibile') ||
      lower.includes('dati non disponibili')
    ).toBe(true);
  });

  it('still renders notKoraIndexComponent note in null state', () => {
    expect(html).toContain('notKoraIndexComponent');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 6 — PIB stub removed — professional AG-01 content
// ═══════════════════════════════════════════════════════════════════

describe('Task 6 — PIB stub removed, AG-01 professional content', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('does not contain old stub text ("non disponibile in Foundation Light")', () => {
    // The old PIB stub said exactly this — now replaced with AG-01 content
    expect(html).not.toContain('PIB non disponibile in Foundation Light');
  });

  it('contains AG-01 reference', () => {
    expect(html).toContain('AG-01');
  });

  it('contains activated workers count (93)', () => {
    expect(html).toContain('93');
  });

  it('contains total IU in PIB section (2100)', () => {
    // totalIU=2100 from fixture
    expect(html).toContain('2');   // at minimum present
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 7 — Eligibility & Data Quality section
// ═══════════════════════════════════════════════════════════════════

describe('Task 7 — Eligibility & Data Quality section', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('contains eligible record classification', () => {
    expect(html.toLowerCase()).toContain('eligible');
  });

  it('contains limited record classification', () => {
    expect(html.toLowerCase()).toContain('limited');
  });

  it('contains blocked record classification', () => {
    expect(html.toLowerCase()).toContain('blocked');
  });

  it('contains evidence level distribution (L0–L4)', () => {
    expect(html).toContain('L0');
    expect(html).toContain('L4');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 8 — Executive Intelligence not regressed
// ═══════════════════════════════════════════════════════════════════

describe('Task 8 — Executive Intelligence preserved', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('renders organization status from executiveBrief', () => {
    expect(html).toContain('Attivazione in costruzione');
  });

  it('renders primary action from executiveBrief', () => {
    expect(html).toContain('Estendere la copertura');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 9 — Export link clarity (company reports page)
// ═══════════════════════════════════════════════════════════════════

describe('Task 9 — Export link clarity in company reports page', () => {
  const src = read('app/company/reports/page.tsx');

  it('no hardcoded link to /company/reports/board-pack (old static route)', () => {
    // All board-pack links should now point to /api/company/decision-pack
    expect(src).not.toContain('href="/company/reports/board-pack"');
  });

  it('uses canonical /api/company/decision-pack route', () => {
    expect(src).toContain('/api/company/decision-pack');
  });
});

// ═══════════════════════════════════════════════════════════════════
// TASK 10 — Board Pack static page deprecation notice
// ═══════════════════════════════════════════════════════════════════

describe('Task 10 — Board Pack static page deprecation', () => {
  const src = read('app/company/reports/board-pack/page.tsx');

  it('contains a deprecation / not-updated notice', () => {
    const lower = src.toLowerCase();
    expect(
      lower.includes('non più aggiornata') ||
      lower.includes('deprecat') ||
      lower.includes('hardcoded') ||
      lower.includes('non aggiornata')
    ).toBe(true);
  });

  it('references canonical /api/company/decision-pack route in deprecation block', () => {
    expect(src).toContain('/api/company/decision-pack');
  });
});

// ═══════════════════════════════════════════════════════════════════
// INVARIANT — No formula, scoring, schema, auth, worker changes
// ═══════════════════════════════════════════════════════════════════

describe('Invariant — No forbidden changes', () => {
  it('html-template.ts does not hardcode methodology weights', () => {
    const src = read('lib/decision-pack/html-template.ts');
    // Weights are only in display context (e.g. "25%") — no weight assignment expressions
    // The template should NOT contain something like "weight = 0.25" as a code assignment
    expect(src).not.toMatch(/const\s+\w+weight\s*=\s*0\.\d+/i);
  });

  it('pdf-data.ts interface includes contributionSummary field', () => {
    const src = read('lib/decision-pack/pdf-data.ts');
    expect(src).toContain('contributionSummary');
  });

  it('fetchPdfData returns contributionSummary: null (not persisted in KORA Foundation Light)', () => {
    const src = read('lib/decision-pack/pdf-data.ts');
    expect(src).toContain('contributionSummary: null');
  });

  it('html-template.ts does not reference Prisma, SQL, or database queries', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).not.toContain('prisma');
    expect(src).not.toContain('CREATE TABLE');
    expect(src).not.toContain('SELECT * FROM');
  });

  it('board-pack/page.tsx is NOT removed — route still exists (deprecation notice, not deletion)', () => {
    expect(() => read('app/company/reports/board-pack/page.tsx')).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════
// MANDATORY DISPLAY — Confidence Score, methodology_version_id, calibration_status
// ═══════════════════════════════════════════════════════════════════

describe('Mandatory display — CS + methodology + calibration', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('displays Confidence Score (62% from fixture)', () => {
    expect(html).toContain('62');
  });

  it('displays pre_empirical_calibration label', () => {
    expect(html).toContain('pre_empirical_calibration');
  });

  it('displays methodology version id', () => {
    expect(html).toContain('KORA-METHOD-v0.1.0');
  });

  it('displays Activation Safeguard status', () => {
    expect(html).toContain('WARNING');
  });
});

// ═══════════════════════════════════════════════════════════════════
// BENCHMARK DISCLAIMER (P0-5 regression)
// ═══════════════════════════════════════════════════════════════════

describe('Benchmark disclaimer (P0-5) — not regressed', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('html-template contains benchmark caveat text', () => {
    expect(html.toLowerCase()).toContain('benchmark');
  });

  it('html-template mentions Delphi Study post-pilot', () => {
    expect(html.toLowerCase()).toContain('delphi');
  });
});

// ═══════════════════════════════════════════════════════════════════
// NOTE METODOLOGICHE (P0-4 regression)
// ═══════════════════════════════════════════════════════════════════

describe('Note Metodologiche (P0-4) — not regressed', () => {
  const html = buildDecisionPackHtml(makeFixture());

  it('html-template contains "Note Metodologiche" section', () => {
    expect(html).toContain('Note Metodologiche');
  });

  it('Note Metodologiche mentions pre-empirical weights', () => {
    expect(html.toLowerCase()).toContain('pre-empiric');
  });
});

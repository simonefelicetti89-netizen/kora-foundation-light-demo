import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildDecisionPackHtml } from '../../lib/decision-pack/html-template';
import type { PdfData } from '../../lib/decision-pack/pdf-data';
import { getNormativeMappingLight } from '../../lib/normative-mapping/normative-mapping-light';

// ── CC-005 / D-B — Decision Pack mandatory limitations migration ──────────────
//
// D-B resolved (see lib/decision-pack/pdf-data.ts header, lib/architecture/
// registry.ts svc.report-generator / svc.report-factory, cc013-canonical-
// contract.test.ts): lib/decision-pack/* is the sole canonical Decision Pack
// authority. services/report-generator/ReportGeneratorService.ts is NOT
// canonical — its getDecisionPackLimitations() 11-item Italian disclaimer
// list was the last unresolved "MIGRATE" item from the CC-005 capability
// audit.
//
// Finding (this suite proves it, not just documents it): every mandatory
// item from that list is ALREADY present in lib/decision-pack/html-template.ts
// — built incrementally by B18/B24/B79-B/CC-015 work, distributed contextually
// next to the section it governs rather than centralized. There is nothing
// left to port. Adding a new centralized `limitations` field/section would
// duplicate disclaimer logic the canonical renderer already owns (forbidden
// by this PR's own scope). This suite is the durable proof that migration is
// complete, and a regression guard against silent removal.
//
// Demo-specific items from the same legacy list (synthetic seed references,
// "applicazione demo", hardcoded S1 confidence commentary, Dynamic Scoring
// Preview batch-size commentary) are deliberately NOT present here — they
// describe ReportGeneratorService's own synthetic inputs, not anything the
// live, tenant-scoped canonical renderer should ever say.

const FIXTURE_META: PdfData['meta'] = {
  tenantCode:            'T001',
  companyName:           'Acme S.r.l.',
  reportingPeriod:       'Q1-Q3 2025',
  generatedAt:           '2025-10-01T10:00:00.000Z',
  decisionPackVersionId: 'DP-2025-001',
  decisionPackId:        'dp-uuid-test',
  decisionPackStatus:    'ready',
  isLiveData:            true,
  notCertification:      true,
  methodologyNote:       'KORA KORA Foundation Light — pre-empirical calibration. Output diagnostico pilota. Non certificato, non regulatory-grade.',
};

const FIXTURE_KORA_INDEX: PdfData['koraIndex'] = {
  value:                    52,
  safeguardStatus:          'WARNING',
  confidenceScore:          0.62,
  activationRate:           0.38,
  meaningfulActivationRate: 0.24,
  calibrationStatus:        'pre_empirical_calibration',
  methodologyVersionId:     'KORA Index v1.0',
  isCurrent:                true,
  createdAt:                '2025-10-01T09:00:00.000Z',
  componentCount:           10,
};

const FIXTURE_PILLAR: PdfData['pillarDistribution'] = {
  LIFE: 400, GROWTH: 300, CONNECTION: 150, IMPACT: 100, LEGACY: 50,
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

function makeFixture(overrides?: Partial<PdfData>): PdfData {
  return {
    meta:                  FIXTURE_META,
    koraIndex:             FIXTURE_KORA_INDEX,
    methodologySnapshot:   null,
    components:            null,
    macroblocks:           null,
    pillarDistribution:    FIXTURE_PILLAR,
    bti:                   null,
    enrichment:            FIXTURE_ENRICHMENT,
    reportingAlignment:    null,
    reportingReadiness:    null,
    normativeMappingLight: getNormativeMappingLight(),
    iuSummary:             FIXTURE_IU,
    pibAggregation:        null,
    auditSummary:          [],
    executiveBrief:        null,
    contributionSummary:   null,
    ...overrides,
  };
}

describe('CC-005/D-B — mandatory Decision Pack limitations already migrated', () => {
  // Live tenant fixture — the case that matters most: mandatory disclaimers
  // must render for a REAL company, not only for the demo/OP-001 path.
  const htmlLive = buildDecisionPackHtml(makeFixture({ meta: { ...FIXTURE_META, isLiveData: true } }));
  // Demo tenant fixture — proves these are unconditional, not demo-only.
  const htmlDemo = buildDecisionPackHtml(makeFixture({ meta: { ...FIXTURE_META, isLiveData: false, tenantCode: 'OP-001' } }));

  it('contains the pre-empirical calibration / not-certified / not-regulatory-grade disclosure', () => {
    expect(htmlLive).toContain('pre_empirical_calibration');
    expect(htmlDemo).toContain('pre_empirical_calibration');
  });

  it('contains the Delphi Study / provisional v0.1 weights disclosure', () => {
    expect(htmlLive).toContain('Delphi Study');
    expect(htmlLive).toContain('provvisori');
    expect(htmlDemo).toContain('Delphi Study');
  });

  it('contains the exact CLAUDE.md-mandated CSR/ESG disclaimer', () => {
    const csrDisclaimer = "KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.";
    expect(htmlLive).toContain(csrDisclaimer);
    expect(htmlLive).toContain('Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.');
    expect(htmlDemo).toContain(csrDisclaimer);
  });

  it('contains the correlazione ≠ causalità disclosure', () => {
    expect(htmlLive).toContain('Correlazione ≠ causalità');
    expect(htmlDemo).toContain('Correlazione ≠ causalità');
  });

  it('contains the aggregate-only / no-individual-worker-data disclosure', () => {
    expect(htmlLive).toContain('nessun dato individuale lavoratore');
    expect(htmlDemo).toContain('nessun dato individuale lavoratore');
  });

  it('does NOT leak ReportGeneratorService demo-specific wording into canonical output', () => {
    // These exact phrases are unique to services/report-generator/ReportGeneratorService.ts's
    // getDecisionPackLimitations() and describe its own synthetic inputs — never valid for a
    // real, tenant-scoped canonical Decision Pack, live or demo.
    expect(htmlLive).not.toContain('Output di un\'applicazione demo KORA Foundation Light');
    expect(htmlLive).not.toContain('AR/MAR da seed canonico');
    expect(htmlLive).not.toContain('BTI score da seed canonico');
    expect(htmlLive).not.toContain('Proxy dinamici (Dynamic Preview)');
    expect(htmlDemo).not.toContain('Output di un\'applicazione demo KORA Foundation Light');
    expect(htmlDemo).not.toContain('AR/MAR da seed canonico');
    expect(htmlDemo).not.toContain('BTI score da seed canonico');
    expect(htmlDemo).not.toContain('Proxy dinamici (Dynamic Preview)');
  });

  it('canonical renderer never imports the non-canonical Decision Pack implementations', () => {
    // Structural proof, not just behavioral: html-template.ts (and pdf-data.ts,
    // covered by cc013-canonical-contract.test.ts) must never import the
    // retired-authority services, even transitively via a re-export.
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/decision-pack/html-template.ts'), 'utf-8');
    expect(src).not.toMatch(/from\s+['"].*ReportGeneratorService['"]/);
    expect(src).not.toMatch(/from\s+['"].*ReportFactoryService['"]/);
    expect(src).not.toMatch(/from\s+['"]@?\/?data\/synthetic\//);
  });
});

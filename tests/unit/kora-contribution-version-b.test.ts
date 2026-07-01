/**
 * KORA Contribution Version B — Implementation Validation
 *
 * 20 tests verifying:
 *   1. Version B active model exists in config and code
 *   2. Version B weights sum to 100
 *   3. Version A is not primary public model
 *   4. Public presentation is maturity_band_with_confidence (not 0–100 score)
 *   5. UI shows maturity band, confidence, component breakdown
 *   6. KORA Contribution remains outside KORA Index
 *   7. No worker ranking / individual score / company ranking
 *   8. Confidence is separate and non-additive
 *   9. Foundation Light output is pre-empirical-calibration
 *  10. Gate 3 remains open, C-9 flagged
 *
 * Static source-analysis only — no DB, no migration, no runtime calls.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

const SERVICE        = 'services/kora-contribution/KoraContributionService.ts';
const PAGE           = 'app/company/contribution/page.tsx';
const CONFIG_TS      = 'lib/methodology-config/v0.1.ts';
const CONFIG_JSON    = 'data/methodology/methodology-config.json';
const METHODOLOGY_DOC = 'docs/KORA_CONTRIBUTION_METHODOLOGY.md';
const AUDIT_DOC      = 'docs/archive/contribution-source-layer/KORA_Contribution_Audit.md';

// ── Section 1: Version B model exists (1–3) ───────────────────────────────────

describe('KORA Contribution Version B — model exists', () => {
  let cfg: Record<string, unknown>;
  let cfgSrc: string;

  beforeAll(() => {
    cfg    = JSON.parse(read(CONFIG_JSON));
    cfgSrc = read(CONFIG_TS);
  });

  test('1. methodology-config.json has kora_contribution_v2 block with status="active"', () => {
    const v2 = (cfg as Record<string, unknown>).kora_contribution_v2 as Record<string, unknown> | undefined;
    expect(v2).toBeDefined();
    expect(v2?.status).toBe('active');
    expect(v2?.version).toBe('v0.2');
  });

  test('2. Version B weights sum to exactly 100', () => {
    const v2 = (cfg as Record<string, unknown>).kora_contribution_v2 as Record<string, unknown> | undefined;
    const w  = v2?.weights as Record<string, unknown> | undefined;
    expect(w).toBeDefined();
    const total = (
      (w?.activation_depth       as number ?? 0) +
      (w?.evidence_quality       as number ?? 0) +
      (w?.ecosystem_contribution as number ?? 0) +
      (w?.adoption_reach         as number ?? 0) +
      (w?.strategic_breadth      as number ?? 0)
    );
    expect(total).toBe(100);
  });

  test('3. v0.1.ts exports getContributionConfigV2() and ContributionV2Config', () => {
    expect(cfgSrc).toContain('getContributionConfigV2');
    expect(cfgSrc).toContain('ContributionV2Config');
    expect(cfgSrc).toContain('ContributionV2Weights');
    expect(cfgSrc).toContain('ContributionV2MaturityBands');
  });
});

// ── Section 2: Version A is not primary public model (4–5) ────────────────────

describe('KORA Contribution Version A — marked legacy', () => {
  let cfg: Record<string, unknown>;

  beforeAll(() => { cfg = JSON.parse(read(CONFIG_JSON)); });

  test('4. kora_contribution block has _status="legacy_fl_fallback_only"', () => {
    const v1 = (cfg as Record<string, unknown>).kora_contribution as Record<string, unknown> | undefined;
    expect(v1?._status).toBe('legacy_fl_fallback_only');
  });

  test('5. kora_contribution_v2.no_public_single_score is true', () => {
    const v2 = (cfg as Record<string, unknown>).kora_contribution_v2 as Record<string, unknown> | undefined;
    expect(v2?.no_public_single_score).toBe(true);
    expect(v2?.public_presentation).toBe('maturity_band_with_confidence');
  });
});

// ── Section 3: Service implements Version B (6–9) ─────────────────────────────

describe('KORA Contribution Service — Version B implementation', () => {
  let service: string;

  beforeAll(() => { service = read(SERVICE); });

  test('6. Service exports ContributionV2Result interface with required doctrine fields', () => {
    expect(service).toContain('ContributionV2Result');
    expect(service).toContain("modelVersion:            'v0.2'");
    expect(service).toContain("publicPresentation:      'maturity_band_with_confidence'");
    expect(service).toContain('isKoraIndexComponent:     false');
    expect(service).toContain('noWorkerRanking:          true');
    expect(service).toContain('noIndividualScore:        true');
    expect(service).toContain('noCompanyRanking:         true');
    expect(service).toContain('preEmpiricalCalibration:  true');
  });

  test('7. Service has computeContributionV2() function', () => {
    expect(service).toContain('function computeContributionV2');
    expect(service).toContain('getContributionConfigV2');
  });

  test('8. computeContributionV2 reads weights from config (no hardcoded numbers in formula)', () => {
    const fnBody = service.slice(service.indexOf('function computeContributionV2'), service.indexOf('function computeContributionV2') + 3000);
    // Weights accessed via config object
    expect(fnBody).toContain('w.activation_depth');
    expect(fnBody).toContain('w.evidence_quality');
    expect(fnBody).toContain('w.ecosystem_contribution');
    expect(fnBody).toContain('w.adoption_reach');
    expect(fnBody).toContain('w.strategic_breadth');
    // No hardcoded weight integers in formula multiplication
    expect(fnBody).not.toMatch(/activationDepth\s*\*\s*30/);
    expect(fnBody).not.toMatch(/evidenceQuality\s*\*\s*25/);
  });

  test('9. ContributionSummary interface includes v2: ContributionV2Result', () => {
    expect(service).toContain('v2: ContributionV2Result');
  });
});

// ── Section 4: Public presentation is maturity band (10–13) ──────────────────

describe('KORA Contribution — public presentation is maturity band', () => {
  let page: string;

  beforeAll(() => { page = read(PAGE); });

  test('10. Page has data-testid="contribution-v2-maturity-panel"', () => {
    expect(page).toContain('data-testid="contribution-v2-maturity-panel"');
  });

  test('11. Page shows maturity band via data-testid="contribution-maturity-band"', () => {
    expect(page).toContain('data-testid="contribution-maturity-band"');
    expect(page).toContain('Banda di maturità');
  });

  test('12. Page shows confidence via data-testid="contribution-confidence"', () => {
    expect(page).toContain('data-testid="contribution-confidence"');
    expect(page).toContain('Confidence');
    expect(page).toContain('Sufficienza segnale');
    expect(page).toContain('Separata e non additiva');
  });

  test('13. Page shows V2 component breakdown via data-testid="contribution-v2-components"', () => {
    expect(page).toContain('data-testid="contribution-v2-components"');
    expect(page).toContain('Profondità di attivazione');
    expect(page).toContain('Qualità evidenza');
    expect(page).toContain('Contribuzione ecosistema');
    expect(page).toContain('Adozione & portata');
    expect(page).toContain('Ampiezza strategica');
  });
});

// ── Section 5: No primary 0–100 score in UI (14–15) ──────────────────────────

describe('KORA Contribution — no primary 0–100 score in UI', () => {
  let page: string;

  beforeAll(() => { page = read(PAGE); });

  test('14. Page does not show "Punteggio indicatore" as a primary label', () => {
    // The old "Punteggio indicatore (simulato)" heading must not be visible text
    expect(page).not.toContain('Punteggio indicatore (simulato)');
  });

  test('15. Page does not show "Contribution Score (0–100)" as a MetricCard label', () => {
    // The big 0–100 score MetricCard is removed
    expect(page).not.toContain('Contribution Score (0–100)');
  });
});

// ── Section 6: Doctrine invariants (16–18) ────────────────────────────────────

describe('KORA Contribution Version B — doctrine invariants', () => {
  let service: string;
  let page: string;

  beforeAll(() => {
    service = read(SERVICE);
    page    = read(PAGE);
  });

  test('16. KORA Contribution remains outside KORA Index — page says "non è una componente del KORA Index"', () => {
    expect(page).toContain('non è una componente del KORA Index');
  });

  test('17. ContributionV2Result has noWorkerRanking, noIndividualScore, noCompanyRanking all true', () => {
    expect(service).toContain('noWorkerRanking:          true');
    expect(service).toContain('noIndividualScore:        true');
    expect(service).toContain('noCompanyRanking:         true');
  });

  test('18. Confidence is separate and non-additive — stated in page copy', () => {
    // UI must explicitly say confidence does not enter the band computation
    expect(page).toContain('non additiva');
    expect(page).toContain('non entra nel calcolo');
  });
});

// ── Section 7: Signal sources and Gate status (19–20) ────────────────────────

describe('KORA Contribution Version B — signal sources and Gate status', () => {
  let cfg: Record<string, unknown>;
  let service: string;

  beforeAll(() => {
    cfg     = JSON.parse(read(CONFIG_JSON));
    service = read(SERVICE);
  });

  test('19. Config declares KORA-originated/KORA-enabled and company adoption as signal sources', () => {
    const v2 = (cfg as Record<string, unknown>).kora_contribution_v2 as Record<string, unknown> | undefined;
    const sources = v2?.signal_sources as Record<string, boolean> | undefined;
    expect(sources?.kora_originated_if_adopted).toBe(true);
    expect(sources?.kora_enabled_if_adopted).toBe(true);
    expect(sources?.company_initiatives).toBe(true);
    expect(sources?.cross_company_initiatives).toBe(true);
    expect(sources?.aggregate_bookings).toBe(true);
    expect(sources?.aggregate_participation).toBe(true);
  });

  test('20. Service has production_ready gate on all live contribution paths (Gate 3 open)', () => {
    // Live paths must still be gated — production not touched
    const liveBlock     = service.match(/async function getContributionLive[\s\S]{0,500}/)?.[0] ?? '';
    const promoterBlock = service.match(/async function getContributionPromoterView[\s\S]{0,500}/)?.[0] ?? '';
    const originBlock   = service.match(/async function getContributionOriginEmployerView[\s\S]{0,500}/)?.[0] ?? '';
    expect(liveBlock).toContain('production_ready');
    expect(promoterBlock).toContain('production_ready');
    expect(originBlock).toContain('production_ready');
  });
});

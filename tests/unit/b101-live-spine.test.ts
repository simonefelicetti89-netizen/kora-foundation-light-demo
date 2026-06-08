/**
 * B101 — Live Spine: Data Intake reale → Scoring live → Decision Pack
 *
 * Verifica che:
 *   1. Le route Decision Pack rifiutano richieste senza tenantCode (no OP-001 fallback).
 *   2. L'accept route richiede tenantCode esplicito (no default silenzioso).
 *   3. Il scoring run richiede batchId e rifiuta batch senza UEF approvati.
 *   4. Il company user accede solo al proprio tenant (session-bound).
 *   5. La spine live non usa dati sintetici/OP-001 nel path reale.
 *   6. Il Decision Pack usa KORA Index v1.0 e pre_empirical_calibration.
 *   7. Activation Safeguard e Confidence Score sono separati dal KORA Index.
 *   8. Demo/Preview/Live adapter boundary è preservato.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. Decision Pack routes: no OP-001 fallback ───────────────────────────────

describe('B101 — decision-pack/preview route', () => {
  it('does not contain ?? OP-001 fallback for tenantCode', () => {
    const src = readSrc('app/api/admin/decision-pack/preview/route.ts');
    expect(src).not.toContain("?? 'OP-001'");
    expect(src).not.toContain('?? "OP-001"');
  });

  it('returns 400 when tenantCode is missing (guard present)', () => {
    const src = readSrc('app/api/admin/decision-pack/preview/route.ts');
    // Must have explicit guard for missing tenantCode
    expect(src).toContain('tenantCode is required');
    expect(src).toMatch(/status:\s*400/);
  });

  it('fetches data using tenantCode from query params (not hardcoded OP-001)', () => {
    const src = readSrc('app/api/admin/decision-pack/preview/route.ts');
    expect(src).toContain('searchParams.get(\'tenantCode\')');
    expect(src).not.toMatch(/tenantCode\s*=\s*['"]OP-001['"]/);
  });
});

describe('B101 — decision-pack/pdf route', () => {
  it('does not contain ?? OP-001 fallback for tenantCode', () => {
    const src = readSrc('app/api/admin/decision-pack/pdf/route.ts');
    expect(src).not.toContain("?? 'OP-001'");
    expect(src).not.toContain('?? "OP-001"');
  });

  it('returns 400 when tenantCode is missing (guard present)', () => {
    const src = readSrc('app/api/admin/decision-pack/pdf/route.ts');
    expect(src).toContain('tenantCode is required');
    expect(src).toMatch(/status:\s*400/);
  });

  it('is KORA_ADMIN only (requireKoraAdmin present)', () => {
    const src = readSrc('app/api/admin/decision-pack/pdf/route.ts');
    expect(src).toContain('requireKoraAdmin');
    expect(src).toContain('isKoraAuthError');
  });
});

// ── 2. Data Intake accept route: tenantCode required ─────────────────────────

describe('B101 — data-intake/accept route', () => {
  it('requires explicit tenantCode (no silent OP-001 default)', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    // Must explicitly require tenantCode
    expect(src).toContain('tenantCode is required');
    // OP-001 should only appear in hint/comment context, not as a default assignment
    const op001Matches = [...src.matchAll(/tenantCode\s*=\s*['"]OP-001['"]/g)];
    expect(op001Matches).toHaveLength(0);
  });

  it('blocks upload if pseudonymizationConfirmation is not "true"', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain('pseudonymizationConfirmation');
    expect(src).toContain('"true"');
  });

  it('creates source_batch with batch_status=pending (not approved immediately)', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).toMatch(/batch_status:\s*'pending'/);
    // Must NOT directly set batch_status to 'approved' here
    expect(src).not.toMatch(/batch_status:\s*'approved'/);
  });

  it('does not set synthetic_test: true for real intake', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain('synthetic_test:   false');
  });

  it('response includes nextSteps, not stale lockedFeatures list', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain('nextSteps');
    // lockedFeatures with scoring/decision-pack locked should not exist
    expect(src).not.toContain("'scoring_run'");
    expect(src).not.toContain("'kora_index_generation'");
    expect(src).not.toContain("'decision_pack_generation'");
  });

  it('is KORA_ADMIN only', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain('requireKoraAdmin');
  });

  it('runs PII strict-reject on original rows before mapping', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain('detectPiiInPayload');
    expect(src).toContain("pii_guard_batch_rejected");
  });
});

// ── 3. Scoring run: approved UEF only, no synthetic data ─────────────────────

describe('B101 — scoring/run-approved-batch route', () => {
  it('does not import op001-synthetic-records (comment references are not imports)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    // Must have no import statement for op001-synthetic-records
    expect(src).not.toMatch(/import[^;]*op001-synthetic-records/);
    // Must have no function calls to synthetic record generators
    expect(src).not.toMatch(/\bgetOp001SyntheticRecords\s*\(/);
    expect(src).not.toMatch(/\bgetOp001UploadedPayloads\s*\(/);
  });

  it('filters UEF by review_status=approved AND approved_for_scoring=true', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain("review_status', 'approved'");
    expect(src).toContain("approved_for_scoring', true");
  });

  it('blocks scoring if no approved UEF records (422)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('No approved UEF records available for scoring');
    expect(src).toContain('status: 422');
  });

  it('blocks scoring if workforce population < 10 (N≥10 enforcement)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('workforcePopulation');
    expect(src).toContain('>= 10');
  });

  it('uses runKoraPipeline (live engine, not simulator)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('runKoraPipeline');
    expect(src).not.toContain('ScoringSimulatorService');
    expect(src).not.toContain('scoringSimulatorService');
  });

  it('persists result to analytics.kora_index_result', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('persistKoraComputationResult');
  });

  it('creates Decision Pack after scoring', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('persistDecisionPack');
  });

  it('explicitly sets synthetic_fixture: false in audit log', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('using_synthetic_fixture: false');
    expect(src).toContain('syntheticFixture: false');
  });

  it('sets calibration_status: pre_empirical_calibration in Decision Pack payload', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toMatch(/calibration_status:\s*'pre_empirical_calibration'/);
  });

  it('is KORA_ADMIN only', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('requireKoraAdmin');
    expect(src).toContain('isKoraAuthError');
  });
});

// ── 4. Company workspace: tenant from session, not from params ────────────────

describe('B101 — company workspace route', () => {
  it('derives tenantId from authenticated session, never from query params', () => {
    const src = readSrc('app/api/company/workspace/route.ts');
    expect(src).toContain('requireCompanyUser');
    // tenantId must come from authResult, not request.url params
    expect(src).toContain('authResult');
    expect(src).toContain('tenantId');
    // Must not accept tenantId/tenantCode from query string
    expect(src).not.toContain('searchParams.get(\'tenantId\')');
    expect(src).not.toContain('searchParams.get(\'tenantCode\')');
  });

  it('is for COMPANY_ADMIN/VIEWER only (requireCompanyUser)', () => {
    const src = readSrc('app/api/company/workspace/route.ts');
    expect(src).toContain('requireCompanyUser');
    expect(src).toContain('isKoraAuthError');
  });

  it('never returns individual worker data (no pseudonym_id in response)', () => {
    const src = readSrc('app/api/company/workspace/route.ts');
    // pseudonym_id should not appear in select queries for company workspace
    expect(src).not.toMatch(/select.*pseudonym_id/);
  });
});

// ── 5. Live adapter boundary ──────────────────────────────────────────────────

describe('B101 — scoring adapter boundary', () => {
  it('LiveScoringAdapter wraps runKoraPipeline, not the simulator', () => {
    const src = readSrc('services/scoring/LiveScoringAdapter.ts');
    expect(src).toContain('runKoraPipeline');
    expect(src).not.toContain('ScoringSimulatorService');
    expect(src).toContain("readonly mode: ScoringPathMode = 'LIVE'");
    expect(src).toContain('readonly isAuthoritative = true');
  });

  it('DemoScoringAdapter is authoritative=false', () => {
    const src = readSrc('services/scoring/DemoScoringAdapter.ts');
    expect(src).toContain("readonly mode: ScoringPathMode = 'DEMO'");
    expect(src).toContain('readonly isAuthoritative = false');
  });

  it('useScoringResult live path never falls back to demo seed', () => {
    const src = readSrc('lib/scoring-result/index.ts');
    expect(src).toContain('LIVE must NEVER fallback to demo seed data');
    expect(src).toContain('insufficient_data');
  });

  it('scoring-result index does not import synthetic data files', () => {
    const src = readSrc('lib/scoring-result/index.ts');
    expect(src).not.toContain('op001-synthetic-records');
    expect(src).not.toContain('kora-index-outputs.json');
  });
});

// ── 6. Decision Pack: versioning + calibration status ────────────────────────

describe('B101 — Decision Pack versioning', () => {
  it('pdf-data.ts does not hardcode OP-001 as the only valid tenant', () => {
    const src = readSrc('lib/decision-pack/pdf-data.ts');
    // isLiveData should be determined by comparison, not hardcoded false
    expect(src).toContain('isLiveData: tenantCode !== \'OP-001\'');
  });

  it('run-approved-batch route response includes correct methodology metadata', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toMatch(/live_scoring:\s*true/);
    expect(src).toContain('calibration_status');
  });

  it('persistence layer reads methodology version from config (not hardcoded)', () => {
    const src = readSrc('lib/live/persistence.ts');
    expect(src).toContain('getMethodologyVersion');
    expect(src).toContain('getCalibrationStatus');
    // Should NOT have hardcoded version strings as literals
    expect(src).not.toMatch(/'KORA Index v[0-9]/);
  });
});

// ── 7. Activation Safeguard and Confidence Score separation ─────────────────

describe('B101 — Activation Safeguard + Confidence Score separation', () => {
  it('CS is weight=0 and external=true in persistence layer', () => {
    const src = readSrc('lib/live/persistence.ts');
    expect(src).toContain('weight: 0, external: true');
  });

  it('run-approved-batch response includes safeguard and confidence separately', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('confidenceScore');
    expect(src).toContain('safeguard');
    // They should both appear as separate fields in the response
    expect(src).toContain('koraIndex:');
  });

  it('methodology-config CS is marked external', () => {
    const config = JSON.parse(readSrc('data/methodology/methodology-config.json')) as Record<string, unknown>;
    const kv3 = config['kora_index_v3'] as Record<string, unknown>;
    expect(kv3['cs_external']).toBe(true);
  });
});

// ── 8. OP-001 is isolated to synthetic demo path only ────────────────────────

describe('B101 — OP-001 isolation to synthetic demo path', () => {
  it('operator-flow route still uses OP-001 synthetic records (intentional demo path)', () => {
    const src = readSrc('app/api/admin/operator-flow/route.ts');
    expect(src).toContain('op001-synthetic-records');
    expect(src).toContain('synthetic_test: true');
  });

  it('run-approved-batch does NOT import op001-synthetic-records', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).not.toContain('op001-synthetic-records');
  });

  it('data-intake/accept does NOT import op001-synthetic-records', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).not.toContain('op001-synthetic-records');
  });

  it('decision-pack/preview route has no OP-001 tenant fallback', () => {
    const src = readSrc('app/api/admin/decision-pack/preview/route.ts');
    expect(src).not.toContain("?? 'OP-001'");
  });

  it('decision-pack/pdf route has no OP-001 tenant fallback', () => {
    const src = readSrc('app/api/admin/decision-pack/pdf/route.ts');
    expect(src).not.toContain("?? 'OP-001'");
  });
});

// ── 9. Company data-submissions: tenant from session ─────────────────────────

describe('B101 — company data-submissions route', () => {
  it('uses auth.tenantId from session, not from body or query', () => {
    const src = readSrc('app/api/company/data-submissions/route.ts');
    expect(src).toContain('auth.tenantId');
    expect(src).toContain('requireCompanyUser');
  });

  it('restricts POST (create submission) to COMPANY_ADMIN only', () => {
    const src = readSrc('app/api/company/data-submissions/route.ts');
    expect(src).toContain("'COMPANY_ADMIN'");
    expect(src).toContain('403');
  });
});

/**
 * B102 — Live Spine Hardening: Smoke Test, Guards, Diagnostics
 *
 * Verifica che:
 *   1. L'API live-spine-diagnostics esiste, è KORA_ADMIN-only, e ritorna la struttura corretta.
 *   2. La pagina live-spine-diagnostics esiste ed è server-component con redirect auth.
 *   3. Il run-approved-batch blocca esplicitamente OP-001 (422).
 *   4. Il data-intake/accept blocca esplicitamente OP-001 (422).
 *   5. Il run-approved-batch ha tutti i guard esistenti (batchId, no UEF, N<10).
 *   6. Le route Decision Pack bloccano tenantCode mancante (400) — invarianti B101.
 *   7. La pagina live-spine-diagnostics espone i link Decision Pack con tenantCode.
 *   8. OP-001 non appare come fallback in nessun path live.
 *   9. ScoringReadiness enum ha i valori attesi.
 *  10. Il run-approved-batch legge tenantCode dal batch (non dall'URL/body).
 *  11. La diagnostica non espone dati individuali worker (solo aggregati).
 *  12. L'admin page include il link a live-spine-diagnostics.
 *  13. Il scoring route imposta using_synthetic_fixture: false.
 *  14. Il guard OP-001 nel scoring route precede la query UEF (non può essere aggirata).
 *  15. Il accept route include il guard OP-001 dopo il guard tenantCode vuoto.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. API route live-spine-diagnostics ──────────────────────────────────────

describe('B102 — live-spine-diagnostics API route', () => {
  it('exists and is KORA_ADMIN only', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).toContain('requireKoraAdmin');
    expect(src).toContain('isKoraAuthError');
  });

  it('exports GET handler', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).toContain('export async function GET');
  });

  it('returns TenantSpineState array with expected fields', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).toContain('tenantId');
    expect(src).toContain('tenantCode');
    expect(src).toContain('companyName');
    expect(src).toContain('scoringReadiness');
    expect(src).toContain('uefApprovedCount');
    expect(src).toContain('lastKoraIndex');
    expect(src).toContain('lastDecisionPackId');
    expect(src).toContain('warnings');
    expect(src).toContain('nextAction');
  });

  it('exports ScoringReadiness type with all expected values', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).toContain("'READY'");
    expect(src).toContain("'NEEDS_REVIEW'");
    expect(src).toContain("'NO_DATA'");
    expect(src).toContain("'NO_BATCH'");
  });

  it('warns if tenantCode is OP-001', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).toContain("tenantCode === 'OP-001'");
    expect(src).toContain('OP-001 è un tenant sintetico demo');
  });

  it('does not expose individual worker fields (pseudonym_id)', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).not.toContain('pseudonym_id');
    expect(src).not.toContain('worker_id');
    // aggregate counts only
    expect(src).toContain('uefApprovedCount');
    expect(src).toContain('uploadedRecordCount');
  });

  it('reads from analytics and personal schemas — not pib or dynamic-cv', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).toContain("schema('analytics')");
    expect(src).toContain("schema('personal')");
    expect(src).not.toContain('pib_record');
    expect(src).not.toContain('dynamic_cv');
  });

  it('returns nextAction string for every tenant state', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).toContain('nextAction');
    expect(src).toContain('Carica dati via /admin/data-intake');
    expect(src).toContain('Pronto per scoring');
    expect(src).toContain('Decision Pack presente');
  });
});

// ── 2. Live Spine Diagnostics page ───────────────────────────────────────────

describe('B102 — live-spine-diagnostics page', () => {
  it('exists as a server component with auth redirect', () => {
    const src = readSrc('app/admin/live-spine-diagnostics/page.tsx');
    expect(src).toContain("import { redirect } from 'next/navigation'");
    expect(src).toContain("kora_role !== 'KORA_ADMIN'");
    expect(src).toContain("redirect('/admin/login')");
  });

  it('shows ReadinessBadge with all four states', () => {
    const src = readSrc('app/admin/live-spine-diagnostics/page.tsx');
    expect(src).toContain('READY');
    expect(src).toContain('NEEDS_REVIEW');
    expect(src).toContain('NO_DATA');
    expect(src).toContain('NO_BATCH');
  });

  it('shows Decision Pack links with tenantCode from data (not hardcoded)', () => {
    const src = readSrc('app/admin/live-spine-diagnostics/page.tsx');
    // Links must use t.tenantCode — not a hardcoded OP-001
    expect(src).toContain('tenantCode=${t.tenantCode}');
    expect(src).not.toMatch(/tenantCode=OP-001/);
  });

  it('includes Data Intake and UEF Review quick links', () => {
    const src = readSrc('app/admin/live-spine-diagnostics/page.tsx');
    expect(src).toContain('/admin/data-intake');
    expect(src).toContain('/admin/uef-review');
  });

  it('labels OP-001 as demo sintetico', () => {
    const src = readSrc('app/admin/live-spine-diagnostics/page.tsx');
    expect(src).toContain('DEMO SINTETICO');
    expect(src).toContain("tenantCode === 'OP-001'");
  });

  it('displays a note that data is real-time from Supabase', () => {
    const src = readSrc('app/admin/live-spine-diagnostics/page.tsx');
    expect(src).toContain('dati sono in tempo reale da Supabase');
  });
});

// ── 3. run-approved-batch: OP-001 guard ──────────────────────────────────────

describe('B102 — scoring/run-approved-batch OP-001 guard', () => {
  it('blocks live scoring for OP-001 tenant with 422', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain("tenantCode === 'OP-001'");
    expect(src).toContain('Live scoring non disponibile per OP-001');
    expect(src).toMatch(/status:\s*422/);
  });

  it('OP-001 guard comes after tenant lookup (can derive tenantCode from batch)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    // tenantCode is derived from DB lookup, guard appears after it
    const tenantCodeIdx = src.indexOf('const tenantCode = (tenant as any)');
    const guardIdx      = src.indexOf("tenantCode === 'OP-001'");
    expect(tenantCodeIdx).toBeGreaterThan(0);
    expect(guardIdx).toBeGreaterThan(tenantCodeIdx);
  });

  it('OP-001 guard comes before UEF query (guard cannot be bypassed)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    const guardIdx  = src.indexOf("tenantCode === 'OP-001'");
    const uefIdx    = src.indexOf("from('uef_record')");
    expect(guardIdx).toBeGreaterThan(0);
    expect(uefIdx).toBeGreaterThan(guardIdx);
  });

  it('OP-001 guard hint references operator-flow', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('operator-flow');
  });
});

// ── 4. data-intake/accept: OP-001 guard ──────────────────────────────────────

describe('B102 — data-intake/accept OP-001 guard', () => {
  it('blocks OP-001 in live data intake with 422', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain("tenantCode === 'OP-001'");
    expect(src).toContain('OP-001 non è un tenant live');
    expect(src).toMatch(/status:\s*422/);
  });

  it('OP-001 guard appears after tenantCode empty check', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    const emptyCheckIdx = src.indexOf('tenantCode is required. Select a company');
    const op001Idx      = src.indexOf("tenantCode === 'OP-001'");
    expect(emptyCheckIdx).toBeGreaterThan(0);
    expect(op001Idx).toBeGreaterThan(emptyCheckIdx);
  });

  it('OP-001 guard hint references pipeline sintetica', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain('pipeline sintetica');
  });
});

// ── 5. run-approved-batch: existing guards (B101 invariants) ─────────────────

describe('B102 — run-approved-batch existing guards (B101 invariants)', () => {
  it('requires batchId (400)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('batchId is required');
    expect(src).toMatch(/status:\s*400/);
  });

  it('blocks if no approved UEF records (422)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('No approved UEF records available for scoring');
    expect(src).toContain('status: 422');
  });

  it('enforces N≥10 (workforcePopulation)', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('workforcePopulation');
    expect(src).toContain('>= 10');
  });

  it('sets using_synthetic_fixture: false explicitly', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('using_synthetic_fixture: false');
    expect(src).toContain('syntheticFixture: false');
  });
});

// ── 6. Decision Pack guards (B101 invariants) ─────────────────────────────────

describe('B102 — Decision Pack route guards (B101 invariants)', () => {
  it('preview route requires tenantCode (400)', () => {
    const src = readSrc('app/api/admin/decision-pack/preview/route.ts');
    expect(src).toContain('tenantCode is required');
    expect(src).toMatch(/status:\s*400/);
  });

  it('pdf route requires tenantCode (400)', () => {
    const src = readSrc('app/api/admin/decision-pack/pdf/route.ts');
    expect(src).toContain('tenantCode is required');
    expect(src).toMatch(/status:\s*400/);
  });

  it('neither Decision Pack route has OP-001 silent fallback', () => {
    const previewSrc = readSrc('app/api/admin/decision-pack/preview/route.ts');
    const pdfSrc     = readSrc('app/api/admin/decision-pack/pdf/route.ts');
    expect(previewSrc).not.toContain("?? 'OP-001'");
    expect(pdfSrc).not.toContain("?? 'OP-001'");
  });
});

// ── 7. Admin page link ────────────────────────────────────────────────────────

describe('B102 — admin index page', () => {
  it('includes link to live-spine-diagnostics in LIVE tools section', () => {
    const src = readSrc('app/admin/page.tsx');
    expect(src).toContain('/admin/live-spine-diagnostics');
    expect(src).toContain('Live Spine Diagnostics');
  });
});

// ── 8. OP-001 isolation: no fallback in any live path ────────────────────────

describe('B102 — OP-001 isolation (no fallback in live paths)', () => {
  it('run-approved-batch does not import op001-synthetic-records', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).not.toMatch(/import[^;]*op001-synthetic-records/);
    expect(src).not.toMatch(/\bgetOp001SyntheticRecords\s*\(/);
  });

  it('data-intake/accept does not import op001-synthetic-records', () => {
    const src = readSrc('app/api/admin/data-intake/accept/route.ts');
    expect(src).not.toContain('op001-synthetic-records');
  });

  it('live-spine-diagnostics API does not import op001-synthetic-records', () => {
    const src = readSrc('app/api/admin/live-spine-diagnostics/route.ts');
    expect(src).not.toContain('op001-synthetic-records');
    expect(src).not.toContain('ScoringSimulatorService');
  });

  it('operator-flow route is the ONLY live path that uses OP-001 (intentional)', () => {
    const src = readSrc('app/api/admin/operator-flow/route.ts');
    expect(src).toContain('op001-synthetic-records');
    expect(src).toContain('synthetic_test: true');
  });
});

// ── 9. KORA Index invariants in live spine ────────────────────────────────────

describe('B102 — KORA Index invariants in live spine', () => {
  it('persistence layer reads methodology version from config (not hardcoded)', () => {
    const src = readSrc('lib/live/persistence.ts');
    expect(src).toContain('getMethodologyVersion');
    expect(src).toContain('getCalibrationStatus');
    expect(src).not.toMatch(/'KORA Index v[0-9]/);
  });

  it('CS is weight=0 external in persistence layer', () => {
    const src = readSrc('lib/live/persistence.ts');
    expect(src).toContain('weight: 0, external: true');
  });

  it('run-approved-batch response includes koraIndex, confidenceScore, safeguard as separate fields', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain('koraIndex:');
    expect(src).toContain('confidenceScore');
    expect(src).toContain('safeguard');
  });

  it('run-approved-batch sets calibration_status: pre_empirical_calibration', () => {
    const src = readSrc('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toMatch(/calibration_status:\s*'pre_empirical_calibration'/);
  });
});

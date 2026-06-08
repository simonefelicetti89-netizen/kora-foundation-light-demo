/**
 * B103 — Golden Path Live Trial & Sample Upload File
 *
 * Verifica strutturale del sample file, README, runbook, e invarianti di sistema.
 * Non esegue upload reali contro Supabase — solo lettura file statici.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  try {
    readFileSync(resolve(root, relPath));
    return true;
  } catch {
    return false;
  }
}

// ── 1. File existence ─────────────────────────────────────────────────────────

describe('B103 — file existence', () => {
  it('sample CSV exists', () => {
    expect(fileExists('data/golden-path/kora_golden_path_upload.csv')).toBe(true);
  });

  it('sample README exists', () => {
    expect(fileExists('data/golden-path/README.md')).toBe(true);
  });

  it('Golden Path Runbook exists', () => {
    expect(fileExists('docs/GOLDEN_PATH_RUNBOOK.md')).toBe(true);
  });
});

// ── 2. Sample CSV content ─────────────────────────────────────────────────────

describe('B103 — sample CSV structure', () => {
  const csv = readFile('data/golden-path/kora_golden_path_upload.csv');

  it('contains LIFE pillar', () => {
    expect(csv).toContain('LIFE');
  });

  it('contains GROWTH pillar', () => {
    expect(csv).toContain('GROWTH');
  });

  it('contains CONNECTION pillar', () => {
    expect(csv).toContain('CONNECTION');
  });

  it('contains IMPACT pillar', () => {
    expect(csv).toContain('IMPACT');
  });

  it('contains LEGACY pillar', () => {
    expect(csv).toContain('LEGACY');
  });

  it('does not contain OP-001', () => {
    expect(csv).not.toContain('OP-001');
  });

  it('does not contain synthetic_demo_data marker', () => {
    expect(csv).not.toContain('synthetic_demo_data');
  });

  it('does not contain individual PII fields (codice_fiscale, email, telefono)', () => {
    const lower = csv.toLowerCase();
    expect(lower).not.toContain('codice_fiscale');
    expect(lower).not.toContain('codice fiscale');
    expect(lower).not.toContain('email_dipendente');
    expect(lower).not.toContain('telefono');
    expect(lower).not.toContain('matricola');
  });

  it('has initiative_name header (blocking required field)', () => {
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('initiative_name');
  });

  it('has at least 5 data rows (excluding header)', () => {
    const lines = csv.split('\n').filter(l => l.trim().length > 0);
    // header + at least 5 data rows
    expect(lines.length).toBeGreaterThan(5);
  });

  it('has at least 15 data rows for meaningful scoring', () => {
    const lines = csv.split('\n').filter(l => l.trim().length > 0);
    // header + 15 rows minimum
    expect(lines.length).toBeGreaterThanOrEqual(16);
  });

  it('contains at least one eligible initiative keyword', () => {
    const lower = csv.toLowerCase();
    const eligibleKeywords = [
      'upskilling', 'mentoring', 'volunteering', 'volontariato',
      'mental health', 'coaching', 'learning', 'leadership',
    ];
    const hasEligible = eligibleKeywords.some(kw => lower.includes(kw));
    expect(hasEligible).toBe(true);
  });

  it('contains at least one limited initiative (meal voucher / buoni pasto)', () => {
    const lower = csv.toLowerCase();
    const limitedKeywords = ['buoni pasto', 'meal voucher', 'gift card', 'fringe benefit'];
    const hasLimited = limitedKeywords.some(kw => lower.includes(kw));
    expect(hasLimited).toBe(true);
  });

  it('contains at least one blocked initiative (mandatory compliance)', () => {
    const lower = csv.toLowerCase();
    const blockedKeywords = [
      'antincendio', 'obbligatorio', 'dlgs 81', 'd.lgs 81',
      'sicurezza obbligator', 'formazione antincendio',
    ];
    const hasBlocked = blockedKeywords.some(kw => lower.includes(kw));
    expect(hasBlocked).toBe(true);
  });

  it('contains reporting_period column', () => {
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('reporting_period');
  });

  it('contains evidence_level column', () => {
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('evidence_level');
  });

  it('contains amount column for BTI', () => {
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('amount');
  });

  it('contains participants column', () => {
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('participants');
  });

  it('uses only canonical versioning if versions are mentioned (no v0.1 / v3 / Foundation Light v0.1)', () => {
    expect(csv).not.toContain('v0.1');
    expect(csv).not.toContain('Foundation Light v0.1');
    expect(csv).not.toContain('kora_index_v3');
    expect(csv).not.toContain('KORA Index v3');
  });
});

// ── 3. README content ─────────────────────────────────────────────────────────

describe('B103 — sample README', () => {
  const readme = readFile('data/golden-path/README.md');

  it('explains the file is fictitious/test', () => {
    const lower = readme.toLowerCase();
    expect(lower.includes('fittizio') || lower.includes('sample') || lower.includes('test')).toBe(true);
  });

  it('documents the initiative_name column as required', () => {
    expect(readme).toContain('initiative_name');
  });

  it('documents all 5 pillars', () => {
    expect(readme).toContain('LIFE');
    expect(readme).toContain('GROWTH');
    expect(readme).toContain('CONNECTION');
    expect(readme).toContain('IMPACT');
    expect(readme).toContain('LEGACY');
  });

  it('mentions eligible, limited, blocked outcomes', () => {
    const lower = readme.toLowerCase();
    expect(lower).toContain('eligible');
    expect(lower).toContain('limited');
    expect(lower).toContain('blocked');
  });

  it('warns not to use OP-001', () => {
    expect(readme).toContain('OP-001');
  });

  it('references the runbook', () => {
    expect(readme).toContain('GOLDEN_PATH_RUNBOOK');
  });

  it('does not contain synthetic_demo_data', () => {
    expect(readme).not.toContain('synthetic_demo_data');
  });
});

// ── 4. Runbook content ────────────────────────────────────────────────────────

describe('B103 — Golden Path Runbook', () => {
  const runbook = readFile('docs/GOLDEN_PATH_RUNBOOK.md');

  it('cites KORA Foundation Light', () => {
    expect(runbook).toContain('KORA Foundation Light');
  });

  it('cites KORA Index v1.0', () => {
    expect(runbook).toContain('KORA Index v1.0');
  });

  it('cites pre_empirical_calibration as calibration status', () => {
    expect(runbook).toContain('pre_empirical_calibration');
  });

  it('references /admin/live-spine-diagnostics', () => {
    expect(runbook).toContain('/admin/live-spine-diagnostics');
  });

  it('references Data Intake Studio', () => {
    expect(runbook).toContain('Data Intake');
    expect(runbook).toContain('/admin/data-intake');
  });

  it('references UEF Review', () => {
    expect(runbook).toContain('UEF Review');
    expect(runbook).toContain('/admin/uef-review');
  });

  it('references Decision Pack (preview + pdf)', () => {
    expect(runbook).toContain('Decision Pack');
    expect(runbook).toContain('decision-pack/preview');
    expect(runbook).toContain('decision-pack/pdf');
  });

  it('warns not to use OP-001 in live path', () => {
    expect(runbook).toContain('OP-001');
    expect(runbook).not.toMatch(/OP-001.*=.*tenant reale/);
    // Must appear in a warning context
    const lines = runbook.split('\n').filter(l => l.includes('OP-001'));
    const isWarn = lines.some(l => l.toLowerCase().includes('non') || l.toLowerCase().includes('riservato') || l.toLowerCase().includes('sintetico'));
    expect(isWarn).toBe(true);
  });

  it('includes a final checklist', () => {
    expect(runbook).toContain('Checklist');
  });

  it('references the sample file path', () => {
    expect(runbook).toContain('kora_golden_path_upload.csv');
    expect(runbook).toContain('data/golden-path');
  });

  it('mentions workforcePopulation >= 10 requirement', () => {
    const lower = runbook.toLowerCase();
    expect(lower.includes('workforcepopulation') || lower.includes('workforce')).toBe(true);
    expect(lower).toContain('≥ 10');
  });

  it('presents KORA Index v1.0 as the canonical version', () => {
    // Canonical version must be present
    expect(runbook).toContain('KORA Index v1.0');
    // It must not claim v3 or v0.1 is the product (only in bug-warning context is ok)
    // The runbook may mention these in negative examples — that is correct behaviour.
    // We check the positive claim: v1.0 is prominent.
    const v10Count = (runbook.match(/KORA Index v1\.0/g) ?? []).length;
    expect(v10Count).toBeGreaterThanOrEqual(2);
  });
});

// ── 5. Micro-hints in UI files ────────────────────────────────────────────────

describe('B103 — micro-hints in UI', () => {
  it('live-spine-diagnostics page mentions Golden Path Runbook', () => {
    const src = readFile('app/admin/live-spine-diagnostics/page.tsx');
    expect(src).toContain('GOLDEN_PATH_RUNBOOK');
    expect(src).toContain('kora_golden_path_upload.csv');
  });

  it('DataIntakeStudio mentions sample file', () => {
    const src = readFile('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    expect(src).toContain('kora_golden_path_upload.csv');
    expect(src).toContain('GOLDEN_PATH_RUNBOOK');
  });

  it('DataIntakeStudio micro-hint does not introduce demo fallback', () => {
    const src = readFile('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    // The hint must not reference OP-001 as a valid tenant for live data
    expect(src).not.toMatch(/OP-001.*tenant reale/);
    // isOp001 warning must still exist
    expect(src).toContain('isOp001');
    expect(src).toContain('Synthetic demo tenant');
  });
});

// ── 6. System invariants — no regressions ────────────────────────────────────

describe('B103 — system invariants (no regressions)', () => {
  it('run-approved-batch still blocks OP-001', () => {
    const src = readFile('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(src).toContain("tenantCode === 'OP-001'");
    expect(src).toContain('Live scoring non disponibile per OP-001');
  });

  it('data-intake/accept still blocks OP-001', () => {
    const src = readFile('app/api/admin/data-intake/accept/route.ts');
    expect(src).toContain("tenantCode === 'OP-001'");
    expect(src).toContain('OP-001 non è un tenant live');
  });

  it('Decision Pack preview route has no OP-001 fallback', () => {
    const src = readFile('app/api/admin/decision-pack/preview/route.ts');
    expect(src).not.toContain("?? 'OP-001'");
    expect(src).toContain('tenantCode is required');
  });

  it('Decision Pack pdf route has no OP-001 fallback', () => {
    const src = readFile('app/api/admin/decision-pack/pdf/route.ts');
    expect(src).not.toContain("?? 'OP-001'");
    expect(src).toContain('tenantCode is required');
  });

  it('no UI file introduces KORA Index v3 as current version', () => {
    // Quick check on key visible surfaces
    const adminPage = readFile('app/admin/page.tsx');
    expect(adminPage).not.toContain('KORA Index v3 (corrente)');
    expect(adminPage).not.toContain('Foundation Light v0.1 (corrente)');
  });
});

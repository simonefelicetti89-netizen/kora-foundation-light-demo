// tests/unit/pilot-ux-01-golden-path-copy.test.ts
// PILOT-UX-01 — locks the presence of the plain-language guidance copy added
// to the golden path pages, and confirms it did not disturb the exact
// success/label strings GD01 (tests/e2e/golden-data-bearing.spec.ts) and
// GOLDEN-E2E-03 (golden-e2e-03-stable-selectors.test.ts) depend on.
// Static/structural only (readFileSync string checks) — mirrors the style of
// golden-e2e-03-stable-selectors.test.ts.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('PILOT-UX-01 — golden path plain-language guidance copy', () => {
  it('DataIntakeStudio.tsx explains the intake pipeline and keeps GD01 success text intact', () => {
    const src = read('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    expect(src).toContain('In questa pagina');
    expect(src).toContain('Controlli di governance obbligatori');
    // GD01-critical strings must survive copy changes verbatim.
    expect(src).toContain('File validation passed');
    expect(src).toContain('Batch created');
  });

  it('UefReviewQueue.tsx explains the review checkpoint and keeps GD01 success text intact', () => {
    const src = read('app/admin/uef-review/_components/UefReviewQueue.tsx');
    expect(src).toContain('checkpoint di governance');
    expect(src).toContain('Azione di governance');
    expect(src).toContain('UEF candidates generated');
    expect(src).toContain('Approvazione massiva completata');
    expect(src).toContain('Decision Pack generated from approved UEF records');
  });

  it('the Decision Pack HTML template keeps its canonical labels alongside the new explanatory note', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('Come leggere questo documento');
    expect(src).toMatch(/KORA Foundation Light/);
    expect(src).toMatch(/KORA Index v1\.0/);
    expect(src).toMatch(/pre_empirical_calibration/);
  });

  it('company-facing pages state the aggregate/privacy-safe boundary and use the canonical v1.0 label, never v3', () => {
    const workspace = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(workspace).toMatch(/privacy-safe/);
    expect(workspace).toContain('data-testid="company-workspace-page"');

    const koraIndex = read('app/company/kora-index/page.tsx');
    expect(koraIndex).toMatch(/aggregat[oi]/i);
    expect(koraIndex).not.toContain('KORA Index</TM> v3');
  });
});

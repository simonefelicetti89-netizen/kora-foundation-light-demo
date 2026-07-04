// tests/unit/golden-e2e-03-stable-selectors.test.ts
// GOLDEN-E2E-03 — guards the pilot-critical data-testid attributes that
// tests/e2e/golden-data-bearing.spec.ts (GD01) depends on. Static/structural
// only (readFileSync string checks) — does not render a route or exercise
// Playwright. Purpose: fail loudly if a future refactor silently removes one
// of these attributes instead of GD01 failing mysteriously against staging.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('GOLDEN-E2E-03 — stable selectors used by GD01', () => {
  it('DataIntakeStudio.tsx has the pilot-critical data-testid attributes', () => {
    const src = read('app/admin/data-intake/_components/DataIntakeStudio.tsx');
    expect(src).toContain('data-testid="admin-data-intake-page"');
    expect(src).toContain('data-testid="data-intake-upload-input"');
    expect(src).toContain('data-testid="data-intake-dry-run-button"');
    expect(src).toContain('data-testid={`data-intake-pseudonymization-checkbox-${i}`}');
    expect(src).toContain('data-testid="data-intake-accept-batch-button"');
    expect(src).toContain('data-testid="data-intake-goto-uef-review-link"');
  });

  it('UefReviewQueue.tsx has the pilot-critical data-testid attributes', () => {
    const src = read('app/admin/uef-review/_components/UefReviewQueue.tsx');
    expect(src).toContain('data-testid="admin-uef-review-page"');
    expect(src).toContain('data-testid="uef-batch-card"');
    expect(src).toContain('data-testid="uef-generate-candidates-button"');
    expect(src).toContain('data-testid="uef-bulk-approve-button"');
    expect(src).toContain('data-testid="uef-workforce-population-input"');
    expect(src).toContain('data-testid="uef-run-scoring-button"');
    expect(src).toContain('data-testid="decision-pack-preview-link"');
  });

  it('the Decision Pack HTML template tags its <body> for E2E detection', () => {
    const src = read('lib/decision-pack/html-template.ts');
    expect(src).toContain('data-testid="decision-pack-preview"');
  });

  it('CompanyWorkspaceView.tsx and the KORA Index detail page are tagged', () => {
    const workspace = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(workspace).toContain('data-testid="company-workspace-page"');

    const koraIndex = read('app/company/kora-index/page.tsx');
    const matches = koraIndex.match(/data-testid="company-kora-index-page"/g) ?? [];
    // Present on both the NoDataState branch and the main data view — the
    // page must be detectable by GD01 regardless of which one renders.
    expect(matches.length).toBe(2);
  });
});

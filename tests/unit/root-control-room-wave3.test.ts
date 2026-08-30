/**
 * B-TRUTH — Root Control Room Wave 3 (2026-08-30).
 *
 * SUPERSEDED same day by the Root Control Room Wave 3 HARDENING pass — see
 * tests/unit/root-control-room-wave3-hardening.test.ts for the current,
 * correct state (the whole page was retired). This file's assertions below
 * were updated to match that outcome; the narrative that follows describes
 * the ORIGINAL (superseded) Wave 3 conclusion for historical context only.
 *
 * Continued decomposing app/admin/companies/[companyId]/page.tsx:
 *   - Section B (Tenant Overview, 12 profile fields): RETIRE_LEGACY. 9 fields
 *     have no analytics.tenant column and no confirmed current-product
 *     requirement (not extending the schema to preserve demo CRM richness).
 *     The other 3 (onboarding_status, data_readiness_status,
 *     decision_pack_status) duplicated Section C tiles, themselves removed.
 *   - Section C tiles 2 (Onboarding), 7 (Decision Pack), 8 (Advisor):
 *     REMOVE_DUPLICATE / RETIRE_LEGACY.
 *   - Section D (Data Intake summary): REMOVE_DUPLICATE — the Gen 3 workspace
 *     tab already covers the same ground from real analytics.source_batch /
 *     analytics.uef_record.
 *   - companyDataIntakeService is no longer imported by root page.tsx —
 *     Root's dependency on it is fully eliminated (the service itself keeps
 *     2 other real callers: app/admin/pipeline/page.tsx and
 *     ReportFactoryService/CompanyIntelligenceService, so it does not reach
 *     zero callers and was not deleted).
 *   - Worker summary (Section I) and its Tiles 4/5: left untouched
 *     (RETAIN_REQUIRED_GAP) — only total_workers overlaps a real source
 *     (personal.workforce_baseline, already on the workspace tab, but not
 *     reachable from Root's fake identity); the rest has no real equivalent
 *     anywhere and is B-WORKER's future domain, not invented here.
 *   - CompanyIntelligenceService: untouched (INVESTIGATE) — its inputs
 *     (Tenant/DataIntake/Worker/Scoring/BTI/Onboarding, all synthetic) and
 *     its risk-level heuristic are not defined by any current-product
 *     methodology; not verified, not canonicalized.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

const ROOT_PAGE = 'app/admin/companies/[companyId]/page.tsx';

describe('B-TRUTH Root Control Room Wave 3 — Tenant Overview (Section B) retired', () => {
  const src = read(ROOT_PAGE);
  const LEGACY_FIELDS = [
    'tenant.legal_name', 'tenant.sector', 'tenant.territory', 'tenant.headquarters_location',
    'tenant.employee_count', 'tenant.size_band', 'tenant.kora_plan', 'tenant.analysis_period',
  ];

  for (const field of LEGACY_FIELDS) {
    it(`no longer renders ${field} (no analytics.tenant column, not confirmed required)`, () => {
      expect(src).not.toContain(field);
    });
  }

  it('B — Tenant Overview section label is gone', () => {
    expect(src).not.toContain('B — Tenant Overview');
  });
});

// NOTE: the "Operational Readiness tiles" and "Data Intake summary (Section D)"
// sections of Root Control Room described immediately below were this file's
// original Wave 3 conclusion (Tile 1/4/5 retained as RETAIN_REQUIRED_GAP,
// Section D reduced to two links). That conclusion was itself superseded a
// few hours later, same day, by the Root Control Room Wave 3 HARDENING pass:
// the whole page was retired (now a redirect to the Gen 3 workspace tab), so
// tiles/Section D/the risk badge no longer exist in any form. See
// tests/unit/root-control-room-wave3-hardening.test.ts for the corrected,
// current assertions. The describe blocks below are kept only as historical
// markers proving the content really is gone now, not as the live spec.

describe('B-TRUTH Root Control Room Wave 3 — superseded same-day by the Hardening pass', () => {
  const src = read(ROOT_PAGE);

  it('Tile 1/2/4/5/7/8, Section D\'s links, and the risk badge are ALL gone — the whole page is now a redirect', () => {
    expect(src).not.toMatch(/<p[^>]*>Tenant Status<\/p>/);
    expect(src).not.toContain('workerSummary.');
    expect(src).not.toContain('companyDataIntakeService.');
    expect(src).not.toContain('companyIntelligenceService.');
    expect(src).not.toContain('RISK_BADGE[');
  });
});

describe('B-TRUTH Root Control Room Wave 3 — I9 unchanged (no service reached zero callers)', () => {
  it('CompanyDataIntakeService.ts is still in the I9 synthetic import allowlist', async () => {
    const { SYNTHETIC_IMPORT_ALLOWLIST } = await import('@/lib/security/synthetic-import-allowlist');
    expect(SYNTHETIC_IMPORT_ALLOWLIST.some((e) => e.file.includes('CompanyDataIntakeService'))).toBe(true);
  });
});

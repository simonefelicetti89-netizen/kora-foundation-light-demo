// tests/unit/synthetic-company-foundation-no-ui-leak.test.ts
// Synthetic Company Foundation — tenant_kind must never reach customer-facing
// UI. All current reads/writes of tenant_kind are confined to /admin/* —
// this test proves that boundary and fails the moment it's crossed.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(process.cwd());

function listFilesRecursive(dir: string): string[] {
  let results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(listFilesRecursive(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

describe('Synthetic company foundation — tenant_kind never reaches customer-facing UI', () => {
  const customerFacingRoots = ['app/company', 'app/worker', 'app/my-kora', 'app/commons', 'app/partner'];

  it('no file under customer-facing route trees references tenant_kind', () => {
    const offenders: string[] = [];
    for (const root of customerFacingRoots) {
      const dir = join(ROOT, root);
      for (const file of listFilesRecursive(dir)) {
        const content = readFileSync(file, 'utf-8');
        if (content.includes('tenant_kind') || content.includes('tenantKind')) {
          offenders.push(file.replace(ROOT + '/', ''));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every tenant_kind reference in the whole app/ tree is confined to app/admin/** or app/api/admin/** (both KORA_ADMIN-only)', () => {
    const appDir = join(ROOT, 'app');
    const offenders: string[] = [];
    for (const file of listFilesRecursive(appDir)) {
      const content = readFileSync(file, 'utf-8');
      if (!content.includes('tenant_kind') && !content.includes('tenantKind')) continue;
      const relative = file.replace(ROOT + '/', '');
      if (!relative.startsWith('app/admin/') && !relative.startsWith('app/api/admin/')) offenders.push(relative);
    }
    expect(offenders).toEqual([]);
  });
});

// tests/unit/px-website-boundary.test.ts
// Fail-closed guard: the PX-C migration may not reach a website surface.
//
// Authority: Founder ruling 2026-09-27 and report `275` §5. The public/
// commercial website is a separate workstream; `/pilot` is FOUNDER-DEFERRED,
// explicitly NOT Founder-accepted visual quality, and NOT a Product visual
// benchmark.
//
// This is enforcement infrastructure only. It modifies no website surface, and
// it deliberately does NOT constrain how any website surface looks.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ARCHITECTURE_REGISTRY } from '@/lib/architecture/registry';
import {
  WEBSITE_DOMAINS, DECLARED_WEBSITE_PATHS, PX_MIGRATION_OWNERSHIP,
  registryDerivedWebsitePaths, protectedWebsitePaths, classifyPath,
  checkMigrationTargets, assertNoWebsiteMigration, isReadOnlyReference, REPORT_275_CORRECTION,
} from '@/lib/px-boundary/website-boundary';

describe('PX boundary — the authoritative source is reused, not duplicated', () => {
  it('derives protected paths from the architecture registry rather than restating them', () => {
    const derived = registryDerivedWebsitePaths();
    expect(derived).toContain('app/page.tsx');   // app-surface.landing, Marketing
    expect(derived).toContain('app/demo/');      // app-surface.demo, Demo
    for (const p of derived) {
      const entry = ARCHITECTURE_REGISTRY.find((c) => c.primaryPath === p)!;
      expect((WEBSITE_DOMAINS as readonly string[])).toContain(entry.domain);
      expect(entry.id.startsWith('app-surface.')).toBe(true);
    }
  });

  it('does NOT protect Product services that merely carry a Demo domain label', () => {
    // The registry labels ScenarioService and SubmissionFeedbackService
    // domain: 'Demo'. They are Product code, not website surfaces. Deriving on
    // domain alone would make this boundary over-broad and would bar
    // legitimate Product work — so the derivation is narrowed to app-surface.*.
    const derived = registryDerivedWebsitePaths();
    expect(derived).not.toContain('services/scenario/ScenarioService.ts');
    expect(derived).not.toContain('services/submission-feedback/SubmissionFeedbackService.ts');
    expect(classifyPath('services/scenario/ScenarioService.ts')).not.toBe('website');
  });

  it('CROSS-CHECK: the registry never classifies a declared website path into a Product domain', () => {
    // The declared list exists only because the registry is silent on those
    // paths. If it later gains an entry that contradicts report 275, this fails
    // loudly instead of letting two truths drift apart.
    for (const declared of DECLARED_WEBSITE_PATHS) {
      const entry = ARCHITECTURE_REGISTRY.find((c) => c.primaryPath === declared);
      if (entry) {
        expect(
          (WEBSITE_DOMAINS as readonly string[]).includes(entry.domain),
          `architecture registry classifies ${declared} as domain "${entry.domain}", contradicting report 275`,
        ).toBe(true);
      }
    }
  });

  it('every protected path actually exists — the boundary never guards a phantom', () => {
    for (const p of protectedWebsitePaths()) {
      expect(existsSync(join(process.cwd(), p)), `${p} is protected but absent`).toBe(true);
    }
  });

  it('records the report-275 correction: app/legal/ does not exist', () => {
    // This guard's own existence check caught it. The public privacy surface is
    // app/privacy/. KORA-WP-141's ROUTE_ARCHETYPE separately declares
    // '/legal/privacy' with no route file behind it — an orphaned declaration,
    // owned by WP141 (COMPLETE), recorded here and deliberately not fixed.
    expect(existsSync(join(process.cwd(), 'app/legal'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'app/privacy/page.tsx'))).toBe(true);
    expect(protectedWebsitePaths()).not.toContain('app/legal/');
    expect(REPORT_275_CORRECTION).toMatch(/app\/legal\/ does not exist/);
  });
});

describe('PX boundary — migration ownership and website ownership never intersect', () => {
  it('no PX-C package owns a website path', () => {
    for (const [wp, paths] of Object.entries(PX_MIGRATION_OWNERSHIP)) {
      for (const p of paths) {
        expect(classifyPath(p), `${wp} claims ${p}, which classifies as website`).not.toBe('website');
      }
    }
  });

  it('classifies the three PX-C environments as migration territory', () => {
    expect(classifyPath('app/admin/page.tsx')).toBe('px-migration');
    expect(classifyPath('app/company/kora-index/page.tsx')).toBe('px-migration');
    expect(classifyPath('app/worker/workspace/page.tsx')).toBe('px-migration');
  });

  it('classifies every protected website surface as website territory', () => {
    for (const p of ['app/page.tsx', 'app/pilot/page.tsx', 'app/demo/future-vision/page.tsx',
                     'app/cv/share/[token]/page.tsx', 'app/login/page.tsx', 'app/privacy/page.tsx',
                     'app/request-access/page.tsx', 'components/landing/MarketingFooter.tsx']) {
      expect(classifyPath(p), `${p} must be website territory`).toBe('website');
    }
  });
});

describe('PX boundary — the guard fails closed', () => {
  it('rejects a website surface proposed as a migration target, naming why', () => {
    const v = checkMigrationTargets('KORA-WP-128', ['app/company/pillars/page.tsx', 'app/pilot/page.tsx']);
    expect(v).toHaveLength(1);
    expect(v[0].path).toBe('app/pilot/page.tsx');
    expect(v[0].reason).toMatch(/separate website workstream/);
    expect(v[0].reason).toMatch(/not a Product visual benchmark/);
  });

  it('throws rather than letting a website migration proceed', () => {
    expect(() => assertNoWebsiteMigration('KORA-WP-129', ['app/demo/future-vision/page.tsx']))
      .toThrow(/website surface\(s\) claimed as migration targets/);
  });

  it('permits a legitimate Worker migration cohort', () => {
    expect(() => assertNoWebsiteMigration('KORA-WP-129', [
      'app/worker/workspace/page.tsx', 'app/worker/privacy/_components/PrivacySettingsClient.tsx',
    ])).not.toThrow();
  });

  it('catches every violation in a batch, not just the first', () => {
    const v = checkMigrationTargets('KORA-WP-127', ['app/pilot/page.tsx', 'app/page.tsx', 'app/admin/page.tsx']);
    expect(v.map((x) => x.path).sort()).toEqual(['app/page.tsx', 'app/pilot/page.tsx']);
  });
});

describe('PX boundary — read-only references remain legal', () => {
  it('a read-only assertion into a website path is not a migration target', () => {
    expect(isReadOnlyReference('app/pilot/page.tsx', 'assert-only')).toBe(true);
    expect(isReadOnlyReference('app/pilot/page.tsx', 'migrate')).toBe(false);
    // and it never appears in a violation list, because it is not passed as one
    expect(checkMigrationTargets('KORA-WP-128', [])).toEqual([]);
  });

  it('the live example still works: WP128 reads /pilot only to keep /demo/guide dead', () => {
    const src = readFileSync(join(process.cwd(), 'tests/unit/kora-wp-128-company-experience.test.ts'), 'utf8');
    expect(src).toContain('app/pilot/page.tsx');
    expect(src).toContain('/demo/guide');
    // it asserts absence of a dead href — it constrains no visual property
    expect(src).not.toMatch(/pilot[^\n]*(fontSize|spacing|typography|redesign|archetype)/i);
  });

  it('/demo/future-vision stays a pinned destination, never a migration target', () => {
    // KORA-WP-129's guard pins it; this confirms the boundary agrees it is
    // website territory and therefore out of migration scope.
    expect(classifyPath('app/demo/future-vision/page.tsx')).toBe('website');
    const worker = readFileSync(join(process.cwd(), 'tests/unit/kora-wp-129-worker-experience.test.ts'), 'utf8');
    expect(worker).toContain('/demo/future-vision');
  });

  it('the orphaned /legal/privacy archetype does not pull anything into migration scope', () => {
    // No app/legal/ exists, so nothing is claimed either way; app/privacy/ —
    // the real public surface — is website territory.
    expect(classifyPath('app/privacy/page.tsx')).toBe('website');
    expect(classifyPath('app/legal/privacy/page.tsx')).toBe('unclassified');
  });
});

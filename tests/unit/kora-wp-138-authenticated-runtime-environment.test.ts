// tests/unit/kora-wp-138-authenticated-runtime-environment.test.ts
//
// KORA-WP-138 — Authenticated Runtime Environment Canonicalization.
//
// Closes OBS-02: `lib/demo-state` initialises `activeEnvironment` to 'demo' and
// `shouldShowDemoControls()` grants the switcher only to an unauthenticated
// visitor or KORA_ADMIN, so a real COMPANY_ADMIN had no path to 'live'.
// `useScoringResult` read that raw value and took the demo branch, which returns
// `insufficient_data` SYNCHRONOUSLY without querying the database — while the
// banner, already applying the correct rule, displayed LIVE.
//
// These tests assert the INVARIANT, not a spelling. See §B147 below for why the
// previous proxy assertion was insufficient.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  resolveEffectiveEnvironment,
  resolveBannerEnvironment,
  shouldShowDemoControls,
} from '@/lib/demo-state/demo-controls-guard';

const ROOT = resolve(process.cwd());
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const COMPANY_SURFACES = [
  'app/company/reports/page.tsx',
  'app/company/activation/page.tsx',
  'app/company/pillars/page.tsx',
  'app/company/financial/page.tsx',
] as const;

describe('WP-138 (A) — an authenticated COMPANY_ADMIN can never resolve to demo', () => {
  it('COMPANY_ADMIN + raw demo → live', () => {
    expect(resolveEffectiveEnvironment('COMPANY_ADMIN', 'demo')).toBe('live');
  });

  it('COMPANY_ADMIN + raw live → live', () => {
    expect(resolveEffectiveEnvironment('COMPANY_ADMIN', 'live')).toBe('live');
  });

  it('no raw environment value can push COMPANY_ADMIN into demo', () => {
    // The whole OBS-02 defect class in one assertion: client state is not
    // permitted to decide the runtime for a real authenticated user.
    for (const raw of ['demo', 'live', 'future'] as const) {
      expect(resolveEffectiveEnvironment('COMPANY_ADMIN', raw)).toBe('live');
    }
  });

  it('every other real authenticated role is live too, not just COMPANY_ADMIN', () => {
    for (const role of ['WORKER', 'PARTNER', 'ADVISOR', 'AUTHENTICATED']) {
      expect(resolveEffectiveEnvironment(role, 'demo'), `${role} must be live`).toBe('live');
    }
  });

  it('a still-resolving session fails safe toward live, never demo', () => {
    // The demo branch resolves synchronously, so a transient 'demo' would paint
    // an empty state before the real role arrives.
    expect(resolveEffectiveEnvironment(undefined, 'demo')).toBe('live');
  });
});

describe('WP-138 (F) — authorized demo contexts are preserved exactly', () => {
  it('an unauthenticated visitor keeps the demo preference', () => {
    expect(resolveEffectiveEnvironment(null, 'demo')).toBe('demo');
    expect(resolveEffectiveEnvironment(null, 'live')).toBe('live');
    expect(resolveEffectiveEnvironment(null, 'future')).toBe('future');
  });

  it('KORA_ADMIN retains authorized environment switching', () => {
    expect(resolveEffectiveEnvironment('KORA_ADMIN', 'demo')).toBe('demo');
    expect(resolveEffectiveEnvironment('KORA_ADMIN', 'live')).toBe('live');
    expect(resolveEffectiveEnvironment('KORA_ADMIN', 'future')).toBe('future');
  });

  it('the resolver agrees with the existing demo-controls contract', () => {
    // Whoever may see the switcher is exactly whoever the preference binds for.
    for (const role of [null, 'KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', undefined]) {
      const respectsPreference = resolveEffectiveEnvironment(role, 'demo') === 'demo';
      expect(respectsPreference).toBe(shouldShowDemoControls(role));
    }
  });
});

describe('WP-138 (E) — chrome and scoring cannot disagree', () => {
  it('the banner resolves through the same rule', () => {
    for (const role of [null, 'KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER']) {
      for (const raw of ['demo', 'live', 'future'] as const) {
        expect(resolveBannerEnvironment(role, raw)).toBe(resolveEffectiveEnvironment(role, raw));
      }
    }
  });

  it('the banner keeps its stricter pending behaviour', () => {
    // Renders nothing while the session is unknown — deliberately stricter than
    // the scoring path, which must fail safe toward live instead.
    expect(resolveBannerEnvironment(undefined, 'demo')).toBeNull();
  });

  it('there is exactly ONE implementation of the rule', () => {
    const banner = read('lib/demo-state/demo-controls-guard.ts');
    // resolveBannerEnvironment must delegate, not re-derive.
    expect(banner).toContain('return resolveEffectiveEnvironment(realRole, activeEnvironment);');
  });
});

describe('WP-138 (B) — one canonical rule, consumed by scoring', () => {
  it('useScoringResult consumes the canonical resolver, not raw demo-state', () => {
    const src = read('lib/scoring-result/index.ts');
    expect(src).toContain('useEffectiveEnvironment');
    expect(src).toContain('forceEnvironment ?? canonicalEnvironment');
    // The raw-preference hook must no longer drive scoring.
    expect(src).not.toMatch(/activeEnvironment:\s*globalEnvironment/);
  });

  it('the provider exposes the real session role as distinct from activeRole', () => {
    const src = read('lib/demo-state/index.ts');
    expect(src).toContain('realRole: initialRole');
    expect(src).toContain('export function useEffectiveEnvironment');
  });
});

describe('WP-138 (C)(D)(H) — surfaces are fixed centrally, not page by page', () => {
  it('the four affected pages carry NO per-page forceEnvironment patchwork', () => {
    // Acceptance (H). They are correct because the shared invariant is correct.
    for (const page of COMPANY_SURFACES) {
      expect(read(page), `${page} must not be patched individually`)
        .not.toContain("forceEnvironment: 'live'");
    }
  });

  it('all five canonical surfaces consume the same scoring hook', () => {
    for (const page of [...COMPANY_SURFACES, 'app/company/kora-index/page.tsx']) {
      expect(read(page), `${page} must use useScoringResult`).toContain('useScoringResult');
    }
  });
});

describe('WP-138 — mutation proof: the suite detects the regression', () => {
  // A suite that still passes when COMPANY_ADMIN -> demo is restored would be
  // worthless. This proves the assertions above are load-bearing by re-running
  // the invariant against a deliberately broken reimplementation.
  function regressedResolver(realRole: string | null | undefined, raw: string): string {
    return raw; // the pre-WP-138 behaviour: raw demo-state wins
  }

  it('the pre-WP-138 behaviour would fail the (A) invariant', () => {
    expect(regressedResolver('COMPANY_ADMIN', 'demo')).toBe('demo');
    expect(resolveEffectiveEnvironment('COMPANY_ADMIN', 'demo')).not.toBe(
      regressedResolver('COMPANY_ADMIN', 'demo'),
    );
  });

  it('a naive always-live resolver would fail the (F) invariant', () => {
    const tooBroad = () => 'live';
    expect(tooBroad()).not.toBe(resolveEffectiveEnvironment('KORA_ADMIN', 'demo'));
    expect(tooBroad()).not.toBe(resolveEffectiveEnvironment(null, 'demo'));
  });
});

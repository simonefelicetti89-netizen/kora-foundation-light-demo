// tests/unit/kora-wp-044-feature-flags.test.ts
// KORA-WP-044 — PLATFORM-017: generic feature-flag mechanism.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { isFeatureFlagEnabled, FEATURE_FLAG_NAMES, type FeatureFlagName } from '@/lib/feature-flags/feature-flags';

describe('KORA-WP-044 — isFeatureFlagEnabled()', () => {
  it('the registry starts empty — no WP has registered a flag through this mechanism yet', () => {
    expect(FEATURE_FLAG_NAMES).toEqual([]);
  });

  it('returns true only for the exact string "true" (case-sensitive), same convention as every existing ad hoc isXEnabled()', () => {
    // Cast is required because the registry is intentionally empty today
    // (see module header) — this exercises the accessor's own pure logic
    // generically, the same way lib/kora-link/config.ts's own tests probe
    // isKoraLinkEnabled() before any real flag depends on it.
    const flag = 'EXAMPLE_FEATURE_ENABLED' as FeatureFlagName;
    expect(isFeatureFlagEnabled(flag, { EXAMPLE_FEATURE_ENABLED: 'true' })).toBe(true);
    expect(isFeatureFlagEnabled(flag, { EXAMPLE_FEATURE_ENABLED: 'True' })).toBe(false);
    expect(isFeatureFlagEnabled(flag, { EXAMPLE_FEATURE_ENABLED: '1' })).toBe(false);
    expect(isFeatureFlagEnabled(flag, {})).toBe(false);
  });

  it('does not migrate or touch lib/kora-link/config.ts\'s own three existing ad hoc flags (out of this WP\'s proportionate scope)', () => {
    const src = readFileSync('lib/kora-link/config.ts', 'utf-8');
    expect(src).toContain('isKoraLinkEnabled');
    expect(src).toContain('isKoraLinkDbLookupEnabled');
    expect(src).toContain('isKoraLinkActivationEnabled');
    expect(src).not.toContain('feature-flags');
  });
});

// lib/feature-flags/feature-flags.ts
// KORA-WP-044 — Security Hardening Batch (PLATFORM-017: Generic feature-flag
// mechanism, doc 46: "Only the KORA Link 3-flag ad hoc pattern; add a
// generic flags mechanism for staged rollouts — every new gated feature
// repeats an ad hoc pattern").
//
// WHAT THIS IS: a single, generic, typed accessor any future WP can use
// instead of writing its own `isXEnabled(env) { return env.X === 'true'; }`
// function — one named registry of known flags (so a typo'd env var name
// fails at compile time, not silently returns "disabled"), one pure
// accessor, same env-injection-for-testing shape as every existing
// isKoraLinkXEnabled() function in lib/kora-link/config.ts.
//
// WHAT THIS IS NOT: this does NOT migrate lib/kora-link/config.ts's own
// three existing flags (KORA_LINK_ENABLED, KORA_LINK_DB_LOOKUP_ENABLED,
// KORA_LINK_ACTIVATION_ENABLED) onto this mechanism — that would be an
// unrelated refactor of already-working, already-tested code, outside this
// WP's own proportionate scope (no fix for convenience). This module exists
// so the NEXT gated feature has a place to register a flag without
// repeating the ad hoc pattern; it does not retroactively rewrite the ones
// that already exist.
//
// Server-only. No browser import. No DB. No external dependency.

export type FeatureFlagEnv = {
  readonly [key: string]: string | undefined;
};

// The registry of known flag names — add one line here when a future WP
// needs a new staged-rollout gate. Intentionally empty today: no WP has yet
// asked to register a flag through this mechanism (every currently-live
// gated feature predates it and is out of this WP's own scope, per the
// header above). Keeping it typed (not a bare `string` parameter) is the
// whole point — a call site referencing an unregistered name fails at
// compile time instead of silently reading an env var that will never be
// set.
export const FEATURE_FLAG_NAMES = [] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

/**
 * Returns true only if `env[flagName] === 'true'` (exact string,
 * case-sensitive) — the same convention every existing ad hoc
 * isXEnabled() function in this codebase already uses. Default: false.
 * Accepts injected env for testing.
 */
export function isFeatureFlagEnabled(flagName: FeatureFlagName, env: FeatureFlagEnv = process.env): boolean {
  return env[flagName] === 'true';
}

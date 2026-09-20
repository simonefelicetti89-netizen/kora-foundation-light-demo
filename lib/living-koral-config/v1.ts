// lib/living-koral-config/v1.ts
// KORA-WP-111 — Living KORAL Semantic Foundation.
//
// Small, pure config-read helpers over the versioned constitution/
// taxonomy/framework data — mirroring lib/methodology-config/v0.1.ts's
// own established shape exactly (a typed config object read from a JSON
// data file, exposed through narrow getter functions, never re-derived
// or hardcoded at any call site).
//
// No database call, no network call, no runtime state, no user/tenant
// context — this module cannot fail at runtime beyond a malformed import,
// and carries none of the concerns (persistence, RLS, async) KORA-WP-112+
// owns. See this WP's own registry 142 entry: "Service/API: a config-read
// helper only."
//
// VERSIONING: this file is named v1.ts (not index.ts) deliberately, the
// same discipline lib/methodology-config/v0.1.ts already establishes — a
// future Living KORAL config version ships as v2.ts alongside this file,
// never by mutating it in place, so historical semantic reproducibility
// (constitution principle 14: "Historical Editions must remain
// reproducible") is structurally possible from the moment this module
// exists, not retrofitted later.

import type { LivingKoralConstitutionConfig, LivingKoralConstitutionPrinciple, MaterialChangeTaxonomyEntry, OrganizationChangedVsKoraLearnedEntry } from './types';
import rawConfig from '@/data/living-koral/constitution-v1.json';

// TypeScript's `readonly` is compile-time only — without this, the
// accessors below would return the module's own live internal array/
// object by reference, letting any caller silently mutate this WP's own
// shared config state at runtime (caught by this WP's own test suite).
// Deep-freezing at load time makes "read-only" a real runtime guarantee,
// not only a type annotation — a mutation attempt now throws in strict
// mode (every ES module) instead of corrupting shared state.
function deepFreeze<T>(value: T): T {
  if (value !== null && (typeof value === 'object' || Array.isArray(value))) {
    Object.values(value as object).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const config: LivingKoralConstitutionConfig = deepFreeze(rawConfig as LivingKoralConstitutionConfig);

/** The full versioned Living KORAL constitution config, as-is. Most callers want one of the narrower getters below instead. */
export function getLivingKoralConstitutionConfig(): LivingKoralConstitutionConfig {
  return config;
}

/** The explicit config version (e.g. "1.0") — never inferred from file presence. */
export function getLivingKoralConfigVersion(): string {
  return config.version;
}

/** The 18 fixed, Founder-locked constitution principles (doc 132 §E), in their own canonical order. */
export function getLivingKoralConstitution(): readonly LivingKoralConstitutionPrinciple[] {
  return config.constitution;
}

/** The 7 retained Material Change taxonomy categories for Change Protocol v1 (doc 129 Part 2). */
export function getMaterialChangeTaxonomy(): readonly MaterialChangeTaxonomyEntry[] {
  return config.materialChangeTaxonomy;
}

/** One taxonomy entry by category name, or undefined if not found (never throws — callers decide how to handle an unknown category). */
export function getMaterialChangeTaxonomyEntry(category: MaterialChangeTaxonomyEntry['category']): MaterialChangeTaxonomyEntry | undefined {
  return config.materialChangeTaxonomy.find((entry) => entry.category === category);
}

/** The 6-way Organization-Changed-vs-KORA-Learned framework (doc 129 Part 3). */
export function getOrganizationChangedVsKoraLearnedFramework(): readonly OrganizationChangedVsKoraLearnedEntry[] {
  return config.organizationChangedVsKoraLearned;
}

/**
 * The single structural rule every KORA-WP-112+ Change Protocol
 * implementation must obey: only type 'A' entries ever justify a
 * Material Change Event. Exposed as its own accessor (not left for every
 * consumer to re-derive from `justifiesMaterialChange` by hand) so the
 * invariant has exactly one source of truth.
 */
export function getMaterialChangeJustifyingTypes(): readonly OrganizationChangedVsKoraLearnedEntry['type'][] {
  return config.organizationChangedVsKoraLearned.filter((entry) => entry.justifiesMaterialChange).map((entry) => entry.type);
}

// lib/partner-initiatives/config.ts
// PARTNER-02 — feature flag for partner initiative participation.
// Server-only. No browser imports. No Supabase. No DB.
//
// Mirrors the lib/kora-link/config.ts pattern: exact-string 'true' check,
// default off, env injectable for tests.
//
// Today this flag has no live data source to gate — no migration has
// introduced a partner-initiative-participation table yet (see
// docs/FUTURE_ROLES_AND_SURFACES.md). It exists now so the eventual live
// wiring has an established on/off switch, and so getPartnerInitiatives()
// (service.ts) never needs its call sites changed when that wiring lands —
// only the flag and the function body.

export type PartnerInitiativesEnv = {
  readonly [key: string]: string | undefined;
  PARTNER_INITIATIVES_LIVE_ENABLED?: string | undefined;
};

/**
 * Returns true only if PARTNER_INITIATIVES_LIVE_ENABLED === 'true' (exact
 * string, case-sensitive). Default: false.
 */
export function isPartnerInitiativesLiveEnabled(env: PartnerInitiativesEnv = process.env): boolean {
  return env.PARTNER_INITIATIVES_LIVE_ENABLED === 'true';
}

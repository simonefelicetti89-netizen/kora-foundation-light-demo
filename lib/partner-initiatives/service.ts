// lib/partner-initiatives/service.ts
// PARTNER-02 — partner initiative participation service foundation.
// Server-only. No DB call today — no live data source exists (see header note).
//
// WHY THIS FUNCTION ALWAYS RETURNS AN EMPTY RESULT TODAY
// No migration has introduced a partner-initiative-participation table or
// RPC yet (see docs/FUTURE_ROLES_AND_SURFACES.md — "Missing foundations for
// the next increment"). Building that table is a schema/Gate-2-shaped change
// and is explicitly out of scope for this sprint. This function exists so:
//   (a) app/partner/workspace/page.tsx has a stable call site to render from,
//       and never needs to change when real data lands — only this function's
//       body does;
//   (b) the feature flag (config.ts) already exists so enabling live data
//       later is a config change, not a new integration;
//   (c) no fake/demo data is ever shown in the LIVE partner workspace — the
//       empty state is always honest about what exists today.
//
// PRIVACY INVARIANT — NEVER RELAX
// This function must never return a worker-level identifier of any kind.
// See lib/partner-initiatives/types.ts's header for the full list.

import { isPartnerInitiativesLiveEnabled, type PartnerInitiativesEnv } from './config';
import type { PartnerInitiativesResult } from './types';

const EMPTY_STATE_MESSAGE = 'Nessuna iniziativa partner assegnata ancora.';

export async function getPartnerInitiatives(
  // partnerId is accepted now (not yet used) so the eventual live query —
  // scoped by partner_id, matching every other partner-facing read in this
  // codebase — can be added without changing this function's call sites.
  partnerId: string,
  env: PartnerInitiativesEnv = process.env,
): Promise<PartnerInitiativesResult> {
  void partnerId;

  if (!isPartnerInitiativesLiveEnabled(env)) {
    return {
      isLive: false,
      initiatives: [],
      emptyStateMessage: EMPTY_STATE_MESSAGE,
    };
  }

  // Live path: NOT IMPLEMENTED. No partner-initiative-participation table or
  // RPC exists in supabase/migrations or supabase/proposed today. Flipping
  // PARTNER_INITIATIVES_LIVE_ENABLED=true does not change this function's
  // behavior yet — it still safely returns the empty state, never fabricated
  // or demo data, until a real query is implemented here alongside the
  // migration that introduces the underlying table.
  return {
    isLive: false,
    initiatives: [],
    emptyStateMessage: EMPTY_STATE_MESSAGE,
  };
}

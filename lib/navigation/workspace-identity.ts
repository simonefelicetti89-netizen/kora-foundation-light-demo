// lib/navigation/workspace-identity.ts
// KORA-WP-125 — workspace identity for the shared top chrome.
//
// HANDOFF §16 and §21.5: environments are recognisably ONE product. They differ
// by navigation content, density and which grammar is present — never by
// palette. The workspace avatar gradient is the only element that varies, and a
// new environment picks a gradient from the existing palette rather than
// introducing an accent colour.
//
// This is derived from the authenticated session's own role. It is NOT derived
// from whether the tenant holds synthetic data — Governance Patch 03 ("One
// Product / No Demo Runtime", 2026-08-31) forbids any architecture-driven
// demo/synthetic indication, and states that tenant_kind "may change side
// effects, it may not change product truth", explicitly including
// customer-facing navigation and copy.

import { KORA_COLORS, MACROBLOCK_COLORS, PX } from '@/lib/design/kora-design-tokens';

export interface WorkspaceIdentity {
  key: string;
  label: string;
  initial: string;
  /** Gradient drawn only from the ratified palette — no new accent colour. */
  gradient: string;
}

// Every stop is an existing ratified token. No value is authored here — an
// invented colour would be exactly the "new accent colour" §21.5 forbids, and
// the KORA-WP-088 guard would (correctly) reject it.
export const WORKSPACE_IDENTITY: Record<string, WorkspaceIdentity> = {
  KORA_ADMIN:    { key: 'admin',   label: 'KORA Admin', initial: 'K', gradient: `linear-gradient(135deg, ${PX.cyan}, ${PX.violet700})` },
  COMPANY_ADMIN: { key: 'company', label: 'Company',    initial: 'C', gradient: `linear-gradient(135deg, ${KORA_COLORS.TERRACOTTA}, ${MACROBLOCK_COLORS.BTI})` },
  WORKER:        { key: 'worker',  label: 'My KORA',    initial: 'W', gradient: `linear-gradient(135deg, ${PX.violet}, ${PX.violet700})` },
  PARTNER:       { key: 'partner', label: 'Partner',    initial: 'P', gradient: `linear-gradient(135deg, ${MACROBLOCK_COLORS.QUALITY}, ${KORA_COLORS.COSMIC_BLUE})` },
  ADVISOR:       { key: 'advisor', label: 'Advisor',    initial: 'A', gradient: `linear-gradient(135deg, ${PX.violet}, ${MACROBLOCK_COLORS.EQUITY})` },
};

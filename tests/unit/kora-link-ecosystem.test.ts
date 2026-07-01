// tests/unit/kora-link-ecosystem.test.ts
// KL-23 — KORA Link Ecosystem Control Layer unit tests.
// No Supabase. No DB. No network. Pure data + pure functions only.

import { describe, it, expect } from 'vitest';
import {
  KORA_LINK_ROLES,
  KORA_LINK_ROLE_LABEL,
  KORA_LINK_GATES,
  KORA_LINK_GATE_STATUS,
  getKoraLinkGates,
  KORA_LINK_CAPABILITY_STATE_LABEL,
  KORA_LINK_CAPABILITIES,
  KORA_LINK_CAPABILITY_IDS,
  getKoraLinkCapability,
  getKoraLinkCapabilityState,
  getKoraLinkCapabilitiesForRole,
  getKoraLinkEcosystemContext,
  KORA_LINK_PRIVACY_BOUNDARIES,
  getKoraLinkPrivacyBoundariesForRole,
  KORA_LINK_LIFECYCLE,
  getKoraLinkLifecycleWithState,
  KORA_LINK_EVENT_MAPPING,
  getKoraLinkEventMapping,
  getKoraLinkRoleSummary,
  type KoraLinkGateId,
} from '@/lib/kora-link/ecosystem';
import type { KoraLinkEnv } from '@/lib/kora-link/config';

const VALID_GATE_IDS = new Set(KORA_LINK_GATES.map((g) => g.id));

// ── 1. Roles ──────────────────────────────────────────────────────────────────

describe('KORA_LINK_ROLES', () => {

  it('contains exactly the 6 documented roles', () => {
    expect([...KORA_LINK_ROLES].sort()).toEqual(
      ['admin', 'worker', 'company', 'partner', 'space', 'algorithm'].sort()
    );
  });

  it('every role has a non-empty display label', () => {
    for (const role of KORA_LINK_ROLES) {
      expect(KORA_LINK_ROLE_LABEL[role]).toBeTruthy();
      expect(typeof KORA_LINK_ROLE_LABEL[role]).toBe('string');
    }
  });

});

// ── 2. Gates ──────────────────────────────────────────────────────────────────

describe('KORA_LINK_GATES', () => {

  it('defines exactly 9 gates', () => {
    expect(KORA_LINK_GATES.length).toBe(9);
  });

  it('gate ids are unique', () => {
    const ids = KORA_LINK_GATES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gate order values are 1..9 with no gaps or duplicates', () => {
    const orders = KORA_LINK_GATES.map((g) => g.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('every gate has a non-empty label and description', () => {
    for (const gate of KORA_LINK_GATES) {
      expect(gate.label.length).toBeGreaterThan(0);
      expect(gate.description.length).toBeGreaterThan(0);
    }
  });

  it('Gate 1 (runtime base) is closed — matches CLAUDE.md gate status', () => {
    expect(KORA_LINK_GATE_STATUS.gate_1_runtime_base).toBe('closed');
  });

  it('Gates 2 through 9 are open — matches CLAUDE.md gate status (nothing closed prematurely)', () => {
    const openGates: KoraLinkGateId[] = [
      'gate_2_schema_034', 'gate_3_dpo_legal', 'gate_4_rls_035', 'gate_5_staging_env',
      'gate_6_public_route_enablement', 'gate_7_worker_activation',
      'gate_8_partner_scan', 'gate_9_production_readiness',
    ];
    for (const id of openGates) {
      expect(KORA_LINK_GATE_STATUS[id]).toBe('open');
    }
  });

  it('getKoraLinkGates() merges status into every gate definition', () => {
    const gates = getKoraLinkGates();
    expect(gates.length).toBe(9);
    for (const gate of gates) {
      expect(['open', 'closed']).toContain(gate.status);
    }
  });

  it('getKoraLinkGates() accepts a custom status map override', () => {
    const allClosed = Object.fromEntries(
      KORA_LINK_GATES.map((g) => [g.id, 'closed'])
    ) as Record<KoraLinkGateId, 'closed'>;
    const gates = getKoraLinkGates(allClosed);
    expect(gates.every((g) => g.status === 'closed')).toBe(true);
  });

});

// ── 3. Capability registry integrity ──────────────────────────────────────────

describe('KORA_LINK_CAPABILITIES — registry integrity', () => {

  it('defines exactly the 13 documented capabilities', () => {
    expect(KORA_LINK_CAPABILITIES.length).toBe(13);
    expect(KORA_LINK_CAPABILITY_IDS.length).toBe(13);
  });

  it('capability ids are unique', () => {
    const ids = KORA_LINK_CAPABILITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every capability has at least one role', () => {
    for (const cap of KORA_LINK_CAPABILITIES) {
      expect(cap.roles.length).toBeGreaterThan(0);
    }
  });

  it('every capability role is a valid KoraLinkEcosystemRole', () => {
    for (const cap of KORA_LINK_CAPABILITIES) {
      for (const role of cap.roles) {
        expect(KORA_LINK_ROLES).toContain(role);
      }
    }
  });

  it('every requiredGates entry references a real gate id', () => {
    for (const cap of KORA_LINK_CAPABILITIES) {
      for (const gateId of cap.requiredGates) {
        expect(VALID_GATE_IDS.has(gateId)).toBe(true);
      }
    }
  });

  it('every capability has a non-empty label and description', () => {
    for (const cap of KORA_LINK_CAPABILITIES) {
      expect(cap.label.length).toBeGreaterThan(0);
      expect(cap.description.length).toBeGreaterThan(0);
    }
  });

  it('getKoraLinkCapability() returns the matching definition for every id', () => {
    for (const id of KORA_LINK_CAPABILITY_IDS) {
      expect(getKoraLinkCapability(id).id).toBe(id);
    }
  });

  it('impactUnitEligible is never anything other than "no" or "future" — never "yes"', () => {
    for (const cap of KORA_LINK_CAPABILITIES) {
      expect(['no', 'future']).toContain(cap.impactUnitEligible);
    }
  });

  it('affectsKoraIndex is never anything other than "no" or "future" — never "yes"', () => {
    for (const cap of KORA_LINK_CAPABILITIES) {
      expect(['no', 'future']).toContain(cap.affectsKoraIndex);
    }
  });

  it('affectsConfidence is never anything other than "no" or "future" — never "yes"', () => {
    for (const cap of KORA_LINK_CAPABILITIES) {
      expect(['no', 'future']).toContain(cap.affectsConfidence);
    }
  });

});

// ── 4. Capability state — always_on / roadmap / drafted_pending_gate ─────────

describe('getKoraLinkCapabilityState — non-flag-gated implementations', () => {

  it('token_generation is always available (always_on, Lab-only, no DB dependency)', () => {
    expect(getKoraLinkCapabilityState('token_generation')).toBe('available');
  });

  it('nfc_url_generation is always available (Lab capability)', () => {
    expect(getKoraLinkCapabilityState('nfc_url_generation')).toBe('available');
  });

  it('always_on capabilities stay available regardless of any context passed', () => {
    expect(getKoraLinkCapabilityState('token_generation', {
      koraLinkEnabled: false, dbLookupEnabled: false, activationEnabled: false,
    })).toBe('available');
  });

  it('revocation is requires_gate — drafted in 036, no runtime code yet', () => {
    expect(getKoraLinkCapabilityState('revocation')).toBe('requires_gate');
  });

  it('replacement is requires_gate — drafted in 036, no runtime code yet', () => {
    expect(getKoraLinkCapabilityState('replacement')).toBe('requires_gate');
  });

  it('company_aggregate_visibility is requires_gate', () => {
    expect(getKoraLinkCapabilityState('company_aggregate_visibility')).toBe('requires_gate');
  });

  it('drafted_pending_gate capabilities never become available just because gates are closed in context (code does not exist yet)', () => {
    const allClosed = Object.fromEntries(KORA_LINK_GATES.map((g) => [g.id, 'closed'])) as Record<KoraLinkGateId, 'closed'>;
    expect(getKoraLinkCapabilityState('revocation', { gateStatus: allClosed })).toBe('requires_gate');
  });

  it('partner_verified_scan is planned (roadmap, no draft yet)', () => {
    expect(getKoraLinkCapabilityState('partner_verified_scan')).toBe('planned');
  });

  it('space_initiative_linking is planned', () => {
    expect(getKoraLinkCapabilityState('space_initiative_linking')).toBe('planned');
  });

  it('impact_unit_mapping is planned — never available, never triggers a real IU', () => {
    expect(getKoraLinkCapabilityState('impact_unit_mapping')).toBe('planned');
  });

  it('confidence_score_support is planned', () => {
    expect(getKoraLinkCapabilityState('confidence_score_support')).toBe('planned');
  });

  it('roadmap capabilities stay planned even if all gates are closed in context', () => {
    const allClosed = Object.fromEntries(KORA_LINK_GATES.map((g) => [g.id, 'closed'])) as Record<KoraLinkGateId, 'closed'>;
    expect(getKoraLinkCapabilityState('impact_unit_mapping', { gateStatus: allClosed })).toBe('planned');
  });

});

// ── 5. Capability state — flag_gated (public_route, db_lookup, worker_activation, consent_capture)

describe('getKoraLinkCapabilityState — flag_gated implementations', () => {

  it('public_route is locked when KORA_LINK_ENABLED is off (default)', () => {
    expect(getKoraLinkCapabilityState('public_route', {})).toBe('locked');
  });

  it('db_lookup is locked when the DB lookup flag is off', () => {
    expect(getKoraLinkCapabilityState('db_lookup', { dbLookupEnabled: false })).toBe('locked');
  });

  it('worker_activation is locked when the activation flag is off (default env)', () => {
    expect(getKoraLinkCapabilityState('worker_activation', {})).toBe('locked');
  });

  it('consent_capture is locked when the activation flag is off', () => {
    expect(getKoraLinkCapabilityState('consent_capture', { activationEnabled: false })).toBe('locked');
  });

  it('locked capabilities stay locked even if all gates are closed in context — flag is the primary gate', () => {
    const allClosed = Object.fromEntries(KORA_LINK_GATES.map((g) => [g.id, 'closed'])) as Record<KoraLinkGateId, 'closed'>;
    expect(getKoraLinkCapabilityState('worker_activation', {
      activationEnabled: false, gateStatus: allClosed,
    })).toBe('locked');
  });

  it('public_route is configured (not available) when flag is on but Gate 6 is still open (default gate status)', () => {
    expect(getKoraLinkCapabilityState('public_route', { koraLinkEnabled: true })).toBe('configured');
  });

  it('db_lookup is configured (not available) when flag is on but Gates 2-5 are open (default gate status)', () => {
    expect(getKoraLinkCapabilityState('db_lookup', { dbLookupEnabled: true })).toBe('configured');
  });

  it('worker_activation never reports available while required gates remain open — "locked unless gates satisfied" in practice', () => {
    const state = getKoraLinkCapabilityState('worker_activation', { activationEnabled: true });
    expect(state).not.toBe('available');
    expect(state).toBe('configured');
  });

  it('public_route becomes available when flag is on AND all its required gates are closed', () => {
    const allClosed = Object.fromEntries(KORA_LINK_GATES.map((g) => [g.id, 'closed'])) as Record<KoraLinkGateId, 'closed'>;
    expect(getKoraLinkCapabilityState('public_route', {
      koraLinkEnabled: true, gateStatus: allClosed,
    })).toBe('available');
  });

  it('worker_activation becomes available when flag is on AND all its required gates are closed', () => {
    const allClosed = Object.fromEntries(KORA_LINK_GATES.map((g) => [g.id, 'closed'])) as Record<KoraLinkGateId, 'closed'>;
    expect(getKoraLinkCapabilityState('worker_activation', {
      activationEnabled: true, gateStatus: allClosed,
    })).toBe('available');
  });

  it('public_route is disabled when the flag is on but the rate limit provider is explicitly "disabled"', () => {
    expect(getKoraLinkCapabilityState('public_route', {
      koraLinkEnabled: true, rateLimitProvider: 'disabled',
    })).toBe('disabled');
  });

  it('public_route "disabled" state takes precedence over "available" even with all gates closed', () => {
    const allClosed = Object.fromEntries(KORA_LINK_GATES.map((g) => [g.id, 'closed'])) as Record<KoraLinkGateId, 'closed'>;
    expect(getKoraLinkCapabilityState('public_route', {
      koraLinkEnabled: true, rateLimitProvider: 'disabled', gateStatus: allClosed,
    })).toBe('disabled');
  });

  it('never throws for any capability id with an empty context', () => {
    for (const id of KORA_LINK_CAPABILITY_IDS) {
      expect(() => getKoraLinkCapabilityState(id, {})).not.toThrow();
    }
  });

});

// ── 6. getKoraLinkCapabilitiesForRole — per-role coherence ────────────────────

describe('getKoraLinkCapabilitiesForRole', () => {

  it('admin sees Control Tower capabilities: token_generation, revocation, replacement', () => {
    const ids = getKoraLinkCapabilitiesForRole('admin').map((c) => c.id);
    expect(ids).toContain('token_generation');
    expect(ids).toContain('revocation');
    expect(ids).toContain('replacement');
  });

  it('admin capability list is non-empty and every entry actually lists admin in its roles', () => {
    const caps = getKoraLinkCapabilitiesForRole('admin');
    expect(caps.length).toBeGreaterThan(0);
    for (const c of caps) {
      expect(c.roles).toContain('admin');
    }
  });

  it('worker sees worker_activation and consent_capture, not admin-only revocation', () => {
    const ids = getKoraLinkCapabilitiesForRole('worker').map((c) => c.id);
    expect(ids).toContain('worker_activation');
    expect(ids).toContain('consent_capture');
    expect(ids).not.toContain('revocation');
  });

  it('company sees only company_aggregate_visibility among the 13 capabilities', () => {
    const ids = getKoraLinkCapabilitiesForRole('company').map((c) => c.id);
    expect(ids).toEqual(['company_aggregate_visibility']);
  });

  it('company capability list never includes worker-level capabilities (activation, consent_capture)', () => {
    const ids = getKoraLinkCapabilitiesForRole('company').map((c) => c.id);
    expect(ids).not.toContain('worker_activation');
    expect(ids).not.toContain('consent_capture');
  });

  it('partner sees only partner_verified_scan among the 13 capabilities', () => {
    const ids = getKoraLinkCapabilitiesForRole('partner').map((c) => c.id);
    expect(ids).toEqual(['partner_verified_scan']);
  });

  it('space sees space_initiative_linking', () => {
    const ids = getKoraLinkCapabilitiesForRole('space').map((c) => c.id);
    expect(ids).toContain('space_initiative_linking');
  });

  it('algorithm sees impact_unit_mapping and confidence_score_support only', () => {
    const ids = getKoraLinkCapabilitiesForRole('algorithm').map((c) => c.id).sort();
    expect(ids).toEqual(['confidence_score_support', 'impact_unit_mapping'].sort());
  });

  it('every returned capability carries a computed state field', () => {
    for (const role of KORA_LINK_ROLES) {
      const caps = getKoraLinkCapabilitiesForRole(role);
      for (const c of caps) {
        expect(['available', 'configured', 'locked', 'requires_gate', 'planned', 'disabled']).toContain(c.state);
      }
    }
  });

  it('every role in KORA_LINK_ROLES has at least one coherent capability', () => {
    for (const role of KORA_LINK_ROLES) {
      expect(getKoraLinkCapabilitiesForRole(role).length).toBeGreaterThan(0);
    }
  });

});

// ── 7. Privacy boundaries ─────────────────────────────────────────────────────

describe('KORA_LINK_PRIVACY_BOUNDARIES', () => {

  it('every boundary has a non-empty statement', () => {
    for (const b of KORA_LINK_PRIVACY_BOUNDARIES) {
      expect(b.statement.length).toBeGreaterThan(0);
    }
  });

  it('no boundary statement contains "worker_id" as literal exposed data', () => {
    for (const b of KORA_LINK_PRIVACY_BOUNDARIES) {
      expect(b.statement).not.toContain('worker_id');
    }
  });

  it('no boundary statement contains a raw token or digest-looking value', () => {
    for (const b of KORA_LINK_PRIVACY_BOUNDARIES) {
      expect(b.statement).not.toMatch(/kl1_[A-Za-z0-9]{48}/);
      expect(b.statement).not.toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('company boundary explicitly states no worker-level visibility', () => {
    const boundaries = getKoraLinkPrivacyBoundariesForRole('company');
    expect(boundaries.length).toBeGreaterThan(0);
    expect(boundaries.some((b) => b.id === 'company_never_sees_worker_level')).toBe(true);
  });

  it('partner boundary states no unnecessary identity data', () => {
    const boundaries = getKoraLinkPrivacyBoundariesForRole('partner');
    expect(boundaries.some((b) => b.id === 'partner_no_unnecessary_identity')).toBe(true);
  });

  it('worker boundary states the worker controls activation and consent', () => {
    const boundaries = getKoraLinkPrivacyBoundariesForRole('worker');
    expect(boundaries.some((b) => b.id === 'worker_controls_activation')).toBe(true);
  });

  it('admin boundary states admin manages infrastructure, not scoring', () => {
    const boundaries = getKoraLinkPrivacyBoundariesForRole('admin');
    expect(boundaries.some((b) => b.id === 'admin_manages_infrastructure_not_scoring')).toBe(true);
  });

  it('algorithm boundary states only eligible/policy-approved events are consumed', () => {
    const boundaries = getKoraLinkPrivacyBoundariesForRole('algorithm');
    expect(boundaries.some((b) => b.id === 'algorithm_only_eligible_events')).toBe(true);
  });

  it('the no-raw-token-persistence boundary applies to every role', () => {
    for (const role of KORA_LINK_ROLES) {
      const boundaries = getKoraLinkPrivacyBoundariesForRole(role);
      expect(boundaries.some((b) => b.id === 'no_raw_token_persistence')).toBe(true);
    }
  });

  it('company boundaries never mention individual worker names or activity', () => {
    const boundaries = getKoraLinkPrivacyBoundariesForRole('company');
    for (const b of boundaries) {
      expect(b.statement.toLowerCase()).not.toContain('nome del worker');
    }
  });

});

// ── 8. Lifecycle overview ─────────────────────────────────────────────────────

describe('KORA_LINK_LIFECYCLE', () => {

  it('defines exactly 7 stages', () => {
    expect(KORA_LINK_LIFECYCLE.length).toBe(7);
  });

  it('stage order values are 1..7 with no gaps or duplicates', () => {
    const orders = KORA_LINK_LIFECYCLE.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('every stage references a real capability id', () => {
    for (const stage of KORA_LINK_LIFECYCLE) {
      expect(KORA_LINK_CAPABILITY_IDS).toContain(stage.relatedCapability);
    }
  });

  it('getKoraLinkLifecycleWithState() attaches a valid state to every stage', () => {
    const stages = getKoraLinkLifecycleWithState();
    expect(stages.length).toBe(7);
    for (const s of stages) {
      expect(['available', 'configured', 'locked', 'requires_gate', 'planned', 'disabled']).toContain(s.state);
    }
  });

  it('batch_generation stage state matches token_generation capability state (always available)', () => {
    const stages = getKoraLinkLifecycleWithState();
    const batch = stages.find((s) => s.id === 'batch_generation');
    expect(batch?.state).toBe('available');
  });

  it('activation stage state matches worker_activation capability state (locked by default)', () => {
    const stages = getKoraLinkLifecycleWithState();
    const activation = stages.find((s) => s.id === 'activation');
    expect(activation?.state).toBe('locked');
  });

});

// ── 9. Algorithm mapping / future event taxonomy ──────────────────────────────

describe('KORA_LINK_EVENT_MAPPING', () => {

  it('defines exactly the 7 documented events', () => {
    expect(KORA_LINK_EVENT_MAPPING.length).toBe(7);
    const ids = KORA_LINK_EVENT_MAPPING.map((e) => e.id).sort();
    expect(ids).toEqual([
      'link_activated', 'link_delivered', 'link_generated', 'link_replaced', 'link_revoked',
      'space_initiative_participation_future', 'verified_partner_event_future',
    ].sort());
  });

  it('no event is eligible for a real Impact Unit — only "no" or "future"', () => {
    for (const e of KORA_LINK_EVENT_MAPPING) {
      expect(['no', 'future']).toContain(e.eligibleForImpactUnit);
    }
  });

  it('no event has a live KORA Index effect — only "no" or "future"', () => {
    for (const e of KORA_LINK_EVENT_MAPPING) {
      expect(['no', 'future']).toContain(e.affectsKoraIndex);
    }
  });

  it('no event has a live Confidence Score effect — only "no" or "future"', () => {
    for (const e of KORA_LINK_EVENT_MAPPING) {
      expect(['no', 'future']).toContain(e.affectsConfidence);
    }
  });

  it('every event requires a valid policy gate', () => {
    for (const e of KORA_LINK_EVENT_MAPPING) {
      expect(VALID_GATE_IDS.has(e.requiresPolicyGate)).toBe(true);
    }
  });

  it('every event has a valid role source', () => {
    for (const e of KORA_LINK_EVENT_MAPPING) {
      expect(KORA_LINK_ROLES).toContain(e.roleSource);
    }
  });

  it('link_activated is sourced from the worker role', () => {
    expect(getKoraLinkEventMapping('link_activated')?.roleSource).toBe('worker');
  });

  it('verified_partner_event_future is sourced from the partner role and is future-only', () => {
    const e = getKoraLinkEventMapping('verified_partner_event_future');
    expect(e?.roleSource).toBe('partner');
    expect(e?.eligibleForImpactUnit).toBe('future');
  });

  it('space_initiative_participation_future is sourced from the space role and is future-only', () => {
    const e = getKoraLinkEventMapping('space_initiative_participation_future');
    expect(e?.roleSource).toBe('space');
    expect(e?.eligibleForImpactUnit).toBe('future');
  });

  it('the 5 already-implemented-or-drafted events (generated/delivered/activated/revoked/replaced) are not IU-eligible even in the future column', () => {
    const liveEvents = ['link_generated', 'link_delivered', 'link_activated', 'link_revoked', 'link_replaced'];
    for (const id of liveEvents) {
      expect(getKoraLinkEventMapping(id as never)?.eligibleForImpactUnit).toBe('no');
    }
  });

  it('getKoraLinkEventMapping returns undefined for an unknown id gracefully (no throw)', () => {
    expect(() => getKoraLinkEventMapping('not_a_real_event' as never)).not.toThrow();
  });

});

// ── 10. getKoraLinkEcosystemContext — env reading ─────────────────────────────

describe('getKoraLinkEcosystemContext', () => {

  it('reads koraLinkEnabled from KORA_LINK_ENABLED', () => {
    const ctx = getKoraLinkEcosystemContext({ KORA_LINK_ENABLED: 'true' } as KoraLinkEnv);
    expect(ctx.koraLinkEnabled).toBe(true);
  });

  it('reads dbLookupEnabled from KORA_LINK_DB_LOOKUP_ENABLED', () => {
    const ctx = getKoraLinkEcosystemContext({ KORA_LINK_DB_LOOKUP_ENABLED: 'true' } as KoraLinkEnv);
    expect(ctx.dbLookupEnabled).toBe(true);
  });

  it('reads activationEnabled from KORA_LINK_ACTIVATION_ENABLED', () => {
    const ctx = getKoraLinkEcosystemContext({ KORA_LINK_ACTIVATION_ENABLED: 'true' } as KoraLinkEnv);
    expect(ctx.activationEnabled).toBe(true);
  });

  it('all flags default to false on an empty env', () => {
    const ctx = getKoraLinkEcosystemContext({} as KoraLinkEnv);
    expect(ctx.koraLinkEnabled).toBe(false);
    expect(ctx.dbLookupEnabled).toBe(false);
    expect(ctx.activationEnabled).toBe(false);
  });

  it('falls back to rateLimitProvider=null instead of throwing on an unrecognised provider value', () => {
    expect(() => getKoraLinkEcosystemContext({ KORA_LINK_RATE_LIMIT_PROVIDER: 'bogus' } as KoraLinkEnv)).not.toThrow();
  });

  it('never includes any secret value in the returned context', () => {
    const secret = 'a'.repeat(64);
    const ctx = getKoraLinkEcosystemContext({ KORA_LINK_TOKEN_SECRET: secret } as KoraLinkEnv);
    expect(JSON.stringify(ctx)).not.toContain(secret);
  });

  it('includes the default gate status', () => {
    const ctx = getKoraLinkEcosystemContext({} as KoraLinkEnv);
    expect(ctx.gateStatus).toEqual(KORA_LINK_GATE_STATUS);
  });

});

// ── 11. getKoraLinkRoleSummary ─────────────────────────────────────────────────

describe('getKoraLinkRoleSummary', () => {

  it('returns capabilities, boundaries, and gates for a given role', () => {
    const summary = getKoraLinkRoleSummary('admin');
    expect(summary.role).toBe('admin');
    expect(summary.capabilities.length).toBeGreaterThan(0);
    expect(summary.boundaries.length).toBeGreaterThan(0);
    expect(summary.gates.length).toBe(9);
  });

  it('company role summary never includes worker-level capabilities', () => {
    const summary = getKoraLinkRoleSummary('company');
    const ids = summary.capabilities.map((c) => c.id);
    expect(ids).not.toContain('worker_activation');
    expect(ids).not.toContain('consent_capture');
  });

  it('every role produces a non-throwing summary', () => {
    for (const role of KORA_LINK_ROLES) {
      expect(() => getKoraLinkRoleSummary(role)).not.toThrow();
    }
  });

  it('respects a custom context override for capability state', () => {
    const allClosed = Object.fromEntries(KORA_LINK_GATES.map((g) => [g.id, 'closed'])) as Record<KoraLinkGateId, 'closed'>;
    const summary = getKoraLinkRoleSummary('worker', { activationEnabled: true, gateStatus: allClosed });
    const activation = summary.capabilities.find((c) => c.id === 'worker_activation');
    expect(activation?.state).toBe('available');
  });

});

// ── 12. Structural safety — no raw token / no digest in the whole model ──────

describe('ecosystem model — structural safety', () => {

  it('the full capability registry never contains a raw token pattern', () => {
    const serialized = JSON.stringify(KORA_LINK_CAPABILITIES);
    expect(serialized).not.toMatch(/kl1_[A-Za-z0-9]{48}/);
  });

  it('the full event mapping registry never contains a raw token pattern', () => {
    const serialized = JSON.stringify(KORA_LINK_EVENT_MAPPING);
    expect(serialized).not.toMatch(/kl1_[A-Za-z0-9]{48}/);
  });

  it('no capability definition has a "digest" or "token" field', () => {
    for (const cap of KORA_LINK_CAPABILITIES) {
      expect(cap).not.toHaveProperty('digest');
      expect(cap).not.toHaveProperty('token');
      expect(cap).not.toHaveProperty('workerId');
    }
  });

  it('no lifecycle stage or event mapping has a "workerId" field', () => {
    for (const stage of KORA_LINK_LIFECYCLE) {
      expect(stage).not.toHaveProperty('workerId');
    }
    for (const event of KORA_LINK_EVENT_MAPPING) {
      expect(event).not.toHaveProperty('workerId');
    }
  });

});

// ── 13. State label copy ──────────────────────────────────────────────────────

describe('KORA_LINK_CAPABILITY_STATE_LABEL', () => {

  it('has a label for every possible capability state', () => {
    const states: Array<keyof typeof KORA_LINK_CAPABILITY_STATE_LABEL> = [
      'available', 'configured', 'locked', 'requires_gate', 'planned', 'disabled',
    ];
    for (const s of states) {
      expect(KORA_LINK_CAPABILITY_STATE_LABEL[s].length).toBeGreaterThan(0);
    }
  });

});

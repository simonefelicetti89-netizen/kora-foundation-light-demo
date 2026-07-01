// lib/kora-link/ecosystem.ts
// KORA Link — Ecosystem Control Layer (KL-23).
// Single source of truth for the KORA Link capability model, gate model, privacy
// boundaries, lifecycle stages, and future event taxonomy consumed by every
// role-facing KORA Link surface (admin, worker, company, partner, space, algorithm).
//
// Server-safe. Pure data + pure functions. No Supabase. No DB. No service role.
// No Impact Unit creation. No KORA Index mutation. No scoring.
//
// INVARIANTS
//   • Every capability state is derived, never hand-set per page — one function,
//     getKoraLinkCapabilityState(), is the only place that decides available vs
//     locked vs requires_gate vs planned vs configured vs disabled.
//   • impactUnitEligible / affectsKoraIndex / affectsConfidence are NEVER 'yes' —
//     only 'no' or 'future'. This file cannot claim a live KORA Index effect.
//   • Privacy boundary statements never contain a worker_id, token, or digest value.

import {
  isKoraLinkEnabled,
  isKoraLinkDbLookupEnabled,
  isKoraLinkActivationEnabled,
  getKoraLinkRateLimitProvider,
  type KoraLinkEnv,
} from './config';

// ── Roles ──────────────────────────────────────────────────────────────────────

export type KoraLinkEcosystemRole = 'admin' | 'worker' | 'company' | 'partner' | 'space' | 'algorithm';

export const KORA_LINK_ROLES: readonly KoraLinkEcosystemRole[] = [
  'admin', 'worker', 'company', 'partner', 'space', 'algorithm',
];

export const KORA_LINK_ROLE_LABEL: Record<KoraLinkEcosystemRole, string> = {
  admin:     'KORA Admin',
  worker:    'Worker',
  company:   'Company',
  partner:   'Partner',
  space:     'KORA Space',
  algorithm: 'Algorithm layer',
};

// ── Gates ──────────────────────────────────────────────────────────────────────

export type KoraLinkGateId =
  | 'gate_1_runtime_base'
  | 'gate_2_schema_034'
  | 'gate_3_dpo_legal'
  | 'gate_4_rls_035'
  | 'gate_5_staging_env'
  | 'gate_6_public_route_enablement'
  | 'gate_7_worker_activation'
  | 'gate_8_partner_scan'
  | 'gate_9_production_readiness';

export type KoraLinkGateStatusValue = 'open' | 'closed';

export type KoraLinkGateDefinition = {
  id: KoraLinkGateId;
  order: number;
  label: string;
  description: string;
};

export const KORA_LINK_GATES: readonly KoraLinkGateDefinition[] = [
  { id: 'gate_1_runtime_base',             order: 1, label: 'Gate 1 — Runtime base',
    description: 'Token core, config, rate limiting, route pubblica skeleton.' },
  { id: 'gate_2_schema_034',                order: 2, label: 'Gate 2 — Schema 034',
    description: 'CTO review dello schema proposto kora_link.* (034).' },
  { id: 'gate_3_dpo_legal',                 order: 3, label: 'Gate 3 — DPO/legal',
    description: 'Approvazione DPO/legal su consenso, retention, privacy notice.' },
  { id: 'gate_4_rls_035',                   order: 4, label: 'Gate 4 — RLS 035',
    description: 'Row Level Security review e applicazione (035).' },
  { id: 'gate_5_staging_env',               order: 5, label: 'Gate 5 — Staging env',
    description: 'Ambiente di staging con 034/035/036 applicati e testati.' },
  { id: 'gate_6_public_route_enablement',   order: 6, label: 'Gate 6 — Public route enablement',
    description: 'KORA_LINK_ENABLED + DB lookup abilitati in staging/produzione.' },
  { id: 'gate_7_worker_activation',         order: 7, label: 'Gate 7 — Worker activation',
    description: 'KORA_LINK_ACTIVATION_ENABLED + fn_activate_link_for_worker in produzione.' },
  { id: 'gate_8_partner_scan',              order: 8, label: 'Gate 8 — Partner scan',
    description: 'Infrastruttura Track A partner scan e accreditamento.' },
  { id: 'gate_9_production_readiness',      order: 9, label: 'Gate 9 — Production readiness',
    description: 'Go-live completo: tutti i gate precedenti chiusi.' },
];

// Current gate status — mirrors CLAUDE.md §9 / docs/KORA_LINK_CHANGELOG.md.
// Update only when a gate formally closes (CTO/DPO sign-off), never speculatively.
export const KORA_LINK_GATE_STATUS: Readonly<Record<KoraLinkGateId, KoraLinkGateStatusValue>> = {
  gate_1_runtime_base:           'closed',
  gate_2_schema_034:             'open',
  gate_3_dpo_legal:              'open',
  gate_4_rls_035:                'open',
  gate_5_staging_env:            'open',
  gate_6_public_route_enablement: 'open',
  gate_7_worker_activation:      'open',
  gate_8_partner_scan:           'open',
  gate_9_production_readiness:   'open',
};

export function getKoraLinkGates(
  gateStatus: Readonly<Record<KoraLinkGateId, KoraLinkGateStatusValue>> = KORA_LINK_GATE_STATUS
): Array<KoraLinkGateDefinition & { status: KoraLinkGateStatusValue }> {
  return KORA_LINK_GATES.map((g) => ({ ...g, status: gateStatus[g.id] }));
}

// ── Capability states ────────────────────────────────────────────────────────

export type KoraLinkCapabilityState =
  | 'available'
  | 'configured'
  | 'locked'
  | 'requires_gate'
  | 'planned'
  | 'disabled';

export const KORA_LINK_CAPABILITY_STATE_LABEL: Record<KoraLinkCapabilityState, string> = {
  available:     'Disponibile — operativamente pronto',
  configured:    'Configurato — attivo in ambiente demo/staging',
  locked:        'Locked — richiede attivazione flag',
  requires_gate: 'Richiede Gate — bloccato da review esterna',
  planned:       'Future track — roadmap pianificata',
  disabled:      'Disattivato volutamente',
};

// ── Capabilities ──────────────────────────────────────────────────────────────

export type KoraLinkCapabilityId =
  | 'token_generation'
  | 'nfc_url_generation'
  | 'public_route'
  | 'db_lookup'
  | 'worker_activation'
  | 'consent_capture'
  | 'revocation'
  | 'replacement'
  | 'company_aggregate_visibility'
  | 'partner_verified_scan'
  | 'space_initiative_linking'
  | 'impact_unit_mapping'
  | 'confidence_score_support';

export const KORA_LINK_CAPABILITY_IDS: readonly KoraLinkCapabilityId[] = [
  'token_generation', 'nfc_url_generation', 'public_route', 'db_lookup',
  'worker_activation', 'consent_capture', 'revocation', 'replacement',
  'company_aggregate_visibility', 'partner_verified_scan', 'space_initiative_linking',
  'impact_unit_mapping', 'confidence_score_support',
];

// 'always_on'            — ships today, unconditional (no flag, no DB, no gate)
// 'flag_gated'           — runtime TS code exists behind an env flag (KL-19/KL-22)
// 'drafted_pending_gate' — SQL drafted in 036, zero runtime TS code — blocked on Gate 2/3/4
// 'roadmap'              — no draft yet, concept-only, future track
export type KoraLinkCapabilityImplementation =
  | 'always_on'
  | 'flag_gated'
  | 'drafted_pending_gate'
  | 'roadmap';

export type KoraLinkImpactUnitEligibility = 'no' | 'future';
export type KoraLinkKoraIndexEffect = 'no' | 'future';
export type KoraLinkConfidenceEffect = 'no' | 'future';

export type KoraLinkCapabilityDefinition = {
  id: KoraLinkCapabilityId;
  label: string;
  description: string;
  roles: readonly KoraLinkEcosystemRole[];
  implementation: KoraLinkCapabilityImplementation;
  requiredGates: readonly KoraLinkGateId[];
  impactUnitEligible: KoraLinkImpactUnitEligibility;
  affectsKoraIndex: KoraLinkKoraIndexEffect;
  affectsConfidence: KoraLinkConfidenceEffect;
};

export const KORA_LINK_CAPABILITIES: readonly KoraLinkCapabilityDefinition[] = [
  {
    id: 'token_generation',
    label: 'Generazione token',
    description: 'Genera un token KORA Link crittograficamente casuale (kl1_ + 48 char base62). Nessuna persistenza.',
    roles: ['admin'],
    implementation: 'always_on',
    requiredGates: ['gate_1_runtime_base'],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'nfc_url_generation',
    label: 'Generazione URL NFC (Lab)',
    description: 'Costruisce l\'URL demo /link/<token> da scrivere su un chip NFC fisico — KORA Link Lab, solo interno admin.',
    roles: ['admin'],
    implementation: 'always_on',
    requiredGates: ['gate_1_runtime_base'],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'public_route',
    label: 'Route pubblica /link/[token]',
    description: 'Entry point NFC pubblico: valida il formato token, applica rate limiting, mostra uno stato safe.',
    roles: ['admin', 'worker'],
    implementation: 'flag_gated',
    requiredGates: ['gate_1_runtime_base', 'gate_6_public_route_enablement'],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'db_lookup',
    label: 'DB lookup runtime',
    description: 'Verifica lo stato del chip via RPC fn_public_lookup_link, dietro KORA_LINK_DB_LOOKUP_ENABLED. Fallback safe se il DB non è raggiungibile.',
    roles: ['admin', 'worker'],
    implementation: 'flag_gated',
    requiredGates: ['gate_1_runtime_base', 'gate_2_schema_034', 'gate_3_dpo_legal', 'gate_4_rls_035', 'gate_5_staging_env'],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'worker_activation',
    label: 'Attivazione worker',
    description: 'Il worker autenticato attiva il proprio KORA Link via RPC fn_activate_link_for_worker, dietro KORA_LINK_ACTIVATION_ENABLED.',
    roles: ['worker', 'admin'],
    implementation: 'flag_gated',
    requiredGates: [
      'gate_1_runtime_base', 'gate_2_schema_034', 'gate_3_dpo_legal',
      'gate_4_rls_035', 'gate_5_staging_env', 'gate_7_worker_activation',
    ],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'consent_capture',
    label: 'Cattura consenso',
    description: 'Checkbox di consenso obbligatoria nel flusso di attivazione — versione provvisoria in attesa di approvazione DPO/legal.',
    roles: ['worker', 'admin'],
    implementation: 'flag_gated',
    requiredGates: [
      'gate_1_runtime_base', 'gate_2_schema_034', 'gate_3_dpo_legal',
      'gate_4_rls_035', 'gate_5_staging_env', 'gate_7_worker_activation',
    ],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'revocation',
    label: 'Revoca',
    description: 'Disattivazione di un chip compromesso o non più valido. RPC fn_revoke_link già in draft (036) — nessun codice runtime finché Gate 2/3/4 non chiudono.',
    roles: ['admin'],
    implementation: 'drafted_pending_gate',
    requiredGates: ['gate_2_schema_034', 'gate_3_dpo_legal', 'gate_4_rls_035'],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'replacement',
    label: 'Sostituzione',
    description: 'Sostituzione di un chip perso o danneggiato preservando la catena di continuità. RPC fn_replace_link già in draft (036).',
    roles: ['admin'],
    implementation: 'drafted_pending_gate',
    requiredGates: ['gate_2_schema_034', 'gate_3_dpo_legal', 'gate_4_rls_035'],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'company_aggregate_visibility',
    label: 'Visibilità aggregata company',
    description: 'Vista aggregata (solo conteggi per stato) per l\'azienda — mai dati individuali. RPC fn_company_link_status_aggregate già in draft (036).',
    roles: ['company', 'admin'],
    implementation: 'drafted_pending_gate',
    requiredGates: ['gate_2_schema_034', 'gate_4_rls_035', 'gate_5_staging_env'],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
  },
  {
    id: 'partner_verified_scan',
    label: 'Scan verificato partner (Track A)',
    description: 'Infrastruttura futura per eventi partner verificati via scan — nessun draft SQL ancora, concept-only.',
    roles: ['partner', 'admin'],
    implementation: 'roadmap',
    requiredGates: ['gate_3_dpo_legal', 'gate_8_partner_scan'],
    impactUnitEligible: 'future', affectsKoraIndex: 'future', affectsConfidence: 'future',
  },
  {
    id: 'space_initiative_linking',
    label: 'Collegamento a iniziative KORA Space',
    description: 'Collegamento futuro tra chip KORA Link e iniziative KORA Space/Commons — nessuna partecipazione o scan reale oggi.',
    roles: ['space', 'worker', 'admin'],
    implementation: 'roadmap',
    requiredGates: ['gate_3_dpo_legal', 'gate_9_production_readiness'],
    impactUnitEligible: 'future', affectsKoraIndex: 'future', affectsConfidence: 'future',
  },
  {
    id: 'impact_unit_mapping',
    label: 'Mapping a Impact Unit (futuro)',
    description: 'Possibile eleggibilità futura di eventi KORA Link come sorgente IU — richiede decisione metodologica formale, oggi non implementato.',
    roles: ['algorithm', 'admin'],
    implementation: 'roadmap',
    requiredGates: ['gate_9_production_readiness'],
    impactUnitEligible: 'future', affectsKoraIndex: 'future', affectsConfidence: 'no',
  },
  {
    id: 'confidence_score_support',
    label: 'Supporto Confidence Score (futuro)',
    description: 'Possibile contributo futuro di eventi KORA Link verificati al Confidence Score — non implementato oggi.',
    roles: ['algorithm', 'admin'],
    implementation: 'roadmap',
    requiredGates: ['gate_9_production_readiness'],
    impactUnitEligible: 'no', affectsKoraIndex: 'no', affectsConfidence: 'future',
  },
];

const KORA_LINK_CAPABILITIES_BY_ID: Record<KoraLinkCapabilityId, KoraLinkCapabilityDefinition> =
  Object.fromEntries(KORA_LINK_CAPABILITIES.map((c) => [c.id, c])) as Record<KoraLinkCapabilityId, KoraLinkCapabilityDefinition>;

export function getKoraLinkCapability(id: KoraLinkCapabilityId): KoraLinkCapabilityDefinition {
  return KORA_LINK_CAPABILITIES_BY_ID[id];
}

// Maps a flag_gated capability to the context field that governs it.
const CAPABILITY_FLAG_MAP: Partial<Record<KoraLinkCapabilityId, 'koraLinkEnabled' | 'dbLookupEnabled' | 'activationEnabled'>> = {
  public_route:      'koraLinkEnabled',
  db_lookup:         'dbLookupEnabled',
  worker_activation: 'activationEnabled',
  consent_capture:   'activationEnabled',
};

// ── Ecosystem context (runtime snapshot — flags + gate status) ───────────────

export type KoraLinkEcosystemContext = {
  koraLinkEnabled?: boolean;
  dbLookupEnabled?: boolean;
  activationEnabled?: boolean;
  rateLimitProvider?: 'disabled' | 'upstash' | null;
  gateStatus?: Readonly<Record<KoraLinkGateId, KoraLinkGateStatusValue>>;
};

/**
 * Reads the live KORA Link env flags (never a secret, never a raw DB read) and
 * returns a context object for getKoraLinkCapabilityState() / role summaries.
 * Pure env reads only — no Supabase, no DB, no service role.
 */
export function getKoraLinkEcosystemContext(env: KoraLinkEnv = process.env): KoraLinkEcosystemContext {
  let rateLimitProvider: 'disabled' | 'upstash' | null = null;
  try {
    rateLimitProvider = getKoraLinkRateLimitProvider(env);
  } catch {
    rateLimitProvider = null;
  }
  return {
    koraLinkEnabled:    isKoraLinkEnabled(env),
    dbLookupEnabled:    isKoraLinkDbLookupEnabled(env),
    activationEnabled:  isKoraLinkActivationEnabled(env),
    rateLimitProvider,
    gateStatus: KORA_LINK_GATE_STATUS,
  };
}

/**
 * Derives the safe UI state for a single capability. The only function in this
 * module allowed to decide available/configured/locked/requires_gate/planned/disabled.
 */
export function getKoraLinkCapabilityState(
  capabilityId: KoraLinkCapabilityId,
  context: KoraLinkEcosystemContext = {}
): KoraLinkCapabilityState {
  const def = getKoraLinkCapability(capabilityId);
  const gateStatus = context.gateStatus ?? KORA_LINK_GATE_STATUS;

  switch (def.implementation) {
    case 'always_on':
      return 'available';

    case 'roadmap':
      return 'planned';

    case 'drafted_pending_gate':
      return 'requires_gate';

    case 'flag_gated': {
      const flagKey = CAPABILITY_FLAG_MAP[capabilityId];
      const flagOn = flagKey ? Boolean(context[flagKey]) : false;

      if (!flagOn) {
        return 'locked';
      }
      if (capabilityId === 'public_route' && context.rateLimitProvider === 'disabled') {
        return 'disabled';
      }
      const allGatesClosed = def.requiredGates.every((g) => gateStatus[g] === 'closed');
      return allGatesClosed ? 'available' : 'configured';
    }
  }
}

export function getKoraLinkCapabilitiesForRole(
  role: KoraLinkEcosystemRole,
  context: KoraLinkEcosystemContext = {}
): Array<KoraLinkCapabilityDefinition & { state: KoraLinkCapabilityState }> {
  return KORA_LINK_CAPABILITIES
    .filter((c) => c.roles.includes(role))
    .map((c) => ({ ...c, state: getKoraLinkCapabilityState(c.id, context) }));
}

// ── Privacy boundaries ────────────────────────────────────────────────────────

export type KoraLinkPrivacyBoundary = {
  id: string;
  statement: string;
  appliesTo: readonly KoraLinkEcosystemRole[];
};

export const KORA_LINK_PRIVACY_BOUNDARIES: readonly KoraLinkPrivacyBoundary[] = [
  {
    id: 'company_never_sees_worker_level',
    statement: 'L\'azienda non vede mai l\'attività individuale del singolo worker su KORA Link — solo conteggi aggregati per stato.',
    appliesTo: ['company'],
  },
  {
    id: 'partner_no_unnecessary_identity',
    statement: 'Il partner non riceve mai dati identificativi non necessari alla verifica dell\'evento (Track A, futuro).',
    appliesTo: ['partner'],
  },
  {
    id: 'worker_controls_activation',
    statement: 'Il worker controlla sempre attivazione e consenso del proprio KORA Link — nessuna attivazione automatica o senza conferma.',
    appliesTo: ['worker'],
  },
  {
    id: 'admin_manages_infrastructure_not_scoring',
    statement: 'Il KORA Admin gestisce l\'infrastruttura di KORA Link (batch, revoca, sostituzione) — non lo scoring individuale del worker.',
    appliesTo: ['admin'],
  },
  {
    id: 'algorithm_only_eligible_events',
    statement: 'L\'algoritmo consuma solo eventi eleggibili e approvati da policy — mai eventi grezzi non verificati, mai in questa fase.',
    appliesTo: ['algorithm'],
  },
  {
    id: 'no_raw_token_persistence',
    statement: 'Nessun token grezzo viene mai persistito — solo il digest HMAC-SHA256 attraversa il livello dati.',
    appliesTo: ['admin', 'worker', 'company', 'partner', 'space', 'algorithm'],
  },
];

export function getKoraLinkPrivacyBoundariesForRole(
  role: KoraLinkEcosystemRole
): readonly KoraLinkPrivacyBoundary[] {
  return KORA_LINK_PRIVACY_BOUNDARIES.filter((b) => b.appliesTo.includes(role));
}

// ── Lifecycle overview (admin Control Tower) ──────────────────────────────────

export type KoraLinkLifecycleStageId =
  | 'batch_generation'
  | 'nfc_preparation'
  | 'delivery'
  | 'activation'
  | 'revocation'
  | 'replacement'
  | 'audit';

export type KoraLinkLifecycleStage = {
  id: KoraLinkLifecycleStageId;
  order: number;
  label: string;
  description: string;
  relatedCapability: KoraLinkCapabilityId;
};

export const KORA_LINK_LIFECYCLE: readonly KoraLinkLifecycleStage[] = [
  { id: 'batch_generation', order: 1, label: 'Generazione batch',
    description: 'Creazione di un lotto di token KORA Link (KORA Admin).',
    relatedCapability: 'token_generation' },
  { id: 'nfc_preparation', order: 2, label: 'Preparazione NFC',
    description: 'Generazione URL demo e scrittura su chip fisico — KORA Link Lab.',
    relatedCapability: 'nfc_url_generation' },
  { id: 'delivery', order: 3, label: 'Consegna',
    description: 'Assegnazione del chip a un\'azienda — infrastruttura proposta (036), non ancora operativa.',
    relatedCapability: 'company_aggregate_visibility' },
  { id: 'activation', order: 4, label: 'Attivazione',
    description: 'Il worker scansiona il chip, si autentica e conferma il consenso.',
    relatedCapability: 'worker_activation' },
  { id: 'revocation', order: 5, label: 'Revoca',
    description: 'Un KORA Admin disattiva un chip compromesso o non più valido.',
    relatedCapability: 'revocation' },
  { id: 'replacement', order: 6, label: 'Sostituzione',
    description: 'Un chip perso o danneggiato viene sostituito preservando la catena di continuità.',
    relatedCapability: 'replacement' },
  { id: 'audit', order: 7, label: 'Audit',
    description: 'Ogni evento del ciclo di vita è tracciato in modo append-only, mai modificabile.',
    relatedCapability: 'revocation' },
];

export function getKoraLinkLifecycleWithState(
  context: KoraLinkEcosystemContext = {}
): Array<KoraLinkLifecycleStage & { state: KoraLinkCapabilityState }> {
  return KORA_LINK_LIFECYCLE.map((stage) => ({
    ...stage,
    state: getKoraLinkCapabilityState(stage.relatedCapability, context),
  }));
}

// ── Algorithm mapping — future event taxonomy ─────────────────────────────────
// Documents how future KORA Link events WOULD map to the KORA Engine, without
// implementing any of it. No event listed here is emitted, consumed, or scored
// anywhere in the current codebase.

export type KoraLinkEventId =
  | 'link_generated'
  | 'link_delivered'
  | 'link_activated'
  | 'link_revoked'
  | 'link_replaced'
  | 'verified_partner_event_future'
  | 'space_initiative_participation_future';

export type KoraLinkEventPrivacyLevel = 'infrastructural' | 'pseudonymous' | 'aggregate_only';

export type KoraLinkEventMapping = {
  id: KoraLinkEventId;
  label: string;
  roleSource: KoraLinkEcosystemRole;
  privacyLevel: KoraLinkEventPrivacyLevel;
  eligibleForImpactUnit: KoraLinkImpactUnitEligibility;
  affectsKoraIndex: KoraLinkKoraIndexEffect;
  affectsConfidence: KoraLinkConfidenceEffect;
  requiresPolicyGate: KoraLinkGateId;
};

export const KORA_LINK_EVENT_MAPPING: readonly KoraLinkEventMapping[] = [
  {
    id: 'link_generated', label: 'Link generato', roleSource: 'admin',
    privacyLevel: 'infrastructural',
    eligibleForImpactUnit: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
    requiresPolicyGate: 'gate_1_runtime_base',
  },
  {
    id: 'link_delivered', label: 'Link consegnato', roleSource: 'admin',
    privacyLevel: 'infrastructural',
    eligibleForImpactUnit: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
    requiresPolicyGate: 'gate_2_schema_034',
  },
  {
    id: 'link_activated', label: 'Link attivato dal worker', roleSource: 'worker',
    privacyLevel: 'pseudonymous',
    eligibleForImpactUnit: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
    requiresPolicyGate: 'gate_7_worker_activation',
  },
  {
    id: 'link_revoked', label: 'Link revocato', roleSource: 'admin',
    privacyLevel: 'infrastructural',
    eligibleForImpactUnit: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
    requiresPolicyGate: 'gate_2_schema_034',
  },
  {
    id: 'link_replaced', label: 'Link sostituito', roleSource: 'admin',
    privacyLevel: 'infrastructural',
    eligibleForImpactUnit: 'no', affectsKoraIndex: 'no', affectsConfidence: 'no',
    requiresPolicyGate: 'gate_2_schema_034',
  },
  {
    id: 'verified_partner_event_future', label: 'Evento partner verificato (futuro)', roleSource: 'partner',
    privacyLevel: 'aggregate_only',
    eligibleForImpactUnit: 'future', affectsKoraIndex: 'future', affectsConfidence: 'future',
    requiresPolicyGate: 'gate_8_partner_scan',
  },
  {
    id: 'space_initiative_participation_future', label: 'Partecipazione iniziativa KORA Space (futuro)', roleSource: 'space',
    privacyLevel: 'aggregate_only',
    eligibleForImpactUnit: 'future', affectsKoraIndex: 'future', affectsConfidence: 'future',
    requiresPolicyGate: 'gate_9_production_readiness',
  },
];

export function getKoraLinkEventMapping(id: KoraLinkEventId): KoraLinkEventMapping | undefined {
  return KORA_LINK_EVENT_MAPPING.find((e) => e.id === id);
}

// ── Role summary (drives KoraLinkRoleDashboard) ───────────────────────────────

export type KoraLinkRoleSummary = {
  role: KoraLinkEcosystemRole;
  capabilities: Array<KoraLinkCapabilityDefinition & { state: KoraLinkCapabilityState }>;
  boundaries: readonly KoraLinkPrivacyBoundary[];
  gates: Array<KoraLinkGateDefinition & { status: KoraLinkGateStatusValue }>;
};

export function getKoraLinkRoleSummary(
  role: KoraLinkEcosystemRole,
  context: KoraLinkEcosystemContext = {}
): KoraLinkRoleSummary {
  const gateStatus = context.gateStatus ?? KORA_LINK_GATE_STATUS;
  return {
    role,
    capabilities: getKoraLinkCapabilitiesForRole(role, context),
    boundaries: getKoraLinkPrivacyBoundariesForRole(role),
    gates: getKoraLinkGates(gateStatus),
  };
}

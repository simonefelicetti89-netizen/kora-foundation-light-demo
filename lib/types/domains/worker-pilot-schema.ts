// lib/types/domains/worker-pilot-schema.ts
// B160 — Worker Grado 1: DB row types for the pilot worker schema (migrations 016–019).
//
// These types represent raw database rows — NOT the aggregated view types used by pages.
// Aggregated consumption types (WorkerPIB, WorkerCVData) live in worker-pib.ts.
//
// Naming convention:
//   *Row suffix  → one-to-one with a DB row
//   *SourceKind  → discriminated union matching the DB CHECK constraint

// ── Discriminated unions matching CHECK constraints ───────────────────────────

export type WorkerInitiativeSourceKind =
  | 'company_sourced'   // bridged from a company UEF record — active logic
  | 'partner_sourced'   // future path — schema present, logic disabled
  | 'worker_declared';  // future path — schema present, logic disabled

export type WorkerPIBVerificationStatus =
  | 'verified'       // Nodo A: is_exportable = true
  | 'self_declared'; // Nodo A: is_exportable = false

export type WorkerPseudonymLinkedBy =
  | 'company_provisioning'
  | 'kora_admin'
  | 'worker_self';

// ── DB row: personal.worker_pseudonym_map ─────────────────────────────────────
//
// KORA_ADMIN only — never returned to worker-facing or company-facing APIs.
// PRIVACY: resolves pseudonym↔identity. Company roles have zero visibility.
//
// Lookup chain:
//   JWT auth.uid()
//     → personal.worker_identity.auth_user_id
//     → personal.worker_pseudonym_map.worker_identity_id
//     → pseudonym_id (pipeline IU query input)

export interface WorkerPseudonymMapRow {
  id:                 string;   // uuid
  worker_identity_id: string;   // uuid FK → personal.worker_identity
  pseudonym_id:       string;   // pipeline-side identifier (UNIQUE)
  linked_at:          string;   // ISO timestamptz
  linked_by:          WorkerPseudonymLinkedBy;
}

// ── DB row: personal.worker_initiative (B160 extension) ──────────────────────
//
// Extends the base worker_initiative with source_kind + source_uef_record_id.
// source_uef_record_id is an internal audit field — never returned in worker-facing
// API responses. Workers see title/pillar/status, not the origin chain.

export interface WorkerInitiativeRow {
  id:                    string;   // uuid
  tenant_id:             string;   // uuid FK → analytics.tenant
  title:                 string;
  description:           string | null;
  pillar:                'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';
  eligibility_class:     'eligible' | 'limited';
  status:                'draft' | 'published' | 'closed';
  start_date:            string | null;
  end_date:              string | null;
  mode:                  string | null;
  location:              string | null;
  provider:              string | null;
  created_by:            string | null;   // uuid
  // B160 additions
  source_kind:           WorkerInitiativeSourceKind;
  source_uef_record_id:  string | null;   // uuid — internal audit, never worker-facing
  created_at:            string;
  updated_at:            string;
}

// ── DB row: personal.worker_pib ───────────────────────────────────────────────
//
// Per-worker PIB row. WORKER-OWNED. NEVER exposed to company roles.
// One row per (worker × source event × pillar).
//
// TWO INDEPENDENT TEMPORAL DIMENSIONS — never fused:
//
//   TEMPO 1 — IU base (iu_value):
//     Inherited from the program-level IU, modulated by individual evidence.
//     Stable: never updated retroactively. The canonical KORA IU for this event.
//
//   TEMPO 2 — Generative dimensions (generative_*):
//     Populated later when cross-period worker history is observable.
//     NULL at Tempo 1. Parallel independent dimension.
//     NEVER summed into iu_value. NEVER modify iu_value retroactively.
//
// source_uef_record_id / source_participation_id: internal audit tracing only.
// Never return these fields in worker-facing API responses.

export interface WorkerPIBRow {
  id:                      string;   // uuid

  // Worker identity
  worker_identity_id:      string;   // uuid FK → personal.worker_identity

  // Period and pillar
  reporting_period:        string;
  pillar:                  'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';

  // TEMPO 1 — IU base (stable)
  iu_value:                number;   // numeric(10,4)
  verification_status:     WorkerPIBVerificationStatus;
  is_exportable:           boolean;  // Nodo A: false=self_declared, true=verified

  // Source tracing — internal audit, never worker-facing
  source_kind:             WorkerInitiativeSourceKind;
  source_uef_record_id:    string | null;   // uuid
  source_participation_id: string | null;   // uuid

  // TEMPO 2 — Generative dimensions (parallel, null until history exists)
  // Not summed into iu_value. Not read by Foundation Light scoring logic.
  generative_index:        number | null;   // overall generative score
  generative_circle1:      number | null;   // Continuità — sustained engagement
  generative_circle2:      number | null;   // Espansione — breadth across pillars
  generative_circle3:      number | null;   // Propagazione — influence on others

  // Governance
  computed_at:             string;   // ISO timestamptz
}

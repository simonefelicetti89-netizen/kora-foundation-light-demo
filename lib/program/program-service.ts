// lib/program/program-service.ts
// KORA-WP-026 — Program Skeleton — Two-Level Schema Safety.
//
// Doc 69 §5/§6 (DD-3 Final Architecture Readout) — the sole semantic
// authority: Program is "the governed bridge from a Commitment to delivery,
// in two internal layers: a Definition... and a Participation (one party's
// specific quota — budget, eligibility, population)." The minimum
// first-pilot Program is the degenerate case: one Definition, one
// Participation, owned by a single Company — "the same schema shape
// simply isn't exercised beyond one Participation yet," read literally:
// this module never enforces exactly-one, it simply isn't asked to create
// more than one during this WP's own scope.
//
// NO COMMITMENT LINKAGE HERE — doc 95 §7 (Core Linkage vs. Program Linkage
// Correction), verbatim: "Program linkage, where it matters, is added by
// the Program-extension package (KORA-WP-060) as its own concern." This
// module never accepts or stores a commitment_id.
//
// SCOPE BOUNDARY: no lifecycle/status, no audit/governance_event emission
// (registry's own "Audit: N/A at this slice"), no Worker/PIB reference, no
// taxonomy enum, no Prime/Space/Partner semantics. See migration 078's own
// header for the full design rationale.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

const COMPANY_WRITE_ROLE = 'COMPANY_ADMIN';

function assertActor(actorRole: string, actorId: string): void {
  if (!actorRole || !actorId) {
    throw new Error('[KORA] program rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
}

// Program write authority is Company/Governing-Actor-scoped only (registry's
// own field) — no canonical source names ADVISOR or any other role for
// Program writes at this skeleton stage; never invented here.
function assertCompanyWriter(actorRole: string): void {
  if (actorRole !== COMPANY_WRITE_ROLE) {
    throw new Error(
      `[KORA] program rejected: only ${COMPANY_WRITE_ROLE} may create a Program Definition/Participation at this skeleton stage (doc 69 §6 — Company-owned only; Partner/Territory-actor/Consortium ownership and any Advisor role remain KORA-WP-060's own future concern, not invented here).`,
    );
  }
}

// ── Program Definition ──────────────────────────────────────────────────────

export interface ProgramDefinition {
  id: string;
  ownerTenantId: string;
  ownerType: 'company';
  name: string;
  description: string | null;
  actorRole: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProgramDefinitionDbRow {
  id: string;
  owner_tenant_id: string;
  owner_type: string;
  name: string;
  description: string | null;
  actor_role: string;
  actor_id: string;
  created_at: string;
  updated_at: string;
}

function toProgramDefinition(row: ProgramDefinitionDbRow): ProgramDefinition {
  return {
    id: row.id,
    ownerTenantId: row.owner_tenant_id,
    ownerType: row.owner_type as 'company',
    name: row.name,
    description: row.description,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateProgramDefinitionParams {
  tenantId: string;
  name: string;
  description?: string;
  actorRole: string;
  actorId: string;
}

export async function createProgramDefinition(params: CreateProgramDefinitionParams): Promise<ProgramDefinition> {
  assertActor(params.actorRole, params.actorId);
  assertCompanyWriter(params.actorRole);

  if (!params.name || params.name.trim() === '') {
    throw new Error('[KORA] program rejected: name is required.');
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('program_definition')
    .insert({
      owner_tenant_id: params.tenantId,
      name: params.name,
      description: params.description ?? null,
      actor_role: params.actorRole,
      actor_id: params.actorId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createProgramDefinition failed: ${error?.message ?? 'no data returned'}`);
  }

  return toProgramDefinition(data as ProgramDefinitionDbRow);
}

export async function getProgramDefinition(id: string, tenantId: string): Promise<ProgramDefinition | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('program_definition')
    .select()
    .eq('id', id)
    .eq('owner_tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getProgramDefinition failed: ${error.message}`);
  }
  if (!data) return null;

  return toProgramDefinition(data as ProgramDefinitionDbRow);
}

export async function listProgramDefinitions(tenantId: string): Promise<ProgramDefinition[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('program_definition')
    .select()
    .eq('owner_tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[KORA] listProgramDefinitions failed: ${error.message}`);
  }

  return ((data ?? []) as ProgramDefinitionDbRow[]).map(toProgramDefinition);
}

// ── Program Participation ───────────────────────────────────────────────────

export interface ProgramParticipation {
  id: string;
  programDefinitionId: string;
  participantTenantId: string;
  budgetAmount: number | null;
  eligibilityDescription: string | null;
  populationEstimate: number | null;
  actorRole: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProgramParticipationDbRow {
  id: string;
  program_definition_id: string;
  participant_tenant_id: string;
  budget_amount: string | number | null;
  eligibility_description: string | null;
  population_estimate: number | null;
  actor_role: string;
  actor_id: string;
  created_at: string;
  updated_at: string;
}

function toProgramParticipation(row: ProgramParticipationDbRow): ProgramParticipation {
  return {
    id: row.id,
    programDefinitionId: row.program_definition_id,
    participantTenantId: row.participant_tenant_id,
    budgetAmount: row.budget_amount === null ? null : Number(row.budget_amount),
    eligibilityDescription: row.eligibility_description,
    populationEstimate: row.population_estimate,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateProgramParticipationParams {
  programDefinitionId: string;
  tenantId: string; // the participating Company — must equal the Definition's own owner (skeleton stage: same-Company only)
  budgetAmount?: number;
  eligibilityDescription?: string;
  populationEstimate?: number;
  actorRole: string;
  actorId: string;
}

// Pre-emptive, friendlier same-Company check (defense-in-depth alongside
// migration 078's own DB-level trigger, which is the real, non-bypassable
// guarantee — matching this engagement's established two-layer discipline).
export async function createProgramParticipation(params: CreateProgramParticipationParams): Promise<ProgramParticipation> {
  assertActor(params.actorRole, params.actorId);
  assertCompanyWriter(params.actorRole);

  const db = getSupabaseServiceClient();

  const definition = await db
    .schema('analytics')
    .from('program_definition')
    .select('id, owner_tenant_id')
    .eq('id', params.programDefinitionId)
    .maybeSingle();

  if (definition.error || !definition.data) {
    throw new Error(`[KORA] createProgramParticipation rejected: program_definition "${params.programDefinitionId}" not found.`);
  }
  const ownerTenantId = (definition.data as { owner_tenant_id: string }).owner_tenant_id;
  if (ownerTenantId !== params.tenantId) {
    throw new Error(
      `[KORA] createProgramParticipation rejected: cross-company Program Participation is not allowed at skeleton stage (doc 69 §6) — tenant "${params.tenantId}" does not own program_definition "${params.programDefinitionId}".`,
    );
  }

  const { data, error } = await db
    .schema('analytics')
    .from('program_participation')
    .insert({
      program_definition_id: params.programDefinitionId,
      participant_tenant_id: params.tenantId,
      budget_amount: params.budgetAmount ?? null,
      eligibility_description: params.eligibilityDescription ?? null,
      population_estimate: params.populationEstimate ?? null,
      actor_role: params.actorRole,
      actor_id: params.actorId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createProgramParticipation failed: ${error?.message ?? 'no data returned'}`);
  }

  return toProgramParticipation(data as ProgramParticipationDbRow);
}

export async function listProgramParticipations(programDefinitionId: string, tenantId: string): Promise<ProgramParticipation[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('program_participation')
    .select()
    .eq('program_definition_id', programDefinitionId)
    .eq('participant_tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[KORA] listProgramParticipations failed: ${error.message}`);
  }

  return ((data ?? []) as ProgramParticipationDbRow[]).map(toProgramParticipation);
}

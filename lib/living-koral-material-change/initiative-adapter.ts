// lib/living-koral-material-change/initiative-adapter.ts
// KORA-WP-112 — Material Change Layer + Initiative Domain Adapter (Candidate-Only).
//
// The one domain adapter this WP itself builds — its sole V1 domain
// source, per registry 142's own text: "first adapter targets the
// existing, already-implemented initiative-lifecycle writer
// (app/api/admin/worker-initiatives/[id]/route.ts) as its sole domain
// source for V1." This module never writes to personal.worker_initiative
// itself (read-only source, per registry) — it only OBSERVES a
// transition the real writer already performed and reads that same real
// record back to re-verify it (never trusting its own caller's payload).
//
// ELIGIBLE TRANSITIONS ONLY (doc 129 Part 15, pre-check 168 §D):
//   draft     -> published   => Emergence candidate
//   (any)     -> closed      => Disappearance candidate
// Every other transition (no status change at all, or any other shape)
// produces NO candidate — not every initiative update is a candidate.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getOrganizationChangedVsKoraLearnedFramework } from '@/lib/living-koral-config/v1';
import { createMaterialChangeCandidate, assessMaterialChangeCandidate, recordConsolidationSources } from './material-change-service';
import { isMorphologyAreaCode } from '@/lib/living-koral-morphology-config/v1';
import type { MorphologyAreaCode } from '@/lib/living-koral-morphology-config/types';
import { recordLivingKoralTransformation } from '@/lib/living-koral-transformation-ledger/transformation-ledger-service';
import type {
  ObserveInitiativeTransitionParams, ObserveInitiativeTransitionResult, ObserveInitiativePillarChangeParams, ObserveInitiativeConsolidationParams,
  LivingKoralMaterialChangeRecord,
} from './types';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

// Consumes KORA-WP-111's own six-way framework rule rather than
// re-deriving or hardcoding it (this task's own §4, binding). Every
// initiative status transition this adapter ever observes is, by its own
// domain nature, framework type 'A' (Real organizational transformation
// — doc 129 Part 3's own type-A example literally names "an initiative
// is formally closed"). This assertion is a real, call-time consumption
// of KORA-WP-111's own rule — confirming the adapter's own domain
// assumption remains valid against the live config — not a decorative
// re-statement.
function assertInitiativeTransitionsAreTypeAJustified(): void {
  const framework = getOrganizationChangedVsKoraLearnedFramework();
  const typeA = framework.find((entry) => entry.type === 'A');
  if (!typeA?.justifiesMaterialChange) {
    throw new Error('[KORA] initiative-adapter invariant violated: KORA-WP-111\'s own config no longer marks framework type A as justifying Material Change — the initiative adapter\'s own domain assumption is no longer valid.');
  }
}

function mapTransitionToCategory(
  previousStatus: ObserveInitiativeTransitionParams['previousStatus'],
  newStatus: ObserveInitiativeTransitionParams['newStatus'],
): MaterialChangeTaxonomyEntry['category'] | null {
  if (previousStatus === newStatus) return null; // no transition at all — never a candidate
  if (previousStatus === 'draft' && newStatus === 'published') return 'Emergence';
  if (newStatus === 'closed') return 'Disappearance'; // any prior status -> closed
  return null; // every other shape (e.g. published -> draft) is not canonically eligible
}

/**
 * The adapter's own sole entry point — called from
 * app/api/admin/worker-initiatives/[id]/route.ts's own PATCH handler,
 * after its own real, unmodified update already succeeded. Creates a
 * CANDIDATE only (never RECOGNIZED — Founder Correction 4), then
 * immediately runs the Change Protocol's own evidence/persistence
 * assessment, which re-reads the REAL personal.worker_initiative row
 * (never trusting the caller-supplied previousStatus/newStatus alone)
 * before any promotion. For these two discrete, self-evidencing
 * categories (doc 129 Part 12) no Advisor confirmation applies and no
 * hysteresis/time-window applies (doc 129 Part 24, scoped to interpretive
 * categories only) — a transition that re-verifies as still true right
 * now is immediately, correctly RECOGNIZED, per the v2 Material Change
 * definition itself ("discrete and self-evidencing... does not need to
 * hold up over time to be real," doc 129 Part 1).
 *
 * Returns null if the transition is not canonically eligible — not every
 * initiative update is a candidate.
 */
export async function observeInitiativeTransition(params: ObserveInitiativeTransitionParams): Promise<ObserveInitiativeTransitionResult> {
  const category = mapTransitionToCategory(params.previousStatus, params.newStatus);
  if (!category) return null;

  assertInitiativeTransitionsAreTypeAJustified();

  // KORA-WP-145: snapshot the morphology area (pillar) from the REAL row at
  // observation time — the pillar is mutable, the recorded area must not be.
  const real = await readInitiative(params.tenantId, params.initiativeId);

  const candidate = await createMaterialChangeCandidate({
    tenantId: params.tenantId,
    category,
    affectedDomain: 'initiative',
    affectedArea: real?.pillar ?? null,
    sourceEntityType: 'initiative',
    sourceEntityId: params.initiativeId,
    occurredAt: new Date().toISOString(),
    provenance: `Initiative ${params.initiativeId} transitioned ${params.previousStatus} -> ${params.newStatus} (worker-initiative lifecycle writer).`,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });

  const recognized = await assessMaterialChangeCandidate({
    candidateId: candidate.id,
    tenantId: params.tenantId,
    actorRole: params.actorRole,
    actorId: params.actorId,
    // KORA-WP-116: recognitionSource is now a required, explicit
    // parameter of assessMaterialChangeCandidate() (previously hardcoded
    // 'kora-automatic' inside that function). This adapter's own
    // categories (Emergence/Disappearance) are discrete/self-evidencing —
    // no Advisor confirmation ever applies to them (doc 129 Part 12, this
    // file's own header) — so this call site is always 'kora-automatic'.
    recognitionSource: 'kora-automatic',
    reverifyAgainstSource: async () => {
      // Re-reads the REAL, current initiative record — the "evidence/
      // persistence assessment" itself, never trusting this function's
      // own caller-supplied params.
      const db = getSupabaseServiceClient();
      const { data: real } = await db
        .schema('personal').from('worker_initiative')
        .select('status').eq('id', params.initiativeId).eq('tenant_id', params.tenantId).maybeSingle();
      if (!real) return false;
      const currentStatus = (real as { status: string }).status;
      if (category === 'Emergence') return currentStatus === 'published' || currentStatus === 'closed'; // still published or has since progressed further — the emergence fact remains true either way
      if (category === 'Disappearance') return currentStatus === 'closed';
      return false;
    },
  });

  // KORA-WP-113 — additive, synchronous chaining (pre-check 170 §20.1,
  // this task's own §11: narrowest mechanism, no new infra). Only
  // RECOGNIZED rows may drive Morphogenesis (this task's own §2) — this
  // call is a safe no-op (idempotent) whether `recognized` was just newly
  // promoted by the assessment above or was already RECOGNIZED from an
  // earlier call; the RPC's own UNIQUE(material_change_id) is the real
  // exactly-once gate either way, never assumed correct by this caller's
  // own bookkeeping alone. A CANDIDATE (assessment did not promote) is
  // correctly skipped here without any special-case branch, since only a
  // RECOGNIZED record carries an id this WP-113 call would ever be
  // reached for.
  if (recognized && recognized.status === 'RECOGNIZED') {
    await recordLivingKoralTransformation({ materialChangeId: recognized.id, tenantId: params.tenantId });
  }

  return recognized;
}

interface RealInitiative {
  readonly status: string;
  readonly pillar: MorphologyAreaCode | null;
}

async function readInitiative(tenantId: string, initiativeId: string): Promise<RealInitiative | null> {
  const db = getSupabaseServiceClient();
  const { data } = await db
    .schema('personal').from('worker_initiative')
    .select('status, pillar').eq('id', initiativeId).eq('tenant_id', tenantId).maybeSingle();
  if (!data) return null;
  const row = data as { status: string; pillar: unknown };
  return { status: row.status, pillar: isMorphologyAreaCode(row.pillar) ? row.pillar : null };
}

async function latestMaterialChangeId(tenantId: string, initiativeId: string): Promise<string | null> {
  const db = getSupabaseServiceClient();
  const { data } = await db
    .schema('gov').from('living_koral_material_change')
    .select('id').eq('tenant_id', tenantId).eq('source_entity_type', 'initiative').eq('source_entity_id', initiativeId)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .limit(1).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * KORA-WP-145 (Founder X1) — the pillar of a PUBLISHED initiative changed.
 * Taxonomy: Reorientation, "initiative scope change (if tracked)" — the
 * pillar is that tracked scope. Interpretive category (doc 129 Part 12):
 * this creates a CANDIDATE only; recognition happens exclusively through
 * an Advisor's interpretive confirmation (KORA-WP-116 Mode B). The
 * organisational decision stays with the organisation.
 *
 * Re-reads the real row: the initiative must still be published and carry
 * `newPillar`. A genuinely new pillar change is a new transition, so the
 * candidate chains explicitly to the source's latest Material Change.
 */
export async function observeInitiativePillarChange(params: ObserveInitiativePillarChangeParams): Promise<LivingKoralMaterialChangeRecord | null> {
  if (params.previousPillar === params.newPillar) return null;
  assertInitiativeTransitionsAreTypeAJustified();
  const real = await readInitiative(params.tenantId, params.initiativeId);
  if (!real || real.status !== 'published' || real.pillar !== params.newPillar) return null;

  return createMaterialChangeCandidate({
    tenantId: params.tenantId,
    category: 'Reorientation',
    affectedDomain: 'initiative',
    affectedArea: params.newPillar,
    sourceEntityType: 'initiative',
    sourceEntityId: params.initiativeId,
    occurredAt: new Date().toISOString(),
    provenance: `Initiative ${params.initiativeId} changed pillar ${params.previousPillar} -> ${params.newPillar} while published (worker-initiative lifecycle writer).`,
    actorRole: params.actorRole,
    actorId: params.actorId,
    previousStateReference: (await latestMaterialChangeId(params.tenantId, params.initiativeId)) ?? undefined,
  });
}

/**
 * KORA-WP-145 (Founder K1) — records one organisation-approved
 * consolidation: the result initiative is published and every source is
 * closed, as one verifiable action. The caller (the consolidation writer)
 * performs those status writes WITHOUT routing them through
 * observeInitiativeTransition, then calls this function, which:
 *   1. re-verifies the real rows (result published, every source closed);
 *   2. creates the Consolidation candidate and its source set;
 *   3. recognizes it ('kora-automatic' — discrete, self-evidencing, and
 *      excluded from Advisor confirmation by doc 129 Part 12);
 *   4. records the `fuse` transformation FIRST, then observes each status
 *      transition, so the ledger carries fuse before the Emergence and
 *      Disappearances that follow from it. The pure fold treats those later
 *      rows as already-applied (no double structural change).
 * Returns null when the real rows do not show a completed consolidation.
 */
export async function observeInitiativeConsolidation(params: ObserveInitiativeConsolidationParams): Promise<LivingKoralMaterialChangeRecord | null> {
  const sources = [...new Set(params.sourceInitiativeIds)].filter((id) => id !== params.resultInitiativeId).sort();
  if (sources.length < 2) {
    throw new Error('[KORA] observeInitiativeConsolidation rejected: a consolidation needs at least two distinct source initiatives other than the result.');
  }
  assertInitiativeTransitionsAreTypeAJustified();

  const result = await readInitiative(params.tenantId, params.resultInitiativeId);
  if (!result || result.status !== 'published' || !result.pillar) return null;
  for (const id of sources) {
    const s = await readInitiative(params.tenantId, id);
    if (!s || s.status !== 'closed') return null;
  }

  const candidate = await createMaterialChangeCandidate({
    tenantId: params.tenantId,
    category: 'Consolidation',
    affectedDomain: 'initiative',
    affectedArea: result.pillar,
    sourceEntityType: 'initiative',
    sourceEntityId: params.resultInitiativeId,
    occurredAt: new Date().toISOString(),
    provenance: `Initiative ${params.resultInitiativeId} consolidates ${sources.length} initiatives (organisation-approved consolidation recorded by ${params.actorRole}).`,
    actorRole: params.actorRole,
    actorId: params.actorId,
  });
  if (candidate.status === 'CANDIDATE') {
    await recordConsolidationSources({ tenantId: params.tenantId, materialChangeId: candidate.id, sourceEntityIds: sources });
  }

  const recognized = await assessMaterialChangeCandidate({
    candidateId: candidate.id,
    tenantId: params.tenantId,
    actorRole: params.actorRole,
    actorId: params.actorId,
    recognitionSource: 'kora-automatic',
    reverifyAgainstSource: async () => {
      const r = await readInitiative(params.tenantId, params.resultInitiativeId);
      if (!r || r.status !== 'published') return false;
      for (const id of sources) {
        const s = await readInitiative(params.tenantId, id);
        if (!s || s.status !== 'closed') return false;
      }
      return true;
    },
  });

  if (recognized && recognized.status === 'RECOGNIZED') {
    await recordLivingKoralTransformation({ materialChangeId: recognized.id, tenantId: params.tenantId });
    if (params.resultPreviousStatus === 'draft') {
      await observeInitiativeTransition({
        tenantId: params.tenantId, initiativeId: params.resultInitiativeId, previousStatus: 'draft', newStatus: 'published',
        actorRole: params.actorRole, actorId: params.actorId,
      });
    }
    for (const id of sources) {
      await observeInitiativeTransition({
        tenantId: params.tenantId, initiativeId: id, previousStatus: params.sourcePreviousStatus[id] ?? 'published', newStatus: 'closed',
        actorRole: params.actorRole, actorId: params.actorId,
      });
    }
  }
  return recognized;
}

// tests/unit/kora-wp-116-koral-review.test.ts
// KORA-WP-116 — KORAL Review.
//
// 2026-09-19 REMEDIATION: this file replaces its own pre-remediation
// version. Two defects were found and fixed (see report 177's own
// remediation sections): (1) Advisor confirmation could take a canon-
// eligible CANDIDATE to RECOGNIZED even when KORA-WP-113 had no live
// Morphogenesis mapping for its category, leaving a partial
// "RECOGNIZED without transformation" state — now fails closed before
// any state is touched; (2) the eligible-category set itself was wrong
// (Consolidation was wrongly included, sourced only from a corroborating
// code comment rather than the primary canonical source, doc 129 Part 12)
// — corrected to the doc's own explicit four-category list.
//
// Three parts: (1) always-on structural guards (no score/grade/pass-fail/
// certification/approval/rejection-as-verdict vocabulary anywhere in the
// Review domain; eligibility-set/taxonomy partition integrity, cross-
// checked against the canonical config; no new table); (2) an env-var-
// gated real-DB section proving the actual Review Mode A (interpret) /
// Mode B (confirm) behavior, the fail-closed Morphogenesis gate, and
// Review-Case concurrency/idempotency, through the real TypeScript
// service functions against a local disposable Supabase stack — matching
// KORA-WP-112/113's own established real-service-layer testing convention
// exactly.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

const WP116_FILES = [
  'lib/living-koral-review/types.ts',
  'lib/living-koral-review/review-service.ts',
];

function readWp116File(rel: string): string {
  return readFileSync(rel, 'utf-8');
}

function codeOnly(rel: string): string {
  return readWp116File(rel).split('\n').filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l) && !/^\s*\/\*/.test(l)).join('\n');
}

describe('KORA-WP-116 — no score/grade/pass-fail/certification/approval/verdict-rejection vocabulary (Founder task spec, binding)', () => {
  // The real semantic risk this guard exists for is a KORA verdict on the
  // organization itself (a score, a grade, a pass/fail, a certification,
  // an approval/rejection OF THE TRANSFORMATION) — never this codebase's
  // own universal, pre-existing "[KORA] ... rejected: <reason>"
  // input-validation idiom (already used identically by dozens of other
  // WPs' services, e.g. createOperationalCase/createAdvisorContent/
  // createMaterialChangeCandidate, none of which was ever flagged as a
  // verdict leak). Every such literal error string, in any casing, is
  // stripped before scanning; "score/grade/.../rejection" is also
  // stripped where it appears in this file's own explanatory prose
  // (self-referential documentation, not functional code).
  const FORBIDDEN = /\bscore\b|\bgrade\b|\bpass[-_]?fail\b|\bcertif(y|ication)\b|\bapprov(e|al)\b/i;
  for (const file of WP116_FILES) {
    it(`${file}: contains none of the forbidden score/grade/certification/approval tokens outside the ordinary input-validation idiom`, () => {
      const src = codeOnly(file)
        .replace(/\[KORA\][^\n]*rejected:[^\n]*/gi, '')
        .replace(/\brejected\/expired\b/gi, '')
        .replace(/no-reject\/no-expire/gi, '')
        .replace(/\breject(ed|ion|s)?\b/gi, '');
      expect(src).not.toMatch(FORBIDDEN);
    });
  }
});

describe('KORA-WP-116 — eligibility-set/taxonomy partition integrity, cross-checked against the canonical config (must never silently misclassify a future 8th category)', () => {
  it('KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES + KORAL_REVIEW_EXCLUDED_CONFIRMATION_CATEGORIES partition getMaterialChangeTaxonomy()\'s own full category list exactly', async () => {
    const { getMaterialChangeTaxonomy } = await import('@/lib/living-koral-config/v1');
    const { KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES, KORAL_REVIEW_EXCLUDED_CONFIRMATION_CATEGORIES } = await import('@/lib/living-koral-review/types');
    const all = getMaterialChangeTaxonomy().map((e) => e.category).sort();
    const union = [...KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES, ...KORAL_REVIEW_EXCLUDED_CONFIRMATION_CATEGORIES].sort();
    expect(union).toEqual(all);
    const overlap = KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES.filter((c) => (KORAL_REVIEW_EXCLUDED_CONFIRMATION_CATEGORIES as readonly string[]).includes(c));
    expect(overlap).toHaveLength(0);
  });

  it('the eligible set is EXACTLY the 4 categories doc 129 Part 12 names, verbatim: Strengthening, Weakening, Reorientation, Stabilization', async () => {
    const { KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES } = await import('@/lib/living-koral-review/types');
    expect([...KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES].sort()).toEqual(['Reorientation', 'Stabilization', 'Strengthening', 'Weakening'].sort());
  });

  it('Emergence, Disappearance, AND Consolidation (corrected 2026-09-19 — previously wrongly included) are excluded from Advisor confirmation', async () => {
    const { isEligibleForAdvisorConfirmation } = await import('@/lib/living-koral-review/types');
    expect(isEligibleForAdvisorConfirmation('Emergence')).toBe(false);
    expect(isEligibleForAdvisorConfirmation('Disappearance')).toBe(false);
    expect(isEligibleForAdvisorConfirmation('Consolidation')).toBe(false);
    expect(isEligibleForAdvisorConfirmation('Strengthening')).toBe(true);
  });

  it('isCurrentlyConfirmable() cross-checks live KORA-WP-113 Morphogenesis support, not merely canon-eligibility — KORAL Morphology Package A (2026-09-19) gave all four eligible categories a live mapping, with ZERO code change in this file or review-service.ts (exactly as this function\'s own header promised: "structurally extensible without redesign")', async () => {
    const { isCurrentlyConfirmable } = await import('@/lib/living-koral-review/types');
    const { getMorphogenesisOperationMappings } = await import('@/lib/living-koral-morphogenesis-config/v1');
    for (const cat of ['Strengthening', 'Weakening', 'Reorientation', 'Stabilization'] as const) {
      const mapping = getMorphogenesisOperationMappings().find((m) => m.category === cat);
      expect(mapping?.operation).not.toBeNull(); // documents TODAY's state (Package A) — a future category could in principle go dormant again only by a deliberate config edit, never silently
      expect(isCurrentlyConfirmable(cat)).toBe(true);
    }
    // Consolidation remains the one canon-eligible-in-principle... no,
    // Consolidation is canon-INELIGIBLE (excluded set, doc 129 Part 12) —
    // isEligibleForAdvisorConfirmation('Consolidation') is false, so
    // isCurrentlyConfirmable is false regardless of any future mapping.
    expect(isCurrentlyConfirmable('Consolidation')).toBe(false);
    // A discrete category (Emergence) DOES have live support but is never
    // canon-eligible — isCurrentlyConfirmable requires both.
    expect(isCurrentlyConfirmable('Emergence')).toBe(false);
  });
});

describe('KORA-WP-116 — no new generic Review table; KORAL Review is a domain-shaped use of existing primitives', () => {
  it('no gov.living_koral_review / analytics.living_koral_review table exists in migration 086 or any later migration', () => {
    const src = readWp116File('supabase/migrations/086_koral_review.sql');
    expect(src).not.toMatch(/CREATE TABLE[\s\S]*living_koral_review/i);
  });

  it('review-service.ts never imports lib/review/review-service.ts (the unrelated Decision-Spine "Review" — KORA-WP-024) or review-advisor-assessment-service.ts (KORA-WP-037)', () => {
    const importLines = codeOnly('lib/living-koral-review/review-service.ts').split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
    expect(importLines).not.toMatch(/lib\/review\/review-service|review-advisor-assessment-service|review-advisor-proposal-service/);
  });

  it('Review-Case idempotency reuses KORA-WP-011\'s existing contract (no new generic idempotency framework)', () => {
    const importLines = codeOnly('lib/living-koral-review/review-service.ts').split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
    expect(importLines).toMatch(/async-contract\/idempotency-contract/);
    expect(importLines).toMatch(/async-contract\/postgres-idempotency-store/);
  });
});

// ── Real-DB-gated section — matches KORA-WP-112/113's own established
// real-service-layer testing convention exactly (env-var-gated, static
// local-only guard, full local Supabase stack required since the real
// service functions use getSupabaseServiceClient()). ────────────────────

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = ['azdnepfmwrmacruykskm', 'haqflkurpmeaxpikozjl'];
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalOnly(varName: string, url: string): void {
  const lower = url.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) throw new Error(`${varName} matches a known staging/production project ref — refusing to proceed.`);
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) throw new Error(`${varName} points at a hosted Supabase domain — refusing to proceed.`);
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`${varName} is not a valid URL — refusing to proceed.`);
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) throw new Error(`${varName} host "${hostname}" is not local — refusing to proceed.`);
}

const pgUrl = readEnv('WP116_PG_URL');
const supabaseUrl = readEnv('WP116_SUPABASE_URL');
const serviceRoleKey = readEnv('WP116_SERVICE_ROLE_KEY');
const allowed = readEnv('WP116_ALLOW_RUN') === 'true';
const ready = Boolean(pgUrl && supabaseUrl && serviceRoleKey && allowed);

describe('WP-116 guard — every *_URL env var (if set) must be local-only', () => {
  it('WP116_PG_URL / WP116_SUPABASE_URL are either unset or local-only', () => {
    if (pgUrl) expect(() => assertLocalOnly('WP116_PG_URL', pgUrl)).not.toThrow();
    if (supabaseUrl) expect(() => assertLocalOnly('WP116_SUPABASE_URL', supabaseUrl)).not.toThrow();
  });
});

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE = `WP116-FIXTURE-${RUN_SUFFIX_HEX}`;
const AUTH_UID = `00000000-0000-4000-9000-${RUN_SUFFIX_HEX}`;
const ACTOR_ID = `wp116-fixture-actor-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('KORA-WP-116 — real service-layer proof (local Supabase)', () => {
  let pgClient: InstanceType<typeof Client>;
  let tenantId: string;
  let assignmentId: string;
  let advisorIdentityId: string;
  let eligibleCandidateId: string; // Strengthening — canon-eligible AND (Package A, 2026-09-19) now has a live Morphogenesis mapping
  let excludedCandidateId: string; // Emergence — never eligible
  let consolidationCandidateId: string; // Consolidation — never eligible (canon-excluded, doc 129 Part 12) regardless of any future mapping
  let recognizedId: string; // Weakening, already RECOGNIZED — Mode A target

  it('setup: tenant + advisor identity + active Assignment + Material Change fixtures', async () => {
    if (!pgUrl || !supabaseUrl || !serviceRoleKey) throw new Error('unreachable: only runs when ready');
    assertLocalOnly('WP116_PG_URL', pgUrl);
    assertLocalOnly('WP116_SUPABASE_URL', supabaseUrl);
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    pgClient = new Client({ connectionString: pgUrl });
    await pgClient.connect();

    const tenant = await pgClient.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE, 'WP-116 Real-DB Fixture Tenant'],
    );
    tenantId = tenant.rows[0].id;

    const identity = await pgClient.query<{ id: string }>(
      `INSERT INTO advisor.advisor_identity (auth_user_id, full_name, status) VALUES ($1, 'WP-116 Fixture Advisor', 'active') RETURNING id`,
      [AUTH_UID],
    );
    advisorIdentityId = identity.rows[0].id;

    const assignment = await pgClient.query<{ id: string }>(
      `INSERT INTO advisor.advisor_assignment (advisor_id, organisation_type, company_id, role, status)
       VALUES ($1, 'company', $2, 'Company Advisor', 'active') RETURNING id`,
      [advisorIdentityId, tenantId],
    );
    assignmentId = assignment.rows[0].id;

    // evaluateAdvisorAssignmentValidity() (KORA-WP-031, reused unmodified
    // by createAdvisorContent) requires a QUALIFIED role qualification
    // AND a MET prerequisite-eligibility row — an active advisor_assignment
    // row alone is not sufficient.
    const qualification = await pgClient.query<{ id: string }>(
      `INSERT INTO advisor.advisor_role_qualification (advisor_id, role, status) VALUES ($1, 'Company Advisor', 'QUALIFIED') RETURNING id`,
      [advisorIdentityId],
    );
    await pgClient.query(
      `INSERT INTO advisor.advisor_prerequisite_eligibility (role_qualification_id, status) VALUES ($1, 'MET')`,
      [qualification.rows[0].id],
    );

    eligibleCandidateId = await insertMaterialChange('Strengthening', 'CANDIDATE');
    excludedCandidateId = await insertMaterialChange('Emergence', 'CANDIDATE');
    consolidationCandidateId = await insertMaterialChange('Consolidation', 'CANDIDATE');
    recognizedId = await insertMaterialChange('Weakening', 'RECOGNIZED');
  });

  async function insertMaterialChange(category: string, status: 'CANDIDATE' | 'RECOGNIZED'): Promise<string> {
    const mc = await pgClient.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, $2, 'initiative', 'initiative', gen_random_uuid(), now(), 'WP-116 fixture', '1.0', 'SYSTEM', $3)
       RETURNING id`,
      [tenantId, category, ACTOR_ID],
    );
    if (status === 'RECOGNIZED') {
      await pgClient.query(
        `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
        [mc.rows[0].id],
      );
    }
    return mc.rows[0].id;
  }

  // ── Required permanent test #1: unsupported Advisor-confirmable
  // category cannot become RECOGNIZED while Morphogenesis has no
  // supported operation. Required permanent test #4: eligibility remains
  // structurally extensible (isCurrentlyConfirmable's own composition,
  // already proven in the structural section above). ─────────────────────

  it('listKoralReviewSubjects: eligibleForConfirmation now INCLUDES a live-eligible category (Strengthening, Package A) — Emergence/Consolidation remain correctly excluded (canon-ineligible, never a live-mapping question) — recognizedForInterpretation still offers the RECOGNIZED change', async () => {
    const { listKoralReviewSubjects } = await import('@/lib/living-koral-review/review-service');
    const subjects = await listKoralReviewSubjects(assignmentId, advisorIdentityId);

    expect(subjects.eligibleForConfirmation.map((m) => m.id)).toContain(eligibleCandidateId); // Package A — a real live Advisor confirmation action now exists for this CANDIDATE
    expect(subjects.eligibleForConfirmation.map((m) => m.id)).not.toContain(excludedCandidateId); // Emergence — never canon-eligible, unaffected by any mapping
    expect(subjects.eligibleForConfirmation.map((m) => m.id)).not.toContain(consolidationCandidateId); // Consolidation — never canon-eligible, unaffected by any mapping
    expect(subjects.eligibleForConfirmation).toHaveLength(1); // exactly the one genuinely eligible+live CANDIDATE fixture — supported morphology is not the same as every CANDIDATE becoming confirmable
    expect(subjects.recognizedForInterpretation.map((m) => m.id)).toContain(recognizedId);
  });

  it('interpretRecognizedChange (Mode A): succeeds for a RECOGNIZED change, writes linked WP-036 content + a wrapping Case, zero mutation to the Material Change row', async () => {
    const { interpretRecognizedChange, listReviewInterpretations } = await import('@/lib/living-koral-review/review-service');

    const before = await pgClient.query(`SELECT status, updated_at FROM gov.living_koral_material_change WHERE id = $1`, [recognizedId]);

    const result = await interpretRecognizedChange({
      assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: recognizedId,
      interpretation: 'La riduzione riflette una minore continuità osservata nel periodo.', actorId: ACTOR_ID,
    });

    expect(result.case.linkedObjectType).toBe('material_change');
    expect(result.case.linkedObjectId).toBe(recognizedId);
    expect(result.content.linkedObjectType).toBe('material_change');
    expect(result.content.linkedObjectId).toBe(recognizedId);
    expect(result.content.class).toBe('ORGANISATION_SHAREABLE_NOTE');

    const after = await pgClient.query(`SELECT status, updated_at FROM gov.living_koral_material_change WHERE id = $1`, [recognizedId]);
    expect(after.rows[0].status).toBe(before.rows[0].status); // unchanged — zero mutation (required permanent test #3)
    expect(after.rows[0].updated_at.getTime()).toBe(before.rows[0].updated_at.getTime());

    const interpretations = await listReviewInterpretations(assignmentId, advisorIdentityId, recognizedId);
    expect(interpretations.some((c) => c.id === result.content.id)).toBe(true);
  });

  it('interpretRecognizedChange (Mode A) rejects a still-CANDIDATE Material Change — Mode A applies only to RECOGNIZED changes', async () => {
    const { interpretRecognizedChange } = await import('@/lib/living-koral-review/review-service');
    await expect(
      interpretRecognizedChange({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: eligibleCandidateId, interpretation: 'x', actorId: ACTOR_ID }),
    ).rejects.toThrow(/still CANDIDATE/);
  });

  it('confirmAmbiguousCandidate (Mode B) rejects a self-evidencing/automatic-only category (Emergence) — never Advisor-confirmable, no state touched', async () => {
    const { confirmAmbiguousCandidate } = await import('@/lib/living-koral-review/review-service');
    await expect(
      confirmAmbiguousCandidate({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: excludedCandidateId, actorId: ACTOR_ID }),
    ).rejects.toThrow(/not currently confirmable/);

    const row = await pgClient.query(`SELECT status FROM gov.living_koral_material_change WHERE id = $1`, [excludedCandidateId]);
    expect(row.rows[0].status).toBe('CANDIDATE'); // untouched
  });

  it('confirmAmbiguousCandidate (Mode B) rejects Consolidation (corrected 2026-09-19: canonically NOT Advisor-confirmable — doc 129 Part 12 names only Strengthening/Weakening/Reorientation/Stabilization) — no state touched', async () => {
    const { confirmAmbiguousCandidate } = await import('@/lib/living-koral-review/review-service');
    await expect(
      confirmAmbiguousCandidate({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: consolidationCandidateId, actorId: ACTOR_ID }),
    ).rejects.toThrow(/not currently confirmable/);

    const row = await pgClient.query(`SELECT status FROM gov.living_koral_material_change WHERE id = $1`, [consolidationCandidateId]);
    expect(row.rows[0].status).toBe('CANDIDATE');
  });

  // ── KORAL Morphology Package A (2026-09-19) — the fail-closed gate's own
  // POSITIVE case, now directly exercisable: a genuinely canon-eligible
  // category (Strengthening) that DOES now have a live KORA-WP-113
  // Morphogenesis mapping succeeds end-to-end through the full 10-step
  // Mode B sequence — RECOGNIZED, a real Transformation Ledger row
  // (increase_extent), both governance events, all in one call. This
  // replaces the pre-Package-A negative test of the same shape (which
  // proved the fail-closed gate's REJECTION path; that path itself is
  // still proven, unchanged, immediately below by the Consolidation/
  // Emergence tests above). No fabricated domain producer is introduced
  // anywhere by this test — eligibleCandidateId is a synthetic CANDIDATE
  // fixture inserted directly by SQL (identical to every other fixture in
  // this file), exercising the CONFIRMATION MACHINERY only, never a real
  // production candidate-creation path (report 183's own explicit "NO
  // FAKE LIVE PRODUCERS" boundary — no domain adapter for this category
  // exists anywhere in the codebase, unchanged). ─────────────────────────

  it('confirmAmbiguousCandidate (Mode B) SUCCEEDS for a canon-eligible category that now has a live KORA-WP-113 Morphogenesis mapping (Strengthening, Package A) — promotes to RECOGNIZED, chains into a real increase_extent Transformation Ledger row, records both governance events', async () => {
    const { confirmAmbiguousCandidate } = await import('@/lib/living-koral-review/review-service');

    const govBefore = await pgClient.query(`SELECT count(*)::int AS n FROM audit.governance_event WHERE object_id = $1 AND event_type = 'koral_review.candidate_confirmed'`, [eligibleCandidateId]);

    const result = await confirmAmbiguousCandidate({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: eligibleCandidateId, actorId: ACTOR_ID });
    expect(result.recognized).toBe(true);
    expect(result.materialChange.status).toBe('RECOGNIZED');
    expect(result.materialChange.recognitionSource).toBe('advisor-confirmed');

    const row = await pgClient.query(`SELECT status, recognition_source FROM gov.living_koral_material_change WHERE id = $1`, [eligibleCandidateId]);
    expect(row.rows[0].status).toBe('RECOGNIZED');
    expect(row.rows[0].recognition_source).toBe('advisor-confirmed');

    const ledger = await pgClient.query(`SELECT operation FROM gov.living_koral_transformation_ledger WHERE material_change_id = $1`, [eligibleCandidateId]);
    expect(ledger.rows).toHaveLength(1); // exactly one real transformation, chained through step 10
    expect(ledger.rows[0].operation).toBe('increase_extent');

    const govAfter = await pgClient.query(`SELECT count(*)::int AS n FROM audit.governance_event WHERE object_id = $1 AND event_type = 'koral_review.candidate_confirmed'`, [eligibleCandidateId]);
    expect(govAfter.rows[0].n).toBe(govBefore.rows[0].n + 1); // step 9's own domain provenance event
  });

  it('CONCURRENCY — two genuinely concurrent confirmAmbiguousCandidate() calls on the SAME now-live-eligible CANDIDATE (Weakening, Package A) resolve to exactly ONE winner, ONE RECOGNIZED promotion, ONE decrease_extent ledger row — no lost update, no duplicate transformation (mirrors the CAS-race pattern the CORROBORATING test below already proved for Disappearance)', async () => {
    const { confirmAmbiguousCandidate } = await import('@/lib/living-koral-review/review-service');
    const raceCandidateId = await insertMaterialChange('Weakening', 'CANDIDATE');

    const results = await Promise.allSettled([
      confirmAmbiguousCandidate({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: raceCandidateId, actorId: ACTOR_ID }),
      confirmAmbiguousCandidate({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: raceCandidateId, actorId: ACTOR_ID }),
    ]);

    // confirmAmbiguousCandidate's own graceful-race wrapper (review-service.ts,
    // unchanged by Package A) means BOTH calls typically resolve successfully
    // — the loser is handed the winner's own already-RECOGNIZED result
    // rather than an error (see that function's own header) — so this
    // asserts on FINAL STATE (exactly-once), not on which promise settled
    // how.
    const settled = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof confirmAmbiguousCandidate>>> => r.status === 'fulfilled');
    expect(settled.length).toBeGreaterThanOrEqual(1);
    expect(settled.every((r) => r.value.recognized === true)).toBe(true);

    const row = await pgClient.query(`SELECT status FROM gov.living_koral_material_change WHERE id = $1`, [raceCandidateId]);
    expect(row.rows[0].status).toBe('RECOGNIZED');
    const ledger = await pgClient.query(`SELECT operation FROM gov.living_koral_transformation_ledger WHERE material_change_id = $1`, [raceCandidateId]);
    expect(ledger.rows).toHaveLength(1); // exactly one — no duplicate transformation from the race
    expect(ledger.rows[0].operation).toBe('decrease_extent');
  });

  // ── Corroborating proof (Disappearance is never Advisor-eligible, so
  // this is not itself a Mode B reachability claim) — required permanent
  // test #7/#8: exactly-once recognition + exactly-once transformation
  // under genuine concurrency, proven directly against the underlying
  // KORA-WP-112/113 primitives confirmAmbiguousCandidate's own
  // graceful-race wrapper reuses unchanged. "The day KORA-WP-113 gains a
  // mapping for an eligible category" (this test's own original framing)
  // has now arrived — KORAL Morphology Package A, 2026-09-19 — and the
  // DIRECT Mode B proof for that case now exists above (the Strengthening
  // success test and the Weakening concurrency test); this test remains a
  // useful, independent corroboration of the same shared CAS mechanism
  // against an always-live category. ──────────────────────────────────

  it('CORROBORATING — the underlying KORA-WP-112 recognition CAS + KORA-WP-113 chaining (which confirmAmbiguousCandidate reuses unchanged) is exactly-once under real concurrency, proven directly against a currently-supported category (Disappearance) — no Morphogenesis mapping fabricated', async () => {
    const { assessMaterialChangeCandidate, getMaterialChangeCandidate } = await import('@/lib/living-koral-material-change/material-change-service');
    const { recordLivingKoralTransformation } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');
    const raceCandidateId = await insertMaterialChange('Disappearance', 'CANDIDATE');

    async function attemptConfirm() {
      try {
        const rec = await assessMaterialChangeCandidate({
          candidateId: raceCandidateId, tenantId, actorRole: 'ADVISOR', actorId: ACTOR_ID,
          recognitionSource: 'advisor-confirmed',
          reverifyAgainstSource: async () => {
            const fresh = await getMaterialChangeCandidate(raceCandidateId, tenantId);
            return !!fresh && fresh.status === 'CANDIDATE';
          },
        });
        if (rec && rec.status === 'RECOGNIZED') await recordLivingKoralTransformation({ materialChangeId: rec.id, tenantId });
        return { ok: true as const };
      } catch {
        return { ok: false as const }; // the CAS loser — expected under genuine concurrency
      }
    }

    const [a, b] = await Promise.all([attemptConfirm(), attemptConfirm()]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1); // exactly one winner

    const finalRow = await pgClient.query(`SELECT status, recognition_source FROM gov.living_koral_material_change WHERE id = $1`, [raceCandidateId]);
    expect(finalRow.rows[0].status).toBe('RECOGNIZED');
    expect(finalRow.rows[0].recognition_source).toBe('advisor-confirmed');

    const ledger = await pgClient.query(`SELECT count(*)::int AS n FROM gov.living_koral_transformation_ledger WHERE material_change_id = $1`, [raceCandidateId]);
    expect(ledger.rows[0].n).toBe(1); // exactly one — no duplicate transformation from the race
  });

  // ── Required permanent tests #5/#6: Review-Case idempotency (Issue 2). ──

  it('REVIEW-CASE IDEMPOTENCY — same-key concurrent Case creation (two concurrent Mode-A interpretations of the SAME Material Change) produces exactly one effective Operational Case, via KORA-WP-011\'s reused idempotency contract', async () => {
    const { interpretRecognizedChange } = await import('@/lib/living-koral-review/review-service');
    const target = await insertMaterialChange('Reorientation', 'RECOGNIZED');

    const [r1, r2] = await Promise.all([
      interpretRecognizedChange({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: target, interpretation: 'Prima nota concorrente.', actorId: ACTOR_ID }),
      interpretRecognizedChange({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: target, interpretation: 'Seconda nota concorrente.', actorId: ACTOR_ID }),
    ]);

    expect(r1.case.id).toBe(r2.case.id); // one effective Case, not two

    const cases = await pgClient.query(
      `SELECT count(*)::int AS n FROM gov.operational_case WHERE linked_object_type = 'material_change' AND linked_object_id = $1`,
      [target],
    );
    expect(cases.rows[0].n).toBe(1);

    const claim = await pgClient.query(
      `SELECT status FROM analytics.idempotency_claim WHERE operation = 'koral_review.case_create' AND idempotency_key = $1`,
      [`${assignmentId}:${target}`],
    );
    expect(claim.rows).toHaveLength(1); // the reused KORA-WP-011 infrastructure actually claimed this exact key
    expect(claim.rows[0].status).toBe('succeeded');
  });

  it('REVIEW-CASE IDEMPOTENCY — different-key creation (two DIFFERENT Material Changes) produces two distinct Operational Cases — domain multiplicity is unaffected by the retry-identity fix', async () => {
    const { interpretRecognizedChange } = await import('@/lib/living-koral-review/review-service');
    const targetA = await insertMaterialChange('Stabilization', 'RECOGNIZED');
    const targetB = await insertMaterialChange('Stabilization', 'RECOGNIZED');

    const rA = await interpretRecognizedChange({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: targetA, interpretation: 'Nota A.', actorId: ACTOR_ID });
    const rB = await interpretRecognizedChange({ assignmentId, callerAdvisorId: advisorIdentityId, materialChangeId: targetB, interpretation: 'Nota B.', actorId: ACTOR_ID });

    expect(rA.case.id).not.toBe(rB.case.id);
  });

  it('teardown', async () => {
    await pgClient.end();
  });
});

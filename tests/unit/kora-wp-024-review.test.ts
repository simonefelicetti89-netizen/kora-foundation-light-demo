/**
 * KORA-WP-024 — Review — Thin State + Event.
 *
 * Behavioral tests of the REAL functions in lib/review/review-service.ts,
 * with the Supabase I/O boundary mocked — same technique as this
 * engagement's own kora-wp-020/021/022 test files. `concludeReview()`
 * delegates to a single atomic Postgres RPC (analytics.conclude_review(),
 * migration 070); its own atomicity/Lock-9-style guarantees (status,
 * event, governance_event all together or not at all), the append-only
 * review_event immutability, the post-conclusion review immutability, and
 * the "Review requires a committed Commitment" DB trigger are all real-DB
 * proven (see the implementation report) — a mock cannot prove real
 * Postgres transaction/trigger behavior, so this file's job is narrower:
 * the TS wrapper's own authorization gate, call shapes, and the
 * non-constitutive open/in-progress/read behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface CommitmentRow { id: string; tenant_id: string; status: string; }
interface ReviewRow {
  id: string; tenant_id: string; commitment_id: string; status: string;
  opened_at: string; concluded_at: string | null; actor_role: string; actor_id: string;
  created_at: string; updated_at: string;
}

let commitments: CommitmentRow[] = [];
let reviews: ReviewRow[] = [];
let idCounter = 0;
const rpcMock = vi.fn();

function applyFilters<T>(rows: T[], filters: Record<string, unknown>): T[] {
  return rows.filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
}

function makeChain<T>(store: () => T[], opts: { projection?: string; filters?: Record<string, unknown>; order?: { col: string; ascending: boolean }; limit?: number } = {}) {
  const filters = opts.filters ?? {};
  const project = (row: T): unknown => {
    if (!opts.projection) return { ...row };
    const out: Record<string, unknown> = {};
    for (const f of opts.projection.split(',').map((c) => c.trim())) out[f] = (row as unknown as Record<string, unknown>)[f];
    return out;
  };
  return {
    eq(col: string, val: unknown) { return makeChain(store, { ...opts, filters: { ...filters, [col]: val } }); },
    order(col: string, o: { ascending?: boolean } = {}) { return makeChain(store, { ...opts, order: { col, ascending: o.ascending !== false } }); },
    limit(n: number) { return makeChain(store, { ...opts, limit: n }); },
    single: async () => {
      const matched = applyFilters(store(), filters);
      if (matched.length !== 1) return { data: null, error: { message: 'row not found' } };
      return { data: project(matched[0]), error: null };
    },
    maybeSingle: async () => {
      let matched = applyFilters(store(), filters);
      if (opts.order) {
        const { col, ascending } = opts.order;
        matched = [...matched].sort((a, b) => {
          const av = (a as unknown as Record<string, unknown>)[col] as string;
          const bv = (b as unknown as Record<string, unknown>)[col] as string;
          return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      if (opts.limit) matched = matched.slice(0, opts.limit);
      if (matched.length === 0) return { data: null, error: null };
      return { data: project(matched[0]), error: null };
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      rpc: rpcMock,
      from: (table: string) => {
        if (schemaName !== 'analytics') throw new Error(`unexpected schema in WP-024 mock: ${schemaName}`);

        if (table === 'commitment') {
          return { select: (cols?: string) => makeChain(() => commitments, { projection: cols }) };
        }

        if (table === 'review') {
          return {
            select: (cols?: string) => makeChain(() => reviews, { projection: cols }),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  idCounter += 1;
                  const now = new Date().toISOString();
                  const row: ReviewRow = {
                    id: `rv-${idCounter}`,
                    tenant_id: payload.tenant_id as string,
                    commitment_id: payload.commitment_id as string,
                    status: 'open',
                    opened_at: now,
                    concluded_at: null,
                    actor_role: payload.actor_role as string,
                    actor_id: payload.actor_id as string,
                    created_at: now,
                    updated_at: now,
                  };
                  reviews.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            update: (patch: Record<string, unknown>) => ({
              eq: (col1: string, val1: unknown) => ({
                eq: async (col2: string, val2: unknown) => {
                  const idx = reviews.findIndex((r) => (r as unknown as Record<string, unknown>)[col1] === val1 && (r as unknown as Record<string, unknown>)[col2] === val2);
                  if (idx === -1) return { error: { message: 'row not found' } };
                  reviews[idx] = { ...reviews[idx], ...patch, updated_at: new Date().toISOString() };
                  return { error: null };
                },
              }),
            }),
          };
        }

        throw new Error(`unexpected table in WP-024 mock: ${table}`);
      },
    }),
  }),
}));

let openReview: typeof import('@/lib/review/review-service').openReview;
let markReviewInProgress: typeof import('@/lib/review/review-service').markReviewInProgress;
let concludeReview: typeof import('@/lib/review/review-service').concludeReview;
let getReview: typeof import('@/lib/review/review-service').getReview;
let getReviewForCommitment: typeof import('@/lib/review/review-service').getReviewForCommitment;
let REVIEW_VERDICTS: typeof import('@/lib/review/review-service').REVIEW_VERDICTS;

const OWNER = { actorRole: 'COMPANY_ADMIN', actorId: 'admin-1' };
const TENANT = 'tenant-1';
const OTHER_TENANT = 'tenant-2';

beforeEach(async () => {
  commitments = [
    { id: 'cm-committed', tenant_id: TENANT, status: 'committed' },
    { id: 'cm-draft', tenant_id: TENANT, status: 'draft' },
    { id: 'cm-other-tenant', tenant_id: OTHER_TENANT, status: 'committed' },
  ];
  reviews = [];
  idCounter = 0;
  rpcMock.mockReset();
  ({
    openReview, markReviewInProgress, concludeReview, getReview, getReviewForCommitment, REVIEW_VERDICTS,
  } = await import('@/lib/review/review-service'));
});

describe('KORA-WP-024 — vocabulary', () => {
  it('exposes exactly PT FT-024\'s six canonical verdicts', () => {
    expect(REVIEW_VERDICTS).toEqual(['KEEP', 'STOP', 'MODIFY', 'REALLOCATE', 'CREATE', 'INVESTIGATE']);
  });
});

describe('KORA-WP-024 — openReview()', () => {
  it('opens a review against a committed commitment', async () => {
    const review = await openReview({ commitmentId: 'cm-committed', tenantId: TENANT, ...OWNER });
    expect(review.status).toBe('open');
    expect(review.commitmentId).toBe('cm-committed');
  });

  it('rejects opening against a still-draft commitment', async () => {
    await expect(openReview({ commitmentId: 'cm-draft', tenantId: TENANT, ...OWNER })).rejects.toThrow(/not committed/);
  });

  it('rejects a cross-tenant commitment', async () => {
    await expect(openReview({ commitmentId: 'cm-other-tenant', tenantId: TENANT, ...OWNER })).rejects.toThrow(/cross-tenant references are never allowed/);
  });

  it('rejects a non-COMPANY_ADMIN actor (Advisor may support, never open constitutively in this WP\'s own scope)', async () => {
    await expect(openReview({ commitmentId: 'cm-committed', tenantId: TENANT, actorRole: 'ADVISOR', actorId: 'adv-1' })).rejects.toThrow(/only COMPANY_ADMIN may act/);
  });
});

describe('KORA-WP-024 — markReviewInProgress()', () => {
  it('transitions open → in-progress', async () => {
    const review = await openReview({ commitmentId: 'cm-committed', tenantId: TENANT, ...OWNER });
    const updated = await markReviewInProgress({ reviewId: review.id, tenantId: TENANT, ...OWNER });
    expect(updated.status).toBe('in-progress');
  });

  it('rejects transitioning a non-open review', async () => {
    const review = await openReview({ commitmentId: 'cm-committed', tenantId: TENANT, ...OWNER });
    await markReviewInProgress({ reviewId: review.id, tenantId: TENANT, ...OWNER });
    await expect(markReviewInProgress({ reviewId: review.id, tenantId: TENANT, ...OWNER })).rejects.toThrow(/not open/);
  });

  it('rejects a non-COMPANY_ADMIN actor', async () => {
    const review = await openReview({ commitmentId: 'cm-committed', tenantId: TENANT, ...OWNER });
    await expect(markReviewInProgress({ reviewId: review.id, tenantId: TENANT, actorRole: 'ADVISOR', actorId: 'adv-1' })).rejects.toThrow(/only COMPANY_ADMIN may act/);
  });
});

describe('KORA-WP-024 — concludeReview() — authorization gate + RPC shape', () => {
  it('rejects a missing actor before ever calling the RPC', async () => {
    await expect(concludeReview({
      reviewId: 'rv-1', tenantId: TENANT, actorRole: '', actorId: '',
      actualDecision: 'x', effectiveDate: '2027-01-01', verdict: 'KEEP',
    })).rejects.toThrow(/actorRole and actorId are required/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejects an ADVISOR actor before ever calling the RPC (doc 73 §6 — conclusion is Decision-Owner-only)', async () => {
    await expect(concludeReview({
      reviewId: 'rv-1', tenantId: TENANT, actorRole: 'ADVISOR', actorId: 'adv-1',
      actualDecision: 'x', effectiveDate: '2027-01-01', verdict: 'KEEP',
    })).rejects.toThrow(/only COMPANY_ADMIN may act/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejects a non-canonical verdict before ever calling the RPC', async () => {
    await expect(concludeReview({
      reviewId: 'rv-1', tenantId: TENANT, ...OWNER,
      actualDecision: 'x', effectiveDate: '2027-01-01',
      // @ts-expect-error — deliberately invalid verdict
      verdict: 'APPROVE',
    })).rejects.toThrow(/not a canonical verdict/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('calls conclude_review with exactly the expected params', async () => {
    rpcMock.mockResolvedValue({ data: [{ review_event_id: 'rve-1', concluded_at: '2027-01-01T00:00:00Z' }], error: null });
    const result = await concludeReview({
      reviewId: 'rv-1', tenantId: TENANT, ...OWNER,
      actualDecision: 'continue as planned', effectiveDate: '2027-01-01', verdict: 'KEEP',
      indicatedDecision: 'evidence suggested continuing', rationaleCategory: 'on-track',
    });
    expect(rpcMock).toHaveBeenCalledWith('conclude_review', {
      p_review_id: 'rv-1', p_tenant_id: TENANT, p_actor_role: 'COMPANY_ADMIN', p_actor_id: 'admin-1',
      p_actual_decision: 'continue as planned', p_effective_date: '2027-01-01', p_verdict: 'KEEP',
      p_decision_owner: 'COMPANY_ADMIN', p_indicated_decision: 'evidence suggested continuing',
      p_rationale_category: 'on-track', p_intervention: null, p_supersedes: null,
    });
    expect(result).toEqual({ reviewEventId: 'rve-1', concludedAt: '2027-01-01T00:00:00Z' });
  });

  it('propagates a Lock-9-style rejection from the RPC (no committed Commitment path)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'kora/already-concluded: review "rv-1" is already concluded' } });
    await expect(concludeReview({
      reviewId: 'rv-1', tenantId: TENANT, ...OWNER,
      actualDecision: 'x', effectiveDate: '2027-01-01', verdict: 'KEEP',
    })).rejects.toThrow(/kora\/already-concluded/);
  });
});

describe('KORA-WP-024 — read paths', () => {
  it('getReview / getReviewForCommitment', async () => {
    const review = await openReview({ commitmentId: 'cm-committed', tenantId: TENANT, ...OWNER });
    expect((await getReview(review.id, TENANT))!.id).toBe(review.id);
    expect((await getReviewForCommitment('cm-committed', TENANT))!.id).toBe(review.id);
  });

  it('returns null for a non-existent review', async () => {
    expect(await getReview('nope', TENANT)).toBeNull();
    expect(await getReviewForCommitment('nope', TENANT)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-024 — scope integrity', () => {
  const src = readFileSync(join(process.cwd(), 'lib/review/review-service.ts'), 'utf-8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/070_review_thin_state_event.sql'), 'utf-8');
  const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('no Program, Decision Pack, or Advisor-facing function exists', () => {
    expect(src).not.toMatch(/export async function \w*[Aa]dvisor|export async function \w*[Pp]rogram|export async function \w*[Dd]ecisionPack/);
  });

  it('no KORA Index/IU/Confidence/BTI/generic-KPI reference anywhere', () => {
    expect(codeOnly).not.toMatch(/kora.?index|confidence.?score|\bIU\b|\bbti\b|kpi.?measure|generic.?kpi/i);
  });

  it('no Living KORAL anticipation', () => {
    expect(codeOnly).not.toMatch(/living.?koral|material.?change|morpholog/i);
  });

  it('no Worker-level reference anywhere', () => {
    expect(codeOnly).not.toMatch(/worker_id|workerId|worker_ref/i);
    expect(migrationSrc).not.toMatch(/worker_id|worker_ref/i);
  });

  it('migration releases Commitment/Evidence Plan CHECK constraints exactly as before — WP-024 does not touch them', () => {
    expect(migrationSrc).not.toMatch(/DROP CONSTRAINT commitment_status_check|DROP CONSTRAINT evidence_plan_status_check/);
  });

  it('migration grants EXECUTE on conclude_review to service_role only, PUBLIC explicitly revoked from the start', () => {
    expect(migrationSrc).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.conclude_review/);
    expect(migrationSrc).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.conclude_review\([^)]*\) FROM PUBLIC;/);
  });

  it('migration grants no DELETE anywhere on review or review_event', () => {
    expect(migrationSrc).not.toMatch(/GRANT.*DELETE.*ON analytics\.review\b/);
    expect(migrationSrc).not.toMatch(/GRANT.*DELETE.*ON analytics\.review_event/);
  });

  it('review_event carries exactly PT FT-024\'s six verdicts, no more', () => {
    expect(migrationSrc).toMatch(/verdict\s+text\s+NOT NULL\s+CHECK \(verdict IN \('KEEP', 'STOP', 'MODIFY', 'REALLOCATE', 'CREATE', 'INVESTIGATE'\)\)/);
  });

  it('has both the committed-Commitment-required trigger and the post-conclusion immutability trigger', () => {
    expect(migrationSrc).toMatch(/trg_review_requires_committed_commitment/);
    expect(migrationSrc).toMatch(/trg_review_post_conclusion_immutability/);
    expect(migrationSrc).toMatch(/trg_review_event_no_mutation/);
  });

  it('the Core Decision Linkage view integration replaces the NULL placeholder with a real join, still security_invoker, still no independent RLS policy', () => {
    expect(migrationSrc).toMatch(/CREATE OR REPLACE VIEW analytics\.commitment_decision_trace/);
    expect(migrationSrc).toMatch(/WITH \(security_invoker = true\)/);
    expect(migrationSrc).toMatch(/LEFT JOIN analytics\.review r/);
    expect(migrationSrc).not.toMatch(/CREATE POLICY.*commitment_decision_trace/);
  });

  it('every mutating function requires actorRole === COMPANY_ADMIN', () => {
    const mutators = ['openReview', 'markReviewInProgress', 'concludeReview'];
    for (const fn of mutators) {
      const match = src.match(new RegExp(`export async function ${fn}[\\s\\S]*?\\n\\}`));
      expect(match, `${fn} not found`).not.toBeNull();
      expect(match![0]).toMatch(/assertDecisionOwner/);
    }
  });
});

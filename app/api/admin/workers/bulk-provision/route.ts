// app/api/admin/workers/bulk-provision/route.ts
// WORKER-BULK-PROVISIONING-01 — bulk worker invitation for pilot cohorts.
//
// Mirrors the exact per-worker sequence already used by
// app/api/admin/workers/provision/route.ts (B104) — invite via Supabase
// Admin API, insert personal.worker_identity via the same scoped,
// whitelist-enforced insertWorkerIdentity() service-key helper, update
// app_metadata — but looped sequentially over a validated batch. Tenant is
// resolved once by tenantId (not tenantCode), matching the admin nav
// pattern already used by /admin/company-users-live and
// /admin/company-workspace-live (client-supplied tenantId, always
// DB-validated server-side before use — the established ADMIN-route
// pattern, per the RLS-04 tenant-enforcement audit).
//
// provision/route.ts itself is intentionally left untouched: existing tests
// (tests/unit/b104-worker-provisioning.test.ts) assert its exact literal
// source (kora_role spacing, the insertWorkerIdentity import line, etc.) as
// part of its contract. Extracting that logic into a shared function would
// have broken those white-box assertions for no safety benefit — duplicating
// this short, already-tested sequence here (while still calling the same
// insertWorkerIdentity() helper for the one DB write involved) is the lower-
// risk path.
//
// Privacy invariants (identical to the single-worker route):
//   - Only KORA_ADMIN can call this route.
//   - workerRef stays an opaque label — never real name or email.
//   - firstName/lastName are accepted only for the admin's own batch
//     preview/legibility — they are validated here for shape but never
//     forwarded to insertWorkerIdentity() (whitelist-enforced, would throw)
//     and never sent to Supabase Auth beyond the required invite email.
//   - No secrets, no service-role client details, ever appear in the response.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { insertWorkerIdentity } from '@/lib/supabase/worker-provisioning-service-key';
import { MAX_BULK_BATCH_SIZE, validateWorkerBatch, type ParsedWorkerInput } from '@/lib/admin/bulk-worker-parser';
import { assertSameOrigin } from '@/lib/security/origin';

const WorkerInputSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName:  z.string().max(100).optional(),
  email:     z.string().email('email non valido'),
  workerRef: z.string().max(100).optional(),
});

const BulkProvisionSchema = z.object({
  tenantId: z.string().uuid('tenantId non valido'),
  workers:  z.array(WorkerInputSchema)
    .min(1, 'workers non può essere vuoto')
    .max(MAX_BULK_BATCH_SIZE, `Massimo ${MAX_BULK_BATCH_SIZE} worker per batch`),
});

export type BulkRowOutcome = 'created' | 'already_exists' | 'invited' | 'failed' | 'validation_error';

interface BulkRowResult {
  email: string;
  outcome: BulkRowOutcome;
  workerId?: string;
  warning?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BulkProvisionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Payload non valido.' },
      { status: 400 },
    );
  }

  const { tenantId } = parsed.data;

  // firstName/lastName pass shape validation above (preview legibility only)
  // but are deliberately dropped before anything reaches Supabase — only
  // email and workerRef are ever provisioned.
  const workers: ParsedWorkerInput[] = parsed.data.workers.map((w) => ({
    email:     w.email.trim().toLowerCase(),
    workerRef: w.workerRef,
  }));

  // Defense-in-depth: re-validate server-side even though the admin UI
  // already validated/previewed this batch client-side.
  const batchValidation = validateWorkerBatch(workers);
  if (!batchValidation.valid) {
    return NextResponse.json({ error: batchValidation.errors.join(' ') }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // ── Resolve tenant once by tenantId ─────────────────────────────────────────
  const { data: tenantRow, error: tErr } = await db.schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, is_active')
    .eq('id', tenantId)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!tenantRow) return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;
  if (!t.is_active) {
    return NextResponse.json({ error: 'Cannot provision workers for an inactive tenant.' }, { status: 422 });
  }
  const tenantCode = t.tenant_code as string;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000');

  const results: BulkRowResult[] = [];

  // Sequential processing — safe for pilot batch sizes (<= MAX_BULK_BATCH_SIZE),
  // avoids bursting Supabase Admin API invite rate limits.
  for (const worker of workers) {
    const email = worker.email;
    const workerRef = (worker.workerRef ?? '').trim()
      || `WRK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const { data: inviteData, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/auth/callback`,
        data: {
          kora_role:      'WORKER',
          kora_tenant_id: tenantId,
          kora_status:    'invited',
        },
      });

      if (inviteErr) {
        if (inviteErr.message.toLowerCase().includes('already') || inviteErr.message.toLowerCase().includes('exist')) {
          results.push({ email, outcome: 'already_exists', error: 'Worker già invitato o esistente.' });
          continue;
        }
        results.push({ email, outcome: 'failed', error: inviteErr.message });
        continue;
      }

      const authUserId = inviteData.user.id;

      const { data: wiRow, error: wiErr } = await insertWorkerIdentity({
        tenant_id:    tenantId,
        auth_user_id: authUserId,
        worker_ref:   workerRef,
        status:       'invited',
      });

      if (wiErr || !wiRow) {
        results.push({ email, outcome: 'failed', error: `worker_identity insert: ${wiErr ?? 'no data returned'}` });
        continue;
      }

      const workerId = wiRow.id;

      const { error: metaErr } = await db.auth.admin.updateUserById(authUserId, {
        app_metadata: {
          kora_role:      'WORKER',
          kora_tenant_id: tenantId,
          kora_worker_id: workerId,
          kora_status:    'invited',
        },
      });

      if (metaErr) {
        results.push({ email, outcome: 'invited', workerId, warning: `app_metadata update failed: ${metaErr.message}` });
        continue;
      }

      results.push({ email, outcome: 'invited', workerId });
    } catch (e) {
      results.push({ email, outcome: 'failed', error: (e as Error).message });
    }
  }

  const summary = {
    total:         results.length,
    invited:       results.filter((r) => r.outcome === 'invited').length,
    alreadyExists: results.filter((r) => r.outcome === 'already_exists').length,
    failed:        results.filter((r) => r.outcome === 'failed').length,
  };

  return NextResponse.json({
    ok: true,
    tenantId,
    tenantCode,
    summary,
    results,
  });
}

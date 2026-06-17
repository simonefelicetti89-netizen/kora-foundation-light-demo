/**
 * B104 — Worker Provisioning Live Foundation
 *
 * Structural tests: file existence, privacy invariants, route contracts, auth model.
 * No live Supabase calls — reads source files only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  try { readFileSync(resolve(root, relPath)); return true; } catch { return false; }
}

// ── 1. File existence ─────────────────────────────────────────────────────────

describe('B104 — file existence', () => {
  it('SQL migration 007 exists', () => {
    expect(fileExists('supabase/migrations/007_worker_provisioning.sql')).toBe(true);
  });

  it('provision API route exists', () => {
    expect(fileExists('app/api/admin/workers/provision/route.ts')).toBe(true);
  });

  it('worker list API route exists', () => {
    expect(fileExists('app/api/admin/workers/list/route.ts')).toBe(true);
  });

  it('company aggregate API route exists', () => {
    expect(fileExists('app/api/company/workers/aggregate/route.ts')).toBe(true);
  });

  it('worker profile API route exists', () => {
    expect(fileExists('app/api/worker/profile/route.ts')).toBe(true);
  });

  it('worker diagnostics API route exists', () => {
    expect(fileExists('app/api/admin/worker-diagnostics/route.ts')).toBe(true);
  });

  it('admin workers page exists', () => {
    expect(fileExists('app/admin/workers/page.tsx')).toBe(true);
  });

  it('worker workspace page exists', () => {
    expect(fileExists('app/worker/workspace/page.tsx')).toBe(true);
  });

  it('worker layout exists', () => {
    expect(fileExists('app/worker/layout.tsx')).toBe(true);
  });

  it('admin worker-diagnostics page exists', () => {
    expect(fileExists('app/admin/worker-diagnostics/page.tsx')).toBe(true);
  });
});

// ── 2. SQL migration — privacy and schema invariants ──────────────────────────

describe('B104 — SQL migration privacy invariants', () => {
  const sql = readFile('supabase/migrations/007_worker_provisioning.sql');

  it('creates personal.worker_identity table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS personal.worker_identity');
  });

  it('creates personal.worker_profile_private table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS personal.worker_profile_private');
  });

  it('enables RLS on worker_identity', () => {
    expect(sql).toContain('ALTER TABLE personal.worker_identity ENABLE ROW LEVEL SECURITY');
  });

  it('enables RLS on worker_profile_private', () => {
    expect(sql).toContain('ALTER TABLE personal.worker_profile_private ENABLE ROW LEVEL SECURITY');
  });

  it('KORA_ADMIN policy exists for worker_identity', () => {
    expect(sql).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });

  it('WORKER can only see own row in worker_identity (auth.uid constraint)', () => {
    expect(sql).toContain('auth_user_id = auth.uid()');
  });

  it('no COMPANY_ADMIN policy on worker_identity', () => {
    expect(sql).not.toContain("'COMPANY_ADMIN'");
    expect(sql).not.toContain("'COMPANY_VIEWER'");
  });

  it('no gov.kip_records table', () => {
    expect(sql).not.toContain('kip_records');
  });

  it('no PIB column in any table', () => {
    const lower = sql.toLowerCase();
    expect(lower).not.toContain('pib_score');
    expect(lower).not.toContain('personal_impact_balance');
  });

  it('status values are restricted to valid enum set', () => {
    expect(sql).toContain("CHECK (status IN ('invited', 'active', 'pending', 'disabled'))");
  });

  it('auth_user_id is UNIQUE in worker_identity', () => {
    expect(sql).toContain('auth_user_id  uuid        NOT NULL UNIQUE');
  });

  it('reloads PostgREST schema cache', () => {
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });
});

// ── 3. kora-session.ts — WORKER role added ────────────────────────────────────

describe('B104 — kora-session WORKER role', () => {
  const session = readFile('lib/auth/kora-session.ts');

  it('defines KoraWorkerUser interface', () => {
    expect(session).toContain('KoraWorkerUser');
  });

  it('WORKER role is typed in KoraWorkerUser', () => {
    expect(session).toContain("koraRole: 'WORKER'");
  });

  it('workerId field exists in KoraWorkerUser', () => {
    expect(session).toContain('workerId: string');
  });

  it('requireWorkerUser function exists', () => {
    expect(session).toContain('requireWorkerUser');
  });

  it('getCurrentWorkerUser function exists', () => {
    expect(session).toContain('getCurrentWorkerUser');
  });

  it('isWorkerUser type guard exists', () => {
    expect(session).toContain('isWorkerUser');
  });

  it('kora_worker_id is read from app_metadata', () => {
    expect(session).toContain('kora_worker_id');
  });

  it('kora_role is read from app_metadata only (no user_metadata access in code)', () => {
    // user_metadata may appear in comments — what must not exist is accessing it in code
    expect(session).not.toContain('user.user_metadata');
    expect(session).not.toContain('appMeta?.user_metadata');
    expect(session).not.toContain('user_metadata?.kora_role');
  });

  it('isKoraAuthError accepts KoraWorkerUser', () => {
    expect(session).toContain('KoraWorkerUser | NextResponse');
  });
});

// ── 4. middleware.ts — WORKER route isolation ─────────────────────────────────

describe('B104 — middleware worker route isolation', () => {
  const mw = readFile('middleware.ts');

  it('WORKER_ALLOWED_PREFIXES defined', () => {
    expect(mw).toContain('WORKER_ALLOWED_PREFIXES');
  });

  it('/worker/ is in WORKER_ALLOWED_PREFIXES', () => {
    expect(mw).toContain("'/worker/'");
  });

  it('WORKER role redirects non-worker paths to /worker/workspace', () => {
    expect(mw).toContain('/worker/workspace');
    expect(mw).toContain("sessionKoraRole === 'WORKER'");
  });

  it('company paths are NOT in WORKER_ALLOWED_PREFIXES', () => {
    const workerSection = mw.split('WORKER_ALLOWED_PREFIXES')[1].split('];')[0];
    expect(workerSection).not.toContain("'/company/'");
    expect(workerSection).not.toContain("'/admin/'");
  });
});

// ── 5. Provision API — role and privacy contract ──────────────────────────────

describe('B104 — provision API route contracts', () => {
  const provision = readFile('app/api/admin/workers/provision/route.ts');

  it('requires KORA_ADMIN', () => {
    expect(provision).toContain('requireKoraAdmin');
  });

  it('invites via Supabase Admin API', () => {
    expect(provision).toContain('inviteUserByEmail');
  });

  it('sets kora_role WORKER in app_metadata', () => {
    expect(provision).toContain("kora_role:      'WORKER'");
  });

  it('sets kora_tenant_id in app_metadata', () => {
    expect(provision).toContain('kora_tenant_id: tenantId');
  });

  it('sets kora_worker_id in app_metadata after identity insert', () => {
    expect(provision).toContain('kora_worker_id: workerId');
  });

  it('inserts into personal.worker_identity via scoped service-key (B168.6)', () => {
    // Post-B168.6: direct from('worker_identity') replaced by insertWorkerIdentity()
    // from worker-provisioning-service-key (field whitelist enforced at that layer).
    expect(provision).toContain('insertWorkerIdentity(');
    expect(provision).toContain("from '@/lib/supabase/worker-provisioning-service-key'");
  });

  it('returns workerId in response', () => {
    expect(provision).toContain('workerId,');
  });

  it('never returns raw email in response beyond acknowledgement', () => {
    // Should only reference email in the confirmation message, not expose it as structured data
    const responseJson = provision.split('return NextResponse.json(').slice(-1)[0];
    expect(responseJson).not.toContain('email:');
  });
});

// ── 6. Company aggregate — privacy contract ───────────────────────────────────

describe('B104 — company workers aggregate privacy', () => {
  const agg = readFile('app/api/company/workers/aggregate/route.ts');

  it('requires company user (not KORA_ADMIN)', () => {
    expect(agg).toContain('requireCompanyUser');
  });

  it('reads tenantId from session, never from query params (B152-B: tenantId enforced in SQL kora.tenant_id())', () => {
    // B152-B: tenantId no longer needs to be an explicit variable in the route —
    // analytics.fn_company_worker_status() reads tenant from kora.tenant_id() (JWT).
    // What matters: route never reads tenantId from request params.
    expect(agg).not.toContain('searchParams.get(');
    expect(agg).toContain('requireCompanyUser');  // session validated
    expect(agg).toContain('getSupabaseServerClient');  // JWT forwarded to DB
  });

  it('returns only aggregate counts', () => {
    expect(agg).toContain('aggregate:');
    expect(agg).toContain('total:');
    expect(agg).toContain('coveragePct:');
  });

  it('never returns individual worker rows or refs in response object', () => {
    // Check the return statement shape — no individual data keys in the response JSON
    const returnBlock = agg.split('return NextResponse.json').slice(-1)[0];
    expect(returnBlock).not.toContain('worker_ref:');
    expect(returnBlock).not.toContain('workerId:');
    expect(returnBlock).not.toContain('auth_user_id:');
    // workers array (individual rows) must not be in return
    expect(returnBlock).not.toContain('workers: all');
    expect(returnBlock).not.toContain('workers: rows');
  });

  it('usa fn_company_worker_status — nessuna lettura diretta da worker_identity (B152-B)', () => {
    // B152-B: company route reads from analytics.fn_company_worker_status() SECURITY DEFINER
    // function instead of querying personal.worker_identity directly.
    expect(agg).toContain('fn_company_worker_status');
    expect(agg).not.toContain("from('worker_identity')");
  });

  it('usa getSupabaseServerClient (B152-B: non più service-role client)', () => {
    // B152-B: company route migrated to server client + company-safe aggregation layer.
    // Service client no longer needed — tenant isolation in SQL via kora.tenant_id().
    expect(agg).toContain('getSupabaseServerClient');
    expect(agg).not.toContain('getSupabaseServiceClient');
  });
});

// ── 7. Worker profile API — own-data-only contract ───────────────────────────

describe('B104 — worker profile API', () => {
  const prof = readFile('app/api/worker/profile/route.ts');

  it('requires WORKER role', () => {
    expect(prof).toContain('requireWorkerUser');
  });

  it('reads worker_identity via PK lookup (B163: auth_user_id filter rimosso — RLS mig 007 lo fa)', () => {
    // B163: .eq('auth_user_id', auth.id) rimosso dal GET perché ridondante con
    // RLS worker_identity_worker_own_select (mig 007, USING auth_user_id = auth.uid()).
    // Rimane .eq('id', auth.workerId) come PK lookup di difesa in profondità.
    expect(prof).toContain('.eq(\'id\', auth.workerId)');
    const stripped = prof.replace(/\/\/[^\n]*/g, '');
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
  });

  it('includes privacy notice in response', () => {
    expect(prof).toContain('privacyNotice');
  });

  it('PATCH can mark onboarding done', () => {
    expect(prof).toContain('onboarding_done');
    expect(prof).toContain('onboardingDone');
  });

  it('PATCH promotes status to active when onboarding done', () => {
    expect(prof).toContain("status: 'active'");
  });
});

// ── 8. Worker workspace — server-side auth ────────────────────────────────────

describe('B104 — worker workspace privacy', () => {
  const workspace = readFile('app/worker/workspace/page.tsx');

  it('calls getCurrentWorkerUser server-side', () => {
    expect(workspace).toContain('getCurrentWorkerUser');
  });

  it('redirects if no worker session', () => {
    expect(workspace).toContain('redirect(');
  });

  it('fetches own identity filtered by workerId AND auth.id', () => {
    expect(workspace).toContain('.eq(\'id\', worker.workerId)');
    expect(workspace).toContain('.eq(\'auth_user_id\', worker.id)');
  });

  it('shows privacy notice', () => {
    expect(workspace).toContain('Il tuo datore di lavoro non può vedere');
  });

  it('does not render PIB score', () => {
    const lower = workspace.toLowerCase();
    expect(lower).not.toContain('pib_score');
    expect(lower).not.toContain('pibscore');
    expect(lower).not.toContain('personal impact balance');
  });

  it('placeholder sections are labeled Prossimamente', () => {
    expect(workspace).toContain('Prossimamente');
  });
});

// ── 9. Admin workers page — server-side gate ──────────────────────────────────

describe('B104 — admin workers page gate', () => {
  const page = readFile('app/admin/workers/page.tsx');

  it('calls getCurrentKoraUser server-side', () => {
    expect(page).toContain('getCurrentKoraUser');
  });

  it('redirects non-admin to login', () => {
    expect(page).toContain("redirect('/admin/login')");
  });

  it('checks for KORA_ADMIN role explicitly', () => {
    expect(page).toContain("koraRole !== 'KORA_ADMIN'");
  });
});

// ── 10. Worker layout — server-side gate ──────────────────────────────────────

describe('B104 — worker layout server gate', () => {
  const layout = readFile('app/worker/layout.tsx');

  it('calls getCurrentWorkerUser', () => {
    expect(layout).toContain('getCurrentWorkerUser');
  });

  it('redirects if no worker session', () => {
    expect(layout).toContain('redirect(');
  });
});

// ── 11. Admin page — B104 links added ────────────────────────────────────────

describe('B104 — admin page navigation', () => {
  const admin = readFile('app/admin/page.tsx');

  it('links to Worker Provisioning page', () => {
    expect(admin).toContain('/admin/workers');
  });

  it('links to Worker Diagnostics page', () => {
    expect(admin).toContain('/admin/worker-diagnostics');
  });
});

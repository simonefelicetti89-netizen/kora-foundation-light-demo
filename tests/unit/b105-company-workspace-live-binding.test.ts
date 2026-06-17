/**
 * B105 — Company Tenant Workspace Live Binding
 *
 * Verifica che il workspace company sia realmente tenant-bound e non demo.
 * Legge file sorgente — nessuna chiamata live a Supabase.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. API workspace — nomi tabelle corretti ──────────────────────────────────

describe('B105 — API company/workspace table names', () => {
  const api = readFile('app/api/company/workspace/route.ts');

  it('uses kora_index_result (not scoring_result)', () => {
    expect(api).toContain("from('kora_index_result')");
    expect(api).not.toContain("from('scoring_result')");
  });

  it('uses decision_pack_version (not decision_pack)', () => {
    expect(api).toContain("from('decision_pack_version')");
    expect(api).not.toContain("from('decision_pack')");
  });

  it('returns tenant_code in response', () => {
    expect(api).toContain('tenantCode');
    expect(api).toContain('t.tenant_code as string');
  });

  it('returns reporting_period in kora index summary', () => {
    const kiBlock = api.split('koraIndexSummary')[1].split('} : null')[0];
    expect(kiBlock).toContain('reportingPeriod');
  });

  it('returns previewUrl for decision pack (company-facing endpoint)', () => {
    expect(api).toContain('previewUrl');
    expect(api).toContain('/api/company/decision-pack');
  });

  it('never exposes admin decision-pack routes', () => {
    expect(api).not.toContain('/api/admin/decision-pack');
    expect(api).not.toContain('/admin/decision-pack');
  });
});

// ── 2. API workspace — auth and tenant isolation ──────────────────────────────

describe('B105 — API workspace auth invariants', () => {
  const api = readFile('app/api/company/workspace/route.ts');

  it('requires company user auth', () => {
    expect(api).toContain('requireCompanyUser');
    expect(api).toContain('isKoraAuthError');
  });

  it('derives tenantId from session only (never query params)', () => {
    expect(api).toContain('const { tenantId, koraRole } = authResult;');
    expect(api).not.toContain('searchParams.get(');
    expect(api).not.toContain('request.body');
  });

  it('never returns individual worker data in response', () => {
    // Check the return JSON structure — not comments
    const returnBlock = api.split('return NextResponse.json(').slice(-1)[0];
    expect(returnBlock).not.toContain('pseudonym_id:');
    expect(returnBlock).not.toContain('pib_score:');
    expect(returnBlock).not.toContain('worker_ref:');
    expect(returnBlock).not.toContain('auth_user_id:');
  });

  it('never returns OP-001 as valid tenant', () => {
    expect(api).not.toContain("'OP-001'");
  });

  it('never falls back to demo/synthetic data', () => {
    const lower = api.toLowerCase();
    expect(lower).not.toContain('meridiana');
    expect(lower).not.toContain('synthetic_demo_data');
    expect(lower).not.toContain('fl_company_id');
  });
});

// ── 3. CompanyWorkspaceView — company name prominente ─────────────────────────

describe('B105 — CompanyWorkspaceView company name prominence', () => {
  const view = readFile('app/company/workspace/_components/CompanyWorkspaceView.tsx');

  it('shows company name in H1 dynamically', () => {
    expect(view).toContain('tenant.companyName');
    // H1 must contain the dynamic company name, not hardcoded text
    const h1Block = view.split('<h1')[1]?.split('</h1>')[0] ?? '';
    expect(h1Block).toContain('companyName');
  });

  it('shows tenantCode in header', () => {
    expect(view).toContain('tenant.tenantCode');
  });

  it('header says KORA Workspace Aziendale (not generic)', () => {
    expect(view).toContain('KORA · Workspace Aziendale');
  });
});

// ── 4. CompanyWorkspaceView — no demo company ID ──────────────────────────────

describe('B105 — CompanyWorkspaceView no demo fallback', () => {
  const view = readFile('app/company/workspace/_components/CompanyWorkspaceView.tsx');

  it('does not use FL_COMPANY_ID or meridiana hardcoded', () => {
    expect(view).not.toContain('FL_COMPANY_ID');
    expect(view).not.toContain('meridiana-group');
    expect(view).not.toContain('meridiana');
  });

  it('does not import WorkerAdoptionPanel (demo-only)', () => {
    // Must not have a live import of the demo component (comment references are ok)
    expect(view).not.toContain("import { WorkerAdoptionPanel }");
    expect(view).not.toContain('<WorkerAdoptionPanel');
  });

  it('does not import SubmissionTransparencyCompact (demo-only)', () => {
    expect(view).not.toContain('SubmissionTransparencyCompact');
  });

  it('does not import submissionFeedbackService (demo-only)', () => {
    expect(view).not.toContain('submissionFeedbackService');
  });
});

// ── 5. CompanyWorkspaceView — Decision Pack link ──────────────────────────────

describe('B105 — CompanyWorkspaceView Decision Pack link', () => {
  const view = readFile('app/company/workspace/_components/CompanyWorkspaceView.tsx');

  it('shows direct link to Decision Pack when available', () => {
    expect(view).toContain('dp.previewUrl');
    expect(view).toContain('Apri Decision Pack');
  });

  it('Decision Pack link uses company-facing endpoint', () => {
    // The link target comes from dp.previewUrl which is /api/company/decision-pack
    // (never /api/admin/decision-pack)
    expect(view).not.toContain('/api/admin/decision-pack');
  });

  it('shows honest empty state when no Decision Pack', () => {
    expect(view).toContain('Nessun Decision Pack disponibile');
  });
});

// ── 6. Workspace layout — server-side auth gate ───────────────────────────────

describe('B105 — workspace layout server auth gate', () => {
  const layout = readFile('app/company/workspace/layout.tsx');

  it('calls requireCompanyUser server-side', () => {
    expect(layout).toContain('requireCompanyUser');
  });

  it('ammette KORA_ADMIN nel workspace con passthrough (B168-P3: root layout gestisce auth+banner)', () => {
    // B168-P3: il sub-layout workspace ammette KORA_ADMIN con passthrough.
    // L'autenticazione + banner è nel root layout app/company/layout.tsx.
    expect(layout).toContain('KORA_ADMIN');
    expect(layout).not.toContain('Questo workspace richiede una sessione azienda');
  });

  it('shows error for unauthenticated (401)', () => {
    expect(layout).toContain('is401');
    expect(layout).toContain('401');
  });
});

// ── 7. Auth callback → setup-password → workspace chain ──────────────────────

describe('B105 — auth flow chain', () => {
  const callback = readFile('app/auth/callback/route.ts');
  const form     = readFile('app/company/setup-password/_form.tsx');

  it('auth callback redirects to setup-password', () => {
    expect(callback).toContain('/company/setup-password');
  });

  it('setup-password redirects to /company/workspace on success', () => {
    expect(form).toContain('/company/workspace');
    expect(form).toContain("router.push('/company/workspace')");
  });

  it('callback does not redirect to OP-001 or demo page', () => {
    expect(callback).not.toContain('OP-001');
    expect(callback).not.toContain('/company?demo');
  });
});

// ── 8. Middleware — COMPANY_ADMIN confined to company paths ───────────────────

describe('B105 — middleware company route confinement', () => {
  const mw = readFile('middleware.ts');

  it('COMPANY_ADMIN redirected to /company/workspace if outside allowed paths', () => {
    expect(mw).toContain('/company/workspace');
    expect(mw).toContain("sessionKoraRole === 'COMPANY_ADMIN'");
  });

  it('COMPANY_ALLOWED_PREFIXES includes workspace', () => {
    const section = mw.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(section).toContain("'/company/workspace'");
  });

  it('middleware does not redirect /api/ paths (company APIs need to be reachable)', () => {
    const section = mw.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(section).toContain("'/api/'");
  });
});

// ── 9. Company decision-pack API — tenant isolation ───────────────────────────

describe('B105 — company decision-pack API tenant isolation', () => {
  const dp = readFile('app/api/company/decision-pack/route.ts');

  it('requires company user auth', () => {
    expect(dp).toContain('requireCompanyUser');
  });

  it('derives tenantCode from session tenantId (never URL params)', () => {
    expect(dp).toContain('const { tenantId } = authResult;');
    // tenantCode must be derived from DB lookup on tenantId, not from request params
    expect(dp).toContain('.eq(\'id\', tenantId)');
    expect(dp).not.toContain('searchParams.get(\'tenantCode\')');
  });

  it('checks Decision Pack status before serving', () => {
    expect(dp).toContain("dpStatus !== 'ready'");
    expect(dp).toContain("dpStatus !== 'exported'");
  });
});

// ── 10. Company workspace page — server component ─────────────────────────────

describe('B105 — company workspace page server component', () => {
  const page = readFile('app/company/workspace/page.tsx');

  it('calls requireCompanyUser server-side', () => {
    expect(page).toContain('requireCompanyUser');
  });

  it('renders CompanyWorkspaceView (not demo cockpit)', () => {
    expect(page).toContain('CompanyWorkspaceView');
  });

  it('passes userEmail and userRole to view', () => {
    expect(page).toContain('userEmail={authResult.email}');
    expect(page).toContain('userRole={authResult.koraRole}');
  });
});

// ── 11. No synthetic demo data in live workspace path ─────────────────────────

describe('B105 — live workspace free from demo contamination', () => {
  const view = readFile('app/company/workspace/_components/CompanyWorkspaceView.tsx');
  const api  = readFile('app/api/company/workspace/route.ts');
  const page = readFile('app/company/workspace/page.tsx');

  it('workspace page imports nothing from synthetic demo services', () => {
    // Check actual import statements and JSX usage — not comments
    [view, page].forEach(src => {
      const imports = src.split('\n').filter(l => l.trim().startsWith('import ')).join('\n');
      expect(imports).not.toContain('demo-state');
      expect(imports).not.toContain('DemoData');
      expect(imports).not.toContain('synthetic');
    });
  });

  it('API never queries OP-001 synthetic tenant', () => {
    expect(api).not.toContain("'OP-001'");
    expect(api).not.toContain("OP001");
  });

  it('view shows KORA Workspace Aziendale as section context label', () => {
    expect(view).toContain('Workspace Aziendale');
  });
});

// ── 12. B145 — session client pilot: RLS is the primary tenant wall ───────────

describe('B145 — workspace pilot: getSupabaseServerClient replaces service client', () => {
  const api = readFile('app/api/company/workspace/route.ts');

  it('imports getSupabaseServerClient (session client — respects RLS)', () => {
    expect(api).toContain('getSupabaseServerClient');
  });

  it('does NOT import getSupabaseServiceClient (service client — bypasses RLS)', () => {
    expect(api).not.toContain('getSupabaseServiceClient');
  });

  it('awaits getSupabaseServerClient (async function)', () => {
    expect(api).toContain('await getSupabaseServerClient()');
  });

  it('retains .eq(id, tenantId) on analytics.tenant as defense-in-depth', () => {
    expect(api).toContain(".eq('id', tenantId)");
  });

  it('retains .eq(tenant_id, tenantId) on remaining tables as defense-in-depth', () => {
    expect(api).toContain(".eq('tenant_id', tenantId)");
  });

  it('cross-tenant boundary: two independent barriers prevent tenant A reading tenant B data', () => {
    // Barrier 1 — RLS via session client: policy company_own_*_read enforces
    //   tenant_id = kora.tenant_id() from JWT. Rows for tenant B are invisible
    //   to a session token for tenant A at the database level (migration 001+006).
    expect(api).toContain('getSupabaseServerClient');
    expect(api).not.toContain('getSupabaseServiceClient');

    // Barrier 2 — application filter: .eq(tenant_id) is redundant but provides
    //   defense-in-depth. Even if RLS were absent, the query filter blocks cross-tenant reads.
    expect(api).toContain(".eq('tenant_id', tenantId)");

    // Tenant ID is always from session — no spoofing vector via request params.
    expect(api).not.toContain("searchParams.get('tenantId')");
    expect(api).not.toContain("searchParams.get('tenant')");
  });
});

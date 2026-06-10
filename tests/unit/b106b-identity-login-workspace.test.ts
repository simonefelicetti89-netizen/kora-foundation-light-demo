/**
 * B106-B — Identity, Login & Dedicated Workspace
 *
 * Verifica che ogni ruolo KORA entri nella propria area dedicata,
 * con login corretto, dati corretti, senza demo confusion.
 * Legge file sorgente — nessuna chiamata live a Supabase.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

// ── 1. Auth session helpers — metadata canonici ────────────────────────────────

describe('B106-B — kora-session: auth metadata canonici', () => {
  const session = read('lib/auth/kora-session.ts');

  it('kora_role letto solo da app_metadata', () => {
    expect(session).toContain('app_metadata');
    expect(session).not.toContain('user_metadata?.kora_role');
    expect(session).not.toContain('user.user_metadata');
  });

  it('requireKoraAdmin blocca non-KORA_ADMIN con 403', () => {
    expect(session).toContain("koraRole !== 'KORA_ADMIN'");
    expect(session).toContain('status: 403');
  });

  it('requireCompanyUser verifica kora_tenant_id', () => {
    expect(session).toContain('kora_tenant_id');
    expect(session).toContain("no tenant assigned to this user");
  });

  it('requireCompanyUser verifica kora_status (suspended/disabled)', () => {
    expect(session).toContain("userStatus === 'suspended'");
    expect(session).toContain("userStatus === 'disabled'");
  });

  it('requireWorkerUser verifica kora_worker_id', () => {
    expect(session).toContain('kora_worker_id');
    expect(session).toContain("no worker identity assigned");
  });

  it('requireWorkerUser blocca worker disabled', () => {
    expect(session).toContain("workerStatus === 'disabled'");
  });

  it('getTenantFromSession mai da query params', () => {
    expect(session).toContain('getTenantFromSession');
    expect(session).not.toContain('searchParams');
  });

  it('isKoraAuthError type guard accetta tutti i ruoli', () => {
    expect(session).toContain('KoraUser | KoraCompanyUser | KoraWorkerUser | NextResponse');
  });
});

// ── 2. Middleware — role routing matrix ─────────────────────────────────────────

describe('B106-B — middleware: role routing matrix', () => {
  const mw = read('middleware.ts');

  it('COMPANY_ADMIN/VIEWER ridiretti a /company/workspace se fuori allowed paths', () => {
    expect(mw).toContain('/company/workspace');
    expect(mw).toContain("sessionKoraRole === 'COMPANY_ADMIN' || sessionKoraRole === 'COMPANY_VIEWER'");
  });

  it('COMPANY_ALLOWED_PREFIXES include /company/login', () => {
    const section = mw.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(section).toContain("'/company/login'");
  });

  it('COMPANY_ALLOWED_PREFIXES include /company/status', () => {
    const section = mw.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(section).toContain("'/company/status'");
  });

  it('COMPANY_ALLOWED_PREFIXES NON include /admin/login (company non ha accesso a admin)', () => {
    const section = mw.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(section).not.toContain("'/admin/login'");
  });

  it('WORKER ridiretto a /worker/workspace se fuori allowed paths', () => {
    expect(mw).toContain('/worker/workspace');
    expect(mw).toContain("sessionKoraRole === 'WORKER'");
  });

  it('WORKER_ALLOWED_PREFIXES include /worker/', () => {
    const section = mw.split('WORKER_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(section).toContain("'/worker/'");
  });

  it('WORKER_ALLOWED_PREFIXES include /worker/ (covers /worker/login re-auth)', () => {
    const section = mw.split('WORKER_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(section).toContain("'/worker/'");
    // B113-B: /worker/login is the dedicated worker re-auth — /company/login removed from worker prefixes
    expect(section).not.toContain("'/company/login'");
  });

  it('WORKER_ALLOWED_PREFIXES NON include /company/ genericamente', () => {
    const section = mw.split('WORKER_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(section).not.toContain("'/company/w'");
    expect(section).not.toContain("'/company/k'");
    expect(section).not.toContain("'/company/'");
  });

  it('middleware non restringe KORA_ADMIN (gestito da admin layout)', () => {
    expect(mw).not.toContain("sessionKoraRole === 'KORA_ADMIN'");
  });
});

// ── 3. Admin area — KORA_ADMIN dedicated ───────────────────────────────────────

describe('B106-B — admin area: riservata a KORA_ADMIN', () => {
  const adminLayout = read('app/admin/layout.tsx');
  const adminLogin  = read('app/admin/login/page.tsx');

  it('admin layout richiede requireKoraAdmin()', () => {
    expect(adminLayout).toContain('requireKoraAdmin');
  });

  it('admin layout mostra errore per non-KORA_ADMIN', () => {
    expect(adminLayout).toContain('isKoraAuthError');
    expect(adminLayout).toContain('riservata agli operatori KORA Admin');
  });

  it('admin layout (B117-B) include link a /login?role_hint=admin per il caso 403', () => {
    // B117-B: 401 redirects to /login, 403 shows error card with link to /login?role_hint=admin
    expect(adminLayout).toContain('/login?role_hint=admin');
  });

  it('admin login (B117-B) è redirect wrapper — redirect a /admin se sessione ok', () => {
    // B117-B: /admin/login is a redirect wrapper.
    // Unauthenticated → admin layout redirects to /login?role_hint=admin (page never renders).
    // Authenticated KORA_ADMIN → page redirects to /admin.
    expect(adminLogin).toContain("redirect('/admin')");
    expect(adminLogin).not.toContain('signInWithPassword');
  });

  it('admin login non contiene form standalone (logica spostata in /login)', () => {
    expect(adminLogin).not.toContain('useState');
    expect(adminLogin).not.toContain('signOut');
  });

  it('admin layout (B117-B) redirige unauthenticated a /login?role_hint=admin', () => {
    expect(adminLayout).toContain("redirect('/login?role_hint=admin')");
  });
});

// ── 4. Company login page — B117: redirect wrapper ────────────────────────────
// B117 replaced /company/login with a redirect to the unified /login page.
// The role-checking logic previously in /company/login is now in /login + getRoleHome().

describe('B106-B — /company/login: B117 redirect wrapper to /login', () => {
  it('file esiste', () => {
    expect(exists('app/company/login/page.tsx')).toBe(true);
  });

  const login = read('app/company/login/page.tsx');

  it('page redirects to unified /login with role_hint=company (B117-B)', () => {
    expect(login).toContain("redirect('/login?role_hint=company')");
  });

  it('page is not a standalone form (no signInWithPassword)', () => {
    expect(login).not.toContain('signInWithPassword');
  });

  it('page has no form state (no useState)', () => {
    expect(login).not.toContain('useState');
  });
});

// ── 5. Auth callback — role-aware redirect ─────────────────────────────────────

describe('B106-B — /auth/callback: redirect in base al ruolo', () => {
  const callback = read('app/auth/callback/route.ts');

  it('WORKER ridiretto a /worker/setup-password', () => {
    expect(callback).toContain('/worker/setup-password');
    expect(callback).toContain("koraRole === 'WORKER'");
  });

  it('default (COMPANY) ridiretto a /company/setup-password', () => {
    expect(callback).toContain('/company/setup-password');
  });

  it('kora_role letto da app_metadata dopo code exchange', () => {
    expect(callback).toContain('app_metadata');
    expect(callback).toContain('kora_role');
  });

  it('non ridirige mai a /admin/login dopo code exchange riuscito', () => {
    // Il redirect di errore va a /admin/login?error=missing_auth_code solo per mancanza codice
    // Ma il redirect di successo non deve mai andare ad admin
    const successBlock = callback.split('exchangeCodeForSession')[1]?.split('return')[0] ?? '';
    // Dopo exchange riuscito, legge il ruolo e redirige a /company/setup-password o /worker/setup-password
    expect(successBlock).not.toContain('/admin/login');
  });
});

// ── 6. Company workspace — dedicated e tenant-bound ───────────────────────────

describe('B106-B — /company/workspace: workspace dedicato tenant-bound', () => {
  const layout = read('app/company/workspace/layout.tsx');
  const page   = read('app/company/workspace/page.tsx');
  const view   = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');

  it('workspace layout richiede requireCompanyUser()', () => {
    expect(layout).toContain('requireCompanyUser');
  });

  it('workspace layout mostra errore specifico per KORA_ADMIN', () => {
    expect(layout).toContain('KORA_ADMIN');
    expect(layout).toContain('Questo workspace richiede una sessione azienda');
  });

  it('workspace layout link Accedi → /company/login (non /admin/login)', () => {
    expect(layout).toContain('/company/login');
    expect(layout).not.toContain('href="/admin/login"');
  });

  it('workspace page chiama requireCompanyUser()', () => {
    expect(page).toContain('requireCompanyUser');
  });

  it('workspace view mostra nome azienda reale (non hardcoded)', () => {
    expect(view).toContain('tenant.companyName');
  });

  it('workspace view mostra tenantCode reale', () => {
    expect(view).toContain('tenant.tenantCode');
  });

  it('workspace view non contiene meridiana-group o FL_COMPANY_ID', () => {
    expect(view).not.toContain('meridiana-group');
    expect(view).not.toContain('FL_COMPANY_ID');
  });

  it('workspace view non importa synthetic demo services', () => {
    const imports = view.split('\n').filter((l) => l.trim().startsWith('import ')).join('\n');
    expect(imports).not.toContain('demo-state');
    expect(imports).not.toContain('DemoData');
    expect(imports).not.toContain('synthetic');
  });
});

// ── 7. Worker workspace — privato e isolato ────────────────────────────────────

describe('B106-B — /worker/workspace: spazio privato worker', () => {
  const layout    = read('app/worker/layout.tsx');
  const workspace = read('app/worker/workspace/page.tsx');

  it('worker layout richiede getCurrentWorkerUser()', () => {
    expect(layout).toContain('getCurrentWorkerUser');
  });

  it('worker layout (B117-B) ridirige unauthenticated a /login (non /worker/login)', () => {
    // B117-B: layout redirect target changed from /worker/login to /login to break loop
    expect(layout).toContain("redirect('/login')");
    expect(layout).not.toContain("redirect('/worker/login')");
    expect(layout).not.toContain("redirect('/admin/login')");
    expect(layout).not.toContain("redirect('/company/login')");
  });

  it('worker workspace page (B117-B) ridirige a /login (non /worker/login)', () => {
    // B117-B: pages under worker layout now redirect to /login for consistency
    expect(workspace).toContain("redirect('/login')");
    expect(workspace).not.toContain("redirect('/worker/login')");
    expect(workspace).not.toContain("redirect('/admin/login')");
    expect(workspace).not.toContain("redirect('/company/login')");
  });

  it('worker workspace chiama getCurrentWorkerUser()', () => {
    expect(workspace).toContain('getCurrentWorkerUser');
  });

  it('worker workspace mostra privacy notice', () => {
    expect(workspace).toContain('Il tuo datore di lavoro non può vedere');
  });

  it('worker workspace non mostra PIB score', () => {
    const lower = workspace.toLowerCase();
    expect(lower).not.toContain('pib_score');
    expect(lower).not.toContain('personal impact balance');
  });
});

// ── 8. Worker setup-password — flusso invite worker ───────────────────────────

describe('B106-B — /worker/setup-password: password setup per worker', () => {
  it('file _form.tsx esiste', () => {
    expect(exists('app/worker/setup-password/_form.tsx')).toBe(true);
  });

  it('file page.tsx esiste', () => {
    expect(exists('app/worker/setup-password/page.tsx')).toBe(true);
  });

  const form = read('app/worker/setup-password/_form.tsx');

  it('form redirige a /worker/workspace dopo password set', () => {
    expect(form).toContain('/worker/workspace');
  });

  it('form non redirige a /company/workspace', () => {
    expect(form).not.toContain('/company/workspace');
  });

  it('form usa design system KORA (TOKENS)', () => {
    expect(form).toContain('TOKENS');
    expect(form).toContain('kora-design-tokens');
  });

  it('form gestisce link scaduto (urlError)', () => {
    expect(form).toContain('urlError');
    expect(form).toContain('Link non valido o scaduto');
  });
});

// ── 9. Company setup-password — design system KORA ────────────────────────────

describe('B106-B — /company/setup-password: design system KORA', () => {
  const form = read('app/company/setup-password/_form.tsx');

  it('usa design system KORA (TOKENS)', () => {
    expect(form).toContain('TOKENS');
    expect(form).toContain('kora-design-tokens');
  });

  it('redirige a /company/workspace dopo password set', () => {
    expect(form).toContain('/company/workspace');
  });

  it('gestisce link scaduto', () => {
    expect(form).toContain('urlError');
    expect(form).toContain('Link non valido o scaduto');
  });
});

// ── 10. API routes — company live, tenant da sessione ─────────────────────────

describe('B106-B — API company: tenant dalla sessione, mai da client', () => {
  it('/api/company/workspace usa requireCompanyUser, tenant da sessione', () => {
    const api = read('app/api/company/workspace/route.ts');
    expect(api).toContain('requireCompanyUser');
    expect(api).toContain('const { tenantId, koraRole } = authResult;');
    expect(api).not.toContain('searchParams.get(');
  });

  it('/api/company/workers/aggregate usa requireCompanyUser, tenant da sessione', () => {
    const api = read('app/api/company/workers/aggregate/route.ts');
    expect(api).toContain('requireCompanyUser');
    expect(api).toContain('const { tenantId } = auth;');
  });

  it('/api/worker/profile usa requireWorkerUser', () => {
    const api = read('app/api/worker/profile/route.ts');
    expect(api).toContain('requireWorkerUser');
  });

  it('/api/admin/companies/provision usa requireKoraAdmin', () => {
    const api = read('app/api/admin/companies/provision/route.ts');
    expect(api).toContain('requireKoraAdmin');
  });
});

// ── 11. Admin routes — KORA_ADMIN gate ─────────────────────────────────────────

describe('B106-B — admin routes: richiedono requireKoraAdmin', () => {
  const adminRoutes = [
    'app/api/admin/tenants/route.ts',
    'app/api/admin/workers/provision/route.ts',
    'app/api/admin/workers/list/route.ts',
    'app/api/admin/worker-diagnostics/route.ts',
    'app/api/admin/company-users/route.ts',
  ];

  for (const rel of adminRoutes) {
    it(`${rel} usa requireKoraAdmin`, () => {
      const src = read(rel);
      expect(src).toContain('requireKoraAdmin');
    });
  }
});

// ── 12. Role isolation — nessuna contaminazione cross-role ─────────────────────

describe('B106-B — role isolation invariants', () => {
  it('worker layout non importa company services', () => {
    const layout = read('app/worker/layout.tsx');
    expect(layout).not.toContain('requireCompanyUser');
    expect(layout).not.toContain('companySession');
  });

  it('company workspace layout non importa worker data', () => {
    const layout = read('app/company/workspace/layout.tsx');
    expect(layout).not.toContain('requireWorkerUser');
    expect(layout).not.toContain('worker_identity');
  });

  it('admin layout non leakka dati company o worker', () => {
    const layout = read('app/admin/layout.tsx');
    expect(layout).not.toContain('requireCompanyUser');
    expect(layout).not.toContain('requireWorkerUser');
  });

  it('company/workspace view non importa workers.json (dati privati worker)', () => {
    const view = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(view).not.toContain('workers.json');
    expect(view).not.toContain('pib-records');
    expect(view).not.toContain('worker_id:');
  });
});

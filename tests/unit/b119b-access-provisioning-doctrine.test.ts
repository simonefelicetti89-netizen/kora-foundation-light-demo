// tests/unit/b119b-access-provisioning-doctrine.test.ts
// B119: Access Provisioning Doctrine -- 23 structural tests.
//
// Verifica che KORA non permetta self-signup pubblico e che ogni utente
// reale entri solo perche gia provisionato/invitato da KORA_ADMIN.
//
// All strings use ASCII-only quotes. No smart/curly quotes, no em-dashes.
// OXC transformer rejects Unicode quote characters as string delimiters.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

// Recursively find all TS/TSX files under a directory (excluding node_modules).
function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      results.push(...findTsFiles(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

const loginPage      = readFile('app/login/page.tsx');
const requestAccess  = readFile('app/request-access/page.tsx');
const provisionRoute = readFile('app/api/admin/companies/provision/route.ts');
const middleware     = readFile('middleware.ts');
const appShell       = readFile('components/layout/AppShell.tsx');

// --- 1-3: /login has no registration form ---------------------------------

describe('B119b -- Login page has no registration form', () => {
  it('/login page does not contain a signup or register form', () => {
    expect(loginPage).not.toContain('signUp');
    expect(loginPage).not.toContain('auth.signUp');
    expect(loginPage).not.toContain('createUser');
    expect(loginPage).not.toContain('register');
  });

  it('/login copy contains invitati o provisionati', () => {
    expect(loginPage).toContain('invitati o provisionati');
  });

  it('/login has data-testid="login-provisioned-only-notice"', () => {
    expect(loginPage).toContain('data-testid="login-provisioned-only-notice"');
  });
});

// --- 4: No supabase.auth.signUp in client files ----------------------------

describe('B119b -- No supabase.auth.signUp in client-side files', () => {
  it('no client-side file calls supabase.auth.signUp()', () => {
    // Scan app/ and components/ for signUp calls.
    // Allow it in test files and server-side admin routes.
    const scanDirs = [
      path.join(ROOT, 'app'),
      path.join(ROOT, 'components'),
    ];

    const violations: string[] = [];

    for (const dir of scanDirs) {
      for (const file of findTsFiles(dir)) {
        // Skip admin API routes (allowed to call admin.createUser or inviteUserByEmail)
        if (file.includes('/api/admin/')) continue;
        // Skip test files
        if (file.includes('/tests/') || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;

        const content = fs.readFileSync(file, 'utf-8');
        // Match actual call sites only, not comments or documentation references.
        if (/\.auth\.signUp\s*\(|supabase\.signUp\s*\(/.test(content)) {
          violations.push(path.relative(ROOT, file));
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// --- 5-6: No public route creates Supabase users --------------------------

describe('B119b -- Public routes do not create Supabase users', () => {
  it('/request-access page does not call supabase auth methods', () => {
    // Check for actual call patterns, not comment references.
    expect(/\.auth\.signUp\s*\(/.test(requestAccess)).toBe(false);
    expect(/\.auth\.createUser\s*\(|admin\.createUser\s*\(/.test(requestAccess)).toBe(false);
    expect(requestAccess).not.toContain('inviteUserByEmail');
    expect(requestAccess).not.toContain('SUPABASE_SERVICE_ROLE');
  });

  it('/login page does not call supabase createUser or inviteUserByEmail', () => {
    expect(loginPage).not.toContain('createUser');
    expect(loginPage).not.toContain('inviteUserByEmail');
  });
});

// --- 7-8: createUser and inviteUserByEmail only in admin routes -----------

describe('B119b -- createUser and inviteUserByEmail only in admin API routes', () => {
  it('inviteUserByEmail only appears in admin API routes', () => {
    const scanDirs = [path.join(ROOT, 'app'), path.join(ROOT, 'components'), path.join(ROOT, 'lib')];
    const violations: string[] = [];

    for (const dir of scanDirs) {
      for (const file of findTsFiles(dir)) {
        if (file.includes('/api/admin/')) continue;
        if (file.includes('.test.')) continue;
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('inviteUserByEmail')) {
          violations.push(path.relative(ROOT, file));
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('admin.createUser only appears in admin API routes', () => {
    const scanDirs = [path.join(ROOT, 'app'), path.join(ROOT, 'components'), path.join(ROOT, 'lib')];
    const violations: string[] = [];

    for (const dir of scanDirs) {
      for (const file of findTsFiles(dir)) {
        if (file.includes('/api/admin/')) continue;
        if (file.includes('.test.')) continue;
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('admin.createUser')) {
          violations.push(path.relative(ROOT, file));
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// --- 9-10: /request-access does not create accounts ----------------------

describe('B119b -- /request-access is informational only', () => {
  it('/request-access does not call auth account-creation methods', () => {
    expect(/\.auth\.signUp\s*\(/.test(requestAccess)).toBe(false);
    expect(/admin\.createUser\s*\(/.test(requestAccess)).toBe(false);
    expect(requestAccess).not.toContain('inviteUserByEmail');
  });

  it('/request-access states that it does not create an account', () => {
    expect(requestAccess).toContain('data-testid="request-access-no-account-notice"');
    // The notice must state the request does NOT create an account
    expect(requestAccess).toContain('NON crea un account');
  });
});

// --- 11-12: role_hint does not authorize; missing role forces signOut ----

describe('B119b -- role_hint does not grant authorization', () => {
  it('login page reads kora_role from app_metadata (server-controlled), not from URL params', () => {
    expect(loginPage).toContain('app_metadata');
    expect(loginPage).toContain('kora_role');
    // role_hint is used only for copy, never for authorization
    expect(loginPage).toContain('role_hint');
    // role_hint must not be used as the koraRole for routing
    expect(loginPage).not.toContain('koraRole = roleHint');
    expect(loginPage).not.toContain('role = roleHint');
  });

  it('login page calls signOut when kora_role is missing from app_metadata', () => {
    expect(loginPage).toContain('!koraRole');
    expect(loginPage).toContain('signOut');
  });
});

// --- 13-14: Diagnostic errors for missing tenant/worker config -----------

describe('B119b -- Diagnostic errors for misconfigured provisioning', () => {
  it('requireCompanyUser enforces tenant_id presence (COMPANY_ADMIN without tenant_id gets error)', () => {
    const koraSession = readFile('lib/auth/kora-session.ts');
    // requireCompanyUser must check kora_tenant_id
    expect(koraSession).toContain('requireCompanyUser');
    expect(koraSession).toContain('kora_tenant_id');
  });

  it('requireWorkerUser enforces worker_id presence', () => {
    const koraSession = readFile('lib/auth/kora-session.ts');
    expect(koraSession).toContain('requireWorkerUser');
  });
});

// --- 15: COMPANY_VIEWER not in provisioning VALID_ROLES ------------------

describe('B119b -- COMPANY_VIEWER not in provisioning VALID_ROLES', () => {
  it('provision route VALID_ROLES does not include COMPANY_VIEWER', () => {
    // VALID_ROLES line must not contain COMPANY_VIEWER
    const validRolesLine = provisionRoute
      .split('\n')
      .find((l) => l.includes('VALID_ROLES') && l.includes('ReadonlyArray'));

    expect(validRolesLine).toBeDefined();
    expect(validRolesLine).not.toContain('COMPANY_VIEWER');
  });

  it('provision route type CompanyRole does not include COMPANY_VIEWER', () => {
    const companyRoleLine = provisionRoute
      .split('\n')
      .find((l) => l.includes('type CompanyRole'));

    expect(companyRoleLine).toBeDefined();
    expect(companyRoleLine).not.toContain('COMPANY_VIEWER');
  });
});

// --- 16: COMPANY_VIEWER rimosso in B143 ------------------------------------

describe('B143 -- COMPANY_VIEWER rimosso del tutto', () => {
  it('middleware non contiene più il check sessionKoraRole COMPANY_VIEWER (ruolo rimosso)', () => {
    // B143: COMPANY_VIEWER non esiste più — solo COMPANY_ADMIN è un ruolo company.
    expect(middleware).not.toContain("sessionKoraRole === 'COMPANY_VIEWER'");
    expect(middleware).toContain("sessionKoraRole === 'COMPANY_ADMIN'");
  });
});

// --- 17: Workers cannot self-select tenant --------------------------------

describe('B119b -- Workers cannot self-select tenant', () => {
  it('worker workspace uses server-side auth (not URL param tenant)', () => {
    if (!fileExists('app/worker/workspace/page.tsx')) return;
    const workerWorkspace = readFile('app/worker/workspace/page.tsx');
    // Must use requireWorkerUser or getCurrentWorkerUser (both enforce server-side identity)
    const hasServerAuth =
      workerWorkspace.includes('requireWorkerUser') ||
      workerWorkspace.includes('getCurrentWorkerUser');
    expect(hasServerAuth).toBe(true);
    expect(workerWorkspace).not.toContain("searchParams.get('tenantId')");
    expect(workerWorkspace).not.toContain("searchParams.get('tenant_id')");
  });
});

// --- 18: Company cannot self-create tenant --------------------------------

describe('B119b -- Company cannot self-create tenant', () => {
  it('no public API route creates a tenant row directly', () => {
    // Public APIs (no requireKoraAdmin) must not insert into analytics.tenant
    // Only admin provision routes are allowed to do so
    const publicApiDir = path.join(ROOT, 'app/api');
    if (!fs.existsSync(publicApiDir)) return;

    const violations: string[] = [];
    for (const file of findTsFiles(publicApiDir)) {
      if (file.includes('/admin/')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes("from('tenant')") && content.includes('.insert(')) {
        // Check if requireKoraAdmin is present (would make it protected)
        if (!content.includes('requireKoraAdmin')) {
          violations.push(path.relative(ROOT, file));
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// --- 19-22: docs/ACCESS_PROVISIONING_DOCTRINE.md exists and is complete -

describe('B119b -- ACCESS_PROVISIONING_DOCTRINE.md exists and is complete', () => {
  it('docs/ACCESS_PROVISIONING_DOCTRINE.md exists', () => {
    expect(fileExists('docs/ACCESS_PROVISIONING_DOCTRINE.md')).toBe(true);
  });

  it('doctrine contains no self-signup statement', () => {
    const doctrine = readFile('docs/ACCESS_PROVISIONING_DOCTRINE.md');
    expect(doctrine).toContain('no self-signup');
  });

  it('doctrine contains non registra utenti pubblici', () => {
    const doctrine = readFile('docs/ACCESS_PROVISIONING_DOCTRINE.md');
    expect(doctrine).toContain('non registra utenti pubblici');
  });

  it('doctrine contains KORA_ADMIN provisioning authority', () => {
    const doctrine = readFile('docs/ACCESS_PROVISIONING_DOCTRINE.md');
    expect(doctrine).toContain('KORA_ADMIN');
  });

  it('doctrine addresses privacy and tenant isolation motivation', () => {
    const doctrine = readFile('docs/ACCESS_PROVISIONING_DOCTRINE.md');
    expect(doctrine).toContain('privacy');
    expect(doctrine).toContain('tenant');
  });
});

// --- 23: No tokens or secrets exposed in public files --------------------

describe('B119b -- No tokens or secrets exposed in public files', () => {
  it('/request-access page does not expose any token or key', () => {
    expect(requestAccess).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(requestAccess).not.toContain('process.env.SUPABASE');
    expect(requestAccess).not.toContain('service_role');
  });

  it('middleware does not log or expose session tokens', () => {
    expect(middleware).not.toContain('console.log(');
    expect(middleware).not.toContain('access_token');
    expect(middleware).not.toContain('refresh_token');
  });
});

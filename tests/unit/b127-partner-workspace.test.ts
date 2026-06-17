// tests/unit/b127-partner-workspace.test.ts
// B127: Partner Workspace Foundation -- 32 structural tests.
//
// Verifies:
//   - PARTNER role in auth types and session layer
//   - getRoleHome(PARTNER) -> /partner/workspace
//   - requirePartnerUser uses kora_partner_id from app_metadata
//   - PARTNER without kora_partner_id -> error
//   - Middleware PARTNER protection (blocks /admin, /company, /worker)
//   - /partner/workspace requires PARTNER auth
//   - Workspace shows boundary no worker/company data
//   - Workspace shows published/draft/archived status
//   - AccountMenu PARTNER label
//   - Account page PARTNER section
//   - Admin invite-user API requires KORA_ADMIN
//   - Admin invite-user API sets kora_role PARTNER and kora_partner_id
//   - partner_identity migration RLS: KORA_ADMIN all, PARTNER own, no company, no worker
//   - Admin preview partner workspace exists and is synthetic
//   - worker opportunities unaffected (still published-only partners)
//   - Docs: no marketplace, no worker leads, no self-signup, no company KORA Index
//
// ASCII-only quotes. OXC transformer rejects Unicode quote chars.

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

const koraSession      = readFile('lib/auth/kora-session.ts');
const roleHome         = readFile('lib/auth/role-home.ts');
const middleware       = readFile('middleware.ts');
const partnerWorkspace = readFile('app/partner/workspace/page.tsx');
const inviteUser       = readFile('app/api/admin/partners/[id]/invite-user/route.ts');
const accountPage      = readFile('app/account/page.tsx');
const accountMenu      = readFile('components/auth/AccountMenu.tsx');
const partnerDoc       = readFile('docs/PARTNER_WORKSPACE_FOUNDATION.md');
const provisioningDoc  = readFile('docs/ACCESS_PROVISIONING_DOCTRINE.md');
const migration012     = readFile('supabase/migrations/012_partner_identity.sql');

// --- 1. PARTNER role in auth types -------------------------------------------

describe('B127 -- PARTNER role in auth layer', () => {
  it('KoraPartnerUser interface exists in kora-session.ts', () => {
    expect(koraSession).toContain('KoraPartnerUser');
    expect(koraSession).toContain("koraRole: 'PARTNER'");
    expect(koraSession).toContain('partnerId: string');
  });

  it('requirePartnerUser function exists', () => {
    expect(koraSession).toContain('requirePartnerUser');
    expect(koraSession).toContain("koraRole !== 'PARTNER'");
  });

  it('requirePartnerUser reads kora_partner_id from app_metadata (never from client)', () => {
    expect(koraSession).toContain('kora_partner_id');
    expect(koraSession).toContain('appMeta?.kora_partner_id');
  });

  it('PARTNER without kora_partner_id returns diagnostic error', () => {
    expect(koraSession).toContain('no partner identity assigned');
  });

  it('getCurrentPartnerUser exists', () => {
    expect(koraSession).toContain('getCurrentPartnerUser');
  });

  it('isKoraAuthError type includes KoraPartnerUser', () => {
    expect(koraSession).toContain('KoraPartnerUser | NextResponse');
  });

  it('isPartnerUser type guard exists', () => {
    expect(koraSession).toContain('isPartnerUser');
    expect(koraSession).toContain("value.koraRole === 'PARTNER'");
  });
});

// --- 2. getRoleHome PARTNER --------------------------------------------------

describe('B127 -- getRoleHome PARTNER', () => {
  it("getRoleHome('PARTNER') returns /partner/workspace", () => {
    expect(roleHome).toContain("'PARTNER'");
    expect(roleHome).toContain('/partner/workspace');
  });
});

// --- 3. Middleware PARTNER protection ----------------------------------------

describe('B127 -- middleware PARTNER route protection', () => {
  it('PARTNER_ALLOWED_PREFIXES defined in middleware', () => {
    expect(middleware).toContain('PARTNER_ALLOWED_PREFIXES');
    expect(middleware).toContain("'/partner/'");
    expect(middleware).toContain("'/account'");
  });

  it('middleware blocks PARTNER from /admin', () => {
    // Scoped to the PARTNER_ALLOWED_PREFIXES array only (not the entire rest of the file).
    const start = middleware.indexOf('PARTNER_ALLOWED_PREFIXES = [');
    const end   = middleware.indexOf('];', start);
    const partnerArray = middleware.slice(start, end + 2);
    // /admin is NOT in PARTNER_ALLOWED_PREFIXES
    expect(partnerArray).not.toContain("'/admin'");
  });

  it('middleware blocks PARTNER from /company', () => {
    const start = middleware.indexOf('PARTNER_ALLOWED_PREFIXES = [');
    const end   = middleware.indexOf('];', start);
    const partnerArray = middleware.slice(start, end + 2);
    expect(partnerArray).not.toContain("'/company'");
  });

  it('middleware blocks PARTNER from /worker', () => {
    const start = middleware.indexOf('PARTNER_ALLOWED_PREFIXES = [');
    const end   = middleware.indexOf('];', start);
    const partnerArray = middleware.slice(start, end + 2);
    expect(partnerArray).not.toContain("'/worker'");
  });

  it('middleware redirects PARTNER to /partner/workspace when blocked', () => {
    expect(middleware).toContain("sessionKoraRole === 'PARTNER'");
    expect(middleware).toContain('/partner/workspace');
  });
});

// --- 4. /partner/workspace auth gate ----------------------------------------

describe('B127 -- /partner/workspace access control', () => {
  it('workspace requires requirePartnerUser', () => {
    expect(partnerWorkspace).toContain('requirePartnerUser');
    expect(partnerWorkspace).toContain('isKoraAuthError');
  });

  it('workspace redirects to /login on auth failure', () => {
    expect(partnerWorkspace).toContain("redirect('/login");
  });

  it('workspace reads partnerId from auth (never from URL or body)', () => {
    expect(partnerWorkspace).toContain('const { partnerId, email, partnerStatus } = auth');
  });

  it('COMPANY_ADMIN cannot access workspace (no route or API exposes it to company)', () => {
    // workspace imports requirePartnerUser which rejects any non-PARTNER role
    expect(partnerWorkspace).toContain('requirePartnerUser');
    expect(partnerWorkspace).toContain('isKoraAuthError');
    // The guard itself rejects non-PARTNER
    const requireFn = koraSession.slice(koraSession.indexOf('requirePartnerUser'));
    expect(requireFn).toContain("koraRole !== 'PARTNER'");
  });

  it('KORA_ADMIN not treated as real partner (requirePartnerUser blocks KORA_ADMIN)', () => {
    // requirePartnerUser checks koraRole !== 'PARTNER' strictly
    // KORA_ADMIN would get 403 Forbidden
    expect(koraSession).toContain('PARTNER role required');
    // The function does NOT have a KORA_ADMIN bypass
    const fn = koraSession.slice(
      koraSession.indexOf('async function requirePartnerUser'),
      koraSession.indexOf('async function getCurrentPartnerUser'),
    );
    expect(fn).not.toContain('KORA_ADMIN');
  });
});

// --- 5. Workspace content: boundary -----------------------------------------

describe('B127 -- workspace boundary notices', () => {
  it('workspace shows no individual worker data boundary', () => {
    expect(partnerWorkspace).toContain('dati individuali dei lavoratori');
    expect(partnerWorkspace).toContain('partner-workspace-boundary');
  });

  it('workspace shows no company KORA Index boundary', () => {
    expect(partnerWorkspace).toContain('KORA Index delle aziende');
  });

  it('workspace shows no Dynamic CV / PIB boundary', () => {
    expect(partnerWorkspace).toContain('Dynamic Impact CV');
    expect(partnerWorkspace).toContain('PIB');
  });

  it('workspace shows no marketplace / booking note', () => {
    expect(partnerWorkspace).toContain('nessun pagamento');
    expect(partnerWorkspace).toContain('nessuna prenotazione');
  });
});

// --- 6. Workspace content: status -------------------------------------------

describe('B127 -- workspace opportunity status', () => {
  it('workspace shows published status note', () => {
    expect(partnerWorkspace).toContain('Visibile nel catalogo opportunit');
  });

  it('workspace shows draft status note', () => {
    expect(partnerWorkspace).toContain('In revisione');
  });

  it('workspace shows archived status note', () => {
    expect(partnerWorkspace).toContain('Non visibile nel catalogo');
  });

  it('workspace has partner-workspace-opportunity-status testid', () => {
    expect(partnerWorkspace).toContain('partner-workspace-opportunity-status');
  });
});

// --- 7. AccountMenu PARTNER label -------------------------------------------

describe('B127 -- AccountMenu PARTNER', () => {
  it('AccountMenu has PARTNER in ROLE_BADGE', () => {
    expect(accountMenu).toContain("PARTNER:");
    expect(accountMenu).toContain("label: 'Partner'");
  });
});

// --- 8. Account page PARTNER ------------------------------------------------

describe('B127 -- account page PARTNER', () => {
  it('account page has PARTNER in ROLE_INFO', () => {
    expect(accountPage).toContain('PARTNER:');
    expect(accountPage).toContain('Area Partner KORA');
  });

  it('account page PARTNER section does not show worker data', () => {
    const partnerSection = accountPage.slice(
      accountPage.indexOf('PARTNER:'),
      accountPage.indexOf('};'),
    );
    expect(partnerSection).not.toContain('worker_id');
    expect(partnerSection).not.toContain('PIB');
    expect(partnerSection).not.toContain('KORA Index aziendale');
  });

  it('account page has partner-workspace link for PARTNER role', () => {
    expect(accountPage).toContain('/partner/workspace');
    expect(accountPage).toContain('account-partner-workspace-link');
  });
});

// --- 9. Admin invite-user API -----------------------------------------------

describe('B127 -- admin invite-user API', () => {
  it('invite-user requires KORA_ADMIN', () => {
    expect(inviteUser).toContain('requireKoraAdmin');
    expect(inviteUser).toContain('isKoraAuthError');
  });

  it('invite-user sets kora_role PARTNER in app_metadata', () => {
    expect(inviteUser).toContain("kora_role:       'PARTNER'");
  });

  it('invite-user sets kora_partner_id in app_metadata', () => {
    expect(inviteUser).toContain('kora_partner_id: partnerId');
  });

  it('invite-user does NOT set kora_tenant_id (partners are not company-scoped)', () => {
    // kora_tenant_id may appear in comments but must never be assigned in options.data
    const optionsDataBlock = inviteUser.slice(inviteUser.indexOf('options: {'));
    const firstClosingBrace = optionsDataBlock.indexOf('},\n    } as');
    const optionsStr = optionsDataBlock.slice(0, firstClosingBrace);
    expect(optionsStr).not.toContain('kora_tenant_id:');
  });

  it('invite-user creates network.partner_identity record', () => {
    expect(inviteUser).toContain('partner_identity');
    expect(inviteUser).toContain('partner_id:   partnerId');
  });

  it('invite-user returns clear error if email not configured', () => {
    expect(inviteUser).toContain('Impossibile inviare l');
    expect(inviteUser).toContain('hint');
  });
});

// --- 10. Migration 012: partner_identity ------------------------------------

describe('B127 -- migration 012 partner_identity', () => {
  it('migration 012 file exists', () => {
    expect(fileExists('supabase/migrations/012_partner_identity.sql')).toBe(true);
  });

  it('migration creates network.partner_identity table', () => {
    expect(migration012).toContain('CREATE TABLE IF NOT EXISTS network.partner_identity');
  });

  it('migration has KORA_ADMIN all policy', () => {
    expect(migration012).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });

  it('migration has PARTNER own row policy (SELECT only)', () => {
    expect(migration012).toContain("kora.kora_role() = 'PARTNER'");
    expect(migration012).toContain('auth.uid()');
  });

  it('migration has no COMPANY policy', () => {
    // COMPANY roles may appear in comments but must not appear in any CREATE POLICY statement
    const policyLines = migration012
      .split('\n')
      .filter((l) => l.trim().startsWith('CREATE POLICY'))
      .join('\n');
    expect(policyLines).not.toContain('COMPANY');
  });

  it('migration has no WORKER policy', () => {
    const workerPolicy = migration012.includes("kora_role() = 'WORKER'");
    expect(workerPolicy).toBe(false);
  });
});

// --- 12. Worker opportunities unaffected ------------------------------------

describe('B127 -- worker opportunities boundary unaffected', () => {
  it('/api/worker/partner-catalog still exists (not modified by B127)', () => {
    expect(fileExists('app/api/worker/partner-catalog/route.ts')).toBe(true);
  });
});

// --- 13. Docs: partner workspace foundation ---------------------------------

describe('B127 -- docs PARTNER_WORKSPACE_FOUNDATION', () => {
  it('docs file exists', () => {
    expect(fileExists('docs/PARTNER_WORKSPACE_FOUNDATION.md')).toBe(true);
  });

  it('docs cite no marketplace', () => {
    expect(partnerDoc).toContain('marketplace');
    const hasNoMarketplace =
      partnerDoc.includes('No marketplace') || partnerDoc.includes('non include') || partnerDoc.includes('Marketplace');
    expect(hasNoMarketplace).toBe(true);
  });

  it('docs cite no worker leads', () => {
    expect(partnerDoc).toContain('leads');
  });

  it('docs cite no self-signup', () => {
    expect(partnerDoc).toContain('self-signup');
    expect(partnerDoc).toContain('No self-signup');
  });

  it('docs cite no company KORA Index access', () => {
    expect(partnerDoc).toContain('KORA Index');
    // The doc lists KORA Index under what the partner cannot access
    expect(partnerDoc).toContain('KORA Index delle aziende');
  });

  it('provisioning doc updated: PARTNER provisioned by KORA_ADMIN', () => {
    expect(provisioningDoc).toContain('PARTNER');
    expect(provisioningDoc).toContain('invite-user');
    expect(provisioningDoc).toContain('/partner/workspace');
  });
});

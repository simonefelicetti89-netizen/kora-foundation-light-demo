// tests/unit/public-privacy-foundation-05a-middleware.test.ts
// PUBLIC-PRIVACY-FOUNDATION-05A — /privacy always public, for every role.
//
// Pattern: source-level structural audit (read file → check invariants),
// consistent with every other cross-cutting routing/auth test in this
// codebase (no existing test invokes middleware.ts directly — there is no
// precedent for mocking @supabase/ssr's createServerClient in this repo,
// and doing so here would add a fragile, SDK-version-coupled mock for a
// function that is otherwise proven correct by this exact ordering check).
//
// The middleware's role-redirect logic is entirely sequential: it resolves
// pathname, then returns early for ALWAYS_PUBLIC_PATHS, then evaluates each
// role's redirect block in turn. Proving the early return's source position
// comes BEFORE every role-specific redirect block proves that block can
// never execute for pathname === '/privacy', for any role — this is not a
// guess about behavior, it is the actual control-flow structure Node/V8
// executes top-to-bottom.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const mw = read('middleware.ts');

describe('ALWAYS_PUBLIC_PATHS — /privacy centralizzata, non una wildcard', () => {
  it('esiste un\'unica lista centralizzata ALWAYS_PUBLIC_PATHS contenente /privacy', () => {
    expect(mw).toMatch(/const ALWAYS_PUBLIC_PATHS\s*=\s*\[\s*'\/privacy'\s*,?\s*\]/);
  });

  it('il check è un match esatto (.includes su pathname), non un prefix/wildcard (.startsWith)', () => {
    const idx = mw.indexOf('ALWAYS_PUBLIC_PATHS.includes(pathname)');
    expect(idx).toBeGreaterThan(-1);
    // Guard against a future edit accidentally switching to a wildcard prefix check.
    expect(mw).not.toMatch(/ALWAYS_PUBLIC_PATHS\.some\(\(?p\)? => pathname\.startsWith/);
  });
});

describe('/privacy consentita per ogni ruolo — provato via ordine di esecuzione nel sorgente', () => {
  const earlyReturnIdx = mw.indexOf("ALWAYS_PUBLIC_PATHS.includes(pathname)) {\n    return supabaseResponse;");
  it('sanity: il pattern dell\'early-return è stato trovato nel sorgente', () => {
    expect(earlyReturnIdx).toBeGreaterThan(-1);
  });

  it('visitatore anonimo: nessuna sessione risolta, il check ALWAYS_PUBLIC_PATHS è comunque il primo controllo sul pathname', () => {
    // For an anonymous visitor sessionKoraRole is undefined, so none of the
    // isRealCompanyUser/isRealWorker/isRealPartner/isDemoViewer branches
    // below would fire anyway — this was already true before this fix. This
    // test documents that fact so a future refactor doesn't accidentally
    // introduce an anonymous-specific block ahead of the public-paths check.
    const firstRoleCheckIdx = mw.indexOf('const isRealCompanyUser');
    expect(earlyReturnIdx).toBeLessThan(firstRoleCheckIdx);
  });

  it('COMPANY_ADMIN: il redirect a /company/workspace è irraggiungibile per /privacy (early return precede il blocco)', () => {
    const companyRedirectIdx = mw.indexOf("const isAllowed = COMPANY_ALLOWED_PREFIXES.some");
    expect(companyRedirectIdx).toBeGreaterThan(-1);
    expect(earlyReturnIdx).toBeLessThan(companyRedirectIdx);
  });

  it('WORKER: il redirect a /worker/workspace è irraggiungibile per /privacy (early return precede il blocco)', () => {
    const workerRedirectIdx = mw.indexOf("const isAllowed = WORKER_ALLOWED_PREFIXES.some");
    expect(workerRedirectIdx).toBeGreaterThan(-1);
    expect(earlyReturnIdx).toBeLessThan(workerRedirectIdx);
  });

  it('PARTNER: il redirect a /partner/workspace è irraggiungibile per /privacy (early return precede il blocco)', () => {
    const partnerRedirectIdx = mw.indexOf("const isAllowed = PARTNER_ALLOWED_PREFIXES.some");
    expect(partnerRedirectIdx).toBeGreaterThan(-1);
    expect(earlyReturnIdx).toBeLessThan(partnerRedirectIdx);
  });

  it('DEMO_VIEWER: il redirect a /demo è irraggiungibile per /privacy (early return precede il blocco)', () => {
    const demoRedirectIdx = mw.indexOf("const isAllowed = DEMO_VIEWER_ALLOWED_PREFIXES.some");
    expect(demoRedirectIdx).toBeGreaterThan(-1);
    expect(earlyReturnIdx).toBeLessThan(demoRedirectIdx);
  });

  it('KORA_ADMIN: il blocco worker-individual è irraggiungibile per /privacy (early return precede il blocco, e comunque si applica solo a /worker/)', () => {
    const koraAdminBlockIdx = mw.indexOf("const isKoraAdmin = sessionKoraRole === 'KORA_ADMIN'");
    expect(koraAdminBlockIdx).toBeGreaterThan(-1);
    expect(earlyReturnIdx).toBeLessThan(koraAdminBlockIdx);
    // Even if this block were reached, it only restricts /worker/* paths — unchanged by this fix.
    expect(mw).toContain("const workerIndividualPrefixes = ['/worker/']");
  });
});

describe('nessuna regressione sulle route private — le quattro allowlist per-ruolo restano invariate', () => {
  it('COMPANY_ALLOWED_PREFIXES non include /privacy (fix centralizzato, non sparso nelle 4 liste)', () => {
    const start = mw.indexOf('const COMPANY_ALLOWED_PREFIXES = [');
    const end = mw.indexOf('];', start);
    const block = mw.slice(start, end);
    expect(block).not.toContain("'/privacy'");
    expect(block).toContain("'/company'");
    expect(block).toContain("'/company/workspace'");
  });

  it('WORKER_ALLOWED_PREFIXES non include /privacy, resta confinata a /worker/', () => {
    const start = mw.indexOf('const WORKER_ALLOWED_PREFIXES = [');
    const end = mw.indexOf('];', start);
    const block = mw.slice(start, end);
    expect(block).not.toContain("'/privacy'");
    expect(block).toContain("'/worker/'");
  });

  it('PARTNER_ALLOWED_PREFIXES non include /privacy, resta confinata a /partner/', () => {
    const start = mw.indexOf('const PARTNER_ALLOWED_PREFIXES = [');
    const end = mw.indexOf('];', start);
    const block = mw.slice(start, end);
    expect(block).not.toContain("'/privacy'");
    expect(block).toContain("'/partner/'");
  });

  it('DEMO_VIEWER_ALLOWED_PREFIXES non include /privacy, resta confinata a /demo/', () => {
    const start = mw.indexOf('const DEMO_VIEWER_ALLOWED_PREFIXES = [');
    const end = mw.indexOf('];', start);
    const block = mw.slice(start, end);
    expect(block).not.toContain("'/privacy'");
    expect(block).toContain("'/demo/'");
  });

  it('nessuna nuova autorizzazione/ruolo/tenant-boundary introdotta: canAccess() e i redirect esistenti restano invariati', () => {
    expect(mw).toContain("canAccess('KORA_ADMIN', 'worker_individual_pib', 'live')");
    expect(mw).toContain("NextResponse.redirect(new URL('/company/workspace', request.url))");
    expect(mw).toContain("NextResponse.redirect(new URL('/worker/workspace', request.url))");
    expect(mw).toContain("NextResponse.redirect(new URL('/partner/workspace', request.url))");
    expect(mw).toContain("NextResponse.redirect(new URL('/demo', request.url))");
  });
});

/**
 * B155 — Company Workspace Runtime Navigation Check
 *
 * Verifies every /company/* page with an authenticated COMPANY_ADMIN session.
 * Reports HTTP status, redirects, DEMO banner presence, and content state.
 *
 * Usage:
 *   npx tsx scripts/b155-company-runtime-check.ts [base_url]
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in env
 *   - SUPABASE_SERVICE_ROLE_KEY in env (to generate admin link without password)
 *   - A running Next.js server (pass base_url, defaults to http://localhost:3000)
 *
 * Environment: reads from .env.local automatically via process.env (Next.js sets these).
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const PROJECT_REF = 'azdnepfmwrmacruykskm';
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

// Reads from .env.local
function readEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const out: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) out[k.trim()] = v.join('=').trim();
  }
  return out;
}

const env = readEnv();
const SUPABASE_URL   = env['NEXT_PUBLIC_SUPABASE_URL']   || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON_KEY       = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SERVICE_KEY    = env['SUPABASE_SERVICE_ROLE_KEY']  || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ── Company Admin Account ─────────────────────────────────────────────────────
// TEST-A tenant — company-admin-a@example.test
const TEST_EMAIL = 'company-admin-a@example.test';

// ── Pages to check ────────────────────────────────────────────────────────────
const PAGES = [
  '/company',
  '/company/workspace',
  '/company/status',
  '/company/kora-index',
  '/company/activation',
  '/company/pillars',
  '/company/financial',
  '/company/contribution',
  '/company/opportunities',
  '/company/data',
  '/company/reports',
  '/company/wallboard',
  '/company/commons',
  '/company/profile',
];

// ── Supabase Auth ──────────────────────────────────────────────────────────────
async function getSession(): Promise<{ cookie: string; tenantId: string; userEmail: string }> {
  // 1. Generate magic link via admin API (no password needed)
  const genRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method:  'POST',
    headers: {
      apikey:        SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email: TEST_EMAIL }),
  });
  const genData = await genRes.json() as { email_otp: string; error?: string };
  if (!genData.email_otp) {
    throw new Error(`Failed to generate magic link: ${JSON.stringify(genData)}`);
  }

  // 2. Exchange OTP for session
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method:  'POST',
    headers: {
      apikey:        ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'email', email: TEST_EMAIL, token: genData.email_otp }),
  });
  const session = await verifyRes.json() as {
    access_token?: string;
    refresh_token?: string;
    user?: { app_metadata?: { kora_tenant_id?: string } };
    error?: string;
  };
  if (!session.access_token) {
    throw new Error(`Failed to get session: ${JSON.stringify(session)}`);
  }

  // 3. Format session as Supabase SSR cookie (raw JSON — fits in single cookie at 2414 bytes)
  const cookieValue = JSON.stringify(session);
  const tenantId = session.user?.app_metadata?.kora_tenant_id ?? 'unknown';

  return {
    cookie:     `${COOKIE_NAME}=${encodeURIComponent(cookieValue)}`,
    tenantId,
    userEmail:  TEST_EMAIL,
  };
}

// ── Page Check ────────────────────────────────────────────────────────────────
interface PageResult {
  page:       string;
  status:     number;
  finalUrl:   string;
  redirectTo: string | null;
  demoStr:    boolean;
  hasContent: boolean;
  errorHint:  string | null;
  note:       string;
}

async function checkPage(page: string, cookie: string): Promise<PageResult> {
  const url = `${BASE_URL}${page}`;
  let status = 0;
  let finalUrl = url;
  let redirectTo: string | null = null;
  let demoStr = false;
  let hasContent = false;
  let errorHint: string | null = null;
  let note = '';

  try {
    // Follow up to 5 redirects, track them
    let currentUrl = url;
    const redirectChain: string[] = [];
    let response: Response | null = null;
    let hops = 0;

    while (hops < 6) {
      response = await fetch(currentUrl, {
        headers: {
          Cookie:     cookie,
          'User-Agent': 'KORA-B155-RuntimeCheck/1.0',
        },
        redirect: 'manual', // handle redirects manually to track them
      });
      status   = response.status;
      finalUrl = currentUrl;

      if (status >= 300 && status < 400) {
        const location = response.headers.get('location') ?? '';
        redirectChain.push(location);
        // Resolve relative redirects
        if (location.startsWith('/')) {
          currentUrl = `${BASE_URL}${location}`;
        } else if (location.startsWith('http')) {
          currentUrl = location;
        } else {
          note = `Unresolvable redirect: ${location}`;
          break;
        }
        hops++;
      } else {
        break;
      }
    }

    if (redirectChain.length > 0) {
      redirectTo = redirectChain[redirectChain.length - 1];
      if (hops >= 6) note = 'REDIRECT LOOP (≥6 hops)';
    }

    // Analyse response body
    if (response) {
      const body = await response.text();

      // DEMO banner check — only patterns indicating a visible DEMO warning to real users.
      // FALSE POSITIVES excluded:
      //   - 'Foundation Light': product name in page <title> and <meta> — always present, not a banner
      //   - 'SYNTHETIC': may appear in tenant name (e.g. "[SYNTHETIC TEST] Tenant TEST-A") — not a banner
      const demoPatterns = [
        'dati sintetici',          // visible italic text DEMO warning (Italian UI)
        'synthetic_demo_data',     // raw JSON field leaked into rendered HTML
        'DATI SIMULATI',           // explicit visible DEMO label
        'demo sintetico',          // visible DEMO label
        'Dati sintetici',          // capitalized variant
        'DemoBanner',              // React component name in rendered HTML = SSR-rendered banner
        'RoleSwitcher',            // admin-only switcher shown to company user = auth leak
        'ScenarioSwitcher',        // admin-only switcher shown to company user
        'demo-banner',             // data-testid or class indicating DEMO banner element
      ];
      demoStr = demoPatterns.some(p => body.includes(p));

      // Content check — signs that page rendered meaningfully
      const emptyPatterns   = ['__NEXT_DATA__'];     // next data always present in SSR
      const contentPatterns = [
        'class=',
        '<main',
        '<header',
        '<nav',
        'data-testid',
        'KORA',
      ];
      hasContent = contentPatterns.some(p => body.includes(p));

      // Error patterns
      const errorPatterns: [string, string][] = [
        ['Internal Server Error', 'Internal Server Error'],
        ['Application error', 'Application error (Next.js crash)'],
        ['Error: ', 'Unhandled error in body'],
        ['TypeError:', 'TypeError in body'],
        ['404', 'Page returned 404'],
        ['This page could not be found', 'Next.js 404'],
        ['500', '500 in body'],
        ['Cannot read properties', 'Null deref in render'],
        ['at Object.<anonymous>', 'Stack trace in body'],
      ];
      for (const [pattern, hint] of errorPatterns) {
        if (status === 500 || (body.includes(pattern) && status !== 200)) {
          errorHint = hint;
          break;
        }
      }

      // Detect loading/spinner patterns in SSR response
      if (status === 200 && !hasContent) {
        note = 'Empty/minimal content';
      }
    }

  } catch (err) {
    errorHint = `Fetch error: ${err instanceof Error ? err.message : String(err)}`;
    status    = -1;
  }

  return { page, status, finalUrl, redirectTo, demoStr, hasContent, errorHint, note };
}

// ── Report ────────────────────────────────────────────────────────────────────
function printReport(results: PageResult[], tenantId: string, userEmail: string): void {
  const ts = new Date().toISOString();

  console.log('\n' + '═'.repeat(100));
  console.log(`B155 — Company Runtime Check  •  ${ts}`);
  console.log(`Account: ${userEmail}  •  Tenant: ${tenantId}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('═'.repeat(100));

  // Header
  const col = (s: string, w: number) => s.slice(0, w).padEnd(w);
  console.log(
    col('Pagina', 28) +
    col('HTTP', 6) +
    col('Redirect → dove', 35) +
    col('DEMO?', 7) +
    col('Contenuto?', 11) +
    'Errori / Note'
  );
  console.log('-'.repeat(100));

  for (const r of results) {
    const statusStr = String(r.status === -1 ? 'ERR' : r.status);
    const redirectStr = r.redirectTo
      ? (r.redirectTo.startsWith('http') ? r.redirectTo.replace(BASE_URL, '') : r.redirectTo)
      : (r.finalUrl !== `${BASE_URL}${r.page}` ? r.finalUrl.replace(BASE_URL, '') : '—');
    const demoStr    = r.demoStr     ? '⚠ SÌ' : 'no';
    const contentStr = r.hasContent  ? '✓ sì' : '× no';
    const errStr     = r.errorHint   ? `❌ ${r.errorHint}` : (r.note || '—');

    console.log(
      col(r.page, 28) +
      col(statusStr, 6) +
      col(redirectStr, 35) +
      col(demoStr, 7) +
      col(contentStr, 11) +
      errStr
    );
  }

  console.log('═'.repeat(100));

  // Group by probable cause
  const issues = results.filter(r => r.status !== 200 || r.demoStr || r.errorHint);
  if (issues.length === 0) {
    console.log('\n✅ NESSUN PROBLEMA RILEVATO — tutte le pagine 200, niente DEMO banner, niente errori.');
    return;
  }

  console.log('\n── PROBLEMI RAGGRUPPATI PER CAUSA ──────────────────────────────────────────');

  // Group: redirects to /login
  const loginRedirects = issues.filter(r => r.redirectTo?.includes('/login') || r.finalUrl.includes('/login'));
  if (loginRedirects.length) {
    console.log(`\n🔴 Guard bounce → /login (${loginRedirects.length} pagine): sessione non riconosciuta dal server SSR`);
    loginRedirects.forEach(r => console.log(`   • ${r.page}`));
    console.log('   Causa probabile: cookie format non riconosciuto da @supabase/ssr, oppure sessione scaduta.');
  }

  // Group: redirects NOT to login
  const otherRedirects = issues.filter(r => r.redirectTo && !r.redirectTo.includes('/login'));
  if (otherRedirects.length) {
    // Sub-group by destination
    const byDest = new Map<string, PageResult[]>();
    for (const r of otherRedirects) {
      const dest = r.redirectTo ?? '?';
      if (!byDest.has(dest)) byDest.set(dest, []);
      byDest.get(dest)!.push(r);
    }
    for (const [dest, group] of byDest.entries()) {
      console.log(`\n🟡 Redirect → ${dest} (${group.length} pagine): routing bug o guard mal configurato`);
      group.forEach(r => console.log(`   • ${r.page}`));
    }
  }

  // Group: DEMO banners
  const demoBanners = issues.filter(r => r.demoStr);
  if (demoBanners.length) {
    console.log(`\n🟠 Banner DEMO visibile a utente COMPANY_ADMIN reale (${demoBanners.length} pagine):`);
    demoBanners.forEach(r => console.log(`   • ${r.page}`));
    console.log('   Causa: pagina usa demo-state/mock data invece di branch di produzione.');
  }

  // Group: 500 errors
  const errors500 = issues.filter(r => r.status === 500 || r.errorHint);
  if (errors500.length) {
    console.log(`\n🔴 Errori render / 500 (${errors500.length} pagine):`);
    errors500.forEach(r => console.log(`   • ${r.page}: ${r.errorHint}`));
  }

  // Group: empty content
  const emptyPages = issues.filter(r => r.status === 200 && !r.hasContent && !r.demoStr && !r.errorHint);
  if (emptyPages.length) {
    console.log(`\n🟡 Pagine 200 ma senza contenuto riconoscibile (${emptyPages.length}):`);
    emptyPages.forEach(r => console.log(`   • ${r.page}`));
  }

  console.log('\n' + '═'.repeat(100));
  console.log(`Totale problemi: ${issues.length}/${results.length} pagine`);
  console.log('NESSUN FIX in questo script — solo referto. Decisione founder su cosa fixare.');
  console.log('═'.repeat(100) + '\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    console.error('❌ STOP: variabili Supabase mancanti. Verificare .env.local');
    process.exit(1);
  }

  console.log(`\n[B155] Autenticazione come ${TEST_EMAIL}...`);
  let session: { cookie: string; tenantId: string; userEmail: string };
  try {
    session = await getSession();
    console.log(`[B155] Sessione ottenuta — tenant: ${session.tenantId}`);
  } catch (err) {
    console.error(`❌ STOP: autenticazione fallita — ${err}`);
    console.error('Non procedo: un referto senza sessione produce falsi errori da "non loggato".');
    process.exit(1);
  }

  // Verify server is up
  console.log(`[B155] Verifica server ${BASE_URL}...`);
  try {
    const ping = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    console.log(`[B155] Server risponde (${ping.status}) — procedo.`);
  } catch {
    // /api/health might not exist — try root
    try {
      const ping2 = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
      console.log(`[B155] Server risponde su / (${ping2.status}) — procedo.`);
    } catch (err2) {
      console.error(`❌ STOP: server non risponde su ${BASE_URL} — ${err2}`);
      console.error('Avvia il server (npm run dev o npm run start) e riprova.');
      process.exit(1);
    }
  }

  console.log(`\n[B155] Avvio giro ${PAGES.length} pagine /company...\n`);
  const results: PageResult[] = [];
  for (const page of PAGES) {
    process.stdout.write(`  Checking ${page.padEnd(30)} `);
    const result = await checkPage(page, session.cookie);
    const icon = result.status === 200 ? '✓' : (result.status >= 300 && result.status < 400 ? '↩' : '✗');
    console.log(`${icon} ${result.status}${result.redirectTo ? ' → ' + result.redirectTo : ''}`);
    results.push(result);
  }

  printReport(results, session.tenantId, session.userEmail);

  // Save results to JSON for future reference
  const outPath = path.resolve(process.cwd(), 'scripts/b155-last-run.json');
  fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), tenantId: session.tenantId, results }, null, 2));
  console.log(`[B155] Risultati salvati in scripts/b155-last-run.json\n`);
}

main().catch(err => {
  console.error('❌ Errore fatale:', err);
  process.exit(1);
});

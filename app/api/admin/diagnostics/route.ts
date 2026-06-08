// app/api/admin/diagnostics/route.ts
// GET /api/admin/diagnostics — provisioning dry-check.
// KORA_ADMIN only. Non-destructive: reads env + connectivity, zero writes.
// CRITICAL: SUPABASE_SERVICE_ROLE_KEY value is NEVER included in any response field.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export type CheckStatus = 'PASS' | 'WARNING' | 'FAIL';
export type Verdict     = 'READY' | 'PARTIAL' | 'BLOCKED';

export interface DiagCheck {
  id:      string;
  label:   string;
  status:  CheckStatus;
  message: string;
}

export interface DryCheckPayload {
  verdict:   Verdict;
  checks:    DiagCheck[];
  timestamp: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const checks: DiagCheck[] = [];

  // ── 1. NEXT_PUBLIC_SITE_URL ───────────────────────────────────────────────
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const isVercel    = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const isLocalhost = !siteUrl || siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1');

  if (!siteUrl) {
    checks.push({ id: 'site_url', label: 'NEXT_PUBLIC_SITE_URL', status: 'FAIL',
      message: 'Non configurata — redirectTo default a http://localhost:3000/auth/callback.' });
  } else if (isLocalhost && isVercel) {
    checks.push({ id: 'site_url', label: 'NEXT_PUBLIC_SITE_URL', status: 'FAIL',
      message: `Punta a localhost (${siteUrl}) in ambiente Vercel — link di invito non funzionerà.` });
  } else if (isLocalhost) {
    checks.push({ id: 'site_url', label: 'NEXT_PUBLIC_SITE_URL', status: 'WARNING',
      message: `Localhost (${siteUrl}) — OK in sviluppo locale, FAIL in produzione.` });
  } else {
    checks.push({ id: 'site_url', label: 'NEXT_PUBLIC_SITE_URL', status: 'PASS',
      message: siteUrl });
  }

  // ── 2. redirectTo calcolato ───────────────────────────────────────────────
  const redirectTo = `${siteUrl || 'http://localhost:3000'}/auth/callback`;
  const redirectStatus: CheckStatus = !siteUrl || (isLocalhost && isVercel) ? 'FAIL' : isLocalhost ? 'WARNING' : 'PASS';
  checks.push({ id: 'redirect_to', label: 'redirectTo (calcolato)', status: redirectStatus,
    message: redirectTo });

  // ── 3. NEXT_PUBLIC_SUPABASE_URL ───────────────────────────────────────────
  const supUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  checks.push({ id: 'supabase_url', label: 'NEXT_PUBLIC_SUPABASE_URL',
    status: supUrl ? 'PASS' : 'FAIL',
    message: supUrl ? `OK (${supUrl.slice(0, 35)}…)` : 'Non configurata.' });

  // ── 4. NEXT_PUBLIC_SUPABASE_ANON_KEY ─────────────────────────────────────
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  checks.push({ id: 'anon_key', label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    status: anonKey ? 'PASS' : 'FAIL',
    message: anonKey ? `OK (${anonKey.slice(0, 10)}… mascherata)` : 'Non configurata.' });

  // ── 5. SUPABASE_SERVICE_ROLE_KEY — NEVER expose value ────────────────────
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  checks.push({ id: 'service_key', label: 'SUPABASE_SERVICE_ROLE_KEY',
    status: hasServiceKey ? 'PASS' : 'FAIL',
    message: hasServiceKey
      ? 'Presente (valore nascosto — mai esposto in risposta)'
      : 'Non configurata — provision route restituirà 503.' });

  // ── 6–7. DB + Auth Admin API connectivity ─────────────────────────────────
  if (hasServiceKey && supUrl) {
    try {
      const db = getSupabaseServiceClient();

      const { error: dbErr } = await db
        .schema('analytics').from('tenant')
        .select('id', { count: 'exact', head: true });

      checks.push({ id: 'db_tenant', label: 'DB analytics.tenant (lettura)',
        status: dbErr ? 'FAIL' : 'PASS',
        message: dbErr ? `Errore query: ${dbErr.message}` : 'Connessione e lettura riuscita.' });

      const { error: authErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
      checks.push({ id: 'auth_api', label: 'Auth Admin API (listUsers)',
        status: authErr ? 'FAIL' : 'PASS',
        message: authErr ? `listUsers fallito: ${authErr.message}` : 'Auth Admin API raggiungibile.' });
    } catch (e) {
      checks.push({ id: 'connectivity', label: 'DB + Auth connectivity',
        status: 'FAIL', message: `Eccezione: ${String(e)}` });
    }
  } else {
    checks.push({ id: 'connectivity', label: 'DB + Auth connectivity',
      status: 'FAIL', message: 'Skipped — SUPABASE_SERVICE_ROLE_KEY o SUPABASE_URL mancanti.' });
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasWarn = checks.some((c) => c.status === 'WARNING');
  const verdict: Verdict = hasFail ? 'BLOCKED' : hasWarn ? 'PARTIAL' : 'READY';

  return NextResponse.json<DryCheckPayload>({ verdict, checks, timestamp: new Date().toISOString() });
}

// app/admin/provisioning-diagnostics/page.tsx
// KORA_ADMIN only — provisioning diagnostic console for B99 live validation.
// Not a product feature. Technical diagnostic tool to verify the provisioning
// flow end-to-end without manual checks across Vercel, Supabase, Gmail.

export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { DryCheckButton } from './_dry-check-button';

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckStatus = 'PASS' | 'WARNING' | 'FAIL' | 'MANUAL';
type Verdict = 'READY' | 'PARTIAL' | 'BLOCKED';

interface EnvCheck {
  id:      string;
  label:   string;
  status:  CheckStatus;
  display: string;
  note:    string;
}

interface TenantRow {
  id:                     string;
  tenant_code:            string;
  company_name:           string;
  is_active:              boolean;
  onboarding_status:      string;
  created_at:             string;
  methodology_version_id: string;
}

interface CompanyUser {
  id:                   string;
  email:                string;
  koraRole:             string;
  koraTenantId:         string;
  koraStatus:           string;
  created_at:           string;
  last_sign_in_at:      string | null;
  email_confirmed_at:   string | null;
  invited_at:           string | null;
}

// ── Env checks ────────────────────────────────────────────────────────────────

function runEnvChecks(): { checks: EnvCheck[]; redirectToUrl: string; verdict: Verdict; verdictNote: string } {
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const hasService  = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const isVercel    = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const isLocalhost = !siteUrl || siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1');

  const checks: EnvCheck[] = [];

  // NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    checks.push({ id: 'site_url', label: 'NEXT_PUBLIC_SITE_URL', status: 'FAIL',
      display: 'Non configurata',
      note: 'Il link di invito punta a http://localhost:3000 — il referente non può raggiungerlo.' });
  } else if (isLocalhost && isVercel) {
    checks.push({ id: 'site_url', label: 'NEXT_PUBLIC_SITE_URL', status: 'FAIL',
      display: siteUrl,
      note: 'Punta a localhost ma siamo su Vercel — il link di invito è inutilizzabile.' });
  } else if (isLocalhost) {
    checks.push({ id: 'site_url', label: 'NEXT_PUBLIC_SITE_URL', status: 'WARNING',
      display: siteUrl,
      note: 'Localhost — corretto in sviluppo locale, da impostare prima del deploy.' });
  } else {
    checks.push({ id: 'site_url', label: 'NEXT_PUBLIC_SITE_URL', status: 'PASS',
      display: siteUrl, note: 'Configurato correttamente.' });
  }

  // NEXT_PUBLIC_SUPABASE_URL
  checks.push({ id: 'supabase_url', label: 'NEXT_PUBLIC_SUPABASE_URL',
    status: supabaseUrl ? 'PASS' : 'FAIL',
    display: supabaseUrl ? `${supabaseUrl.slice(0, 40)}…` : 'Non configurata',
    note: supabaseUrl ? '' : 'Nessuna connessione Supabase possibile.' });

  // NEXT_PUBLIC_SUPABASE_ANON_KEY
  checks.push({ id: 'anon_key', label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    status: anonKey ? 'PASS' : 'FAIL',
    display: anonKey ? `${anonKey.slice(0, 12)}… (mascherata)` : 'Non configurata',
    note: anonKey ? '' : 'Sessione browser impossibile.' });

  // SUPABASE_SERVICE_ROLE_KEY — value never shown
  checks.push({ id: 'service_key', label: 'SUPABASE_SERVICE_ROLE_KEY',
    status: hasService ? 'PASS' : 'FAIL',
    display: hasService ? '✓ Presente (valore nascosto)' : '✗ Non configurata',
    note: hasService ? '' : 'Provision route risponderà 503.' });

  // redirectTo computed
  const redirectToUrl = `${siteUrl || 'http://localhost:3000'}/auth/callback`;
  checks.push({ id: 'redirect_to', label: 'redirectTo (calcolato)', status: !siteUrl || (isLocalhost && isVercel) ? 'FAIL' : isLocalhost ? 'WARNING' : 'PASS',
    display: redirectToUrl,
    note: 'URL inviato nel link email dal provision route.' });

  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasWarn = checks.some((c) => c.status === 'WARNING');

  let verdict: Verdict;
  let verdictNote: string;
  if (hasFail) {
    const failLabels = checks.filter((c) => c.status === 'FAIL').map((c) => c.label).join(', ');
    verdict = 'BLOCKED';
    verdictNote = `Variabili critiche mancanti o errate: ${failLabels}. Il provisioning non può funzionare in produzione.`;
  } else if (hasWarn) {
    verdict = 'PARTIAL';
    verdictNote = 'Env configurata per sviluppo locale. Aggiornare NEXT_PUBLIC_SITE_URL prima del deploy Vercel.';
  } else {
    verdict = 'READY';
    verdictNote = 'Tutte le variabili di ambiente sono configurate correttamente. Eseguire il dry-check per confermare la connettività Supabase.';
  }

  return { checks, redirectToUrl, verdict, verdictNote };
}

// ── DB: Recent tenants ────────────────────────────────────────────────────────

async function getRecentTenants(): Promise<{ data: TenantRow[] | null; error: string | null }> {
  try {
    const db = getSupabaseServiceClient();
    const { data, error } = await db
      .schema('analytics').from('tenant')
      .select('id, tenant_code, company_name, is_active, onboarding_status, created_at, methodology_version_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return { data: null, error: error.message };
    return { data: data as TenantRow[], error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ── Auth Admin API: Recent company users ──────────────────────────────────────

async function getCompanyUsers(): Promise<{ data: CompanyUser[] | null; error: string | null }> {
  try {
    const db = getSupabaseServiceClient();
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });

    if (error) return { data: null, error: error.message };

    const users = (data?.users ?? [])
      .filter((u) => {
        const role = (u.app_metadata as Record<string, unknown>)?.kora_role as string | undefined;
        return role === 'COMPANY_ADMIN'; // B143: COMPANY_VIEWER rimosso
      })
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
      .slice(0, 20)
      .map((u): CompanyUser => {
        const meta = u.app_metadata as Record<string, unknown>;
        const raw  = u as unknown as Record<string, unknown>;
        return {
          id:                 u.id,
          email:              u.email ?? '—',
          koraRole:           (meta.kora_role     as string) ?? '—',
          koraTenantId:       (meta.kora_tenant_id as string) ?? '—',
          koraStatus:         (meta.kora_status   as string) ?? '—',
          created_at:         u.created_at,
          last_sign_in_at:    (u.last_sign_in_at  as string | undefined) ?? null,
          email_confirmed_at: (raw.email_confirmed_at as string | undefined) ?? null,
          invited_at:         (raw.invited_at     as string | undefined) ?? null,
        };
      });

    return { data: users, error: null };
  } catch (e) {
    return { data: null, error: String(e) };
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<CheckStatus, string> = {
  PASS:    'bg-green-50 text-green-700 border border-green-200',
  WARNING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  FAIL:    'bg-red-50 text-red-700 border border-red-200',
  MANUAL:  'bg-slate-50 text-slate-600 border border-slate-200',
};

const VERDICT_STYLE: Record<Verdict, string> = {
  READY:   'bg-green-100 border-l-4 border-green-500 text-green-900',
  PARTIAL: 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900',
  BLOCKED: 'bg-red-50 border-l-4 border-red-500 text-red-900',
};

function Badge({ status }: { status: CheckStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

function SectionCard({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-white border border-gray-200 rounded-lg">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700">
      <span className="font-semibold">Errore: </span>{message}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 italic">{message}</p>;
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProvisioningDiagnosticsPage() {
  // Auth check — must be KORA_ADMIN
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.app_metadata as Record<string, unknown> | undefined;
    if (meta?.kora_role !== 'KORA_ADMIN') redirect('/admin/login');
  } catch {
    redirect('/admin/login');
  }

  // Data fetching
  const { checks, redirectToUrl, verdict, verdictNote } = runEnvChecks();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const [tenantResult, userResult] = await Promise.all([
    getRecentTenants(),
    getCompanyUsers(),
  ]);

  // Structural checks — verified by test suite at commit 4044dfb
  const routeChecks = [
    {
      path: '/api/admin/companies/provision',
      items: [
        'requireKoraAdmin — solo KORA_ADMIN',
        'redirectTo: /auth/callback (non /company/workspace)',
        'scrive app_metadata.kora_tenant_id (canonical key)',
        'scrive kora_role, kora_status',
        'non legge tenant_id dal client',
        'idempotente su tenant_code e admin_email',
      ],
    },
    {
      path: '/auth/callback',
      items: [
        'exchangeCodeForSession(code) — flusso PKCE',
        'gestisce ?code= (token exchange)',
        'gestisce ?error= (token scaduto/invalido)',
        'redirect a /company/setup-password',
        'runtime nodejs (accesso cookie store)',
      ],
    },
    {
      path: '/company/setup-password',
      items: [
        'supabase.auth.updateUser({ password })',
        'validazione minimo 8 caratteri',
        'gestisce password mismatch',
        'gestisce token expired (URL error param)',
        'redirect a /company/workspace dopo successo',
        'Suspense boundary (useSearchParams)',
      ],
    },
    {
      path: 'middleware.ts',
      items: [
        '/auth/callback in COMPANY_ALLOWED_PREFIXES',
        '/company/setup-password in COMPANY_ALLOWED_PREFIXES',
        'company user non viene reindirizzato prima di impostare la password',
        '/admin non accessibile a COMPANY_ADMIN/VIEWER',
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">B99 — Provisioning Diagnostics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Strumento tecnico KORA_ADMIN — validazione flusso provisioning live
        </p>
      </div>

      {/* Verdict banner */}
      <div className={`rounded-lg px-5 py-4 ${VERDICT_STYLE[verdict]}`}>
        <p className="font-bold text-base">B99 Live Readiness: {verdict}</p>
        <p className="text-sm mt-1">{verdictNote}</p>
        {verdict === 'READY' && (
          <p className="text-sm mt-1 font-medium">
            → Eseguire il dry-check (sezione 6) per confermare connettività DB e Auth Admin API.
          </p>
        )}
        {verdict === 'BLOCKED' && (
          <p className="text-sm mt-1 font-medium">
            → Correggere le variabili in rosso, poi rieseguire il deploy Vercel.
          </p>
        )}
      </div>

      {/* 1. Environment */}
      <SectionCard title="1. Environment Check" id="env">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
              <th className="text-left pb-2 font-medium pr-4">Variabile</th>
              <th className="text-left pb-2 font-medium pr-4">Stato</th>
              <th className="text-left pb-2 font-medium pr-4">Valore</th>
              <th className="text-left pb-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4 font-mono text-xs text-gray-700 whitespace-nowrap">{c.label}</td>
                <td className="py-2 pr-4 whitespace-nowrap"><Badge status={c.status} /></td>
                <td className="py-2 pr-4 font-mono text-xs text-gray-600 max-w-xs truncate">{c.display}</td>
                <td className="py-2 text-xs text-gray-500">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* 2. Supabase Auth Config — Manual */}
      <SectionCard title="2. Configurazione Supabase Auth — Verifica Manuale" id="auth-config">
        <p className="text-sm text-gray-600 mb-3">
          Questi parametri devono essere configurati nel <strong>Supabase Dashboard → Authentication → URL Configuration</strong>.
          Non è possibile verificarli automaticamente via API.
        </p>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded border border-gray-200 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Site URL</p>
            <code className="text-sm text-gray-800">{siteUrl || 'http://localhost:3000'}</code>
          </div>
          <div className="bg-gray-50 rounded border border-gray-200 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Additional Redirect URLs (deve includere)</p>
            <code className="text-sm text-gray-800">{redirectToUrl}</code>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          <span className="font-medium text-amber-600">⚠ MANUAL:</span> Se il Site URL nel dashboard Supabase è ancora il default,
          il link di invito non punterà all&apos;app KORA.
        </p>
      </SectionCard>

      {/* 3. Route Status */}
      <SectionCard title="3. Route Status — Verificato da test suite (commit 4044dfb)" id="routes">
        <p className="text-xs text-gray-400 mb-4">
          I check strutturali non sono verificabili a runtime su Vercel — i file sorgente sono compilati.
          Le proprietà sotto sono state validate dal test suite (70 test passing) al commit 4044dfb.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routeChecks.map((r) => (
            <div key={r.path} className="border border-gray-200 rounded p-3">
              <p className="font-mono text-xs font-semibold text-gray-800 mb-2">{r.path}</p>
              <ul className="space-y-1">
                {r.items.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="text-green-500 font-bold mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 4. Recent Tenants */}
      <SectionCard title="4. Provisioning Recente — Tenant (analytics.tenant)" id="tenants">
        {tenantResult.error ? (
          <ErrorBox message={tenantResult.error} />
        ) : !tenantResult.data || tenantResult.data.length === 0 ? (
          <Empty message="Nessun tenant in analytics.tenant. Il wizard non è ancora stato usato in produzione, o la tabella non è raggiungibile." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 uppercase">
                  {['Codice', 'Azienda', 'Attivo', 'Stato', 'Metodologia', 'Creato'].map((h) => (
                    <th key={h} className="text-left pb-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenantResult.data.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 font-mono font-semibold text-gray-800">{t.tenant_code}</td>
                    <td className="py-2 pr-4 text-gray-700">{t.company_name}</td>
                    <td className="py-2 pr-4">
                      <span className={t.is_active ? 'text-green-600' : 'text-gray-400'}>
                        {t.is_active ? '✓' : '—'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{t.onboarding_status}</td>
                    <td className="py-2 pr-4 text-gray-500 font-mono">{t.methodology_version_id}</td>
                    <td className="py-2 text-gray-400 whitespace-nowrap">{fmt(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-300 mt-2">ID tenant visibili in Supabase Dashboard → Table Editor → analytics.tenant</p>
          </div>
        )}
      </SectionCard>

      {/* 5. Recent Company Auth Users */}
      <SectionCard title="5. Utenti Company Auth (app_metadata)" id="users">
        {userResult.error ? (
          <ErrorBox message={userResult.error} />
        ) : !userResult.data || userResult.data.length === 0 ? (
          <Empty message="Nessun utente con kora_role COMPANY_ADMIN in auth.users." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 uppercase">
                  {['Email', 'Ruolo', 'kora_tenant_id', 'Stato', 'Invitato', 'Confermato', 'Ultimo accesso'].map((h) => (
                    <th key={h} className="text-left pb-2 pr-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userResult.data.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 text-gray-800">{u.email}</td>
                    <td className="py-2 pr-3 font-mono text-gray-600">{u.koraRole}</td>
                    <td className="py-2 pr-3 font-mono text-gray-500 text-xs">
                      {u.koraTenantId !== '—' ? `${u.koraTenantId.slice(0, 8)}…` : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={u.koraStatus === 'active' ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                        {u.koraStatus}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-400 whitespace-nowrap">{fmt(u.invited_at)}</td>
                    <td className="py-2 pr-3 text-gray-400 whitespace-nowrap">
                      {u.email_confirmed_at
                        ? <span className="text-green-600">✓ {fmt(u.email_confirmed_at)}</span>
                        : <span className="text-amber-500">In attesa</span>}
                    </td>
                    <td className="py-2 text-gray-400 whitespace-nowrap">{fmt(u.last_sign_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-300 mt-2">
              kora_tenant_id troncato — valore completo visibile in Supabase Dashboard → Authentication → Users
            </p>
          </div>
        )}
      </SectionCard>

      {/* 6. Dry-Check */}
      <SectionCard title="6. Provisioning Dry-Check" id="dry-check">
        <p className="text-sm text-gray-500 mb-4">
          Verifica in tempo reale: env + connettività DB + Auth Admin API. Nessuna scrittura — nessun dato creato.
        </p>
        <DryCheckButton />
      </SectionCard>

      {/* Footer */}
      <p className="text-xs text-gray-300 text-center pb-4">
        B99-HARDENING — strumento tecnico admin — non visibile in navigazione prodotto
      </p>
    </div>
  );
}

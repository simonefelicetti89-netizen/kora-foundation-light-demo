'use client';

// app/admin/companies/new/_components/CreateLiveCompanyForm.tsx
// B38 — Unified create live company + provision first Company Admin form.
// KORA_ADMIN only. No demo data. No fake credentials.

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface CreateResult {
  ok:                 boolean;
  provisioningStatus: 'complete' | 'partial_failure' | 'user_conflict';
  tenantId:           string;
  tenantCode:         string;
  tenantCodeWasGenerated?: boolean;
  companyName:        string;
  adminEmail:         string;
  adminUserId?:       string;
  adminRole?:         string;
  inviteStatus?:      'sent' | 'not_sent' | 'user_existed';
  inviteNote?:        string;
  baselineCreated?:   boolean;
  warnings?:          string[];
  links?: {
    companyConsole:    string;
    companyWorkspace:  string;
    manageUsers:       string;
    livePreview:       string;
  };
  error?:    string;
  recovery?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 20);
}

const INDUSTRY_OPTIONS = [
  '', 'Manifatturiero', 'Servizi', 'Tecnologia', 'Sanità', 'Retail',
  'Finanza & Assicurazioni', 'Logistica', 'Energia', 'Costruzioni',
  'Pubblica Amministrazione', 'Istruzione', 'Media & Comunicazione', 'Altro',
];

const SIZE_BANDS = [
  '', '<50', '50–200', '200–500', '500–1000', '1000–5000', '>5000',
];

// ── Main form ─────────────────────────────────────────────────────────────────

export function CreateLiveCompanyForm({ userEmail }: { userEmail: string }) {
  const [companyName,      setCompanyName]      = useState('');
  const [tenantCode,       setTenantCode]        = useState('');
  const [tenantCodeEdited, setTenantCodeEdited]  = useState(false);
  const [country,          setCountry]           = useState('IT');
  const [industry,         setIndustry]          = useState('');
  const [sizeBand,         setSizeBand]          = useState('');
  const [estWorkers,       setEstWorkers]         = useState('');
  const [period,           setPeriod]            = useState('2026-Q1');
  const [adminName,        setAdminName]         = useState('');
  const [adminEmail,       setAdminEmail]        = useState('');
  const [sendInvite,       setSendInvite]        = useState(true);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'partial' | 'error'>('idle');
  const [result, setResult] = useState<CreateResult | null>(null);

  // Auto-generate tenant code from company name
  useEffect(() => {
    if (!tenantCodeEdited && companyName) {
      setTenantCode(generateCode(companyName));
    }
  }, [companyName, tenantCodeEdited]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setResult(null);

    try {
      const res = await fetch('/api/admin/live-company', {
        method:  'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName:      companyName.trim(),
          tenantCode:       tenantCode.trim() || undefined,
          country:          country || undefined,
          industry:         industry || undefined,
          companySizeBand:  sizeBand || undefined,
          estimatedWorkers: estWorkers ? parseInt(estWorkers, 10) : undefined,
          assessmentPeriod: period.trim() || undefined,
          adminName:        adminName.trim() || undefined,
          adminEmail:       adminEmail.trim(),
          sendInvite,
        }),
      });

      const data = await res.json() as CreateResult;
      setResult(data);

      if (res.ok && data.ok && data.provisioningStatus === 'complete') {
        setStatus('success');
      } else if (res.status === 207 || data.provisioningStatus === 'partial_failure') {
        setStatus('partial');
      } else {
        setStatus('error');
      }
    } catch {
      setResult({ ok: false, provisioningStatus: 'partial_failure', tenantId: '', tenantCode: '', companyName: '', adminEmail: '', error: 'Errore di rete.' });
      setStatus('error');
    }
  }

  function resetForm() {
    setCompanyName(''); setTenantCode(''); setTenantCodeEdited(false);
    setCountry('IT'); setIndustry(''); setSizeBand('');
    setEstWorkers(''); setPeriod('2026-Q1'); setAdminName(''); setAdminEmail('');
    setSendInvite(true); setStatus('idle'); setResult(null);
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (status === 'success' && result) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 space-y-5">
        <div className="rounded-xl border border-[rgba(47,125,85,0.22)] bg-green-50 px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-green-600 text-lg font-bold mt-0.5">✓</span>
            <div>
              <p className="text-base font-bold text-[#2F7D55]">Azienda live creata</p>
              <p className="text-sm text-green-600 mt-0.5">
                {result.companyName} ({result.tenantCode})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            {[
              ['Tenant Code',       result.tenantCode],
              ['Company Admin',     result.adminEmail],
              ['Ruolo',             result.adminRole ?? 'COMPANY_ADMIN'],
              ['Baseline workforce', result.baselineCreated ? '✓ Creato' : '— Non creato'],
            ].map(([label, val]) => (
              <div key={label} className="rounded border border-[rgba(47,125,85,0.22)] bg-[#F8F6F1] px-3 py-2">
                <p className="text-[9px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-[rgba(6,3,43,0.78)] font-semibold">{val}</p>
              </div>
            ))}
          </div>

          {/* Invite status */}
          <div className={`rounded-lg border px-4 py-2.5 text-[10.5px] ${
            result.inviteStatus === 'sent'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : result.inviteStatus === 'user_existed'
              ? 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] text-[rgba(6,3,43,0.72)]'
              : 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]'
          }`}>
            <span className="font-semibold">
              {result.inviteStatus === 'sent' ? '✉ Invito inviato' :
               result.inviteStatus === 'user_existed' ? '↩ Utente esistente collegato' :
               '⚠ Invito non inviato — configurare SMTP'}
            </span>
            {result.inviteNote && (
              <p className="mt-0.5 font-normal">{result.inviteNote}</p>
            )}
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-3 py-2 text-[10px] text-[#8A5A00]">
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}

          {/* Generated code note */}
          {result.tenantCodeWasGenerated && (
            <p className="text-[10px] text-[rgba(6,3,43,0.52)]">
              Codice tenant generato automaticamente da &ldquo;{result.companyName}&rdquo;.
            </p>
          )}

          {/* Links */}
          {result.links && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-green-100">
              <Link
                href={result.links.companyConsole}
                className="rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
              >
                Company Console →
              </Link>
              <Link
                href={result.links.manageUsers}
                className="rounded-lg border border-[rgba(6,3,43,0.14)] text-[rgba(6,3,43,0.78)] px-4 py-2 text-xs font-semibold hover:bg-[rgba(6,3,43,0.03)] transition-colors"
              >
                Gestisci utenti
              </Link>
              <Link
                href={result.links.companyWorkspace}
                className="rounded-lg border border-[rgba(6,3,43,0.14)] text-[rgba(6,3,43,0.78)] px-4 py-2 text-xs font-semibold hover:bg-[rgba(6,3,43,0.03)] transition-colors"
              >
                Workspace Admin view
              </Link>
            </div>
          )}

          <button
            onClick={resetForm}
            className="text-[10.5px] text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.78)] underline"
          >
            Crea un'altra azienda
          </button>
        </div>
      </div>
    );
  }

  // ── Partial failure state ─────────────────────────────────────────────────
  if (status === 'partial' && result) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 space-y-5">
        <div className="rounded-xl border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-[#D99A2B] text-lg font-bold mt-0.5">⚠</span>
            <div>
              <p className="text-base font-bold text-[#8A5A00]">Creazione parziale</p>
              <p className="text-sm text-[#D99A2B] mt-0.5">
                {result.tenantId
                  ? `Tenant ${result.tenantCode} creato. Provisioning utente non completato.`
                  : result.error ?? 'Errore sconosciuto.'}
              </p>
            </div>
          </div>

          {result.recovery && (
            <div className="rounded-lg border border-amber-300 bg-[#F8F6F1] px-4 py-3 text-[10.5px] text-[#8A5A00]">
              <span className="font-semibold">Azione richiesta: </span>{result.recovery}
            </div>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <ul className="space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-[10px] text-[#8A5A00]">⚠ {w}</li>
              ))}
            </ul>
          )}

          {result.links && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-100">
              <Link href={result.links.companyConsole}
                className="rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors">
                Company Console →
              </Link>
              {result.links.manageUsers && (
                <Link href={result.links.manageUsers}
                  className="rounded-lg border border-[rgba(6,3,43,0.14)] text-[rgba(6,3,43,0.78)] px-4 py-2 text-xs font-semibold hover:bg-[rgba(6,3,43,0.03)] transition-colors">
                  Gestisci utenti
                </Link>
              )}
            </div>
          )}

          <button onClick={resetForm} className="text-[10.5px] text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.78)] underline">
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-6 px-3 space-y-5">

      {/* Header */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">KORA Admin · Pilot</p>
          <h1 className="text-xl font-bold text-white tracking-tight">Crea Azienda Live</h1>
          <p className="text-sm text-white/45 mt-0.5">
            Crea un nuovo tenant live e provisiona il primo Company Admin
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1 shrink-0">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#FFFFFF]">KORA_ADMIN</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          <span className="rounded border border-white/15 bg-[#F8F6F1]/5 px-1.5 py-0.5 text-[9px] text-white/40 font-semibold uppercase">LIVE PILOT</span>
        </div>
      </div>

      {/* Error banner */}
      {status === 'error' && result?.error && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-xs text-[#9E3B2F]">
          ⚠ {result.error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Company section ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-5 space-y-4">
          <p className="text-[10px] font-bold text-[rgba(6,3,43,0.52)] uppercase tracking-widest">Dati Azienda</p>

          {/* Company Name */}
          <Field label="Nome azienda *">
            <input
              required type="text" value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Acme S.p.A."
              className="input-field"
            />
          </Field>

          {/* Tenant Code */}
          <Field label="Codice tenant (generato automaticamente)" hint="Solo lettere maiuscole, cifre e trattini. 2–32 caratteri.">
            <input
              type="text" value={tenantCode}
              onChange={e => { setTenantCode(e.target.value.toUpperCase()); setTenantCodeEdited(true); }}
              placeholder="ACME-SPA"
              pattern="[A-Z0-9-]{2,32}"
              className="w-full rounded border border-[rgba(6,3,43,0.14)] px-3 py-2 text-sm font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            {!tenantCodeEdited && companyName && (
              <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-0.5">
                Generato automaticamente · modificabile
              </p>
            )}
          </Field>

          {/* Grid: country, industry, size band */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Paese">
              <input type="text" value={country} maxLength={2}
                onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="IT" className="w-full rounded border border-[rgba(6,3,43,0.14)] px-3 py-2 text-sm font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </Field>
            <Field label="Settore">
              <select value={industry} onChange={e => setIndustry(e.target.value)} className="input-field">
                {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
              </select>
            </Field>
            <Field label="Fascia dimensionale">
              <select value={sizeBand} onChange={e => setSizeBand(e.target.value)} className="input-field">
                {SIZE_BANDS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
              </select>
            </Field>
          </div>

          {/* Grid: estimated workers, period */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dipendenti stimati" hint="Solo aggregato. N≥10 per baseline. Nessun dato individuale.">
              <input type="number" min={0} value={estWorkers}
                onChange={e => setEstWorkers(e.target.value)}
                placeholder="es. 120" className="input-field tabular-nums" />
            </Field>
            <Field label="Periodo di assessment">
              <input type="text" value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="2026-Q1" className="w-full rounded border border-[rgba(6,3,43,0.14)] px-3 py-2 text-sm font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400" />
            </Field>
          </div>
        </div>

        {/* ── Company Admin section ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-5 space-y-4">
          <p className="text-[10px] font-bold text-[rgba(6,3,43,0.52)] uppercase tracking-widest">Primo Company Admin</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome (facoltativo)">
              <input type="text" value={adminName}
                onChange={e => setAdminName(e.target.value)}
                placeholder="es. Marco Bianchi" className="input-field" />
            </Field>
            <Field label="Email Company Admin *">
              <input required type="email" value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@azienda.it" className="input-field" />
            </Field>
          </div>

          <div className="flex items-center gap-2.5">
            <input type="checkbox" id="sendInvite" checked={sendInvite}
              onChange={e => setSendInvite(e.target.checked)}
              className="rounded border-[rgba(6,3,43,0.14)] text-[#C76F3D]" />
            <label htmlFor="sendInvite" className="text-xs text-[rgba(6,3,43,0.78)] cursor-pointer">
              Invia email di invito per impostare la password
            </label>
          </div>

          {!sendInvite && (
            <div className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-3 py-2 text-[10px] text-[#8A5A00]">
              ⚠ L&apos;utente sarà creato senza invito email. Dovrai inviare manualmente il link di accesso.
            </div>
          )}

          <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[9.5px] text-[rgba(6,3,43,0.52)] space-y-0.5">
            <p className="font-semibold text-[rgba(6,3,43,0.62)]">Ruolo: COMPANY_ADMIN</p>
            <p>Il primo utente deve essere Company Admin. Viewer può essere aggiunto successivamente.</p>
            <p>Il ruolo è impostato via Supabase app_metadata — non modificabile dall&apos;utente.</p>
          </div>
        </div>

        {/* ── Methodology caveat ─────────────────────────────────────────────── */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-[9.5px] text-[rgba(6,3,43,0.52)] space-y-1">
          <p className="font-semibold text-[rgba(6,3,43,0.62)]">Nota metodologica</p>
          <p>KORA misura le organizzazioni, non gli individui. Nessun dato individuale del lavoratore è visibile al datore di lavoro (soglia privacy N≥10).</p>
          <p>Foundation Light v0.1 — calibrazione pre-empirica. Non certifica conformità normativa e non sostituisce consulenza ESG, legale o fiscale.</p>
          <p>Questo flusso è pilot-grade, non production IAM. Gestito da KORA Admin.</p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-lg bg-[#06032B] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#1a1756] disabled:opacity-50 transition-colors"
          >
            {status === 'loading' ? '⏳ Creazione in corso…' : 'Crea Azienda Live'}
          </button>
          <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.78)] underline">
            ← Company Console
          </Link>
        </div>

      </form>
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-0.5">{hint}</p>}
    </div>
  );
}

'use client';
// /admin/companies/[companyId]/users — B95-B Task 3
// Company User Management — KORA Admin understands whether the company has login credentials.
// No real email. No real auth changes. No worker PIB.

import { use } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';

// ── Status badge config ───────────────────────────────────────────────────────

const ACCOUNT_STATUS: Record<string, { label: string; classes: string }> = {
  active_demo: { label: 'ATTIVO (demo)',  classes: 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.15)] text-[#2F7D55]' },
  invited:     { label: 'INVITATO',      classes: 'border-blue-200 bg-blue-50 text-blue-700' },
  draft:       { label: 'BOZZA',         classes: 'border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.45)]' },
  disabled:    { label: 'DISABILITATO',  classes: 'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]' },
};

const INVITE_STATUS: Record<string, { label: string; color: string }> = {
  not_sent: { label: 'Non inviato',  color: 'rgba(6,3,43,0.38)' },
  pending:  { label: 'In attesa',    color: '#8A5A00' },
  accepted: { label: 'Accettato',    color: '#2F7D55' },
  revoked:  { label: 'Revocato',     color: '#9E3B2F' },
};

const ROLE_LABEL: Record<string, string> = {
  COMPANY_ADMIN: 'Company Admin',
  WORKER:        'Lavoratore',
  KORA_ADMIN:    'KORA Admin',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompanyUsersPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params);

  const tenant   = tenantService.getTenant(companyId);
  const accounts = accountProvisioningService.getAccountsForCompany(companyId);

  const companyAdmins  = accounts.filter((u) => u.role === 'COMPANY_ADMIN');
  const hasActiveAdmin = companyAdmins.some((u) => u.account_status === 'active_demo');

  if (!tenant) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">KORA Admin</p>
        <h1 className="text-xl font-bold text-[#06032B]">Azienda non trovata</h1>
        <p className="text-xs text-[rgba(6,3,43,0.52)] font-mono">company_id: {companyId}</p>
        <Link href="/admin/companies" className="text-xs font-semibold text-[#C76F3D] hover:underline">← Company Mission Control</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6" data-testid="company-users-page">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <nav className="flex items-center gap-1.5 text-[10px] text-[rgba(6,3,43,0.40)] mb-1.5 flex-wrap">
          <Link href="/admin/pipeline"   className="hover:text-[rgba(6,3,43,0.62)]">Pilot Lifecycle</Link>
          <span>/</span>
          <Link href="/admin/companies"  className="hover:text-[rgba(6,3,43,0.62)]">Company Console</Link>
          <span>/</span>
          <Link href={`/admin/companies/${companyId}`} className="hover:text-[rgba(6,3,43,0.62)]">{tenant.company_name}</Link>
          <span>/</span>
          <span className="font-semibold text-[rgba(6,3,43,0.62)]">Utenti</span>
        </nav>
        <h1 className="text-xl font-bold text-[#06032B]">{tenant.company_name}</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">Gestione Utenti Aziendali — KORA Admin</p>
        <p className="text-[10px] font-mono text-[rgba(6,3,43,0.30)] mt-0.5">
          company_id: {companyId} · tenant_id: {tenant.tenant_id} · synthetic_demo_data: true
        </p>
      </div>

      {/* ── Admin-only notice ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.07)] px-4 py-2.5 text-xs text-[rgba(6,3,43,0.80)] leading-relaxed">
        <span className="font-semibold">Gestione Utenti — KORA Admin only.</span>{' '}
        Questa console mostra gli account aziendali configurati per il workspace KORA.
        In Foundation Light, le credenziali sono demo — nessuna email viene inviata, nessun account reale viene creato.
      </div>

      {/* ── Access Status Summary ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-lg border p-3 text-center ${hasActiveAdmin ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.10)]' : 'border-[rgba(217,154,43,0.28)] bg-[rgba(217,154,43,0.07)]'}`}>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.45)]">Accesso Workspace</p>
          <p className={`text-xs font-bold mt-1 ${hasActiveAdmin ? 'text-[#2F7D55]' : 'text-[#8A5A00]'}`}>
            {hasActiveAdmin ? '✓ Attivo' : '⚠ Non attivo'}
          </p>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.45)]">Company Admin</p>
          <p className="text-xl font-bold text-[rgba(6,3,43,0.78)] mt-1">{companyAdmins.length}</p>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.45)]">Ruolo unico</p>
          <p className="text-xl font-bold text-[rgba(6,3,43,0.78)] mt-1">ADMIN</p>
        </div>
      </div>

      {/* ── Foundation Light access note ─────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(74,127,224,0.22)] bg-[rgba(74,127,224,0.05)] px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-[rgba(74,127,224,0.90)]">Foundation Light — Accesso Demo</p>
        <p className="text-[10px] text-[rgba(6,3,43,0.62)] leading-relaxed">
          Gli utenti in stato <strong>ATTIVO (demo)</strong> possono accedere al workspace aziendale tramite
          il RoleSwitcher nell&apos;interfaccia di demo. Nessuna password reale è gestita in Foundation Light.
          In produzione (Gate 2 → Gate 3), ogni utente riceverà un invito con credenziali sicure via email.
        </p>
        <p className="text-[10px] font-mono text-[rgba(6,3,43,0.38)]">
          no_email_sending · no_real_auth · foundation_light_demo
        </p>
      </div>

      {/* ── Company Admins ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          Company Admin — {companyAdmins.length} utente/i
        </p>

        {companyAdmins.length === 0 ? (
          <div className="rounded border border-dashed border-[rgba(6,3,43,0.12)] bg-[rgba(6,3,43,0.02)] px-4 py-5 text-center">
            <p className="text-sm font-semibold text-[rgba(6,3,43,0.52)] mb-1">Nessun Company Admin configurato</p>
            <p className="text-[11px] text-[rgba(6,3,43,0.40)] mb-4">
              Crea il primo Company Admin per consentire all&apos;azienda di accedere al proprio workspace KORA.
            </p>
            <Link
              href="/admin/company-users"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#06032B] px-4 py-2 text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.82)] transition-colors"
            >
              + Crea utente aziendale →
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
            <div className="divide-y divide-[rgba(6,3,43,0.05)]">
              {companyAdmins.map((user) => {
                const aBdg = ACCOUNT_STATUS[user.account_status] ?? ACCOUNT_STATUS.draft;
                const iBdg = INVITE_STATUS[user.invitation_status] ?? INVITE_STATUS.not_sent;
                return (
                  <div key={user.user_id} className="px-4 py-3" data-testid={`user-row-${user.user_id}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{user.display_name}</p>
                          <span className="rounded border border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.04)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.55)]">
                            {ROLE_LABEL[user.role] ?? user.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-[rgba(6,3,43,0.52)] font-mono mt-0.5">{user.email ?? '—'}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${aBdg.classes}`}>
                            {aBdg.label}
                          </span>
                          <span style={{ fontSize: 10, color: iBdg.color }}>
                            Invito: {iBdg.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-right space-y-1">
                        <p className="text-[rgba(6,3,43,0.38)]">user_id</p>
                        <p className="font-mono text-[rgba(6,3,43,0.50)]">{user.user_id.slice(0, 16)}…</p>
                      </div>
                    </div>
                    {user.visible_sections.length > 0 && (
                      <div className="mt-2 text-[10px] text-[rgba(6,3,43,0.40)]">
                        Sezioni visibili: {user.visible_sections.slice(0, 5).join(', ')}{user.visible_sections.length > 5 ? '…' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>


      {/* ── CTA: Create new user ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/admin/company-users"
          className="rounded-md bg-[#06032B] px-4 py-2 text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.82)] transition-colors"
        >
          + Crea utente aziendale
        </Link>
        <Link
          href="/admin/companies/new"
          className="rounded border border-[rgba(6,3,43,0.12)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
        >
          Setup guidato →
        </Link>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <div className="border-t border-[rgba(6,3,43,0.06)] pt-4 flex flex-wrap gap-4 text-xs">
        <Link href="/admin/pipeline"                        className="text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">← Pilot Lifecycle</Link>
        <Link href={`/admin/companies/${companyId}`}        className="text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">Company Control Room</Link>
        <Link href={`/admin/companies/${companyId}/workforce`} className="text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.72)] underline underline-offset-2">Workforce Management →</Link>
      </div>

      <p className="text-[9px] font-mono text-[rgba(6,3,43,0.25)]">
        KORA Admin · Utenti Aziendali · B95-B · synthetic_demo_data: true · no_auth_changes · no_email_sending · company_id: {companyId}
      </p>
    </div>
  );
}

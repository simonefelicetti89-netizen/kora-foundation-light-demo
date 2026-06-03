// app/company/workspace/layout.tsx
// B36 PART 4 — Server-side layout protection for the company workspace.
// Requires a real Supabase session with COMPANY_ADMIN or COMPANY_VIEWER role.
// KORA_ADMIN cannot access this route — it requires a live company tenant session.

import { requireCompanyUser, getCurrentKoraUser, isKoraAuthError } from '@/lib/auth/kora-session';
import Link from 'next/link';

export default async function CompanyWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const authResult = await requireCompanyUser();

  if (isKoraAuthError(authResult)) {
    const status = authResult.status;
    const is401 = status === 401;

    // Detect whether the blocked session belongs to a KORA_ADMIN —
    // show a specific explanation rather than a generic error wall.
    let isAdmin = false;
    if (!is401) {
      const adminUser = await getCurrentKoraUser();
      isAdmin = adminUser?.koraRole === 'KORA_ADMIN';
    }

    if (isAdmin) {
      return (
        <div className="max-w-lg mx-auto mt-20 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm space-y-5">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
              Company Workspace · Accesso sessione reale
            </p>
            <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
              Questo workspace richiede una sessione azienda
            </h1>
            <p className="text-sm text-[rgba(6,3,43,0.55)] leading-relaxed">
              <code className="rounded bg-[rgba(6,3,43,0.06)] px-1.5 py-0.5 text-xs font-mono">/company/workspace</code>{' '}
              è la vista autenticata per aziende pilot reali. Richiede una sessione Supabase con{' '}
              <code className="rounded bg-[rgba(6,3,43,0.06)] px-1 py-0.5 text-xs font-mono">kora_role = COMPANY_ADMIN</code>{' '}
              e un <code className="rounded bg-[rgba(6,3,43,0.06)] px-1 py-0.5 text-xs font-mono">kora_tenant_id</code>{' '}
              assegnato — non accessibile con una sessione KORA_ADMIN.
            </p>
          </div>

          <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.06)] px-4 py-3 text-sm text-[rgba(6,3,43,0.72)] leading-relaxed">
            Per revisionare l&apos;esperienza Company in demo, usa le pagine Company basate su dati sintetici:
          </div>

          <div className="space-y-2">
            {[
              { href: '/company',              label: 'Executive Cockpit' },
              { href: '/company/kora-index',   label: 'KORA Index™' },
              { href: '/company/financial',    label: 'Budget-to-Human-Impact™' },
              { href: '/company/activation',   label: 'Activation Debt™' },
              { href: '/company/reports',      label: 'Report direzionali' },
              { href: '/company/contribution', label: 'Contribution Intelligence™' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-2.5 text-sm font-medium text-[rgba(6,3,43,0.78)] hover:border-[rgba(199,111,61,0.40)] hover:text-[#06032B] transition-colors"
              >
                {label}
                <span className="text-[rgba(6,3,43,0.30)]">→</span>
              </Link>
            ))}
          </div>

          <p className="text-[10px] text-[rgba(6,3,43,0.35)] pt-1">
            KORA Foundation Light · Company Workspace · Richiede sessione COMPANY_ADMIN
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto mt-20 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center space-y-5">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
            {is401 ? 'Accesso al workspace aziendale' : 'Workspace non accessibile'}
          </h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">
            {is401
              ? 'Per accedere al workspace aziendale è necessaria una sessione autenticata come Company Admin o Company Viewer.'
              : 'Il tuo account non ha accesso a questo workspace. Contatta il tuo KORA Admin.'}
          </p>
        </div>

        {is401 && (
          <Link
            href="/admin/login"
            className="inline-block bg-[#06032B] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#06032B] transition-colors">
            Accedi
          </Link>
        )}

        <p className="text-[10px] text-[rgba(6,3,43,0.40)] pt-2">
          KORA Foundation Light · Company Workspace · Accesso autenticato richiesto
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

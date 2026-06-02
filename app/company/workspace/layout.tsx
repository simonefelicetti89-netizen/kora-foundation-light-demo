// app/company/workspace/layout.tsx
// B36 PART 4 — Server-side layout protection for the company workspace.
// Requires COMPANY_ADMIN or COMPANY_VIEWER session.
// If unauthenticated: shows access denied (not a redirect to login, to avoid infinite loops in demo).

import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import Link from 'next/link';

export default async function CompanyWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const authResult = await requireCompanyUser();

  if (isKoraAuthError(authResult)) {
    const status = authResult.status;
    const is401 = status === 401;

    return (
      <div className="max-w-lg mx-auto mt-20 p-8 border border-slate-200 rounded-xl bg-white shadow-sm text-center space-y-5">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-slate-800">
            {is401 ? 'Accesso al workspace aziendale' : 'Workspace non accessibile'}
          </h1>
          <p className="text-sm text-slate-500">
            {is401
              ? 'Per accedere al workspace aziendale è necessaria una sessione autenticata come Company Admin o Company Viewer.'
              : 'Il tuo account non ha accesso a questo workspace. Contatta il tuo KORA Admin.'}
          </p>
        </div>

        {is401 && (
          <Link
            href="/admin/login"
            className="inline-block bg-[#06032B] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-slate-800 transition-colors">
            Accedi
          </Link>
        )}

        <p className="text-[10px] text-slate-400 pt-2">
          KORA Foundation Light · Company Workspace · Accesso autenticato richiesto
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

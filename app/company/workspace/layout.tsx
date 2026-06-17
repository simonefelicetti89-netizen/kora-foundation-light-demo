// app/company/workspace/layout.tsx
// B36 PART 4 — Server-side layout protection for the company workspace.
// Requires a real Supabase session with COMPANY_ADMIN role (B143: COMPANY_VIEWER rimosso).
//
// B168-P3: KORA_ADMIN is now admitted for service access (defense in depth layer 2).
// The root company layout (app/company/layout.tsx) handles KORA_ADMIN auth and banner.
// This sub-layout passes through when KORA_ADMIN is in context.

import { requireCompanyUser, getCurrentKoraUser, isKoraAuthError } from '@/lib/auth/kora-session';
import Link from 'next/link';

export default async function CompanyWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const authResult = await requireCompanyUser();

  if (isKoraAuthError(authResult)) {
    const status = authResult.status;
    const is401 = status === 401;

    // B168-P3: KORA_ADMIN in this sub-layout means root layout already admitted them
    // with audit log + banner. Pass through — root layout is the auth boundary.
    if (!is401) {
      const adminUser = await getCurrentKoraUser();
      if (adminUser?.koraRole === 'KORA_ADMIN') {
        return <>{children}</>;
      }
    }

    return (
      <div className="max-w-lg mx-auto mt-20 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center space-y-5">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-[rgba(6,3,43,0.90)]">
            {is401 ? 'Accesso al workspace aziendale' : 'Workspace non accessibile'}
          </h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">
            {is401
              ? 'Per accedere al workspace aziendale è necessaria una sessione autenticata come Company Admin.'
              : 'Il tuo account non ha accesso a questo workspace. Contatta il tuo KORA Admin.'}
          </p>
        </div>

        {is401 && (
          <Link
            href="/company/login"
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

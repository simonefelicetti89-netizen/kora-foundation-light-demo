// app/company/workspace/layout.tsx
// B36 PART 4 — Server-side layout protection for the company workspace.
// Requires COMPANY_ADMIN or COMPANY_VIEWER session.
//
// Special case: if the session belongs to a KORA_ADMIN (who logged in via /admin/login),
// they are redirected to /admin/company-workspace — the admin version of the same view.
// This avoids a confusing error wall for admin users switching to a company role in the demo.
// Tenant isolation is preserved: KORA_ADMIN does not gain company-user rights here;
// they are redirected to a page they already have access to via admin auth.

import { requireCompanyUser, getCurrentKoraUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CompanyWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const authResult = await requireCompanyUser();

  if (isKoraAuthError(authResult)) {
    const status = authResult.status;
    const is401 = status === 401;

    // If the user is authenticated but has the wrong role (403),
    // check whether they are a KORA_ADMIN and redirect them appropriately.
    // This handles the demo scenario where an admin has an active session and
    // switches the role-switcher to COMPANY_ADMIN, then clicks the workspace link.
    if (!is401) {
      const adminUser = await getCurrentKoraUser();
      if (adminUser?.koraRole === 'KORA_ADMIN') {
        redirect('/admin/company-workspace');
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

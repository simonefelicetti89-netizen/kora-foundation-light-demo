// app/company/workspace/page.tsx
// B36 PART 4 — Company workspace — session-authenticated access.
// This is the real company-facing entry point (not demo-state based).
// requireCompanyUser() is called in layout.tsx — this page only runs if session is valid.

import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { CompanyWorkspaceView } from './_components/CompanyWorkspaceView';

export default async function CompanyWorkspacePage() {
  // Auth is guaranteed by layout.tsx — this is a safety re-check for direct page access
  const authResult = await requireCompanyUser();

  if (isKoraAuthError(authResult)) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 border border-slate-200 rounded-xl bg-white shadow-sm text-center">
        <p className="text-sm text-slate-600">Accesso negato. Ricarica la pagina o contatta il tuo KORA Admin.</p>
      </div>
    );
  }

  return (
    <CompanyWorkspaceView
      userEmail={authResult.email}
      userRole={authResult.koraRole}
    />
  );
}

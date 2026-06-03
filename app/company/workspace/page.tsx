// app/company/workspace/page.tsx
// C-00: Company Workspace — vista autenticata per sessioni COMPANY_ADMIN reali.
// Scopo: entry point per pilot aziendali live. Dati reali, sessione Supabase autenticata.
// Demo: KORA_ADMIN viene reindirizzato a /admin/company-workspace con messaggio esplicativo.
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
      <div className="max-w-md mx-auto mt-16 p-8 border border-[rgba(6,3,43,0.08)] rounded-xl bg-[#F8F6F1] shadow-sm text-center">
        <p className="text-sm text-[rgba(6,3,43,0.62)]">Accesso negato. Ricarica la pagina o contatta il tuo KORA Admin.</p>
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

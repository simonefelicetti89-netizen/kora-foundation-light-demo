// A-11: Evidence Archive — archivio evidenze per company.
// Scopo: visualizzare e gestire i record evidenza (batch, iniziative,
//        livelli L0–L4, lifecycle allegati) per una company specifica.
// app/admin/company-evidence-archive/page.tsx
// B29: Company Evidence Archive — read-only evidence lineage page.

import { Suspense } from 'react';
import { CompanyEvidenceArchivePanel } from './_components/CompanyEvidenceArchivePanel';

export const metadata = {
  title: 'Evidence Archive — KORA Admin',
};

export default function CompanyEvidenceArchivePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen text-sm text-[rgba(6,3,43,0.52)]">
        Caricamento Evidence Archive…
      </div>
    }>
      <CompanyEvidenceArchivePanel />
    </Suspense>
  );
}

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
      <div className="flex items-center justify-center min-h-screen text-sm text-slate-500">
        Caricamento Evidence Archive…
      </div>
    }>
      <CompanyEvidenceArchivePanel />
    </Suspense>
  );
}

// app/company/setup-password/page.tsx
// Password setup page — shown after a company user clicks the KORA invite email.
// Suspense boundary required because _form.tsx uses useSearchParams().

import { Suspense } from 'react';
import { SetupPasswordForm } from './_form';

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500 text-sm">Caricamento…</p>
        </div>
      }
    >
      <SetupPasswordForm />
    </Suspense>
  );
}

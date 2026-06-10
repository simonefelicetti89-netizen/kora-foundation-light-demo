// app/worker/setup-password/page.tsx
// Password setup page for workers accepting a KORA invite.
// Suspense boundary required because _form.tsx uses useSearchParams().

import { Suspense } from 'react';
import { WorkerSetupPasswordForm } from './_form';

export default function WorkerSetupPasswordPage() {
  return (
    <Suspense fallback={null}>
      <WorkerSetupPasswordForm />
    </Suspense>
  );
}

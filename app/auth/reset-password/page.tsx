// app/auth/reset-password/page.tsx
// Set new password — shown after a user clicks the recovery email link.
// Session is already established by /auth/callback before this page renders.
// Suspense boundary required because _form.tsx uses useSearchParams().

import { Suspense } from 'react';
import { ResetPasswordForm } from './_form';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: TOKENS.ink }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>Caricamento…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

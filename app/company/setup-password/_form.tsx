'use client';

// app/company/setup-password/_form.tsx
// Password setup form for company users accepting a KORA invite.
// Requires a valid Supabase session (established by /auth/callback before redirect).
// On success: calls supabase.auth.updateUser({ password }) and redirects to workspace.

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function SetupPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlError            = searchParams.get('error');
  const urlErrorDescription = searchParams.get('error_description');

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Token error (expired or invalid invite link)
  if (urlError) {
    const description = urlErrorDescription
      ? decodeURIComponent(urlErrorDescription.replace(/\+/g, ' '))
      : null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link non valido o scaduto</h1>
          <p className="text-gray-600 mb-4">
            Il link di invito non è più valido. Contatta il tuo amministratore KORA per ricevere un nuovo invito.
          </p>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('La password deve essere di almeno 8 caratteri.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Le password non coincidono.');
      return;
    }

    setStatus('loading');

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }

      setStatus('success');
      router.push('/company/workspace');
    } catch {
      setStatus('error');
      setErrorMsg('Errore imprevisto. Riprova o contatta il supporto KORA.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Imposta la tua password</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Benvenuto in KORA. Crea la tua password per accedere alla Company Area.
          </p>
        </div>

        {status === 'success' ? (
          <p className="text-center text-green-700 text-sm">Password impostata. Accesso in corso…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={status === 'loading'}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="Almeno 8 caratteri"
              />
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Conferma password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                disabled={status === 'loading'}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="Ripeti la password"
              />
            </div>

            {errorMsg && (
              <p role="alert" className="text-sm text-red-600">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'loading' ? 'Impostazione in corso…' : 'Imposta password e accedi'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

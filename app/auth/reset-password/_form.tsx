'use client';

// app/auth/reset-password/_form.tsx
// Password reset form — sets a new password for the authenticated session.
// Session is established by /auth/callback code exchange before this form renders.
//
// On success: redirects role-aware:
//   KORA_ADMIN             → /admin
//   COMPANY_ADMIN/VIEWER   → /company/workspace
//   WORKER                 → /worker/onboarding (gate redirects to workspace if done)
//   unknown                → /company/login

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const ROLE_REDIRECT: Record<string, string> = {
  KORA_ADMIN:     '/admin',
  COMPANY_ADMIN:  '/company/workspace',
  COMPANY_VIEWER: '/company/workspace',
  WORKER:         '/worker/onboarding',
};

export function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlError            = searchParams.get('error');
  const urlErrorDescription = searchParams.get('error_description');

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Token exchange error from /auth/callback
  if (urlError) {
    const description = urlErrorDescription
      ? decodeURIComponent(urlErrorDescription.replace(/\+/g, ' '))
      : null;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: TOKENS.ink, padding: '24px' }}>
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, background: TOKENS.surface, border: TOKENS.cardBorderStrong, borderRadius: TOKENS.cardRadius, boxShadow: '0 24px 80px rgba(6,3,43,0.35)', padding: '36px 32px', textAlign: 'center' }}>
          <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.1rem', color: TOKENS.ink, marginBottom: 12 }}>
            Link scaduto o non valido
          </p>
          <p style={{ fontFamily: FONT, fontSize: 13, color: TOKENS.inkSecondary, lineHeight: 1.6, marginBottom: 16 }}>
            Il link di recupero password non è più valido. Richiedine uno nuovo.
          </p>
          {description && (
            <p style={{ fontFamily: FONT, fontSize: 11, color: TOKENS.inkHint, marginBottom: 20 }}>{description}</p>
          )}
          <Link
            href="/auth/forgot-password"
            style={{ display: 'inline-block', fontFamily: FONT, fontSize: '13px', fontWeight: 700, background: TOKENS.ink, color: '#fff', borderRadius: 10, padding: '10px 20px', textDecoration: 'none' }}
          >
            Richiedi nuovo link →
          </Link>
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

      // Determine redirect based on role in session
      const { data: { user } } = await supabase.auth.getUser();
      const koraRole = user?.app_metadata?.kora_role as string | undefined;
      const redirectTo = (koraRole && ROLE_REDIRECT[koraRole]) ?? '/company/login';

      setStatus('success');
      router.push(redirectTo);
    } catch {
      setStatus('error');
      setErrorMsg('Errore imprevisto. Riprova o contatta il supporto KORA.');
    }
  }

  const inputStyle: React.CSSProperties = {
    fontFamily:   FONT,
    fontSize:     14,
    color:        TOKENS.ink,
    background:   TOKENS.surface,
    border:       TOKENS.cardBorderStrong,
    borderRadius: 10,
    padding:      '11px 14px',
    width:        '100%',
    outline:      'none',
    transition:   'border-color 200ms ease',
    display:      'block',
  };

  return (
    <div
      style={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     TOKENS.ink,
        padding:        '24px',
      }}
    >
      <div
        style={{
          position:     'relative',
          zIndex:       1,
          width:        '100%',
          maxWidth:     400,
          background:   TOKENS.surface,
          border:       TOKENS.cardBorderStrong,
          borderRadius: TOKENS.cardRadius,
          boxShadow:    '0 24px 80px rgba(6,3,43,0.35)',
          padding:      '36px 32px',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <Image src="/kora/logo-dark.png" alt="KORA" width={110} height={34} priority style={{ height: 30, width: 'auto' }} />
        </div>

        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 8 }}>
            Recupero accesso
          </p>
          <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.375rem', letterSpacing: '-0.025em', lineHeight: 1.1, color: TOKENS.ink, marginBottom: 6 }}>
            Nuova password
          </h1>
          <p style={{ fontFamily: FONT, fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
            Scegli una nuova password sicura per il tuo account KORA.
          </p>
        </div>

        {status === 'success' ? (
          <p style={{ fontFamily: FONT, fontSize: 13, color: '#2F7D55', textAlign: 'center' }}>
            Password aggiornata. Accesso in corso…
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor="password" style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>
                  Nuova password
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
                  placeholder="Almeno 8 caratteri"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = ''; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor="confirm" style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>
                  Conferma nuova password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={status === 'loading'}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = ''; }}
                />
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  aria-live="polite"
                  style={{
                    borderRadius: 10,
                    border:       `1px solid ${TOKENS.safeguard.cap.dot}40`,
                    background:   TOKENS.safeguard.cap.bg,
                    padding:      '10px 14px',
                    fontSize:     '12.5px',
                    color:        TOKENS.safeguard.cap.text,
                    fontFamily:   FONT,
                    lineHeight:   1.5,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  fontFamily:   FONT,
                  fontWeight:   700,
                  fontSize:     '13.5px',
                  borderRadius: 12,
                  padding:      '12px 20px',
                  background:   status === 'loading' ? 'rgba(6,3,43,0.40)' : TOKENS.ink,
                  color:        '#FFFFFF',
                  border:       'none',
                  cursor:       status === 'loading' ? 'not-allowed' : 'pointer',
                  width:        '100%',
                  transition:   'background 150ms ease',
                  minHeight:    48,
                }}
              >
                {status === 'loading' ? 'Aggiornamento in corso…' : 'Imposta nuova password →'}
              </button>
            </div>
          </form>
        )}

        <p style={{ fontFamily: FONT, fontSize: '10.5px', color: TOKENS.inkMeta, textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
          KORA Foundation Light · Recupero accesso
        </p>
      </div>
    </div>
  );
}

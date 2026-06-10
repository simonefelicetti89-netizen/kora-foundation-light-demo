'use client';

// app/auth/forgot-password/page.tsx
// Password reset request — asks for email, calls Supabase resetPasswordForEmail.
// Supabase sends a recovery link to the email. On click, the link goes to:
//   /auth/callback?type=recovery&code=xxx → /auth/reset-password
//
// Accessible from any login page. No session required.
// ?from=worker → back link goes to /worker/login instead of /company/login.

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const fromWorker   = searchParams.get('from') === 'worker';
  const backHref     = fromWorker ? '/login?role_hint=worker' : '/login';
  const backLabel    = fromWorker ? "← Torna all'accesso lavoratore" : '← Torna al login';

  const [email,    setEmail]    = useState('');
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMsg(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }

      setStatus('sent');
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
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <Image
            src="/kora/logo-dark.png"
            alt="KORA"
            width={110}
            height={34}
            priority
            style={{ height: 30, width: 'auto' }}
          />
        </div>

        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 8 }}>
            Recupero accesso
          </p>
          <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.375rem', letterSpacing: '-0.025em', lineHeight: 1.1, color: TOKENS.ink, marginBottom: 6 }}>
            Password dimenticata?
          </h1>
          <p style={{ fontFamily: FONT, fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
            Inserisci l&apos;email con cui accedi a KORA. Riceverai un link per impostare una nuova password.
          </p>
        </div>

        {status === 'sent' ? (
          <div>
            <div
              style={{
                borderRadius: 10,
                border:       '1px solid rgba(47,125,85,0.30)',
                background:   'rgba(47,125,85,0.08)',
                padding:      '14px 16px',
                fontSize:     '13px',
                color:        '#1a4731',
                fontFamily:   FONT,
                lineHeight:   1.6,
                marginBottom: 20,
              }}
            >
              <strong>Email inviata.</strong> Controlla la tua casella e clicca il link di recupero.
              Il link scade entro 1 ora.
            </div>
            <p style={{ fontFamily: FONT, fontSize: '12px', color: TOKENS.inkSecondary, textAlign: 'center', lineHeight: 1.5 }}>
              Non hai ricevuto l&apos;email?{' '}
              <button
                onClick={() => setStatus('idle')}
                style={{ background: 'none', border: 'none', color: TOKENS.accent, fontFamily: FONT, fontSize: '12px', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2, padding: 0 }}
              >
                Riprova
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label
                  htmlFor="email"
                  style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la-tua-email@esempio.it"
                  style={inputStyle}
                  disabled={status === 'loading'}
                  onFocus={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = ''; }}
                />
              </div>

              {status === 'error' && errorMsg && (
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
                {status === 'loading' ? 'Invio in corso…' : 'Invia link di recupero →'}
              </button>
            </div>
          </form>
        )}

        <p style={{ fontFamily: FONT, fontSize: '11.5px', textAlign: 'center', marginTop: 20 }}>
          <Link
            href={backHref}
            style={{ color: TOKENS.accent, textDecoration: 'none', fontWeight: 500 }}
          >
            {backLabel}
          </Link>
        </p>

        <p style={{ fontFamily: FONT, fontSize: '10.5px', color: TOKENS.inkMeta, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
          KORA Foundation Light · Recupero accesso
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}

'use client';
// app/login/page.tsx
// B117: Unified entry point — one login page for all roles.
// On success, reads kora_role from app_metadata and routes to the correct home.
// Workers no longer need to know /worker/login. Company users no longer need /company/login.
// /admin/login is preserved as the internal operator entry (KORA_ADMIN only).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { getRoleHome } from '@/lib/auth/role-home';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.session) {
      setError('Credenziali non valide. Verifica email e password oppure contatta il tuo responsabile KORA.');
      setLoading(false);
      return;
    }

    const koraRole = data.user?.app_metadata?.kora_role as string | undefined;

    // KORA_ADMIN operators should use /admin/login for the dedicated operator experience.
    // Still functional here as a fallback.
    const destination = getRoleHome(koraRole);

    if (!koraRole) {
      await supabase.auth.signOut();
      setError('Ruolo non riconosciuto. Contatta il tuo responsabile KORA per assistenza.');
      setLoading(false);
      return;
    }

    router.push(destination);
    router.refresh();
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
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          background:    'radial-gradient(600px 440px at 30% 25%, rgba(97,86,245,0.11), transparent 60%), radial-gradient(500px 360px at 70% 80%, rgba(47,125,85,0.09), transparent 60%)',
          pointerEvents: 'none',
        }}
      />

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
          <Image
            src="/kora/logo-dark.png"
            alt="KORA"
            width={110}
            height={34}
            priority
            style={{ height: 30, width: 'auto' }}
          />
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <p style={{
            fontFamily:    FONT,
            fontWeight:    700,
            fontSize:      '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         TOKENS.accent,
            marginBottom:  8,
          }}>
            Accesso
          </p>
          <h1 style={{
            fontFamily:    FONT,
            fontWeight:    800,
            fontSize:      '1.375rem',
            letterSpacing: '-0.025em',
            lineHeight:    1.1,
            color:         TOKENS.ink,
            marginBottom:  8,
          }}>
            Entra in KORA
          </h1>
          <p style={{ fontFamily: FONT, fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
            Accedi con le credenziali ricevute via email da KORA.
          </p>
        </div>

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
                disabled={loading}
                data-testid="login-email-input"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = ''; }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label
                htmlFor="password"
                style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                aria-required="true"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                data-testid="login-password-input"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = ''; }}
              />
            </div>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                data-testid="login-error"
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
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              style={{
                fontFamily:   FONT,
                fontWeight:   700,
                fontSize:     '13.5px',
                borderRadius: 12,
                padding:      '12px 20px',
                background:   loading ? 'rgba(6,3,43,0.40)' : TOKENS.ink,
                color:        '#FFFFFF',
                border:       'none',
                cursor:       loading ? 'not-allowed' : 'pointer',
                width:        '100%',
                transition:   'background 150ms ease',
                minHeight:    48,
              }}
            >
              {loading ? 'Accesso in corso…' : 'Accedi →'}
            </button>
          </div>
        </form>

        {/* Forgot password */}
        <p style={{ fontFamily: FONT, fontSize: '11.5px', textAlign: 'center', marginTop: 16 }}>
          <Link
            href="/auth/forgot-password"
            style={{ color: TOKENS.accent, textDecoration: 'none', fontWeight: 500 }}
          >
            Password dimenticata?
          </Link>
        </p>

        {/* Footer */}
        <p style={{
          fontFamily:  FONT,
          fontSize:    '10.5px',
          color:       TOKENS.inkMeta,
          textAlign:   'center',
          marginTop:   12,
          lineHeight:  1.5,
        }}>
          KORA misura organizzazioni, non individui · I tuoi dati personali non sono visibili al datore di lavoro
        </p>
      </div>
    </div>
  );
}

'use client';
// /company/login — dedicated login for COMPANY_ADMIN, COMPANY_VIEWER, and WORKER.
// KORA_ADMIN must use /admin/login.
// On successful sign-in: routes to /company/workspace or /worker/workspace by role.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export default function CompanyLoginPage() {
  const router = useRouter();
  const [email,   setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.session) {
      setError('Credenziali non valide. Contatta il responsabile KORA della tua azienda.');
      setLoading(false);
      return;
    }

    const koraRole = data.user?.app_metadata?.kora_role as string | undefined;

    if (koraRole === 'KORA_ADMIN') {
      await supabase.auth.signOut();
      setError('Questo accesso è per referenti aziendali. Gli operatori KORA usano /admin/login.');
      setLoading(false);
      return;
    }

    if (koraRole === 'WORKER') {
      router.push('/worker/workspace');
      router.refresh();
      return;
    }

    if (koraRole === 'COMPANY_ADMIN' || koraRole === 'COMPANY_VIEWER') {
      router.push('/company/workspace');
      router.refresh();
      return;
    }

    await supabase.auth.signOut();
    setError('Ruolo non riconosciuto. Contatta il tuo responsabile KORA.');
    setLoading(false);
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
      {/* Background gradient */}
      <div
        style={{
          position:     'absolute',
          inset:        0,
          background:   'radial-gradient(600px 440px at 20% 30%, rgba(97,86,245,0.12), transparent 60%), radial-gradient(500px 360px at 80% 80%, rgba(199,111,61,0.10), transparent 60%)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      {/* Login card */}
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
            Accesso Aziendale
          </p>
          <h1 style={{
            fontFamily:    FONT,
            fontWeight:    800,
            fontSize:      '1.375rem',
            letterSpacing: '-0.025em',
            lineHeight:    1.1,
            color:         TOKENS.ink,
            marginBottom:  6,
          }}>
            Company Area
          </h1>
          <p style={{
            fontFamily: FONT,
            fontSize:   '13px',
            color:      TOKENS.inkSecondary,
            lineHeight: 1.5,
          }}>
            Accedi con le credenziali ricevute via email da KORA.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
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
                placeholder="nome@azienda.it"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = ''; }}
              />
            </div>

            {/* Password */}
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
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = ''; }}
              />
            </div>

            {/* Error */}
            {error && (
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
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
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
          KORA Foundation Light · Workspace Aziendale
        </p>
      </div>
    </div>
  );
}

'use client';

// app/worker/setup-password/_form.tsx
// Password setup form for workers accepting a KORA invite.
// Session is already established by /auth/callback before this page renders.
// On success: redirects to /worker/onboarding.
//
// KORA-WP-129 Wave 4b (W3A) — migrated onto the Product Experience system.
// No auth, token, redirect, policy or error semantics changed: the minimum
// length, the match check, updateUser(), the invite-link failure copy and the
// destination are all exactly as before. What changed is composition — this
// surface renders inside the Worker shell, so it no longer paints a
// full-viewport dark frame and a second KORA logo inside the shell's own canvas.

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SPACE, PX } from '@/lib/design/kora-design-tokens';
import { PageHead, Region, Notice, Caption, Secondary } from '@/components/ui/px';
import { Field, PrimaryAction, Requirement, entryInputStyle } from '../_entry/entry-ui';

/** The one place the invite policy is stated. Used by the guard and the reader. */
const MIN_LENGTH = 8;

export function WorkerSetupPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlError            = searchParams.get('error');
  const urlErrorDescription = searchParams.get('error_description');

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (urlError) {
    const description = urlErrorDescription
      ? decodeURIComponent(urlErrorDescription.replace(/\+/g, ' '))
      : null;

    return (
      // W3A remediation: the entry shell now owns the reading measure and the
    // centring (components/layout/entry-shell.module.css). Keeping a second
    // cap here stranded the column inside its own container on a narrow
    // viewport, which is the defect the shell change was meant to remove.
    <div>
        <PageHead
          eyebrow="My KORA · Primo accesso"
          title="Link non valido o scaduto"
        />
        <Region>
          <div style={{ display: 'grid', gap: SPACE.md }}>
            <Notice tone="risk">
              Il link di invito non è più valido. Contatta il tuo responsabile KORA per ricevere un nuovo invito.
            </Notice>
            {description && (
              <Caption style={{ margin: 0, color: PX.ink3 }}>{description}</Caption>
            )}
          </div>
        </Region>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < MIN_LENGTH) {
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
      // Redirect to onboarding — gate in workspace will redirect back if already done.
      router.push('/worker/onboarding');
    } catch {
      setStatus('error');
      setErrorMsg('Errore imprevisto. Riprova o contatta il supporto KORA.');
    }
  }

  const busy = status === 'loading';
  // Requirements read the SAME predicates the submit guard uses, so the page
  // can never promise something the guard would then refuse.
  const longEnough = password.length === 0 ? null : password.length >= MIN_LENGTH;
  const matching   = confirm.length === 0 ? null : password === confirm;

  return (
    // W3A remediation: the entry shell now owns the reading measure and the
    // centring (components/layout/entry-shell.module.css). Keeping a second
    // cap here stranded the column inside its own container on a narrow
    // viewport, which is the defect the shell change was meant to remove.
    <div>
      <PageHead
        eyebrow="My KORA · Primo accesso"
        title="Imposta la tua password"
        lead="Crea la password con cui accederai al tuo spazio personale KORA."
      />

      {status === 'success' ? (
        <Region>
          <Notice tone="ok">Password impostata. Accesso in corso…</Notice>
        </Region>
      ) : (
        <Region>
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'grid', gap: SPACE.lg }}>
              <div style={{ display: 'grid', gap: SPACE.md }}>
                <Field id="password" label="Password">
                  {({ id, invalid }) => (
                    <input
                      id={id}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={MIN_LENGTH}
                      autoComplete="new-password"
                      disabled={busy}
                      aria-describedby="password-requirements"
                      style={entryInputStyle(invalid)}
                      onFocus={(e) => { e.currentTarget.style.borderColor = PX.violet; }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = PX.line2; }}
                    />
                  )}
                </Field>

                <Field id="confirm" label="Conferma password">
                  {({ id, invalid }) => (
                    <input
                      id={id}
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={busy}
                      aria-describedby="password-requirements"
                      style={entryInputStyle(invalid)}
                      onFocus={(e) => { e.currentTarget.style.borderColor = PX.violet; }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = PX.line2; }}
                    />
                  )}
                </Field>
              </div>

              {/* The requirements were previously only in a placeholder, which
                  disappears exactly when the reader starts typing. */}
              <div id="password-requirements">
                <Secondary
                  as="p"
                  style={{ margin: '0 0 8px', color: PX.ink3, fontWeight: 600 }}
                >
                  Requisiti
                </Secondary>
                <ul style={{ display: 'grid', gap: 6, margin: 0, padding: 0 }}>
                  <Requirement met={longEnough}>Almeno {MIN_LENGTH} caratteri</Requirement>
                  <Requirement met={matching}>Le due password coincidono</Requirement>
                </ul>
              </div>

              {errorMsg && (
                <div role="alert" aria-live="polite">
                  <Notice tone="risk">{errorMsg}</Notice>
                </div>
              )}

              <div style={{ display: 'flex' }}>
                <div style={{ flex: '0 1 280px', minWidth: 200 }}>
                  <PrimaryAction type="submit" busy={busy} full>
                    {busy ? 'Impostazione in corso…' : 'Imposta password e accedi'}
                  </PrimaryAction>
                </div>
              </div>
            </div>
          </form>
        </Region>
      )}

      {/* W3A remediation — see the matching note in the onboarding flow. */}
      <Caption style={{ margin: '16px 0 0', color: PX.ink3 }}>
        Il tuo datore di lavoro non può vedere questi dati.
      </Caption>
    </div>
  );
}

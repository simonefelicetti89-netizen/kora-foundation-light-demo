'use client';

// components/auth/RecoveryHashHandler.tsx
// Intercepts Supabase implicit-flow recovery tokens delivered in the URL hash.
//
// When a recovery link is generated from the Supabase Dashboard (not the app's
// forgot-password form), Supabase uses the implicit flow and lands on Site URL root
// with tokens in the fragment: /#access_token=...&refresh_token=...&type=recovery
//
// The URL fragment is never sent to the server, so /auth/callback cannot handle it.
// This client component reads the hash after hydration, establishes the session,
// cleans the URL, and redirects to /auth/reset-password.
//
// App-generated recovery (via resetPasswordForEmail) uses PKCE → /auth/callback?type=recovery
// and is unaffected by this handler.
//
// Security rules:
//   - Tokens are never logged or printed
//   - URL is cleaned with history.replaceState before any async work
//   - Tokens are never stored in component state or rendered to DOM

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function RecoveryHashHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return;

    const params       = new URLSearchParams(hash.slice(1));
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type         = params.get('type');

    if (type !== 'recovery' || !accessToken || !refreshToken) return;

    // Remove tokens from URL immediately — must not persist in browser history
    window.history.replaceState(null, '', window.location.pathname);

    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          window.location.href = '/auth/forgot-password?error=recovery_session_failed';
        } else {
          window.location.href = '/auth/reset-password';
        }
      });
  }, []);

  return null;
}

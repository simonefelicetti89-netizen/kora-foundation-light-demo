// lib/auth/auth-callback-url.ts
// The one redirectTo used by every server-side invite: /auth/callback on this
// deployment's site URL. Invite completion converges there for every role; the
// callback decides the destination from app_metadata.kora_role.

export function getAuthCallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return `${base.replace(/\/+$/, '')}/auth/callback`;
}

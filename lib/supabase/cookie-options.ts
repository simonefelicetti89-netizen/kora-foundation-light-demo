// ─── KORA Supabase Auth Cookie Options ────────────────────────────────────────
// Shared by every @supabase/ssr client that writes the sb-* auth cookies: the
// browser client, the server client and middleware. All three must pass the
// same options — the library merges them into every set AND remove, so a single
// writer without them would rewrite the cookie without the flag.
//
// Secure is keyed to the production build, not to staging vs Production. Every
// Vercel deployment (Preview and Production alike) is a `next build` served over
// HTTPS; local development is `next dev` on plain http://localhost.
// Only `secure` is set: httpOnly, sameSite, path and maxAge stay at the
// @supabase/ssr defaults (report 289 — HttpOnly is out of scope).
// ──────────────────────────────────────────────────────────────────────────────

import type { CookieOptions } from '@supabase/ssr';

export const SUPABASE_AUTH_COOKIE_OPTIONS: CookieOptions = {
  secure: process.env.NODE_ENV === 'production',
};

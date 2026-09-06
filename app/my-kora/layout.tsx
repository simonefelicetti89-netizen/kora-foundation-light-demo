// app/my-kora/layout.tsx — Server Component.
//
// MYKORA-01: Converted from client-side session detection (a React effect
// hook polling the browser Supabase auth session) to a server-side guard,
// matching the pattern already in place for admin/company/partner/worker
// layouts (B137).
//
// Two-layer guard, same shape as app/admin/layout.tsx:
//   Layer 1 (this file, server-side): getSessionKoraRole() reads the real
//     Supabase session from cookies, server-side, before any HTML is sent.
//     - realRole WORKER or KORA_ADMIN  → admitted (own/founder preview).
//     - any other real session found   → hard-blocked here, fail-closed.
//     - no real session (null)         → falls through to Layer 2.
//   Layer 2 (MyKoraDemoGate, client-side): demo-state role check for pure,
//     unauthenticated demo/persona visitors. My KORA is PREVIEW-only in
//     Foundation Light (see MyKoraDemoGate) — this layer is a demo-mode
//     convenience, not a privacy boundary; it never runs for real sessions.
//
// Distinction from /worker: /worker/layout.tsx is the LIVE, authenticated
// worker space (server-guarded, requires a real WORKER session, hard-blocks
// KORA_ADMIN). /my-kora is the PREVIEW/demo-only counterpart — reachable
// without login for demo/persona exploration. Middleware additionally keeps
// real WORKER sessions on /worker/* by default (WORKER_ALLOWED_PREFIXES in
// middleware.ts does not include /my-kora); this layout is the layer-2
// backstop for direct navigation / middleware failure / old bookmarks.
//
// B-WORKER final cleanup (2026-09-06): real WORKER/KORA_ADMIN sessions used
// to be admitted here into the demo-state-driven preview ("own/founder
// preview") — but every capability that preview once uniquely offered now
// has a canonical /worker replacement (Slices 1–5: PIB, Dynamic CV, Privacy,
// Bookings, KORA Space, KORA Link, Collettivo, Home, Opportunities all
// redirect a confirmed real session to their canonical page). With
// REAL_SESSION_MY_KORA_DEPENDENCIES = [] repository-wide, this layout can
// now redirect real sessions immediately, server-side, instead of admitting
// them — closing /my-kora as an authenticated runtime entirely. The
// anonymous/persona demo path below (MyKoraDemoGate) is UNCHANGED: it never
// carries a real session and remains Foundation Light's legitimate
// pre-login product preview.

import { redirect } from 'next/navigation';
import { getSessionKoraRole } from '@/lib/auth/kora-session';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { MyKoraDemoGate } from './_providers/MyKoraDemoGate';

export default async function MyKoraLayout({ children }: { children: React.ReactNode }) {
  const realRole = await getSessionKoraRole();

  // Real WORKER/KORA_ADMIN sessions: redirected to their canonical
  // destination, never admitted into the demo-state-driven preview.
  // Decided server-side — cannot be spoofed by client state.
  if (realRole === 'WORKER') {
    redirect('/worker/workspace');
  }
  if (realRole === 'KORA_ADMIN') {
    redirect('/admin');
  }

  // Any other real session (COMPANY_ADMIN, PARTNER, ...) is hard-blocked
  // here, server-side, before any child page ever renders. (DEMO_VIEWER,
  // retired by CC-00 on 2026-09-26, used to be blocked here too — no
  // longer a real role that could reach this check.)
  if (realRole !== null) {
    return (
      <div className="p-6" style={{ maxWidth: 600 }}>
        <h1
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    800,
            fontSize:      '2rem',
            letterSpacing: '-0.03em',
            lineHeight:    1.06,
            color:         '#06032B',
            marginBottom:  24,
          }}
        >
          My KORA
        </h1>
        <PrivacyBoundaryNotice
          reason="employer_role"
          dataType="my_kora"
        />
        <p style={{
          fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:    '11.5px',
          color:       TOKENS.inkHint,
          marginTop:   12,
          lineHeight:  1.5,
        }}>
          Il tuo account non ha accesso a questa area. Contatta il tuo KORA referente.
        </p>
      </div>
    );
  }

  // No real session at all — pure demo/persona visitor, gated by demo-state.
  return <MyKoraDemoGate>{children}</MyKoraDemoGate>;
}

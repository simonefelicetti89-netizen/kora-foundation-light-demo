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
// KORA_ADMIN). /my-kora is the PREVIEW/demo counterpart — reachable without
// login for demo/persona exploration, and also reachable by a real WORKER or
// KORA_ADMIN session for founder/self preview. Middleware additionally keeps
// real WORKER sessions on /worker/* by default (WORKER_ALLOWED_PREFIXES in
// middleware.ts does not include /my-kora); the WORKER admission path below
// is defense in depth for direct navigation / middleware failure, not the
// primary route for authenticated workers. The two route trees are not
// merged in this sprint — see docs/PILOT_SAAS_READINESS.md item 5.

import { getSessionKoraRole } from '@/lib/auth/kora-session';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { WorkerSessionProvider } from './_providers/WorkerSessionProvider';
import { MyKoraDemoGate } from './_providers/MyKoraDemoGate';

export default async function MyKoraLayout({ children }: { children: React.ReactNode }) {
  const realRole = await getSessionKoraRole();

  // Real authenticated users: WORKER (own preview) and KORA_ADMIN (founder/
  // admin preview) are admitted. Decided server-side — cannot be spoofed by
  // client state.
  const realUserPermitted = realRole === 'WORKER' || realRole === 'KORA_ADMIN';

  if (realUserPermitted) {
    return (
      <WorkerSessionProvider>
        {/* Navigation bridge: real workers can return to authenticated workspace */}
        {realRole === 'WORKER' && (
          <div style={{ marginBottom: 12 }}>
            <a
              href="/worker/workspace"
              data-testid="my-kora-workspace-link"
              style={{
                fontSize:       11,
                fontWeight:     600,
                color:          'rgba(6,3,43,0.45)',
                textDecoration: 'none',
                display:        'inline-block',
                padding:        '4px 0',
              }}
            >
              ← Spazio operativo
            </a>
          </div>
        )}
        {children}
      </WorkerSessionProvider>
    );
  }

  // Any other real session (COMPANY_ADMIN, PARTNER, DEMO_VIEWER, ...) is
  // hard-blocked here, server-side, before any child page ever renders.
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

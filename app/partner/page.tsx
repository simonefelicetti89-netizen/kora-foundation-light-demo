// app/partner/page.tsx — Server Component.
//
// PARTNER-01: root of the live Partner Platform. Previously this page
// rendered a 1000+ line, 100% synthetic demo dashboard (fake company names,
// fake requests, fake evidence) directly behind the real PARTNER auth gate
// (app/partner/layout.tsx -> requirePartnerUser()) — meaning a real,
// authenticated pilot partner logging in would see entirely fabricated data
// labeled "DEMO", not their own workspace. That synthetic preview moved to
// app/demo/partner/page.tsx (guarded like every other /demo/* route via
// requireDemoGate() — DEMO_VIEWER/KORA_ADMIN only, never a real PARTNER
// session), where it can no longer be confused with the live surface.
//
// Anyone reaching this page has already passed app/partner/layout.tsx's
// requirePartnerUser() gate — a real, authenticated PARTNER session or bust.
// The only job left here is to send them to the live workspace, which is
// also what getRoleHome('PARTNER') already resolves to on login
// (lib/auth/role-home.ts). Keeping /partner as a thin redirect (rather than
// deleting the route) preserves any existing bookmark/link to /partner as
// the partner entrypoint, per docs/FUTURE_ROLES_AND_SURFACES.md's open
// question ("/partner vs /partner/workspace as home") — this sprint answers
// it: /partner/workspace is home, /partner just points there.

import { redirect } from 'next/navigation';

export default function PartnerRootPage() {
  redirect('/partner/workspace');
}

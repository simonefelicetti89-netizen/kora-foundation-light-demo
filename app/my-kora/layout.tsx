// app/my-kora/layout.tsx — Server Component.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md ratifies
// "KORA has ONE product runtime... no demo-specific business logic." Every
// route under app/my-kora/** now redirects unconditionally, for every
// visitor, to its canonical /worker/** equivalent — there is no longer a
// session-dependent admission decision to make here (the previous version
// of this file redirected real WORKER/KORA_ADMIN sessions at the layout
// level and delegated anonymous/persona visitors to a demo-state gate;
// both paths converge on the same outcome now, so the branching itself is
// removed, not just its destinations). This file exists only to keep the
// route segment's metadata (noindex) — it performs no authorization
// decision and reads no session.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function MyKoraLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

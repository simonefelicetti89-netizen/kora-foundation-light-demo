// app/my-kora/kora-link/page.tsx
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): see
// app/my-kora/page.tsx for the governing decision
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
// /worker/kora-link/activate is the canonical implementation (same
// non-functional preview shell, but real-auth-gated and already richer) —
// this route no longer runs a separate synthetic preview.

import { redirect } from 'next/navigation';

export default function MyKoraLinkPage() {
  redirect('/worker/kora-link/activate');
}

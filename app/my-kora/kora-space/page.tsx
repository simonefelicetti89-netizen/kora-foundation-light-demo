// app/my-kora/kora-space/page.tsx
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): see
// app/my-kora/page.tsx for the governing decision
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
// /worker/commons is the canonical, real KORA Space implementation
// (proven full parity, B-WORKER Slice 3) — this route no longer runs a
// separate synthetic preview.

import { redirect } from 'next/navigation';

export default function WorkerKoraSpacePage() {
  redirect('/worker/commons');
}

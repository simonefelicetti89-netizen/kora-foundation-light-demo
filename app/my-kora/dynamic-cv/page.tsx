// app/my-kora/dynamic-cv/page.tsx
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): see
// app/my-kora/page.tsx for the governing decision
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
// /worker/dynamic-cv (DynamicCVClient) is the canonical, real implementation
// — this route no longer runs a separate synthetic preview for anyone.

import { redirect } from 'next/navigation';

export default function DynamicCV() {
  redirect('/worker/dynamic-cv');
}

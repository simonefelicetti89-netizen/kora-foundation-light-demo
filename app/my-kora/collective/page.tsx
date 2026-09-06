// app/my-kora/collective/page.tsx
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): see
// app/my-kora/page.tsx for the governing decision
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
// KORA Contribution has no live per-worker data path yet and no dedicated
// canonical /worker destination — this is a future-only capability. Per
// the founder decision, a future feature must not remain alive as a
// synthetic runtime merely because a real implementation does not exist
// yet: the synthetic implementation (persona-driven contribution timeline)
// is retired outright, not preserved as a demo. Redirects to the canonical
// worker landing page.

import { redirect } from 'next/navigation';

export default function CollectiveImpact() {
  redirect('/worker/workspace');
}

// app/my-kora/opportunities/page.tsx
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): see
// app/my-kora/page.tsx for the governing decision
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
// Personalized opportunity recommendations (synthetic IU estimates,
// match_reason, source_signal) have no canonical recommendation engine and
// none is built here — "do not build a recommendation engine" is explicit
// scope. Per the founder decision, a future feature must not remain alive
// as a synthetic runtime merely because a real implementation does not
// exist yet: the synthetic implementation is retired outright.
// /worker/opportunities is a different, real, non-personalized product
// concept (informational partner catalog) — the truthful current
// opportunities capability.

import { redirect } from 'next/navigation';

export default function Opportunities() {
  redirect('/worker/opportunities');
}

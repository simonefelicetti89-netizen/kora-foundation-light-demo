// app/my-kora/page.tsx
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md ratifies
// "KORA has ONE product runtime... no demo-specific business logic... no
// runtime JSON/synthetic fallback." This page used to run a full synthetic
// worker business runtime (persona-driven PIB, achievements, opportunity
// recommendations via MyKoraPreviewService/WorkerAchievementService/
// WorkerOpportunityService) for BOTH real and anonymous sessions — a second
// worker product runtime, which the founder decision above prohibits
// regardless of who is using it. /worker/workspace is the canonical worker
// landing page (real identity, initiatives, participation, activation
// profile) for every visitor — anonymous users hit its own real auth gate
// (redirect to /login) exactly like any other real product route, with no
// special demo-preview carve-out.

import { redirect } from 'next/navigation';

export default function MyKoraHome() {
  redirect('/worker/workspace');
}

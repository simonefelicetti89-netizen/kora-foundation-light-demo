// app/worker/onboarding/page.tsx
// B113: Worker Onboarding — server-side gate + initial state loader.
// WORKER only. workerId from session.
//
// Mode:
//   default          → onboarding flow (required for first access)
//   ?mode=review     → privacy boundary review (no re-consent for completed workers)
//
// If onboarding already completed and NOT in review mode → redirect to workspace.

import { redirect } from 'next/navigation';
import { getCurrentWorkerUser } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { OnboardingFlow } from './_flow';
import { SessionBar } from '@/components/auth/SessionBar';

interface PageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function WorkerOnboardingPage({ searchParams }: PageProps) {
  const worker = await getCurrentWorkerUser();
  if (!worker) redirect('/login');

  const db = getSupabaseServiceClient();

  const { data: profRow } = await db
    .schema('personal')
    .from('worker_profile_private')
    .select('onboarding_completed_at, display_name, preferred_lang')
    .eq('worker_id', worker.workerId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = profRow as Record<string, any> | null;
  const isCompleted = !!(row?.onboarding_completed_at);

  const params = await searchParams;
  const isReview = params.mode === 'review';

  // Already completed and not reviewing → go to workspace
  if (isCompleted && !isReview) {
    redirect('/worker/workspace');
  }

  return (
    <>
      <SessionBar email={worker.email} role={worker.koraRole} />
      <OnboardingFlow
        reviewMode={isReview && isCompleted}
        initialDisplayName={(row?.display_name as string | null) ?? null}
        initialLang={((row?.preferred_lang as string) === 'en' ? 'en' : 'it')}
      />
    </>
  );
}

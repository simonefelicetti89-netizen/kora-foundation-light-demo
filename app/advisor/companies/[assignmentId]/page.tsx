'use client';

// KORA-WP-064 — the per-Company Advisor overview route.
// Composition lives in OverviewClient; the shell owns the Company context.

import { use } from 'react';
import { CompanyContextShell } from './_components/CompanyContextShell';
import { OverviewClient } from './_components/OverviewClient';

export default function Page({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  return (
    <CompanyContextShell assignmentId={assignmentId}>
      {() => <OverviewClient assignmentId={assignmentId} />}
    </CompanyContextShell>
  );
}

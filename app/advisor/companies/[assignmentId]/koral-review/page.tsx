'use client';

// KORA-WP-064 — one canonical Advisor capability, one route. The Company
// context (identity, validity, local navigation) comes from the shared shell;
// the capability itself is unchanged from the pre-decomposition monolith.

import { use } from 'react';
import { CompanyContextShell } from '../_components/CompanyContextShell';
import { KoralReviewClient } from '../_components/KoralReviewClient';

export default function Page({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  return (
    <CompanyContextShell assignmentId={assignmentId}>
      {() => <KoralReviewClient assignmentId={assignmentId} />}
    </CompanyContextShell>
  );
}

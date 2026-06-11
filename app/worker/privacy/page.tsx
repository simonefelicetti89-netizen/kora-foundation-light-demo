// app/worker/privacy/page.tsx
// B122: Worker Privacy & Sharing Settings.
//
// Access: WORKER only. requireWorkerUser enforced server-side.
// Purpose: clear panel where workers understand what stays private,
//          what is aggregated at company level, and what future sharing
//          controls will look like under their control.
//
// Privacy rules:
//   - No employer-facing path to this content
//   - No individual data sent to company
//   - No public link or share activated in this sprint
//   - workerId and tenantId from session only — never from client params

import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import { PrivacySettingsClient } from './_components/PrivacySettingsClient';

export const metadata = { title: 'Privacy & Condivisione · KORA' };

export default async function WorkerPrivacyPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  return <PrivacySettingsClient userEmail={auth.email} />;
}

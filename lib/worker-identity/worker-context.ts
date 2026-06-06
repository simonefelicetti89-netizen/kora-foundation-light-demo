// lib/worker-identity/worker-context.ts
// Canonical worker context resolution with a stable contract.
// B81-B: Foundation Light always resolves to PREVIEW mode.
//
// Contract: components call getWorkerContext() and receive a WorkerSession.
// They never need to know whether the session is PREVIEW or LIVE — they read
// workerMode, isPreview, isLive, and respond accordingly.
//
// Pilot+ migration path:
//   Pass { liveSession } when a real Supabase worker JWT is detected.
//   WorkerSessionProvider handles this detection and passes it in.
//   No component changes required — only the provider changes.

import type { WorkerSession, WorkerKoraId } from './types';
import { makePreviewWorkerSession, makeLiveWorkerSession, makeDisabledWorkerSession } from './types';

export interface WorkerContextInput {
  // Populated by WorkerSessionProvider when a real Supabase worker JWT is detected.
  // null in Foundation Light PREVIEW mode.
  liveSession?: {
    workerKoraId:      WorkerKoraId;
    workerDisplayName: string;
    tenantId:          string;
  } | null;

  // Display name from demo-state persona switcher (PREVIEW path only).
  previewPersonaName?: string | null;

  // Whether the current role permits My KORA access at all.
  // Derived from isWorkerRole(role) || isAdminRole(role).
  accessPermitted?: boolean;
}

// getWorkerContext — stable contract, Foundation Light and Pilot+ compatible.
export function getWorkerContext(input: WorkerContextInput = {}): WorkerSession {
  const { liveSession, previewPersonaName, accessPermitted = true } = input;

  if (!accessPermitted) {
    return makeDisabledWorkerSession();
  }

  if (liveSession) {
    return makeLiveWorkerSession(liveSession);
  }

  return makePreviewWorkerSession(previewPersonaName ?? null);
}

// workerSessionLabel — human-readable mode label for boundary badges and logs.
export function workerSessionLabel(session: WorkerSession): string {
  if (session.isLive)    return `LIVE · ${session.workerDisplayName ?? 'Worker'}`;
  if (session.isPreview) return `PREVIEW · ${session.workerDisplayName ?? 'Persona demo'}`;
  return 'Non attivo';
}

// isWorkerDataAccessible — guard helper used by My KORA page components.
// Returns true if the session can serve worker data (preview or live).
export function isWorkerDataAccessible(session: WorkerSession): boolean {
  return session.workerMode === 'PREVIEW' || session.workerMode === 'LIVE';
}

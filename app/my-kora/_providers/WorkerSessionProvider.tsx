'use client';

// app/my-kora/_providers/WorkerSessionProvider.tsx
// B81-B: Foundation layer for the worker session context.
//
// Current implementation: resolves to PREVIEW mode using demo-state.
// All My KORA pages consume useWorkerSession() to get the canonical WorkerSession.
//
// Pilot+ migration path:
//   1. Before falling back to PREVIEW, attempt Supabase session detection:
//        const { data: { session } } = await supabase.auth.getSession()
//        const kora_role = session?.user?.app_metadata?.kora_role
//        const kora_worker_kora_id = session?.user?.app_metadata?.kora_worker_kora_id
//   2. If kora_role === 'WORKER' and kora_worker_kora_id is present, build LIVE session.
//   3. Use useState + useEffect for the async detection (see CompanySessionProvider pattern).
//   4. No changes required in any consumer component — only this file changes.
//
// Privacy invariants:
//   DISABLED session → layout blocks access before provider is reached.
//   PREVIEW session → data from MyKoraPreviewService (synthetic personas).
//   LIVE session    → data from Supabase via worker_kora_id (Pilot+, Gate 2+3).

import { createContext, useContext, useMemo } from 'react';
import type { WorkerSession } from '@/lib/worker-identity/types';
import {
  makePreviewWorkerSession,
  makeDisabledWorkerSession,
} from '@/lib/worker-identity/types';
import { getWorkerContext } from '@/lib/worker-identity/worker-context';
import { useRole, usePersona } from '@/lib/demo-state';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';

const WorkerSessionContext = createContext<WorkerSession>(makeDisabledWorkerSession());

export function useWorkerSession(): WorkerSession {
  return useContext(WorkerSessionContext);
}

interface Props { children: React.ReactNode; }

export function WorkerSessionProvider({ children }: Props) {
  const { activeRole }    = useRole();
  const { activePersona } = usePersona();

  const session = useMemo<WorkerSession>(() => {
    const accessPermitted = isWorkerRole(activeRole) || isAdminRole(activeRole);

    // Foundation Light: always PREVIEW. No async Supabase detection yet.
    // Pilot+: insert async detection here, resolve to LIVE when JWT confirms WORKER role.
    return getWorkerContext({
      liveSession:        null,
      previewPersonaName: activePersona?.display_name ?? null,
      accessPermitted,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole, activePersona?.id]);

  return (
    <WorkerSessionContext.Provider value={session}>
      {children}
    </WorkerSessionContext.Provider>
  );
}

// Re-export types so consumers import from one place.
export type { WorkerSession };
export { makePreviewWorkerSession, makeDisabledWorkerSession };

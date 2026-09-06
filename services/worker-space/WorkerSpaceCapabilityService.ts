// services/worker-space/WorkerSpaceCapabilityService.ts
// B81-B: Determines what the worker space can do for a given tenant.
// B162: Pilot+ branch implemented — production_ready=true → PILOT_READY capability.
//
// B-WORKER WorkerProvisioning Canonicalization (2026-09-06): this service
// used to call workerProvisioningService.getWorkersForCompany() internally
// (a synthetic, data/synthetic/worker-roster.json-backed read) to derive
// myKoraEnabledCount/totalWorkers. Fresh caller audit found getCapability(),
// _pilotCapability(), _previewCapability(), and isWorkerSpaceEnabled() had
// ZERO real callers — only getCapabilityByCompanyId() was reachable, from
// exactly 3 real call sites (WorkforceQuickAccessPanel.tsx,
// WorkerAdoptionPanel.tsx, PilotLifecycleClient.tsx), none of which ever
// passed the production_ready branch a real KoraTenant object. Per "do not
// assume the entire service must be recreated 1:1 — canonicalize only
// capabilities real callers actually need," this file now takes
// pre-computed worker counts as parameters (from
// lib/live/worker-provisioning-status-view.ts, fed by real
// personal.worker_identity rows) instead of fetching them itself — the
// real Pilot+/preview status-derivation logic (unchanged) is preserved as
// pure, synchronous functions, safe to call from 'use client' components
// with server-fetched counts passed down as props.

import type { WorkerSpaceCapability, WorkerSpaceStatus } from '@/lib/worker-identity/types';
import type { KoraTenant } from '@/lib/types';

class WorkerSpaceCapabilityService {

  // getCapability: determine worker space capability for a given tenant,
  // given its already-fetched worker counts (personal.worker_identity,
  // canonical). Accepts a KoraTenant object for the production_ready branch.
  getCapability(tenant: KoraTenant, myKoraEnabledCount: number, totalWorkers: number): WorkerSpaceCapability {
    if (!tenant.production_ready) {
      return this._previewCapabilityFromCounts(myKoraEnabledCount, totalWorkers);
    }
    return this._pilotCapability(myKoraEnabledCount, totalWorkers);
  }

  // getCapabilityFromCounts: the real, currently-reachable entry point —
  // pure, synchronous, no I/O. Callers (Server Components) fetch
  // personal.worker_identity rows and build counts via
  // buildWorkerProvisioningStatusView() from lib/live/worker-provisioning-status-view.ts,
  // then pass them here — safe to call from 'use client' components too,
  // since it performs no fetch of its own.
  getCapabilityFromCounts(myKoraEnabledCount: number, totalWorkers: number): WorkerSpaceCapability {
    if (totalWorkers === 0) {
      return this._notEnabledCapability('Nessun lavoratore nel roster. Carica il worker roster per abilitare il Worker Space.');
    }
    if (myKoraEnabledCount > 0) {
      return this._previewCapabilityFromCounts(myKoraEnabledCount, totalWorkers);
    }
    return this._notEnabledCapability(
      `${totalWorkers} lavoratori nel roster. My KORA non ancora abilitata per nessun lavoratore.`,
    );
  }

  // ── Private builders ──────────────────────────────────────────────────────

  private _pilotCapability(myKoraEnabled: number, total: number): WorkerSpaceCapability {
    const pibSupported = myKoraEnabled > 0;
    return {
      status:               'PILOT_READY',
      enabled:              true,
      mode:                 'pilot_ready',
      workerCountSupported: true,
      dynamicCvSupported:   true,
      pibSupported,
      collectiveSupported:  true,
      note:
        `Pilot+ attivo — ${myKoraEnabled}/${total} lavoratori con My KORA abilitata. ` +
        (pibSupported
          ? 'PIB individuale disponibile.'
          : 'PIB individuale non disponibile: nessun lavoratore con My KORA abilitata nel roster.'),
    };
  }

  private _previewCapabilityFromCounts(
    myKoraEnabledCount: number,
    totalWorkers: number,
  ): WorkerSpaceCapability {
    const status: WorkerSpaceStatus = myKoraEnabledCount > 0 ? 'ENABLED' : 'NOT_ENABLED';
    return {
      status,
      enabled:              status !== 'NOT_ENABLED',
      mode:                 'preview',
      workerCountSupported: totalWorkers > 0,
      dynamicCvSupported:   true,   // Dynamic CV available in PREVIEW mode (synthetic data)
      pibSupported:         false,  // individual PIB requires Pilot+ (per-worker UEF records)
      collectiveSupported:  true,   // KORA Contribution™ worker layer available in PREVIEW
      note:
        `KORA Foundation Light — Worker Space in PREVIEW mode. ` +
        `${myKoraEnabledCount}/${totalWorkers} lavoratori con My KORA abilitata. ` +
        `PIB individuale non disponibile (richiede Pilot+ con per-worker UEF records). ` +
        `Dynamic Impact CV™ disponibile in modalità anteprima sintetica.`,
    };
  }

  private _notEnabledCapability(note: string): WorkerSpaceCapability {
    return {
      status:               'NOT_ENABLED',
      enabled:              false,
      mode:                 'not_enabled',
      workerCountSupported: false,
      dynamicCvSupported:   false,
      pibSupported:         false,
      collectiveSupported:  false,
      note,
    };
  }
}

export const workerSpaceCapabilityService = new WorkerSpaceCapabilityService();

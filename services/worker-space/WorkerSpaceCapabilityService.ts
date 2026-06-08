// services/worker-space/WorkerSpaceCapabilityService.ts
// B81-B: Determines what the worker space can do for a given tenant.
//
// KORA Foundation Light: rule-based, no DB query, no Gate 2 dependency.
// Pilot+: can be backed by a Supabase query on tenant.worker_space_status.
//
// Design: service is the single source of truth for "is the worker layer
// active for this tenant, and in what capacity?" Company portal, admin screens,
// and My KORA layout should all consume this service — not inline boolean checks.

import type { WorkerSpaceCapability, WorkerSpaceStatus } from '@/lib/worker-identity/types';
import type { KoraTenant } from '@/lib/types';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';

// Foundation Light: capabilities are derived from roster state, not a DB flag.
// KoraTenant.production_ready is always false — no tenant is Pilot-ready yet.

class WorkerSpaceCapabilityService {

  // getCapability: determine worker space capability for a given tenant.
  // Accepts a KoraTenant object (already loaded by the caller).
  getCapability(tenant: KoraTenant): WorkerSpaceCapability {
    // Foundation Light: production_ready is always false.
    // No tenant can be PILOT_READY until Gate 2 + Gate 3 close.
    if (!tenant.production_ready) {
      return this._previewCapability(tenant);
    }

    // Pilot+ path: evaluate actual worker space enablement.
    // This branch is unreachable in Foundation Light (production_ready is typed as false).
    return this._previewCapability(tenant);
  }

  // getCapabilityById: convenience wrapper — resolves KoraTenant from companyId.
  // Foundation Light: reads from synthetic tenant service (no Supabase query).
  getCapabilityByCompanyId(companyId: string): WorkerSpaceCapability {
    const roster = workerProvisioningService.getWorkersForCompany(companyId);
    const myKoraEnabledCount = roster.filter((w) => w.my_kora_enabled).length;
    const totalWorkers = roster.length;

    // Foundation Light rule:
    //   Any roster entry with my_kora_enabled → ENABLED (preview mode).
    //   No roster → NOT_ENABLED.
    if (totalWorkers === 0) {
      return this._notEnabledCapability('Nessun lavoratore nel roster. Carica il worker roster per abilitare il Worker Space.');
    }

    if (myKoraEnabledCount > 0) {
      return this._previewCapabilityFromRoster(myKoraEnabledCount, totalWorkers);
    }

    return this._notEnabledCapability(
      `${totalWorkers} lavoratori nel roster. My KORA non ancora abilitata per nessun lavoratore.`,
    );
  }

  // isWorkerSpaceEnabled: quick boolean guard for layout/routing decisions.
  isWorkerSpaceEnabled(companyId: string): boolean {
    const cap = this.getCapabilityByCompanyId(companyId);
    return cap.enabled;
  }

  // ── Private builders ──────────────────────────────────────────────────────

  private _previewCapability(tenant: KoraTenant): WorkerSpaceCapability {
    const roster = workerProvisioningService.getWorkersForCompany(tenant.company_id);
    const myKoraEnabled = roster.filter((w) => w.my_kora_enabled).length;
    return this._previewCapabilityFromRoster(myKoraEnabled, roster.length);
  }

  private _previewCapabilityFromRoster(
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

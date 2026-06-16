// services/worker-space/WorkerSpaceCapabilityService.ts
// B81-B: Determines what the worker space can do for a given tenant.
// B162: Pilot+ branch implemented — production_ready=true → PILOT_READY capability.
//
// KORA Foundation Light: rule-based, no DB query, no Gate 2 dependency.
// Pilot+: production_ready=true (set via /api/admin/tenants/[id]/promote-to-pilot).
//         Per-worker UEF records and mig 016-019 must be applied before promotion.
//
// Design: service is the single source of truth for "is the worker layer
// active for this tenant, and in what capacity?" Company portal, admin screens,
// and My KORA layout should all consume this service — not inline boolean checks.

import type { WorkerSpaceCapability, WorkerSpaceStatus } from '@/lib/worker-identity/types';
import type { KoraTenant } from '@/lib/types';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';

class WorkerSpaceCapabilityService {

  // getCapability: determine worker space capability for a given tenant.
  // Accepts a KoraTenant object (already loaded by the caller).
  getCapability(tenant: KoraTenant): WorkerSpaceCapability {
    if (!tenant.production_ready) {
      // Foundation Light path — unchanged behaviour for all existing tenants.
      return this._previewCapability(tenant);
    }
    // Pilot+ path: tenant was explicitly promoted via /api/admin/tenants/[id]/promote-to-pilot.
    return this._pilotCapability(tenant);
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

  private _pilotCapability(tenant: KoraTenant): WorkerSpaceCapability {
    const roster        = workerProvisioningService.getWorkersForCompany(tenant.company_id);
    const myKoraEnabled = roster.filter((w) => w.my_kora_enabled).length;
    const total         = roster.length;
    const pibSupported  = myKoraEnabled > 0;

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

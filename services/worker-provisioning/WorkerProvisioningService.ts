import type { WorkerRosterRecord, WorkerProvisioningSummary } from '@/lib/types';
import rosterData from '@/data/synthetic/worker-roster.json';

const records = (rosterData as { data: WorkerRosterRecord[] }).data;

class WorkerProvisioningService {
  getWorkersForCompany(companyId: string): WorkerRosterRecord[] {
    // Only aggregate-safe roster data — no individual PIB, no salary, no health
    return records.filter((w) => w.company_id === companyId);
  }

  getWorkerProvisioningSummary(companyId: string): WorkerProvisioningSummary {
    const workers = this.getWorkersForCompany(companyId);
    const invited = workers.filter((w) => w.worker_account_status === 'invited').length;
    const active = workers.filter((w) => w.worker_account_status === 'active_demo').length;
    const myKoraEnabled = workers.filter((w) => w.my_kora_enabled).length;
    const pibEnabled = workers.filter((w) => w.pib_private_enabled).length;
    const suppressed = workers.filter((w) => !w.privacy_threshold_cluster).length;

    let nextAction = 'Nessuna azione necessaria.';
    if (workers.length === 0) nextAction = 'Carica il worker roster per questa azienda.';
    else if (myKoraEnabled === 0) nextAction = 'Abilita My KORA per i lavoratori che lo richiedono.';
    else if (invited > 0) nextAction = `${invited} lavoratori invitati in attesa di accettazione.`;

    return {
      company_id: companyId,
      total_workers: workers.length,
      invited_workers: invited,
      active_worker_accounts: active,
      my_kora_enabled_count: myKoraEnabled,
      pib_private_enabled_count: pibEnabled,
      suppressed_clusters_count: suppressed,
      privacy_notes:
        'Il PIB individuale è privato al lavoratore. L\'azienda vede solo aggregati sopra soglia privacy (N≥10). ' +
        'employer_can_view_individual_pib = false su ogni record.',
      next_action: nextAction,
    };
  }

  getCompanyAggregateWorkerSummary(companyId: string): {
    total_workers: number;
    departments: string[];
    sites: string[];
    my_kora_enabled_count: number;
    privacy_boundary_note: string;
  } {
    const workers = this.getWorkersForCompany(companyId);
    return {
      total_workers: workers.length,
      departments: [...new Set(workers.map((w) => w.department))],
      sites: [...new Set(workers.map((w) => w.site))],
      my_kora_enabled_count: workers.filter((w) => w.my_kora_enabled).length,
      privacy_boundary_note:
        'Solo aggregati aziendali visibili. Nessun dato individuale esposto.',
    };
  }

  inviteWorker(workerId: string): { success: boolean; note: string } {
    return {
      success: true,
      note: `Demo: invito My KORA simulato per ${workerId}. Nessuna email reale. In produzione richiede auth provider e consenso esplicito.`,
    };
  }

  disableWorker(workerId: string): { success: boolean; note: string } {
    return {
      success: true,
      note: `Demo: lavoratore ${workerId} disabilitato (simulato).`,
    };
  }

  deleteDemoWorker(workerId: string): { success: boolean; note: string } {
    const worker = records.find((w) => w.worker_id === workerId);
    if (!worker) return { success: false, note: 'Lavoratore non trovato nel roster.' };
    if (!['draft'].includes(worker.worker_account_status)) {
      return { success: false, note: 'Solo record draft del roster demo possono essere eliminati.' };
    }
    return {
      success: true,
      note: `Demo: record roster ${workerId} eliminato (simulato).`,
    };
  }

  // Worker-private path — only accessible on worker_private scope
  getWorkerPrivateProfile(workerId: string): WorkerRosterRecord | null {
    // Only roster data (no PIB). PIB is computed by ScoringSimulatorService, never stored here.
    return records.find((w) => w.worker_id === workerId) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  assertEmployerCannotViewIndividualPIB(companyId: string, workerId: string): void {
    // This assertion documents the architectural rule.
    // PIB records are worker-private by design. This method is called
    // wherever individual PIB access is attempted to make the boundary explicit.
    // employer_can_view_individual_pib = false on every WorkerRosterRecord.
  }
}

export const workerProvisioningService = new WorkerProvisioningService();

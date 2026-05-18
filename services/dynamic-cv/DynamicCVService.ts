import type { DynamicCVProfile, KoraRole } from '@/lib/types';
import { isWorkerRole } from '@/lib/permissions';

export interface IDynamicCVService {
  // Worker-self only — employer roles must never call this service or receive its output
  getProfile(workerId: string, role: KoraRole): DynamicCVProfile | null;
}

export class DynamicCVService implements IDynamicCVService {
  getProfile(workerId: string, role: KoraRole): DynamicCVProfile | null {
    if (!isWorkerRole(role)) {
      throw new Error(`DynamicCVService: role ${role} is not permitted — worker-self access only`);
    }
    return {
      worker_id: workerId,
      cv_items: [],
      milestones: [],
      sharing_settings: {},
      export_readiness: false,
      synthetic_demo_data: true,
    };
  }
}

export const dynamicCVService = new DynamicCVService();

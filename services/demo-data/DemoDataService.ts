import type { KoraRole, ScenarioId } from '@/lib/types';
import { rolePermissionService } from '@/services/role-permission/RolePermissionService';

export type SeedResourceType =
  | 'companies' | 'workers' | 'departments-sites' | 'programs'
  | 'source-batches' | 'uef-records' | 'impact-units' | 'pib-records'
  | 'company-aggregates' | 'kora-index-outputs' | 'kora-contribution-outputs'
  | 'activation-safeguard-results' | 'explainability-records' | 'confidence-records'
  | 'partner-catalog' | 'opportunities' | 'collective-initiatives' | 'booking-requests'
  | 'dynamic-cv-items' | 'milestones' | 'consent-records' | 'advisor-reviews'
  | 'reports' | 'founder-validation-contacts';

// Employer-facing components must never directly import these files
const WORKER_PRIVATE_RESOURCES = new Set<SeedResourceType>([
  'workers', 'pib-records', 'impact-units', 'dynamic-cv-items',
  'booking-requests', 'consent-records', 'milestones',
]);

export interface IDemoDataService {
  getResource<T>(role: KoraRole, scenarioId: ScenarioId, resource: SeedResourceType): T[];
}

export class DemoDataService implements IDemoDataService {
  getResource<T>(role: KoraRole, scenarioId: ScenarioId, resource: SeedResourceType): T[] {
    // Enforce privacy boundary — employer roles cannot receive worker-private resources
    if (WORKER_PRIVATE_RESOURCES.has(resource)) {
      const permission = rolePermissionService.canAccess(role, resource as string);
      if (!permission.allowed) return [];
    }

    // Stub: returns empty array until seed files are populated (Phase 1)
    void scenarioId;
    return [];
  }
}

export const demoDataService = new DemoDataService();

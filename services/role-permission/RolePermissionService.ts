import type { KoraRole, PermissionResult } from '@/lib/types';
import { resolvePermission, isWorkerRole } from '@/lib/permissions';

export interface IRolePermissionService {
  canAccess(role: KoraRole, resource: string, context?: { companyId?: string; workerId?: string }): PermissionResult;
}

export class RolePermissionService implements IRolePermissionService {
  canAccess(
    role: KoraRole,
    resource: string,
    _context?: { companyId?: string; workerId?: string },
  ): PermissionResult {
    // pib-records are never accessible to employer roles under any path
    if (resource === 'pib-records' && !isWorkerRole(role)) {
      return { allowed: false, reason: 'PIB records are worker-private — never accessible to employer roles' };
    }

    const allowed = resolvePermission(role, resource);
    return {
      allowed,
      reason: allowed ? undefined : `Role ${role} does not have access to resource: ${resource}`,
    };
  }
}

export const rolePermissionService = new RolePermissionService();

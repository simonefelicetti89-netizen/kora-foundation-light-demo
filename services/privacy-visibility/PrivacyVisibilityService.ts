import type { KoraRole, PrivacyDataType, PrivacyVisibilityResult } from '@/lib/types';
import { SAFE_AGGREGATION_THRESHOLD } from '@/lib/constants/kora';
import { isEmployerRole } from '@/lib/permissions';

export interface IPrivacyVisibilityService {
  isSuppressed(role: KoraRole, dataType: PrivacyDataType, groupSize?: number): PrivacyVisibilityResult;
}

const EMPLOYER_BLOCKED_TYPES = new Set<PrivacyDataType>([
  'pib', 'uef', 'impact_units', 'worker_profiles', 'my_kora',
  'booking', 'dynamic_cv', 'consent',
]);

export class PrivacyVisibilityService implements IPrivacyVisibilityService {
  isSuppressed(role: KoraRole, dataType: PrivacyDataType, groupSize?: number): PrivacyVisibilityResult {
    // Employer roles are structurally blocked from individual worker data
    if (isEmployerRole(role) && EMPLOYER_BLOCKED_TYPES.has(dataType)) {
      return { suppressed: true, reason: 'employer_role' };
    }

    // Safe aggregation threshold — groups < 10 are suppressed for employer roles
    if (isEmployerRole(role) && groupSize !== undefined && groupSize < SAFE_AGGREGATION_THRESHOLD) {
      return { suppressed: true, reason: 'group_too_small', threshold: SAFE_AGGREGATION_THRESHOLD };
    }

    return { suppressed: false };
  }
}

export const privacyVisibilityService = new PrivacyVisibilityService();

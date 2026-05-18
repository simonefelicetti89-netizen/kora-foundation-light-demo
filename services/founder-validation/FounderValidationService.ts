import type { FounderValidationContact, KoraRole } from '@/lib/types';
import { isAdminRole } from '@/lib/permissions';

export interface ValidationPipeline {
  contacts: FounderValidationContact[];
  pipeline_kpis: {
    total_contacts: number;
    meetings_set: number;
    pilot_commitments: number;
    positive_revenue_signals: number;
  };
}

export interface IFounderValidationService {
  // Admin / Founder only — never visible to company or worker roles
  getPipeline(role: KoraRole): ValidationPipeline;
}

export class FounderValidationService implements IFounderValidationService {
  getPipeline(role: KoraRole): ValidationPipeline {
    if (!isAdminRole(role) && role !== 'FOUNDER_INTERNAL') {
      return { contacts: [], pipeline_kpis: { total_contacts: 0, meetings_set: 0, pilot_commitments: 0, positive_revenue_signals: 0 } };
    }
    return {
      contacts: [],
      pipeline_kpis: { total_contacts: 0, meetings_set: 0, pilot_commitments: 0, positive_revenue_signals: 0 },
    };
  }
}

export const founderValidationService = new FounderValidationService();

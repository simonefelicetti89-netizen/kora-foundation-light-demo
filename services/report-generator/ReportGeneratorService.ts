import type { KoraRole, ScenarioId, ReportData } from '@/lib/types';
import { isEmployerRole } from '@/lib/permissions';

export type ReportType =
  | 'executive_summary' | 'kora_index_detail' | 'activation_report'
  | 'pillar_breakdown' | 'financial_governance' | 'sustainability_annex'
  | 'welfare_statement' | 'advisor_evidence_summary';

export interface IReportGeneratorService {
  generate(reportType: ReportType, companyId: string, scenarioId: ScenarioId, role: KoraRole): ReportData;
}

export class ReportGeneratorService implements IReportGeneratorService {
  generate(reportType: ReportType, companyId: string, scenarioId: ScenarioId, role: KoraRole): ReportData {
    // Employer-facing reports must never contain individual worker data
    if (isEmployerRole(role) && (reportType === 'advisor_evidence_summary')) {
      return { report_type: reportType, company_id: companyId, scenario_id: scenarioId, sections: [], synthetic_demo_data: true };
    }
    return {
      report_type: reportType,
      company_id: companyId,
      scenario_id: scenarioId,
      sections: [{ title: 'Stub section', content: 'Populated from seed data in Phase 1.' }],
      synthetic_demo_data: true,
    };
  }
}

export const reportGeneratorService = new ReportGeneratorService();

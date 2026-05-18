import type { KoraIndexOutput } from '@/lib/types';

export interface ExplainabilityRecord {
  kora_index_id: string;
  summary: string;
  component_explanations: Array<{ code: string; explanation: string }>;
  data_quality_notes: string[];
  limitations_statement: string;
  methodology_version: string;
}

export interface IExplainabilityService {
  explain(output: KoraIndexOutput): ExplainabilityRecord;
}

export class ExplainabilityService implements IExplainabilityService {
  explain(output: KoraIndexOutput): ExplainabilityRecord {
    return {
      kora_index_id: output.id,
      summary: `KORA Index of ${output.kora_index_value.toFixed(1)} reflects ${output.safeguard_status === 'CLEAR' ? 'broad activation across pillars.' : 'concentrated activation in a minority of the workforce.'}`,
      component_explanations: output.components.map((c) => ({
        code: c.code,
        explanation: `${c.label}: stub explanation — populated from seed data in Phase 1.`,
      })),
      data_quality_notes: ['Stub — populated from confidence-records.json in Phase 1.'],
      limitations_statement:
        'This score is produced by KORA Foundation Light v0.1 under provisional methodology. It is pilot-grade diagnostic intelligence — not scientifically validated, empirically calibrated, or regulatory-grade.',
      methodology_version: output.methodology_version_id,
    };
  }
}

export const explainabilityService = new ExplainabilityService();

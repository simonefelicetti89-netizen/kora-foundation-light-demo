// lib/upload/index.ts
// Barrel export for lib/upload utilities.

export { parseUploadedFile } from './file-parser';
export type { ParsedUploadResult } from './file-parser';

export { detectColumnMappings } from './column-detection';
export { detectSensitiveColumns } from './sensitive-column-detection';

export {
  ALL_TEMPLATES,
  PROGRAMS_INITIATIVES_TEMPLATE,
  WORKFORCE_AGGREGATES_TEMPLATE,
  HR_KPI_AGGREGATES_TEMPLATE,
  BUDGET_RECORDS_TEMPLATE,
  CARE_ECONOMY_RECORDS_TEMPLATE,
} from './sample-templates';
export type { SampleTemplate } from './sample-templates';

export {
  ALL_EXAMPLES,
  EXAMPLE_WELFARE_PROGRAMS_CSV,
  EXAMPLE_BUDGET_XLSX_ITALIAN_NUMBERS,
  EXAMPLE_HR_AGGREGATE_WITH_SENSITIVE_COLUMNS,
  EXAMPLE_MULTI_SHEET_XLSX,
  EXAMPLE_STRUCTURAL_POLICY_CSV,
} from './parser-examples';
export type { ParserExample } from './parser-examples';

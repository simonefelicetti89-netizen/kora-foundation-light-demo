export const PILLAR_CODES = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

export const KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'NI', 'WB', 'PC', 'PB', 'EQ', 'VR', 'CO', 'CS'] as const;

// 11 active demo roles — KORA_PRIVACY_OFFICER excluded (Gate 3 / production only, doc 24)
export const KORA_ROLES = [
  'KORA_ADMIN',
  'KORA_ANALYST',
  'FOUNDER_INTERNAL',
  'COMPANY_ADMIN',
  'COMPANY_HR',
  'COMPANY_ESG',
  'COMPANY_FINANCE',
  'COMPANY_VIEWER',
  'WORKER_MY_KORA',
  'PARTNER_ADMIN_LIGHT',
  'ADVISOR_EXTERNAL_LIGHT',
] as const;

export const SAFEGUARD_THRESHOLDS = {
  CLEAR: { AR: 0.40, MAR: 0.30 },
  WARNING: { AR_min: 0.20, AR_max: 0.40, MAR_min: 0.15, MAR_max: 0.30 },
  FLAGGED: { AR_max: 0.20, MAR_max: 0.15 },
} as const;

export const SAFE_AGGREGATION_THRESHOLD = 10;

export const CALIBRATION_STATUS = 'pre_empirical_calibration' as const;

export const METHODOLOGY_VERSION = 'KORA Methodology v0.1' as const;

export const COMPONENT_LABELS: Record<string, string> = {
  AR: 'Activation Rate',
  MAR: 'Meaningful Activation Rate',
  NI: 'Normalized Intensity',
  WB: 'Worker Balance',
  PC: 'Pillar Coverage',
  PB: 'Pillar Balance',
  EQ: 'Equity',
  VR: 'Verification Rate',
  CO: 'Continuity',
  CS: 'Confidence Score',
};

export const PILLAR_LABELS: Record<string, string> = {
  LIFE: 'Life',
  GROWTH: 'Growth',
  CONNECTION: 'Connection',
  IMPACT: 'Impact',
  LEGACY: 'Legacy',
};

export const EMPLOYER_ROLES = [
  'COMPANY_ADMIN',
  'COMPANY_HR',
  'COMPANY_ESG',
  'COMPANY_FINANCE',
  'COMPANY_VIEWER',
] as const;

export const WORKER_ROLES = ['WORKER_MY_KORA'] as const;

export const ADMIN_ROLES = ['KORA_ADMIN', 'KORA_ANALYST', 'FOUNDER_INTERNAL'] as const;

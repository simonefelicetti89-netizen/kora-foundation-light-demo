export function formatKoraIndex(value: number): string {
  return value.toFixed(1);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatConfidenceScore(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatPillarCode(code: string): string {
  const labels: Record<string, string> = {
    LIFE: 'Life', GROWTH: 'Growth', CONNECTION: 'Connection',
    IMPACT: 'Impact', LEGACY: 'Legacy',
  };
  return labels[code] ?? code;
}

export function formatComponentCode(code: string): string {
  const labels: Record<string, string> = {
    AR: 'Activation Rate', MAR: 'Meaningful Activation Rate',
    NI: 'Normalized Intensity', WB: 'Worker Balance',
    PC: 'Pillar Coverage', PB: 'Pillar Balance',
    EQ: 'Equity', VR: 'Verification Rate',
    CO: 'Continuity', CS: 'Confidence Score',
  };
  return labels[code] ?? code;
}

export function formatCalibrationStatus(status: string): string {
  if (status === 'pre_empirical_calibration') return 'Pre-Empirical Calibration';
  if (status === 'delphi_calibrated') return 'Delphi Calibrated';
  if (status === 'empirically_validated') return 'Empirically Validated';
  return status;
}

export function formatRole(role: string): string {
  const labels: Record<string, string> = {
    KORA_ADMIN: 'KORA Admin', KORA_ANALYST: 'KORA Analyst',
    FOUNDER_INTERNAL: 'Founder / Internal', COMPANY_ADMIN: 'Company Admin',
    COMPANY_HR: 'Company HR / People', COMPANY_ESG: 'Company ESG',
    COMPANY_FINANCE: 'Company Finance', COMPANY_VIEWER: 'Company Viewer',
    WORKER_MY_KORA: 'Worker / My KORA', PARTNER_ADMIN_LIGHT: 'Partner Admin Light',
    ADVISOR_EXTERNAL_LIGHT: 'Advisor External Light',
  };
  return labels[role] ?? role;
}

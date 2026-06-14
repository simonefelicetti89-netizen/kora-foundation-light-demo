export function formatKoraIndex(value: number): string {
  // Always integer — no decimal noise on the flagship score
  return String(Math.round(value));
}

export function formatPercentage(value: number): string {
  // Always integer percentage — no .0 decimal artifacts
  return `${Math.round(value * 100)}%`;
}

export function formatConfidenceScore(value: number): string {
  return `${Math.round(value * 100)}%`;
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
    KORA_ADMIN:    'KORA Admin',
    COMPANY_ADMIN: 'Company Admin',
    WORKER:        'Worker',
    PARTNER:        'Partner',
    ADVISOR:        'Advisor',
  };
  return labels[role] ?? role;
}

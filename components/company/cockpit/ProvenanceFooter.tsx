'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface ProvenanceFooterProps {
  methodologyVersionId: string;
  calibrationStatus:    string;
  reportingPeriod:      string;
}

export function ProvenanceFooter({
  methodologyVersionId,
  calibrationStatus,
  reportingPeriod,
}: ProvenanceFooterProps) {
  return (
    <div
      className="py-4"
      style={{ borderTop: `1px solid ${TOKENS.inkBorder}` }}
    >
      <p
        className="font-mono"
        style={{ fontSize: '11px', color: 'rgba(6,3,43,0.40)', letterSpacing: '0.04em' }}
      >
        {methodologyVersionId}
        &nbsp;&middot;&nbsp;
        {calibrationStatus}
        &nbsp;&middot;&nbsp;
        {reportingPeriod}
        &nbsp;&middot;&nbsp;
        ≥10 lavoratori per segmento
        &nbsp;&middot;&nbsp;
        synthetic_demo_data: true
      </p>
    </div>
  );
}

'use client';

import { MethodologyBadge } from '@/components/ui/MethodologyBadge';

interface ProvenanceFooterProps {
  methodologyVersionId: string;
  calibrationStatus:    string;
  reportingPeriod:      string;
}

export function ProvenanceFooter({ methodologyVersionId, calibrationStatus, reportingPeriod }: ProvenanceFooterProps) {
  return (
    <MethodologyBadge
      versionId={methodologyVersionId}
      calibrationStatus={calibrationStatus}
      period={reportingPeriod}
      variant="footer"
    />
  );
}

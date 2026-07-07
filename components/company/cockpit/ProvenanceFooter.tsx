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
      // ProvenanceFooter is only used on live company-facing pages (financial,
      // activation, pillars, kora-index, reports) — never synthetic/demo data.
      // MethodologyBadge's default (true) is meant for demo/preview contexts.
      showSynthetic={false}
    />
  );
}

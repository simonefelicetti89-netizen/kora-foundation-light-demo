'use client';

import { cn } from '@/lib/utils';
import type { PrivacySuppressReason } from '@/lib/types';
import { SAFE_AGGREGATION_THRESHOLD } from '@/lib/constants/kora';

interface PrivacyBoundaryNoticeProps {
  reason: PrivacySuppressReason;
  dataType?: string;
  groupSize?: number;
  className?: string;
}

const REASON_MESSAGES: Record<PrivacySuppressReason, string> = {
  employer_role: 'Questo dato appartiene al layer personale del lavoratore. I ruoli aziendali non hanno accesso ai record individuali.',
  group_too_small: `This segment contains fewer than ${SAFE_AGGREGATION_THRESHOLD} workers and is suppressed to prevent re-identification.`,
  insufficient_permission: 'Your current role does not have permission to view this data.',
  worker_consent_required: 'Worker consent is required before this data can be shared.',
};

// Suppression must never be silent — always renders this notice, never empty
export function PrivacyBoundaryNotice({ reason, dataType, groupSize, className }: PrivacyBoundaryNoticeProps) {
  const message = reason === 'group_too_small' && groupSize !== undefined
    ? `This segment contains ${groupSize} worker${groupSize === 1 ? '' : 's'}, below the minimum threshold of ${SAFE_AGGREGATION_THRESHOLD}. Data suppressed to prevent re-identification.`
    : REASON_MESSAGES[reason];

  return (
    <div
      className={cn(
        'rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4 text-sm text-[rgba(6,3,43,0.62)]',
        className,
      )}
      role="status"
      aria-label="Privacy boundary notice"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[rgba(6,3,43,0.40)]">🔒</span>
        <div>
          <p className="font-medium text-[rgba(6,3,43,0.78)]">Privacy Boundary</p>
          <p className="mt-1">{message}</p>
          {dataType && (
            <p className="mt-1 text-xs text-[rgba(6,3,43,0.52)]">Data type: {dataType}</p>
          )}
        </div>
      </div>
    </div>
  );
}

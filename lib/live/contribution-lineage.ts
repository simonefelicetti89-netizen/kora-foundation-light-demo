// lib/live/contribution-lineage.ts
// B29: Derives the KORA contribution role for an intake record.
// Pure function — no DB, no LLM, deterministic.
//
// Used by the Company Evidence Archive API to classify each initiative
// by its role in the KORA Index computation pipeline.

export type ContributionRole =
  | 'kora_index_and_bti'       // eligible + approved + deep_activation budget
  | 'kora_index_only'          // eligible + approved + no/unknown budget or non-BTI budget
  | 'bti_only_economic_relief' // limited (voucher, fringe benefit, welfare wallet)
  | 'reporting_context_only'   // eligible but not approved for scoring — reporting support only
  | 'excluded_compliance'      // blocked (legal, HSE, compliance baseline)
  | 'needs_info'               // review_status = needs_info
  | 'rejected'                 // review_status = rejected
  | 'pending_review';          // review_status = pending_review / pending

export type ContributionRoleEntry = {
  role: ContributionRole;
  explanation: string;
  contributes: boolean;  // true only for kora_index_and_bti and kora_index_only
};

const DEEP_ACTIVATION_CLASSES = new Set([
  'deep_activation', 'deep', 'structural_benefit', 'non_monetary_activation',
]);

export function deriveContributionRole(params: {
  eligibilityStatus: string;
  reviewStatus: string;
  approvedForScoring: boolean;
  budgetClass?: string | null;
}): ContributionRoleEntry {
  const { eligibilityStatus, reviewStatus, approvedForScoring, budgetClass } = params;

  // Rejected or needs_info take priority
  if (reviewStatus === 'rejected') {
    return {
      role: 'rejected',
      explanation: 'Rejected during UEF Review. Not included in scoring.',
      contributes: false,
    };
  }
  if (reviewStatus === 'needs_info') {
    return {
      role: 'needs_info',
      explanation: 'Requires additional evidence or enrichment before scoring.',
      contributes: false,
    };
  }

  // Compliance baseline
  if (eligibilityStatus === 'blocked') {
    return {
      role: 'excluded_compliance',
      explanation: 'Legal, HSE or compliance baseline. Necessary obligation, excluded from KORA activation impact.',
      contributes: false,
    };
  }

  // Economic relief / limited
  if (eligibilityStatus === 'limited') {
    return {
      role: 'bti_only_economic_relief',
      explanation: 'Economic relief / benefit coverage. Tracked in BTI, not treated as deep activation. Does not generate Impact Units.',
      contributes: false,
    };
  }

  // Pending review
  if (reviewStatus === 'pending_review' || reviewStatus === 'pending' || !approvedForScoring) {
    if (eligibilityStatus === 'eligible') {
      return {
        role: 'pending_review',
        explanation: 'Eligible initiative awaiting operator review. Not yet included in scoring.',
        contributes: false,
      };
    }
    return {
      role: 'pending_review',
      explanation: 'Waiting for operator review. Not included in scoring yet.',
      contributes: false,
    };
  }

  // Approved eligible
  if (eligibilityStatus === 'eligible' && approvedForScoring) {
    const bc = (budgetClass ?? '').toLowerCase().trim();
    if (bc && DEEP_ACTIVATION_CLASSES.has(bc)) {
      return {
        role: 'kora_index_and_bti',
        explanation: 'Approved eligible initiative contributing to organizational activation and BTI financial governance.',
        contributes: true,
      };
    }
    if (bc === 'economic_relief') {
      return {
        role: 'bti_only_economic_relief',
        explanation: 'Economic relief benefit. Tracked in BTI, not generating Impact Units.',
        contributes: false,
      };
    }
    if (bc === 'compliance_blocked') {
      return {
        role: 'excluded_compliance',
        explanation: 'Compliance-classified budget. Excluded from KORA activation impact.',
        contributes: false,
      };
    }
    return {
      role: 'kora_index_only',
      explanation: 'Approved eligible initiative contributing to organizational activation.',
      contributes: true,
    };
  }

  // Eligible but not approved — reporting context
  if (eligibilityStatus === 'eligible') {
    return {
      role: 'reporting_context_only',
      explanation: 'Eligible initiative not yet approved for scoring. May support reporting context when reviewed.',
      contributes: false,
    };
  }

  // Fallback
  return {
    role: 'pending_review',
    explanation: 'Status undetermined — awaiting review.',
    contributes: false,
  };
}

export const CONTRIBUTION_ROLE_LABELS: Record<ContributionRole, string> = {
  kora_index_and_bti:       'KORA Index + BTI',
  kora_index_only:          'KORA Index',
  bti_only_economic_relief: 'BTI / Economic Relief',
  reporting_context_only:   'Reporting Context',
  excluded_compliance:      'Compliance Excluded',
  needs_info:               'Needs Info',
  rejected:                 'Rejected',
  pending_review:           'Pending Review',
};

export const CONTRIBUTION_ROLE_COLOR: Record<ContributionRole, { bg: string; text: string; border: string }> = {
  kora_index_and_bti:       { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  kora_index_only:          { bg: '#f5f4ff', text: '#4d3d9e', border: '#c7c4f8' },
  bti_only_economic_relief: { bg: '#fffbeb', text: '#854d0e', border: '#fde68a' },
  reporting_context_only:   { bg: '#f0f9ff', text: '#0c4a6e', border: '#bae6fd' },
  excluded_compliance:      { bg: '#fef9c3', text: '#713f12', border: '#fef08a' },
  needs_info:               { bg: '#faf5ff', text: '#581c87', border: '#e9d5ff' },
  rejected:                 { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  pending_review:           { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
};

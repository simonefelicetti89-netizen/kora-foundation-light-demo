import type { KoraRole, ScenarioId } from '@/lib/types';
import { isWorkerRole } from '@/lib/permissions';

export interface PillarPreview {
  pillar: string;
  label: string;
  score: number; // 0–100 relative to worker's own history
  trend: 'up' | 'stable' | 'down';
  event_count: number;
}

export interface TimelineItem {
  id: string;
  date: string;
  category: string; // category-level only, no health details
  pillar: string;
  source_type: string;
  verification_status: 'verified' | 'partial' | 'self_declared';
  iu_contribution: 'high' | 'medium' | 'low'; // qualitative only
}

export interface PibLightPreview {
  period: string;
  overall_index: number; // 0–100, personal context only
  active_pillars: number;
  total_events: number;
  pillar_breakdown: PillarPreview[];
  disclaimer: string;
  not_employer_visible: true;
  not_performance_score: true;
}

export interface ConsentToggle {
  id: string;
  label: string;
  description: string;
  current_state: 'on' | 'off';
  scope: 'aggregate_only' | 'none' | 'worker_controlled';
  editable_in_preview: false; // always false in Foundation Light
}

export interface PrivacySummary {
  persona_label: string;
  company_can_see: string[];
  company_cannot_see: string[];
  consent_toggles: ConsentToggle[];
  privacy_guarantee: string;
}

export interface DynamicCVItem {
  id: string;
  title: string;
  pillar: string;
  pillar_label: string;
  date: string;
  source_category: string;
  verification_status: 'verified' | 'partial' | 'self_declared';
  shareable: boolean;
  export_label: string;
}

export interface DynamicCVPreview {
  persona_label: string;
  items: DynamicCVItem[];
  total_items: number;
  verified_count: number;
  disclaimer: string;
  export_available: false; // always false in Foundation Light
}

export interface OpportunityPreview {
  id: string;
  title: string;
  pillar: string;
  pillar_label: string;
  type: string;
  provider: string;
  status: 'coming_soon' | 'preview';
}

export interface MyKoraHomePreview {
  persona_label: string;
  scenario_id: ScenarioId;
  pib_light: PibLightPreview;
  timeline: TimelineItem[];
  opportunities: OpportunityPreview[];
  synthetic_demo_data: true;
}

// Static synthetic preview data — Foundation Light only
// No external seed file: data is co-located with the service for Gate 2 compliance

const PERSONA_A_PIB_S1: PibLightPreview = {
  period: 'Q1–Q2 2025',
  overall_index: 34,
  active_pillars: 3,
  total_events: 8,
  pillar_breakdown: [
    { pillar: 'LIFE',       label: 'Life',       score: 52, trend: 'stable', event_count: 3 },
    { pillar: 'GROWTH',     label: 'Growth',     score: 41, trend: 'up',     event_count: 3 },
    { pillar: 'CONNECTION', label: 'Connection', score: 28, trend: 'stable', event_count: 2 },
    { pillar: 'IMPACT',     label: 'Impact',     score: 0,  trend: 'stable', event_count: 0 },
    { pillar: 'LEGACY',     label: 'Legacy',     score: 0,  trend: 'stable', event_count: 0 },
  ],
  disclaimer: 'This is your personal impact balance — informational and worker-private. It does not rate your performance and is never visible to your employer.',
  not_employer_visible: true,
  not_performance_score: true,
};

const PERSONA_A_PIB_S2: PibLightPreview = {
  period: 'Q1–Q4 2025',
  overall_index: 61,
  active_pillars: 5,
  total_events: 17,
  pillar_breakdown: [
    { pillar: 'LIFE',       label: 'Life',       score: 70, trend: 'up',     event_count: 5 },
    { pillar: 'GROWTH',     label: 'Growth',     score: 65, trend: 'up',     event_count: 4 },
    { pillar: 'CONNECTION', label: 'Connection', score: 48, trend: 'up',     event_count: 4 },
    { pillar: 'IMPACT',     label: 'Impact',     score: 55, trend: 'up',     event_count: 2 },
    { pillar: 'LEGACY',     label: 'Legacy',     score: 31, trend: 'up',     event_count: 2 },
  ],
  disclaimer: 'This is your personal impact balance — informational and worker-private. It does not rate your performance and is never visible to your employer.',
  not_employer_visible: true,
  not_performance_score: true,
};

const TIMELINE_S1: TimelineItem[] = [
  {
    id: 'tl-001', date: '2025-03-12',
    category: 'Wellness check-in',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'verified', iu_contribution: 'medium',
  },
  {
    id: 'tl-002', date: '2025-02-20',
    category: 'Digital skills training',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'high',
  },
  {
    id: 'tl-003', date: '2025-02-05',
    category: 'Physical activity program',
    pillar: 'LIFE', source_type: 'welfare_provider',
    verification_status: 'partial', iu_contribution: 'medium',
  },
  {
    id: 'tl-004', date: '2025-01-18',
    category: 'Peer collaboration session',
    pillar: 'CONNECTION', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'low',
  },
  {
    id: 'tl-005', date: '2025-01-07',
    category: 'Leadership development module',
    pillar: 'GROWTH', source_type: 'lms_training',
    verification_status: 'verified', iu_contribution: 'high',
  },
];

const TIMELINE_S2: TimelineItem[] = [
  ...TIMELINE_S1,
  {
    id: 'tl-006', date: '2025-06-10',
    category: 'Community volunteering',
    pillar: 'IMPACT', source_type: 'esg_initiatives',
    verification_status: 'verified', iu_contribution: 'high',
  },
  {
    id: 'tl-007', date: '2025-05-22',
    category: 'Knowledge transfer session',
    pillar: 'LEGACY', source_type: 'partner_events',
    verification_status: 'partial', iu_contribution: 'medium',
  },
  {
    id: 'tl-008', date: '2025-04-30',
    category: 'Mentoring — junior colleague',
    pillar: 'CONNECTION', source_type: 'manual_upload',
    verification_status: 'self_declared', iu_contribution: 'medium',
  },
];

const OPPORTUNITIES_S1: OpportunityPreview[] = [
  {
    id: 'opp-001', title: 'Wellbeing Oasis — next cycle',
    pillar: 'LIFE', pillar_label: 'Life',
    type: 'Wellbeing program', provider: 'Welfare Provider', status: 'preview',
  },
  {
    id: 'opp-002', title: 'Learning Accelerator — Q3 intake',
    pillar: 'GROWTH', pillar_label: 'Growth',
    type: 'Training program', provider: 'LMS Platform', status: 'coming_soon',
  },
  {
    id: 'opp-003', title: 'Mentoring Circle — open seats',
    pillar: 'CONNECTION', pillar_label: 'Connection',
    type: 'Collective initiative', provider: 'Internal', status: 'coming_soon',
  },
];

const OPPORTUNITIES_S2: OpportunityPreview[] = [
  {
    id: 'opp-001', title: 'Wellbeing Oasis — ongoing',
    pillar: 'LIFE', pillar_label: 'Life',
    type: 'Wellbeing program', provider: 'Welfare Provider', status: 'preview',
  },
  {
    id: 'opp-002', title: 'Emerging Leaders — autumn cohort',
    pillar: 'GROWTH', pillar_label: 'Growth',
    type: 'Leadership program', provider: 'Internal', status: 'coming_soon',
  },
  {
    id: 'opp-003', title: 'Territorial Volunteer — community day',
    pillar: 'IMPACT', pillar_label: 'Impact',
    type: 'Collective initiative', provider: 'Ecosystem Partner', status: 'preview',
  },
];

const PRIVACY_SUMMARY: PrivacySummary = {
  persona_label: 'Persona A — Operations / Plant Bergamo',
  company_can_see: [
    'Company-level KORA Index (aggregate)',
    'Pillar distribution across all workers (aggregate)',
    'Department activation rates (groups ≥ 10 workers only)',
    'Participation counts per program (aggregate, anonymized)',
    'Verification rates at company level',
  ],
  company_cannot_see: [
    'Your individual PIB (Personal Impact Balance)',
    'Your personal timeline or event history',
    'Your Dynamic Impact CV',
    'Which programs you specifically joined',
    'Your health data, wellbeing details, or diagnosis records',
    'Your bookings or consent choices',
    'Any data from groups smaller than 10 workers',
  ],
  consent_toggles: [
    {
      id: 'ct-aggregate-participation', label: 'Contribute to aggregate company data',
      description: 'Your events count toward the company KORA Index (anonymized, never individual).',
      current_state: 'on', scope: 'aggregate_only', editable_in_preview: false,
    },
    {
      id: 'ct-advisor-review', label: 'Allow advisor review of your UEF records',
      description: 'External advisors may review event category metadata to validate eligibility (no personal identification).',
      current_state: 'on', scope: 'aggregate_only', editable_in_preview: false,
    },
    {
      id: 'ct-dynamic-cv-export', label: 'Export Dynamic Impact CV to external parties',
      description: 'Share your verified impact items with potential employers or partners (worker-initiated only).',
      current_state: 'off', scope: 'worker_controlled', editable_in_preview: false,
    },
    {
      id: 'ct-collective-initiatives', label: 'Participate in cross-company collective initiatives',
      description: 'Your aggregate contribution count may appear in collective initiative reports (no name or ID).',
      current_state: 'on', scope: 'aggregate_only', editable_in_preview: false,
    },
  ],
  privacy_guarantee: 'Il datore di lavoro vede solo insight aggregati sopra soglia privacy. Il PIB individuale, la timeline personale e il Dynamic Impact CV restano nel layer personale del lavoratore.',
};

const CV_ITEMS: DynamicCVItem[] = [
  {
    id: 'cv-001', title: 'Digital Skills Certification — Level 2',
    pillar: 'GROWTH', pillar_label: 'Growth',
    date: '2025-02-20', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verified by LMS Platform',
  },
  {
    id: 'cv-002', title: 'Leadership Development Module',
    pillar: 'GROWTH', pillar_label: 'Growth',
    date: '2025-01-07', source_category: 'LMS training',
    verification_status: 'verified', shareable: true,
    export_label: 'Verified by LMS Platform',
  },
  {
    id: 'cv-003', title: 'Community Volunteering — Territory Initiative',
    pillar: 'IMPACT', pillar_label: 'Impact',
    date: '2025-06-10', source_category: 'ESG / community',
    verification_status: 'verified', shareable: true,
    export_label: 'Verified by Advisor',
  },
  {
    id: 'cv-004', title: 'Knowledge Transfer — Junior Colleague Mentoring',
    pillar: 'LEGACY', pillar_label: 'Legacy',
    date: '2025-05-22', source_category: 'Partner event',
    verification_status: 'partial', shareable: false,
    export_label: 'Partial verification — not yet shareable',
  },
  {
    id: 'cv-005', title: 'Peer Collaboration Program',
    pillar: 'CONNECTION', pillar_label: 'Connection',
    date: '2025-01-18', source_category: 'Partner event',
    verification_status: 'partial', shareable: false,
    export_label: 'Partial verification — not yet shareable',
  },
  {
    id: 'cv-006', title: 'Physical Wellbeing Program — Ongoing',
    pillar: 'LIFE', pillar_label: 'Life',
    date: '2025-03-12', source_category: 'Welfare provider',
    verification_status: 'verified', shareable: true,
    export_label: 'Verified by Welfare Provider',
  },
];

class MyKoraPreviewService {
  // Role guard — only WORKER receives worker-private preview content
  canAccess(role: KoraRole): boolean {
    return isWorkerRole(role);
  }

  getMyKoraHomePreview(
    _workerPersonaId: string,
    scenarioId: ScenarioId,
  ): MyKoraHomePreview | null {
    const pib = scenarioId === 'S2' ? PERSONA_A_PIB_S2 : PERSONA_A_PIB_S1;
    const timeline = scenarioId === 'S2' ? TIMELINE_S2 : TIMELINE_S1;
    const opportunities = scenarioId === 'S2' ? OPPORTUNITIES_S2 : OPPORTUNITIES_S1;

    return {
      persona_label: 'Persona A — Operations / Plant Bergamo',
      scenario_id: scenarioId,
      pib_light: pib,
      timeline,
      opportunities,
      synthetic_demo_data: true,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPrivacySummary(_workerPersonaId: string): PrivacySummary {
    return PRIVACY_SUMMARY;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getDynamicCvPreview(_workerPersonaId: string): DynamicCVPreview {
    const verified = CV_ITEMS.filter((i) => i.verification_status === 'verified').length;
    return {
      persona_label: 'Persona A — Operations / Plant Bergamo',
      items: CV_ITEMS,
      total_items: CV_ITEMS.length,
      verified_count: verified,
      disclaimer:
        'Dynamic Impact CV is not automatically certified. Verification status is item-level. Only you decide what to export or share.',
      export_available: false,
    };
  }
}

export const myKoraPreviewService = new MyKoraPreviewService();

// services/submission-feedback/SubmissionFeedbackService.ts
// Mock service returning synthetic aggregate feedback data for demo.
// Gate 2 open — no real DB access. All data is aggregate-only; no individual worker records.

export interface SubmissionFeedbackData {
  companyId:             string;
  period:                string;
  isDemo:                boolean;
  dataMode:              'demo' | 'live';

  // Aggregate record counts
  recordsReceived:       number;
  recordsPending:        number;
  recordsReviewed:       number;
  recordsAccepted:       number; // eligible — full IU generation
  recordsLimited:        number; // partial IU — CF applied
  recordsBlocked:        number; // AGF=0 — no IU generated

  // Data quality aggregate metrics
  filesUploaded:         number;
  recordsParsed:         number;
  parseWarnings:         number;
  clarificationRequests: number;
}

// Meridiana Group synthetic demo data — aligned with doc 25 scenario
// 250 lavoratori, 6 file caricati, decision_pack_ready
const MERIDIANA_DEMO_FEEDBACK: SubmissionFeedbackData = {
  companyId:             'meridiana-group',
  period:                '2025 — Primo Semestre',
  isDemo:                true,
  dataMode:              'demo',
  recordsReceived:       847,
  recordsPending:        15,
  recordsReviewed:       832,
  recordsAccepted:       624, // 74.9% of reviewed → full IU
  recordsLimited:        148, // 17.8% of reviewed → partial IU
  recordsBlocked:        60,  // 7.2% of reviewed → AGF=0
  filesUploaded:         6,
  recordsParsed:         847,
  parseWarnings:         23,
  clarificationRequests: 2,
};

class SubmissionFeedbackService {
  getDemoFeedback(companyId: string): SubmissionFeedbackData {
    if (companyId === 'meridiana-group') return MERIDIANA_DEMO_FEEDBACK;
    return { ...MERIDIANA_DEMO_FEEDBACK, companyId };
  }
}

export const submissionFeedbackService = new SubmissionFeedbackService();

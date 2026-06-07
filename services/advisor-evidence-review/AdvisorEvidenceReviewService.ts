// AdvisorEvidenceReviewService — B86-B minimal advisor review workflow.
//
// Implements the smallest operational review loop:
//   pending → approved | rejected | flagged
//
// Foundation Light: in-memory state (resets on server restart — correct for demo).
// Pilot+: this service's interface will be backed by Supabase uef_record updates
//         (review_status, reviewer_notes, reviewed_at, reviewed_by fields already
//          exist in the schema — no schema change needed for Pilot+).
//
// No notifications. No assignment engine. No queues. No complex workflow.
// Privacy: no individual worker data. Review is on evidence records, not persons.

export type ReviewDecision = 'approved' | 'rejected' | 'flagged';

export interface EvidenceReviewRecord {
  itemId:      string;
  itemTitle:   string;
  evidenceLevel: string;
  pillar:      string;
  decision:    ReviewDecision;
  notes:       string | null;
  reviewedBy:  string;
  reviewedAt:  string;
}

export interface PendingReviewItem {
  itemId:        string;
  itemTitle:     string;
  evidenceLevel: string;
  pillar:        string;
  reviewStatus:  'pending';
}

export interface IAdvisorEvidenceReviewService {
  submitReview(itemId: string, itemTitle: string, evidenceLevel: string, pillar: string, decision: ReviewDecision, notes: string | null, reviewedBy: string): EvidenceReviewRecord;
  getReviewState(itemId: string): EvidenceReviewRecord | null;
  getAllReviewed(): EvidenceReviewRecord[];
  getPendingItems(): PendingReviewItem[];
}

// Synthetic pending items for Foundation Light demo — sourced from audit record data.
// These represent the UEF records that require advisor attention in the demo scenario.
const SYNTHETIC_PENDING: PendingReviewItem[] = [
  { itemId: 'eri-001', itemTitle: 'Log partecipazione — Bergamo Solidarity Network (Q4 2025)', evidenceLevel: 'partial', pillar: 'IMPACT', reviewStatus: 'pending' },
  { itemId: 'eri-002', itemTitle: 'Protocollo LIFE — VitaLab Network',                         evidenceLevel: 'partial', pillar: 'LIFE',   reviewStatus: 'pending' },
  { itemId: 'eri-003', itemTitle: 'Sample check Workshop Community Leadership',                 evidenceLevel: 'partial', pillar: 'CONNECTION', reviewStatus: 'pending' },
];

export class AdvisorEvidenceReviewService implements IAdvisorEvidenceReviewService {
  private readonly reviewed = new Map<string, EvidenceReviewRecord>();

  submitReview(
    itemId:        string,
    itemTitle:     string,
    evidenceLevel: string,
    pillar:        string,
    decision:      ReviewDecision,
    notes:         string | null,
    reviewedBy:    string,
  ): EvidenceReviewRecord {
    const record: EvidenceReviewRecord = {
      itemId,
      itemTitle,
      evidenceLevel,
      pillar,
      decision,
      notes:      notes ?? null,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
    };
    this.reviewed.set(itemId, record);
    return record;
  }

  getReviewState(itemId: string): EvidenceReviewRecord | null {
    return this.reviewed.get(itemId) ?? null;
  }

  getAllReviewed(): EvidenceReviewRecord[] {
    return Array.from(this.reviewed.values());
  }

  // Returns pending items not yet reviewed in this session.
  getPendingItems(): PendingReviewItem[] {
    return SYNTHETIC_PENDING.filter((item) => !this.reviewed.has(item.itemId));
  }
}

export const advisorEvidenceReviewService = new AdvisorEvidenceReviewService();

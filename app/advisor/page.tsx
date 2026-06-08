'use client';
// AD-01: Advisor Workspace — workspace di governance per advisor certificati KORA.
// Scopo: rispondere a 'cosa richiede revisione, quale evidenza è debole e quale raccomandazione emettere?'
// Advisor-reviewed ≠ KORA Certified. Perimetro: solo company/partner assegnati.
//
// B86-B: Evidence review workflow wired. Buttons are now functional within the session.
// In-memory state — resets on reload (correct for Foundation Light demo).

import { useState } from 'react';
import Link from 'next/link';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { DecisionContext } from '@/components/ui/DecisionContext';
import {
  evidenceReliabilityIntelligenceService,
  type PillarEvidenceBreakdown,
} from '@/services/evidence-reliability/EvidenceReliabilityIntelligenceService';
import {
  advisorEvidenceReviewService,
  type ReviewDecision,
  type PendingReviewItem,
  type EvidenceReviewRecord,
} from '@/services/advisor-evidence-review/AdvisorEvidenceReviewService';

// AD-01: Advisor Professional Workspace — Foundation Light Preview
// Synthetic demo data only. No real review workflow. No certification.
// Advisor-reviewed ≠ KORA Certified.
// Advisor performs: Process Audit, Evidence Protocol Review, sample checks, re-review, exception review.

// ─── Advisor profile ─────────────────────────────────────────────────────────

const ADVISOR_PROFILE = {
  full_name: 'Dr. Francesca Lombardi',
  avatar_initials: 'FL',
  advisor_id: 'KORA-ADV-042',
  license_number: 'ADV-LIFE-042-2026',
  advisor_type: 'Validator',
  seniority_level: 'Senior Advisor',
  specialization: 'LIFE / Salute preventiva e benessere organizzativo',
  issued_at: '2025-09-15',
  expires_at: '2026-09-15',
  license_status: 'Attiva — demo',
  academy_credits: 18,
  required_credits: 24,
  assigned_companies: ['Meridiana Group S.r.l.'],
  pending_reviews: 3,
  synthetic_demo_data: true,
};

// ─── Portfolio assignments ────────────────────────────────────────────────────

const ADVISOR_ASSIGNMENTS = [
  {
    id: 'as-001',
    entity: 'Meridiana Group S.r.l.',
    entity_type: 'Company',
    scope: 'Foundation Light pilot',
    next_check: '2026-04-12',
    status: 'Attivo',
  },
  {
    id: 'as-002',
    entity: 'Città Aperta APS',
    entity_type: 'Partner',
    scope: 'Protocollo IMPACT / CONNECTION — audit processo completato',
    next_check: null,
    status: 'Completato',
  },
  {
    id: 'as-003',
    entity: 'VitaLab Network',
    entity_type: 'Partner',
    scope: 'Protocollo LIFE — audit processo richiesto',
    next_check: null,
    status: 'In corso',
  },
  {
    id: 'as-004',
    entity: 'GrowthLab Academy',
    entity_type: 'Partner',
    scope: 'Protocollo GROWTH / LEGACY — review periodica',
    next_check: null,
    status: 'Periodico',
  },
] as const;

const ASSIGNMENT_STATUS_BADGE: Record<string, string> = {
  'Attivo':     'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  'Completato': 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
  'In corso':   'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  'Periodico':  'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
};

const ENTITY_TYPE_BADGE: Record<string, string> = {
  'Company': 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
  'Partner': 'bg-[rgba(107,122,146,0.10)] text-[#344256] border-[rgba(107,122,146,0.22)]',
};

// ─── Review queue ─────────────────────────────────────────────────────────────

type ReviewStatus = 'pending' | 'reviewed' | 'needs_information';
type Priority = 'alta' | 'media' | 'bassa';

interface ReviewQueueItem {
  id: string;
  item_title: string;
  entity: string;
  review_type: string;
  status: ReviewStatus;
  priority: Priority;
  due_date: string;
  review_scope: string;
  privacy_boundary: string;
  synthetic_demo_data: true;
}

const REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: 'rq-001',
    item_title: 'Protocollo LIFE — VitaLab Network',
    entity: 'VitaLab Network',
    review_type: 'Evidence Protocol Review',
    status: 'pending',
    priority: 'alta',
    due_date: '2026-04-05',
    review_scope: 'Protocollo evidenze servizio LIFE — validità, additionality, fonte',
    privacy_boundary: 'Solo protocollo — nessun dato individuale',
    synthetic_demo_data: true,
  },
  {
    id: 'rq-002',
    item_title: 'Sample check Bergamo Solidarity Network',
    entity: 'Bergamo Solidarity Network',
    review_type: 'Sample Check',
    status: 'pending',
    priority: 'media',
    due_date: '2026-04-18',
    review_scope: 'Campione aggregato — evidenza parziale in verifica',
    privacy_boundary: 'Aggregati sopra soglia — nessun nominativo',
    synthetic_demo_data: true,
  },
  {
    id: 'rq-003',
    item_title: 'Re-review Workshop Community Leadership',
    entity: 'Città Aperta APS',
    review_type: 'Re-review',
    status: 'pending',
    priority: 'media',
    due_date: '2026-05-02',
    review_scope: 'Eccezione evidenza parziale — revisione protocollo',
    privacy_boundary: 'Solo protocollo — perimetro assegnato',
    synthetic_demo_data: true,
  },
  {
    id: 'rq-004',
    item_title: 'Audit processo Programma Volontariato Territoriale',
    entity: 'Meridiana Group S.r.l.',
    review_type: 'Advisor Process Audit',
    status: 'pending',
    priority: 'alta',
    due_date: '2026-04-20',
    review_scope: 'Audit preliminare processo e protocollo IMPACT',
    privacy_boundary: 'Solo processo — nessun dato lavoratore individuale',
    synthetic_demo_data: true,
  },
  {
    id: 'rq-005',
    item_title: 'Exception review evidenza parziale',
    entity: 'GrowthLab Academy',
    review_type: 'Exception Review',
    status: 'reviewed',
    priority: 'bassa',
    due_date: '2026-05-10',
    review_scope: 'Eccezione evidenza GROWTH — campione straordinario',
    privacy_boundary: 'Solo eccezione — perimetro review assegnata',
    synthetic_demo_data: true,
  },
];

const STATUS_BADGE: Record<ReviewStatus, { style: string; label: string }> = {
  pending:           { style: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',  label: 'In attesa' },
  reviewed:          { style: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',  label: 'Revisionato' },
  needs_information: { style: 'bg-[rgba(47,125,85,0.06)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',        label: 'Richiede info' },
};

const PRIORITY_BADGE: Record<Priority, string> = {
  alta:  'bg-[rgba(158,59,47,0.08)] text-[rgba(158,59,47,0.85)] border-[rgba(158,59,47,0.22)]',
  media: 'bg-[rgba(217,154,43,0.08)] text-[#D99A2B] border-[rgba(217,154,43,0.25)]',
  bassa: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
};

// ─── Evidence review panel (existing deep-dive) ───────────────────────────────

type ChecklistItemStatus = 'ok' | 'pending' | 'missing';

interface ChecklistItem {
  label: string;
  status: ChecklistItemStatus;
}

const EVIDENCE_DETAIL = {
  id: 'rev-001',
  evidence_title: 'Log partecipazione — Bergamo Solidarity Network (Q4 2025)',
  source_type: 'Invio partner + conferma coordinatore',
  checklist: [
    { label: 'Soglia aggregazione privacy rispettata (≥10 partecipanti)', status: 'ok' as ChecklistItemStatus },
    { label: 'Classificazione livello evidenza (partial / verified)', status: 'pending' as ChecklistItemStatus },
    { label: 'Allineamento pillar IMPACT confermato', status: 'ok' as ChecklistItemStatus },
    { label: 'Additionality verificata (volontario, non obbligo legale)', status: 'pending' as ChecklistItemStatus },
    { label: 'Firma coordinatore ricevuta', status: 'missing' as ChecklistItemStatus },
  ] as ChecklistItem[],
  advisor_note:
    'Documentazione incompleta. Manca la firma del coordinatore e la conferma delle ore effettive. Richiedere informazioni aggiuntive prima di approvare.',
  recommendation: 'needs_information' as const,
  confidence_stamp: 'Non assegnato — in attesa di documentazione completa',
  synthetic_demo_data: true,
};

const CHECKLIST_ICON: Record<ChecklistItemStatus, { icon: string; style: string }> = {
  ok:      { icon: '✓', style: 'text-green-600' },
  pending: { icon: '○', style: 'text-[#D99A2B]' },
  missing: { icon: '✗', style: 'text-red-500' },
};

// ─── Calendar preview ─────────────────────────────────────────────────────────

const CALENDAR_ITEMS = [
  { time: '09:00', title: 'Audit processo Città Aperta APS', type: 'Partner review',                entity: 'Città Aperta APS' },
  { time: '11:30', title: 'Call Meridiana Group',            type: 'Evidence protocol alignment',  entity: 'Meridiana Group S.r.l.' },
  { time: '14:00', title: 'Sample check VitaLab Network',   type: 'LIFE protocol',                 entity: 'VitaLab Network' },
  { time: '16:30', title: 'Academy update',                  type: 'Evidence Protocol Library',    entity: 'KORA Academy' },
] as const;

// ─── Review threads mock ─────────────────────────────────────────────────────

const REVIEW_THREADS = [
  {
    id: 'rt-001',
    title: 'Protocollo LIFE — evidenza mancante',
    participants: ['Advisor', 'VitaLab Network', 'KORA Admin'],
    last_update: '2026-04-03',
    status: 'Aperta',
    status_style: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
    latest_note: 'Documentazione incompleta per protocollo LIFE. Richiesta integrazione entro 2026-04-05.',
  },
  {
    id: 'rt-002',
    title: 'Sample check — Bergamo Solidarity Network',
    participants: ['Advisor', 'Città Aperta APS'],
    last_update: '2026-04-15',
    status: 'In attesa',
    status_style: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
    latest_note: 'Campione aggregato ricevuto. In attesa di conferma coordinatore.',
  },
  {
    id: 'rt-003',
    title: 'Re-review — Workshop Community Leadership',
    participants: ['Advisor', 'Città Aperta APS', 'KORA Admin'],
    last_update: '2026-04-28',
    status: 'Chiusa',
    status_style: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
    latest_note: 'Re-review completata. Protocollo aggiornato con nuove linee guida.',
  },
];

// ─── Trust Ledger ─────────────────────────────────────────────────────────────

const TRUST_LEDGER = [
  {
    date: '2026-03-20',
    entity: 'Città Aperta APS',
    event: 'Audit processo completato',
    outcome: 'Protocollo attivo',
    confidence_effect: 'Aumenta affidabilità evidenze',
    next_action: 'Monitoraggio periodico Q2 2026',
  },
  {
    date: '2026-03-28',
    entity: 'VitaLab Network',
    event: 'Evidenza incompleta rilevata',
    outcome: 'Re-review richiesta',
    confidence_effect: 'Confidence pending — in attesa',
    next_action: 'Completare protocollo LIFE entro 2026-04-05',
  },
  {
    date: '2026-04-01',
    entity: 'Meridiana Group',
    event: 'Sample check completato',
    outcome: 'Nessuna anomalia',
    confidence_effect: 'Mantenere monitoraggio',
    next_action: 'Review pianificata Q3 2026',
  },
];

// ─── Academy courses ──────────────────────────────────────────────────────────

type CourseStatus = 'completato' | 'in_corso' | 'da_iniziare';

const ACADEMY_COURSES: {
  id: string;
  title: string;
  level: string;
  credits: number;
  status: CourseStatus;
}[] = [
  { id: 'ac-001', title: 'Evidence Protocol Review',          level: 'Obbligatorio', credits: 6, status: 'completato'   },
  { id: 'ac-002', title: 'Privacy & Worker Data Boundaries',  level: 'Obbligatorio', credits: 4, status: 'completato'   },
  { id: 'ac-003', title: 'Impact Unit Methodology v0.1',      level: 'Avanzato',     credits: 6, status: 'in_corso'     },
  { id: 'ac-004', title: 'Advisor Process Audit',             level: 'Avanzato',     credits: 8, status: 'da_iniziare'  },
];

const COURSE_STATUS_BADGE: Record<CourseStatus, { style: string; label: string }> = {
  completato:   { style: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',  label: 'Completato' },
  in_corso:     { style: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',  label: 'In corso' },
  da_iniziare:  { style: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',  label: 'Da iniziare' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

// Synthetic evidence reliability snapshot for advisor demo view
const ADVISOR_IU_SUMMARY = { total_records: 40, computed_records: 28, blocked_records: 5, limited_records: 7, review_required_records: 3, total_impact_units: 420, impact_units_by_pillar: { LIFE: 180, GROWTH: 115, CONNECTION: 55, IMPACT: 50, LEGACY: 20 }, records_without_iu: 12, average_cq: 0.78, average_ev: 0.62, average_cf: 0.85, average_agf: 0.92, methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration' } as const;
const ADVISOR_EVIDENCE_RELIABILITY = evidenceReliabilityIntelligenceService.computeFromData(
  ADVISOR_IU_SUMMARY,
  { total_records: 40, pending_count: 4, approved_for_scoring_count: 24, approved_for_bti_governance_count: 7, blocked_count: 5, needs_more_data_count: 2, rejected_count: 0, override_count: 1, kora_ready_for_iu_count: 24, kora_ready_for_bti_count: 7, review_completion_rate: 0.68, methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration' },
  { id: 'cs-s1', company_id: 'meridiana-group', scenario_id: 'S1', confidence_score: 0.58, confidence_level: 'medium', data_completeness: 0.72, evidence_quality: 0.61, mapping_confidence: 0.80, verification_weight: 0.55, source_coverage: {}, gaps_identified: ['Dati LMS non caricati', 'Partecipazione volunteering non verificata'], limitations: 'Dati sintetici demo', methodology_version_id: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration' },
);
const ADVISOR_PILLAR_BREAKDOWN: PillarEvidenceBreakdown[] = evidenceReliabilityIntelligenceService.getPillarEvidenceBreakdown(ADVISOR_IU_SUMMARY);

export default function AdvisorDashboard() {
  const creditsPercent = Math.round((ADVISOR_PROFILE.academy_credits / ADVISOR_PROFILE.required_credits) * 100);

  // B86-B: Advisor evidence review state — in-memory, functional within session.
  const [pending, setPending] = useState<PendingReviewItem[]>(() => advisorEvidenceReviewService.getPendingItems());
  const [reviewed, setReviewed] = useState<EvidenceReviewRecord[]>(() => advisorEvidenceReviewService.getAllReviewed());
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});

  function handleReview(item: PendingReviewItem, decision: ReviewDecision) {
    const notes = activeNotes[item.itemId] ?? null;
    const record = advisorEvidenceReviewService.submitReview(
      item.itemId, item.itemTitle, item.evidenceLevel, item.pillar,
      decision, notes ? notes : null, ADVISOR_PROFILE.advisor_id,
    );
    setPending(advisorEvidenceReviewService.getPendingItems());
    setReviewed(advisorEvidenceReviewService.getAllReviewed());
    setActiveNotes((prev) => { const n = { ...prev }; delete n[item.itemId]; return n; });
    return record;
  }

  const DECISION_STYLE: Record<ReviewDecision, string> = {
    approved: 'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
    rejected: 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]',
    flagged:  'bg-[rgba(217,154,43,0.10)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  };
  const DECISION_LABEL: Record<ReviewDecision, string> = {
    approved: 'Approvato',
    rejected: 'Rifiutato',
    flagged:  'Segnalato',
  };

  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── 1. Header ── */}
      <div>
        <BoundaryBadge mode="DEMO" variant="light" suffix="· dati sintetici" style={{ marginBottom: 6 }} />
        <PageMasthead
          eyebrow="Advisor KORA · Foundation Light Preview"
          title="Advisor Workspace"
          subline="Il layer professionale per audit processo, review protocollo evidenze e governance fiduciaria KORA."
          meta="Solo dati sintetici · Advisor-reviewed ≠ KORA Certified"
        />
        <DecisionContext
          question="Cosa richiede revisione, quale evidenza è ancora incerta e quale raccomandazione emettere?"
          boundary="Solo perimetro assegnato · nessun dato individuale lavoratore · protocollo processo, non validazione puntuale"
        />
        <div className="flex flex-wrap gap-1.5 -mt-4 mb-2">
          {[
            'Audit processo — non validazione singola',
            'Solo perimetro assegnato',
            'Nessun <TM>PIB</TM> individuale',
            'Nessun dato lavoratore',
          ].map((b, i) => (
            <span
              key={i}
              className="rounded-full px-2.5 py-0.5 text-[9.5px] font-medium"
              style={{ background: TOKENS.inkBorder, color: TOKENS.inkHint, border: TOKENS.cardBorder }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── 2. Advisor Profile — professional identity ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Profilo Advisor
        </h2>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-4">

          {/* Avatar + name + license */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[rgba(6,3,43,0.06)] text-[rgba(6,3,43,0.72)] flex items-center justify-center text-sm font-bold shrink-0">
              {ADVISOR_PROFILE.avatar_initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-[#06032B]">{ADVISOR_PROFILE.full_name}</p>
                <span className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-1.5 py-0.5 text-[10px] font-semibold text-[#C76F3D]">
                  {ADVISOR_PROFILE.seniority_level}
                </span>
                <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-medium text-[rgba(6,3,43,0.52)]">
                  {ADVISOR_PROFILE.advisor_type}
                </span>
              </div>
              <p className="text-sm text-[rgba(6,3,43,0.52)] mt-0.5">{ADVISOR_PROFILE.specialization}</p>
            </div>
          </div>

          {/* License fields */}
          <div className="grid gap-3 sm:grid-cols-2 text-sm border-t border-[rgba(6,3,43,0.05)] pt-4">
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Advisor ID</p>
              <p className="font-mono text-[rgba(6,3,43,0.78)] mt-0.5">{ADVISOR_PROFILE.advisor_id}</p>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Numero licenza</p>
              <p className="font-mono text-[rgba(6,3,43,0.78)] mt-0.5">{ADVISOR_PROFILE.license_number}</p>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Stato licenza</p>
              <span className="inline-block mt-0.5 rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                {ADVISOR_PROFILE.license_status}
              </span>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Emissione / Scadenza</p>
              <p className="text-[rgba(6,3,43,0.78)] mt-0.5 font-mono text-xs">
                {ADVISOR_PROFILE.issued_at} → {ADVISOR_PROFILE.expires_at}
              </p>
            </div>
          </div>

          {/* Credits progress */}
          <div className="border-t border-[rgba(6,3,43,0.05)] pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-[rgba(6,3,43,0.52)]">
                Crediti Academy: <span className="font-bold text-[rgba(6,3,43,0.78)]">{ADVISOR_PROFILE.academy_credits}</span> / {ADVISOR_PROFILE.required_credits}
              </p>
              <span className="text-xs font-mono text-[rgba(6,3,43,0.40)]">{creditsPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-[rgba(6,3,43,0.05)] overflow-hidden">
              <div
                className="h-2 rounded-full bg-[#C76F3D] transition-all"
                style={{ width: `${creditsPercent}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-[rgba(6,3,43,0.40)]">
              Crediti richiesti per rinnovo licenza: {ADVISOR_PROFILE.required_credits} — Stato: in accumulo
            </p>
          </div>
        </div>

        <div className="mt-2 rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-3 py-2">
          <p className="text-xs text-[#8A5A00] leading-relaxed">
            Licenza Advisor demo. Non rappresenta abilitazione professionale reale,
            certificazione regolatoria o KORA Certified attivo.
          </p>
        </div>
      </div>

      {/* ── 3. Advisor Portfolio ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Portfolio Advisor
        </h2>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          {[
            { label: 'Aziende seguite',              value: '4' },
            { label: 'Partner auditati',             value: '7' },
            { label: 'Protocolli in review',         value: '5' },
            { label: 'Sample check aperti',          value: '3' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-3 text-center">
              <p className="text-xl font-bold text-[rgba(6,3,43,0.90)]">{value}</p>
              <p className="text-[11px] text-[rgba(6,3,43,0.40)] mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Assignment table */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {ADVISOR_ASSIGNMENTS.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{a.entity}</p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${ENTITY_TYPE_BADGE[a.entity_type]}`}>
                      {a.entity_type}
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5 leading-relaxed">{a.scope}</p>
                  {a.next_check && (
                    <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5 font-mono">
                      Prossimo check: {a.next_check}
                    </p>
                  )}
                </div>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${ASSIGNMENT_STATUS_BADGE[a.status] ?? 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]'}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[rgba(6,3,43,0.40)]">
          L&apos;Advisor vede solo il perimetro assegnato. Non accede al PIB individuale o alla timeline personale dei lavoratori.
        </p>
      </div>

      {/* ── 4. Review Queue — Process Audit ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
            Review Queue — Process Audit
          </h2>
          <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#8A5A00]">
            {REVIEW_QUEUE.filter((r) => r.status === 'pending').length} in attesa
          </span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mb-3 leading-relaxed">
          Questa queue riguarda protocolli, processi, eccezioni e controlli a campione.
          Non è una validazione azione-per-azione.
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden divide-y divide-[rgba(6,3,43,0.05)]">
          {REVIEW_QUEUE.map((item) => {
            const sb = STATUS_BADGE[item.status];
            return (
              <div key={item.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{item.item_title}</p>
                    <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">
                      {item.review_type} · {item.entity}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${sb.style}`}>
                      {sb.label}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-[rgba(6,3,43,0.40)]">
                  <span>Scadenza: <span className="font-mono text-[rgba(6,3,43,0.62)]">{item.due_date}</span></span>
                  <span>Perimetro: <span className="text-[rgba(6,3,43,0.52)]">{item.review_scope}</span></span>
                </div>
                <p className="text-[10px] text-[rgba(6,3,43,0.28)] italic">{item.privacy_boundary}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-[rgba(6,3,43,0.40)]">
          synthetic_demo_data: true · Foundation Light preview
        </p>
      </div>

      {/* ── 4b. Operative Evidence Review — B86-B ── */}
      <div data-testid="advisor-evidence-review-panel">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
            Revisione Evidenze — Operativa
          </h2>
          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
            pending.length > 0
              ? 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]'
              : 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]'
          }`}>
            {pending.length > 0 ? `${pending.length} in attesa` : 'Nessuna pendente'}
          </span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mb-3 leading-relaxed">
          Approva, rifiuta o segnala i record evidenza in attesa di revisione. Le decisioni sono registrate nella sessione corrente.
          <span className="ml-1 text-[rgba(6,3,43,0.30)]">Solo dati sintetici demo.</span>
        </p>

        {/* Pending items */}
        {pending.length > 0 ? (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden divide-y divide-[rgba(6,3,43,0.05)]">
            {pending.map((item) => (
              <div key={item.itemId} className="px-4 py-4 space-y-3" data-testid={`review-item-${item.itemId}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{item.itemTitle}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="rounded border border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.52)]">
                        Pillar: {item.pillar}
                      </span>
                      <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-1.5 py-0.5 text-[10px] font-medium text-[#8A5A00]">
                        {item.evidenceLevel === 'partial' ? 'Parziale' : item.evidenceLevel}
                      </span>
                    </div>
                  </div>
                  <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-1.5 py-0.5 text-[10px] font-semibold text-[#8A5A00] shrink-0">
                    In attesa
                  </span>
                </div>

                {/* Notes field */}
                <textarea
                  placeholder="Note advisor (opzionale)..."
                  value={activeNotes[item.itemId] ?? ''}
                  onChange={(e) => setActiveNotes((prev) => ({ ...prev, [item.itemId]: e.target.value }))}
                  className="w-full rounded border border-[rgba(6,3,43,0.10)] bg-white px-3 py-2 text-xs text-[rgba(6,3,43,0.78)] placeholder:text-[rgba(6,3,43,0.28)] resize-none focus:outline-none focus:border-[rgba(6,3,43,0.25)]"
                  rows={2}
                  data-testid={`review-notes-${item.itemId}`}
                />

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleReview(item, 'approved')}
                    className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] px-3 py-1.5 text-xs font-semibold text-[#2F7D55] hover:bg-[rgba(47,125,85,0.14)] transition-colors"
                    data-testid={`approve-btn-${item.itemId}`}
                  >
                    Approva
                  </button>
                  <button
                    onClick={() => handleReview(item, 'rejected')}
                    className="rounded border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.08)] px-3 py-1.5 text-xs font-semibold text-[#9E3B2F] hover:bg-[rgba(158,59,47,0.14)] transition-colors"
                    data-testid={`reject-btn-${item.itemId}`}
                  >
                    Rifiuta
                  </button>
                  <button
                    onClick={() => handleReview(item, 'flagged')}
                    className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-3 py-1.5 text-xs font-semibold text-[#8A5A00] hover:bg-[rgba(217,154,43,0.14)] transition-colors"
                    data-testid={`flag-btn-${item.itemId}`}
                  >
                    Segnala
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(47,125,85,0.18)] bg-[rgba(47,125,85,0.05)] px-4 py-4 text-center">
            <p className="text-sm font-semibold text-[#2F7D55]">Nessuna evidenza in attesa</p>
            <p className="text-xs text-[rgba(47,125,85,0.70)] mt-1">Tutte le evidenze in coda sono state revisionate in questa sessione.</p>
          </div>
        )}

        {/* Reviewed items log */}
        {reviewed.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(6,3,43,0.40)] mb-2">
              Revisioni completate in questa sessione ({reviewed.length})
            </p>
            <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden divide-y divide-[rgba(6,3,43,0.05)]">
              {reviewed.map((rec) => (
                <div key={rec.itemId} className="px-4 py-3 flex items-start justify-between gap-3" data-testid={`reviewed-item-${rec.itemId}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">{rec.itemTitle}</p>
                    {rec.notes && (
                      <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5 italic">{rec.notes}</p>
                    )}
                    <p className="text-[10px] font-mono text-[rgba(6,3,43,0.35)] mt-0.5">
                      {new Date(rec.reviewedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · {rec.reviewedBy}
                    </p>
                  </div>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${DECISION_STYLE[rec.decision]}`}>
                    {DECISION_LABEL[rec.decision]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-2 text-[11px] text-[rgba(6,3,43,0.35)]">
          Advisor-reviewed ≠ KORA Certified · Stato sessione · synthetic_demo_data: true · Nessun dato individuale lavoratore
        </p>
      </div>

      {/* ── 5. Process Audit Model ── */}
      <div className="rounded-lg border border-blue-100 bg-[rgba(47,125,85,0.06)] px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-[#2F7D55] uppercase tracking-wide">
          Modello di audit processo KORA
        </p>
        <p className="text-sm text-[#2F7D55] leading-relaxed">
          L&apos;Advisor non valida ogni singola azione. L&apos;Advisor esegue un audit preliminare del processo
          e del protocollo evidenze del partner. Le azioni successive sono considerate ammissibili se
          rispettano il protocollo approvato, con monitoraggio periodico, controlli a campione e
          possibilità di re-review.
        </p>
        <ul className="space-y-1 pt-1">
          {[
            'Advisor Process Audit — audit preliminare del processo e del protocollo',
            'Evidence Protocol Review — revisione del protocollo evidenze per tipo di servizio',
            'Monitoraggio periodico — review pianificate e campioni straordinari',
            "Re-review — l'Advisor può riaprire la review in caso di eccezioni o variazioni",
            'Trust Ledger — storico audit, acceptance rate, prossima review',
          ].map((item) => (
            <li key={item} className="flex gap-2 text-xs text-[#2F7D55]">
              <span className="text-blue-400 shrink-0 mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── 6. Evidence Review Panel ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Pannello revisione evidenza — Demo
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-5">

          <div className="grid gap-3 sm:grid-cols-2 text-sm pb-4 border-b border-[rgba(6,3,43,0.05)]">
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Evidenza</p>
              <p className="font-semibold text-[rgba(6,3,43,0.90)] mt-0.5">{EVIDENCE_DETAIL.evidence_title}</p>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Tipologia fonte</p>
              <p className="text-[rgba(6,3,43,0.78)] mt-0.5">{EVIDENCE_DETAIL.source_type}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[rgba(6,3,43,0.52)] mb-2">Checklist di revisione</p>
            <ul className="space-y-2">
              {EVIDENCE_DETAIL.checklist.map((item) => {
                const icon = CHECKLIST_ICON[item.status];
                return (
                  <li key={item.label} className="flex items-center gap-2 text-xs text-[rgba(6,3,43,0.62)]">
                    <span className={`shrink-0 font-bold w-4 text-center ${icon.style}`}>{icon.icon}</span>
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded bg-[rgba(217,154,43,0.08)] border border-amber-100 px-3 py-3 space-y-1">
            <p className="text-xs font-semibold text-[#8A5A00]">Nota advisor</p>
            <p className="text-xs text-[#8A5A00] leading-relaxed">{EVIDENCE_DETAIL.advisor_note}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Raccomandazione</p>
              <span className="inline-block mt-0.5 rounded border bg-[rgba(47,125,85,0.06)] border-[rgba(47,125,85,0.22)] px-2 py-0.5 text-xs font-semibold text-[#2F7D55]">
                Richiedi informazioni aggiuntive
              </span>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Advisor Confidence Stamp</p>
              <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">{EVIDENCE_DETAIL.confidence_stamp}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-[rgba(6,3,43,0.05)]">
            {['Approva', 'Richiedi informazioni', 'Rifiuta'].map((action) => (
              <button
                key={action}
                disabled
                className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
                title="Demo — nessuna validazione reale in Foundation Light."
              >
                {action}
              </button>
            ))}
            <span className="self-center text-[10px] text-[rgba(6,3,43,0.40)] italic">
              Demo — nessuna validazione reale in Foundation Light.
            </span>
          </div>
        </div>
      </div>

      {/* ── 7. Calendar Preview ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
            Calendario Advisor — preview
          </h2>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-[10px] font-medium text-[rgba(6,3,43,0.40)]">
            21 Mag 2026 — dimostrativo
          </span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mb-3">
          Calendario dimostrativo. Nessuna integrazione calendario reale, nessuna notifica, nessuna prenotazione live.
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden divide-y divide-[rgba(6,3,43,0.05)]">
          {CALENDAR_ITEMS.map((item) => (
            <div key={item.time} className="flex items-start gap-4 px-4 py-3">
              <p className="text-sm font-mono font-semibold text-[rgba(6,3,43,0.40)] shrink-0 w-12 pt-0.5">
                {item.time}
              </p>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{item.title}</p>
                <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
                  {item.type} · {item.entity}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[rgba(6,3,43,0.40)]">
          Nessun calendario reale · Nessuna notifica · Nessuna prenotazione live · Dati sintetici demo.
        </p>
      </div>

      {/* ── 8. Review Threads mock ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Review Threads — preview
        </h2>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mb-3 leading-relaxed">
          Thread dimostrativi collegati a review assegnate. Non è chat libera, non invia messaggi, non genera notifiche.
        </p>
        <div className="space-y-3">
          {REVIEW_THREADS.map((thread) => (
            <div key={thread.id} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{thread.title}</p>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${thread.status_style}`}>
                  {thread.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {thread.participants.map((p) => (
                  <span key={p} className="rounded bg-[rgba(6,3,43,0.05)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.62)]">
                    {p}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed italic">{thread.latest_note}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono">
                  Aggiornato: {thread.last_update}
                </p>
                <button
                  disabled
                  className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-1 text-[11px] font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
                >
                  Apri thread — demo
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 9. Trust Ledger ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
          Trust Ledger Advisor
        </h2>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mb-3 leading-relaxed">
          Il Trust Ledger non è un ranking pubblico. È un audit trail interno su processi, protocolli, eccezioni e review.
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {TRUST_LEDGER.map((entry, i) => (
              <div key={i} className="px-4 py-3 grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-[rgba(6,3,43,0.40)]">{entry.date}</span>
                  <span className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">{entry.entity}</span>
                  <span className="text-xs text-[rgba(6,3,43,0.52)]">— {entry.event}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-[11px]">
                  <span>
                    Esito: <span className="font-medium text-[rgba(6,3,43,0.62)]">{entry.outcome}</span>
                  </span>
                  <span>
                    Confidence: <span className="font-medium text-[rgba(6,3,43,0.62)]">{entry.confidence_effect}</span>
                  </span>
                </div>
                <p className="text-[10px] text-[rgba(6,3,43,0.40)]">
                  Prossima azione: {entry.next_action}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-[rgba(6,3,43,0.40)]">
          synthetic_demo_data: true · Audit trail solo nel perimetro assegnato.
        </p>
      </div>

      {/* ── 9b. Evidence Reliability Intelligence™ — advisor view ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.10)] bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-[rgba(6,3,43,0.78)] flex-1">Evidence Reliability Intelligence™</h2>
          <span className={`rounded px-2 py-0.5 text-[9px] font-semibold ${
            ADVISOR_EVIDENCE_RELIABILITY.evidenceRiskLevel === 'alta'  ? 'bg-[rgba(158,59,47,0.10)] text-[rgba(158,59,47,0.85)]'
          : ADVISOR_EVIDENCE_RELIABILITY.evidenceRiskLevel === 'media' ? 'bg-[rgba(138,90,0,0.10)] text-[rgba(138,90,0,0.85)]'
          : 'bg-[rgba(47,125,85,0.10)] text-[rgba(47,125,85,0.90)]'
          }`}>
            Rischio evidenza: {ADVISOR_EVIDENCE_RELIABILITY.evidenceRiskLevel}
          </span>
          <span className="text-[9px] text-[rgba(6,3,43,0.35)] bg-[rgba(6,3,43,0.05)] rounded px-2 py-0.5">
            {ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.primaryTier}
          </span>
        </div>

        {/* Evidence distribution */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(6,3,43,0.40)]">Distribuzione livello evidenza</p>
          <div className="flex h-2 rounded overflow-hidden gap-0.5">
            {ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.strongShare > 0 && (
              <div style={{ flex: ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.strongShare }} className="bg-[rgba(47,125,85,0.70)]" title={`Strong: ${Math.round(ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.strongShare * 100)}%`} />
            )}
            {ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.acceptableShare > 0 && (
              <div style={{ flex: ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.acceptableShare }} className="bg-[rgba(138,90,0,0.55)]" title={`Acceptable: ${Math.round(ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.acceptableShare * 100)}%`} />
            )}
            {ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.weakShare > 0 && (
              <div style={{ flex: ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.weakShare }} className="bg-[rgba(158,59,47,0.60)]" title={`Weak: ${Math.round(ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.weakShare * 100)}%`} />
            )}
          </div>
          <div className="flex gap-3">
            {[
              { label: `Strong (L3/L4): ${Math.round(ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.strongShare * 100)}%`, color: 'text-[rgba(47,125,85,0.85)]' },
              { label: `Acceptable (L2): ${Math.round(ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.acceptableShare * 100)}%`, color: 'text-[rgba(138,90,0,0.85)]' },
              { label: `Weak (L0/L1): ${Math.round(ADVISOR_EVIDENCE_RELIABILITY.evidenceLevelDistribution.weakShare * 100)}%`, color: 'text-[rgba(158,59,47,0.85)]' },
            ].map(({ label, color }) => (
              <span key={label} className={`text-[10px] font-medium ${color}`}>{label}</span>
            ))}
          </div>
        </div>

        {/* Advisor narrative */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(6,3,43,0.40)] mb-1.5">Analisi Advisor</p>
          <p className="text-[12px] text-[rgba(6,3,43,0.70)] leading-relaxed">{ADVISOR_EVIDENCE_RELIABILITY.advisorNarrative}</p>
        </div>

        {/* Upgrade opportunities */}
        {ADVISOR_EVIDENCE_RELIABILITY.upgradeOpportunities.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(6,3,43,0.40)]">Opportunità upgrade evidenza</p>
            {ADVISOR_EVIDENCE_RELIABILITY.upgradeOpportunities.map((opp, i) => (
              <div key={i} className="rounded border border-[rgba(6,3,43,0.07)] bg-[rgba(6,3,43,0.02)] px-3 py-2.5 flex gap-3 items-start">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                  opp.priority === 'alta' ? 'bg-[rgba(158,59,47,0.10)] text-[rgba(158,59,47,0.85)]' : 'bg-[rgba(138,90,0,0.10)] text-[rgba(138,90,0,0.85)]'
                }`}>
                  {opp.priority === 'alta' ? 'Alta' : 'Media'}
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.70)]">{opp.area}</p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.50)] leading-relaxed mt-0.5">{opp.upgradeAction}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {ADVISOR_EVIDENCE_RELIABILITY.recommendations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(6,3,43,0.40)]">Raccomandazioni</p>
            {ADVISOR_EVIDENCE_RELIABILITY.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="shrink-0 text-[rgba(6,3,43,0.30)] text-[11px] mt-0.5">›</span>
                <p className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-[9px] text-[rgba(6,3,43,0.35)] italic border-t border-[rgba(6,3,43,0.06)] pt-2">
          Evidence Reliability Intelligence™ · pre_empirical_calibration · non modifica CS, VR né KORA Index™ · not_kora_index_component: true · synthetic_demo_data: true · Solo advisor con perimetro assegnato.
        </p>
      </div>

      {/* ── 9c. Per-Pillar Evidence Breakdown — B86-B T7+T8 ── */}
      <div className="rounded-xl border border-[rgba(6,3,43,0.10)] bg-white p-6 space-y-4" data-testid="pillar-evidence-breakdown-panel">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-[rgba(6,3,43,0.78)] flex-1">
            Qualità Evidenza per Pillar — Aggregate
          </h2>
          <span className="text-[9px] text-[rgba(6,3,43,0.35)] bg-[rgba(6,3,43,0.05)] rounded px-2 py-0.5">
            pre_empirical_estimate
          </span>
        </div>
        <p className="text-[11px] text-[rgba(6,3,43,0.45)] leading-relaxed -mt-2">
          Distribuzione aggregata della qualità evidenza per pillar. Nessun dato individuale lavoratore.
          Stima derivata dall&apos;EV medio e dalla quota IU per pillar — non da classificazione record-per-record.
        </p>

        <div className="space-y-2.5">
          {ADVISOR_PILLAR_BREAKDOWN.map((pb) => {
            const qualityColor = pb.qualityLabel === 'buona'
              ? { bar: 'bg-[rgba(47,125,85,0.65)]', badge: 'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]' }
              : pb.qualityLabel === 'accettabile'
              ? { bar: 'bg-[rgba(138,90,0,0.55)]', badge: 'bg-[rgba(138,90,0,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]' }
              : { bar: 'bg-[rgba(158,59,47,0.60)]', badge: 'bg-[rgba(158,59,47,0.08)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]' };

            return (
              <div key={pb.pillar} className="rounded-lg border border-[rgba(6,3,43,0.07)] bg-[rgba(6,3,43,0.02)] px-3 py-3 space-y-2" data-testid={`pillar-ev-${pb.pillar}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[rgba(6,3,43,0.80)]">{pb.pillarLabel}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${qualityColor.badge}`}>
                      {pb.qualityLabel}
                    </span>
                    <span className="text-[10px] font-mono text-[rgba(6,3,43,0.45)]">
                      EV {Math.round(pb.estimatedEvScore * 100)}%
                    </span>
                  </div>
                </div>

                {/* EV bar */}
                <div className="h-1.5 rounded-full bg-[rgba(6,3,43,0.06)] overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${qualityColor.bar}`}
                    style={{ width: `${Math.round(pb.estimatedEvScore * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[rgba(6,3,43,0.40)]">
                    Quota IU: <span className="font-mono text-[rgba(6,3,43,0.60)]">{Math.round(pb.iuShare * 100)}%</span>
                  </span>
                  {pb.weakEvidenceNote && (
                    <span className="text-[9.5px] text-[#9E3B2F] italic leading-tight max-w-[60%] text-right">
                      {pb.weakEvidenceNote}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[9px] text-[rgba(6,3,43,0.35)] italic border-t border-[rgba(6,3,43,0.06)] pt-2">
          Stima aggregata EV per pillar · pre_empirical_estimate · non modifica IU né KORA Index™ · nessun dato individuale lavoratore · synthetic_demo_data: true
        </p>
      </div>

      {/* ── 10. Advisor Academy — Future Vision ── */}
      <div className="rounded-lg border border-dashed border-[rgba(217,154,43,0.28)] bg-[rgba(217,154,43,0.08)]/50 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-[#8A5A00]">KORA Advisor Academy</h2>
          <span className="rounded border border-[rgba(217,154,43,0.28)] bg-[#F8F6F1] px-2 py-0.5 text-[10px] font-semibold text-[#D99A2B] uppercase tracking-wide">
            Future Vision / Non attivo in Foundation Light
          </span>
        </div>
        <p className="text-xs text-[#8A5A00] leading-relaxed">
          Percorso futuro per formazione, aggiornamento, crediti, rinnovo licenza e specializzazioni Advisor.
        </p>

        {/* Credits summary */}
        <div className="rounded-lg border border-[rgba(217,154,43,0.22)] bg-[#F8F6F1] px-4 py-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-[#8A5A00]">{ADVISOR_PROFILE.academy_credits}</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Crediti accumulati</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[rgba(6,3,43,0.52)]">{ADVISOR_PROFILE.required_credits}</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Crediti richiesti</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[rgba(6,3,43,0.78)]">{ADVISOR_PROFILE.expires_at}</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Scadenza rinnovo</p>
          </div>
        </div>

        {/* Course cards */}
        <div className="space-y-2">
          {ACADEMY_COURSES.map((course) => {
            const cs = COURSE_STATUS_BADGE[course.status];
            return (
              <div key={course.id} className="rounded-lg border border-[rgba(217,154,43,0.12)] bg-[#F8F6F1] p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{course.title}</p>
                    <span className="rounded bg-[rgba(6,3,43,0.05)] px-1.5 py-0.5 text-[10px] font-medium text-[rgba(6,3,43,0.52)]">
                      {course.level}
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">{course.credits} crediti</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${cs.style}`}>
                    {cs.label}
                  </span>
                  <button
                    disabled
                    className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2.5 py-1 text-[10px] font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
                  >
                    Avvia corso — Future Vision
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Future Vision CTAs */}
        <div className="flex flex-wrap gap-2">
          <button
            disabled
            className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
          >
            Rinnova licenza — Future Vision
          </button>
          <button
            disabled
            className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
          >
            Paga quota Academy — Future Vision
          </button>
        </div>

        <p className="text-[11px] text-[#D99A2B] leading-relaxed">
          Academy preview. Nessun LMS reale, nessun pagamento, nessuna certificazione attiva in Foundation Light.
        </p>
      </div>

      {/* ── 11. Privacy boundary — can / cannot see ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Perimetro di accesso Advisor
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[rgba(47,125,85,0.22)] bg-green-50 p-4">
            <p className="text-xs font-semibold text-[#2F7D55] mb-2">L&apos;Advisor può vedere</p>
            <ul className="space-y-1.5">
              {[
                'Protocolli assegnati nel proprio perimetro',
                'Partner assegnati e storico audit',
                'Evidenze aggregate o campioni demo',
                'Stato audit processo',
                'Review queue nel perimetro assegnato',
                'Trust Ledger nel proprio perimetro',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-green-700">
                  <span className="text-[#2F7D55] shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-4">
            <p className="text-xs font-semibold text-[#9E3B2F] mb-2">L&apos;Advisor non può vedere</p>
            <ul className="space-y-1.5">
              {[
                'PIB individuale dei lavoratori',
                'Dynamic Impact CV',
                'Timeline personale del lavoratore',
                'Scelte private del lavoratore',
                'Ranking o classifiche lavoratori',
                'Dati aziendali non assegnati',
                'Pagamenti o wallet aziendali',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-[#9E3B2F]">
                  <span className="text-[rgba(158,59,47,0.55)] shrink-0 mt-0.5">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── 12. Certification boundary ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] uppercase tracking-wide">
          Limite certificazione
        </p>
        <p className="text-sm text-[rgba(6,3,43,0.62)] leading-relaxed">
          Advisor-reviewed non significa Certified. KORA Certified è un livello futuro e non attivo
          in Foundation Light.
        </p>
        <p className="text-xs text-[rgba(6,3,43,0.40)] leading-relaxed">
          La revisione advisor contribuisce al Verification Rate e al Confidence Score dell&apos;output
          KORA Index. Non certifica l&apos;azienda, non produce compliance regolatoria, non sostituisce
          consulenza ESG, legale o fiscale.
        </p>
      </div>

      {/* ── 13. Future Vision CTA ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Evoluzione Advisor Network</p>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
            KORA Certified, Academy completa, marketplace advisor, Value Chain territoriale — post-pilot.
          </p>
        </div>
        <Link
          href="/future-vision"
          className="shrink-0 rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.05)] transition-colors"
        >
          Vedi evoluzione Advisor Network →
        </Link>
      </div>

      {/* ── 14. Limitations block ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-2">
          Stato demo
        </p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          Dati sintetici demo. Advisor Workspace è una preview del ruolo professionale KORA.
          Non abilita licenze reali, certificazioni regolatorie, pagamenti, LMS produttivo,
          chat o calendario live.
        </p>
        <p className="mt-1.5 text-[10px] font-mono text-[rgba(6,3,43,0.40)]">
          synthetic_demo_data: true · KORA Index v1.0 · calibration_status: pre_empirical_calibration
        </p>
      </div>

    </div>
  );
}

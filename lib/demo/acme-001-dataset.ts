// lib/demo/acme-001-dataset.ts
// B40 — ACME-001 static synthetic guided demo dataset.
//
// This file is the single source of truth for all ACME-001 demo data.
// It is 100% static — no DB reads, no API calls, no live tenant tables.
// It must NEVER be imported by real company APIs or live routes.
// It must NEVER be used as fallback for authenticated company users.
//
// ACME-001 story:
//   Mid-sized manufacturing company with decent welfare spend but uneven activation.
//   Strong LIFE coverage (meal vouchers, health), weak CONNECTION, fragmented LEGACY.
//   Confidence Score is medium — LMS evidence incomplete.
//   Shows problems, warnings, and next actions — a credible, imperfect demo.

export const SYNTHETIC_DEMO_FLAG = true;
export const SYNTHETIC_DEMO_LABEL = 'Synthetic guided demo — not a live tenant.';

// ── Company profile ───────────────────────────────────────────────────────────

export const ACME_PROFILE = {
  companyName:        'ACME Manufacturing Italia S.p.A.',
  tenantCode:         'ACME-001',
  legalName:          'ACME Manufacturing Italia S.p.A.',
  industry:           'Manifatturiero',
  region:             'Lombardia',
  country:            'IT',
  workforce:          250,
  period:             '2026-Q1',
  methodologyVersion: 'KORA Index v1.0',
  calibrationStatus:  'pre_empirical_calibration',
  syntheticDemoData:  true,
  description:        'Azienda manifatturiera di medie dimensioni, 250 dipendenti, sede principale in Lombardia. Buona copertura welfare economica, attivazione disomogenea tra reparti.',
};

// ── KORA Index ────────────────────────────────────────────────────────────────
// All values are synthetic. Verified approximate internal consistency:
// 0.25*73 + 0.30*59 + 0.25*48 + 0.20*67 = 18.25+17.7+12+13.4 = 61.35 ≈ 61.4

export const ACME_KORA_INDEX = {
  value:                   61.4,
  confidenceScore:         0.71,     // 71% — external to KORA Index per doc 21b
  safeguardStatus:         'CLEAR',  // AR ≥ 0.40 AND MAR ≥ 0.30
  activationRate:          0.64,     // 64% — above CLEAR threshold
  meaningfulActivationRate: 0.53,    // 53% — above CLEAR threshold
  reportingPeriod:         '2026-Q1',
  methodologyVersion:      'KORA Index v1.0',
  calibrationStatus:       'pre_empirical_calibration',
  scoredAt:                '2026-05-15T09:30:00Z',
  disclaimer: 'KORA Foundation Light · Dati pilot sintetici · Calibrazione pre-empirica. Non audit-grade, non certificazione ESG, non compliance normativa.',
};

// ── Macroblock scores ─────────────────────────────────────────────────────────

export const ACME_MACROBLOCKS = {
  reach: {
    label:   'Activation Reach',
    weight:  0.25,
    score:   73,
    ar:      0.64,   // Activation Rate
    mar:     0.53,   // Meaningful Activation Rate
    note:    'Buona copertura — la maggior parte dei dipendenti ha almeno un evento nel periodo.',
  },
  quality: {
    label:   'Activation Quality',
    weight:  0.30,
    score:   59,
    ni:      0.61,   // Normalized Intensity
    vr:      0.76,   // Verification Rate — buono
    co:      0.38,   // Continuity — debole: picchi ma non continuità
    note:    'Verifica buona, ma continuità bassa. I dipendenti partecipano a burst, non in modo sostenuto.',
  },
  equity: {
    label:   'Distribution & Equity',
    weight:  0.25,
    score:   48,
    wb:      0.55,
    pc:      0.60,
    pb:      0.46,
    eq:      0.31,   // Equity — reparto Operations molto più attivo di Admin e Logistics
    note:    'Distribuzione disomogenea: reparti Operations e Produzione dominano l\'attivazione. Admin e Logistica poco coperti.',
  },
  bti: {
    label:   'Budget-to-Human-Impact',
    weight:  0.20,
    score:   67,
    totalBudget:      420000,   // €
    deepActivation:   195000,   // €
    economicRelief:   188000,   // €  (50% of welfare — many meal vouchers)
    activationDebt:   37000,    // €  (budget not converting to impact)
    costPerIU:        12.40,    // €/IU
    note:    'Budget convertito in attivazione profonda è solo il 46%. L\'economic relief (buoni pasto, voucher) è numericamente dominante ma non genera Impact Units significative.',
  },
};

// ── Pillar distribution ────────────────────────────────────────────────────────

export const ACME_PILLARS = [
  { code: 'LIFE',       label: 'LIFE',       share: 0.38, iuCount: 312, initiatives: 10, note: 'Benessere fisico + economic relief. Dominant ma sbilanciato verso voucher.' },
  { code: 'GROWTH',     label: 'GROWTH',     share: 0.29, iuCount: 238, initiatives: 8,  note: 'Formazione presente ma LMS gap riduce la verifica.' },
  { code: 'CONNECTION', label: 'CONNECTION', share: 0.12, iuCount:  98, initiatives: 3,  note: 'DEBOLE: pochi programmi strutturati di mentoring o comunità di pratica.' },
  { code: 'IMPACT',     label: 'IMPACT',     share: 0.14, iuCount: 115, initiatives: 4,  note: 'Volontariato presente. Manca una strategic fit con territorio.' },
  { code: 'LEGACY',     label: 'LEGACY',     share: 0.07, iuCount:  57, initiatives: 2,  note: 'FRAGILE: solo 2 iniziative, non strutturate come programma.' },
];

// ── Evidence records (27 synthetic records) ───────────────────────────────────

export type EvidenceStatus = 'eligible' | 'limited' | 'blocked' | 'pending_review';

export interface AcmeEvidenceRecord {
  id:            string;
  safeName:      string;
  pillar:        string;
  eligibility:   EvidenceStatus;
  reviewStatus:  string;
  evidenceLevel: string;
  budgetClass:   string;
  note:          string;
}

export const ACME_EVIDENCE_RECORDS: AcmeEvidenceRecord[] = [
  // LIFE — 10 records
  { id: 'ev-001', safeName: 'Convenzione palestra sportiva',          pillar: 'LIFE',       eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'welfare',       note: 'Contratto provider annuale verificato.' },
  { id: 'ev-002', safeName: 'Voucher welfare generalista',            pillar: 'LIFE',       eligibility: 'limited',       reviewStatus: 'approved',         evidenceLevel: 'L1', budgetClass: 'fringe_benefit', note: 'Economic relief — contribuisce a BTI ma non a deep activation.' },
  { id: 'ev-003', safeName: 'Buoni pasto mensili',                    pillar: 'LIFE',       eligibility: 'limited',       reviewStatus: 'approved',         evidenceLevel: 'L1', budgetClass: 'fringe_benefit', note: 'Economic relief — volumetricamente dominante.' },
  { id: 'ev-004', safeName: 'Rimborso spese sanitarie',               pillar: 'LIFE',       eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'welfare',       note: 'Policy aziendale verificata.' },
  { id: 'ev-005', safeName: 'Supporto psicologico EAP',               pillar: 'LIFE',       eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L3', budgetClass: 'welfare',       note: 'Provider certificato, report utilizzo disponibile.' },
  { id: 'ev-006', safeName: 'Programma prevenzione oncologica',        pillar: 'LIFE',       eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'welfare',       note: 'Accordo sindacale + provider terzo.' },
  { id: 'ev-007', safeName: 'Gift card natalizi',                     pillar: 'LIFE',       eligibility: 'limited',       reviewStatus: 'approved',         evidenceLevel: 'L0', budgetClass: 'fringe_benefit', note: 'Economic relief puro. Nessuna activation profonda.' },
  { id: 'ev-008', safeName: 'Assicurazione sanitaria integrativa',    pillar: 'LIFE',       eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'welfare',       note: 'Polizza collettiva con copertura verificata.' },
  { id: 'ev-009', safeName: 'Fondo mutualistico dipendenti',          pillar: 'LIFE',       eligibility: 'eligible',      reviewStatus: 'approved_for_scoring', evidenceLevel: 'L1', budgetClass: 'welfare', note: 'Approvato per scoring.' },
  { id: 'ev-010', safeName: 'Corso sicurezza DUVRI obbligatorio',      pillar: 'LIFE',       eligibility: 'blocked',       reviewStatus: 'rejected',         evidenceLevel: 'L1', budgetClass: 'compliance_hse', note: 'BLOCCATO: compliance obbligatoria — non è attivazione welfare.' },

  // GROWTH — 8 records
  { id: 'ev-011', safeName: 'LMS upskilling digitale',                pillar: 'GROWTH',     eligibility: 'eligible',      reviewStatus: 'needs_info',       evidenceLevel: 'L2', budgetClass: 'hr_learning',   note: 'GAP EVIDENZA: export LMS incompleto. Mancano date completamento.' },
  { id: 'ev-012', safeName: 'Certificazione professionale esterna',   pillar: 'GROWTH',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L3', budgetClass: 'hr_learning',   note: 'Provider certificato + attestati verificati.' },
  { id: 'ev-013', safeName: 'Corso lingue straniere',                 pillar: 'GROWTH',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'hr_learning',   note: 'Accordo scuola lingue + registro presenze.' },
  { id: 'ev-014', safeName: 'Formazione sicurezza avanzata',          pillar: 'GROWTH',     eligibility: 'blocked',       reviewStatus: 'rejected',         evidenceLevel: 'L2', budgetClass: 'compliance_hse', note: 'BLOCCATO: compliance obbligatoria D.Lgs.81.' },
  { id: 'ev-015', safeName: 'Mentoring con manager senior',           pillar: 'GROWTH',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'hr_learning',   note: 'Programma strutturato con report HR.' },
  { id: 'ev-016', safeName: 'Leadership academy Q1',                  pillar: 'GROWTH',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'hr_learning',   note: 'Provider esterno + attestato partecipazione.' },
  { id: 'ev-017', safeName: 'Bootcamp trasformazione digitale',       pillar: 'GROWTH',     eligibility: 'eligible',      reviewStatus: 'approved_for_scoring', evidenceLevel: 'L2', budgetClass: 'hr_learning', note: '' },
  { id: 'ev-018', safeName: 'Abbonamento piattaforma eLearning',      pillar: 'GROWTH',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L1', budgetClass: 'hr_learning',   note: 'Licenze attive verificate ma completamento non documentato.' },

  // CONNECTION — 3 records
  { id: 'ev-019', safeName: 'Team building annuale',                  pillar: 'CONNECTION', eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L1', budgetClass: 'welfare',       note: 'Evento singolo — debole per continuità.' },
  { id: 'ev-020', safeName: 'Programma buddy system nuovi assunti',   pillar: 'CONNECTION', eligibility: 'eligible',      reviewStatus: 'approved_for_scoring', evidenceLevel: 'L1', budgetClass: 'hr_learning', note: '' },
  { id: 'ev-021', safeName: 'Comunità di pratica trasversale',        pillar: 'CONNECTION', eligibility: 'eligible',      reviewStatus: 'pending_review',   evidenceLevel: 'L1', budgetClass: 'hr_learning',   note: 'In revisione — primo avvio Q1, documentazione incompleta.' },

  // IMPACT — 4 records
  { id: 'ev-022', safeName: 'Volontariato aziendale Q1 2026',         pillar: 'IMPACT',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'esg_volunteering', note: 'Report evento con ore partecipazione aggregate.' },
  { id: 'ev-023', safeName: 'Raccolta fondi solidale',                pillar: 'IMPACT',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L1', budgetClass: 'esg_volunteering', note: 'Documentazione interna + ente beneficiario.' },
  { id: 'ev-024', safeName: 'Partnership territoriale ente locale',   pillar: 'IMPACT',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'esg_volunteering', note: 'Accordo formale con comune verificato.' },
  { id: 'ev-025', safeName: 'Progetto alfabetizzazione digitale',     pillar: 'IMPACT',     eligibility: 'eligible',      reviewStatus: 'pending_review',   evidenceLevel: 'L2', budgetClass: 'esg_volunteering', note: 'Nuovo progetto Q1 — in attesa conferma provider terzo.' },

  // LEGACY — 2 records
  { id: 'ev-026', safeName: 'Knowledge transfer senior→junior',       pillar: 'LEGACY',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L2', budgetClass: 'hr_learning',   note: 'Programma strutturato con sessioni documentate.' },
  { id: 'ev-027', safeName: 'Archivio pratiche lavorative',           pillar: 'LEGACY',     eligibility: 'eligible',      reviewStatus: 'approved',         evidenceLevel: 'L1', budgetClass: 'hr_learning',   note: 'Needs enrichment: manca strategia di aggiornamento continuo.' },
] as const;

export const ACME_EVIDENCE_SUMMARY = {
  total:         27,
  eligible:      20,
  limited:        3,   // economic relief
  blocked:        2,
  pendingReview:  2,
  approvedForScoring: 4,
  withEvidence:  25,   // 2 have L0 (no structured evidence)
};

// ── Evidence gaps ─────────────────────────────────────────────────────────────

export const ACME_EVIDENCE_GAPS = [
  { pillar: 'GROWTH',     gap: 'Export LMS incompleto',              severity: 'high',   action: 'Richiedere export completo con date completamento e moduli.' },
  { pillar: 'CONNECTION', gap: 'Copertura pillar insufficiente',      severity: 'high',   action: 'Strutturare almeno 2 programmi aggiuntivi di mentoring o peer learning.' },
  { pillar: 'IMPACT',     gap: 'Conferma provider terzo pendente',    severity: 'medium', action: 'Richiedere attestazione da ente partner per progetto alfabetizzazione.' },
  { pillar: 'LEGACY',     gap: 'Archivio senza piano di continuità',  severity: 'low',    action: 'Definire roadmap di aggiornamento Knowledge Base.' },
];

// ── Reporting readiness ───────────────────────────────────────────────────────

export const ACME_REPORTING_READINESS = {
  overallLevel: 'in_review',
  readinessScore: 58,  // synthetic percentage
  pillars: [
    { pillar: 'LIFE',       status: 'report_ready',        note: '3/3 aree coperte con evidenza L2+.' },
    { pillar: 'GROWTH',     status: 'usable_with_caveat',  note: 'LMS gap riduce certezza — utilizzabile con caveat su formazione digitale.' },
    { pillar: 'CONNECTION', status: 'needs_evidence',      note: 'Solo 3 iniziative, coverage limitata. Non pronto per rendicontazione completa.' },
    { pillar: 'IMPACT',     status: 'usable_with_caveat',  note: 'Provider terzo in attesa — core rendicontabile.' },
    { pillar: 'LEGACY',     status: 'not_ready',           note: 'Solo 2 iniziative non strutturate. Insufficiente per rendicontazione.' },
  ],
  caveat: 'Reporting Readiness non equivale a certificazione di conformità normativa. KORA fornisce evidenze strutturate e spiegabili come supporto alla rendicontazione CSR/ESG.',
};

// ── Decision Pack ─────────────────────────────────────────────────────────────

export const ACME_DECISION_PACK = {
  status:          'draft',
  versionId:       'ACME-001-Q1-2026-v0.1',
  reportingPeriod: '2026-Q1',
  generatedAt:     '2026-05-20T14:00:00Z',
  sections: [
    {
      title: 'Executive Summary',
      summary: 'ACME Manufacturing mostra un KORA Index di 61.4/100 nel periodo Q1 2026, con Activation Safeguard CLEAR (AR 64%, MAR 53%). L\'attivazione è concentrata su LIFE e GROWTH; CONNECTION e LEGACY richiedono rafforzamento strutturale.',
    },
    {
      title: 'Methodology Snapshot',
      summary: 'KORA Index v1.0 · pre_empirical_calibration · 27 iniziative esaminate · 14-stage algorithm · Confidence Score 71% (esterno al KORA Index).',
    },
    {
      title: 'Eligibility Summary',
      summary: '20 iniziative idonee, 3 a sollievo economico (limited), 2 bloccate per compliance. 2 record in attesa di revisione evidenza.',
    },
    {
      title: 'Budget-to-Human-Impact',
      summary: '€ 420.000 welfare spend. Deep activation: 46% (€ 195k). Economic relief: 45% (€ 188k). Activation debt: € 37k (principalmente CONNECTION vuoto).',
    },
    {
      title: 'Evidence Gaps',
      summary: '4 gap identificati: export LMS incompleto (GROWTH), copertura CONNECTION insufficiente, conferma provider IMPACT, piano continuità LEGACY.',
    },
    {
      title: 'Next Best Actions',
      summary: '1. Richiedere export LMS completo. 2. Progettare 2+ programmi CONNECTION strutturati. 3. Ridurre quota economic relief (>40% → soglia di attenzione).',
    },
    {
      title: 'Privacy Boundary Note',
      summary: 'Nessun dato individuale incluso. Tutti i valori sono aggregati aziendali con soglia N≥10. My KORA del lavoratore rimane privato e di proprietà del lavoratore.',
    },
  ],
  disclaimer: 'Questo Decision Pack è sintetico e generato da dati demo. Non costituisce certificazione ESG, audit o giudizio di compliance. KORA Foundation Light — calibrazione pre-empirica.',
};

// ── Next best actions ─────────────────────────────────────────────────────────

export const ACME_NEXT_ACTIONS = [
  { priority: 1, pillar: 'GROWTH',     action: 'Richiedere export LMS completo con date e moduli',              impact: '+4 KORA Index stimato',   effort: 'Basso' },
  { priority: 2, pillar: 'CONNECTION', action: 'Avviare programma mentoring strutturato (min. 2 iniziative)',  impact: '+7 KORA Index stimato',   effort: 'Alto' },
  { priority: 3, pillar: 'LIFE',       action: 'Ridurre quota economic relief sotto 40%',                       impact: '+3 QUALITY / EQUITY',     effort: 'Medio' },
  { priority: 4, pillar: 'LEGACY',     action: 'Formalizzare Knowledge Base con piano di aggiornamento',        impact: '+5 KORA Index stimato',   effort: 'Medio' },
  { priority: 5, pillar: 'IMPACT',     action: 'Ottenere conferma provider terzo per progetto Q1',             impact: 'Sblocco pending_review',  effort: 'Basso' },
];

// ── Company submissions (synthetic) ───────────────────────────────────────────

export interface AcmeDemoSubmission {
  id:             string;
  submissionType: string;
  period:         string;
  status:         string;
  fileCount:      number;
  files:          Array<{ safeName: string; fileType: string; fileSizeBytes: number; purpose: string }>;
  companyNote:    string | null;
  adminComment:   string | null;
  adminReviewedBy: string | null;
  submittedAt:    string | null;
  createdAt:      string;
}

export const ACME_SUBMISSIONS: AcmeDemoSubmission[] = [
  {
    id:             'sub-acme-001',
    submissionType: 'initiatives',
    period:         '2026-Q1',
    status:         'submission_accepted',
    fileCount:      2,
    files: [
      { safeName: 'acme_welfare_initiatives_q1.csv',  fileType: 'csv',  fileSizeBytes: 48320,  purpose: 'initiatives' },
      { safeName: 'acme_provider_contracts_q1.xlsx',  fileType: 'xlsx', fileSizeBytes: 102400, purpose: 'evidence' },
    ],
    companyNote:    'Dati principali iniziative welfare Q1. Include export parziale LMS.',
    adminComment:   'Accettato per intake. Nota: LMS export incompleto — richiedere full export con date completamento. Continuare in Data Intake.',
    adminReviewedBy: 'admin@kora.internal',
    submittedAt:    '2026-05-10T10:15:00Z',
    createdAt:      '2026-05-08T09:30:00Z',
  },
  {
    id:             'sub-acme-002',
    submissionType: 'evidence',
    period:         '2026-Q1',
    status:         'submission_needs_clarification',
    fileCount:      1,
    files: [
      { safeName: 'acme_lms_certificates_q1.pdf', fileType: 'pdf', fileSizeBytes: 215040, purpose: 'evidence' },
    ],
    companyNote:    'Certificati partecipazione piattaforma eLearning gennaio-marzo 2026.',
    adminComment:   'Richiedere export completo dalla piattaforma LMS con: date completamento moduli, percentuale completamento per utente (aggregata, N≥10), elenco moduli completati.',
    adminReviewedBy: 'admin@kora.internal',
    submittedAt:    '2026-05-12T14:30:00Z',
    createdAt:      '2026-05-12T11:00:00Z',
  },
  {
    id:             'sub-acme-003',
    submissionType: 'budget',
    period:         '2026-Q1',
    status:         'submission_pending',
    fileCount:      1,
    files: [
      { safeName: 'acme_welfare_budget_q1.xlsx', fileType: 'xlsx', fileSizeBytes: 87040, purpose: 'budget' },
    ],
    companyNote:    'Prospetto spesa welfare Q1 con breakdown per categoria e fornitore.',
    adminComment:   null,
    adminReviewedBy: null,
    submittedAt:    '2026-05-18T09:00:00Z',
    createdAt:      '2026-05-17T16:45:00Z',
  },
  {
    id:             'sub-acme-004',
    submissionType: 'participation',
    period:         '2026-Q1',
    status:         'submission_draft',
    fileCount:      0,
    files:          [],
    companyNote:    'Bozza — aggiornamento roster dipendenti Q1. Da finalizzare con HR.',
    adminComment:   null,
    adminReviewedBy: null,
    submittedAt:    null,
    createdAt:      '2026-05-19T11:20:00Z',
  },
];

// ── Methodology metadata ──────────────────────────────────────────────────────

export const ACME_METHODOLOGY = {
  versionId:         'KORA Index v1.0',
  calibrationStatus: 'pre_empirical_calibration',
  disclaimerKoraMeasures:     'KORA misura le organizzazioni, non gli individui.',
  disclaimerPrivacy:          'Nessun dato individuale del lavoratore è visibile al datore di lavoro. Soglia privacy N≥10 applicata.',
  disclaimerCompliance:       'KORA non certifica conformità normativa e non sostituisce consulenza ESG, legale o fiscale.',
  disclaimerCalibration:      'KORA Foundation Light — calibrazione pre-empirica. Non audit-grade, non production-ready.',
  csrDisclaimer:              'KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.',
};

import companiesRaw from '@/data/synthetic/companies.json';
import koraIndexRaw from '@/data/synthetic/kora-index-outputs.json';
import sourceBatchesRaw from '@/data/synthetic/source-batches.json';

// ─── Raw seed shapes ───────────────────────────────────────────────────────────

interface SeedCompany {
  id: string; company_name?: string; sector?: string; country?: string;
  territory?: string; headcount?: number; headcount_in_scope?: number;
  program_status?: string; foundation_light_status?: string;
  data_completeness?: number; welfare_budget_eur_approx?: number;
  is_primary_demo_company?: boolean; demo_narrative?: string;
}

interface SeedKoraIndex {
  id: string; company_id: string; scenario_id: string;
  reporting_period: string; kora_index_value: number;
  safeguard_status: string; confidence_score: number;
  methodology_version_id: string; calibration_status: string;
}

interface SeedBatch {
  id: string; company_id: string; scenario_id: string;
  source_type: string; source_name?: string; batch_status: string;
  row_count: number; mapped_count: number; rejected_count?: number;
  completeness_pct: number; mapping_confidence_avg: number;
  evidence_attached_pct?: number; pending_review_count?: number;
}

const companies   = (companiesRaw as { data: SeedCompany[] }).data;
const koraOutputs = (koraIndexRaw as { data: SeedKoraIndex[] }).data;
const batches     = (sourceBatchesRaw as { data: SeedBatch[] }).data;

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface CompanyPortfolioEntry {
  id: string;
  company_name: string;
  sector: string;
  territory: string;
  headcount: number;
  data_completeness: number;
  status: string;
  kora_index_value: number | null;
  confidence_score: number | null;
  safeguard_status: string | null;
  is_primary_demo: boolean;
  demo_note: string;
}

export interface IndexRegistryEntry {
  company_id: string;
  company_name: string;
  scenario_id: string;
  reporting_period: string;
  kora_index_value: number;
  confidence_score: number;
  safeguard_status: string;
  methodology_version_id: string;
  calibration_status: string;
  is_synthetic: boolean;
}

export interface BenchmarkPreview {
  dimension: string;
  cluster_label: string;
  meridiana_index: number;
  cluster_avg: number;
  cluster_top_quartile: number;
  percentile: string;
}

export interface AdvisorEntry {
  id: string;
  name: string;
  specialization: string;
  assigned_companies: string[];
  pending_reviews: number;
  status: string;
}

export interface PartnerEntry {
  id: string;
  name: string;
  pillars: string[];
  territory: string;
  evidence_protocol_status: string;
  active_programs: number;
}

export interface PlatformAnalytics {
  companies_in_portfolio: number;
  active_scenarios: number;
  source_batches_total: number;
  source_batches_approved: number;
  avg_data_completeness: number;
  avg_confidence_score: number;
  safeguard_distribution: { CLEAR: number; WARNING: number; FLAGGED: number };
  avg_kora_index: number;
}

export interface BillingEntry {
  company_name: string;
  plan: string;
  setup_fee_eur: number;
  monthly_fee_eur: number;
  advisory_fee_eur: number;
  status: string;
}

export interface FounderValidationEntry {
  company_name: string;
  stage: 'prospect' | 'contacted' | 'demo_shown' | 'pilot_proposed' | 'pilot_active';
  potential_arr_eur: number;
  signal: string;
  next_action: string;
}

export interface GateStatusEntry {
  id: string;
  label: string;
  status: 'CLOSED' | 'OPEN';
  blocks: string;
}

export interface GateStatusPreview {
  gates: GateStatusEntry[];
  methodology_version_id: string;
  calibration_status: string;
  synthetic_demo: true;
}

// ─── Synthetic supplement for companies without scoring outputs ───────────────
// These values are consistent with the demo narratives in companies.json.
const SYNTHETIC_INDEX: Record<string, { kora_index_value: number; confidence_score: number; safeguard_status: string }> = {
  'nexo-digital':        { kora_index_value: 72, confidence_score: 0.82, safeguard_status: 'CLEAR' },
  'fortis-industrial':   { kora_index_value: 28, confidence_score: 0.45, safeguard_status: 'FLAGGED' },
  'communitas-cooperativa': { kora_index_value: 58, confidence_score: 0.61, safeguard_status: 'WARNING' },
};

const COMPANY_NAME_MAP: Record<string, string> = {
  'meridiana-group':       'Meridiana Group S.r.l.',
  'nexo-digital':          'Nexo Digital S.p.A.',
  'fortis-industrial':     'Fortis Industrial S.p.A.',
  'communitas-cooperativa': 'Communitas Cooperativa',
};

// ─── Service ──────────────────────────────────────────────────────────────────

class AdminPreviewService {
  // 1. Company Portfolio
  getCompanyPortfolioPreview(): CompanyPortfolioEntry[] {
    return companies.map((c): CompanyPortfolioEntry => {
      const realOutput = koraOutputs.find(
        (o) => o.company_id === c.id && o.scenario_id === 'S2',
      );
      const synthetic = SYNTHETIC_INDEX[c.id];
      const indexVal = realOutput?.kora_index_value ?? synthetic?.kora_index_value ?? null;
      const cs       = realOutput?.confidence_score ?? synthetic?.confidence_score ?? null;
      const safeguard = realOutput?.safeguard_status ?? synthetic?.safeguard_status ?? null;

      return {
        id: c.id,
        company_name: c.company_name ?? COMPANY_NAME_MAP[c.id] ?? c.id,
        sector: c.sector ?? '—',
        territory: c.territory ?? '—',
        headcount: c.headcount_in_scope ?? c.headcount ?? 0,
        data_completeness: c.data_completeness ?? 0,
        status: c.foundation_light_status ?? c.program_status ?? 'active',
        kora_index_value: indexVal,
        confidence_score: cs,
        safeguard_status: safeguard,
        is_primary_demo: c.is_primary_demo_company ?? false,
        demo_note: c.demo_narrative ?? '',
      };
    });
  }

  // 2. Index Registry
  getIndexRegistryPreview(): IndexRegistryEntry[] {
    const real: IndexRegistryEntry[] = koraOutputs.map((o) => ({
      company_id: o.company_id,
      company_name: COMPANY_NAME_MAP[o.company_id] ?? o.company_id,
      scenario_id: o.scenario_id,
      reporting_period: o.reporting_period,
      kora_index_value: o.kora_index_value,
      confidence_score: o.confidence_score,
      safeguard_status: o.safeguard_status,
      methodology_version_id: o.methodology_version_id,
      calibration_status: o.calibration_status,
      is_synthetic: false,
    }));

    // Synthetic entries for other companies (S2-equivalent snapshot)
    const synthetic: IndexRegistryEntry[] = Object.entries(SYNTHETIC_INDEX).map(([id, vals]) => ({
      company_id: id,
      company_name: COMPANY_NAME_MAP[id] ?? id,
      scenario_id: 'S2',
      reporting_period: 'Q1–Q4 2025',
      kora_index_value: vals.kora_index_value,
      confidence_score: vals.confidence_score,
      safeguard_status: vals.safeguard_status,
      methodology_version_id: 'KORA Index v1.0',
      calibration_status: 'pre_empirical_calibration',
      is_synthetic: true,
    }));

    return [...real, ...synthetic];
  }

  // 3. Benchmarks
  getBenchmarkPreview(): BenchmarkPreview[] {
    return [
      { dimension: 'Sector', cluster_label: 'Manufacturing & Logistics — Italy', meridiana_index: 54, cluster_avg: 51, cluster_top_quartile: 68, percentile: '75th' },
      { dimension: 'Territory', cluster_label: 'Northern Italy — Lombardy', meridiana_index: 54, cluster_avg: 58, cluster_top_quartile: 72, percentile: '65th' },
      { dimension: 'Company size', cluster_label: '200–300 employees', meridiana_index: 54, cluster_avg: 55, cluster_top_quartile: 70, percentile: '70th' },
    ];
  }

  // 4. Advisor Network
  getAdvisorNetworkPreview(): AdvisorEntry[] {
    return [
      { id: 'adv-001', name: 'Dr. Francesca Lombardi', specialization: 'LIFE / Preventive health', assigned_companies: ['Meridiana Group S.r.l.'], pending_reviews: 3, status: 'active' },
      { id: 'adv-002', name: 'Marco Russo', specialization: 'IMPACT / ESG certification', assigned_companies: ['Nexo Digital S.p.A.', 'Communitas Cooperativa'], pending_reviews: 7, status: 'active' },
      { id: 'adv-003', name: 'Ing. Carla Bianchi', specialization: 'GROWTH / Skills & upskilling', assigned_companies: ['Fortis Industrial S.p.A.'], pending_reviews: 1, status: 'active' },
      { id: 'adv-004', name: 'Prof. Alessandro Ferri', specialization: 'LEGACY / Knowledge transfer', assigned_companies: [], pending_reviews: 0, status: 'available' },
    ];
  }

  // 5. Partner Network
  getPartnerNetworkPreview(): PartnerEntry[] {
    return [
      { id: 'partner-mindspace',   name: 'MindSpace Wellness',   pillars: ['LIFE'],             territory: 'Milan',           evidence_protocol_status: 'audit_completato',  active_programs: 3 },
      { id: 'partner-nutriwell',   name: 'NutriWell Italia',     pillars: ['LIFE'],             territory: 'Italy (remote)',  evidence_protocol_status: 'audit_completato',  active_programs: 2 },
      { id: 'partner-mediflex',    name: 'MediFlex Health',      pillars: ['LIFE'],             territory: 'Lombardy',        evidence_protocol_status: 'audit_completato',  active_programs: 4 },
      { id: 'partner-learningpro', name: 'LearningPro Academy',  pillars: ['GROWTH'],           territory: 'Italy',           evidence_protocol_status: 'audit_parziale',    active_programs: 5 },
      { id: 'partner-growthlab',   name: 'GrowthLab Skills',     pillars: ['GROWTH', 'LEGACY'], territory: 'Milan',           evidence_protocol_status: 'audit_parziale',    active_programs: 2 },
      { id: 'partner-communit8',   name: 'Communit8 Social',     pillars: ['CONNECTION', 'IMPACT'], territory: 'Northern Italy', evidence_protocol_status: 'audit_in_corso', active_programs: 1 },
    ];
  }

  // 6. Platform Analytics
  getPlatformAnalyticsPreview(): PlatformAnalytics {
    const totalBatches    = batches.length;
    const approvedBatches = batches.filter((b) => b.batch_status === 'approved').length;
    const allEntries = this.getIndexRegistryPreview();
    const avgIndex = allEntries.length
      ? Math.round(allEntries.reduce((s, e) => s + e.kora_index_value, 0) / allEntries.length)
      : 0;
    const avgCs = allEntries.length
      ? Math.round((allEntries.reduce((s, e) => s + e.confidence_score, 0) / allEntries.length) * 100) / 100
      : 0;
    const safeguardDist = { CLEAR: 0, WARNING: 0, FLAGGED: 0 };
    for (const e of allEntries) {
      if (e.safeguard_status === 'CLEAR')   safeguardDist.CLEAR++;
      if (e.safeguard_status === 'WARNING') safeguardDist.WARNING++;
      if (e.safeguard_status === 'FLAGGED') safeguardDist.FLAGGED++;
    }
    return {
      companies_in_portfolio: companies.length,
      active_scenarios: 2,
      source_batches_total: totalBatches,
      source_batches_approved: approvedBatches,
      avg_data_completeness: 0.68,
      avg_confidence_score: avgCs,
      safeguard_distribution: safeguardDist,
      avg_kora_index: avgIndex,
    };
  }

  // 7. Billing & Revenue (mock — no real payments)
  getBillingRevenuePreview(): BillingEntry[] {
    return [
      { company_name: 'Meridiana Group S.r.l.',  plan: 'Foundation Pilot',     setup_fee_eur: 4500, monthly_fee_eur: 1200, advisory_fee_eur: 2400, status: 'demo' },
      { company_name: 'Nexo Digital S.p.A.',      plan: 'Foundation Pilot',     setup_fee_eur: 4500, monthly_fee_eur: 1200, advisory_fee_eur: 1800, status: 'demo' },
      { company_name: 'Fortis Industrial S.p.A.', plan: 'Enterprise Pilot',     setup_fee_eur: 8000, monthly_fee_eur: 2400, advisory_fee_eur: 4800, status: 'demo' },
      { company_name: 'Communitas Cooperativa',   plan: 'Social Enterprise',    setup_fee_eur: 2200, monthly_fee_eur:  750, advisory_fee_eur: 1200, status: 'demo' },
    ];
  }

  // 8. Founder Validation / GTM
  getFounderValidationPreview(): FounderValidationEntry[] {
    return [
      { company_name: 'Meridiana Group S.r.l.',  stage: 'pilot_active',    potential_arr_eur: 28800, signal: 'Pilot running — Q1–Q4 2025', next_action: 'Score review call — Jan 2026' },
      { company_name: 'Nexo Digital S.p.A.',      stage: 'demo_shown',      potential_arr_eur: 19200, signal: 'HR Director interested', next_action: 'Pilot proposal — Feb 2026' },
      { company_name: 'Fortis Industrial S.p.A.', stage: 'pilot_proposed',  potential_arr_eur: 43200, signal: 'CFO concern about ROI', next_action: 'Evidence review + FLAGGED scenario walkthrough' },
      { company_name: 'Communitas Cooperativa',   stage: 'contacted',       potential_arr_eur: 11000, signal: 'KORA Contribution fit strong', next_action: 'Intro call — Feb 2026' },
      { company_name: 'TerraFlex Agri S.r.l.',    stage: 'prospect',        potential_arr_eur: 16800, signal: 'Inbound — ESG team', next_action: 'Qualify sector fit' },
      { company_name: 'Gruppo Solidale S.c.',      stage: 'prospect',        potential_arr_eur: 9600,  signal: 'Cooperative network referral', next_action: 'Qualify — social enterprise plan' },
    ];
  }

  // 9. Gate & Methodology Status
  getGateStatusPreview(): GateStatusPreview {
    return {
      methodology_version_id: 'KORA Index v1.0',
      calibration_status: 'pre_empirical_calibration',
      synthetic_demo: true,
      gates: [
        { id: 'G1', label: 'Gate 1 — Product Scope',          status: 'CLOSED', blocks: 'None — Foundation Light scope confirmed' },
        { id: 'G2', label: 'Gate 2 — CTO Architecture Review', status: 'OPEN',   blocks: 'SQL DDL · Prisma · Supabase · Production DB · Production auth' },
        { id: 'G3', label: 'Gate 3 — Legal / Privacy',         status: 'OPEN',   blocks: 'Live company data · Real worker accounts · HRIS/LMS integrations' },
        { id: 'G5', label: 'Gate 5 — Tax / Fiscal Advisor',    status: 'OPEN',   blocks: 'Live fiscal outputs · Automated guardrail enforcement · Tax advice' },
      ],
    };
  }
}

// ─── AI Onboarding Engine interfaces ─────────────────────────────────────────

export interface CompanyOnboardingStatus {
  company_id: string;
  company_name: string;
  onboarding_status: string;
  current_phase: string;
  scoring_readiness: 'ready' | 'partial' | 'blocked';
  source_batch_count: number;
  approved_batches: number;
  pending_review_batches: number;
  synthetic_demo: true;
}

export interface SourceBatchPreview {
  id: string;
  source_type: string;
  source_label: string;
  scenario_id: string;
  rows_received: number;
  mapped_records: number;
  rejected_records: number;
  completeness_pct: number;
  mapping_confidence: number;
  evidence_attached_pct: number;
  pending_review: number;
  status: string;
}

export interface MappingIntelligencePreview {
  total_rows_processed: number;
  rows_mapped: number;
  rows_rejected: number;
  rows_pending: number;
  avg_mapping_confidence: number;
  sources_requiring_review: number;
  taxonomy_rules_applied: number;
  bcm_pillar_assignments: number;
  unmapped_requiring_manual: number;
  taxonomy_basis: string;
}

export interface PrivacyFilterPreview {
  sensitive_fields_detected: number;
  sensitive_fields_excluded: number;
  excluded_categories: string[];
  no_external_llm_on_hr_data: true;
  no_employer_access_individual: true;
  pseudonymization_applied: true;
}

export interface UefDraftQueuePreview {
  draft_total_estimated: number;
  approved: number;
  flagged_for_review: number;
  rejected: number;
  eligible_for_scoring: number;
  uef_event_records_deferred: true;
  deferred_reason: string;
}

export interface HumanReviewPreview {
  batches_requiring_review: number;
  total_pending_items: number;
  flagged_mappings: number;
  rejected_mappings: number;
  advisor_queue_items: number;
  approval_gate_active: true;
}

export interface ScoringReadinessPreview {
  data_completeness: number;
  evidence_quality: number;
  mapping_confidence: number;
  review_completion: number;
  readiness_status: 'ready' | 'partial' | 'blocked';
  next_required_action: string;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  hris_population:  'HRIS Population Export',
  lms_training:     'LMS Training Export',
  welfare_provider: 'Welfare Provider Export',
  esg_initiatives:  'ESG Initiatives File',
  partner_events:   'Partner Events File',
  manual_upload:    'Manual Upload',
};

// ─── Extended AdminPreviewService ─────────────────────────────────────────────

export const adminPreviewService = new (class extends AdminPreviewService {

  // A. Company onboarding status (Meridiana — primary demo company)
  getAIOnboardingPreview(): CompanyOnboardingStatus {
    const meridianaS1 = batches.filter(
      (b) => b.company_id === 'meridiana-group' && b.scenario_id === 'S1',
    );
    const approved = meridianaS1.filter((b) => b.batch_status === 'approved').length;
    const pending  = meridianaS1.filter((b) => b.batch_status !== 'approved').length;

    return {
      company_id: 'meridiana-group',
      company_name: 'Meridiana Group S.r.l.',
      onboarding_status: 'Foundation Light demo ready — partial review required',
      current_phase: 'Source mapping complete · UEF review preparation',
      scoring_readiness: approved >= 2 ? 'partial' : 'blocked',
      source_batch_count: meridianaS1.length,
      approved_batches: approved,
      pending_review_batches: pending,
      synthetic_demo: true,
    };
  }

  // B. Source intake per scenario (defaults to S1 — most interesting for demo)
  getSourceIntakePreview(scenarioId: 'S1' | 'S2' = 'S1'): SourceBatchPreview[] {
    return batches
      .filter((b) => b.company_id === 'meridiana-group' && b.scenario_id === scenarioId)
      .map((b): SourceBatchPreview => ({
        id: b.id,
        source_type: b.source_type,
        source_label: SOURCE_TYPE_LABELS[b.source_type] ?? b.source_type,
        scenario_id: b.scenario_id,
        rows_received: b.row_count,
        mapped_records: b.mapped_count,
        rejected_records: b.rejected_count ?? (b.row_count - b.mapped_count - (b.pending_review_count ?? 0)),
        completeness_pct: b.completeness_pct,
        mapping_confidence: b.mapping_confidence_avg,
        evidence_attached_pct: b.evidence_attached_pct ?? 0,
        pending_review: b.pending_review_count ?? 0,
        status: b.batch_status,
      }));
  }

  // C. Mapping intelligence — derived from S1 batch data
  getMappingIntelligencePreview(): MappingIntelligencePreview {
    const s1 = batches.filter(
      (b) => b.company_id === 'meridiana-group' && b.scenario_id === 'S1',
    );
    const totalRows   = s1.reduce((s, b) => s + b.row_count, 0);
    const totalMapped = s1.reduce((s, b) => s + b.mapped_count, 0);
    const totalRejected = s1.reduce((s, b) => s + (b.rejected_count ?? 0), 0);
    const totalPending  = s1.reduce((s, b) => s + (b.pending_review_count ?? 0), 0);
    const weightedConf  = s1.reduce((s, b) => s + b.mapping_confidence_avg * b.row_count, 0);
    const avgConf = totalRows > 0 ? weightedConf / totalRows : 0;
    const requiresReview = s1.filter((b) => b.batch_status !== 'approved').length;

    return {
      total_rows_processed: totalRows,
      rows_mapped: totalMapped,
      rows_rejected: totalRejected,
      rows_pending: totalPending,
      avg_mapping_confidence: Math.round(avgConf * 100) / 100,
      sources_requiring_review: requiresReview,
      taxonomy_rules_applied: 847,
      bcm_pillar_assignments: totalMapped,
      unmapped_requiring_manual: totalRejected + Math.floor(totalPending * 0.3),
      taxonomy_basis: 'Rule-based BCM taxonomy classifier — no external LLM',
    };
  }

  // D. Privacy filter — inline synthetic preview
  getPrivacyFilterPreview(): PrivacyFilterPreview {
    return {
      sensitive_fields_detected: 14,
      sensitive_fields_excluded: 14,
      excluded_categories: [
        'Email addresses',
        'Phone numbers',
        'Postal addresses',
        'Tax identifiers (codice fiscale)',
        'Health and clinical details',
        'Free-text personal notes',
        'Diagnostic or therapist references',
      ],
      no_external_llm_on_hr_data: true,
      no_employer_access_individual: true,
      pseudonymization_applied: true,
    };
  }

  // E. UEF draft queue — aggregate counts only (no event-level records)
  getUefDraftQueuePreview(): UefDraftQueuePreview {
    const s1 = batches.filter(
      (b) => b.company_id === 'meridiana-group' && b.scenario_id === 'S1',
    );
    const totalMapped = s1.reduce((s, b) => s + b.mapped_count, 0);
    const draft  = Math.floor(totalMapped * 0.92);
    const approved = Math.floor(draft * 0.55);
    const flagged  = Math.floor(draft * 0.18);
    const rejected = Math.floor(draft * 0.08);
    return {
      draft_total_estimated: draft,
      approved,
      flagged_for_review: flagged,
      rejected,
      eligible_for_scoring: approved,
      uef_event_records_deferred: true,
      deferred_reason: 'UEF event-level records are not generated in Foundation Light demo phase. Aggregate queue counts only.',
    };
  }

  // F. Human review summary — inline synthetic
  getHumanReviewPreview(): HumanReviewPreview {
    const s1 = batches.filter(
      (b) => b.company_id === 'meridiana-group' && b.scenario_id === 'S1',
    );
    const pendingBatches = s1.filter((b) => b.batch_status !== 'approved').length;
    const totalPending   = s1.reduce((s, b) => s + (b.pending_review_count ?? 0), 0);
    return {
      batches_requiring_review: pendingBatches,
      total_pending_items: totalPending,
      flagged_mappings: Math.floor(totalPending * 0.22),
      rejected_mappings: Math.floor(totalPending * 0.09),
      advisor_queue_items: 11,
      approval_gate_active: true,
    };
  }

  // G. Scoring readiness
  getScoringReadinessPreview(): ScoringReadinessPreview {
    const s1 = batches.filter(
      (b) => b.company_id === 'meridiana-group' && b.scenario_id === 'S1',
    );
    const avgCompleteness = s1.reduce((s, b) => s + b.completeness_pct, 0) / (s1.length || 1);
    const avgEvidence     = s1.reduce((s, b) => s + (b.evidence_attached_pct ?? 0), 0) / (s1.length || 1);
    const avgConf         = s1.reduce((s, b) => s + b.mapping_confidence_avg, 0) / (s1.length || 1);
    const approvedRatio   = s1.filter((b) => b.batch_status === 'approved').length / (s1.length || 1);

    return {
      data_completeness: Math.round(avgCompleteness * 100) / 100,
      evidence_quality: Math.round(avgEvidence * 100) / 100,
      mapping_confidence: Math.round(avgConf * 100) / 100,
      review_completion: Math.round(approvedRatio * 100) / 100,
      readiness_status: 'partial',
      next_required_action: 'Complete human review of 165 pending items across LMS, Welfare, ESG, Partner, and Manual batches. Advisor review of 11 queued IMPACT events required before scoring run.',
    };
  }
})();

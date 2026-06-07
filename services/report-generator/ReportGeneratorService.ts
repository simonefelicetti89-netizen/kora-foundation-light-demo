// services/report-generator/ReportGeneratorService.ts
//
// ── REPORTING ARCHITECTURE NOTE ───────────────────────────────────────────────
// KORA has two report services consumed by app/company/reports/page.tsx:
//
//   ReportFactoryService  (489L) — orchestrator role: versions, metadata, export
//                                  actions, period comparison, change summaries.
//   ReportGeneratorService (this) — content generation: Decision Pack body,
//                                  section data, metrics, insights, recommendations.
//
// Target architecture: app routes consume ONLY ReportFactoryService.
//   ReportFactoryService should call ReportGeneratorService internally.
//   No app route should import both services simultaneously.
//
// Current state (Foundation Light v0.1): both services are imported directly by
//   app/company/reports/page.tsx. This is architectural debt — safe for demo,
//   but must be resolved before Pilot+.
//
// Pilot+ action: move content generation calls from the reports page into
//   ReportFactoryService, then remove the direct reports page → generator import.

import type {
  KoraRole,
  ScenarioId,
  ReportData,
  CompanyDecisionPack,
  DecisionPackSection,
  DecisionPackMetric,
  DecisionPackInsight,
  DecisionPackRecommendation,
  DecisionPackStatus,
  DecisionPackVersion,
  DecisionPackExportAction,
  ActivationSafeguardResult,
  MacroblockScore,
  KoraIndexOutput,
  CalibrationStatus,
  ExplainabilityRecord,
  ExplainabilityAction,
  PillarBudgetLine,
  EligibilityGateSummary,
  UEFReviewSummary,
  ImpactUnitComputationSummary,
  DynamicScoringPreviewOutput,
  BudgetToHumanImpactRecord,
  BudgetToHumanImpactRecommendation,
} from '@/lib/types';
import type { ExplainabilityRecord as SvcExplainabilityRecord } from '@/services/explainability/ExplainabilityService';
import type { PillarBudgetLine as SvcPillarBudgetLine } from '@/services/financial-governance/FinancialGovernanceService';
import { isEmployerRole } from '@/lib/permissions';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { dynamicScoringPreviewService } from '@/services/dynamic-scoring/DynamicScoringPreviewService';
import { uefReviewService } from '@/services/uef-review/UEFReviewService';
import { iuComputationService } from '@/services/iu-computation/IUComputationService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { financialGovernanceService } from '@/services/financial-governance/FinancialGovernanceService';
import { ingestionPipelineService } from '@/services/ingestion-pipeline/IngestionPipelineService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { scenarioService } from '@/services/scenario/ScenarioService';
import { getMethodologyVersion, getCalibrationStatus, getMacroblockWeights } from '@/lib/methodology-config/v0.1';
import { MACROBLOCK_LABELS, MACROBLOCK_CODES } from '@/lib/constants/kora';

export type ReportType =
  | 'executive_summary' | 'kora_index_detail' | 'activation_report'
  | 'pillar_breakdown' | 'financial_governance' | 'sustainability_annex'
  | 'welfare_statement' | 'advisor_evidence_summary';

// ── Methodology notes builder — dynamic, never hardcoded ─────────────────────────
function buildMacroblockWeightNotes(): string {
  const weights = getMacroblockWeights();
  return (MACROBLOCK_CODES as readonly string[])
    .map((code) => `${MACROBLOCK_LABELS[code]} ${Math.round((weights[code as keyof typeof weights] ?? 0) * 100)}%`)
    .join(' · ');
}

// ── Display name registry ─────────────────────────────────────────────────────────
const COMPANY_NAMES: Record<string, string> = {
  'meridiana-group': 'Meridiana Group',
};

// ── Type mappers ──────────────────────────────────────────────────────────────────

function mapExplainability(svc: SvcExplainabilityRecord): ExplainabilityRecord {
  return {
    id:                          svc.id,
    company_id:                  svc.company_id,
    scenario_id:                 svc.scenario_id,
    reporting_period:            svc.reporting_period,
    kora_index_output_id:        svc.kora_index_output_id,
    methodology_version_id:      svc.methodology_version_id,
    calibration_status:          svc.calibration_status,
    kora_index_explanation:      svc.kora_index_explanation,
    safeguard_explanation:       svc.safeguard_explanation,
    explanations:                [...svc.strong_components, ...svc.weak_components],
    strong_components:           svc.strong_components,
    weak_components:             svc.weak_components,
    next_best_actions:           svc.next_best_actions,
    limitations_statement:       svc.limitations_statement,
    individual_worker_data_present: false,
  };
}

function mapPillarBudget(lines: SvcPillarBudgetLine[]): PillarBudgetLine[] {
  return lines.map((l) => ({
    pillar:             l.pillar,
    allocated:          l.allocated,
    used:               l.used,
    utilization_rate:   l.utilization_rate,
    programs:           l.programs,
    ...(l.economic_relief_included !== undefined && {
      economic_relief_included: l.economic_relief_included > 0,
    }),
  }));
}

function btiRecToActionRecs(
  recs: BudgetToHumanImpactRecommendation[],
  horizon: DecisionPackRecommendation['horizon'],
): DecisionPackRecommendation[] {
  return recs.map((r, i) => ({
    id:                 `bti-rec-${i + 1}`,
    title:              r.action_it.split('.')[0] ?? r.action_it,
    rationale:          r.action_it,
    recommended_action: r.action_it,
    priority:           r.priority,
    owner_suggestion:   'HR / Finance',
    horizon,
    related_metric:     r.target_macroblock,
    expected_direction: r.expected_signal_it,
    caveat:             r.budget_note ?? 'Output direzionale — non garantisce risultati specifici.',
  }));
}

function explainActionsToRecs(
  actions: ExplainabilityAction[],
): DecisionPackRecommendation[] {
  const HORIZONS: DecisionPackRecommendation['horizon'][] = ['0-30gg', '30-60gg', '60-90gg', 'ongoing'];
  return actions.map((a, i) => ({
    id:                 `exp-rec-${i + 1}`,
    title:              a.action,
    rationale:          a.detail,
    recommended_action: a.action,
    priority:           i === 0 ? 'alta' : i < 3 ? 'media' : 'bassa',
    owner_suggestion:   'HR',
    horizon:            HORIZONS[Math.min(i, 3)],
    related_metric:     a.target_components[0],
    expected_direction: 'Miglioramento componente KORA Index v3.',
    caveat:             'Proxy diagnostico — correlazione ≠ causalità. Verificare con advisor prima di pianificare investimenti.',
  }));
}

// ── Section builders ──────────────────────────────────────────────────────────────

function sectionCover(
  companyName: string, period: string, status: DecisionPackStatus,
  methodologyVersion: string, calibrationStatus: string,
): DecisionPackSection {
  return {
    code:      'cover',
    title:     'KORA Company Decision Pack',
    subtitle:  `${companyName} · ${period}`,
    audience:  ['executive', 'hr', 'cfo', 'esg', 'advisor'],
    summary:   `Report diagnostico KORA Index v3 per ${companyName}. Generato da KORA Foundation Light — pre-calibrazione empirica. Tutti gli output sono dati sintetici demo, non adatti a decisioni operative, di compliance o fiscali.`,
    metrics:   [{
      code: 'report_status', label: 'Stato Report', value: status,
      interpretation: status === 'ready' ? 'Pronto per revisione advisor.'
        : status === 'advisor_review_required' ? 'Confidence Score < 0.55 — revisione advisor consigliata.'
        : 'Dati in attesa di revisione UEF.',
      source: 'uef_review_service', confidence: 'high',
    }],
    insights:        [],
    recommendations: [],
    limitations:     [
      `Metodologia ${methodologyVersion} · calibration_status: ${calibrationStatus}.`,
      'Dati sintetici demo — non rappresentano la situazione reale dell\'azienda.',
    ],
    methodology_notes: `KORA Index v3: 4 macroblocks — ${buildMacroblockWeightNotes()}. Confidence Score esterno al calcolo — mostrato come indicatore di affidabilità dati.`,
  };
}

function sectionExecutiveSummary(
  currentOutput: KoraIndexOutput,
  s1Output: KoraIndexOutput,
  s2Output: KoraIndexOutput,
  safeguard: ActivationSafeguardResult | null,
  confidenceScore: number,
  explanation: ExplainabilityRecord | null,
): DecisionPackSection {
  const delta = s2Output.kora_index_value - s1Output.kora_index_value;
  const safeguardLabel = safeguard?.status ?? currentOutput.safeguard_status;
  const insights: DecisionPackInsight[] = [];

  if (explanation) {
    insights.push({
      id:              'exec-ins-1',
      title:           'Lettura KORA Index v3',
      body:            explanation.kora_index_explanation,
      severity:        'medium',
      audience:        ['executive'],
      related_section: 'kora_index_v3',
      source:          'explainability_service',
    });
  }
  if (safeguardLabel === 'FLAGGED' || safeguardLabel === 'WARNING') {
    insights.push({
      id:              'exec-ins-2',
      title:           `Activation Safeguard: ${safeguardLabel}`,
      body:            explanation?.safeguard_explanation
        ?? `AR=${((safeguard?.ar_value ?? 0) * 100).toFixed(0)}% · MAR=${((safeguard?.mar_value ?? 0) * 100).toFixed(0)}%. Base di partecipazione insufficiente per interpretazione ad alta fiducia.`,
      severity:        safeguardLabel === 'FLAGGED' ? 'critical' : 'high',
      audience:        ['executive', 'hr'],
      related_section: 'workforce_activation',
      source:          'activation_safeguard_service',
    });
  }

  return {
    code:     'executive_summary',
    title:    'Executive Summary',
    subtitle: 'Quadro diagnostico KORA Index v3',
    audience: ['executive', 'hr', 'cfo', 'esg'],
    summary:  `KORA Index v3: ${currentOutput.kora_index_value}/100 (Confidence Score: ${(confidenceScore * 100).toFixed(0)}%). Activation Safeguard: ${safeguardLabel}. Delta S1→S2: ${delta >= 0 ? '+' : ''}${delta} punti — ${delta > 0 ? 'miglioramento post-intervento.' : 'invariato o in calo.'}`,
    metrics:  [
      {
        code: 'kora_index',
        label: 'KORA Index v3',
        value: currentOutput.kora_index_value,
        unit: '/100',
        scenario_value_previous: s1Output.kora_index_value,
        delta,
        interpretation: `Indice composito attivazione umana. ${delta >= 0 ? 'Migliorato' : 'Invariato o peggiorato'} rispetto a S1.`,
        source: 'scoring_simulator_service',
        confidence: confidenceScore >= 0.70 ? 'high' : confidenceScore >= 0.55 ? 'medium' : 'low',
      },
      {
        code:           'confidence_score',
        label:          'Confidence Score',
        value:          +(confidenceScore * 100).toFixed(0),
        unit:           '%',
        interpretation: confidenceScore >= 0.70
          ? 'Dati sufficientemente completi e verificati.'
          : confidenceScore >= 0.55
          ? 'Qualità dati accettabile. Alcune fonti non verificate.'
          : 'Dati incompleti o poco verificati — output a bassa fiducia interpretativa.',
        source:         'scoring_simulator_service',
        confidence:     'high',
        limitation:     'Il Confidence Score non è un componente del KORA Index v3 — è un indicatore esterno di affidabilità.',
      },
      {
        code:           'safeguard_status',
        label:          'Activation Safeguard',
        value:          safeguardLabel,
        interpretation: safeguardLabel === 'CLEAR'
          ? 'Base di partecipazione sufficiente per interpretazione affidabile.'
          : safeguardLabel === 'WARNING'
          ? 'Partecipazione parziale — output disponibile con fiducia ridotta.'
          : 'Partecipazione troppo bassa — output non interpretabile con affidabilità.',
        source:         'activation_safeguard_service',
        confidence:     'high',
      },
      {
        code:           'index_delta_s1_s2',
        label:          'Delta KORA Index S1→S2',
        value:          `${delta >= 0 ? '+' : ''}${delta}`,
        unit:           'punti',
        interpretation: 'Variazione del KORA Index tra scenario baseline (S1) e scenario post-intervento (S2).',
        source:         'scoring_simulator_service',
        confidence:     'medium',
        limitation:     'Delta basato su seed canonico. Non calcolato dinamicamente da dati live.',
      },
    ],
    insights,
    recommendations: explanation
      ? explainActionsToRecs(explanation.next_best_actions.slice(0, 2))
      : [],
    limitations: [
      'KORA Index v3 da seed canonico pre-empirico — non da pipeline IU live.',
      'Confidence Score non modifica il valore numerico del KORA Index — ne riduce la fiducia interpretativa.',
    ],
  };
}

function sectionKoraIndexV3(
  currentOutput: KoraIndexOutput,
  macroblocks: MacroblockScore[],
  explanation: ExplainabilityRecord | null,
  calibrationStatus: string,
): DecisionPackSection {
  const mbMetrics: DecisionPackMetric[] = macroblocks.map((mb) => ({
    code:           `mb_${mb.code.toLowerCase()}`,
    label:          mb.label,
    value:          mb.score,
    unit:           '/100',
    interpretation: mb.main_driver ?? `Macroblock ${mb.code} — peso ${(mb.weight * 100).toFixed(0)}%.`,
    source:         'scoring_simulator_service',
    confidence:     mb.score >= 50 ? 'high' : mb.score >= 35 ? 'medium' : 'low',
    limitation:     mb.risk_opportunity,
  }));

  const insights: DecisionPackInsight[] = [];
  if (explanation?.strong_components.length) {
    insights.push({
      id:              'ki-ins-strong',
      title:           'Componenti più forti',
      body:            explanation.strong_components.map((c) => `${c.label}: ${c.explanation}`).join(' — '),
      severity:        'low',
      audience:        ['hr', 'executive'],
      related_section: 'kora_index_v3',
      source:          'explainability_service',
    });
  }
  if (explanation?.weak_components.length) {
    insights.push({
      id:              'ki-ins-weak',
      title:           'Componenti critici',
      body:            explanation.weak_components.map((c) => `${c.label}: ${c.explanation}`).join(' — '),
      severity:        'high',
      audience:        ['hr', 'executive'],
      related_section: 'kora_index_v3',
      source:          'explainability_service',
    });
  }

  return {
    code:     'kora_index_v3',
    title:    'KORA Index v3 — Dettaglio Macroblocks',
    subtitle: `Valore: ${currentOutput.kora_index_value}/100`,
    audience: ['executive', 'hr', 'cfo', 'esg', 'advisor'],
    summary:  `KORA Index v3 = ${currentOutput.kora_index_value}/100. 4 macroblocks: ${macroblocks.map((m) => `${m.code} ${m.score}`).join(', ')}.`,
    metrics:  mbMetrics,
    insights,
    recommendations: explanation
      ? explainActionsToRecs(explanation.next_best_actions.slice(0, 3))
      : [],
    limitations:       [
      `Pesi macroblock v0.1 — pre-calibrazione empirica Delphi Study. calibration_status: ${calibrationStatus}.`,
      'Confidence Score (CS) esterno al calcolo KORA Index v3 — peso = 0.',
      explanation?.limitations_statement ?? '',
    ].filter(Boolean),
    methodology_notes: buildMacroblockWeightNotes(),
  };
}

function sectionDynamicScoringPreview(
  preview: DynamicScoringPreviewOutput,
): DecisionPackSection {
  const metrics: DecisionPackMetric[] = preview.macroblocks.map((mb) => ({
    code:           `proxy_${mb.code.toLowerCase()}`,
    label:          `${mb.label} (Preview)`,
    value:          mb.preview_score,
    unit:           '/100',
    scenario_value_previous: mb.canonical_seed_score,
    delta:          mb.delta,
    interpretation: mb.proxy_basis.split('.')[0] ?? mb.proxy_basis,
    source:         'dynamic_scoring_preview_service',
    confidence:     'low',
    limitation:     'Proxy direzionale — non è il KORA Index ufficiale.',
  }));

  metrics.push({
    code:           'dynamic_preview_score',
    label:          'Preview Score Dinamico',
    value:          preview.dynamic_preview_score,
    unit:           '/100',
    scenario_value_previous: preview.canonical_kora_index,
    delta:          preview.delta_vs_canonical,
    interpretation: `Delta vs KORA Index canonico: ${preview.delta_vs_canonical >= 0 ? '+' : ''}${preview.delta_vs_canonical} punti. Calcolato su proxy da batch IU demo.`,
    source:         'dynamic_scoring_preview_service',
    confidence:     'low',
    limitation:     'production_ready: false — non adatto a decision-making.',
  });

  return {
    code:     'dynamic_scoring_preview',
    title:    'Dynamic Scoring Preview',
    subtitle: 'Foundation Light · calculation_mode: foundation_light_dynamic_preview',
    audience: ['advisor', 'founder'],
    summary:  `Preview sperimentale derivato da ${preview.aggregation.active_pillars_count} pillar attivi nel batch IU demo. Preview Score: ${preview.dynamic_preview_score}/100 vs KORA Index canonico ${preview.canonical_kora_index}/100.`,
    metrics,
    insights: [{
      id:              'dsp-ins-1',
      title:           'Natura proxy del calcolo',
      body:            'Il Preview Dinamico usa proxy AR/MAR da record IU (non da lavoratori reali), WB e EQ fissi conservativi, BTI da seed canonico. Non sostituisce il KORA Index v3 ufficiale.',
      severity:        'high',
      audience:        ['advisor', 'founder'],
      related_section: 'dynamic_scoring_preview',
      source:          'dynamic_scoring_preview_service',
      limitation:      'production_ready: false',
    }],
    recommendations: [],
    limitations:       preview.limitations,
    methodology_notes: `calculation_mode: ${preview.calculation_mode} · methodology_version: ${preview.methodology_version}`,
  };
}

function sectionEligibilityGate(
  gate: EligibilityGateSummary,
): DecisionPackSection {
  const pctEligible = gate.total_row_count > 0
    ? +((gate.eligible_row_count / gate.total_row_count) * 100).toFixed(0)
    : 0;
  return {
    code:     'eligibility_gate',
    title:    'Eligibility Gate — Classificazione Record',
    subtitle: `${gate.total_row_count} record · ${pctEligible}% eleggibili`,
    audience: ['hr', 'advisor', 'founder'],
    summary:  `${gate.eligible_row_count} record eleggibili (IU + KORA Index), ${gate.limited_count} Economic Relief (BTI only), ${gate.blocked_count} bloccati per design su ${gate.total_row_count} totali.`,
    metrics:  [
      {
        code: 'eligible_count', label: 'Record Eleggibili', value: gate.eligible_row_count,
        interpretation: 'Generano Impact Units e contribuiscono al KORA Index.',
        source: 'ingestion_pipeline_service', confidence: 'high',
      },
      {
        code: 'limited_count', label: 'Economic Relief', value: gate.limited_count,
        interpretation: gate.limited_note,
        source: 'ingestion_pipeline_service', confidence: 'high',
      },
      {
        code: 'blocked_count', label: 'Bloccati per Design', value: gate.blocked_count,
        interpretation: gate.blocked_note,
        source: 'ingestion_pipeline_service', confidence: 'high',
      },
    ],
    insights: [{
      id:              'eg-ins-1',
      title:           'Dottrina Eligibility Gate',
      body:            'I record bloccati non generano IU per design metodologico — compliance obbligatoria e sicurezza normativa non misurano attivazione volontaria. I record Economic Relief sono tracciati nel BTI engine come economic_relief_spend.',
      severity:        'medium',
      audience:        ['advisor', 'hr'],
      related_section: 'eligibility_gate',
      source:          'eligibility_gate_service',
    }],
    recommendations: [],
    limitations:       ['Classificazione BCM taxonomy v0.1 — rule-based, non LLM. Richiede revisione advisor per record ambigui.'],
  };
}

function sectionBTI(
  btiRecord: BudgetToHumanImpactRecord | null,
  btiRecs: BudgetToHumanImpactRecommendation[],
): DecisionPackSection {
  if (!btiRecord) {
    return {
      code: 'budget_to_human_impact', title: 'Budget-to-Human-Impact',
      audience: ['cfo', 'executive', 'hr'],
      summary: 'Dati BTI non disponibili per lo scenario selezionato.',
      metrics: [], insights: [], recommendations: [],
      limitations: ['Dati BTI mancanti per questo scenario.'],
    };
  }
  const metrics: DecisionPackMetric[] = [
    {
      code: 'bti_score', label: 'BTI Score', value: btiRecord.bti_score, unit: '/100',
      interpretation: `Efficacia della spesa people-welfare in attivazione umana verificata. Macroblock BTI peso 20% nel KORA Index v3.`,
      source: 'budget_to_human_impact_service', confidence: 'medium',
    },
    {
      code: 'cost_per_iu', label: 'Costo per Impact Unit', value: `€${btiRecord.cost_per_impact_unit.toFixed(0)}`,
      interpretation: 'Costo medio per generare 1 Impact Unit verificata. Indicatore di efficienza — non un KPI target.',
      source: 'budget_to_human_impact_service', confidence: 'medium',
      limitation: 'Informativo — non comparabile con benchmark esterni senza contesto metodologico.',
    },
    {
      code: 'activation_debt', label: 'Activation Debt', value: `€${btiRecord.activation_debt_eur.toLocaleString('it-IT')}`,
      unit: '€',
      interpretation: btiRecord.activation_debt_description_it,
      source: 'budget_to_human_impact_service', confidence: 'medium',
    },
    {
      code: 'deep_activation_share', label: 'Deep Activation Share',
      value: +(btiRecord.deep_activation_share * 100).toFixed(0), unit: '%',
      interpretation: `${(btiRecord.deep_activation_share * 100).toFixed(0)}% del budget speso in attivazione profonda (non Economic Relief).`,
      source: 'budget_to_human_impact_service', confidence: 'high',
    },
  ];

  return {
    code:     'budget_to_human_impact',
    title:    'Budget-to-Human-Impact',
    subtitle: `Spesa totale: €${btiRecord.total_people_welfare_budget.toLocaleString('it-IT')}`,
    audience: ['cfo', 'executive', 'hr'],
    summary:  `Budget people-welfare €${btiRecord.total_people_welfare_budget.toLocaleString('it-IT')}. BTI Score: ${btiRecord.bti_score}/100. Activation Debt: €${btiRecord.activation_debt_eur.toLocaleString('it-IT')}. ${btiRecord.disclaimer}`,
    metrics,
    insights: [{
      id:              'bti-ins-1',
      title:           'Dottrina BTI — KORA misura ciò che accade dopo la spesa',
      body:            'Budget allocato ≠ Budget attivato. Budget speso ≠ Impatto umano. Il BTI engine traccia la conversione di spesa in attivazione verificata, distinguendo Economic Relief (voucher, fringe) da attivazione profonda (formazione, wellbeing, volontariato).',
      severity:        'medium',
      audience:        ['cfo', 'executive'],
      related_section: 'budget_to_human_impact',
      source:          'bti_doctrine',
    }],
    recommendations: btiRecToActionRecs(btiRecs.slice(0, 3), '30-60gg'),
    limitations:       [
      btiRecord.disclaimer,
      'BTI score basato su seed canonico — non ricalcolato dinamicamente da IU live.',
    ],
  };
}

function sectionEconomicRelief(
  btiRecord: BudgetToHumanImpactRecord | null,
): DecisionPackSection {
  const reliefShare = btiRecord ? (btiRecord.economic_relief_share * 100).toFixed(0) : '—';
  const reliefSpend = btiRecord ? `€${btiRecord.economic_relief_spend.toLocaleString('it-IT')}` : '—';
  return {
    code:     'economic_relief',
    title:    'Economic Relief — Spesa e Governance',
    subtitle: `Economic Relief Share: ${reliefShare}%`,
    audience: ['cfo', 'hr', 'advisor'],
    summary:  `Economic Relief (voucher pasto, fringe, benefit monetari): ${reliefSpend} — ${reliefShare}% della spesa totale. Tracciato nel BTI engine. Non genera Impact Units.`,
    metrics: btiRecord ? [
      {
        code: 'economic_relief_spend', label: 'Spesa Economic Relief', value: reliefSpend,
        interpretation: 'Voucher, fringe benefit, gift card. Tracciati come economic_relief_spend nel BTI engine.',
        source: 'budget_to_human_impact_service', confidence: 'high',
      },
      {
        code: 'economic_relief_share', label: 'Economic Relief Share',
        value: +reliefShare, unit: '%',
        interpretation: `${reliefShare}% del budget people-welfare classificato come Economic Relief — nessuna IU generata.`,
        source: 'budget_to_human_impact_service', confidence: 'high',
        limitation: 'Una quota elevata di Economic Relief riduce il potenziale di attivazione profonda misurabile.',
      },
    ] : [],
    insights: [{
      id:              'er-ins-1',
      title:           'Economic Relief non è attivazione',
      body:            'I benefit monetari (voucher pasto, fuel, shopping) sono classificati come Economic Relief — Limited dalla metodologia KORA. Hanno valore per il lavoratore ma non producono Impact Units. Vengono tracciati nel BTI engine per la governance del budget.',
      severity:        'medium',
      audience:        ['cfo', 'hr'],
      related_section: 'economic_relief',
      source:          'eligibility_gate_service',
    }],
    recommendations: [],
    limitations:       ['Economic Relief non influenza il KORA Index — non agire su questa voce per migliorare il punteggio.'],
  };
}

function sectionUEFReviewDataQuality(
  uefSummary: UEFReviewSummary,
  iuSummary: ImpactUnitComputationSummary,
): DecisionPackSection {
  return {
    code:     'uef_review_data_quality',
    title:    'UEF Review & Qualità Dati',
    subtitle: `${uefSummary.total_records} record · ${(uefSummary.review_completion_rate * 100).toFixed(0)}% revisione completata`,
    audience: ['hr', 'advisor', 'founder'],
    summary:  `${uefSummary.total_records} record processati. ${uefSummary.pending_count} in attesa di revisione umana. Completeness Quality medio: ${(iuSummary.average_cq * 100).toFixed(0)}%. Evidence Verification medio: ${(iuSummary.average_ev * 100).toFixed(0)}%.`,
    metrics:  [
      {
        code: 'review_completion_rate', label: 'Review Completion Rate',
        value: +(uefSummary.review_completion_rate * 100).toFixed(0), unit: '%',
        interpretation: `${(uefSummary.review_completion_rate * 100).toFixed(0)}% dei record ha ricevuto una decisione di revisione umana.`,
        source: 'uef_review_service', confidence: 'high',
      },
      {
        code: 'pending_count', label: 'Record in Attesa',
        value: uefSummary.pending_count,
        interpretation: uefSummary.pending_count > 0
          ? `${uefSummary.pending_count} record in attesa di revisione umana — contribuiscono 0 IU fino a revisione completata.`
          : 'Nessun record in attesa — revisione completa.',
        source: 'uef_review_service', confidence: 'high',
      },
      {
        code: 'average_cq', label: 'Completeness Quality Medio',
        value: +(iuSummary.average_cq * 100).toFixed(0), unit: '%',
        interpretation: 'Media del fattore CQ (qualità documentale) sui record processati.',
        source: 'iu_computation_service', confidence: 'medium',
      },
      {
        code: 'total_iu', label: 'Impact Units Totali',
        value: iuSummary.total_impact_units.toFixed(2),
        interpretation: `${iuSummary.computed_records}/${iuSummary.total_records} record hanno prodotto Impact Units. ${iuSummary.blocked_records} bloccati, ${iuSummary.limited_records} Economic Relief.`,
        source: 'iu_computation_service', confidence: 'high',
      },
    ],
    insights: uefSummary.pending_count > 0 ? [{
      id:              'uef-ins-pending',
      title:           'Record in attesa riducono l\'output IU',
      body:            `${uefSummary.pending_count} record sono ancora in stato "pending" — non contribuiscono al calcolo IU finché non viene emessa una decisione di revisione umana. La revisione completa aumenta l\'affidabilità dell\'output.`,
      severity:        uefSummary.pending_count / uefSummary.total_records > 0.20 ? 'high' : 'medium',
      audience:        ['hr', 'advisor'],
      related_section: 'uef_review_data_quality',
      source:          'uef_review_service',
    }] : [],
    recommendations: [],
    limitations:       [
      'UEF Review Foundation Light — revisore "ADVISOR" demo. Non equivalente a revisione advisor certificata.',
      'CQ e EV medi includono record bloccati (CQ=0, EV=0) — il valore aggregato sottostima la qualità dei soli record eleggibili.',
    ],
  };
}

function sectionPeopleContextHRKPI(
  s1Output: KoraIndexOutput,
  s2Output: KoraIndexOutput,
  iuSummary: ImpactUnitComputationSummary,
): DecisionPackSection {
  return {
    code:     'people_context_hr_kpi',
    title:    'People Context & HR KPI',
    subtitle: 'Solo dati aggregati aziendali — nessun dato individuale',
    audience: ['hr', 'executive'],
    summary:  `Contesto people aggregato dal batch IU demo. ${iuSummary.computed_records} record hanno generato IU su ${iuSummary.total_records} totali. KORA misura l\'attivazione — non il numero di persone, l\'assiduità, la performance individuale o la soddisfazione.`,
    metrics:  [
      {
        code: 'kora_index_s1', label: 'KORA Index S1 (Baseline)',
        value: s1Output.kora_index_value, unit: '/100',
        interpretation: 'Baseline scenario Q1–Q3 2025.',
        source: 'scoring_simulator_service', confidence: 'medium',
      },
      {
        code: 'kora_index_s2', label: 'KORA Index S2 (Post-Intervento)',
        value: s2Output.kora_index_value, unit: '/100',
        interpretation: 'Scenario post-intervento Q1–Q4 2025.',
        source: 'scoring_simulator_service', confidence: 'medium',
      },
      {
        code: 'computed_records', label: 'Record con IU',
        value: iuSummary.computed_records,
        interpretation: `Record che hanno prodotto Impact Units. ${iuSummary.review_required_records} richiedono revisione.`,
        source: 'iu_computation_service', confidence: 'high',
      },
    ],
    insights: [{
      id:              'hrkpi-ins-1',
      title:           'HR KPI KORA — correlazione ≠ causalità',
      body:            'I KPI KORA sono indicatori di attivazione aggregata, non misure di performance individuale, soddisfazione o wellbeing. Non usare per valutazioni del personale, ranking o incentivi. correlazione ≠ causalità.',
      severity:        'medium',
      audience:        ['hr', 'executive'],
      related_section: 'people_context_hr_kpi',
      source:          'methodology_governance',
    }],
    recommendations: [],
    limitations:       [
      'Nessun dato individuale lavoratore — output aggregato aziendale.',
      'Record batch IU demo: 15–20 record sintetici, non l\'intera workforce.',
      'HR KPI KORA non sostituisce survey di engagement, eNPS, o strumenti HR certificati.',
    ],
  };
}

function sectionWorkforceActivation(
  currentOutput: KoraIndexOutput,
  safeguard: ActivationSafeguardResult | null,
  s1Output: KoraIndexOutput,
  s2Output: KoraIndexOutput,
): DecisionPackSection {
  const s1Comps = s1Output.components;
  const s2Comps = s2Output.components;
  const ar1 = s1Comps.find((c) => c.code === 'AR')?.value ?? 0;
  const ar2 = s2Comps.find((c) => c.code === 'AR')?.value ?? 0;
  const mar1 = s1Comps.find((c) => c.code === 'MAR')?.value ?? 0;
  const mar2 = s2Comps.find((c) => c.code === 'MAR')?.value ?? 0;
  const ni1 = s1Comps.find((c) => c.code === 'NI')?.value ?? 0;
  const ni2 = s2Comps.find((c) => c.code === 'NI')?.value ?? 0;

  return {
    code:     'workforce_activation',
    title:    'Attivazione Workforce',
    subtitle: `Activation Safeguard: ${safeguard?.status ?? currentOutput.safeguard_status}`,
    audience: ['hr', 'executive'],
    summary:  `AR S1: ${(ar1 * 100).toFixed(0)}% → S2: ${(ar2 * 100).toFixed(0)}%. MAR S1: ${(mar1 * 100).toFixed(0)}% → S2: ${(mar2 * 100).toFixed(0)}%. Safeguard: ${safeguard?.status ?? currentOutput.safeguard_status}.`,
    metrics:  [
      {
        code: 'ar', label: 'Activation Rate (AR)',
        value: +(ar2 * 100).toFixed(0), unit: '%',
        scenario_value_previous: +(ar1 * 100).toFixed(0),
        delta: +((ar2 - ar1) * 100).toFixed(0),
        interpretation: `${(ar2 * 100).toFixed(0)}% dei lavoratori eleggibili ha almeno un\'IU approvata nel periodo.`,
        source: 'scoring_simulator_service', confidence: 'medium',
      },
      {
        code: 'mar', label: 'Meaningful Activation Rate (MAR)',
        value: +(mar2 * 100).toFixed(0), unit: '%',
        scenario_value_previous: +(mar1 * 100).toFixed(0),
        delta: +((mar2 - mar1) * 100).toFixed(0),
        interpretation: `${(mar2 * 100).toFixed(0)}% dei lavoratori con IU al di sopra della soglia di materialità.`,
        source: 'scoring_simulator_service', confidence: 'medium',
      },
      {
        code: 'ni', label: 'Normalized Intensity (NI)',
        value: +(ni2 * 100).toFixed(0), unit: '%',
        scenario_value_previous: +(ni1 * 100).toFixed(0),
        delta: +((ni2 - ni1) * 100).toFixed(0),
        interpretation: 'Intensità media per lavoratore attivo — profondità dell\'engagement.',
        source: 'scoring_simulator_service', confidence: 'medium',
      },
    ],
    insights: safeguard && safeguard.status !== 'CLEAR' ? [{
      id:              'wa-ins-safeguard',
      title:           `Activation Safeguard ${safeguard.status}`,
      body:            `AR = ${(safeguard.ar_value * 100).toFixed(0)}%, MAR = ${(safeguard.mar_value * 100).toFixed(0)}%. ${safeguard.status === 'WARNING' ? 'Partecipazione parziale — output disponibile ma con fiducia ridotta.' : 'Base di partecipazione troppo bassa per interpretazione affidabile.'}`,
      severity:        safeguard.status === 'FLAGGED' ? 'critical' : 'high',
      audience:        ['hr', 'executive'],
      related_section: 'workforce_activation',
      source:          'activation_safeguard_service',
    }] : [],
    recommendations: ar2 < 0.40 ? [{
      id:                 'wa-rec-1',
      title:              'Aumentare la base di partecipazione',
      rationale:          `AR ${(ar2 * 100).toFixed(0)}% sotto soglia CLEAR (40%). La maggior parte della workforce non ha attivazione verificata.`,
      recommended_action: 'Attivare programmi ad ampio reach: formazione base, wellbeing accessibile, iniziative di team. Priorità: pillar con bassa copertura.',
      priority:           'alta',
      owner_suggestion:   'HR',
      horizon:            '0-30gg',
      expected_direction: 'AR ≥ 40%, MAR ≥ 30% per raggiungere Activation Safeguard CLEAR.',
      caveat:             'Correlazione ≠ causalità. Proxy diagnostico — verificare con advisor prima di pianificare.',
    }] : [],
    limitations: [
      'AR e MAR da seed canonico — non da dati workforce reali.',
      'Safeguard utilizza soglie metodologiche v0.1 — pre-calibrazione empirica.',
    ],
  };
}

function sectionPillarAnalysis(
  iuSummary: ImpactUnitComputationSummary,
): DecisionPackSection {
  const pillarEntries = Object.entries(iuSummary.impact_units_by_pillar)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const totalIU = iuSummary.total_impact_units;

  const metrics: DecisionPackMetric[] = pillarEntries.map(([pillar, iu]) => ({
    code:           `iu_pillar_${pillar.toLowerCase()}`,
    label:          `IU Pillar ${pillar}`,
    value:          +iu.toFixed(2),
    unit:           'IU',
    interpretation: `${pillar}: ${totalIU > 0 ? ((iu / totalIU) * 100).toFixed(0) : 0}% del totale IU.`,
    source:         'iu_computation_service',
    confidence:     'medium',
  }));

  const dominant = pillarEntries[0];
  const dominantShare = dominant && totalIU > 0 ? (dominant[1] / totalIU) * 100 : 0;

  return {
    code:     'pillar_analysis',
    title:    'Analisi per Pillar',
    subtitle: `${pillarEntries.length}/5 pillar attivi`,
    audience: ['hr', 'executive', 'esg'],
    summary:  `${pillarEntries.length} pillar con Impact Units nel batch demo. ${dominant ? `Pillar dominante: ${dominant[0]} (${dominantShare.toFixed(0)}%).` : 'Nessun pillar attivo.'} Totale IU: ${totalIU.toFixed(2)}.`,
    metrics,
    insights: dominantShare > 60 ? [{
      id:              'pa-ins-concentration',
      title:           `Concentrazione in ${dominant?.[0] ?? 'un pillar'}`,
      body:            `${dominantShare.toFixed(0)}% delle IU concentrate in un solo pillar. Pillar Balance basso — segnale di programmi non diversificati.`,
      severity:        'medium',
      audience:        ['hr'],
      related_section: 'pillar_analysis',
      source:          'iu_computation_service',
    }] : [],
    recommendations: pillarEntries.length < 3 ? [{
      id:                 'pa-rec-diversify',
      title:              'Diversificare la copertura pillar',
      rationale:          `Solo ${pillarEntries.length} pillar coperti su 5. PC bassa riduce il macroblock Distribution & Equity.`,
      recommended_action: 'Attivare programmi nei pillar non coperti (CONNECTION, IMPACT, LEGACY). Anche 1 evento qualificante per pillar è sufficiente per alzare PC.',
      priority:           'media',
      owner_suggestion:   'HR',
      horizon:            '30-60gg',
      expected_direction: 'PC ≥ 3/5 pillar → impatto positivo su macroblock Distribution & Equity.',
      caveat:             'Basato su batch IU demo (15–20 record) — non rappresentativo della workforce completa.',
    }] : [],
    limitations: [
      'IU per pillar da batch IU demo — non dall\'intera workforce aziendale.',
      'Distribuzione proxy — non uguale alla distribuzione reale dei programmi welfare.',
    ],
  };
}

function sectionRecommendations(
  explanation: ExplainabilityRecord | null,
  btiRecs: BudgetToHumanImpactRecommendation[],
): DecisionPackSection {
  const recs: DecisionPackRecommendation[] = [
    ...(explanation ? explainActionsToRecs(explanation.next_best_actions) : []),
    ...btiRecToActionRecs(btiRecs, '30-60gg'),
  ];

  return {
    code:            'recommendations',
    title:           'Raccomandazioni Diagnostiche',
    subtitle:        `${recs.length} azioni prioritarie`,
    audience:        ['executive', 'hr', 'cfo', 'advisor'],
    summary:         `${recs.length} raccomandazioni derivate dall\'analisi KORA Index v3 e dal BTI engine. Tutte direzionali — non garantiscono risultati specifici. Verificare con advisor prima di pianificare investimenti.`,
    metrics:         [],
    insights:        [],
    recommendations: recs,
    limitations:     [
      'Raccomandazioni diagnostiche — non sono piani di azione certificati.',
      'Derivate da dati sintetici demo — non dalla situazione reale dell\'azienda.',
      'Correlazione ≠ causalità. Nessuna analisi causale inclusa.',
    ],
  };
}

function sectionNinetyDayActionPlan(
  btiRecs: BudgetToHumanImpactRecommendation[],
  explanation: ExplainabilityRecord | null,
): DecisionPackSection {
  const all: DecisionPackRecommendation[] = [
    ...btiRecToActionRecs(btiRecs.slice(0, 2), '0-30gg'),
    ...(explanation ? explainActionsToRecs(explanation.next_best_actions.slice(0, 2)) : []),
  ];
  const bucket = (h: string) => all.filter((r) => r.horizon === h);

  return {
    code:            'ninety_day_action_plan',
    title:           'Piano Azione 90 Giorni',
    subtitle:        '0–30gg · 30–60gg · 60–90gg',
    audience:        ['executive', 'hr'],
    summary:         `Piano diagnostico a 3 orizzonti: ${bucket('0-30gg').length} azioni immediate (0–30gg), ${bucket('30-60gg').length} azioni a medio termine (30–60gg), ${bucket('60-90gg').length} azioni strutturali (60–90gg). Tutte direzionali.`,
    metrics:         [],
    insights:        [],
    recommendations: all,
    limitations:     [
      'Piano diagnostico — non un piano operativo certificato.',
      'Orizzonti temporali indicativi — adattare alla realtà organizzativa.',
    ],
  };
}

function sectionMethodologyBoundaries(
  methodologyVersion: string,
  calibrationStatus: string,
  limitations: string[],
): DecisionPackSection {
  return {
    code:     'methodology_boundaries',
    title:    'Metodologia & Confini del Modello',
    subtitle: `${methodologyVersion} · ${calibrationStatus}`,
    audience: ['advisor', 'founder', 'executive'],
    summary:  `KORA Index v3 — methodology_version: ${methodologyVersion}. calibration_status: ${calibrationStatus}. Tutti gli output sono production_ready: false. Il KORA Index è un indicatore composito aziendale — non una valutazione individuale, non un rating ESG certificato, non un indice di performance.`,
    metrics:  [
      {
        code: 'methodology_version', label: 'Versione Metodologia',
        value: methodologyVersion,
        interpretation: 'Versione dei pesi, soglie e formula KORA Index v3.',
        source: 'methodology_config', confidence: 'high',
      },
      {
        code: 'calibration_status', label: 'Stato Calibrazione',
        value: calibrationStatus,
        interpretation: 'pre_empirical_calibration: pesi macroblock v0.1 provvisori. Calibrazione Delphi Study post-pilot.',
        source: 'methodology_config', confidence: 'high',
      },
    ],
    insights: [{
      id:              'mb-ins-1',
      title:           'Limiti del modello Foundation Light v0.1',
      body:            'Foundation Light v0.1 è un\'applicazione demo pre-pilota su dati sintetici. Non è adatta a: decisioni di assunzione/licenziamento, compliance normativa, rendicontazione ESG obbligatoria, decision-making finanziario. Il KORA Index è un indicatore composito aziendale — non valuta individui.',
      severity:        'high',
      audience:        ['advisor', 'founder', 'executive'],
      related_section: 'methodology_boundaries',
      source:          'methodology_governance',
    }],
    recommendations: [],
    limitations:     limitations,
    methodology_notes: `Formula IU: IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF. 14-stage algorithm. Tutti i fattori letti da methodology-config v0.1 — nessun valore hardcoded.`,
  };
}

// ── Interfaces ────────────────────────────────────────────────────────────────────

export interface IReportGeneratorService {
  generate(reportType: ReportType, companyId: string, scenarioId: ScenarioId, role: KoraRole): ReportData;
  generateCompanyDecisionPack(companyId: string, scenarioId: ScenarioId): CompanyDecisionPack;
  getCurrentCompanyDecisionPack(companyId: string, scenarioId: ScenarioId): CompanyDecisionPack;
  getDecisionPackReadiness(companyId: string, scenarioId: ScenarioId): DecisionPackStatus;
  getDecisionPackVersionHistory(companyId: string): DecisionPackVersion[];
  getDecisionPackLimitations(): string[];
  getDecisionPackExportActions(): DecisionPackExportAction[];
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class ReportGeneratorService implements IReportGeneratorService {
  // Kept for backward compatibility with existing callers.
  generate(reportType: ReportType, companyId: string, scenarioId: ScenarioId, role: KoraRole): ReportData {
    if (isEmployerRole(role) && reportType === 'advisor_evidence_summary') {
      return { report_type: reportType, company_id: companyId, scenario_id: scenarioId, sections: [], synthetic_demo_data: true };
    }
    return {
      report_type: reportType,
      company_id: companyId,
      scenario_id: scenarioId,
      sections: [{ title: 'Decision Pack', content: 'Vedi KORA Company Decision Pack — report unificato disponibile in /company/reports.' }],
      synthetic_demo_data: true,
    };
  }

  generateCompanyDecisionPack(companyId: string, scenarioId: ScenarioId): CompanyDecisionPack {
    const methodologyVersion = getMethodologyVersion();
    const calibrationStatus  = getCalibrationStatus() as CalibrationStatus;
    const companyName        = COMPANY_NAMES[companyId] ?? companyId;
    const scenario           = scenarioService.getScenario(scenarioId);

    // Scoring outputs
    const currentOutput = scoringSimulatorService.score(companyId, scenarioId, '2025');
    const s1Output      = scoringSimulatorService.score(companyId, 'S1', '2025');
    const s2Output      = scoringSimulatorService.score(companyId, 'S2', '2025');
    const macroblocks   = scoringSimulatorService.getMacroblockScores(companyId, scenarioId);
    const s1Macroblocks = scoringSimulatorService.getMacroblockScores(companyId, 'S1');
    const s2Macroblocks = scoringSimulatorService.getMacroblockScores(companyId, 'S2');

    const safeguard       = scoringSimulatorService.getActivationSafeguard(companyId, scenarioId);
    const confidenceRec   = scoringSimulatorService.getConfidenceRecord(companyId, scenarioId);
    const confidenceScore = currentOutput.confidence_score;

    // BTI
    const btiS1Access = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(companyId, 'S1', 'COMPANY_ADMIN');
    const btiS2Access = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(companyId, 'S2', 'COMPANY_ADMIN');
    const btiRecs     = budgetToHumanImpactService.getRecommendations(companyId, scenarioId, 'COMPANY_ADMIN');
    const btiRecord   = scenarioId === 'S2'
      ? (btiS2Access.allowed && btiS2Access.record ? btiS2Access.record : null)
      : (btiS1Access.allowed && btiS1Access.record ? btiS1Access.record : null);

    // Financial governance
    const rawPillarBudget = financialGovernanceService.getPillarBudget(companyId, scenarioId, 'COMPANY_ADMIN');
    const pillarBudget    = rawPillarBudget ? mapPillarBudget(rawPillarBudget) : [];

    // Pipeline / IU
    const pipelineRows    = ingestionPipelineService.analyzeBatch();
    const pipelineSummary = ingestionPipelineService.getIngestionSummary();
    const iuSummary       = iuComputationService.getIUComputationSummary(pipelineRows);
    const uefSummary      = uefReviewService.getReviewSummary();
    const dynamicPreview  = dynamicScoringPreviewService.getDynamicScoringPreview(companyId, scenarioId);

    // Explainability
    const svcExplanation = explainabilityService.getExplanation(companyId, scenarioId);
    const explanation    = svcExplanation ? mapExplainability(svcExplanation) : null;

    // Eligibility gate
    const eligibilityGate: EligibilityGateSummary = {
      blocked_count:      pipelineSummary.blocked_count,
      blocked_note:       'Compliance obbligatoria, sicurezza normativa. IU = 0 per design.',
      limited_count:      pipelineSummary.limited_count,
      limited_note:       'Economic Relief — tracciato nel BTI engine come economic_relief_spend.',
      eligible_row_count: pipelineSummary.eligible_count,
      total_row_count:    pipelineSummary.total,
    };

    // Readiness logic
    const pendingRatio  = uefSummary.total_records > 0 ? uefSummary.pending_count / uefSummary.total_records : 0;
    const status: DecisionPackStatus =
      pendingRatio > 0.20     ? 'data_review_required'    :
      confidenceScore < 0.55  ? 'advisor_review_required' :
      'ready';

    const dataReadiness: CompanyDecisionPack['data_readiness'] =
      confidenceScore >= 0.70 ? 'high' :
      confidenceScore >= 0.55 ? 'medium' : 'low';

    const advisorReviewStatus: CompanyDecisionPack['advisor_review_status'] =
      status === 'advisor_review_required' ? 'required' :
      confidenceScore >= 0.70              ? 'not_required' :
      'recommended';

    // Limitations
    const limitations = this.getDecisionPackLimitations();

    // Build 14 sections
    const sections: DecisionPackSection[] = [
      sectionCover(companyName, scenario.reporting_period, status, methodologyVersion, calibrationStatus),
      sectionExecutiveSummary(currentOutput, s1Output, s2Output, safeguard, confidenceScore, explanation),
      sectionKoraIndexV3(currentOutput, macroblocks, explanation, calibrationStatus),
      sectionDynamicScoringPreview(dynamicPreview),
      sectionEligibilityGate(eligibilityGate),
      sectionBTI(btiRecord, btiRecs),
      sectionEconomicRelief(btiRecord),
      sectionUEFReviewDataQuality(uefSummary, iuSummary),
      sectionPeopleContextHRKPI(s1Output, s2Output, iuSummary),
      sectionWorkforceActivation(currentOutput, safeguard, s1Output, s2Output),
      sectionPillarAnalysis(iuSummary),
      sectionRecommendations(explanation, btiRecs),
      sectionNinetyDayActionPlan(btiRecs, explanation),
      sectionMethodologyBoundaries(methodologyVersion, calibrationStatus, limitations),
    ];

    const allInsights    = sections.flatMap((s) => s.insights);
    const allRecs        = sections.flatMap((s) => s.recommendations);
    const topInsights    = allInsights.filter((i) => i.severity === 'critical' || i.severity === 'high').slice(0, 5);
    const topRecs        = allRecs.filter((r) => r.priority === 'alta').slice(0, 5);

    return {
      report_id:             `dp-${companyId}-${scenarioId}-${Date.now()}`,
      company_id:            companyId,
      company_name:          companyName,
      period:                scenario.reporting_period,
      generated_at:          new Date().toISOString(),
      status,
      methodology_version:   methodologyVersion,
      calibration_status:    calibrationStatus,
      scenario_id:           scenarioId,
      scenario_label:        scenario.label,
      production_ready:      false,
      synthetic_demo_data:   true,
      data_readiness:        dataReadiness,
      advisor_review_status: advisorReviewStatus,
      export_status:         'demo_only',

      kora_index_output: currentOutput,
      s1_kora_output:    s1Output,
      s2_kora_output:    s2Output,
      s1_macroblocks:    s1Macroblocks,
      s2_macroblocks:    s2Macroblocks,
      activation_safeguard: safeguard,
      confidence_record: confidenceRec,
      confidence_score:  confidenceScore,
      bti_record_s1:     btiS1Access.allowed && btiS1Access.record ? btiS1Access.record : null,
      bti_record_s2:     btiS2Access.allowed && btiS2Access.record ? btiS2Access.record : null,
      bti_recommendations: btiRecs,
      eligibility_gate:  eligibilityGate,
      explanation,
      pillar_budget:     pillarBudget,
      dynamic_preview:   dynamicPreview,
      uef_review_summary: uefSummary,
      iu_summary:        iuSummary,

      sections,
      top_insights:        topInsights,
      top_recommendations: topRecs,
      limitations,
      privacy_boundary:    'KORA Company Decision Pack — output aggregato aziendale. Nessun dato individuale lavoratore. Employer roles: accesso solo a dati aggregati sopra soglia privacy (gruppo ≥ 10 lavoratori).',
      export_actions:      this.getDecisionPackExportActions(),
      version_history:     this.getDecisionPackVersionHistory(companyId),
    };
  }

  getCurrentCompanyDecisionPack(companyId: string, scenarioId: ScenarioId): CompanyDecisionPack {
    return this.generateCompanyDecisionPack(companyId, scenarioId);
  }

  getDecisionPackReadiness(companyId: string, scenarioId: ScenarioId): DecisionPackStatus {
    const uefSummary      = uefReviewService.getReviewSummary();
    const currentOutput   = scoringSimulatorService.score(companyId, scenarioId, '2025');
    const confidenceScore = currentOutput.confidence_score;
    const pendingRatio    = uefSummary.total_records > 0 ? uefSummary.pending_count / uefSummary.total_records : 0;
    if (pendingRatio > 0.20)    return 'data_review_required';
    if (confidenceScore < 0.55) return 'advisor_review_required';
    return 'ready';
  }

  getDecisionPackVersionHistory(companyId: string): DecisionPackVersion[] {
    const methodologyVersion = getMethodologyVersion();
    const calibrationStatus  = getCalibrationStatus() as CalibrationStatus;
    const companyName        = COMPANY_NAMES[companyId] ?? companyId;
    return [
      {
        version_id:            'dp-v2-s2',
        company_id:            companyId,
        company_name:          companyName,
        period:                'Q1–Q4 2025',
        created_at:            '2026-01-15T09:00:00Z',
        status:                'ready',
        methodology_version:   methodologyVersion,
        calibration_status:    calibrationStatus,
        confidence_score:      0.72,
        advisor_review_status: 'reviewed',
        data_readiness:        'high',
        export_status:         'demo_only',
      },
      {
        version_id:            'dp-v1-s1',
        company_id:            companyId,
        company_name:          companyName,
        period:                'Q1–Q3 2025',
        created_at:            '2025-10-01T14:30:00Z',
        status:                'advisor_review_required',
        methodology_version:   methodologyVersion,
        calibration_status:    calibrationStatus,
        confidence_score:      0.60,
        advisor_review_status: 'reviewed',
        data_readiness:        'medium',
        export_status:         'demo_only',
      },
    ];
  }

  getDecisionPackLimitations(): string[] {
    return [
      'Output di un\'applicazione demo Foundation Light v0.1 — non adatto a decisioni operative, di compliance o fiscali.',
      'Dati sintetici — non rappresentano la situazione reale dell\'azienda.',
      `Metodologia ${getMethodologyVersion()} — pre-calibrazione empirica Delphi Study.`,
      'KORA Index v3: pesi macroblock v0.1 provvisori — calibrazione empirica post-pilot.',
      'Confidence Score < 0.65 per S1 — dati parzialmente verificati, output a fiducia ridotta.',
      'Nessun dato individuale lavoratore — output aggregato aziendale.',
      'AR/MAR da seed canonico — non da dati workforce reali.',
      'BTI score da seed canonico — non da pipeline IU live.',
      'Proxy dinamici (Dynamic Preview) basati su 15–20 record batch demo — non rappresentativi.',
      'KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.',
      'correlazione ≠ causalità. Nessuna analisi causale inclusa.',
    ];
  }

  getDecisionPackExportActions(): DecisionPackExportAction[] {
    return [
      { label: 'Esporta PDF', icon: 'file-text', demo_only: true, disabled: true, note: 'Disponibile in versione produzione.' },
      { label: 'Esporta Excel', icon: 'table', demo_only: true, disabled: true, note: 'Disponibile in versione produzione.' },
      { label: 'Condividi con Advisor', icon: 'share-2', demo_only: true, disabled: true, note: 'Richiede autenticazione advisor (Gate 3).' },
      { label: 'Board Pack Draft', icon: 'briefcase', demo_only: true, disabled: true, note: 'Disponibile dopo Delphi Study calibration.' },
    ];
  }
}

export const reportGeneratorService = new ReportGeneratorService();

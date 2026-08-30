import type {
  DynamicScoringPreviewOutput,
  DynamicAggregationInput,
  DynamicCompanyAggregationPreview,
  DynamicMacroblockPreview,
  DynamicScoringTrace,
  MacroblockScore,
  PillarCode,
  ScenarioId,
  CalibrationStatus,
} from '@/lib/types';
import { iuComputationService } from '@/services/iu-computation/IUComputationService';
import { uefReviewService } from '@/services/uef-review/UEFReviewService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import { getMethodologyVersion, getCalibrationStatus, getMacroblockWeights } from '@/lib/methodology-config/v0.1';
import { MACROBLOCK_CODES, MACROBLOCK_LABELS } from '@/lib/constants/kora';

// ── Proxy derivation helpers ────────────────────────────────────────────────────
// All proxies are labelled "stima proxy" — they approximate macroblock-level signals
// from IU batch data without a real workforce baseline.

function deriveAggregationPreview(input: DynamicAggregationInput): DynamicCompanyAggregationPreview {
  const { computed_records, total_records, impact_units_by_pillar } = input;

  const proxy_ar  = total_records > 0 ? computed_records / total_records : 0;
  // Conservative: assumed 60% of IU-eligible records map to "meaningful" activation
  const proxy_mar = +(proxy_ar * 0.60).toFixed(4);

  const proxy_quality_ratio = +(
    input.average_cq * 0.40 +
    input.average_ev * 0.40 +
    (total_records > 0 ? (total_records - input.review_required_records) / total_records : 0) * 0.20
  ).toFixed(4);

  // Pillar coverage and balance from live IU distribution
  const pillarEntries = Object.entries(impact_units_by_pillar) as [PillarCode, number][];
  const activePillars = pillarEntries.filter(([, iu]) => iu > 0);
  const active_pillars_count = activePillars.length;
  const proxy_pc = active_pillars_count / 5;

  let proxy_pb = 0;
  if (active_pillars_count > 0) {
    const total_iu = activePillars.reduce((s, [, v]) => s + v, 0);
    if (total_iu > 0) {
      const herfindahl = activePillars.reduce((s, [, v]) => s + (v / total_iu) ** 2, 0);
      // Normalize to [0,1]: 0 = all in one pillar, 1 = perfectly even across active pillars
      const min_herfindahl = 1 / active_pillars_count;
      proxy_pb = active_pillars_count > 1
        ? Math.max(0, (1 - herfindahl) / (1 - min_herfindahl))
        : 0;
    }
  }

  const dominant = activePillars.reduce<[PillarCode, number] | null>((max, cur) => {
    if (!max) return cur;
    return cur[1] > max[1] ? cur : max;
  }, null);
  const total_iu_all = activePillars.reduce((s, [, v]) => s + v, 0);
  const dominant_pillar        = dominant ? dominant[0] : null;
  const dominant_pillar_share  = dominant && total_iu_all > 0 ? +(dominant[1] / total_iu_all).toFixed(4) : 0;

  return {
    proxy_ar:             +proxy_ar.toFixed(4),
    proxy_mar,
    proxy_quality_ratio,
    proxy_pc:             +proxy_pc.toFixed(4),
    proxy_pb:             +proxy_pb.toFixed(4),
    // WB and EQ require worker-level distribution data — not available in Foundation Light
    proxy_wb:             0.35,
    proxy_eq:             0.40,
    active_pillars_count,
    dominant_pillar,
    dominant_pillar_share,
  };
}

function deriveMacroblockPreviews(
  agg: DynamicCompanyAggregationPreview,
  btiScore: number,
  canonicalMacroblocks: MacroblockScore[],
): DynamicMacroblockPreview[] {
  const weights = getMacroblockWeights();

  const canonicalScore = (code: string) =>
    canonicalMacroblocks.find((m) => m.code === code)?.score ?? 0;

  const reachScore   = Math.round((agg.proxy_ar + agg.proxy_mar) / 2 * 100);
  const qualityScore = Math.round(agg.proxy_quality_ratio * 100);
  const equityScore  = Math.round((agg.proxy_wb + agg.proxy_pc + agg.proxy_pb + agg.proxy_eq) / 4 * 100);
  const btiScoreRnd  = Math.round(btiScore);

  const previews: { code: string; score: number; basis: string }[] = [
    {
      code:  'REACH',
      score: reachScore,
      basis: `proxy_ar=${agg.proxy_ar.toFixed(2)} (record IU-eligible / totale); proxy_mar=${agg.proxy_mar.toFixed(2)} (×0.60 conservativo). Nessuna baseline workforce reale.`,
    },
    {
      code:  'QUALITY',
      score: qualityScore,
      basis: `CQ medio=${agg.proxy_quality_ratio.toFixed(2)} ponderato: avg_cq×0.40 + avg_ev×0.40 + review_completion×0.20. CO (continuità) non misurabile senza dati cross-periodo.`,
    },
    {
      code:  'EQUITY',
      score: equityScore,
      basis: `PC proxy=${agg.proxy_pc.toFixed(2)} (pillar attivi/5); PB proxy=${agg.proxy_pb.toFixed(2)} (entropia pillar); WB=0.35 e EQ=0.40 fissi (nessun dato distribuzione per lavoratore).`,
    },
    {
      code:  'BTI',
      score: btiScoreRnd,
      basis: `Score dal seed canonico BTI — calcolo dinamico BTI richiede dati spesa welfare non disponibili nel batch IU.`,
    },
  ];

  return MACROBLOCK_CODES.map((code) => {
    const p = previews.find((x) => x.code === code)!;
    const canonical = canonicalScore(code);
    return {
      code,
      label:                MACROBLOCK_LABELS[code] ?? code,
      weight:               weights[code] ?? 0,
      preview_score:        p.score,
      proxy_basis:          p.basis,
      canonical_seed_score: canonical,
      delta:                p.score - canonical,
      foundation_light_stub: true,
    };
  });
}

function buildTrace(
  input: DynamicAggregationInput,
  agg: DynamicCompanyAggregationPreview,
  macroblocks: DynamicMacroblockPreview[],
  previewScore: number,
): DynamicScoringTrace[] {
  return [
    {
      step:   'IU Batch Summary',
      input:  `total=${input.total_records}, computed=${input.computed_records}, blocked=${input.blocked_records}, limited=${input.limited_records}`,
      output: `total_IU=${input.total_impact_units.toFixed(4)}`,
      note:   'IU computation output da batch ingestion demo (Foundation Light).',
    },
    {
      step:   'REACH Proxy',
      input:  `computed_records=${input.computed_records}, total_records=${input.total_records}`,
      output: `proxy_ar=${agg.proxy_ar.toFixed(4)}, proxy_mar=${agg.proxy_mar.toFixed(4)}`,
      note:   'Record ratio, non worker ratio. Senza baseline workforce (250 lavoratori).',
    },
    {
      step:   'QUALITY Proxy',
      input:  `avg_cq=${input.average_cq.toFixed(3)}, avg_ev=${input.average_ev.toFixed(3)}`,
      output: `quality_ratio=${agg.proxy_quality_ratio.toFixed(4)}`,
      note:   'Qualità documentale (CQ, EV). CO escluso — nessun dato cross-periodo.',
    },
    {
      step:   'EQUITY Proxy',
      input:  `active_pillars=${agg.active_pillars_count}, dominant=${agg.dominant_pillar ?? 'n/a'} (${(agg.dominant_pillar_share * 100).toFixed(0)}%)`,
      output: `PC=${agg.proxy_pc.toFixed(4)}, PB=${agg.proxy_pb.toFixed(4)}, WB=0.35 (fisso), EQ=0.40 (fisso)`,
      note:   'WB e EQ usano valori fissi conservativi — distribuzione per lavoratore non disponibile.',
    },
    {
      step:   'BTI Proxy',
      input:  `scenario macroblock seed`,
      output: `bti_score=${macroblocks.find((m) => m.code === 'BTI')?.preview_score ?? 0}`,
      note:   'Seed canonico BTI — non derivato dinamicamente da IU batch.',
    },
    {
      step:   'Dynamic KORA Preview',
      input:  macroblocks.map((m) => `${m.code}=${m.preview_score}`).join(', '),
      output: `preview_score=${previewScore}`,
      note:   'Σ(macroblock_score × weight). Formula identica al KORA Index v1.0 ufficiale, inputs proxy.',
    },
  ];
}

const LIMITATIONS: string[] = [
  'Proxy AR/MAR basati su record IU (non lavoratori) — assenza workforce baseline (250 lavoratori Meridiana Group).',
  'QUALITY proxy basato su qualità documentale (CQ, EV) — Continuity (CO) richiederebbe dati cross-periodo non disponibili.',
  'EQUITY proxy: WB e EQ fissi a valori conservativi (0.35 / 0.40) — distribuzione per lavoratore/segmento non disponibile.',
  'BTI score dal seed canonico — calcolo dinamico BTI richiede dati spesa welfare non presenti nel batch IU.',
  'Batch IU demo copre 15–20 record — non l\'intera workforce aziendale. Proxy direzionali, non rappresentativi.',
  'Preview score non validato empiricamente — non è il KORA Index ufficiale e non deve essere usato per decision-making.',
  'Pre-calibrazione empirica: pesi macroblock provvisori (v0.1). Calibrazione Delphi Study non ancora eseguita.',
];

// ── Service ──────────────────────────────────────────────────────────────────────

export interface IDynamicScoringPreviewService {
  getDynamicScoringPreview(companyId: string, scenarioId: ScenarioId): DynamicScoringPreviewOutput;
  buildAggregationPreview(input: DynamicAggregationInput): DynamicCompanyAggregationPreview;
  computeMacroblockPreviews(agg: DynamicCompanyAggregationPreview, btiScore: number, canonicalMacroblocks: MacroblockScore[]): DynamicMacroblockPreview[];
  getLimitations(): string[];
}

export class DynamicScoringPreviewService implements IDynamicScoringPreviewService {
  private readonly methodologyVersion: string;
  private readonly calibrationStatus: CalibrationStatus;

  constructor() {
    this.methodologyVersion = getMethodologyVersion();
    this.calibrationStatus  = getCalibrationStatus() as CalibrationStatus;
  }

  buildAggregationPreview(input: DynamicAggregationInput): DynamicCompanyAggregationPreview {
    return deriveAggregationPreview(input);
  }

  computeMacroblockPreviews(
    agg: DynamicCompanyAggregationPreview,
    btiScore: number,
    canonicalMacroblocks: MacroblockScore[],
  ): DynamicMacroblockPreview[] {
    return deriveMacroblockPreviews(agg, btiScore, canonicalMacroblocks);
  }

  getLimitations(): string[] {
    return LIMITATIONS;
  }

  getDynamicScoringPreview(companyId: string, scenarioId: ScenarioId): DynamicScoringPreviewOutput {
    // Step 1 — live IU batch results (canonical pipeline lineage)
    const rows    = uefReviewService.getAllReviewedPipelineRows();
    const summary = iuComputationService.getIUComputationSummary(rows);
    const uefSummary = uefReviewService.getReviewSummary();

    const input: DynamicAggregationInput = {
      total_records:           summary.total_records,
      computed_records:        summary.computed_records,
      blocked_records:         summary.blocked_records,
      limited_records:         summary.limited_records,
      review_required_records: summary.review_required_records,
      total_impact_units:      summary.total_impact_units,
      impact_units_by_pillar:  summary.impact_units_by_pillar,
      average_cq:              summary.average_cq,
      average_ev:              summary.average_ev,
      average_agf:             summary.average_agf,
      review_completion_rate:  uefSummary.review_completion_rate,
    };

    // Step 2 — proxy aggregation
    const agg = deriveAggregationPreview(input);

    // Step 3 — BTI from canonical seed (no dynamic BTI computation from IU batch)
    const canonicalMacroblocks = scoringSimulatorService.getMacroblockScores(companyId, scenarioId);
    const btiScore = canonicalMacroblocks.find((m) => m.code === 'BTI')?.score ?? 0;

    // Step 4 — macroblock previews
    const macroblocks = deriveMacroblockPreviews(agg, btiScore, canonicalMacroblocks);

    // Step 5 — dynamic KORA preview score (same formula as canonical — proxy inputs only)
    const proxyMBScores: MacroblockScore[] = macroblocks.map((m) => ({
      code:            m.code,
      label:           m.label,
      weight:          m.weight,
      score:           m.preview_score,
      component_codes: [],
    }));
    const dynamic_preview_score = scoringSimulatorService.computeKoraIndexV3(proxyMBScores);

    // Step 6 — canonical seed KORA Index for delta
    const canonicalOutput   = scoringSimulatorService.score(companyId, scenarioId, '2025');
    const canonical_kora_index = canonicalOutput.kora_index_value;

    // Step 7 — safeguard preview from proxy AR/MAR
    const safeguard_preview = activationSafeguardService.evaluate(agg.proxy_ar, agg.proxy_mar);

    // Step 8 — confidence score proxy from average_ev and average_cq
    const confidence_score_proxy = +(
      summary.average_cq * 0.50 + summary.average_ev * 0.50
    ).toFixed(3);

    const trace = buildTrace(input, agg, macroblocks, dynamic_preview_score);

    return {
      calculation_mode:       'foundation_light_dynamic_preview',
      official_index_source:  'canonical_seed_output',
      production_ready:       false,
      company_id:             companyId,
      scenario_id:            scenarioId,
      canonical_kora_index,
      dynamic_preview_score,
      delta_vs_canonical:     dynamic_preview_score - canonical_kora_index,
      aggregation:            agg,
      macroblocks,
      safeguard_preview,
      confidence_score_proxy,
      trace,
      limitations:            LIMITATIONS,
      methodology_version:    this.methodologyVersion,
      calibration_status:     this.calibrationStatus,
    };
  }
}

export const dynamicScoringPreviewService = new DynamicScoringPreviewService();

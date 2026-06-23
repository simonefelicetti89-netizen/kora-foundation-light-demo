import type { MethodologyConfig, MacroblockConfig, MacroblockCode } from '@/lib/types';
import { MACROBLOCK_COMPONENTS, COMPONENT_EXTERNAL } from '@/lib/constants/kora';
import rawConfig from '@/data/methodology/methodology-config.json';

const config: MethodologyConfig = rawConfig as MethodologyConfig;

// ── Existing functions — unchanged, safe for all current consumers ─────────────

export function getMethodologyVersion(): string {
  return config.version;
}

export function getCalibrationStatus(): string {
  return config.calibration_status;
}

/**
 * @deprecated Removed — KORA Index v1.0 uses macroblock weights.
 * Use getMacroblockWeights() or getAllComponentEffectiveWeights().
 * @throws Always throws to prevent accidental usage of old equal-weight scaffold.
 */
export function getWeights(): never {
  throw new Error(
    'Deprecated: KORA Index v1.0 uses macroblock weights. Use getMacroblockWeights() / getAllComponentEffectiveWeights().',
  );
}

export function getThresholds(): MethodologyConfig['safeguard_thresholds'] {
  return config.safeguard_thresholds;
}

export function getMethodologyConfig(): MethodologyConfig {
  return config;
}

// ── KORA Index v1.0 functions ───────────────────────────────────────────────────

/** Returns the full kora_index_v3 configuration block from the methodology config. */
export function getKoraIndexV3Config(): MethodologyConfig['kora_index_v3'] {
  return config.kora_index_v3;
}

/**
 * Returns the INT normalization target (IU per active worker) — Sprint 1 B-QU1.
 * INT = min(1, totalIU / (activeWorkers × target)).
 * Falls back to 1.0 when not set in config.
 */
export function getIntTarget(): number {
  const target = (config.kora_index_v3 as Record<string, unknown>)?.int_target_iu_per_active_worker;
  return typeof target === 'number' && target > 0 ? target : 1.0;
}

/**
 * Returns the four macroblock weights for KORA Index v2.0.
 * REACH 0.25 · QUALITY 0.30 · EQUITY 0.25 · BTI 0.20
 * Falls back to canonical constants if config is not yet populated.
 */
export function getMacroblockWeights(): Record<MacroblockCode, number> {
  const mb = config.kora_index_v3?.macroblocks;
  return {
    REACH:   mb?.REACH?.weight   ?? 0.25,
    QUALITY: mb?.QUALITY?.weight ?? 0.30,
    EQUITY:  mb?.EQUITY?.weight  ?? 0.25,
    BTI:     mb?.BTI?.weight     ?? 0.20,
  };
}

/** Returns the MacroblockConfig for a specific macroblock code. */
export function getMacroblockConfig(code: MacroblockCode): MacroblockConfig | undefined {
  return config.kora_index_v3?.macroblocks[code];
}

/**
 * Returns true for components excluded from KORA Index v1.0 computation.
 * Currently only CS (Confidence Score) is external.
 */
export function isComponentExternal(code: string): boolean {
  return COMPONENT_EXTERNAL[code] ?? false;
}

/**
 * Returns the effective weight of a component in the total KORA Index v1.0 computation.
 *
 * CS → 0 (external — displayed but not computed)
 * BTI components → 0 (BTI score comes from BudgetToHumanImpactEngine, not component values)
 * Operational components → macroblock_weight × within_macroblock_weight
 *
 * Example: AR → REACH(0.25) × AR-within-REACH(0.50) = 0.125
 */
export function getComponentEffectiveWeight(code: string): number {
  if (isComponentExternal(code)) return 0;

  const mb = config.kora_index_v3?.macroblocks;
  if (!mb) return 0;

  for (const [mbCode, mbComponents] of Object.entries(MACROBLOCK_COMPONENTS)) {
    if (!mbComponents.includes(code)) continue;
    const mbConfig = mb[mbCode as MacroblockCode];
    if (!mbConfig) return 0;
    const withinWeight = mbConfig.components[code] ?? 0;
    return mbConfig.weight * withinWeight;
  }

  return 0;
}

// ── Sprint 2 — config getters for NM functions, MC, shrinkage, PIB ──────────────

export function getNMFunctionsConfig() {
  return config.nm_functions ?? {
    reference_date:               '2026-06-30',
    recency_lambda_single:        0.023,
    recency_lambda_recurring:     0.008,
    recency_floor:                0.60,
    saturation_decay:             0.20,
    saturation_floor_default:     0.60,
    saturation_floor_therapeutic: 0.80,
  };
}

export function getShrinkageConfig() {
  // k = forza shrinkage, provvisorio — aumentare con dati storici reali.
  // default_prior = prior cross-settore provvisorio, da calibrare (Delphi/AHP).
  return config.shrinkage ?? { k: 10, default_prior: 40.0 };
}

export function getPIBConfig() {
  return config.pib ?? {
    max_multiplier:            1.25,
    diversity_step_per_pillar: 0.05,
    prs_threshold_theta:       0.30,
    pillar_targets_default: {
      LIFE: 0.80, GROWTH: 1.00, CONNECTION: 0.60, IMPACT: 0.40, LEGACY: 0.40,
    },
  };
}

/**
 * Returns the effective weight for every component in KORA Index v1.0.
 * CS = 0. BTI macroblock components = per-component weight.
 * All nine operational components + BTI = 1.00 total.
 */
export function getAllComponentEffectiveWeights(): Record<string, number> {
  const mb = config.kora_index_v3?.macroblocks;
  if (!mb) return {};

  const result: Record<string, number> = {};

  for (const [mbCode, mbComponents] of Object.entries(MACROBLOCK_COMPONENTS)) {
    const mbConfig = mb[mbCode as MacroblockCode];
    if (!mbConfig || mbComponents.length === 0) continue;
    for (const code of mbComponents) {
      const withinWeight = mbConfig.components[code] ?? 0;
      result[code] = mbConfig.weight * withinWeight;
    }
  }

  // CS is external — explicit zero
  result['CS'] = 0;

  return result;
}

// ── Sprint 3 — score bands (ri-esportati da kora.ts) + macroblock status ─────
// SCORE_BANDS e getScoreBand vivono in lib/constants/kora.ts (leggono rawConfig direttamente).
// v0.1.ts li ri-esporta per uniformità dell'API config — nessun valore duplicato.

export { SCORE_BANDS, getScoreBand } from '@/lib/constants/kora';
export type { ScoreBand } from '@/lib/constants/kora';

export interface MacroblockStatusEntry {
  min: number; label: string; bg: string; color: string;
}

// statusForMacroblockScore — scala di stato per singolo macroblocco (0–100) nel Decision Pack PDF.
// Scala SEPARATA da score_bands (quelle sono per il KORA Index totale).
// Provvisorie, da calibrare post-Delphi.
export function getMacroblockStatusThresholds(): { buono: MacroblockStatusEntry; sviluppo: MacroblockStatusEntry; critico: MacroblockStatusEntry } {
  return config.macroblock_status_thresholds ?? {
    buono:    { min: 70, label: 'Buono',       bg: '#dcfce7', color: '#166534' },
    sviluppo: { min: 50, label: 'In sviluppo', bg: '#fffbeb', color: '#92400e' },
    critico:  { min:  0, label: 'Critico',     bg: '#fee2e2', color: '#991b1b' },
  };
}

export function getMacroblockStatusForScore(score: number): MacroblockStatusEntry {
  const t = getMacroblockStatusThresholds();
  if (score >= t.buono.min)    return t.buono;
  if (score >= t.sviluppo.min) return t.sviluppo;
  return t.critico;
}

// ── Within-macroblock component weight accessors ──────────────────────────────
// These read the sub-component weights from methodology-config.json.
// They are the single source of truth for QUALITY and EQUITY internal weights —
// engines must NEVER hardcode these values.

/** Returns within-QUALITY-macroblock component weights from config. */
export function getQualityComponentWeights(): { evq: number; int: number; cont: number } {
  const comp = getMacroblockConfig('QUALITY')?.components ?? {};
  return {
    evq:  comp['EVQ']  ?? 0.34,
    int:  comp['INT']  ?? 0.33,
    cont: comp['CONT'] ?? 0.33,
  };
}

/** Returns within-EQUITY-macroblock component weights from config. */
export function getEquityComponentWeights(): { eqw: number; eqs: number; pc: number; pb: number } {
  const comp = getMacroblockConfig('EQUITY')?.components ?? {};
  return {
    eqw: comp['EQW'] ?? 0.30,
    eqs: comp['EQS'] ?? 0.20,
    pc:  comp['PC']  ?? 0.25,
    pb:  comp['PB']  ?? 0.25,
  };
}

// ── KORA Contribution companion indicator config ──────────────────────────────
// KORA Contribution is NOT a KORA Index component (CLAUDE.md §12.7).
// These weights are read by KoraContributionService — never hardcoded there.

export interface ContributionWeights {
  family_breadth:   number;  // 30 — breadth of contribution families present
  initiatives_norm: number;  // 20 — initiatives count normalized to 10
  evidence_quality: number;  // 25 — share of verified evidence
  territorial:      number;  // 15 — territorial activation binary
  ecosystem:        number;  // 10 — multi-family ecosystem breadth binary
}

export interface ContributionLevels {
  advanced:  number;  // score >= advanced
  active:    number;  // score >= active
  emerging:  number;  // score >= emerging
  minimal:   number;  // else
}

export interface ContributionConfig {
  version:             string;
  calibration_status:  string;
  is_kora_index_component: false;
  score_label:         string;
  weights:             ContributionWeights;
  levels:              ContributionLevels;
}

/** Returns KORA Contribution methodology config. Weights must be read from here — never hardcoded. */
export function getContributionConfig(): ContributionConfig {
  const contrib = (config as unknown as Record<string, unknown>).kora_contribution as Record<string, unknown> | undefined;
  const weights = contrib?.weights as Partial<ContributionWeights> | undefined;
  const levels  = contrib?.levels  as Partial<ContributionLevels>  | undefined;
  return {
    version:                 typeof contrib?.version === 'string' ? contrib.version : 'v0.1',
    calibration_status:      typeof contrib?.calibration_status === 'string' ? contrib.calibration_status : 'pre_empirical_calibration',
    is_kora_index_component: false,
    score_label:             typeof contrib?.score_label === 'string' ? contrib.score_label : 'provisional_demo_only',
    weights: {
      family_breadth:   weights?.family_breadth   ?? 30,
      initiatives_norm: weights?.initiatives_norm ?? 20,
      evidence_quality: weights?.evidence_quality ?? 25,
      territorial:      weights?.territorial      ?? 15,
      ecosystem:        weights?.ecosystem        ?? 10,
    },
    levels: {
      advanced: levels?.advanced ?? 66,
      active:   levels?.active   ?? 36,
      emerging: levels?.emerging ?? 16,
      minimal:  levels?.minimal  ?? 0,
    },
  };
}

// ── KORA Contribution Version B (v0.2) config ─────────────────────────────────
// Active public model. Source of truth for V2 weights, maturity bands, thresholds.
// Version A (kora_contribution) is legacy/FL fallback only.

export interface ContributionV2Weights {
  activation_depth:       number;  // 30
  evidence_quality:       number;  // 25
  ecosystem_contribution: number;  // 20
  adoption_reach:         number;  // 15
  strategic_breadth:      number;  // 10
}

export interface ContributionV2MaturityBands {
  systemic: number;  // ≥ 75
  active:   number;  // ≥ 50
  emerging: number;  // ≥ 20
  nascent:  number;  // ≥ 0
}

export interface ContributionV2Thresholds {
  insufficient_signal_min_events:    number;
  insufficient_signal_max_confidence: number;
  activation_depth_iu_reference:     number;
  adoption_reach_event_reference:    number;
  evidence_shrinkage_k:              number;
  evidence_shrinkage_prior:          number;
}

export interface ContributionV2ConfidenceParams {
  n_events_weight:       number;
  evidence_quality_weight: number;
  ecosystem_signal_weight: number;
  n_events_reference:    number;
}

export interface ContributionV2Config {
  version:                  string;
  status:                   string;
  calibration_status:       string;
  is_kora_index_component:  false;
  public_presentation:      string;
  no_public_single_score:   true;
  weights:                  ContributionV2Weights;
  maturity_bands:           ContributionV2MaturityBands;
  thresholds:               ContributionV2Thresholds;
  confidence:               ContributionV2ConfidenceParams;
}

/** Returns KORA Contribution Version B (v0.2) config — active model. Weights must never be hardcoded. */
export function getContributionConfigV2(): ContributionV2Config {
  const raw  = (config as unknown as Record<string, unknown>).kora_contribution_v2 as Record<string, unknown> | undefined;
  const rawW = raw?.weights as Partial<ContributionV2Weights> | undefined;
  const rawB = raw?.maturity_bands as Partial<ContributionV2MaturityBands> | undefined;
  const rawT = raw?.thresholds as Partial<ContributionV2Thresholds> | undefined;
  const rawC = raw?.confidence as Partial<ContributionV2ConfidenceParams> | undefined;

  return {
    version:                 typeof raw?.version === 'string'  ? raw.version : 'v0.2',
    status:                  typeof raw?.status  === 'string'  ? raw.status  : 'active',
    calibration_status:      typeof raw?.calibration_status === 'string' ? raw.calibration_status : 'pre_empirical_calibration',
    is_kora_index_component: false,
    public_presentation:     typeof raw?.public_presentation === 'string' ? raw.public_presentation : 'maturity_band_with_confidence',
    no_public_single_score:  true,
    weights: {
      activation_depth:       rawW?.activation_depth       ?? 30,
      evidence_quality:       rawW?.evidence_quality       ?? 25,
      ecosystem_contribution: rawW?.ecosystem_contribution ?? 20,
      adoption_reach:         rawW?.adoption_reach         ?? 15,
      strategic_breadth:      rawW?.strategic_breadth      ?? 10,
    },
    maturity_bands: {
      systemic: rawB?.systemic ?? 75,
      active:   rawB?.active   ?? 50,
      emerging: rawB?.emerging ?? 20,
      nascent:  rawB?.nascent  ?? 0,
    },
    thresholds: {
      insufficient_signal_min_events:     rawT?.insufficient_signal_min_events     ?? 2,
      insufficient_signal_max_confidence: rawT?.insufficient_signal_max_confidence ?? 0.20,
      activation_depth_iu_reference:      rawT?.activation_depth_iu_reference      ?? 10.0,
      adoption_reach_event_reference:     rawT?.adoption_reach_event_reference     ?? 5,
      evidence_shrinkage_k:               rawT?.evidence_shrinkage_k               ?? 5,
      evidence_shrinkage_prior:           rawT?.evidence_shrinkage_prior           ?? 0.50,
    },
    confidence: {
      n_events_weight:         rawC?.n_events_weight         ?? 0.50,
      evidence_quality_weight: rawC?.evidence_quality_weight ?? 0.30,
      ecosystem_signal_weight: rawC?.ecosystem_signal_weight ?? 0.20,
      n_events_reference:      rawC?.n_events_reference      ?? 5,
    },
  };
}

// ── Monte Carlo config accessor ───────────────────────────────────────────────

export interface MCConfig {
  seed: number;
  n_iter: number;
  macroblock_perturbation_pts: number;
  shrinkage_k: number;
  shrinkage_prior: number;
}

/** Returns Monte Carlo parameters from methodology-config.json. Falls back to safe defaults. */
export function getMCConfig(): MCConfig {
  const mc = config.monte_carlo;
  return {
    seed:                       mc?.seed                       ?? 42,
    n_iter:                     mc?.n_iter                     ?? 1000,
    macroblock_perturbation_pts: mc?.macroblock_perturbation_pts ?? 5,
    shrinkage_k:                mc?.shrinkage_k                ?? 10,
    shrinkage_prior:            mc?.shrinkage_prior             ?? 40.0,
  };
}

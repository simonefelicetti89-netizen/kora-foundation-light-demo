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

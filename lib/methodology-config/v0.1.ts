import type { MethodologyConfig } from '@/lib/types';
import rawConfig from '@/data/methodology/methodology-config.json';

// Single source of methodology truth — reads from config file, never hardcodes values
const config: MethodologyConfig = rawConfig as MethodologyConfig;

export function getMethodologyVersion(): string {
  return config.version;
}

export function getCalibrationStatus(): string {
  return config.calibration_status;
}

export function getWeights(): Record<string, number> {
  return config.weights;
}

export function getThresholds(): MethodologyConfig['safeguard_thresholds'] {
  return config.safeguard_thresholds;
}

export function getMethodologyConfig(): MethodologyConfig {
  return config;
}

// Deterministic verdict resolution. No LLM, no randomness, no date dependence.

import { getScoreBand } from '@/lib/constants/kora';
import type { KoraIndexComponent, MacroblockScore, SafeguardStatus } from '@/lib/types';
import {
  STATE_CLAUSE, CONSTRAINT_CLAUSE, VERDICT_LIBRARY_VERSION,
  type BandKey, type SafeguardKey, type ConstraintType,
} from './fragments';

/** Which family a component belongs to, for constraint attribution. */
const COMPONENT_CONSTRAINT: Record<string, ConstraintType> = {
  AR: 'reach', MAR: 'reach',
  EVQ: 'evidence',
  INT: 'depth',
  CONT: 'continuity',
  EQW: 'equity', EQS: 'equity', PC: 'equity', PB: 'equity',
};

export interface VerdictInputs {
  koraIndexValue: number;
  safeguardStatus: SafeguardStatus;
  components: KoraIndexComponent[];
  macroblocks?: MacroblockScore[];
}

export interface Verdict {
  text: string;
  band: BandKey;
  safeguard: SafeguardKey;
  constraint: ConstraintType;
  libraryVersion: string;
}

/**
 * The binding constraint: the weakest SCORED component's family, or `budget`
 * when the BTI macroblock is weaker than every component. `none` only when
 * nothing is below its own scale midpoint — never as a fallback for missing
 * data, which returns the weakest available signal instead.
 */
export function deriveConstraintType(
  components: KoraIndexComponent[],
  macroblocks?: MacroblockScore[],
): ConstraintType {
  const scored = components
    .filter((c) => !c.external && c.code !== 'CS' && typeof c.value === 'number')
    .map((c) => ({ family: COMPONENT_CONSTRAINT[c.code as string], value: c.value }))
    .filter((c): c is { family: ConstraintType; value: number } => Boolean(c.family));

  const bti = macroblocks?.find((m) => m.code === 'BTI');
  const btiRatio = typeof bti?.score === 'number' ? bti.score / 100 : null;

  const candidates: Array<{ family: ConstraintType; value: number }> = [...scored];
  if (btiRatio !== null) candidates.push({ family: 'budget', value: btiRatio });
  if (candidates.length === 0) return 'none';

  candidates.sort((a, b) => a.value - b.value);
  const weakest = candidates[0]!;
  return weakest.value >= 0.5 ? 'none' : weakest.family;
}

export function resolveVerdict(inputs: VerdictInputs): Verdict {
  const band = getScoreBand(inputs.koraIndexValue).key as BandKey;
  const safeguard = inputs.safeguardStatus as SafeguardKey;
  const constraint = deriveConstraintType(inputs.components, inputs.macroblocks);

  const state = STATE_CLAUSE[safeguard]?.[band] ?? STATE_CLAUSE.WARNING[band];
  const rest  = CONSTRAINT_CLAUSE[constraint];

  return {
    text: `${state} ${rest}`,
    band, safeguard, constraint,
    libraryVersion: VERDICT_LIBRARY_VERSION,
  };
}

/**
 * The precision sub-line: generated from ACTUAL FIGURES, never authored.
 * Every numeral traces to a field. Nothing is asserted that the inputs do not
 * support — a missing figure drops its clause rather than being invented.
 */
export function buildPrecisionLine(inputs: VerdictInputs & {
  activationRate?: number | null;
  meaningfulActivationRate?: number | null;
}): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const get = (code: string) => {
    const c = inputs.components.find((x) => x.code === code);
    return typeof c?.value === 'number' ? c.value : null;
  };
  const parts: string[] = [];

  if (typeof inputs.activationRate === 'number') {
    parts.push(`Copertura della forza lavoro al ${pct(inputs.activationRate)}`);
  }
  const evq = get('EVQ');
  if (evq !== null) {
    parts.push(`${pct(1 - evq)} delle Impact Units non è sostenuto da evidenza verificata`);
  }
  const bti = inputs.macroblocks?.find((m) => m.code === 'BTI');
  if (parts.length < 2 && typeof bti?.score === 'number') {
    parts.push(`Budget-to-Human-Impact a ${Math.round(bti.score)}/100`);
  }
  if (parts.length === 0) return '';
  return parts.length === 1 ? `${parts[0]}.` : `${parts[0]}, ma ${parts.slice(1).join('; ')}.`;
}

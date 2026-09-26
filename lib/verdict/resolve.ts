// Deterministic verdict resolution. No LLM, no randomness, no date dependence.

import { getScoreBand } from '@/lib/constants/kora';
import type { KoraIndexComponent, MacroblockScore, SafeguardStatus } from '@/lib/types';
import {
  STATE_CLAUSE, CONSTRAINT_CLAUSE, VERDICT_LIBRARY_VERSION,
  type BandKey, type SafeguardKey, type ConstraintType,
} from './fragments';
import { deriveBindingConstraint, type BindingConstraint } from './binding-constraint';

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
  /** The single decision every surface on the page consumes. */
  binding: BindingConstraint;
  libraryVersion: string;
}

/**
 * The binding constraint: the weakest SCORED component's family, or `budget`
 * when the BTI macroblock is weaker than every component. `none` only when
 * nothing is below its own scale midpoint — never as a fallback for missing
 * data, which returns the weakest available signal instead.
 */
/**
 * Kept as the constraint-TYPE accessor. It no longer decides anything: the
 * decision lives in `deriveBindingConstraint`, so the verdict cannot disagree
 * with the drivers, the precision line or the action rationale.
 */
export function deriveConstraintType(
  components: KoraIndexComponent[],
  macroblocks?: MacroblockScore[],
): ConstraintType {
  return deriveBindingConstraint(components, macroblocks).type;
}

export function resolveVerdict(inputs: VerdictInputs): Verdict {
  const band = getScoreBand(inputs.koraIndexValue).key as BandKey;
  const safeguard = inputs.safeguardStatus as SafeguardKey;
  const binding = deriveBindingConstraint(inputs.components, inputs.macroblocks);
  const constraint = binding.type;

  const state = STATE_CLAUSE[safeguard]?.[band] ?? STATE_CLAUSE.WARNING[band];
  const rest  = CONSTRAINT_CLAUSE[constraint];

  return {
    text: `${state} ${rest}`,
    band, safeguard, constraint, binding,
    libraryVersion: VERDICT_LIBRARY_VERSION,
  };
}

/**
 * The precision sub-line — generated from ACTUAL FIGURES, never authored.
 *
 * It states the SAME constraint the verdict names, with its real number. It
 * used to be hardcoded to activation rate + EVQ, so a page whose binding
 * constraint was depth or continuity still said "evidence" underneath the
 * verdict. Every numeral traces to a field; a missing figure drops its clause
 * instead of being invented.
 */
export function buildPrecisionLine(inputs: VerdictInputs & {
  activationRate?: number | null;
  meaningfulActivationRate?: number | null;
}): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const binding = deriveBindingConstraint(inputs.components, inputs.macroblocks);
  const value   = binding.value;

  // What the binding constraint actually says, in its own figure.
  const CLAUSE: Record<string, (v: number) => string> = {
    reach:      (v) => `solo ${pct(v)} della forza lavoro ha ricevuto attivazione verificata`,
    evidence:   (v) => `${pct(1 - v)} delle Impact Units non è sostenuto da evidenza verificata`,
    depth:      (v) => `le Impact Units per lavoratore attivo sono al ${pct(v)} del target`,
    continuity: (v) => `la continuità fra periodi è al ${pct(v)} del target`,
    equity:     (v) => `la distribuzione fra lavoratori e segmenti è al ${pct(v)} del target`,
    budget:     (v) => `Budget-to-Human-Impact a ${Math.round(v * 100)}/100`,
  };

  // One piece of context the reader needs to place that number.
  const context = typeof inputs.activationRate === 'number'
    ? `Copertura della forza lavoro al ${pct(inputs.activationRate)}`
    : null;

  if (binding.type === 'none' || value === null) {
    return context ? `${context}. Nessun vincolo sotto la soglia di attenzione.` : '';
  }
  const clause = CLAUSE[binding.type]?.(value);
  if (!clause) return context ? `${context}.` : '';
  return context && binding.type !== 'reach' ? `${context}, ma ${clause}.` : `${clause[0]!.toUpperCase()}${clause.slice(1)}.`;
}

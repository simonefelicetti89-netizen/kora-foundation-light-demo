// THE canonical binding-constraint decision.
//
// THE DEFECT THIS EXISTS FOR: the KORA Index surface derived "what is holding
// the score back" in FOUR places, on THREE different bases, and told the reader
// a different story in each:
//
//   verdict constraint   weakest COMPONENT family        -> "manca la profondità"
//   ScoreDrivers rank 1  weakest COMPONENT by value      -> "Intensità bassa"
//   precision sub-line   HARDCODED to AR + EVQ           -> "75% senza evidenza"
//   BoardActions rank 1  weakest MACROBLOCK by score     -> "Distribution & Equity"
//
// Each was defensible alone; together they were four answers to one question.
// The binding constraint is decided ONCE, here, and every surface consumes it.
//
// BoardActions keeps its own macroblock-weighted ranking on purpose: the biggest
// constraint and the highest-leverage action are genuinely different questions.
// When they diverge the UI must SAY SO — `divergesFrom` exists so the surface
// can make that explicit instead of silently changing the story.

import type { KoraIndexComponent, MacroblockScore } from '@/lib/types';
import type { ConstraintType } from './fragments';

/** Component -> constraint family. The only place this mapping lives. */
export const COMPONENT_CONSTRAINT: Record<string, ConstraintType> = {
  AR: 'reach', MAR: 'reach',
  EVQ: 'evidence',
  INT: 'depth',
  CONT: 'continuity',
  EQW: 'equity', EQS: 'equity', PC: 'equity', PB: 'equity',
};

/** Component -> the macroblock it feeds, for divergence comparison. */
const COMPONENT_MACROBLOCK: Record<string, string> = {
  AR: 'REACH', MAR: 'REACH',
  EVQ: 'QUALITY', INT: 'QUALITY', CONT: 'QUALITY',
  EQW: 'EQUITY', EQS: 'EQUITY', PC: 'EQUITY', PB: 'EQUITY',
};

export interface BindingConstraint {
  readonly type: ConstraintType;
  /** The component code that carries it, or 'BTI'. `null` when type is 'none'. */
  readonly code: string | null;
  /** Its value on its own 0–1 scale. `null` when type is 'none'. */
  readonly value: number | null;
  /** The macroblock it belongs to, for divergence checks. */
  readonly macroblock: string | null;
}

/**
 * Below this, a signal is treated as actually constraining. Above it for every
 * signal, nothing is claimed — `none` is a real answer, not a fallback.
 */
const CONSTRAINING_BELOW = 0.5;

export function deriveBindingConstraint(
  components: KoraIndexComponent[],
  macroblocks?: MacroblockScore[],
): BindingConstraint {
  const scored = components
    .filter((c) => !c.external && c.code !== 'CS' && typeof c.value === 'number')
    .map((c) => ({
      code:   c.code as string,
      type:   COMPONENT_CONSTRAINT[c.code as string],
      macro:  COMPONENT_MACROBLOCK[c.code as string] ?? null,
      value:  c.value,
    }))
    .filter((c) => Boolean(c.type));

  const bti = macroblocks?.find((m) => m.code === 'BTI');
  const candidates = [...scored];
  if (typeof bti?.score === 'number') {
    candidates.push({ code: 'BTI', type: 'budget', macro: 'BTI', value: bti.score / 100 });
  }
  if (candidates.length === 0) return { type: 'none', code: null, value: null, macroblock: null };

  candidates.sort((a, b) => a.value - b.value);
  const weakest = candidates[0]!;
  if (weakest.value >= CONSTRAINING_BELOW) {
    return { type: 'none', code: null, value: null, macroblock: null };
  }
  return { type: weakest.type!, code: weakest.code, value: weakest.value, macroblock: weakest.macro };
}

/**
 * Whether the highest-leverage ACTION targets a different macroblock than the
 * binding constraint. When true the surface must say so out loud.
 */
export function actionDivergesFromConstraint(
  binding: BindingConstraint,
  actionMacroblockLabel: string | null,
  macroblocks?: MacroblockScore[],
): boolean {
  if (!binding.macroblock || !actionMacroblockLabel) return false;
  const target = macroblocks?.find((m) => m.label === actionMacroblockLabel || m.code === actionMacroblockLabel);
  if (!target) return false;
  return target.code !== binding.macroblock;
}

// KORA Index verdict library — EDITORIAL DATA, not logic.
//
// Every sentence a reader sees at display scale is authored here and versioned.
// There is no runtime generation, no template interpolation into the verdict
// itself, no randomness and no date-dependence: the same inputs always produce
// the same words, and every word was written by a person.
//
// STRUCTURE — two independently keyed fragments, NOT a 90-cell matrix:
//   state_clause      keyed by band x safeguard
//   constraint_clause keyed by constraint type
// composed into one sentence. ~21 authored fragments instead of 90.
//
// CHARACTER BUDGET: the verdict renders at 60px in a 630px measure, so a
// composed verdict must stay at or under 45 characters to hold two lines. That
// budget is asserted by test, not by convention.

export const VERDICT_LIBRARY_VERSION = 'v1.0';

/** Maximum composed length. Derived by measurement, not preference. */
export const VERDICT_CHAR_BUDGET = 45;

export const BAND_KEYS = ['weak', 'early', 'developing', 'solid', 'leading'] as const;
export type BandKey = (typeof BAND_KEYS)[number];

export const SAFEGUARD_KEYS = ['CLEAR', 'WARNING', 'FLAGGED'] as const;
export type SafeguardKey = (typeof SAFEGUARD_KEYS)[number];

/**
 * What is holding the score back. Derived from the weakest scored component's
 * family — never asserted without one.
 */
export const CONSTRAINT_TYPES = ['reach', 'evidence', 'depth', 'continuity', 'equity', 'budget', 'none'] as const;
export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

/**
 * The state clause: what kind of period this is.
 * A FLAGGED safeguard overrides the band — when the floor is breached, the
 * breach IS the sentence, so those three read alike by design.
 */
export const STATE_CLAUSE: Record<SafeguardKey, Record<BandKey, string>> = {
  CLEAR: {
    weak:       'Poco si è attivato.',
    early:      'L’attivazione c’è.',
    developing: 'Sta prendendo forma.',
    solid:      'Il sistema regge.',
    leading:    'Il sistema funziona.',
  },
  WARNING: {
    weak:       'Attivazione minima.',
    early:      'Attivazione fragile.',
    developing: 'Base disomogenea.',
    solid:      'Base instabile.',
    leading:    'Alto ma instabile.',
  },
  FLAGGED: {
    weak:       'Sotto soglia minima.',
    early:      'Sotto soglia minima.',
    developing: 'Sotto soglia minima.',
    // Arithmetically implausible: AR and MAR feed both the band and the
    // safeguard. Authored anyway so an unexpected reachability is a visible
    // sentence rather than a blank, and asserted unreachable by test.
    solid:      'Sotto soglia minima.',
    leading:    'Sotto soglia minima.',
  },
};

/** The constraint clause: what is holding it back. */
export const CONSTRAINT_CLAUSE: Record<ConstraintType, string> = {
  reach:      'Manca la copertura.',
  evidence:   'Le evidenze non ancora.',
  depth:      'Manca la profondità.',
  continuity: 'Non ancora a regime.',
  equity:     'Non per tutti.',
  budget:     'Il budget rende poco.',
  none:       'Ora va tenuto.',
};

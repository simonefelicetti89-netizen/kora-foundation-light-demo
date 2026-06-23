// lib/kora-contribution/contribution-methodology.ts
// KORA Contribution — canonical doctrine constants and runtime invariants.
//
// This file is the single code-level authority for KORA Contribution doctrine.
// It is imported by tests and services to assert doctrine constraints at runtime.

// ── DOCTRINE CONSTANTS ────────────────────────────────────────────────────────

/** KORA Contribution is a companion indicator — NEVER a KORA Index component. */
export const CONTRIBUTION_IS_KORA_INDEX_COMPONENT = false as const;

/** No ranking of companies, workers, or initiatives by contribution score. */
export const CONTRIBUTION_NO_RANKING = true as const;

/** No individual contribution score visible to employers. */
export const CONTRIBUTION_NO_INDIVIDUAL_SCORE = true as const;

/** No rewards or incentives tied to contribution score. */
export const CONTRIBUTION_NO_REWARDS = true as const;

/** No leaderboard of any kind. */
export const CONTRIBUTION_NO_LEADERBOARD = true as const;

/**
 * Score 0–100 is produced only in the Foundation Light demo path (synthetic data).
 * The Pilot+ live path does NOT expose a single aggregate score — it uses
 * ContributionPromoterView and ContributionOriginEmployerView (no score field).
 */
export const CONTRIBUTION_SCORE_PRESENTATION_MODE = 'provisional_demo_only' as const;
export type ContributionScorePresentationMode = typeof CONTRIBUTION_SCORE_PRESENTATION_MODE;

/** Methodology calibration status — pre-empirical until Delphi Study. */
export const CONTRIBUTION_CALIBRATION_STATUS = 'pre_empirical_calibration' as const;

// ── RELATIONSHIP WITH KORA INDEX ──────────────────────────────────────────────

/**
 * KORA Contribution does NOT alter the KORA Index formula.
 * It does NOT enter any macroblock computation.
 * It is displayed SEPARATELY from the KORA Index.
 * Merging KORA Contribution into the KORA Index is prohibited (CLAUDE.md §12.7, §17.7).
 */
export const CONTRIBUTION_ALTERS_KORA_INDEX = false as const;

// ── PRIVACY BOUNDARY ─────────────────────────────────────────────────────────

/**
 * All contribution signals are aggregate-only.
 * No individual worker identification is exposed to company roles.
 * No "Mario contributed more than Luca" comparison.
 * Only counts, weights, and pillar distributions at company level.
 */
export const CONTRIBUTION_IS_AGGREGATE_ONLY = true as const;

// ── FOUNDATION LIGHT vs PILOT+ ────────────────────────────────────────────────

/**
 * Foundation Light (demo) path:
 *   - uses synthetic seed data (kora-contribution-outputs.json)
 *   - shows a provisional 0–100 score labeled 'provisional_demo_only'
 *   - score is for demonstration purposes only
 *   - not suitable for certified ESG claims or comparative benchmarking
 *
 * Pilot+ live path:
 *   - gated on analytics.tenant.production_ready = true
 *   - uses live commons.contribution_event records
 *   - NO single aggregate score (doctrine: contribution-views.ts)
 *   - shows ContributionPromoterView + ContributionOriginEmployerView side-by-side
 *   - narrative text from buildPromoterNarrative() / buildOriginEmployerNarrative()
 */
export const CONTRIBUTION_FL_PATH = 'seed_derived' as const;
export const CONTRIBUTION_PILOT_PATH = 'live_db' as const;

// ── SIGNAL SOURCES ────────────────────────────────────────────────────────────

/**
 * KORA Contribution is fed by:
 * - Initiatives created / promoted / supported (commons.post / collective-initiatives.json)
 * - Cross-company bookings (commons.booking → attended → commons.contribution_event)
 * - External participant events (attributeContributionForExternalParticipants)
 * - Partner/territory activation signals
 * - Aggregated feedback and recurring requests (future signal — not yet in Foundation Light)
 *
 * KORA Space (commons.post) is the primary operational source for cross-company signals.
 * KORA Space events are contribution-eligible ONLY as aggregate signals — never individual.
 */

// ── ELIGIBILITY REQUIREMENTS ─────────────────────────────────────────────────

/**
 * An event is contribution-eligible if it has:
 *   - action_family in CONTRIBUTION_ACTION_FAMILIES (territorial_impact, inclusion_and_connection, future_and_legacy), OR
 *   - event_nature in CONTRIBUTION_EVENT_NATURES (collective_initiative, territorial_initiative, partner_service)
 *
 * Bare pillar match alone (IMPACT/CONNECTION/LEGACY) is NOT sufficient.
 * A training event with pillar=IMPACT that is not collective would incorrectly pass if pillar alone were used.
 *
 * This is enforced by isContributionEligibleEvent() in lib/kora-engine/contribution-family-detector.ts.
 */

// ── GATE 3 DEPENDENCY ────────────────────────────────────────────────────────

/**
 * Production contribution signals (live DB path) require Gate 3 closure:
 * - real worker identity records
 * - real cross-company bookings
 * - live commons.contribution_event writes
 * Gate 3 is currently OPEN — all Foundation Light tenants have production_ready = false.
 */
export const CONTRIBUTION_GATE_3_REQUIRED = true as const;

// KORA-WP-142 encoding primitives — the governed REUSABLE CAPABILITY set.
//
// A CORRECTION. These were first ported as a subset, on the grounds that the
// approved KORA Index design renders Confidence as a plain number and carries
// no trend region. That confused a VISUAL decision with a CAPABILITY contract:
// WP142 acceptance (A) requires the primitive set to EXIST, and (C) requires
// the trend primitive to render an honest no-prior-period state. Neither says
// the KORA Index page must render them — and it does not.
//
// So `ConfidenceGauge` and `TrendIndicator` exist here and are deliberately NOT
// part of the approved default composition.
export { ThresholdMeter } from './ThresholdMeter';
export { ConfidenceGauge } from './ConfidenceGauge';
export { TrendIndicator, type TrendInput } from './TrendIndicator';
export { ScoreBandScale } from './ScoreBandScale';
export { SafeguardSignificance } from './SafeguardSignificance';
export { ContributionBars, type ContributionItem } from './ContributionBars';
export { DistributionStrip, type DistributionSlice } from './DistributionStrip';

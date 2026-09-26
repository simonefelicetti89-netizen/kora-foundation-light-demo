// KORA-WP-142 encoding primitives, ported for the approved KORA Index design.
//
// PORTED DELIBERATELY, NOT MECHANICALLY. Five of the donor's seven primitives
// are here because the approved design uses them. `ConfidenceGauge` and
// `TrendIndicator` are NOT ported: the design renders Confidence as a plain
// number (a gauge reads as an eleventh scored component) and carries no trend
// region. Existing code is not a reason to keep a visual.
export { ThresholdMeter } from './ThresholdMeter';
export { ScoreBandScale } from './ScoreBandScale';
export { SafeguardSignificance } from './SafeguardSignificance';
export { ContributionBars, type ContributionItem } from './ContributionBars';
export { DistributionStrip, type DistributionSlice } from './DistributionStrip';

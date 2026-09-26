// KORA-WP-142 — the Data Visualisation Grammar primitives.
//
// Every primitive here answers exactly one of the questions the grammar admits:
//   how large? · where relative to threshold? · what state? · how reliable?
//   what contributes? · how does it compare, where a real comparison exists?
//
// None of them takes a colour, a tone or a threshold. Significance is derived
// from `lib/design/encoding-grammar`, which reads the versioned methodology
// config — so a component cannot disagree with the methodology, and a chart
// cannot be added here for its own sake.
export { ThresholdMeter } from './ThresholdMeter';
export { ScoreBandScale } from './ScoreBandScale';
export { ConfidenceGauge } from './ConfidenceGauge';
export { SafeguardSignificance } from './SafeguardSignificance';
export { ContributionBars, type ContributionItem } from './ContributionBars';
export { DistributionStrip, type DistributionSlice } from './DistributionStrip';
export { TrendIndicator, type TrendInput } from './TrendIndicator';

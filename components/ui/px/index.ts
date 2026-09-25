// KORA-WP-125 — the shared Product Experience primitives.
// Future UI-bearing packages import from here and never re-declare a local
// visual system or a local token adapter (the KORA-WP-039 pattern).
export { Surface, SurfaceHeader, SurfaceBody } from './Surface';
export { Status, Chip } from './Status';
export { Notice } from './Notice';
export { Skeleton, SkeletonRows, InlineSpinner } from './Skeleton';
export { DateField, formatIsoDateItalian } from './DateField';
export { PxDataTable, type PxColumn, type PxDataTableProps } from './DataTable';
export { PageHead, Workspace, Col, Band, SplitRegion, SplitPart, Region, Metric, MetricStrip, Facts, StateBlock, type ColSpan } from './Workspace';
// KORA-WP-140 — canonical surface roles and states.
export {
  HeroJudgment, PrimaryMetric, SupportingMetric, EvidencePanel, WarningSafeguard,
  ActionGroup, Disclosure, BoundarySurface, OperationalRow, ROLE_CONTRACT,
} from './roles';
export {
  Zero, NoData, InsufficientData, Suppressed, NotYetAvailable, Loading, ErrorState,
  SurfaceStateView,
} from './states';

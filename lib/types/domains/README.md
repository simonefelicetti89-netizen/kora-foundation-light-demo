# lib/types/domains — Planned Domain Split

## Current state

All KORA TypeScript types live in a single file: `lib/types/index.ts` (~1,900 lines, ~100 exports).

This monolith is intentional for Foundation Light v0.1 — it works, and splitting it pre-Pilot+ would create
merge churn with no shipping benefit. However, the monolith means changes in one domain (e.g., methodology
weights) have maximum blast radius across all consumers.

## Planned split (Pilot+ migration)

This directory will receive domain-scoped modules. Files created here should re-export from `lib/types/index.ts`
until the monolith is formally split. New types that have no existing consumers should be added here directly
(not to the monolith) to accelerate the migration.

| Domain module | Contents | Migration priority |
|---|---|---|
| `methodology.ts` | PillarCode, ComponentCode, MacroblockCode, CalibrationStatus, SafeguardStatus, ScenarioId, IU formula factor types | HIGH — most referenced |
| `ingestion.ts` | IngestionSourceType, RawIngestionRow, NormalizedIngestionRow, UEFRecord, EligibilityClass, ActionFamily, EventNature, MandatoryStatus | HIGH — pipeline input boundary |
| `scoring.ts` | KoraIndexOutput, KoraIndexComponent, MacroblockScore, CompanyAggregate, CompanyAggregateExtended, ScoringMode | HIGH — pipeline output boundary |
| `worker.ts` | WorkerPersona, PIBRecord, DynamicCVProfile, WorkforceBaseline, PrivacySensitivity, PrivacyDataType | MEDIUM — worker space boundary |
| `evidence.ts` | EvidenceRecord, EvidenceLifecycleStatus, VerificationRecord, ReviewDecision | **DONE** — new types, no monolith conflict |
| `platform.ts` | KoraTenant, KoraUserAccount, KoraRole, Environment, ScenarioConfig | MEDIUM — platform backbone |
| `reporting.ts` | ReportData, DecisionPackVersion, CompanyDecisionPack, DecisionPackSection | LOW — report layer |

## Migration procedure

1. Create the domain file with the types to move.
2. In `lib/types/index.ts`, replace the definition with a re-export:
   ```typescript
   export type { EvidenceRecord } from './domains/evidence';
   ```
3. Run `tsc --noEmit` to verify zero import regressions.
4. Update the MEMORY.md entry for the types domain when migration is complete.

## What NOT to do

- Do not split the monolith during an active sprint unless the new types have zero existing consumers.
- Do not break existing `@/lib/types` imports — re-export from the domain file until consumers are migrated.
- Do not create a barrel `lib/types/domains/index.ts` that re-imports everything — that defeats the purpose.

// lib/worker-identity/types.ts
// Canonical worker identity domain types for KORA.
// B81-B: Foundation Light implements PREVIEW mode only.
// Pilot+: LIVE mode requires worker KORA ID issuance, pseudonymization service,
// and worker Supabase session authentication (Gate 2 + Gate 3).

// ── Branded string types ──────────────────────────────────────────────────────
// Prevent accidental cross-assignment between the three distinct worker ID spaces:
//   worker_id       — tenant-scoped HR identifier (company owns this)
//   WorkerKoraId    — portable, KORA-issued, cross-tenant (worker owns this)
//   WorkerPseudonymId — pipeline-safe, one-way hash of WorkerKoraId (company-facing)

export type WorkerKoraId = string & { readonly _brand: 'WorkerKoraId' };
export type WorkerPseudonymId = string & { readonly _brand: 'WorkerPseudonymId' };

// ── WorkerMode ────────────────────────────────────────────────────────────────
// Whether a My KORA session is powered by real worker identity or preview data.
//
// PREVIEW  — synthetic persona data, no real worker JWT, no real PIB computation.
//            Data source: MyKoraPreviewService (persona fixtures).
//            Identity source: demo-state persona switcher.
//            KORA Foundation Light is always PREVIEW.
//
// LIVE     — real Supabase worker session, WorkerKoraId resolved from JWT,
//            PIB derived from per-worker UEF records via pipeline.
//            Requires: Gate 2 (schema) + Gate 3 (worker auth + consent).
//
// DISABLED — worker space not enabled for this tenant, or worker account inactive,
//            or current session role is not WORKER/KORA_ADMIN.
export type WorkerMode = 'PREVIEW' | 'LIVE' | 'DISABLED';

// ── WorkerSpaceStatus ─────────────────────────────────────────────────────────
// Tenant-level enablement state for the worker layer.
//
// NOT_ENABLED  — company has not opted into My KORA. No worker invitations possible.
// ENABLED      — company opted in; workers can be invited and onboarded.
//                My KORA accessible to invited workers. PIB still aggregate-estimate.
// PILOT_READY  — worker space active, per-worker UEF records available,
//                individual PIB attribution enabled (Pilot+).
export type WorkerSpaceStatus = 'NOT_ENABLED' | 'ENABLED' | 'PILOT_READY';

// ── WorkerSession ─────────────────────────────────────────────────────────────
// Canonical shape for worker session context exposed by WorkerSessionProvider.
// All My KORA pages and services should consume this instead of reading
// individual demo-state hooks (useRole / usePersona) directly.
export interface WorkerSession {
  workerMode:        WorkerMode;
  workerKoraId:      WorkerKoraId | null;  // null in PREVIEW mode
  workerDisplayName: string | null;
  tenantId:          string | null;        // null in PREVIEW mode
  isPreview:         boolean;              // true when workerMode === 'PREVIEW'
  isLive:            boolean;              // true when workerMode === 'LIVE'
  sessionLoading:    boolean;              // true during async session detection (Pilot+ path)
}

// ── WorkerSpaceCapability ────────────────────────────────────────────────────
// What the worker space can do for a given tenant at its current status.
export interface WorkerSpaceCapability {
  status:               WorkerSpaceStatus;
  enabled:              boolean;
  mode:                 'preview' | 'pilot_ready' | 'not_enabled';
  workerCountSupported: boolean;   // can the tenant see worker count on roster?
  dynamicCvSupported:   boolean;   // is Dynamic Impact CV available (preview or live)?
  pibSupported:         boolean;   // is per-worker PIB attribution available?
  collectiveSupported:  boolean;   // is KORA Contribution™ worker layer active?
  note:                 string;    // human-readable status note for admin UI
}

// ── Session factories ─────────────────────────────────────────────────────────

export function makePreviewWorkerSession(
  workerDisplayName?: string | null,
): WorkerSession {
  return {
    workerMode:        'PREVIEW',
    workerKoraId:      null,
    workerDisplayName: workerDisplayName ?? null,
    tenantId:          null,
    isPreview:         true,
    isLive:            false,
    sessionLoading:    false,
  };
}

export function makeDisabledWorkerSession(): WorkerSession {
  return {
    workerMode:        'DISABLED',
    workerKoraId:      null,
    workerDisplayName: null,
    tenantId:          null,
    isPreview:         false,
    isLive:            false,
    sessionLoading:    false,
  };
}

export function makeLiveWorkerSession(params: {
  workerKoraId:      WorkerKoraId;
  workerDisplayName: string;
  tenantId:          string;
}): WorkerSession {
  return {
    workerMode:        'LIVE',
    workerKoraId:      params.workerKoraId,
    workerDisplayName: params.workerDisplayName,
    tenantId:          params.tenantId,
    isPreview:         false,
    isLive:            true,
    sessionLoading:    false,
  };
}

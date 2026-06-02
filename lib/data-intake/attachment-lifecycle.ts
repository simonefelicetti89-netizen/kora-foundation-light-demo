// lib/data-intake/attachment-lifecycle.ts
// B35: Attachment lifecycle model — pure functions, no DB, no storage calls.
//
// Manages lifecycle status for evidence attachments stored in
// source_batch.payload_sample._b31_attachments[].
//
// Backward compatibility:
//   Attachments without lifecycleStatus → infer from storageStatus:
//     stored_private → 'active'
//     anything else  → 'metadata_only'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AttachmentLifecycleStatus =
  | 'active'           // accessible, signed URL allowed
  | 'archived'         // soft-hidden, signed URL disabled, storage intact
  | 'removed'          // removed from active view, signed URL disabled, storage may be intact
  | 'storage_removed'  // storage physically deleted, metadata retained
  | 'metadata_only';   // never had binary storage

// Actions available via lifecycle API
export type LifecycleAction =
  | 'archive'           // active → archived
  | 'restore'           // archived → active/metadata_only
  | 'remove_metadata'   // any → removed (metadata retained, storage intact)
  | 'remove_storage';   // stored_private → storage_removed (physical deletion)

export type AttachmentLifecycleFields = {
  lifecycleStatus:   AttachmentLifecycleStatus;
  archivedAt?:       string;
  restoredAt?:       string;
  removedAt?:        string;
  storageRemovedAt?: string;
  removalReason?:    string;  // PII-scanned, short
};

// ── Backward-compat status resolver ──────────────────────────────────────────

export function resolveLifecycleStatus(
  att: Record<string, unknown>,
): AttachmentLifecycleStatus {
  const explicit = att['lifecycleStatus'] as string | undefined;
  const valid: AttachmentLifecycleStatus[] = [
    'active', 'archived', 'removed', 'storage_removed', 'metadata_only',
  ];
  if (explicit && (valid as string[]).includes(explicit)) {
    return explicit as AttachmentLifecycleStatus;
  }
  // Backward compat: infer from storageStatus
  return att['storageStatus'] === 'stored_private' ? 'active' : 'metadata_only';
}

// ── Signed URL eligibility ────────────────────────────────────────────────────

export type SignedUrlEligibility =
  | { allowed: true }
  | { allowed: false; errorCode: string; errorMessage: string };

export function canGenerateSignedUrl(
  att: Record<string, unknown>,
): SignedUrlEligibility {
  const lifecycle = resolveLifecycleStatus(att);

  if (att['storageStatus'] !== 'stored_private') {
    return { allowed: false, errorCode: 'attachment_not_stored',
      errorMessage: 'Attachment is metadata-only. No file to open.' };
  }
  if (lifecycle === 'archived') {
    return { allowed: false, errorCode: 'attachment_archived',
      errorMessage: 'Attachment is archived. Restore it to re-enable secure access.' };
  }
  if (lifecycle === 'removed') {
    return { allowed: false, errorCode: 'attachment_removed',
      errorMessage: 'Attachment has been removed from the active evidence archive.' };
  }
  if (lifecycle === 'storage_removed') {
    return { allowed: false, errorCode: 'attachment_storage_removed',
      errorMessage: 'Attachment storage has been permanently removed. File is no longer available.' };
  }
  if (lifecycle === 'metadata_only') {
    return { allowed: false, errorCode: 'attachment_not_stored',
      errorMessage: 'Attachment is metadata-only. No file to open.' };
  }
  return { allowed: true };
}

// ── PII guard for lifecycle reason ────────────────────────────────────────────

const PII_IN_REASON = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i,
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
];

export function sanitizeLifecycleReason(reason: string | undefined): string | undefined {
  if (!reason?.trim()) return undefined;
  const trimmed = reason.trim().slice(0, 200);
  if (PII_IN_REASON.some(p => p.test(trimmed))) return '[reason redacted — PII detected]';
  return trimmed;
}

// ── Lifecycle transition builder ──────────────────────────────────────────────
// Returns the new lifecycle fields to merge into attachment metadata.

export function buildLifecycleUpdate(params: {
  action: LifecycleAction;
  att: Record<string, unknown>;
  reason?: string;
  now: string;
}): { fields: AttachmentLifecycleFields; error?: string } {
  const { action, att, reason, now } = params;
  const currentLifecycle = resolveLifecycleStatus(att);
  const sanitizedReason  = sanitizeLifecycleReason(reason);

  if (action === 'archive') {
    if (currentLifecycle === 'removed' || currentLifecycle === 'storage_removed') {
      return { fields: { lifecycleStatus: 'archived' }, error: 'Cannot archive a removed attachment.' };
    }
    return {
      fields: {
        lifecycleStatus: 'archived',
        archivedAt:       now,
        ...(sanitizedReason ? { removalReason: sanitizedReason } : {}),
      },
    };
  }

  if (action === 'restore') {
    const restoredStatus: AttachmentLifecycleStatus =
      att['storageStatus'] === 'stored_private' ? 'active' : 'metadata_only';
    return {
      fields: {
        lifecycleStatus: restoredStatus,
        restoredAt:      now,
        // preserve archivedAt historical record — do not erase
      },
    };
  }

  if (action === 'remove_metadata') {
    return {
      fields: {
        lifecycleStatus: 'removed',
        removedAt:        now,
        ...(sanitizedReason ? { removalReason: sanitizedReason } : {}),
      },
    };
  }

  if (action === 'remove_storage') {
    if (att['storageStatus'] !== 'stored_private') {
      return { fields: { lifecycleStatus: 'metadata_only' }, error: 'Attachment has no binary storage to remove.' };
    }
    if (currentLifecycle === 'storage_removed') {
      return { fields: { lifecycleStatus: 'storage_removed' }, error: 'Storage already removed.' };
    }
    return {
      fields: {
        lifecycleStatus:  'storage_removed',
        storageRemovedAt: now,
        ...(sanitizedReason ? { removalReason: sanitizedReason } : {}),
      },
    };
  }

  return { fields: { lifecycleStatus: currentLifecycle }, error: `Unknown action: ${action}` };
}

// ── Safe lifecycle label (for UI) ─────────────────────────────────────────────

export const LIFECYCLE_LABELS: Record<AttachmentLifecycleStatus, string> = {
  active:           'Attivo',
  archived:         'Archiviato',
  removed:          'Rimosso',
  storage_removed:  'File rimosso',
  metadata_only:    'Solo metadati',
};

export const LIFECYCLE_CAN_OPEN: Record<AttachmentLifecycleStatus, boolean> = {
  active:          true,
  archived:        false,
  removed:         false,
  storage_removed: false,
  metadata_only:   false,
};

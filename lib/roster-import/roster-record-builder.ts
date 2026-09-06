// lib/roster-import/roster-record-builder.ts
// B-WORKER WorkerProvisioning Canonicalization (2026-09-06): relocated,
// unchanged, from services/worker-provisioning/WorkerProvisioningService.ts's
// importDemoRoster() method (retired along with the rest of that file). This
// function was already a pure transformation of its own arguments — it never
// read the synthetic data/synthetic/worker-roster.json fixture that method's
// OTHER methods depended on — so it belongs here, alongside its sibling pure
// modules roster-parser.ts / roster-validation.ts, not in a service file.
//
// Behavior is unchanged from before this relocation: no DB write, no email,
// no auth (see RosterImportModal.tsx's own header — "5-step client-side
// import flow... No server calls. No DB writes. No email. No auth."). This
// produces an in-memory WorkerRosterRecord[] for the caller's own component
// state; it does not persist anything. Whether/how roster rows should ever
// become real, persisted personal.worker_identity rows (distinct from
// authentication invitation, which always requires a real email + Supabase
// Auth invite per app/api/admin/workers/provision/route.ts) is an explicit,
// separate, later product/schema decision — personal.worker_identity's
// auth_user_id is NOT NULL, so a persisted "draft, not-yet-invited" worker
// has no canonical home today, and this function does not invent one.

import type { WorkerRosterRecord } from '@/lib/types';
import type { ValidatedRosterRow } from './types';

export function buildRosterRecordsFromValidatedRows(
  companyId: string,
  tenantId: string,
  validatedRows: ValidatedRosterRow[],
): WorkerRosterRecord[] {
  const createdAt = new Date().toISOString();
  return validatedRows.map((row): WorkerRosterRecord => ({
    worker_id:   `WRK-IMP-${row.employee_code.toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
    tenant_id:   tenantId,
    company_id:  companyId,
    display_name: row.display_name,
    role_family:  row.job_family || 'imported',
    site:         row.site,
    department:   row.department,
    cluster:      row.cluster || undefined,
    worker_account_status:         'draft',
    consent_status:                'not_collected',
    my_kora_enabled:               row.my_kora_enabled,
    pib_private_enabled:           false,
    employer_can_view_individual_pib: false,
    included_in_aggregates:        true,
    privacy_threshold_cluster:     false,
    created_at:                    createdAt,
  }));
}

// lib/audit/log-access.ts
// B168 Phase 3 — Stub. Phase 4 sostituirà con insert DB reale su audit.audit_log.
// L'interfaccia è stabile: i caller non cambieranno in Phase 4.
//
// Regola non negoziabile: se l'insert fallisce NON bloccare la richiesta.
// fail open su audit, fail closed su access (la decisione di accesso viene prima).

export interface AccessLogEntry {
  actorId:      string;
  actorRole:    string;
  resource:     string;
  tenantId:     string | null;
  environment:  'demo' | 'live' | 'future';
  action?:      string;
}

export async function logServiceAccess(entry: AccessLogEntry): Promise<void> {
  // Phase 4: replace with DB insert to audit.audit_log (non-blocking).
  if (process.env.NODE_ENV === 'development') {
    console.log('[audit-stub] KORA service access', entry);
  }
}

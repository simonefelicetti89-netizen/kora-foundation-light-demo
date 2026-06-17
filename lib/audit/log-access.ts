// lib/audit/log-access.ts
// B168 Phase 4 — Helper audit log non-bloccante per accessi privilegiati KORA service team.
//
// Regola non negoziabile: se l'insert fallisce NON blocca la richiesta.
// fail open su audit, fail closed su access (la decisione di accesso precede sempre l'audit).
//
// Chiama sempre in fire-and-forget: `void logServiceAccess(entry)`.
// Il caller NON deve await — nessun blocco sul percorso critico.

import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface AccessLogEntry {
  actorId:      string;
  actorRole:    string;
  resource:     string;
  tenantId:     string | null;
  environment:  'demo' | 'live' | 'future';
  action?:      string;
  ipHash?:      string;
  userAgentHash?: string;
}

export async function logServiceAccess(entry: AccessLogEntry): Promise<void> {
  try {
    const db = await getSupabaseServerClient();
    await db.schema('audit').from('audit_log').insert({
      tenant_id:         entry.tenantId,
      actor_role:        entry.actorRole,
      actor_id:          entry.actorId,
      action:            entry.action ?? 'service_access',
      resource_type:     entry.resource,
      resource_id:       null,
      payload:           { environment: entry.environment },
      environment:       entry.environment,
      ip_hash:           entry.ipHash ?? null,
      user_agent_hash:   entry.userAgentHash ?? null,
    });
  } catch (err) {
    // fail open — log failure never blocks the request
    if (process.env.NODE_ENV === 'development') {
      console.error('[audit] insert failed (non-blocking):', err);
    }
  }
}

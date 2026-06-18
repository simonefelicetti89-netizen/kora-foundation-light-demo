// lib/audit/log-access.ts
// B168 Phase 4 — Helper audit log non-bloccante per accessi privilegiati KORA service team.
// B168.7 — ip_hash e user_agent_hash popolati via hashing one-way con AUDIT_HASH_SALT.
//
// Regola non negoziabile: se l'insert fallisce NON blocca la richiesta.
// fail open su audit, fail closed su access (la decisione di accesso precede sempre l'audit).
//
// Chiama sempre in fire-and-forget: `void logServiceAccess(entry)`.
// Il caller NON deve await — nessun blocco sul percorso critico.

import { createHash }           from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const HASH_SALT = process.env.AUDIT_HASH_SALT ?? 'kora-audit-salt';

function hashValue(value: string): string {
  return createHash('sha256').update(HASH_SALT + value).digest('hex');
}

export interface AccessLogEntry {
  actorId:      string;
  actorRole:    string;
  resource:     string;
  tenantId:     string | null;
  environment:  'demo' | 'live' | 'future';
  action?:      string;
  // Raw values — hashed internally before insert. Never stored as plaintext.
  ipAddress?:   string;
  userAgent?:   string;
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
      ip_hash:           entry.ipAddress ? hashValue(entry.ipAddress) : null,
      user_agent_hash:   entry.userAgent ? hashValue(entry.userAgent) : null,
    });
  } catch (err) {
    // fail open — log failure never blocks the request
    if (process.env.NODE_ENV === 'development') {
      console.error('[audit] insert failed (non-blocking):', err);
    }
  }
}

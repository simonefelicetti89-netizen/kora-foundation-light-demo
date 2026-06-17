// lib/supabase/worker-provisioning-service-key.ts
//
// Service-role client scoped a operazioni di provisioning worker.
// Pattern parallelo a storage-service-key.ts.
//
// PERCHÉ ESISTE:
//   Post-027, personal.worker_identity ha RLS che nega INSERT a KORA_ADMIN.
//   Provisioning di un nuovo worker richiede di creare la riga identity PRIMA
//   che il worker abbia un proprio JWT con cui auto-popolare. Service-role è
//   l'unico path safe.
//
// COSA NON DEVE FARE:
//   - NON usare per leggere worker_pib, worker_pseudonym_map, worker_profile:
//     la lettura di dati individuali resta DENY anche con service-role — la
//     doctrine è applicata in codice qui, non solo via RLS.
//   - NON esporre il client Supabase direttamente: solo le funzioni scoped.
//   - NON loggare la service role key.
//
// INVARIANTE:
//   Solo INSERT su worker_identity e UPDATE limitati a campi non-PII.
//   Campi ammessi definiti in ALLOWED_IDENTITY_INSERT_FIELDS (whitelist).
//   Niente SELECT su dati individuali worker da questo modulo.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

// ── Whitelist campi INSERT/UPDATE ─────────────────────────────────────────────
// Esplicita: la blacklist dimentica, la whitelist protegge.
// Aggiornare SOLO se la doctrine consente il campo aggiuntivo.

const ALLOWED_IDENTITY_INSERT_FIELDS = new Set([
  'worker_ref',
  'tenant_id',
  'auth_user_id',
  'status',
  'created_at',
  // ESCLUSI deliberatamente: display_name, first_name, last_name,
  // phone, address, tax_id, codice_fiscale, e qualsiasi PII.
]);

const ALLOWED_IDENTITY_UPDATE_FIELDS = new Set([
  'status',
  'updated_at',
  // ESCLUSI: campi identitari non aggiornabili via provisioning route.
]);

export function assertProvisioningInsertPayload(payload: Record<string, unknown>): void {
  const keys = Object.keys(payload);
  const forbidden = keys.filter((k) => !ALLOWED_IDENTITY_INSERT_FIELDS.has(k));
  if (forbidden.length > 0) {
    throw new Error(
      `worker-provisioning-service-key: campi non ammessi in INSERT: ${forbidden.join(', ')}. ` +
      `Aggiornare ALLOWED_IDENTITY_INSERT_FIELDS solo se la doctrine consente il campo.`,
    );
  }
}

export function assertProvisioningUpdatePayload(payload: Record<string, unknown>): void {
  const keys = Object.keys(payload);
  const forbidden = keys.filter((k) => !ALLOWED_IDENTITY_UPDATE_FIELDS.has(k));
  if (forbidden.length > 0) {
    throw new Error(
      `worker-provisioning-service-key: campi non ammessi in UPDATE: ${forbidden.join(', ')}. ` +
      `Aggiornare ALLOWED_IDENTITY_UPDATE_FIELDS solo se la doctrine consente il campo.`,
    );
  }
}

// ── Operazioni permesse ────────────────────────────────────────────────────────

export interface WorkerIdentityInsertPayload {
  worker_ref: string;
  tenant_id: string;
  auth_user_id: string;
  status: string;
  created_at?: string;
}

export interface WorkerIdentityRow {
  id: string;
}

export async function insertWorkerIdentity(
  payload: WorkerIdentityInsertPayload,
): Promise<{ data: WorkerIdentityRow; error: null } | { data: null; error: string }> {
  assertProvisioningInsertPayload(payload as unknown as Record<string, unknown>);

  try {
    const sc = getSupabaseServiceClient();
    const { data, error } = await sc
      .schema('personal')
      .from('worker_identity')
      .insert(payload)
      .select('id')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as WorkerIdentityRow, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// lib/supabase/auth-admin-update-user.ts
//
// B163 — Unico punto del codebase dove getSupabaseServiceClient è usato in /api/worker/*.
// Motivo: auth.admin.updateUserById richiede service-role per design Supabase —
// non esiste un path RLS-respecting per questa chiamata.
//
// Stesso modulo di getSupabaseServerClient (@/lib/supabase/server), funzione diversa.
// Questo file importa getSupabaseServiceClient; le route importano getSupabaseServerClient.
// grep "getSupabaseServiceClient" app/api/worker/ deve trovare ZERO occorrenze (test b163).
//
// NON inghiottire l'errore: auth.admin sincronizza i claim usati da RLS e middleware
// (kora_role, kora_tenant_id, kora_worker_id, kora_status). Se DB scrive e auth.admin
// fallisce, il worker è in stato inconsistente — desincronizzazione DB↔JWT.
// Una failure esplicita è meglio di un silent-fail che maschera la desincronizzazione.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

export type UpdateWorkerAuthPayload = {
  kora_role:      string;
  kora_tenant_id: string;
  kora_worker_id: string;
  kora_status:    string;
};

export async function updateWorkerAuthMetadata(
  authUserId: string,
  payload: UpdateWorkerAuthPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sc = getSupabaseServiceClient();
  const { error } = await sc.auth.admin.updateUserById(authUserId, { app_metadata: payload });
  if (error) {
    console.error('[updateWorkerAuthMetadata] auth.admin sync failed — DB↔JWT desync risk:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// lib/supabase/storage-service-key.ts
//
// B168 — Unico punto del codebase dove getSupabaseServiceClient è usato in app/api/company/*.
// Motivo: il bucket kora-evidence-attachments è privato by design Supabase —
// l'upload richiede service-role (nessun path RLS-respecting per Storage upload su bucket privato).
//
// Stesso modulo di getSupabaseServerClient (@/lib/supabase/server), funzione diversa.
// Questo file importa getSupabaseServiceClient; le route importano getSupabaseServerClient.
// grep "getSupabaseServiceClient" app/api/company/ deve trovare ZERO occorrenze (test b168).
//
// NON inghiottire l'errore: ritorna { ok, error } esplicitamente al chiamante.
// La route decide il comportamento (degradazione a metadata_only o abort).
// Un silent-fail maschererebbe file non salvati dichiarati come salvati — inaccettabile.
//
// Correzione 3: check su error.statusCode (404) prima del check stringa fragile.
// Il check stringa su 'bucket'/'not found' è mantenuto come fallback con commento esplicito.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { ATTACHMENT_BUCKET } from '@/lib/data-intake/evidence-attachment-storage';

export async function uploadToAttachmentBucket(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  try {
    const sc = getSupabaseServiceClient();
    const { error } = await sc.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      const msg = (error.message ?? '') as string;
      // statusCode 404 = bucket non configurato (check robusto, Correzione 3).
      // Check stringa mantenuto come fallback — fragile perché dipende dal wording Supabase.
      // TODO: preferire error.statusCode quando consistente tra versioni SDK.
      if (
        (error as { statusCode?: number }).statusCode === 404 ||
        msg.toLowerCase().includes('bucket') ||
        msg.toLowerCase().includes('not found')
      ) {
        return { ok: false, error: 'storage_not_configured' };
      }
      return { ok: false, error: `storage_error: ${msg}` };
    }

    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

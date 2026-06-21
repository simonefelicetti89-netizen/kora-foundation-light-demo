// services/commons/BookingService.ts
// B166 — Prenotazioni cross-azienda a iniziative KORA Space.
//
// Tutte le operazioni usano il client passato come argomento (server-client o service-client
// secondo il contesto — le route API passano server-client, il trigger markAttended usa service-client).
//
// Privacy invariants:
//   - createBooking: valida che il post sia cross_company e published prima di accettare.
//   - Capacità cross_company: count approved + pending < capacity_cross (check applicativo).
//   - getAggregateForPromoter: chiama la funzione SECURITY DEFINER del DB — mai righe individuali.
//   - markAttended: triggera attributeContributionForBooking + attributePIBForBooking (hook B166).

import type { ServiceDb } from '@/lib/supabase/server';
import type { BookingAggregateForPromoter, BookingStatus, CommonsBooking } from '@/lib/commons/booking-types';
import {
  attributePIBForBooking,
  attributeContributionForBooking,
  attributeContributionForExternalParticipants,
} from '@/lib/commons/cross-company-attribution';

// ── Tipi interni ─────────────────────────────────────────────────────────────

interface PostForBooking {
  id:                         string;
  tenant_id:                  string;
  opening_grade:              string | null;
  status:                     string;
  pillar:                     string | null;
  capacity_cross:             number | null;
  external_participants_count: number | null;
  external_participants_evidence: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchPostForBooking(
  db:     ServiceDb | any,
  postId: string,
): Promise<PostForBooking | null> {
  const { data } = await (db as any)
    .schema('commons')
    .from('post')
    .select('id, tenant_id, opening_grade, status, pillar, capacity_cross, external_participants_count, external_participants_evidence')
    .eq('id', postId)
    .maybeSingle();
  return (data as PostForBooking | null) ?? null;
}

async function countActiveBookings(
  db:     ServiceDb | any,
  postId: string,
): Promise<number> {
  const { count } = await (db as any)
    .schema('commons')
    .from('booking')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)
    .in('status', ['pending', 'approved']);
  return count ?? 0;
}

// ── Operazioni worker ─────────────────────────────────────────────────────────

/**
 * Crea una prenotazione per un'iniziativa cross_company.
 * Valida: post cross_company + published + capacità disponibile.
 * Idempotenza: UNIQUE (post_id, worker_identity_id) — seconda prenotazione → errore 409.
 */
export async function createBooking(params: {
  db:              any;
  workerIdentityId: string;
  workerTenantId:  string;
  postId:          string;
}): Promise<{ ok: true; booking: CommonsBooking } | { ok: false; error: string; status: number }> {
  const { db, workerIdentityId, workerTenantId, postId } = params;

  const post = await fetchPostForBooking(db, postId);
  if (!post) {
    return { ok: false, error: 'Iniziativa non trovata.', status: 404 };
  }
  if (post.opening_grade !== 'cross_company') {
    return { ok: false, error: 'Solo le iniziative cross_company accettano prenotazioni.', status: 400 };
  }
  if (post.status !== 'published') {
    return { ok: false, error: 'Iniziativa non disponibile (non pubblicata).', status: 400 };
  }

  // Capacità: capacity_cross null = illimitata
  if (post.capacity_cross !== null) {
    const active = await countActiveBookings(db, postId);
    if (active >= post.capacity_cross) {
      return { ok: false, error: 'Capienza cross-azienda esaurita per questa iniziativa.', status: 409 };
    }
  }

  const { data, error } = await (db as any)
    .schema('commons')
    .from('booking')
    .insert({
      post_id:            postId,
      worker_identity_id: workerIdentityId,
      worker_tenant_id:   workerTenantId,
      post_tenant_id:     post.tenant_id,
      status:             'pending',
    })
    .select('id, post_id, worker_identity_id, worker_tenant_id, post_tenant_id, status, moderation_notes, moderated_by, moderated_at, attended_at, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Prenotazione già esistente per questa iniziativa.', status: 409 };
    }
    return { ok: false, error: error.message, status: 500 };
  }

  return { ok: true, booking: data as CommonsBooking };
}

/**
 * Le mie prenotazioni (worker-facing).
 * Filtra per worker_identity_id — la RLS worker garantisce che il client veda solo le proprie.
 */
export async function listMyBookings(params: {
  db:              any;
  workerIdentityId: string;
}): Promise<CommonsBooking[]> {
  const { db, workerIdentityId } = params;

  const { data } = await (db as any)
    .schema('commons')
    .from('booking')
    .select('id, post_id, worker_identity_id, worker_tenant_id, post_tenant_id, status, moderation_notes, moderated_at, attended_at, created_at, updated_at')
    .eq('worker_identity_id', workerIdentityId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (data as CommonsBooking[] | null) ?? [];
}

/**
 * Cancella una prenotazione (solo se pending o approved).
 * Il worker può cancellare solo la propria — la RLS worker garantisce l'isolamento.
 */
export async function cancelBooking(params: {
  db:        any;
  bookingId: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { db, bookingId } = params;

  // Legge lo stato corrente (RLS worker limita alla propria)
  const { data: existing } = await (db as any)
    .schema('commons')
    .from('booking')
    .select('id, status')
    .eq('id', bookingId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: 'Prenotazione non trovata.', status: 404 };
  }
  const b = existing as { id: string; status: string };
  if (!['pending', 'approved'].includes(b.status)) {
    return { ok: false, error: 'Impossibile cancellare una prenotazione in stato: ' + b.status, status: 409 };
  }

  const { error } = await (db as any)
    .schema('commons')
    .from('booking')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);

  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true };
}

// ── Operazioni KORA_ADMIN ────────────────────────────────────────────────────

/** Lista pending da moderare — per il pannello admin. */
export async function listPendingForModeration(params: {
  db:     any;
  limit?: number;
}): Promise<any[]> {
  const { db, limit = 200 } = params;

  const { data } = await (db as any)
    .schema('commons')
    .from('booking')
    .select('id, post_id, post_tenant_id, worker_tenant_id, status, moderation_notes, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  return (data as any[] | null) ?? [];
}

/**
 * Lista prenotazioni per moderazione — supporta filtro per status opzionale.
 * status=null → tutte le prenotazioni (scope=all).
 * SELECT: stessi campi di listPendingForModeration + moderated_at + attended_at.
 */
export async function listBookingsForModeration(params: {
  db:      any;
  status?: string | null;
  limit?:  number;
}): Promise<any[]> {
  const { db, status, limit = 500 } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .schema('commons')
    .from('booking')
    .select('id, post_id, post_tenant_id, worker_tenant_id, status, moderation_notes, moderated_at, attended_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data } = await query;
  return (data as any[] | null) ?? [];
}

/** Moderation: approved / rejected. */
export async function moderate(params: {
  db:              any;
  bookingId:       string;
  decision:        'approved' | 'rejected';
  notes?:          string | null;
  adminId:         string;
}): Promise<{ ok: true; booking: CommonsBooking } | { ok: false; error: string; status: number }> {
  const { db, bookingId, decision, notes, adminId } = params;

  const { data: existing } = await (db as any)
    .schema('commons')
    .from('booking')
    .select('id, status')
    .eq('id', bookingId)
    .maybeSingle();

  if (!existing) return { ok: false, error: 'Prenotazione non trovata.', status: 404 };
  const b = existing as { id: string; status: string };
  if (b.status !== 'pending') {
    return { ok: false, error: `Stato non moderabile: ${b.status}. Solo 'pending' è moderabile.`, status: 409 };
  }

  const { data, error } = await (db as any)
    .schema('commons')
    .from('booking')
    .update({
      status:           decision,
      moderation_notes: notes ?? null,
      moderated_by:     adminId,
      moderated_at:     new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select('id, post_id, worker_identity_id, worker_tenant_id, post_tenant_id, status, moderation_notes, moderated_by, moderated_at, attended_at, created_at, updated_at')
    .single();

  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true, booking: data as CommonsBooking };
}

/**
 * Segna un booking come attended (dopo l'evento, confermato da KORA_ADMIN).
 * Triggera:
 *   1. PIB worker con IU maggiorato cross_company (×1.30) — inserisce in personal.worker_pib
 *   2. Due righe Contribution: promoter + origin_employer — inserisce in commons.contribution_event
 *   3. (Se post ha external_participants_count > 0) riga Contribution per familiari
 *
 * Idempotenza garantita da UNIQUE constraint (mig 025) su commons.contribution_event(source_booking_id, role).
 * Una seconda chiamata su stessa booking restituisce contribution_written=0 senza errore.
 *
 * Status: ACTIVE in Foundation Light Pilot Preview.
 *   - commons.contribution_event records vengono scritti quando booking → attended.
 *   - I record contribution_event alimentano KoraContributionService.getPromoterContribution()
 *     e .getOriginEmployerContribution() per il KORA Contribution companion indicator.
 *   - KORA Contribution NON è un componente del KORA Index — è un companion indicator separato.
 *   - La pipeline live verso il KORA Index non è attiva pre-Gate-2. Contribution è un
 *     Pilot Preview indicator, non ancora parte del calcolo KORA Index live.
 *
 * Usa serviceDb per bypassare RLS — pattern identico a B164 office-attribution.
 */
export async function markAttended(params: {
  db:             any;   // server-client (JWT) per il PATCH
  serviceDb:      ServiceDb;   // service-role per attribution hook
  bookingId:      string;
  adminId:        string;
  reportingPeriod?: string;
}): Promise<{ ok: true; attribution: { pib: number; contribution: number } } | { ok: false; error: string; status: number }> {
  const { db, serviceDb, bookingId, adminId, reportingPeriod } = params;

  const { data: existing } = await (db as any)
    .schema('commons')
    .from('booking')
    .select('id, post_id, post_tenant_id, worker_tenant_id, worker_identity_id, status')
    .eq('id', bookingId)
    .maybeSingle();

  if (!existing) return { ok: false, error: 'Prenotazione non trovata.', status: 404 };
  const b = existing as CommonsBooking;

  if (b.status !== 'approved') {
    return { ok: false, error: `Solo le prenotazioni approved possono essere marcate attended. Stato corrente: ${b.status}.`, status: 409 };
  }

  // Aggiorna status → attended
  const { error: updateErr } = await (db as any)
    .schema('commons')
    .from('booking')
    .update({
      status:      'attended',
      attended_at: new Date().toISOString(),
      moderated_by: adminId,
    })
    .eq('id', bookingId);

  if (updateErr) return { ok: false, error: updateErr.message, status: 500 };

  // Fetch post per pillar e external_participants
  const post = await fetchPostForBooking(serviceDb, b.post_id);

  // Attribution hook — fire-and-forget-style (non blocca la risposta HTTP)
  // ma in questo caso await esplicito per tracciare gli errori nella risposta
  const pibResult = await attributePIBForBooking({
    db:              serviceDb,
    bookingId:       b.id,
    workerIdentityId: b.worker_identity_id,
    workerTenantId:  b.worker_tenant_id,
    postTenantId:    b.post_tenant_id,
    postId:          b.post_id,
    postPillar:      post?.pillar ?? null,
    reportingPeriod,
  });

  const contributionResult = await attributeContributionForBooking({
    db:              serviceDb,
    bookingId:       b.id,
    workerIdentityId: b.worker_identity_id,
    workerTenantId:  b.worker_tenant_id,
    postTenantId:    b.post_tenant_id,
    postId:          b.post_id,
    postPillar:      post?.pillar ?? null,
    reportingPeriod,
  });

  // External participants (familiari/comunità) — solo se il post li dichiara
  if (post && (post.external_participants_count ?? 0) > 0) {
    await attributeContributionForExternalParticipants({
      db:             serviceDb,
      postId:         b.post_id,
      postTenantId:   b.post_tenant_id,
      externalCount:  post.external_participants_count!,
      evidenceStatus: (post.external_participants_evidence ?? 'self_declared') as 'verified' | 'self_declared',
      reportingPeriod,
    });
  }

  return {
    ok:          true,
    attribution: {
      pib:          pibResult.pib_rows_written,
      contribution: contributionResult.contribution_written,
    },
  };
}

// ── Operazioni COMPANY_ADMIN (promotrice) ────────────────────────────────────

/**
 * Aggregato prenotazioni per una specifica iniziativa — solo count per status.
 * Chiama la funzione SECURITY DEFINER booking_aggregate_for_promoter() del DB.
 * MAI righe individuali.
 */
export async function getAggregateForPromoter(params: {
  db:     any;
  postId: string;
}): Promise<BookingAggregateForPromoter> {
  const { db, postId } = params;

  const { data, error } = await (db as any)
    .rpc('booking_aggregate_for_promoter', { p_post_id: postId }, { schema: 'commons' });

  if (error) {
    console.error('[BookingService] booking_aggregate_for_promoter error:', error.message);
    return {
      post_id: postId, count_pending: 0, count_approved: 0,
      count_rejected: 0, count_attended: 0, count_cancelled: 0, total: 0,
    };
  }

  const rows = (data as Array<{ booking_status: string; booking_count: number }> | null) ?? [];
  const byStatus = Object.fromEntries(rows.map((r) => [r.booking_status, r.booking_count]));

  const pending  = byStatus['pending']   ?? 0;
  const approved = byStatus['approved']  ?? 0;
  const rejected = byStatus['rejected']  ?? 0;
  const attended = byStatus['attended']  ?? 0;
  const cancelled = byStatus['cancelled'] ?? 0;

  return {
    post_id:          postId,
    count_pending:    pending,
    count_approved:   approved,
    count_rejected:   rejected,
    count_attended:   attended,
    count_cancelled:  cancelled,
    total:            pending + approved + rejected + attended + cancelled,
  };
}

// app/api/worker/onboarding/route.ts
// B113: Worker Onboarding & Privacy Consent — GET state + POST completion.
//
// PRIVACY CONTRACT:
//   - workerId and tenantId ALWAYS from session — never from query params or body
//   - GET returns only this worker's own onboarding state
//   - POST accepts display_name, preferred_lang, acceptPrivacyBoundary
//   - POST rejects acceptPrivacyBoundary=false (consent is required)
//   - No individual consent data exposed to company or admin diagnostic endpoints
//
// Callable by: WORKER only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const CURRENT_PRIVACY_CONSENT_VERSION = 'B113-v1.0';

const ALLOWED_LANGS = ['it', 'en'] as const;
type Lang = typeof ALLOWED_LANGS[number];

// ── GET /api/worker/onboarding ────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  const { workerId } = auth;
  // RLS worker_profile_worker_own_all (mig 007) isola via auth.uid() subquery.
  const db = await getSupabaseServerClient();

  const { data: profRow, error } = await db
    .schema('personal')
    .from('worker_profile_private')
    .select('onboarding_status, onboarding_completed_at, privacy_consent_version, display_name, preferred_lang')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero dello stato onboarding.' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = profRow as Record<string, any> | null;

  return NextResponse.json({
    ok: true,
    onboarding: {
      status:               row?.onboarding_status ?? 'pending',
      completed_at:         row?.onboarding_completed_at ?? null,
      consent_version:      row?.privacy_consent_version ?? null,
      display_name:         row?.display_name ?? null,
      preferred_lang:       (row?.preferred_lang as Lang) ?? 'it',
      privacy_copy_version: CURRENT_PRIVACY_CONSENT_VERSION,
    },
  });
}

// ── POST /api/worker/onboarding ───────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  // workerId from session only — never from body
  const { workerId, tenantId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body non valido.' }, { status: 400 });
  }

  const { acceptPrivacyBoundary, display_name, preferred_lang } = body as Record<string, unknown>;

  // Consent is mandatory
  if (acceptPrivacyBoundary !== true) {
    return NextResponse.json(
      { error: 'È necessario accettare il boundary privacy KORA per completare l\'onboarding.' },
      { status: 400 },
    );
  }

  // Validate display_name
  let safeDisplayName: string | null = null;
  if (typeof display_name === 'string' && display_name.trim().length > 0) {
    if (display_name.trim().length > 80) {
      return NextResponse.json({ error: 'Il nome visualizzato non può superare 80 caratteri.' }, { status: 400 });
    }
    safeDisplayName = display_name.trim();
  }

  // Validate preferred_lang
  const safeLang: Lang = ALLOWED_LANGS.includes(preferred_lang as Lang)
    ? (preferred_lang as Lang)
    : 'it';

  const now = new Date().toISOString();
  // RLS: worker_profile_worker_own_all (mig 007) per worker_profile_private.
  //      worker_identity_worker_own_update (mig 022) per worker_identity UPDATE.
  const db = await getSupabaseServerClient();

  // Check if profile row exists — difesa in profondità: filtro esplicito su worker_id mantenuto per scrittura
  const { data: existing } = await db
    .schema('personal')
    .from('worker_profile_private')
    .select('id')
    .eq('worker_id', workerId)
    .maybeSingle();

  if (existing) {
    // Update existing row
    const { error: updateError } = await db
      .schema('personal')
      .from('worker_profile_private')
      .update({
        onboarding_done:             true,
        onboarding_status:           'completed',
        onboarding_completed_at:     now,
        privacy_consent_version:     CURRENT_PRIVACY_CONSENT_VERSION,
        privacy_consent_accepted_at: now,
        ...(safeDisplayName !== null ? { display_name: safeDisplayName } : {}),
        preferred_lang: safeLang,
      })
      .eq('worker_id', workerId);

    if (updateError) {
      return NextResponse.json({ error: 'Errore nel salvataggio dell\'onboarding.' }, { status: 500 });
    }
  } else {
    // Insert new profile row
    const { error: insertError } = await db
      .schema('personal')
      .from('worker_profile_private')
      .insert({
        worker_id:                   workerId,
        onboarding_done:             true,
        onboarding_status:           'completed',
        onboarding_completed_at:     now,
        privacy_consent_version:     CURRENT_PRIVACY_CONSENT_VERSION,
        privacy_consent_accepted_at: now,
        display_name:                safeDisplayName,
        preferred_lang:              safeLang,
      });

    if (insertError) {
      return NextResponse.json({ error: 'Errore nella creazione del profilo.' }, { status: 500 });
    }

    // Also update worker_identity status to 'active' if currently 'invited'
    await db
      .schema('personal')
      .from('worker_identity')
      .update({ status: 'active' })
      .eq('id', workerId)
      .eq('tenant_id', tenantId)
      .eq('status', 'invited');
  }

  return NextResponse.json({ ok: true });
}

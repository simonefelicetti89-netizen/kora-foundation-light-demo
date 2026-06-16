// app/api/worker/dynamic-cv/share/route.ts
// B126: POST — create a controlled share link for the worker's Dynamic Impact CV.
//
// Privacy contract (absolute, non-negotiable):
//   - workerId and tenantId ALWAYS from session — never from request body or params
//   - DB stores token_hash (SHA-256) only — raw token returned once, never persisted
//   - shareUrl contains only the raw token — no worker_id, no tenant_id
//   - token_hash never returned in response
//   - Callable by WORKER only — employer roles have no path to this route
//   - KORA_ADMIN cannot generate share links for real workers

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  generateShareToken,
  hashShareToken,
  buildExpiresAt,
  buildShareUrl,
} from '@/lib/worker-cv/share-token';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  // workerId and tenantId from session ONLY — request body is ignored for identity
  const { workerId, tenantId } = auth;

  const rawToken  = generateShareToken();
  const tokenHash = hashShareToken(rawToken);
  const expiresAt = buildExpiresAt();

  // Difesa in profondità: worker_id e tenant_id mantenuti nel payload anche con RLS (scrittura).
  const db = await getSupabaseServerClient();

  const { error } = await db
    .schema('personal')
    .from('worker_cv_share')
    .insert({
      tenant_id:  tenantId,
      worker_id:  workerId,
      token_hash: tokenHash,
      status:     'active',
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    return NextResponse.json({ ok: false, error: 'Impossibile creare il link.' }, { status: 500 });
  }

  // Return shareUrl and expiry — never the token_hash
  return NextResponse.json({
    ok:        true,
    shareUrl:  buildShareUrl(rawToken),
    expiresAt: expiresAt.toISOString(),
  });
}

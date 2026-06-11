// app/api/worker/dynamic-cv/shares/route.ts
// B126: GET — list the authenticated worker's own CV share links.
//
// Privacy contract:
//   - workerId from session only
//   - token_hash NEVER returned — not in response, not in logs
//   - Returns: id, status, expires_at, created_at, revoked_at, access_count
//   - Callable by WORKER only

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { buildShareUrl } from '@/lib/worker-cv/share-token';

export type ShareLinkItem = {
  id:               string;
  status:           'active' | 'revoked' | 'expired';
  expires_at:       string;
  created_at:       string;
  revoked_at:       string | null;
  last_accessed_at: string | null;
  access_count:     number;
  shareUrl:         string;
  isExpired:        boolean;
};

export type SharesResponse = {
  ok:     true;
  shares: ShareLinkItem[];
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  const { workerId } = auth;

  const db = getSupabaseServiceClient();

  // Select all fields EXCEPT token_hash — never returned
  const { data, error } = await db
    .schema('personal')
    .from('worker_cv_share')
    .select('id, status, expires_at, created_at, revoked_at, last_accessed_at, access_count')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: 'Impossibile caricare i link.' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];

  const shares: ShareLinkItem[] = rows.map(row => {
    const isExpired = new Date(row.expires_at as string) < new Date();
    // shareUrl reconstructed without token_hash — id used as opaque display identifier only
    // The actual shareUrl requires the original raw token which is not stored.
    // For display purposes, we show the share route pattern.
    return {
      id:               row.id as string,
      status:           (row.status as 'active' | 'revoked' | 'expired'),
      expires_at:       row.expires_at as string,
      created_at:       row.created_at as string,
      revoked_at:       row.revoked_at as string | null,
      last_accessed_at: row.last_accessed_at as string | null,
      access_count:     row.access_count as number,
      shareUrl:         `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/cv/share/[link]`,
      isExpired,
    };
  });

  return NextResponse.json({ ok: true, shares } satisfies SharesResponse);
}

// app/api/worker/partner-catalog/route.ts
// B116: Partner Map Foundation — worker partner catalog.
//
// GET — list published partners for authenticated worker.
//       Optional ?pillar= filter. Optional ?mode= filter.
//
// PRIVACY CONTRACT (absolute, non-negotiable):
//   - workerId and tenantId ALWAYS from session — never from query params or body
//   - Returns ONLY published partners — draft/archived are never returned
//   - No worker interaction data stored or returned (no click tracking)
//   - employer roles receive 403 — never see this data
//   - No individual worker preference or interest data in the response
//
// Callable by: WORKER only.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const VALID_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
const VALID_MODES   = ['online', 'onsite', 'hybrid'] as const;
type Pillar = typeof VALID_PILLARS[number];
type Mode   = typeof VALID_MODES[number];

export type PartnerCatalogItem = {
  id:            string;
  name:          string;
  description:   string | null;
  pillar:        Pillar;
  category:      string | null;
  website_url:   string | null;
  city:          string | null;
  country:       string;
  delivery_mode: Mode;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  // workerId from session — never from request params
  const auth = await requireWorkerUser(request);
  if (isKoraAuthError(auth)) return auth;

  const pillarFilter = request.nextUrl.searchParams.get('pillar');
  const modeFilter   = request.nextUrl.searchParams.get('mode');

  const db = getSupabaseServiceClient();

  let query = db
    .schema('network')
    .from('partner_profile')
    .select('id, name, description, pillar, category, website_url, city, country, delivery_mode')
    .eq('status', 'published')   // workers see ONLY published
    .order('pillar', { ascending: true });

  if (pillarFilter && VALID_PILLARS.includes(pillarFilter as Pillar)) {
    query = query.eq('pillar', pillarFilter);
  }
  if (modeFilter && VALID_MODES.includes(modeFilter as Mode)) {
    query = query.eq('delivery_mode', modeFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero partner.' }, { status: 500 });
  }

  return NextResponse.json({
    ok:      true,
    partners: data ?? [],
    privacy: {
      not_employer_visible:        true,
      no_individual_click_tracking: true,
      notice: 'La tua navigazione tra i partner non viene mostrata al datore di lavoro.',
    },
  });
}

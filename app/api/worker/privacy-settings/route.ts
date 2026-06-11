// app/api/worker/privacy-settings/route.ts
// B122: Worker privacy & sharing settings — informational endpoint.
//
// Returns the worker's current privacy model: what is private, what is
// aggregated, and what future sharing controls will look like.
//
// Identity: workerId and tenantId ALWAYS from session — never from request params.
// No migration required: this sprint is informational only. No sharing toggles active yet.

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';

export const runtime = 'nodejs';

export type PrivacySettingsResponse = {
  ok: true;
  privacyStatus: {
    workspacePrivate:       boolean;
    dynamicCvPrivate:       boolean;
    participationPrivate:   boolean;
    onlyAggregatedVisible:  boolean;
  };
  sharingControls: {
    cvShareEnabled:          boolean;
    cvPublicLinkEnabled:     boolean;
    linkedInShareEnabled:    boolean;
  };
  privateData:    string[];
  aggregatedData: string[];
  futureSharing:  string[];
  interpretationNote: string;
};

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // workerId and tenantId from session only — never accepted from URL params
  const { workerId, tenantId } = auth;
  void workerId;
  void tenantId;

  const body: PrivacySettingsResponse = {
    ok: true,
    privacyStatus: {
      workspacePrivate:       true,
      dynamicCvPrivate:       true,
      participationPrivate:   true,
      onlyAggregatedVisible:  true,
    },
    sharingControls: {
      cvShareEnabled:       false,
      cvPublicLinkEnabled:  false,
      linkedInShareEnabled: false,
    },
    privateData: [
      'Il tuo Dynamic Impact CV',
      'La tua storia di partecipazione alle iniziative',
      'I tuoi interessi personali e le note private',
      'Lo stato del tuo onboarding KORA',
      'I tuoi dati di benessere e percorso formativo individuale',
    ],
    aggregatedData: [
      'Tasso di attivazione aziendale (media anonima aggregata)',
      'Distribuzione pillar a livello company (senza identificazione individuale)',
      'KORA Index (indicatore organizzativo, non individuale)',
    ],
    futureSharing: [
      'Condivisione selettiva del CV KORA (sempre sotto il tuo controllo)',
      'Snapshot pubblico anonimo (consenso esplicito, revocabile)',
    ],
    interpretationNote:
      'KORA misura le organizzazioni, non valuta i singoli lavoratori. ' +
      'Il tuo datore di lavoro non vede mai dati individuali. ' +
      'Solo medie aggregate anonime sono visibili a livello aziendale.',
  };

  return NextResponse.json(body);
}

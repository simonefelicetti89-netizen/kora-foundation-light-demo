// lib/my-kora/nextActionLogic.ts
// B98-B — Deterministic next-action engine for the worker home page.
// Pure function: no AI, no ranking, no gamification, no external calls.
// Inputs: pillar breakdown + activity counts + shareable CV count.

import type { PillarPreview } from '@/services/my-kora-preview/MyKoraPreviewService';

export type NextActionId =
  | 'first_verified_activity'
  | 'weak_pillar_connection'
  | 'weak_pillar_impact'
  | 'weak_pillar_growth'
  | 'weak_pillar_life'
  | 'weak_pillar_legacy'
  | 'dynamic_cv_empty'
  | 'explore_commons'
  | 'default';

export type NextAction = {
  id:          NextActionId;
  title:       string;       // short action sentence
  description: string;       // one line explanation
  cta_label:   string;
  cta_href:    string;
};

const PILLAR_ACTION_MAP: Record<string, { id: NextActionId; title: string; description: string; cta_href: string }> = {
  CONNECTION: {
    id:          'weak_pillar_connection',
    title:       'Esplora un\'iniziativa di connessione.',
    description: 'Il tuo pillar CONNECTION ha spazio di crescita. Mentoring e community building sono ottimi punti di partenza.',
    cta_href:    '/my-kora/opportunities',
  },
  IMPACT: {
    id:          'weak_pillar_impact',
    title:       'Scopri un\'opportunità di impatto territoriale.',
    description: 'Il pillar IMPACT è poco sviluppato nel tuo profilo. Un\'attività di volontariato o progetto ESG può arricchirlo.',
    cta_href:    '/my-kora/opportunities',
  },
  LEGACY: {
    id:          'weak_pillar_legacy',
    title:       'Condividi la tua esperienza con un collega.',
    description: 'Il pillar LEGACY cresce attraverso il trasferimento di conoscenza. Un\'attività di mentoring è il punto di partenza ideale.',
    cta_href:    '/my-kora/opportunities',
  },
  GROWTH: {
    id:          'weak_pillar_growth',
    title:       'Completa una formazione o certificazione.',
    description: 'Il pillar GROWTH beneficia di percorsi formativi verificati. Una certificazione LMS genera Impact Units di alta qualità.',
    cta_href:    '/my-kora/opportunities',
  },
  LIFE: {
    id:          'weak_pillar_life',
    title:       'Attiva un programma di benessere.',
    description: 'Il pillar LIFE si nutre di iniziative di salute, prevenzione e benessere. Inizia con un check prevenzione annuale.',
    cta_href:    '/my-kora/opportunities',
  },
};

// Returns the deterministic next action for a worker.
// Priority order:
//   1. No verified activities yet → first step
//   2. Strong pillar (>= 40) but weak pillar (<= 20, events <= 2) → balance suggestion
//   3. No shareable CV items → Dynamic CV is empty
//   4. Good overall progress (>= 50) → explore Commons
//   5. Default → explore opportunities
export function computeNextAction(
  pillarBreakdown: PillarPreview[],
  shareableCount:  number,
  verifiedCount:   number,
  overallIndex:    number,
): NextAction {
  // 1. No verified activities at all
  if (verifiedCount === 0) {
    return {
      id:          'first_verified_activity',
      title:       'Completa una prima attività verificata.',
      description: 'Non hai ancora attività verificate nel tuo profilo. Un\'attività verificata è il fondamento del tuo percorso KORA.',
      cta_label:   'Vedi opportunità',
      cta_href:    '/my-kora/opportunities',
    };
  }

  // 2. Imbalance: strong pillar >= 40, weakest active pillar <= 20 with few events
  if (pillarBreakdown.length > 0) {
    const maxScore = Math.max(...pillarBreakdown.map((p) => p.score));
    if (maxScore >= 40) {
      // Find weakest pillar with score <= 20 and event_count <= 2
      const weakest = pillarBreakdown
        .filter((p) => p.score <= 20 && p.event_count <= 2)
        .sort((a, b) => a.score - b.score)[0];

      if (weakest && PILLAR_ACTION_MAP[weakest.pillar]) {
        const action = PILLAR_ACTION_MAP[weakest.pillar];
        return { ...action, cta_label: 'Esplora opportunità' };
      }
    }
  }

  // 3. No shareable CV items
  if (shareableCount === 0) {
    return {
      id:          'dynamic_cv_empty',
      title:       'Aggiungi un\'attività verificata al tuo Dynamic CV.',
      description: 'Il tuo Dynamic CV non ha ancora elementi condivisibili. Un\'attività con verifica esterna lo sblocca.',
      cta_label:   'Vedi Dynamic CV',
      cta_href:    '/my-kora/dynamic-cv',
    };
  }

  // 4. Strong overall progress — point to Commons
  if (overallIndex >= 50) {
    return {
      id:          'explore_commons',
      title:       'Scopri opportunità nel Commons.',
      description: 'Il tuo percorso è solido. KORA Commons ti mostra iniziative di attivazione aperte nella rete.',
      cta_label:   'Esplora Commons',
      cta_href:    '/commons',
    };
  }

  // 5. Default
  return {
    id:          'default',
    title:       'Scopri le opportunità disponibili per te.',
    description: 'Esplora le iniziative suggerite in base al tuo profilo di attivazione.',
    cta_label:   'Vedi opportunità',
    cta_href:    '/my-kora/opportunities',
  };
}

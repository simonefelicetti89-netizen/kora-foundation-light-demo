// lib/living-koral-mark/accessible-description.ts
// KORA-WP-117 — Expression Mode Runtime + KORAL Mark Export.
//
// The Mark cannot be the sole representation of state (Founder
// Engineering Adjudication §32, report 178 §0.10) — a safe textual
// summary, generated from the SAME Expression Mode positive-allow-list
// payload the renderer itself consumes (never richer), must accompany
// it. Neutral structural facts only: which canonical domains are
// represented, how many structural elements are present. Never maturity,
// quality, health, strength, or any other evaluative language (Founder
// Engineering Adjudication §16/§32) — this module cannot even construct
// such language, since ExpressionModeMarkPayload carries no field any
// evaluative claim could be derived from.

import { domainLabel } from '@/lib/living-koral-company-view/company-view-service';
import type { ExpressionModeMarkPayload } from './types';

export function describeMarkAccessibly(payload: ExpressionModeMarkPayload): string {
  if (payload.domains.length === 0) {
    return 'Nessuna area strutturale rappresentata al momento in questa Edizione.';
  }

  const sentences = payload.domains.map((domainEntry) => {
    const presentCount = domainEntry.elements.filter((el) => el.present).length;
    const label = domainLabel(domainEntry.domain);
    const noun = presentCount === 1 ? 'elemento strutturale presente' : 'elementi strutturali presenti';
    return `${label}: ${presentCount} ${noun}.`;
  });

  return sentences.join(' ');
}

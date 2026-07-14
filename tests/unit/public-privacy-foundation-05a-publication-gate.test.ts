// tests/unit/public-privacy-foundation-05a-publication-gate.test.ts
// PUBLIC-PRIVACY-FOUNDATION-05A — accidental-publication gate.
//
// PURPOSE: fail loudly, on purpose, for as long as the public /privacy page
// still contains unresolved legal placeholders. This is the mechanism that
// prevents shipping a false "complete" privacy policy.
//
// SCOPE: strictly the public legal content (lib/legal/privacy-content.ts +
// app/privacy/page.tsx). Does NOT scan docs/**/*.md or any internal
// documentation — those legitimately use "TODO"/"da confermare" markers to
// track planning gaps, and scanning them here would be scope creep well
// beyond "protezione dalla pubblicazione accidentale" of a public page.
//
// NOT SKIPPED. NOT GATED BEHIND AN ENV VAR. As of 2026-07-14 (updated in
// PUBLIC-PRIVACY-FOUNDATION-05B/05C) this test is EXPECTED TO FAIL — 5 legal
// placeholders are still unresolved (6 of the original 11 were confirmed
// directly by the titolare in 05B). That failure is the intended, correct
// behavior: it is the publication gate working as designed, not a bug to
// silence. It will start passing on its own, with no code change needed,
// once every placeholder in lib/legal/privacy-content.ts is replaced with
// confirmed content.
//
// What's still needed, and its nature (technical fact vs. controller
// decision vs. contractual verification) is classified in
// docs/PUBLIC_PRIVACY_FOUNDATION_05A_LEGAL_INPUT_REQUIRED.md — full research
// and prudent (not-yet-approved) proposals for basi giuridiche and retention
// are in docs/PUBLIC_PRIVACY_FOUNDATION_05C_PROVIDER_RETENTION_VERIFICATION.md.
// This test itself stays deliberately simple (count placeholder objects) —
// the classification is a planning aid for humans, not something the gate
// needs to compute at runtime.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PRIVACY_SECTIONS } from '@/lib/legal/privacy-content';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

// Literal markers that must never survive into a page presented as the
// final, publication-ready privacy policy.
const FORBIDDEN_MARKERS = ['[DA COMPLETARE', 'TODO', 'TBD', 'FIXME', 'XXX:'];

describe('PUBLIC-PRIVACY-FOUNDATION-05A — publication gate (scoped to public legal content only)', () => {
  it('nessun paragrafo di testo semplice (non-placeholder) contiene un marker vietato — verifica indipendente dal wrapper tipizzato', () => {
    // This check is independent of the typed-placeholder system below: it
    // catches the failure mode where someone writes an unresolved marker as
    // a plain string paragraph instead of using the ph() placeholder
    // object — which would otherwise slip past a check that only inspects
    // placeholder objects.
    for (const section of PRIVACY_SECTIONS) {
      for (const paragraph of section.paragraphs) {
        if (typeof paragraph === 'string') {
          for (const marker of FORBIDDEN_MARKERS) {
            expect(paragraph, `sezione "${section.id}" contiene un marker non gestito: ${marker}`).not.toContain(marker);
          }
        }
      }
    }
  });

  it('GATE DI PUBBLICAZIONE: nessuna sezione della privacy policy pubblica contiene ancora un placeholder legale non risolto', () => {
    const unresolved: string[] = [];
    for (const section of PRIVACY_SECTIONS) {
      for (const paragraph of section.paragraphs) {
        if (typeof paragraph === 'object' && paragraph.placeholder === true) {
          unresolved.push(`[${section.id}] ${paragraph.label}`);
        }
      }
    }

    if (unresolved.length > 0) {
      throw new Error(
        `PRIVACY POLICY NON PRONTA PER LA PUBBLICAZIONE — ${unresolved.length} placeholder legale/i non risolto/i:\n` +
        unresolved.map((u) => `  - ${u}`).join('\n') +
        '\nQuesto è un fallimento intenzionale (publication gate), non un bug. ' +
        'Vedi docs/PUBLIC_PRIVACY_FOUNDATION_05A_LEGAL_INPUT_REQUIRED.md per i dati richiesti e da chi.'
      );
    }
  });

  it('la pagina renderizzata (app/privacy/page.tsx + LegalSection.tsx) non nasconde i placeholder dietro un flag/env — nessun bypass', () => {
    const page = read('app/privacy/page.tsx');
    const section = read('components/legal/LegalSection.tsx');
    for (const src of [page, section]) {
      expect(src).not.toMatch(/process\.env\.[A-Z_]*(SKIP|HIDE|BYPASS)/i);
      expect(src).not.toContain('NODE_ENV');
    }
  });
});

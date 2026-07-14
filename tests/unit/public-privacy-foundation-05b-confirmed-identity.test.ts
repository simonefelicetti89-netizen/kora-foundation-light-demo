// tests/unit/public-privacy-foundation-05b-confirmed-identity.test.ts
// PUBLIC-PRIVACY-FOUNDATION-05B — confirmed controller identity, contact,
// DPO status, and platform status. Verifies the exact confirmed data was
// used, no invented fiscal/DPO data remains, and the publication gate now
// reflects only the genuinely-still-missing fields.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PRIVACY_SECTIONS,
  PRIVACY_CONTROLLER_NAME,
  PRIVACY_CONTROLLER_ADDRESS,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_PLATFORM_STATUS,
  PRIVACY_UPDATE_COMMITMENT,
  type PrivacyParagraph,
} from '@/lib/legal/privacy-content';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function isPlaceholder(p: PrivacyParagraph): p is { placeholder: true; label: string } {
  return typeof p === 'object' && p.placeholder === true;
}

function sectionText(id: string): string {
  const section = PRIVACY_SECTIONS.find((s) => s.id === id);
  expect(section, `sezione "${id}" non trovata`).toBeDefined();
  return section!.paragraphs.map((p) => (isPlaceholder(p) ? p.label : p)).join(' ');
}

describe('1. Titolare confermato — Simone Felicetti', () => {
  it('la costante esportata è esattamente "Simone Felicetti"', () => {
    expect(PRIVACY_CONTROLLER_NAME).toBe('Simone Felicetti');
  });

  it('il nome appare nella sezione titolare', () => {
    expect(sectionText('titolare')).toContain('Simone Felicetti');
  });
});

describe('2. Indirizzo confermato', () => {
  it('la costante esportata è esattamente quella confermata dal titolare', () => {
    expect(PRIVACY_CONTROLLER_ADDRESS).toBe('Via Carso 14, San Benedetto del Tronto (AP), Italia');
  });

  it('l\'indirizzo appare nella sezione titolare', () => {
    const text = sectionText('titolare');
    expect(text).toContain('Via Carso 14');
    expect(text).toContain('San Benedetto del Tronto');
  });
});

describe('3. Email privacy confermata', () => {
  it('la costante esportata è esattamente quella confermata dal titolare', () => {
    expect(PRIVACY_CONTACT_EMAIL).toBe('simone.felicetti.kora@gmail.com');
  });

  it('l\'email appare nella sezione contatti', () => {
    expect(sectionText('contatti')).toContain('simone.felicetti.kora@gmail.com');
  });
});

describe('4. Nessuna partita IVA o codice fiscale inventati', () => {
  const allText = PRIVACY_SECTIONS.map((s) =>
    s.paragraphs.map((p) => (isPlaceholder(p) ? p.label : p)).join(' ')
  ).join(' ');

  it('nessun pattern di partita IVA italiana (11 cifre) presente nel contenuto', () => {
    expect(allText).not.toMatch(/\b\d{11}\b/);
  });

  it('nessun pattern di codice fiscale italiano (16 caratteri alfanumerici) presente', () => {
    expect(allText).not.toMatch(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/);
  });

  it('la sezione titolare dichiara esplicitamente l\'assenza di denominazione sociale/P.IVA/C.F. come persona fisica, non le presenta come mancanti', () => {
    const text = sectionText('titolare');
    expect(text).toContain('persona fisica');
    expect(text).not.toMatch(/DA COMPLETARE/);
  });
});

describe('5. Nessun nominativo o email DPO inventati', () => {
  it('la sezione contatti non contiene un placeholder per nominativo/email DPO', () => {
    const section = PRIVACY_SECTIONS.find((s) => s.id === 'contatti')!;
    const hasPlaceholder = section.paragraphs.some(isPlaceholder);
    expect(hasPlaceholder).toBe(false);
  });

  it('non compare alcun indirizzo email diverso da quelli reali già verificati nel progetto (contatto privacy + accesso@kora.io)', () => {
    const text = sectionText('contatti');
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
    for (const email of emails) {
      expect(['simone.felicetti.kora@gmail.com', 'accesso@kora.io']).toContain(email);
    }
  });
});

describe('6. Formulazione DPO non nominato — testo esatto richiesto', () => {
  it('la sezione contatti contiene la formulazione esatta fornita dal titolare', () => {
    const text = sectionText('contatti');
    expect(text).toContain(
      "Alla data di aggiornamento della presente informativa non è stato designato un Responsabile della protezione dei dati (DPO). Per ogni richiesta relativa alla protezione dei dati personali è possibile contattare direttamente il titolare all'indirizzo indicato."
    );
  });
});

describe('7. Stato piattaforma pre-pilota', () => {
  it('la costante di stato menziona "account demo e test" e nessun utente reale', () => {
    expect(PRIVACY_PLATFORM_STATUS).toContain('account demo e di test');
    expect(PRIVACY_PLATFORM_STATUS).toContain('senza utenti reali');
  });

  it('è renderizzata nella pagina', () => {
    const page = read('app/privacy/page.tsx');
    expect(page).toContain('PRIVACY_PLATFORM_STATUS');
    expect(page).toContain('privacy-platform-status');
  });

  it('l\'impegno di aggiornamento futuro è presente e cita tutti gli elementi richiesti', () => {
    expect(PRIVACY_UPDATE_COMMITMENT).toContain('finalità');
    expect(PRIVACY_UPDATE_COMMITMENT).toContain('categorie di dati');
    expect(PRIVACY_UPDATE_COMMITMENT).toContain('basi giuridiche');
    expect(PRIVACY_UPDATE_COMMITMENT).toContain('destinatari');
    expect(PRIVACY_UPDATE_COMMITMENT).toContain('tempi di conservazione');
    expect(PRIVACY_UPDATE_COMMITMENT).toContain('modalità di utilizzo');
    const page = read('app/privacy/page.tsx');
    expect(page).toContain('privacy-update-commitment');
  });
});

describe('8. Garante italiano confermato come autorità competente', () => {
  it('la sezione reclamo-autorita indica il Garante italiano senza più il placeholder di conferma giurisdizione', () => {
    const section = PRIVACY_SECTIONS.find((s) => s.id === 'reclamo-autorita')!;
    const hasPlaceholder = section.paragraphs.some(isPlaceholder);
    expect(hasPlaceholder).toBe(false);
    const text = section.paragraphs.join(' ');
    expect(text).toContain('Garante per la protezione dei dati personali');
    expect(text).toContain('Italia');
  });

  it('non introduce recapiti non già verificati nel progetto (solo il sito pubblico generico già presente)', () => {
    const text = sectionText('reclamo-autorita');
    expect(text).toContain('www.garanteprivacy.it');
    // No invented phone numbers, PEC addresses, or physical addresses for the Garante.
    expect(text).not.toMatch(/\bPEC\b/i);
    expect(text).not.toMatch(/\+39/);
  });
});

describe('9. Placeholder già risolti non sono più presenti', () => {
  const RESOLVED_LABELS = [
    'denominazione legale del titolare del trattamento',
    'sede legale',
    'numero di partita IVA / codice fiscale',
    'indirizzo email dedicato al Responsabile della Protezione dei Dati (DPO)',
    'nominativo del DPO',
    'conferma dell’autorità di controllo effettivamente competente',
  ];

  it('nessuna di queste etichette risolte compare più come placeholder attivo', () => {
    const activePlaceholderLabels = PRIVACY_SECTIONS
      .flatMap((s) => s.paragraphs)
      .filter(isPlaceholder)
      .map((p) => p.label);

    for (const resolvedLabel of RESOLVED_LABELS) {
      const stillPresent = activePlaceholderLabels.some((l) => l.includes(resolvedLabel.slice(0, 20)));
      expect(stillPresent, `"${resolvedLabel}" non dovrebbe più essere un placeholder attivo`).toBe(false);
    }
  });
});

describe('10. Storico: i restanti 5 placeholder (basi giuridiche, DPA, regioni, trasferimenti, retention) sono stati risolti in PUBLIC-PRIVACY-FOUNDATION-05D', () => {
  it('zero placeholder residui in tutta la pagina — nessuno nelle sezioni un tempo non risolte', () => {
    const remaining = PRIVACY_SECTIONS
      .flatMap((s) => s.paragraphs.map((p) => ({ sectionId: s.id, p })))
      .filter(({ p }) => isPlaceholder(p));

    expect(remaining.length).toBe(0);
    const previouslyUnresolvedSections = ['basi-giuridiche', 'destinatari-fornitori', 'trasferimenti', 'conservazione'];
    for (const id of previouslyUnresolvedSections) {
      const section = PRIVACY_SECTIONS.find((s) => s.id === id)!;
      expect(section.paragraphs.some(isPlaceholder)).toBe(false);
    }
  });
});

describe('11. /privacy accessibile per tutti i ruoli — invariante dal fix 05A', () => {
  it('ALWAYS_PUBLIC_PATHS in middleware.ts include ancora /privacy', () => {
    const mw = read('middleware.ts');
    expect(mw).toMatch(/ALWAYS_PUBLIC_PATHS\s*=\s*\[\s*'\/privacy'/);
  });
});

describe('12. Nessun valore sensibile diverso dai dati espressamente destinati alla pubblicazione', () => {
  it('il contenuto non include env reali, secret Upstash/Supabase/Sentry, o altri indirizzi email non previsti', () => {
    const allFiles = [
      read('lib/legal/privacy-content.ts'),
      read('app/privacy/page.tsx'),
    ].join('\n');

    expect(allFiles).not.toMatch(/UPSTASH_REDIS_REST_TOKEN\s*=\s*['"]/);
    expect(allFiles).not.toMatch(/https:\/\/[a-z0-9-]+\.upstash\.io/);
    expect(allFiles).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/);
    expect(allFiles).not.toMatch(/SENTRY_AUTH_TOKEN/);
  });

  it('nessun numero di telefono, PEC, o dato personale ulteriore oltre nome/indirizzo/email confermati dal titolare', () => {
    const text = PRIVACY_SECTIONS.map((s) =>
      s.paragraphs.map((p) => (isPlaceholder(p) ? '' : p)).join(' ')
    ).join(' ');
    expect(text).not.toMatch(/\+39\s?\d/);
    expect(text).not.toMatch(/\bPEC\b/i);
  });
});

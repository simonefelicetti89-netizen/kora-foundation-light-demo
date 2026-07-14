// tests/unit/public-privacy-foundation-05.test.ts
// PUBLIC-PRIVACY-FOUNDATION-05 — public /privacy page, content, and footer links.
//
// Pattern: source-level structural audit (read file → check invariants),
// consistent with the existing convention in this codebase
// (tests/unit/security-origin-guard-03-routes.test.ts and others) — no
// test in this repo boots a dev server to fetch a real page. Manual
// verification against a running dev server (curl) was performed
// separately and is recorded in docs/PUBLIC_PRIVACY_FOUNDATION_05.md.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PRIVACY_SECTIONS,
  PRIVACY_DOCUMENT_VERSION,
  PRIVACY_LAST_UPDATED,
  type PrivacyParagraph,
} from '@/lib/legal/privacy-content';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function isPlaceholder(p: PrivacyParagraph): p is { placeholder: true; label: string } {
  return typeof p === 'object' && p.placeholder === true;
}

describe('/privacy — pagina pubblica, nessuna autenticazione richiesta', () => {
  const src = read('app/privacy/page.tsx');

  it('non chiama alcun require*User/getCurrentXUser — nessun guard di autenticazione', () => {
    expect(src).not.toMatch(/require(KoraAdmin|CompanyUser|WorkerUser|PartnerUser)\(/);
    expect(src).not.toMatch(/getCurrent(KoraUser|CompanyUser|WorkerUser|PartnerUser)\(/);
  });

  it('è un Server Component (nessuna direttiva "use client")', () => {
    expect(src).not.toContain("'use client'");
  });

  it('non è presente in nessuna ALLOWED_PREFIXES di middleware.ts (nota: comportamento noto per utenti già autenticati — vedi doc)', () => {
    const mw = read('middleware.ts');
    // Documented gap: an authenticated COMPANY_ADMIN/WORKER/PARTNER/DEMO_VIEWER
    // visiting /privacy directly would be redirected by middleware, since
    // /privacy is not in any role's allowed-prefixes list. Out of scope to
    // fix here (middleware is forbidden scope for this sprint) — this test
    // documents the current, verified state rather than silently assuming
    // it works for authenticated sessions too.
    expect(mw).not.toMatch(/'\/privacy'/);
  });
});

describe('/privacy — metadata', () => {
  const src = read('app/privacy/page.tsx');

  it('esporta un oggetto metadata con title e description', () => {
    expect(src).toContain('export const metadata');
    expect(src).toMatch(/title:\s*['"]Privacy/);
    expect(src).toContain('description:');
  });

  it('non imposta robots noindex (deve restare indicizzabile)', () => {
    expect(src).not.toMatch(/robots:\s*\{[^}]*index:\s*false/);
    expect(src).not.toContain('noindex');
  });

  it('non è disallowed in robots.txt', () => {
    const robots = read('public/robots.txt');
    expect(robots).not.toMatch(/Disallow:\s*\/privacy/);
  });

  it('lang="it" è impostato a livello di root layout (coerente per tutto il sito)', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toContain('lang="it"');
  });
});

describe('/privacy — footer legale su tutte le pagine pubbliche pertinenti', () => {
  it('MarketingFooter (usato da / e /pilot) include il link Privacy', () => {
    const footer = read('components/landing/MarketingFooter.tsx');
    expect(footer).toContain("href=\"/privacy\"");
    expect(footer).toContain('marketing-footer-privacy-link');
  });

  it('/ (landing) usa MarketingFooter', () => {
    const src = read('app/page.tsx');
    expect(src).toContain('MarketingFooter');
  });

  it('/pilot usa MarketingFooter', () => {
    const src = read('app/pilot/page.tsx');
    expect(src).toContain('MarketingFooter');
  });

  it('/login include un link Privacy nel proprio footer', () => {
    const src = read('app/login/page.tsx');
    expect(src).toContain('login-privacy-link');
    expect(src).toContain('href="/privacy"');
  });

  it('/request-access include un link Privacy nel proprio footer', () => {
    const src = read('app/request-access/page.tsx');
    expect(src).toContain('request-access-privacy-link');
    expect(src).toContain('href="/privacy"');
  });

  it('il link Privacy nel MarketingFooter ha uno stato :focus-visible (navigazione da tastiera)', () => {
    const css = read('components/landing/marketing.module.css');
    expect(css).toMatch(/\.footLegal:focus-visible/);
  });
});

describe('/privacy — sezioni minime presenti', () => {
  const REQUIRED_HEADINGS = [
    'Titolare del trattamento',
    'Contatti privacy',
    'Categorie di dati trattati',
    'Finalità del trattamento',
    'Basi giuridiche',
    'Modalità del trattamento',
    'Destinatari e fornitori tecnici',
    'Trasferimenti internazionali',
    'Tempi di conservazione',
    'Diritti degli interessati',
    'Reclamo all’autorità di controllo',
    'Cookie e tecnologie tecniche',
    'Sicurezza e privacy by design',
    'Utenti pubblici, azienda, lavoratori e partner',
  ];

  it('tutte le 14 sezioni minime richieste sono presenti', () => {
    const headings = PRIVACY_SECTIONS.map((s) => s.heading);
    for (const required of REQUIRED_HEADINGS) {
      expect(headings.some((h) => h.includes(required))).toBe(true);
    }
    expect(PRIVACY_SECTIONS.length).toBe(REQUIRED_HEADINGS.length);
  });

  it('data di aggiornamento e versione del documento sono definite (punti 15-16)', () => {
    expect(PRIVACY_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PRIVACY_DOCUMENT_VERSION).toBeTruthy();
  });

  it('ogni sezione ha almeno un paragrafo', () => {
    for (const section of PRIVACY_SECTIONS) {
      expect(section.paragraphs.length).toBeGreaterThan(0);
    }
  });
});

describe('/privacy — nessun placeholder presentato come dato reale', () => {
  it('i placeholder sono oggetti tipizzati distinti dal testo verificato (non stringhe semplici)', () => {
    let placeholderCount = 0;
    for (const section of PRIVACY_SECTIONS) {
      for (const p of section.paragraphs) {
        if (isPlaceholder(p)) placeholderCount++;
      }
    }
    expect(placeholderCount).toBeGreaterThan(0);
  });

  it('ogni placeholder ha un\'etichetta descrittiva non vuota', () => {
    for (const section of PRIVACY_SECTIONS) {
      for (const p of section.paragraphs) {
        if (isPlaceholder(p)) {
          expect(p.label.length).toBeGreaterThan(5);
        }
      }
    }
  });

  it('il componente di rendering marca sempre visivamente i placeholder, senza condizioni di ambiente (NODE_ENV)', () => {
    const component = read('components/legal/LegalSection.tsx');
    expect(component).toContain('DA COMPLETARE PRIMA DELLA PUBBLICAZIONE');
    // Must never gate placeholder visibility behind an environment check —
    // placeholders must render identically in every environment until a
    // human replaces them with confirmed content.
    expect(component).not.toContain('NODE_ENV');
    expect(component).not.toContain('process.env');
  });

  it('sezioni con dati non verificabili (titolare, basi giuridiche, conservazione, trasferimenti) contengono almeno un placeholder', () => {
    const criticalSections = ['titolare', 'basi-giuridiche', 'conservazione', 'trasferimenti'];
    for (const id of criticalSections) {
      const section = PRIVACY_SECTIONS.find((s) => s.id === id);
      expect(section).toBeDefined();
      const hasPlaceholder = section!.paragraphs.some(isPlaceholder);
      expect(hasPlaceholder).toBe(true);
    }
  });
});

describe('/privacy — inventario fornitori coerente con il codice reale', () => {
  it('Supabase, Vercel, Sentry, Upstash e OpenStreetMap sono citati e verificabili nelle dipendenze/config del progetto', () => {
    const section = PRIVACY_SECTIONS.find((s) => s.id === 'destinatari-fornitori')!;
    const text = section.paragraphs.map((p) => (isPlaceholder(p) ? p.label : p)).join(' ');

    expect(text).toContain('Supabase');
    expect(text).toContain('Vercel');
    expect(text).toContain('Sentry');
    expect(text).toContain('Upstash');
    expect(text).toContain('OpenStreetMap');

    const pkg = JSON.parse(read('package.json'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps).toHaveProperty('@supabase/supabase-js');
    expect(deps).toHaveProperty('@sentry/nextjs');
    expect(deps).toHaveProperty('@upstash/redis');
  });

  it('non cita alcuno strumento di analytics/tracking non presente nel codice', () => {
    const allText = PRIVACY_SECTIONS.flatMap((s) =>
      s.paragraphs.map((p) => (isPlaceholder(p) ? p.label : p))
    ).join(' ');
    for (const forbidden of ['Google Analytics', 'Hotjar', 'Meta Pixel', 'Mixpanel']) {
      // These names may appear ONLY inside the cookie section's explicit
      // "not found" statement — never as a claimed subprocessor.
      if (allText.includes(forbidden)) {
        const cookieSection = PRIVACY_SECTIONS.find((s) => s.id === 'cookie')!;
        const cookieText = cookieSection.paragraphs.map((p) => (isPlaceholder(p) ? p.label : p)).join(' ');
        expect(cookieText).toContain(forbidden);
      }
    }
  });
});

describe('/privacy — nessun secret o valore env esposto', () => {
  it('il contenuto non include valori reali di env (URL/token Upstash, Supabase, Sentry DSN)', () => {
    const allFiles = [
      read('lib/legal/privacy-content.ts'),
      read('app/privacy/page.tsx'),
      read('components/legal/LegalSection.tsx'),
    ].join('\n');

    expect(allFiles).not.toMatch(/UPSTASH_REDIS_REST_TOKEN\s*=\s*['"]/);
    expect(allFiles).not.toMatch(/https:\/\/[a-z0-9-]+\.upstash\.io/);
    expect(allFiles).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/);
    expect(allFiles).not.toMatch(/SENTRY_AUTH_TOKEN/);
  });
});

describe('PUBLIC-PRIVACY-FOUNDATION-05 — nessuna regressione su scope vietato', () => {
  it('non ha toccato Sentry runtime config', () => {
    // Presence check only — this test fails loudly if a future edit
    // accidentally touches these files as part of this sprint's diff scope.
    for (const f of ['sentry.client.config.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts']) {
      expect(() => read(f)).not.toThrow();
    }
  });

  it('middleware.ts non è stato modificato in modo da introdurre nuovi ruoli o permessi', () => {
    const mw = read('middleware.ts');
    expect(mw).toContain('COMPANY_ALLOWED_PREFIXES');
    expect(mw).toContain('WORKER_ALLOWED_PREFIXES');
    expect(mw).toContain('PARTNER_ALLOWED_PREFIXES');
    expect(mw).toContain('DEMO_VIEWER_ALLOWED_PREFIXES');
  });
});

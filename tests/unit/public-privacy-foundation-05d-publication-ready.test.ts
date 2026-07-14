// tests/unit/public-privacy-foundation-05d-publication-ready.test.ts
// PUBLIC-PRIVACY-FOUNDATION-05D — approved legal bases, retention matrix,
// and prudent provider/transfer wording. Verifies the content matches
// exactly what the titolare approved, with no invented facts.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PRIVACY_SECTIONS, type PrivacyParagraph } from '@/lib/legal/privacy-content';

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

describe('1. Tutte le basi giuridiche approvate sono presenti', () => {
  const text = sectionText('basi-giuridiche');

  it('cita art. 6, par. 1, lett. b) per richieste di accesso/organizzazione demo e per account demo/test', () => {
    expect(text).toContain('art. 6, par. 1, lett. b), GDPR');
  });

  it('cita art. 6, par. 1, lett. f) per sicurezza, prevenzione abusi, legittimo interesse account demo, e tutela diritti', () => {
    const occurrences = (text.match(/art\. 6, par\. 1, lett\. f\), GDPR/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(3); // account demo (alt), sicurezza, tutela diritti
  });

  it('cita art. 6, par. 1, lett. c) per obblighi di legge', () => {
    expect(text).toContain('art. 6, par. 1, lett. c), GDPR');
  });

  it('copre tutte e 6 le finalità approvate', () => {
    expect(text).toContain('Richieste di accesso e organizzazione della demo');
    expect(text).toContain('Creazione e gestione degli account demo/test');
    expect(text).toContain('Sicurezza applicativa');
    expect(text).toContain('Gestione di richieste privacy, obblighi normativi');
    expect(text).toContain('Accertamento, esercizio o difesa di un diritto');
    expect(text).toContain('Dati volontariamente inseriti nella demo');
  });

  it('include la nota su rivalutazione del test di bilanciamento e della matrice prima di utenti reali', () => {
    expect(text).toContain('rivalutati');
    expect(text).toMatch(/aziende o lavoratori reali/);
  });
});

describe('2. Nessun consenso usato come base generale o residuale', () => {
  it('la sezione basi giuridiche dichiara esplicitamente che il consenso non è usato come base generale', () => {
    const text = sectionText('basi-giuridiche');
    expect(text).toContain('Il consenso non è utilizzato come base giuridica generale o residuale');
  });

  it('nessuna delle 6 finalità elencate usa il consenso come base primaria', () => {
    const section = PRIVACY_SECTIONS.find((s) => s.id === 'basi-giuridiche')!;
    const bulletParagraphs = section.paragraphs.filter(
      (p) => typeof p === 'string' && p.startsWith('—')
    ) as string[];
    expect(bulletParagraphs.length).toBe(6);
    for (const bullet of bulletParagraphs) {
      expect(bullet).not.toMatch(/base giuridica[^.]*consenso/i);
    }
  });
});

describe('3. Divieto di dati reali/particolari nelle demo', () => {
  it('la sezione basi giuridiche vieta esplicitamente dati reali di lavoratori, categorie particolari e dati giudiziari', () => {
    const text = sectionText('basi-giuridiche');
    expect(text).toContain('non devono essere inseriti dati reali di lavoratori');
    expect(text).toContain('categorie particolari di dati');
    expect(text).toContain('dati giudiziari');
    expect(text).toContain('dati sintetici, fittizi o adeguatamente anonimizzati');
  });
});

describe('4. Periodi di conservazione presenti e coerenti', () => {
  const text = sectionText('conservazione');

  it('richieste di accesso, account demo, dati demo, documenti/export: 90 giorni', () => {
    const occurrences = (text.match(/90 giorni/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(4);
  });

  it('CV share token: 30 giorni (coerente con DEFAULT_SHARE_TTL_DAYS nel codice)', () => {
    expect(text).toContain('30 giorni');
    const codeValue = read('lib/worker-cv/share-token.ts');
    expect(codeValue).toContain('DEFAULT_SHARE_TTL_DAYS = 30');
  });

  it('signed URL allegati: 300 secondi (coerente con MAX_SIGNED_URL_EXPIRY_SECONDS nel codice)', () => {
    expect(text).toContain('300 secondi');
    const codeValue = read('lib/data-intake/evidence-attachment-storage.ts');
    expect(codeValue).toContain('MAX_SIGNED_URL_EXPIRY_SECONDS = 300');
  });

  it('log applicativi e di sicurezza: 12 mesi', () => {
    expect(text).toContain('12 mesi');
  });

  it('rate-limit counters: legati alla finestra della policy tecnica', () => {
    expect(text).toContain('finestra prevista dalla relativa policy tecnica');
  });

  it('error tracking Sentry: retention del fornitore, da verificare/minimizzare prima di utenti reali', () => {
    expect(text).toContain('retention configurata nel servizio');
    expect(text).toContain('minimo disponibile prima dell’apertura a utenti reali');
  });

  it('obblighi legali/controversie: per il tempo strettamente necessario', () => {
    expect(text).toContain('per il tempo strettamente necessario');
  });
});

describe('5. Distinzione tra retention tecnica, organizzativa e provider-dependent', () => {
  const text = sectionText('conservazione');

  it('marca esplicitamente le voci tecniche già applicate', () => {
    const occurrences = (text.match(/\[tecnico — già applicato/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(3); // CV token, signed URL, rate limit
  });

  it('marca esplicitamente le voci organizzative (cancellazione manuale)', () => {
    const occurrences = (text.match(/\[organizzativo/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it('marca esplicitamente la voce dipendente dal fornitore (Sentry)', () => {
    expect(text).toContain('[dipendente dal fornitore — da verificare]');
  });
});

describe('6. Nessuna dichiarazione falsa di cleanup automatico', () => {
  it('dichiara esplicitamente che nessun sistema automatico generale di cancellazione è implementato', () => {
    const text = sectionText('conservazione');
    expect(text).toContain('Nessun sistema automatico generale di cancellazione/anonimizzazione');
    expect(text).toContain('gestita manualmente dal titolare');
  });

  it('le voci "organizzative" specificano cancellazione manuale, non automatica', () => {
    const text = sectionText('conservazione');
    expect(text).toMatch(/cancellazione manuale/);
    // Every mention of "automatica" near "cancellazione" must be a negation
    // (nessun.../non...) — never an unqualified positive claim that
    // automatic cleanup exists or is active.
    const sentences = text.split(/(?<=[.:])\s+/);
    for (const sentence of sentences) {
      if (/cancellazione automatica/i.test(sentence)) {
        // Either a negation (doesn't exist today) or a future-tense need
        // ("dovrà essere implementato") — never a present-tense positive
        // claim that automatic cleanup already exists/runs.
        expect(sentence).toMatch(/nessun|non è|nessuna|dovrà essere implementat/i);
      }
    }
  });

  it('nessun job di cleanup è stato implementato in questo sprint (verifica assenza tecnica)', () => {
    // No cron config, no cleanup script — matches the documented claim above.
    expect(existsSync(resolve(ROOT, 'vercel.json'))).toBe(false);
  });
});

describe('7. Fornitori elencati correttamente', () => {
  const text = sectionText('destinatari-fornitori');

  it('elenca Supabase, Vercel, Sentry, Upstash, OpenStreetMap/Nominatim', () => {
    expect(text).toContain('Supabase');
    expect(text).toContain('Vercel');
    expect(text).toContain('Sentry');
    expect(text).toContain('Upstash');
    expect(text).toContain('OpenStreetMap');
  });

  it('dichiara che l’elenco aggiornato può essere richiesto al titolare', () => {
    expect(text).toContain('potrà essere richiesto al titolare');
  });
});

describe('8. Nessun DPA dichiarato sottoscritto', () => {
  it('la sezione fornitori non afferma che un DPA è stato firmato/sottoscritto', () => {
    const text = sectionText('destinatari-fornitori');
    expect(text).not.toMatch(/DPA[^.]*(sottoscritt|firmat)/i);
    expect(text).toContain('saranno verificati e formalizzati prima dell’apertura della piattaforma a utenti reali');
  });
});

describe('9. Nessuna regione inventata', () => {
  it('nessuna sezione afferma una regione specifica dei server come fatto verificato', () => {
    const fornitoriText = sectionText('destinatari-fornitori');
    const trasferimentiText = sectionText('trasferimenti');
    const combined = fornitoriText + ' ' + trasferimentiText;
    // No specific cloud region codes or asserted country-of-hosting claims.
    expect(combined).not.toMatch(/\b(eu-west|eu-central|us-east|us-west)-?\d?\b/i);
    expect(combined).not.toMatch(/i dati sono trattati su server ubicati in/i);
  });

  it('la sezione trasferimenti dichiara che la configurazione tecnica sarà verificata, non la asserisce come nota', () => {
    const text = sectionText('trasferimenti');
    expect(text).toContain('sarà verificata e riesaminata prima dell’apertura');
  });
});

describe('10. Formulazione corretta sui trasferimenti extra SEE', () => {
  it('usa la formulazione condizionale approvata (Capo V GDPR, adeguatezza o garanzie appropriate)', () => {
    const text = sectionText('trasferimenti');
    expect(text).toContain('Qualora un fornitore comporti un trasferimento di dati personali al di fuori dello Spazio Economico Europeo');
    expect(text).toContain('Capo V del GDPR');
    expect(text).toMatch(/decisioni di adeguatezza o garanzie appropriate/);
  });

  it('non afferma che tutti i dati restano nello SEE', () => {
    const text = sectionText('trasferimenti');
    expect(text).not.toMatch(/tutti i dati (restano|rimangono) (nello|nell'|nell’)?\s*SEE/i);
  });

  it('non afferma un meccanismo di trasferimento specifico come già applicato senza condizione', () => {
    const text = sectionText('trasferimenti');
    // "clausole contrattuali standard" must appear within the SAME sentence
    // as "Qualora" (the conditional opener) — never as a standalone,
    // unconditional factual claim in a different sentence.
    const sentences = text.split(/(?<=[.:])\s+/);
    const sentenceWithClause = sentences.find((s) => s.includes('clausole contrattuali standard'));
    expect(sentenceWithClause).toBeDefined();
    expect(sentenceWithClause).toContain('Qualora');
  });
});

describe('11. Nessun placeholder residuo (gate verde)', () => {
  it('zero placeholder in tutta la pagina', () => {
    const total = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).filter(isPlaceholder).length;
    expect(total).toBe(0);
  });

  it('nessun marker TODO/TBD/[DA COMPLETARE nel contenuto reso come testo semplice', () => {
    const allText = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs)
      .filter((p): p is string => typeof p === 'string')
      .join(' ');
    for (const marker of ['[DA COMPLETARE', 'TODO', 'TBD', 'FIXME']) {
      expect(allText).not.toContain(marker);
    }
  });
});

describe('15. Nessun secret o valore env esposto nel contenuto aggiornato', () => {
  it('nessun URL/token reale di Upstash/Supabase/Sentry nel contenuto', () => {
    const allText = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs)
      .filter((p): p is string => typeof p === 'string')
      .join(' ');
    expect(allText).not.toMatch(/UPSTASH_REDIS_REST_TOKEN\s*=/);
    expect(allText).not.toMatch(/https:\/\/[a-z0-9-]+\.upstash\.io/);
    expect(allText).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/);
    expect(allText).not.toMatch(/SENTRY_AUTH_TOKEN/);
  });
});

// lib/legal/privacy-content.ts — PUBLIC-PRIVACY-FOUNDATION-05
//
// Single source of truth for the public /privacy page (app/privacy/page.tsx).
// Every statement here is either:
//   (a) grounded in verified code/config/docs (see the source comment above
//       each section), or
//   (b) an explicit placeholder object — never invented prose — flagged for
//       legal/founder confirmation before publication.
//
// Do not add a claim here that isn't backed by one of:
//   - actual code/config in this repo (cite the file);
//   - an existing project doc (docs/PILOT_PRIVACY_GOVERNANCE.md,
//     docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md, docs/access-matrix.md);
//   - a generic, jurisdiction-level legal fact (e.g. GDPR data-subject
//     rights, the existence of the Garante Privacy) that doesn't depend on
//     KORA-specific verification.
//
// See docs/PUBLIC_PRIVACY_FOUNDATION_05.md for the full inventory this file
// is derived from.

export type PrivacyParagraph = string | { placeholder: true; label: string };

export interface PrivacySection {
  id: string;
  heading: string;
  paragraphs: PrivacyParagraph[];
}

// Terser constructor for placeholder paragraphs — keeps the visible bracket
// format ([DA COMPLETARE PRIMA DELLA PUBBLICAZIONE: ...]) consistent.
function ph(label: string): PrivacyParagraph {
  return { placeholder: true, label };
}

export const PRIVACY_DOCUMENT_VERSION = '0.1';
export const PRIVACY_LAST_UPDATED = '2026-07-14';

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'titolare',
    heading: '1. Titolare del trattamento',
    paragraphs: [
      ph('denominazione legale del titolare del trattamento'),
      ph('sede legale'),
      ph('numero di partita IVA / codice fiscale'),
      'Questa sezione non è verificabile dal codice sorgente del progetto: nessuna ragione sociale, sede legale o partita IVA risulta configurata o documentata in KORA Foundation Light alla data di redazione.',
    ],
  },
  {
    id: 'contatti',
    heading: '2. Contatti privacy',
    paragraphs: [
      'Un canale di contatto generale già in uso nel prodotto per richieste di accesso è accesso@kora.io (vedi app/request-access/page.tsx). Questo canale può essere utilizzato oggi per inoltrare una richiesta relativa ai propri dati, in attesa che sia designato un contatto privacy dedicato.',
      ph('indirizzo email dedicato al Responsabile della Protezione dei Dati (DPO), se nominato'),
      ph('nominativo del DPO, se nominato'),
    ],
  },
  {
    id: 'categorie-dati',
    heading: '3. Categorie di dati trattati',
    paragraphs: [
      'Sulla base della verifica tecnica del codice sorgente (v. inventario in docs/PUBLIC_PRIVACY_FOUNDATION_05.md), KORA tratta le seguenti categorie di dati:',
      '— Dati di autenticazione: sessione e credenziali gestite da Supabase Auth (email, hash della password gestito da Supabase, JWT di sessione).',
      '— Identificativi tecnici: user ID, tenant ID (azienda), worker ID — identificatori opachi interni, non nomi in chiaro nelle superfici aziendali.',
      '— Dati worker: profilo personale, cronologia eventi, Dynamic Impact CV, preferenze di condivisione — visibili solo al lavoratore stesso, mai al datore di lavoro a livello individuale.',
      '— Dati azienda: metriche aggregate (KORA Index, tassi di attivazione, distribuzione per pilastro) — mai a livello di singolo lavoratore.',
      '— Dati partner: profilo organizzativo del partner e relative iniziative.',
      '— Dati KORA Link: funzionalità disattivata di default (feature flag) — nessun dato di attività individuale realmente raccolto in produzione allo stato attuale.',
      '— File caricati in fase di ingestion: i file grezzi non vengono conservati in storage — solo i record analizzati e sottoposti a controllo PII vengono persistiti (verificato in docs/PILOT_DATA_INTAKE_READINESS.md).',
      '— Log applicativi ed errori: tracciati da Sentry solo in produzione, senza session replay (verificato in sentry.client.config.ts).',
      '— Contatori di rate limiting: chiavi basate su identificativi opachi (id utente autenticato) o hash, mai IP o token in chiaro (verificato in lib/security/rate-limit.ts e lib/kora-link/rate-limit.ts).',
      '— Token e link: i token di condivisione (Dynamic CV, KORA Link) sono generati con alta entropia e mai conservati in chiaro — solo il loro hash è persistito.',
    ],
  },
  {
    id: 'finalita',
    heading: '4. Finalità del trattamento',
    paragraphs: [
      'I dati sono trattati per: calcolare il KORA Index a livello di organizzazione; gestire l’area personale del lavoratore (My KORA) e il relativo consenso; garantire la sicurezza applicativa (protezione da abusi, rate limiting, controlli di provenienza delle richieste); fornire supporto operativo alle aziende e ai lavoratori pilota.',
      'KORA non utilizza i dati per finalità di marketing, profilazione pubblicitaria o cessione a terzi per scopi commerciali.',
    ],
  },
  {
    id: 'basi-giuridiche',
    heading: '5. Basi giuridiche',
    paragraphs: [
      ph('base giuridica confermata per ciascuna categoria di trattamento (art. 6 e, per categorie particolari, art. 9 GDPR)'),
      'Questo punto è esplicitamente segnalato come non ancora risolto nella documentazione tecnica interna (docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md): il consenso del lavoratore in un contesto di lavoro è presuntivamente non valido come base giuridica autonoma (Considerando 43 GDPR, linee guida EDPB WP249/2017), e richiede una valutazione legale/DPO dedicata prima di qualunque trattamento reale.',
    ],
  },
  {
    id: 'modalita-trattamento',
    heading: '6. Modalità del trattamento',
    paragraphs: [
      'Il trattamento avviene con strumenti elettronici, secondo i principi di privacy by design verificabili nel codice: soglia minima di aggregazione (nessun segmento sotto le 10 persone è visibile all’azienda), Row-Level Security a livello di database, controllo automatico dei pattern PII in fase di caricamento dati, e nessuna registrazione di sessione (session replay) lato error tracking.',
      'KORA non effettua chiamate a modelli linguistici esterni (LLM) su dati aziendali o dei lavoratori — la classificazione automatica dei dati in ingresso utilizza solo un classificatore a regole (tassonomia BCM), non un’API esterna.',
    ],
  },
  {
    id: 'destinatari-fornitori',
    heading: '7. Destinatari e fornitori tecnici',
    paragraphs: [
      'I seguenti fornitori tecnici risultano effettivamente utilizzati, sulla base della configurazione e delle dipendenze del progetto:',
      '— Supabase (autenticazione, database, storage) — ruolo tecnico verificato nel codice.',
      '— Vercel (hosting ed esecuzione dell’applicazione) — ruolo tecnico verificato.',
      '— Sentry (monitoraggio errori applicativi, attivo solo in produzione, nessuna registrazione di sessione) — ruolo tecnico verificato.',
      '— Upstash (contatori di rate limiting, nessun dato personale diretto oltre identificativi opachi) — ruolo tecnico verificato.',
      '— OpenStreetMap / Nominatim (geocodifica indirizzi delle iniziative Commons lato server, e caricamento delle mappe lato browser) — ruolo tecnico verificato nel codice (lib/commons/geocoding.ts, components/commons/InitiativesMap.tsx). Il caricamento delle mappe comporta l’invio dell’indirizzo IP del visitatore ai server di OpenStreetMap.',
      '— Google Fonts — i font sono scaricati in fase di build e serviti dal dominio KORA stesso (next/font/google): nessuna richiesta a runtime verso i server Google, nessun indirizzo IP del visitatore inviato a Google per questo scopo.',
      ph('accordi di trattamento dati (DPA) sottoscritti con ciascun fornitore sopra elencato'),
    ],
  },
  {
    id: 'trasferimenti',
    heading: '8. Trasferimenti internazionali',
    paragraphs: [
      ph('regione/localizzazione effettiva dei server di Supabase, Vercel, Sentry e Upstash utilizzati da KORA'),
      ph('eventuali garanzie per trasferimenti extra SEE (clausole contrattuali standard o altro meccanismo), se applicabili'),
      'Nessuna di queste informazioni è configurata o documentata nel codice sorgente del progetto alla data di redazione — vanno confermate direttamente con ciascun fornitore prima della pubblicazione definitiva.',
    ],
  },
  {
    id: 'conservazione',
    heading: '9. Tempi di conservazione',
    paragraphs: [
      ph('politica di conservazione (retention) per ciascuna categoria di dati'),
      'Questo punto è esplicitamente segnalato come non ancora definito nella documentazione tecnica interna (docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md, blocco §8.11): l’architettura supporta la cancellazione dei dati, ma una politica di conservazione non è ancora stata definita né applicata.',
    ],
  },
  {
    id: 'diritti',
    heading: '10. Diritti degli interessati',
    paragraphs: [
      'In base al Regolamento (UE) 2016/679 (GDPR), l’interessato ha diritto di accesso, rettifica, cancellazione, limitazione del trattamento, portabilità dei dati e opposizione, oltre al diritto di revocare un eventuale consenso in qualsiasi momento.',
      'Nota tecnica verificata: esiste una tensione documentata, non ancora risolta, tra il diritto alla cancellazione e la conservazione dei log di audit e dello storico di versionamento della metodologia (docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md, blocco §8.14) — una policy formale di cancellazione è ancora da definire con il DPO.',
    ],
  },
  {
    id: 'reclamo-autorita',
    heading: '11. Reclamo all’autorità di controllo',
    paragraphs: [
      'L’interessato ha diritto di proporre reclamo all’autorità di controllo competente. In Italia, l’autorità competente è il Garante per la protezione dei dati personali (www.garanteprivacy.it).',
      ph('conferma dell’autorità di controllo effettivamente competente, se diversa da quella italiana in base alla sede legale del titolare'),
    ],
  },
  {
    id: 'cookie',
    heading: '12. Cookie e tecnologie tecniche',
    paragraphs: [
      'Verificato nel codice sorgente alla data di redazione: KORA utilizza esclusivamente un cookie tecnico di sessione (gestito da Supabase Auth) necessario per mantenere l’accesso autenticato. Non è stato rilevato alcun cookie di profilazione, pubblicitario, o di terze parti.',
      'Non risultano integrati strumenti di analytics, tag manager, pixel pubblicitari o session replay (verificato tramite ricerca nel codice sorgente e nelle dipendenze del progetto — nessun risultato per Google Analytics, Google Tag Manager, Meta Pixel, Hotjar, Microsoft Clarity o strumenti equivalenti).',
      'Di conseguenza, allo stato attuale non è presente un cookie banner: non essendovi cookie non tecnici, non è richiesto dal quadro normativo applicabile ai soli cookie tecnici.',
    ],
  },
  {
    id: 'sicurezza',
    heading: '13. Sicurezza e privacy by design',
    paragraphs: [
      'Misure tecniche verificate nel codice: Row-Level Security a livello di database; controllo dell’header Origin sulle operazioni che modificano dati; limitazione della frequenza delle richieste (rate limiting) sulle operazioni più sensibili; controllo automatico dei pattern di dati personali in fase di caricamento; separazione architetturale tra area personale del lavoratore e viste aziendali aggregate; nessuna registrazione di sessione lato monitoraggio errori.',
    ],
  },
  {
    id: 'distinzione-utenti',
    heading: '14. Utenti pubblici, azienda, lavoratori e partner',
    paragraphs: [
      'KORA distingue quattro tipologie di utente, con accessi tecnicamente separati: visitatori pubblici del sito (nessun account, nessun dato raccolto oltre la normale navigazione); utenti azienda (accesso a metriche aggregate della propria organizzazione, mai a dati individuali dei lavoratori); lavoratori (accesso esclusivo ai propri dati personali nell’area My KORA); partner (accesso al proprio spazio di collaborazione).',
      'Questa separazione è tecnicamente applicata a più livelli (autenticazione, autorizzazione per ruolo, Row-Level Security) ed è descritta in dettaglio nella documentazione tecnica interna del progetto.',
    ],
  },
];

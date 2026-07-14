// lib/legal/privacy-content.ts — PUBLIC-PRIVACY-FOUNDATION-05 / 05A / 05B / 05C / 05D
//
// Single source of truth for the public /privacy page (app/privacy/page.tsx).
// Every statement here is either:
//   (a) grounded in verified code/config/docs (see the source comment above
//       each section);
//   (b) an explicit placeholder object (via ph()) — never invented prose —
//       flagged for legal/founder confirmation before publication. As of
//       PUBLIC-PRIVACY-FOUNDATION-05D no placeholder remains in normal use,
//       but the mechanism stays in place: if a future section needs one,
//       use ph() again, not a raw string containing "[DA COMPLETARE" or
//       similar — the publication gate
//       (tests/unit/public-privacy-foundation-05a-publication-gate.test.ts)
//       specifically detects ph()-produced placeholder objects, and will
//       correctly start failing again the moment one is reintroduced; or
//   (c) explicitly confirmed directly by the titolare/founder (not derived
//       from code) — controller identity, address, privacy contact email,
//       DPO status, platform status, legal bases (scoped to the demo/test
//       phase), retention policy. Confirmed 2026-07-14
//       (PUBLIC-PRIVACY-FOUNDATION-05B for identity/contact/DPO/status;
//       05D for legal bases, retention, and provider/transfer wording). See
//       git history for the exact instructions this data was taken from —
//       never edit these values without an equally explicit confirmation.
//
// Do not add a claim here that isn't backed by one of:
//   - actual code/config in this repo (cite the file);
//   - an existing project doc (docs/PILOT_PRIVACY_GOVERNANCE.md,
//     docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md, docs/access-matrix.md);
//   - a generic, jurisdiction-level legal fact (e.g. GDPR data-subject
//     rights, the existence of the Garante Privacy) that doesn't depend on
//     KORA-specific verification;
//   - an explicit, direct confirmation from the titolare (category (c) above).
//
// See docs/PUBLIC_PRIVACY_FOUNDATION_05.md for the full inventory this file
// is derived from, docs/PUBLIC_PRIVACY_FOUNDATION_05A_LEGAL_INPUT_REQUIRED.md
// for what was resolved and when, and
// docs/PUBLIC_PRIVACY_FOUNDATION_05C_PROVIDER_RETENTION_VERIFICATION.md for
// the research behind the retention/legal-basis/provider wording below.
//
// STILL OPEN, EVEN THOUGH NO PLACEHOLDER REMAINS (tracked in the docs
// above, not encoded as a ph() in this file — these are prudent, approved,
// but not-yet-contractually-verified statements, not unresolved unknowns
// blocking publication of THIS phase's policy):
//   - No general automated cleanup job exists yet for demo accounts/data —
//     stated explicitly in the "conservazione" section itself.
//   - Provider DPA signature status, exact server regions, and the specific
//     transfer mechanism actually in force are not contractually confirmed
//     — the "destinatari-fornitori"/"trasferimenti" sections use prudent,
//     non-committal wording rather than asserting a specific unverified
//     fact (no "DPA sottoscritto", no invented region, no fornitore-specific
//     transfer-tool claim).
//   - The entire basi-giuridiche/conservazione content is explicitly scoped
//     to the current demo/test phase and must be re-evaluated with DPO/legal
//     support before any pilot with real companies or workers.

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

export const PRIVACY_DOCUMENT_VERSION = '0.3';
export const PRIVACY_LAST_UPDATED = '2026-07-14';

// Confirmed directly by the titolare (PUBLIC-PRIVACY-FOUNDATION-05B,
// 2026-07-14) — not derived from code. Single source of truth so the page
// and tests never duplicate these literals.
export const PRIVACY_CONTROLLER_NAME = 'Simone Felicetti';
export const PRIVACY_CONTROLLER_ADDRESS = 'Via Carso 14, San Benedetto del Tronto (AP), Italia';
export const PRIVACY_CONTACT_EMAIL = 'simone.felicetti.kora@gmail.com';

// Platform status — confirmed by the titolare (PUBLIC-PRIVACY-FOUNDATION-05B).
// Rendered prominently on the page, above the numbered sections, not as one
// of them — it scopes who this policy currently applies to, rather than
// describing a data-processing category.
export const PRIVACY_PLATFORM_STATUS =
  "KORA si trova attualmente in fase pre-pilota: la piattaforma è utilizzata esclusivamente tramite account demo e di test, senza utenti reali, aziende clienti o lavoratori reali attivi.";

export const PRIVACY_UPDATE_COMMITMENT =
  "Questa informativa sarà aggiornata prima dell'apertura della piattaforma a utenti reali, aziende pilota o lavoratori reali, qualora cambino le finalità, le categorie di dati trattati, le basi giuridiche, i destinatari, i tempi di conservazione o le modalità di utilizzo della piattaforma.";

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'titolare',
    heading: '1. Titolare del trattamento',
    paragraphs: [
      `Il titolare del trattamento è ${PRIVACY_CONTROLLER_NAME}.`,
      `Sede: ${PRIVACY_CONTROLLER_ADDRESS}.`,
      'Il titolare opera come persona fisica: alla data di aggiornamento della presente informativa non è stata costituita né dichiarata alcuna società, pertanto non sono indicati denominazione sociale, partita IVA o codice fiscale.',
    ],
  },
  {
    id: 'contatti',
    heading: '2. Contatti privacy',
    paragraphs: [
      `Per ogni richiesta relativa alla protezione dei dati personali è possibile contattare direttamente il titolare all'indirizzo ${PRIVACY_CONTACT_EMAIL}.`,
      'Un canale di contatto generale già in uso nel prodotto per richieste di accesso è accesso@kora.io (vedi app/request-access/page.tsx), dedicato alle richieste di provisioning e non specificamente alla privacy.',
      "Alla data di aggiornamento della presente informativa non è stato designato un Responsabile della protezione dei dati (DPO). Per ogni richiesta relativa alla protezione dei dati personali è possibile contattare direttamente il titolare all'indirizzo indicato.",
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
      'Le basi giuridiche indicate in questa sezione valgono esclusivamente per l’attuale fase pre-pilota, in cui KORA è utilizzata solo tramite account demo e di test (v. sezione sullo stato della piattaforma). Non descrivono le basi giuridiche di un futuro trattamento con aziende o lavoratori reali.',
      '— Richieste di accesso e organizzazione della demo: esecuzione di misure precontrattuali adottate su richiesta dell’interessato — art. 6, par. 1, lett. b), GDPR.',
      '— Creazione e gestione degli account demo/test e fornitura delle funzionalità richieste: esecuzione della richiesta dell’utente (art. 6, par. 1, lett. b), GDPR) oppure, ove l’utente non sia parte di un rapporto precontrattuale diretto, legittimo interesse del titolare a consentire e gestire una dimostrazione controllata della piattaforma (art. 6, par. 1, lett. f), GDPR).',
      '— Sicurezza applicativa, logging tecnico, prevenzione di abusi, rate limiting, diagnosi degli errori e tutela della piattaforma: legittimo interesse del titolare alla sicurezza, integrità, prevenzione delle frodi e continuità del servizio — art. 6, par. 1, lett. f), GDPR.',
      '— Gestione di richieste privacy, obblighi normativi e collaborazione con autorità: adempimento di obblighi legali — art. 6, par. 1, lett. c), GDPR.',
      '— Accertamento, esercizio o difesa di un diritto: legittimo interesse del titolare alla tutela dei propri diritti — art. 6, par. 1, lett. f), GDPR.',
      '— Dati volontariamente inseriti nella demo: il trattamento è limitato a quanto necessario per fornire la demo richiesta. Nella demo non devono essere inseriti dati reali di lavoratori, categorie particolari di dati, dati giudiziari o informazioni personali non necessarie — la demo utilizza esclusivamente dati sintetici, fittizi o adeguatamente anonimizzati.',
      'Il consenso non è utilizzato come base giuridica generale o residuale per queste finalità.',
      'Il test di bilanciamento del legittimo interesse e l’intera matrice delle basi giuridiche dovranno essere rivalutati, con supporto DPO/legale, prima dell’utilizzo della piattaforma con aziende o lavoratori reali — v. anche il blocco già segnalato in docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md sulla presunta invalidità del consenso in ambito lavorativo.',
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
      'KORA si avvale di fornitori tecnici per hosting, autenticazione, database, monitoraggio degli errori e rate limiting. I seguenti fornitori tecnici risultano effettivamente utilizzati, sulla base della configurazione e delle dipendenze del progetto:',
      '— Supabase (autenticazione, database, storage) — ruolo tecnico verificato nel codice.',
      '— Vercel (hosting ed esecuzione dell’applicazione) — ruolo tecnico verificato.',
      '— Sentry (monitoraggio errori applicativi, attivo solo in produzione, nessuna registrazione di sessione) — ruolo tecnico verificato.',
      '— Upstash (contatori di rate limiting, nessun dato personale diretto oltre identificativi opachi) — ruolo tecnico verificato.',
      '— OpenStreetMap / Nominatim, ove applicabile (geocodifica indirizzi delle iniziative Commons lato server, e caricamento delle mappe lato browser) — ruolo tecnico verificato nel codice (lib/commons/geocoding.ts, components/commons/InitiativesMap.tsx). Il caricamento delle mappe comporta l’invio dell’indirizzo IP del visitatore ai server di OpenStreetMap.',
      '— Google Fonts — i font sono scaricati in fase di build e serviti dal dominio KORA stesso (next/font/google): nessuna richiesta a runtime verso i server Google, nessun indirizzo IP del visitatore inviato a Google per questo scopo.',
      'Le condizioni contrattuali, gli accordi sul trattamento dei dati (DPA) e l’eventuale localizzazione dei trattamenti presso questi fornitori saranno verificati e formalizzati prima dell’apertura della piattaforma a utenti reali. L’elenco aggiornato dei fornitori e lo stato dei relativi accordi potrà essere richiesto al titolare ai contatti indicati.',
    ],
  },
  {
    id: 'trasferimenti',
    heading: '8. Trasferimenti internazionali',
    paragraphs: [
      'La configurazione tecnica precisa (regione dei server, piano contrattuale attivo) dei fornitori elencati alla sezione precedente sarà verificata e riesaminata prima dell’apertura della piattaforma a un pilota con aziende o lavoratori reali.',
      'Qualora un fornitore comporti un trasferimento di dati personali al di fuori dello Spazio Economico Europeo, il trattamento sarà effettuato nel rispetto del Capo V del GDPR e sulla base degli strumenti applicabili, quali decisioni di adeguatezza o garanzie appropriate (ad esempio clausole contrattuali standard).',
      'Nella fase attuale la piattaforma è utilizzata esclusivamente con account e dati demo/test (v. sezione sullo stato della piattaforma) — nessun dato reale di lavoratori o aziende è oggi interessato da questi trattamenti.',
    ],
  },
  {
    id: 'conservazione',
    heading: '9. Tempi di conservazione',
    paragraphs: [
      'I periodi indicati di seguito sono una policy organizzativa approvata dal titolare per l’attuale fase demo/test. Per alcune categorie il periodo è già applicato automaticamente dal sistema (indicato come "tecnico"); per altre è una policy organizzativa che, alla data di aggiornamento di questa informativa, richiede ancora un intervento manuale del titolare — nessun sistema automatico di cancellazione generale per account e dati demo è oggi implementato.',
      '— Richieste di accesso non accolte o non proseguite: fino a 90 giorni dalla chiusura o dall’ultima interazione. [organizzativo — cancellazione manuale]',
      '— Account demo/test inattivi: fino a 90 giorni dall’ultima attività, seguita da cancellazione o anonimizzazione, salvo esigenze documentate. [organizzativo — cancellazione manuale]',
      '— Dati inseriti nell’ambiente demo: fino a 90 giorni dall’ultima attività dell’account demo associato, con possibile cancellazione anticipata su richiesta. [organizzativo — cancellazione manuale]',
      '— Token di condivisione Dynamic Impact CV: 30 giorni. [tecnico — già applicato automaticamente nel codice]',
      '— URL firmati per allegati evidenziali: 300 secondi (5 minuti). [tecnico — già applicato automaticamente nel codice]',
      '— Contatori di rate limiting: conservati esclusivamente per la durata della finestra prevista dalla relativa policy tecnica (5-60 minuti a seconda della categoria). [tecnico — già applicato automaticamente]',
      '— Log applicativi e di sicurezza: fino a 12 mesi, con conservazione ulteriore solo in presenza di un incidente, abuso, obbligo legale o necessità di tutela documentata. [organizzativo — nessun meccanismo di cancellazione automatica ancora implementato]',
      '— Error tracking (Sentry): secondo la retention configurata nel servizio utilizzato; il periodo effettivo dovrà essere verificato e mantenuto al minimo disponibile prima dell’apertura a utenti reali. [dipendente dal fornitore — da verificare]',
      '— Documenti, file ed export demo/test: fino a 90 giorni dall’ultima attività, o prima su richiesta. Nessuna cancellazione automatica è oggi implementata per questa categoria. [organizzativo — cancellazione manuale]',
      '— Dati necessari per l’adempimento di obblighi legali o la gestione di una controversia: per il tempo strettamente necessario a tale adempimento o gestione. [da definire caso per caso]',
      'Nessun sistema automatico generale di cancellazione/anonimizzazione per account e dati demo è oggi implementato: fino alla sua realizzazione, l’applicazione dei periodi sopra indicati è gestita manualmente dal titolare. Un meccanismo di cancellazione automatica (lifecycle job) dovrà essere implementato e verificato prima dell’apertura della piattaforma a un pilota con aziende o lavoratori reali.',
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
      'L’interessato ha diritto di proporre reclamo all’autorità di controllo competente. In base alla sede del titolare (Italia), l’autorità competente è il Garante per la protezione dei dati personali (www.garanteprivacy.it).',
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

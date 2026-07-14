# Public Privacy Foundation 05

**Sprint:** PUBLIC-PRIVACY-FOUNDATION-05
**Date:** 2026-07-14
**Preceded by:** SECURITY-RATE-LIMITING-04 (`docs/SECURITY_RATE_LIMITING_04.md`)

Adds a public, code-and-doc-grounded `/privacy` page, a legal footer link on
every core public page, and a verified technical inventory of data
categories and subprocessors. Does not include Sentry runtime hardening
(separate future sprint) and does not replace legal/DPO review.

## Distinzione: informativa pubblica vs. privacy boundary interna

Questo documento e la pagina `/privacy` sono **l'informativa esterna**
rivolta a visitatori, aziende, lavoratori e partner. Sono cosa diversa dai
**confini di privacy interni** di KORA — le regole tecniche costituzionali
(`CLAUDE.md` §13, `docs/access-matrix.md`, `docs/privacy-escalation-model.md`,
`docs/PILOT_PRIVACY_GOVERNANCE.md`) che impediscono all'azienda di vedere
dati individuali del lavoratore. Quelle regole restano interamente
invariate e non sono duplicate qui — la pagina pubblica ne dà solo un
riassunto accessibile a un pubblico esterno (sezione 14).

## Inventario tecnico dei trattamenti (verificato al 2026-07-14)

| Categoria | Finalità tecnica | Punto nel codice | Interessato | Visibilità | Storage | Fornitore esterno | Retention | Trasferimento intl. | Stato |
|---|---|---|---|---|---|---|---|---|---|
| Dati di autenticazione | Login e mantenimento sessione | `lib/auth/kora-session.ts`, `middleware.ts` | Tutti i ruoli autenticati | Solo l'utente stesso | Supabase Auth | Supabase | non definita | da confermare | verificato (esistenza) / da confermare (retention) |
| Email | Identificazione account, inviti | `app/api/admin/*/provision*`, Supabase Auth | Company/Worker/Partner | KORA_ADMIN (provisioning), utente stesso | Supabase Auth | Supabase | non definita | da confermare | verificato |
| User ID | Identificatore tecnico opaco | `app_metadata`, tutte le route `app/api/**` | Tutti i ruoli | Interno, mai in chiaro nelle superfici aziendali | Supabase | Supabase | non definita | da confermare | verificato |
| Tenant ID | Isolamento multi-azienda | `analytics.tenant`, `kora_tenant_id` | Azienda | Interno | Supabase | Supabase | non definita | da confermare | verificato |
| Worker ID | Identificatore tecnico opaco lavoratore | `personal.worker_identity` | Lavoratore | Interno, mai company-visible | Supabase | Supabase | non definita | da confermare | verificato |
| Log applicativi | Diagnostica, audit interno | `lib/audit/log-access.ts` (`audit.audit_log`) | Attore che compie l'azione | KORA_ADMIN (audit) | Supabase (tabella interna) | Supabase | non definita | da confermare | verificato |
| Error tracking | Diagnostica errori applicativi | `sentry.client/server/edge.config.ts` | Sessione con errore (nessun replay) | Team tecnico | Sentry | Sentry | da confermare | da confermare | verificato (nessun replay) / da confermare (retention Sentry) |
| Token e link | Condivisione CV, KORA Link | `lib/worker-cv/share-token.ts`, `lib/kora-link/token.ts` | Lavoratore | Solo hash persistito, mai il token in chiaro | Supabase | Supabase | non definita | da confermare | verificato |
| Dati aree azienda | Metriche aggregate KORA Index | `analytics.*` | Azienda | Azienda (solo aggregato N≥10) | Supabase | Supabase | non definita | da confermare | verificato |
| Dati aree worker | Profilo personale, CV, cronologia | `personal.*` | Lavoratore | Solo il lavoratore | Supabase | Supabase | non definita | da confermare | verificato |
| Dati partner | Profilo organizzativo partner | `network.partner_profile` | Partner | Partner stesso, KORA_ADMIN | Supabase | Supabase | non definita | da confermare | verificato |
| Dati KORA Link | Attivazione chip fisico (non live) | `lib/kora-link/*` | Lavoratore | Feature-flagged, disattiva di default | Supabase (se attivato) | Supabase | non definita | da confermare | verificato (non attivo in produzione oggi) |
| Dati aggregati/pseudonimizzati | KORA Index, PIB rollup | `analytics.kora_index_result` | Azienda (aggregato) | Azienda | Supabase | Supabase | non definita | da confermare | verificato |
| File caricati | Ingestion dati aziendali | `docs/PILOT_DATA_INTAKE_READINESS.md` | Azienda | KORA_ADMIN (durante intake) | **Non conservato in storage** — solo record analizzati e PII-screened | Supabase (solo record derivati) | non definita | da confermare | verificato |
| Export/report | Decision Pack, report aziendali | `services/report-generator/*` | Azienda | Azienda | Supabase/generato on-demand | Supabase | non definita | da confermare | verificato |
| Cookie tecnici | Sessione autenticata | `@supabase/ssr` | Utente autenticato | Solo il browser dell'utente | Cookie httpOnly | Supabase | sessione | da confermare | verificato |
| Dati di rate limiting | Prevenzione abusi | `lib/security/rate-limit.ts`, `lib/kora-link/rate-limit.ts` | Attore autenticato (chiave = ID opaco, mai email/IP grezzo) | Interno | Upstash Redis | Upstash | finestra della policy (minuti) | da confermare | verificato |
| Indirizzi IP | Solo per mappe (caricamento tile) e geocoding lato server | `components/commons/InitiativesMap.tsx`, `lib/commons/geocoding.ts` | Visitatore che visualizza una mappa Commons | N/A (non loggato da KORA) | Non trattato da KORA — richiesta diretta browser→OpenStreetMap | OpenStreetMap | N/A | da confermare (OSM Foundation, Belgio/UE) | verificato |
| Query string e URL | Token in path (CV share, KORA Link) | `app/cv/share/[token]/page.tsx`, `app/link/[token]/*` | Lavoratore | N/A | Non loggato in chiaro (verificato nei commenti del codice) | — | — | — | verificato |
| Dati di supporto/contatto | Richiesta accesso | `app/request-access/page.tsx` | Chiunque richieda accesso | KORA_ADMIN (via email, non tramite form salvato) | Nessuno — invio via `mailto:`, nessun salvataggio server-side | — | N/A | N/A | verificato |

Non è una DPIA. È una base tecnica verificabile, aggiornata al momento della
redazione — vedi limiti più sotto.

## Servizi e subprocessori rilevati

Verificati tramite `package.json`, file di configurazione, e ricerca nel
codice sorgente (nessuna assunzione):

- **Supabase** — autenticazione, database Postgres, storage. Ruolo tecnico verificato (`@supabase/ssr`, `@supabase/supabase-js`). Regione: **non configurata/documentata nel codice** → da confermare.
- **Vercel** — hosting ed esecuzione applicazione (uso verificato tramite `VERCEL_URL` in più route). Regione: da confermare.
- **Sentry** — monitoraggio errori, solo produzione, **session replay esplicitamente disabilitato** (commento in `sentry.client.config.ts`: "Privacy KORA: replays DISABILITATI"). `tracesSampleRate: 0.1`. Regione: da confermare.
- **Upstash** — Redis per rate limiting (KORA Link + route sensibili). Nessun dato personale diretto oltre identificativi opachi/hash. Regione: da confermare.
- **OpenStreetMap / Nominatim** — geocodifica indirizzi lato server (`lib/commons/geocoding.ts`, con User-Agent identificabile per fair-use) + tile mappa lato browser (`components/commons/InitiativesMap.tsx`). Verificato nel codice. Il caricamento dei tile invia l'IP del visitatore direttamente ai server OpenStreetMap (richiesta diretta browser→OSM, KORA non intermedia né logga questo traffico).
- **Google Fonts** — self-hosted a build-time tramite `next/font/google` (verificato in `app/layout.tsx`): nessuna richiesta a runtime verso i server Google, nessun IP inviato a Google per questo scopo.

Nessun accordo di trattamento dati (DPA) risulta documentato nel repository
per nessuno dei fornitori sopra — da confermare con ciascun fornitore prima
della pubblicazione definitiva.

## Cookie e tracking rilevati

**Rilevato (verificato):** un solo cookie, tecnico, di sessione, gestito da
Supabase Auth tramite `@supabase/ssr` — necessario per mantenere l'accesso
autenticato.

**Non rilevato** (ricerca su intero codice sorgente e dipendenze,
`package.json` incluso): Google Analytics, Google Tag Manager, Meta Pixel,
Hotjar, Microsoft Clarity, strumenti di advertising, strumenti di session
replay, cookie di profilazione, cookie non tecnici, local storage per
finalità non essenziali.

**Conseguenza:** nessun cookie banner introdotto in questo sprint — non
essendovi cookie non tecnici, non è richiesto.

## Dati verificati

Vedi tabella inventario sopra (colonna "Stato" = verificato) — derivano
tutti da codice, configurazione o documentazione tecnica interna già
esistente (`docs/PILOT_PRIVACY_GOVERNANCE.md`,
`docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md`, `docs/access-matrix.md`).

## Dati non verificabili (da confermare prima della pubblicazione)

- Ragione sociale, sede legale, partita IVA del titolare.
- Nominativo ed email dedicata del DPO (se nominato).
- Basi giuridiche puntuali per ciascuna categoria di trattamento — **blocco
  esplicito già aperto** in `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md`
  (consenso in ambito lavorativo presuntivamente non valido, richiede
  valutazione DPO).
- Regione/localizzazione effettiva di Supabase, Vercel, Sentry, Upstash.
- Eventuali garanzie per trasferimenti extra SEE.
- Politica di conservazione (retention) per ciascuna categoria — **blocco
  esplicito già aperto** in `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md`
  (nessuna policy di retention ancora definita).
- Accordi di trattamento dati (DPA) con i fornitori elencati.
- Autorità di controllo effettivamente competente (assunta italiana, da
  confermare in base alla sede legale reale).

## Placeholder introdotti

Tutti i placeholder sono oggetti tipizzati distinti (`{ placeholder: true,
label: string }`) in `lib/legal/privacy-content.ts`, mai stringhe di testo
libere — il componente `components/legal/LegalSection.tsx` li rende sempre
con un box evidenziato (bordo/sfondo ambra, prefisso "DA COMPLETARE PRIMA
DELLA PUBBLICAZIONE") **senza alcuna condizione di ambiente**: sono visibili
identicamente in sviluppo, review e — finché non sostituiti — anche in
produzione. Undici placeholder introdotti, in 6 sezioni: Titolare (3),
Contatti (2), Basi giuridiche (1), Destinatari e fornitori (1),
Trasferimenti (2), Conservazione (1), Reclamo all'autorità (1).

## Route e componenti creati/modificati

**Creati:**
- `app/privacy/page.tsx` — pagina pubblica, Server Component, metadata indicizzabili.
- `lib/legal/privacy-content.ts` — contenuto tipizzato (14 sezioni + versione/data).
- `components/legal/LegalSection.tsx` — rendering riutilizzabile sezione + placeholder.
- `tests/unit/public-privacy-foundation-05.test.ts`.
- Questo documento.

**Modificati (solo aggiunta di un link, nessun redesign):**
- `components/landing/MarketingFooter.tsx` — link Privacy (copre `/` e `/pilot`).
- `components/landing/marketing.module.css` — stile `.footLegal` (+ `:focus-visible`).
- `app/login/page.tsx` — link Privacy nel footer testuale esistente.
- `app/request-access/page.tsx` — link Privacy nel footer testuale esistente.

## Struttura della pagina `/privacy`

Titolo H1 + disclaimer legale (non è parere legale, distingue informativa
pubblica da privacy boundary interna) + 14 sezioni numerate (titolare,
contatti, categorie dati, finalità, basi giuridiche, modalità trattamento,
destinatari/fornitori, trasferimenti, conservazione, diritti, reclamo
autorità, cookie, sicurezza, distinzione utenti) + versione documento/data
aggiornamento. `MarketingNav` in testa, `MarketingFooter` in coda — stessa
identità visiva di `/` e `/pilot`, nessun nuovo design system.

## Link aggiunti al footer

Solo **Privacy** — Cookie e Termini non sono stati creati (non pronti,
nessuna pagina vuota/finta introdotta, per esplicita regola del brief). Gap
documentato: se in futuro servono, andranno aggiunti allo stesso
`MarketingFooter` component.

## Limiti del documento e rischio residuo scoperto

- **Non è una DPIA.** È un inventario tecnico verificabile, non una
  valutazione d'impatto formale.
- **Non sostituisce la revisione legale/DPO.** Esplicitamente dichiarato
  sia nella pagina pubblica sia qui.
- **Gap tecnico scoperto durante questo sprint, non risolto (fuori scope
  esplicito — `middleware.ts` è vietato in questo sprint):** `/privacy` non
  è presente in nessuna delle liste `*_ALLOWED_PREFIXES` di `middleware.ts`.
  Un utente **già autenticato** come `COMPANY_ADMIN`, `WORKER`, `PARTNER` o
  `DEMO_VIEWER` che visita `/privacy` direttamente verrebbe **rediretto**
  al proprio workspace dal middleware, invece di vedere la pagina. Per un
  visitatore anonimo (il caso testato e richiesto da questo sprint) la
  pagina funziona correttamente. Raccomandazione per un futuro sprint
  dedicato: aggiungere `/privacy` (ed eventualmente `/cookie`, `/termini`
  quando esisteranno) a un piccolo insieme di path "sempre pubblici",
  idealmente con un controllo dedicato vicino a quello già esistente per
  `'/'` in cima a `middleware.ts`, invece di aggiungerlo a ciascuna delle
  quattro allowlist per-ruolo separatamente.
- Le informazioni sulla localizzazione dei fornitori e sui DPA non sono
  verificabili dal solo codice sorgente — richiedono conferma diretta con
  ciascun fornitore.

## Checklist legale prima della pubblicazione definitiva

- [ ] Titolare del trattamento (ragione sociale, sede legale, P.IVA) inserito.
- [ ] Contatto privacy/DPO dedicato inserito, se applicabile.
- [ ] Basi giuridiche confermate da un DPO/legale per ciascuna categoria di dati.
- [ ] Regione/localizzazione di Supabase, Vercel, Sentry, Upstash confermata.
- [ ] DPA sottoscritti con ciascun fornitore, o in corso di sottoscrizione.
- [ ] Politica di conservazione definita e approvata da un DPO.
- [ ] Autorità di controllo competente confermata.
- [ ] Tutti gli 11 placeholder di `lib/legal/privacy-content.ts` sostituiti con dati confermati.
- [ ] Revisione legale/DPO completa del testo pubblicato.
- [ ] Gap del middleware (utenti autenticati rediretti da `/privacy`) risolto in uno sprint dedicato.

## Conferma

Questo documento e la pagina `/privacy` **non sostituiscono** una revisione
legale. Ogni affermazione tecnica è verificata rispetto al codice esistente
alla data indicata; ogni dato non verificabile è marcato esplicitamente
come placeholder, mai inventato.

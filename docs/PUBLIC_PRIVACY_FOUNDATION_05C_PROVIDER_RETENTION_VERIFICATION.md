# Public Privacy Foundation 05C — Provider and Retention Verification

**Sprint:** PUBLIC-PRIVACY-FOUNDATION-05C
**Date:** 2026-07-14 · **Updated:** 2026-07-14 (PUBLIC-PRIVACY-FOUNDATION-05D — proposals approved and published)
**Status:** ✅ **Le proposte §8 (basi giuridiche) e §9 (matrice retention), oltre alla formulazione fornitori/trasferimenti, sono state approvate dal titolare in 05D e pubblicate in `lib/legal/privacy-content.ts`, scoped alla fase demo/test attuale.** Questo documento resta il riferimento per la ricerca tecnica e il ragionamento alla base di ciascuna formulazione — non necessita di ulteriori azioni per la pubblicazione odierna. Le checklist di verifica fornitori (§"Checklist per il titolare") restano aperte in vista di un pilota con utenti reali.

Questo documento contiene la ricerca tecnica (codice + pagine pubbliche dei
fornitori) e le proposte che sono state poi approvate dal titolare in
PUBLIC-PRIVACY-FOUNDATION-05D. Le sezioni sotto sono lasciate invariate
rispetto alla loro stesura originale (05C) come registro di cosa è stato
verificato e perché — la formulazione effettivamente pubblicata nella
pagina può differire lievemente nel testo (adattata alla forma pubblica)
pur mantenendo lo stesso contenuto sostanziale approvato.

## Metodo di verifica

- **Codice/configurazione KORA**: letto direttamente dal repository (fonte: percorso file citato per ogni voce).
- **Fornitori esterni**: consultate le pagine legali/DPA pubbliche di ciascun fornitore (fonte: URL citato). Questo **non equivale** a verificare lo stato contrattuale reale di KORA con quel fornitore (piano attivo, DPA effettivamente firmato) — quello richiede accesso alla dashboard reale, che non ho.
- Nessuna dashboard privata, nessun token o credenziale è stato consultato o mostrato.

---

## 1-5. Matrice fornitori

| Fornitore | Servizio usato | Dati/metadati potenzialmente ricevuti | Regione tecnica | Stato DPA | Trasferimento extra-SEE potenziale | Meccanismo dichiarato dal fornitore | Fonte |
|---|---|---|---|---|---|---|---|
| **Supabase** | Autenticazione, database Postgres, storage | Email, password hash, JWT, tutti i dati applicativi (`personal.*`, `analytics.*`, `network.*`) | **Non verificabile** — nessuna regione configurata in questo repository (`.env.local.example` usa un placeholder `<project-ref>.supabase.co`, che non rivela la regione) | **Disponibile ma non confermata la firma**: Supabase pubblica un template di DPA, ma richiede una firma esplicita tramite PandaDoc dalla legal-documents page della dashboard Supabase — non è automatico | Da verificare (dipende dalla regione del progetto, non nota) | Nessuno dichiarato pubblicamente in modo specifico per la regione — dipende dalla scelta fatta alla creazione del progetto | Codice: `.env.local.example` L.9. Fornitore: `https://supabase.com/legal/dpa` (consultato 2026-07-14) |
| **Vercel** | Hosting ed esecuzione dell'app | Log di richieste HTTP, IP dei visitatori (elaborazione infrastrutturale standard) | **Non verificabile con certezza per il progetto specifico** — ma Vercel dichiara pubblicamente: *"Vercel's primary processing facilities are in the United States"* | **Disponibile ma non confermata la firma** — il DPA di Vercel "diventa vincolante all'ingresso nell'Agreement o all'esecuzione dell'Addendum" e si applica esplicitamente ai piani **Enterprise e Pro** — se il piano attivo fosse Hobby/free, la copertura DPA è da verificare separatamente | **Sì, dichiarato dal fornitore stesso**: trasferimento verso gli USA, con SCC + UK IDTA incorporati nel DPA come meccanismo | Standard Contractual Clauses + UK International Data Transfer Addendum (dichiarati nel DPA) | Fornitore: `https://vercel.com/legal/dpa` (consultato 2026-07-14) |
| **Sentry** | Monitoraggio errori (solo produzione, nessun session replay — verificato in `sentry.client.config.ts`) | Stack trace, messaggi di errore, eventuale contesto di sessione (nessun replay) | **Non verificabile con certezza per il progetto specifico** — Sentry dichiara: *"we may... store and process Customer Data in the United States and any other country in which we or our Subprocessors maintain data processing operations"* | **Disponibile ma non confermata la firma** — richiede accettazione elettronica esplicita | **Sì, dichiarato dal fornitore stesso**: si affida al Data Privacy Framework EU-US e, in subordine, alle SCC | Data Privacy Framework (EU-US) + SCC di backup (dichiarati nel DPA) | Codice: `sentry.client/server/edge.config.ts`. Fornitore: `https://sentry.io/legal/dpa/` (consultato 2026-07-14) |
| **Upstash** | Redis per rate limiting (`lib/security/rate-limit.ts`, `lib/kora-link/rate-limit.ts`) | Solo identificativi opachi/hash come chiavi di conteggio (verificato: mai email/IP/token in chiaro) | **Non verificato in questa sessione** — i tentativi di consultare le pagine legali pubbliche di Upstash (`/trust`, `/docs/common/help/gdpr`, `/privacy`) hanno restituito errore 404; nessuna verifica ottenuta | **Non verificato in questa sessione** | Non verificato in questa sessione | Non verificato in questa sessione | Codice: `lib/security/rate-limit.ts`. Tentativo fornitore fallito — richiede verifica diretta su `upstash.com` o dashboard |
| **OpenStreetMap / Nominatim** | Geocodifica indirizzi lato server + tile mappa lato browser (`lib/commons/geocoding.ts`, `components/commons/InitiativesMap.tsx`) | IP del visitatore (richiesta diretta browser→tile server, mai intermediata da KORA); indirizzo testuale inserito per un'iniziativa (geocoding server-side) | **Non determinabile per natura tecnica**: la policy privacy di OSM Foundation dichiara che i tile sono serviti da *"a global network of cache servers"* (CDN) — non esiste un'unica regione fissa | **Nessun DPA applicabile** — OpenStreetMap Foundation è un'organizzazione non-profit, non un fornitore SaaS con contratto commerciale; il rapporto è regolato dalla loro privacy policy pubblica e dalla fair-use policy di Nominatim (già rispettata nel codice: User-Agent identificabile, verificato in `lib/commons/geocoding.ts`) | Sì, per natura (CDN globale) — ma nessun meccanismo contrattuale applicabile trattandosi di un servizio pubblico non-profit | N/A (non è un rapporto contrattuale) | Codice: `lib/commons/geocoding.ts`, `components/commons/InitiativesMap.tsx`. Fornitore: `https://osmfoundation.org/wiki/Privacy_Policy` (consultato 2026-07-14) |
| **Google Fonts** | Font self-hosted a build-time (`next/font/google`, `app/layout.tsx`) | **Nessuno** — nessuna richiesta runtime verso Google, verificato architetturalmente (i font sono scaricati in fase di build e serviti dal dominio KORA) | N/A — nessun dato trattato da Google in runtime | N/A — nessun rapporto di trattamento dati esiste | No | N/A | Codice: `app/layout.tsx` (uso di `next/font/google`) |

**2. Regioni verificate:** nessuna, per nessun fornitore, con certezza per il progetto specifico KORA. L'unica dichiarazione di regione ottenuta (Vercel: "primary processing facilities... United States") è una dichiarazione generale del fornitore sulla propria infrastruttura, non una conferma della regione specifica assegnata al progetto KORA — va comunque considerata come indicazione forte, dato che Vercel non offre generalmente una scelta di regione per l'hosting dell'applicazione stessa (a differenza del progetto Supabase o del database Upstash, che tipicamente permettono di scegliere la regione alla creazione).

**3. Regioni non verificabili da questo repository:** Supabase, Sentry, Upstash (nessuna configurazione di regione presente nel codice o nei file d'esempio). OpenStreetMap non ha una regione fissa per natura tecnica (CDN).

**4. Stato DPA per fornitore:** vedi colonna dedicata sopra. **Nessuno dei quattro fornitori SaaS (Supabase, Vercel, Sentry, Upstash-da-verificare) ha una firma confermata** — tutti richiedono un passo di accettazione esplicita che non è verificabile dal codice sorgente.

**5. Trasferimenti potenziali e garanzie verificabili:** Vercel e Sentry dichiarano esplicitamente, nei propri DPA pubblici, il trasferimento di dati verso gli Stati Uniti, con SCC (entrambi) e UK IDTA (Vercel) come meccanismo di garanzia. Per Supabase e Upstash nessuna informazione di trasferimento è stata verificata in questa sessione.

### Checklist per il titolare — cosa verificare direttamente

- [ ] Supabase → Dashboard → Project Settings → General: regione del progetto. Dashboard → Legal Documents: DPA richiesto/firmato?
- [ ] Vercel → Dashboard → Team/Project Settings: piano attivo (Hobby/Pro/Enterprise — il DPA copre solo Pro/Enterprise). Se Pro/Enterprise: DPA accettato?
- [ ] Sentry → Dashboard → Organization Settings → Legal & Compliance: DPA accettato? Data storage location del progetto (Sentry offre talvolta una scelta EU/US in base al piano).
- [ ] Upstash → Dashboard → Database details: regione del database Redis effettivamente creato. Sito Upstash: verificare pagina legale/DPA aggiornata (i tentativi automatici in questa sessione sono falliti).

---

## 6-7. Inventario retention tecnica

| Categoria | Retention tecnicamente impostata | Retention del provider | Assenza di retention esplicita | Possibilità di cancellazione | Fonte |
|---|---|---|---|---|---|
| Sessioni (JWT/refresh) | `jwt_expiry = 3600` (1h), refresh rotation attiva, `refresh_token_reuse_interval = 10s` — **ma nessun timeout assoluto/inattività configurato** (`[auth.sessions] timebox`/`inactivity_timeout` presenti nel file solo come esempio commentato, non attivi) | N/A (config locale, non verificato sul progetto Supabase Cloud reale — vedi nota sotto) | Sì, per timeout assoluto/inattività | Logout manuale; nessuna scadenza forzata lato KORA | `supabase/config.toml` L.165-175, L.271-275 |
| Token/link condivisione CV | **Sì, già applicato**: `DEFAULT_SHARE_TTL_DAYS = 30` | N/A | No | Sì (flag `expired`, oltre a revoca manuale) | `lib/worker-cv/share-token.ts` |
| Signed URL evidence attachments | **Sì, già applicato**: max 300 secondi (5 minuti) | N/A | No | N/A (scadenza automatica) | `lib/data-intake/evidence-attachment-storage.ts` L.22 |
| Audit log (`audit.audit_log`) | **Nessuna** — nessun meccanismo di cancellazione/scadenza nel codice | Non verificato (dipende dal piano Supabase) | **Sì — confermato** | Nessuna trovata | `lib/audit/log-access.ts`; già segnalato come blocco in `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md` §8.11 |
| Errori/Sentry | Nessuna nel codice applicativo (parametro lato piano Sentry) | Non verificato — dipende dal piano Sentry attivo | Sì, lato codice KORA | N/A lato KORA | `sentry.client/server/edge.config.ts` |
| Rate-limit counters | **Sì, già applicato**: finestra della policy (5-60 min secondo categoria) + margine tecnico Redis `PEXPIRE` ≈ 2×finestra | N/A | No | Scadenza automatica | `lib/security/rate-limit.ts` (`RATE_LIMIT_POLICIES`); meccanismo TTL verificato in `node_modules/@upstash/ratelimit` sorgente (`PEXPIRE`) |
| File caricati (data intake) | **File raw: mai conservato** (verificato in sprint 05) — record derivati: nessuna retention definita | Non applicabile al file raw; record derivati non verificati | Sì, per i record derivati | Cancellazione manuale disponibile (v. sotto) | `docs/PILOT_DATA_INTAKE_READINESS.md` |
| Export/report (Decision Pack) | Nessuna retention definita | N/A | Sì | Non trovata una cancellazione dedicata | `services/report-generator/*` |
| Account demo/test | Nessun meccanismo di scadenza/pulizia automatica | N/A | Sì | Provisioning/deprovisioning manuale via admin | `scripts/worker-trial-seed.ts` è seed manuale, non cleanup |
| Cancellazione dati (`data-lifecycle/delete`) | **Parziale, verificato con precisione**: cancella realmente (`DELETE`) le righe di `personal.uploaded_record` e `analytics.uef_record`; il record padre `source_batch` viene solo **marcato** `batch_status='rejected'` (non eliminato); **non tocca mai** tenant, `kora_index_result`, `activation_result`, `decision_pack` (per progetto, dichiarato nel commento del file) | N/A | Sì, per gli output aggregati (mai cancellati da questo meccanismo) | Sì, manuale, solo KORA_ADMIN | `app/api/admin/data-lifecycle/delete/route.ts` L.1-9, L.140-157 |
| Backup | Nessuna menzione nel codice | Dipende dal piano Supabase (non verificabile da qui) | Sì, lato codice | N/A | Nessuna fonte nel repository |
| Log Vercel | Nessuna menzione nel codice | Dipende dal piano Vercel (non verificabile da qui) | Sì, lato codice | N/A | Nessuna fonte nel repository |
| Geocoding (lat/lng iniziativa) | Nessun TTL separato — il dato persiste finché esiste la riga dell'iniziativa (stesso lifecycle, "cache" permanente per evitare ri-geocodifica) | N/A | Sì, come categoria a sé | Segue la cancellazione dell'iniziativa stessa | `lib/commons/geocoding.ts` L.10 |
| Job di cleanup automatici | **Nessuno esiste** — nessun `vercel.json` con `crons`, nessuno script schedulato trovato | N/A | Sì, confermato per l'intero repository | N/A | Ricerca su `scripts/`, root del repository |

**Nota sul dato "sessioni":** `supabase/config.toml` è il file di configurazione CLI/locale di Supabase. Non è verificato in questa sessione se questi stessi valori (in particolare l'assenza di `timebox`/`inactivity_timeout`) siano stati effettivamente sincronizzati con il progetto Supabase Cloud reale, oppure se sul progetto reale siano stati impostati valori diversi direttamente dalla dashboard. Da verificare.

---

## 8. Proposta basi giuridiche — solo fase demo/test

**Ambito esplicito: solo per l'uso attuale, pre-pilota, con account demo/test. Non descrive le basi giuridiche per un futuro trattamento reale di aziende o lavoratori — quello richiede un'analisi DPO dedicata, già segnalata come blocco aperto in `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md`.**

| Finalità | Base giuridica proposta | Motivazione | Test di bilanciamento | Consenso appropriato? | Cosa deve cambiare prima di utenti/aziende/lavoratori reali |
|---|---|---|---|---|---|
| Gestione richieste di accesso | Art. 6(1)(f) GDPR — legittimo interesse | L'interessato avvia il contatto volontariamente (mailto); KORA non salva nulla server-side (verificato tecnicamente) | Minimo: trattamento avviato e limitato dalla volontà dell'interessato stesso, nessuna persistenza | No — l'iniziativa stessa dell'interessato rende il consenso ridondante | Se in futuro la richiesta venisse salvata server-side, rivalutare |
| Autenticazione e account demo/test | Art. 6(1)(f) GDPR — legittimo interesse (in assenza di un rapporto contrattuale formale) | Erogare l'accesso alla demo richiesta dall'interessato | Basso: dati minimi (email, credenziali), finalità limitata e dichiarata | No come base primaria — il consenso in questa fase non aggiunge una garanzia sostanziale rispetto al legittimo interesse dichiarato | Con aziende/lavoratori reali: probabile base contrattuale (6(1)(b), rapporto col datore) — da confermare con DPO, il consenso resta problematico nel contesto lavorativo (Considerando 43 GDPR) |
| Erogazione della demo richiesta | Art. 6(1)(f) GDPR — legittimo interesse | Fornire il servizio dimostrativo esplicitamente richiesto | Basso | No | Da rivalutare con un rapporto contrattuale reale |
| Comunicazioni operative | Art. 6(1)(f) GDPR — legittimo interesse | Informazioni necessarie all'uso della demo (es. stato account) | Basso | No | Invariato in linea di principio, ma va confermato nel contesto reale |
| Sicurezza applicativa | Art. 6(1)(f) GDPR — legittimo interesse | Il Considerando 49 GDPR riconosce esplicitamente la sicurezza dei sistemi come legittimo interesse tipico | Basso — misura tecnica proporzionata (RLS, Origin guard) | No | Invariato |
| Prevenzione abusi e frodi | Art. 6(1)(f) GDPR — legittimo interesse | Il Considerando 47 GDPR menziona esplicitamente la prevenzione delle frodi | Basso — rate limiting su identificativi opachi, non email/IP (verificato) | No | Invariato |
| Logging tecnico e diagnosi errori | Art. 6(1)(f) GDPR — legittimo interesse | Necessità tecnica di diagnosticare errori; rafforzato dall'assenza verificata di session replay | Basso-medio — richiede comunque una policy di retention (v. proposta sotto) | No | Invariato, ma la retention va definita |
| Tutela e difesa dei diritti | Art. 6(1)(f) GDPR — legittimo interesse, oppure Art. 6(1)(c) se richiesto da un obbligo specifico | Necessità di conservare evidenze in caso di controversia | Da valutare caso per caso con un legale | No come base primaria | Invariato in linea di principio |
| Obblighi di legge | Art. 6(1)(c) GDPR | Quando applicabile un obbligo normativo specifico | N/A (base non discrezionale) | No | Invariato |
| Dati inseriti volontariamente nella demo | Art. 6(1)(f) GDPR — legittimo interesse a erogare la demo richiesta | Dati sintetici/di test forniti dall'utente stesso nel contesto della demo | Da valutare in base al tipo di dato inserito | No come base primaria (salvo dati particolari Art. 9, esplicitamente esclusi da questa fase) | Con dati reali/particolari, servirà una base Art. 9 dedicata (già anticipato come blocco in GATE3 per il pillar LIFE) |

**Nota esplicita:** il consenso non è stato usato come base residuale in nessuna riga di questa tabella — dove non chiaramente più appropriato (contratto, obbligo di legge), è stato proposto il legittimo interesse con motivazione specifica caso per caso, mai in modo generico.

---

## 9. Proposta matrice retention (NON pubblicata, da sottoporre al titolare)

| Voce | Periodo proposto | Evento iniziale | Motivazione | Cancellazione/anonimizzazione | Eccezioni | Fattibilità tecnica oggi | Sviluppo richiesto |
|---|---|---|---|---|---|---|---|
| Richieste di accesso non accolte | N/A | N/A | Il dato non è mai trattato/salvato da KORA (mailto diretto) | N/A | Nessuna | **Già così** | Nessuno |
| Account demo inattivi | 90 giorni di inattività *(proposta prudente, da confermare)* | Ultimo accesso | Minimizzazione — account non reali | Disattivazione o eliminazione | Nessuna nota | **Non disponibile** | Job di pulizia programmato |
| Dati inseriti nelle demo | Fine della fase pre-pilota, o 12 mesi dall'inserimento (il minore) *(proposta prudente)* | Inserimento | Dati sintetici/test, nessuna necessità di conservazione prolungata | Eliminazione | Nessuna | **Parziale** — cancellazione manuale già disponibile (`data-lifecycle/delete`), nessun trigger temporale | Automazione o promemoria periodico |
| Link/token scaduti (CV share) | 30 giorni | Creazione | **Già implementato nel codice** | Flag `expired` — verificare se serve anche pulizia fisica della riga | Nessuna | **Già applicato** (per la scadenza) | Eventuale job di pulizia fisica delle righe scadute, se desiderato |
| Log di sicurezza (rate limit) | Finestra della policy (5-60 min) + margine tecnico | Prima richiesta nella finestra | **Già implementato** (TTL Redis) | Scadenza automatica | Nessuna | **Già applicato** | Nessuno |
| Log applicativi (audit log) | 12-24 mesi *(proposta prudente, da confermare con DPO)* | Creazione della riga di audit | Bilanciare accountability e minimizzazione | Eliminazione o archiviazione fredda | Eventuali obblighi di conservazione più lunghi per controversie in corso | **Non disponibile** | Job di pulizia o partizionamento con eliminazione |
| Error tracking (Sentry) | Allineare al periodo minimo del piano Sentry attivo *(da verificare)* | Cattura errore | Nessuna necessità di conservazione oltre la diagnosi | Gestito dal fornitore | Nessuna nota | **Da verificare sul piano reale** | Nessuno lato KORA, verifica lato Sentry |
| Rate-limit counters | Vedi log di sicurezza sopra | — | — | — | — | **Già applicato** | Nessuno |
| Documenti/file di test | Stesso ragionamento di "dati inseriti nelle demo" | Caricamento | Il file raw non è mai conservato (verificato) — vale per i record derivati | Eliminazione dei record derivati | Nessuna | **Parziale** | Automazione |
| Dati cancellati | N/A (già cancellati) | — | — | Verificato: `uploaded_record`/`uef_record` cancellati realmente; `source_batch` solo marcato; output aggregati mai toccati da questo meccanismo | Output aggregati (KORA Index, Decision Pack) sopravvivono per progetto | — | Nessuno, comportamento attuale è per progetto, non un gap |
| Evidenze per obblighi/controversie | *Da definire con un legale — non stimato qui* | — | Materia squisitamente legale (termini di prescrizione applicabili) | — | — | — | Consulenza legale necessaria prima di proporre un periodo |

**Evitati periodi eccessivi non motivati:** ogni proposta è ancorata a una motivazione esplicita (minimizzazione, natura sintetica dei dati, bilanciamento accountability/minimizzazione) — nessun periodo "di default" arbitrario (es. nessun "conserviamo tutto per 10 anni per sicurezza").

---

## 10. Decisioni richieste al titolare

1. Confermare/rifiutare la proposta di retention per account demo inattivi (90 giorni) e dati demo (12 mesi/fine pre-pilota).
2. Confermare/rifiutare la proposta di retention per audit log (12-24 mesi) — **con consulenza DPO**, dato che tocca anche accountability.
3. Verificare direttamente la checklist fornitori (sezione 1-5) su ciascuna dashboard reale.
4. Decidere se procedere con la firma dei DPA disponibili (Supabase, Vercel se piano Pro/Enterprise, Sentry) o valutare fornitori alternativi.
5. Confermare o correggere la proposta di basi giuridiche demo/test (sezione 8) — **con consulenza DPO**, specialmente per "autenticazione e account demo/test".
6. Decidere se sviluppare i job di pulizia automatica mancanti (account inattivi, audit log, dati demo) prima o dopo l'apertura a utenti reali.

## 11. Eventuali adeguamenti tecnici necessari

- Job di pulizia programmato per account demo inattivi (non esiste oggi).
- Job di pulizia/archiviazione per `audit.audit_log` (non esiste oggi).
- Automazione o promemoria per la cancellazione dei dati demo/file di test (oggi solo manuale).
- Eventuale pulizia fisica delle righe di CV-share scadute (oggi solo flag, la scadenza logica è già applicata).
- Nessun adeguamento necessario per rate-limit counters (già a posto) o per la non-conservazione dei file raw in intake (già a posto).

---

## Regola seguita

Nessuna delle proposte in questo documento è stata dichiarata "definitiva" o pubblicata nella pagina `/privacy`. Ogni voce è marcata esplicitamente come:
- **tecnicamente già applicato** (verificato nel codice, citato con percorso file), oppure
- **decisione proposta** (da confermare dal titolare, marcata "proposta prudente"), oppure
- **da confermare / non verificato** (richiede accesso a dashboard reali o consulenza legale/DPO che non ho).

Nessuna dichiarazione di DPA "sottoscritto" è stata fatta sulla sola base della sua disponibilità pubblica — per ciascun fornitore è esplicitamente indicato che la firma/accettazione non è verificabile da qui.

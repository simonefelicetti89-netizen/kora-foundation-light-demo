APPROVED — RATIFICATO DAL TITOLARE (2026-07-16)

# KORA Link — DPO Decisions (Sprint 09)

**Sprint:** KORA-LINK-DPO-DECISIONS-09
**Branch:** `feature/kora-link-dpo-decisions-09`
**Date:** 2026-07-16 (draft) — **Approvato:** 2026-07-16
**HEAD at start:** `a15c7a6607a8e9e201b91babf45fdc7225cc4e71` (merge of PR #82, KORA-LINK-SECURITY-FOUNDATION-08)
**Status:** APPROVED. Il titolare ha ratificato le raccomandazioni primarie delle 7 decisioni DPO-01..DPO-07 di questo documento. Le modifiche tecniche minime descritte in §25 — estese, con conferma esplicita del titolare, a un rename terminologico (`link_consents` → `link_activation_acknowledgements`, v. nota sotto) — sono state applicate a `034`/`035`/`036`/`lib/kora-link/activation.ts` e ai test unitari corrispondenti. **Il Gate DPO (Gate 3) complessivo NON è chiuso da questa approvazione** — restano aperti: DPIA prudenziale prima di dati reali, RPC di disattivazione self-service del worker, chiusura Gate 4 (RLS self-select worker). V. §9/§24 aggiornato sotto.
**Nota sullo scope tecnico:** in fase di implementazione, il titolare ha confermato esplicitamente un'estensione dello scope tecnico rispetto a quanto originariamente descritto in §25: oltre all'aggiornamento dei valori (`consent_version`, `delivered_to_label` → vincolo), la tabella `kora_link.link_consents` e le sue colonne sono state rinominate (`link_activation_acknowledgements`, `activation_notice_version`, `acknowledged_at`, `deactivated_at`, stati `acknowledged`/`deactivated`) per allineare la terminologia alla decisione di base giuridica (§5): non è consenso ex art. 6(1)(a), è una conferma volontaria di attivazione.

**Aggiornamento — passaggio correttivo terminologico (2026-07-24):** con conferma esplicita del titolare, e poiché `034`-`036` non sono mai state applicate a nessun database e non hanno consumer reali in staging/produzione, anche i nomi esterni sono stati allineati: parametro RPC `p_consent_version` → `p_activation_notice_version`; costante TypeScript `KORA_LINK_ACTIVATION_CONSENT_VERSION` → `KORA_LINK_ACTIVATION_NOTICE_VERSION`; campo `consentVersion` → `activationNoticeVersion`; stato `consent_required` → `activation_notice_required`; valore enum `link_events.event_type = 'consent_accepted'` → `'activation_acknowledged'`; checkbox HTML `consent_confirmed` **rimossa** (espressamente esclusa — l'invio del modulo stesso è l'azione volontaria). V. §25 aggiornato.
**Titolare:** Simone Felicetti (persona fisica — v. `lib/legal/privacy-content.ts`). **Nessun DPO nominato.**
**Questo documento non è consulenza legale.** È una valutazione tecnica/privacy strutturata, prodotta dal team tecnico, che propone raccomandazioni per decisioni che restano del titolare (eventualmente con supporto DPO/legale esterno). Le raccomandazioni sono state approvate dal titolare nella loro forma primaria, come descritto sopra.

---

## 1. Executive Summary

Questo sprint affronta 7 decisioni bloccanti che tengono aperto il Gate DPO (Gate 3) di KORA Link, identificate esplicitamente come BLOCKER nell'header di `supabase/proposed/034_kora_link_schema.sql` e nel registro `app/admin/kora-link/governance/page.tsx`:

1. Retention dell'audit log (e delle altre tabelle KORA Link).
2. Necessità, base giuridica e trattamento di `request_fingerprint`.
3. Base giuridica dell'attivazione worker (consenso vs altra base).
4. Testo del consent/activation notice.
5. Versione canonica del consenso (`consent_version`) — oggi in mismatch tra SQL e app.
6. Semantica di `delivered_to_label`.
7. DPIA screening per il modulo KORA Link.

**Aggiornamento 2026-07-16 — APPROVATO.** Il titolare ha ratificato la raccomandazione primaria di ciascuna delle 7 decisioni. Le sezioni 24-26 (checklist Gate, modifiche tecniche, piano pre-staging) descrivono cosa è stato eseguito subito dopo l'approvazione — v. §25/§26 aggiornati per lo stato effettivo.

**Conclusione aggiornata:** i 4 BLOCKER tecnici (retention, request_fingerprint, consent_version/activation_notice_version, delivered_to_label/delivery_channel) sono **RATIFICATI e implementati** in `034`/`035`/`036`/`lib/kora-link/activation.ts`. Il Gate DPO (Gate 3) **complessivo resta APERTO**: DPO-07 (DPIA) resta una raccomandazione prudenziale da rivalutare prima di dati reali, non una chiusura definitiva; il Gate 4 (RLS self-select worker) e l'RPC di disattivazione self-service restano fuori scope di questo sprint. V. §24 aggiornato.

---

## 2. Stato iniziale (verificato in repo, 2026-07-16)

- Branch di partenza: `main`, working tree pulita, `git pull --ff-only origin main` → already up to date.
- HEAD: `a15c7a6607a8e9e201b91babf45fdc7225cc4e71` (PR #82 — KORA-LINK-SECURITY-FOUNDATION-08, worker identity da `auth.uid()`, `p_worker_id` rimosso, tenant boundary aggiunto, soglia 10 applicata).
- Migrazioni 034-036 KORA Link: **solo in `supabase/proposed/`**, mai applicate a nessun database.
- Migrazioni 037-038: estranee a KORA Link, non toccate da questo sprint.
- `KORA_LINK_ENABLED` e `KORA_LINK_ACTIVATION_ENABLED`: default `false`, nessuna attivazione in nessun ambiente.
- Gate 2 (034, tecnico): sostanzialmente chiuso a livello ingegneristico (KL-19), ratifica umana CTO ancora pendente.
- Gate 4 (035 RLS): aperto — worker self-select su `link_assignments` ancora commentato, nessuna policy company-facing diretta.
- Gate 3 (DPO): **aperto** — oggetto di questo sprint.
- 18 scenari comportamentali DB: ancora `it.todo()`, non trasformati da questo sprint.
- Verdetto Gate 07: **HIDE FROM PILOT**, non modificato da questo sprint.

---

## 3. Trattamenti coinvolti

KORA Link introduce un solo flusso di trattamento dati personali, oggi non attivo:

1. **Provisioning amministrativo del chip** (KORA_ADMIN): generazione batch/token, nessun dato worker.
2. **Consegna fisica del chip all'azienda** (`link_delivery_records`): nessuna identità worker, solo un'etichetta di destinazione operativa (oggetto di DPO-06).
3. **Attivazione del chip da parte del worker**: worker autenticato scansiona il chip, prende visione della notice, conferma attivazione → viene creato un legame token↔worker (`link_assignments`) e un record di consenso (`link_consents`).
4. **Uso quotidiano ("quick access")**: il worker già attivato scansiona il proprio chip per accedere alla propria area My KORA — nessun nuovo dato personale oltre un evento tecnico.
5. **Revoca/sostituzione**: chip perso, rubato, offboarding — chiude il legame token↔worker.
6. **Visibilità aggregata aziendale**: l'azienda vede solo conteggi per stato, soglia 10, mai singoli worker (`fn_company_link_status_aggregate`).
7. **Audit tecnico**: traccia eventi significativi per KORA_ADMIN/DPO (`kora_link.audit_log`), non è una dashboard di sorveglianza individuale.

Nessuno di questi trattamenti alimenta il KORA Index, la PIB o lo scoring — confermato esplicitamente nei commenti di `034` ("NOT an IU/PIB/Index source — no scoring").

---

## 4. Data Map

| Dato | Tabella.colonna | Origine | Finalità | Interessato | Chi può leggerlo (oggi, per RLS 035 draft) | Retention proposta | Classificazione | Necessità | Rischio |
|---|---|---|---|---|---|---|---|---|---|
| Token digest | `links.token_digest` | Generato al provisioning (HMAC-SHA256) | Identificare il chip senza mai storicizzare il valore in chiaro | Nessuno (identificatore tecnico dell'oggetto fisico, non del worker prima dell'attivazione) | KORA_ADMIN | Vita del chip; anonimizzabile/eliminabile a fine vita chip | Identificatore tecnico, non personale finché non associato | Necessario (design KL-04) | Basso |
| Link/token record | `links.*` (status, TTL, timestamps) | Provisioning + lifecycle | Gestione ciclo di vita chip | Nessuno prima dell'attivazione | KORA_ADMIN | Vita del chip + periodo amministrativo dopo dismissione (§15) | Tecnico/amministrativo | Necessario | Basso |
| Tenant ID | `links.tenant_id`, varie | Assegnazione batch | Isolamento tenant | Azienda (non individuo) | KORA_ADMIN, COMPANY_ADMIN (solo via aggregato) | Come il record padre | Identificativo organizzativo | Necessario | Basso |
| Worker identity reference | `link_assignments.worker_id` | Risolto da `auth.uid()` all'attivazione (mai da parametro client) | Associare chip↔worker per il flusso self-service | Worker | KORA_ADMIN, worker stesso (self, quando la policy futura sarà attivata) | Durata dell'assegnazione attiva + finestra post-revoca limitata (§15) — **MAI indefinita** | Dato personale — identificatore diretto (via join) | Necessario per il servizio richiesto dal worker | **Alto** — è la tabella più sensibile dello schema, esplicitamente "NEVER accessible to company roles via any RLS path" |
| Delivery record | `link_delivery_records.*` | Consegna fisica batch→azienda | Logistica pilota | Nessun worker (per design — v. DPO-06) | KORA_ADMIN | 12 mesi da consegna (§15) | Operativo, non personale se rispettata la regola label-only | Necessario solo per logistica pilota | Medio — rischio di degrado a dato personale se il label diventa identificante (v. DPO-06) |
| `delivered_to_label` | `link_delivery_records.delivered_to_label` | Inserito da KORA_ADMIN | Riferimento logistico consegna | Potenzialmente un ruolo/team, mai un individuo per policy | KORA_ADMIN | Come delivery record | Oggetto della decisione DPO-06 | Da restringere (v. DPO-06) | Medio se non vincolato tecnicamente |
| Consent/notice version + timestamp | `link_consents.consent_version`, `accepted_at`, `withdrawn_at` | Attivazione worker | Prova di presa visione/attivazione volontaria | Worker | KORA_ADMIN | Come `link_assignments` (§15) | Necessario per accountability (Art. 5(2) GDPR) | Necessario | Medio |
| Activation timestamp | `links.activated_at` | Attivazione | Prova tecnica di stato | Worker (indiretto) | KORA_ADMIN | Come `link_assignments` | Tecnico | Necessario | Basso |
| Revocation timestamp/reason | `revocations.*` | Revoca | Audit trail immutabile | Worker (indiretto) | KORA_ADMIN | §15 categoria "revoca" | Personale se worker_id valorizzato | Necessario | Medio |
| Expiry | `links.pre_activation_expires_at`, stato `expired` | TTL automatico | Igiene dati, chip mai attivati | Nessuno (chip mai associato a un worker) | KORA_ADMIN | §15 categoria "scadenza" | Tecnico | Necessario | Basso |
| Audit events | `audit_log.*` | Ogni evento significativo | Governance, DPO audit, security review, break-glass | Worker (quando `actor_id`/collegamento a `link_id` lo rende identificabile) | KORA_ADMIN (SELECT); DPO via break-glass futuro, non ancora implementato | §15 — retention differenziata per categoria (non unica) | Mista: tecnico/personale a seconda della riga | Necessario in forma minimizzata | Medio-Alto se non minimizzato |
| `request_fingerprint` | `audit_log.request_fingerprint` | Mai popolato (nullable, bloccato da DPO-02) | Prevenzione abusi (proposta, non implementata) | Worker/visitatore anonimo | Nessuno oggi (colonna vuota) | N/A oggi — oggetto di DPO-02 | **Da classificare in DPO-02: non anonimo per definizione** | Da verificare (v. DPO-02) | Alto se popolato senza restrizioni |
| `token_digest_prefix` (8 char) | `audit_log.token_digest_prefix` | Automatico | Correlazione eventi senza lookup key completa | Nessuno direttamente | KORA_ADMIN | Come la riga audit padre | Tecnico, non invertibile al token completo | Necessario | Basso |
| Operational event log | `link_events.*` | Ogni evento lifecycle | Debug operativo, non IU/scoring | Worker (quando `worker_id` valorizzato) | KORA_ADMIN | Non ancora definita — raccomandata allineata a `audit_log` categoria corrispondente (§15, nota) | Personale se worker_id valorizzato | Necessario in forma minimizzata | Medio |
| Aggregation bucket (company view) | Output di `fn_company_link_status_aggregate` (non persistito) | Calcolato on-the-fly | Visibilità azienda | Nessuno (aggregato, soglia 10) | COMPANY_ADMIN (proprio tenant), KORA_ADMIN | N/A — non persistito, nessuna retention applicabile | Aggregato, non personale se soglia rispettata | Necessario | Basso |
| Partner references | Non presenti in 034-036 (partner_scans deferito a v1.1+) | — | — | — | — | N/A | N/A | Fuori scope Sprint 09 | N/A |
| Campaign/initiative references | Non presenti in 034-036 | — | — | — | — | N/A | N/A | Fuori scope Sprint 09 | N/A |

---

## 5. Basi giuridiche — inventario e proposta

Riferimento vincolante già canonico e pubblicato: `lib/legal/privacy-content.ts` §5 dichiara che **il consenso non è usato come base giuridica generale o residuale** sulla piattaforma, e rimanda esplicitamente a `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md` sulla presunta invalidità del consenso in ambito lavorativo (Considerando 43 GDPR; EDPB WP249/2017). Qualunque proposta qui deve essere coerente con questo principio già approvato dal titolare, non contraddirlo.

| Trattamento | Base giuridica proposta | Motivazione |
|---|---|---|
| Provisioning chip, lifecycle amministrativo, audit tecnico di sicurezza | Art. 6(1)(f) — legittimo interesse del titolare alla sicurezza e integrità del servizio | Coerente con la sezione "Sicurezza applicativa" già pubblicata in `lib/legal/privacy-content.ts` §5 |
| Fornitura della funzionalità KORA Link al worker che la richiede (attivazione, quick access) | Art. 6(1)(b) — esecuzione di un servizio richiesto dal worker, **oppure** Art. 6(1)(f) se non qualificabile come "servizio" in senso stretto | Il worker richiede attivamente una funzionalità opzionale, invisibile al datore di lavoro; NON si usa il consenso come base giuridica primaria, per evitare il problema di invalidità in ambito lavorativo già documentato in Gate 3 |
| L'azione "presa visione e conferma di attivazione" da parte del worker | **Non** la base giuridica primaria del trattamento (v. sopra); è un elemento di trasparenza/accountability (prova di informativa fornita e scelta volontaria), non un consenso ex art. 6(1)(a) su cui si fonda la liceità | Evita di presentare al worker un "consenso" che, in ambito lavorativo, rischierebbe di essere legalmente non valido come base — pur mantenendo un'azione di attivazione genuinamente volontaria e verificabile |
| Visibilità aggregata azienda (conteggi ≥10) | Art. 6(1)(f) — legittimo interesse organizzativo dell'azienda-controller sui propri dati aggregati | Coerente con il trattamento di analytics aggregata già descritto in Gate 3 §3.1 |
| Dati particolari (Art. 9) | **Non applicabile a KORA Link in sé** — l'attivazione del chip non tratta dati sanitari o categorie particolari. Il rischio Art. 9 esiste solo indirettamente, a valle, nel contenuto di My KORA a cui il chip dà accesso (già gestito dalla policy generale, non da KORA Link) | KORA Link è un bridge fisico-digitale, non una fonte di dati sanitari |

**Nota di cautela:** questa è una proposta tecnica, non un parere legale. Il titolare deve confermarla, idealmente con supporto DPO/legale esterno, prima che qualunque worker reale possa attivare un chip.

---

## 6-13. Vedi sezioni tematiche sotto (BLOCCO 1-9)

Le sezioni richieste "audit retention" (7), "request fingerprint" (8), "consent/activation notice" (9), "consent version" (10), "delivered_to_label" (11), "ruoli e visibilità" (12), "soglia aggregazione" (13) sono trattate integralmente nei BLOCCHI 1-7 sotto, che seguono la struttura richiesta dal brief dello sprint.

---

# BLOCCO 1 — Audit log retention

## Inventario

- **Tabella**: `kora_link.audit_log` (schema `034`, righe 878-985). Append-only per design (nessuna policy UPDATE/DELETE in `035`).
- **Colonne**: `id`, `link_id` (no FK — sopravvive alla cancellazione del token), `tenant_id`, `actor_type` (kora_admin/company_admin/worker/system), `actor_id`, `action` (testo libero enum-like: BATCH_CREATED, TOKEN_GENERATED, ACTIVATION_ATTEMPTED, ACTIVATION_COMPLETED, CONSENT_ACCEPTED, CONSENT_WITHDRAWN, TOKEN_REVOKED, TOKEN_SUSPENDED, TOKEN_REPLACED, QUICK_ACCESS, BREAK_GLASS_ACCESS, ADMIN_OVERRIDE), `result`, `request_fingerprint` (nullable, oggetto DPO-02), `token_digest_prefix` (8 char, correlazione non-lookup), `metadata` jsonb, `created_at`.
- **Eventi effettivamente scritti oggi (in codice, non solo previsti nello schema)**: `036` scrive in `audit_log` solo da `fn_activate_link_for_worker` — su successo (`ACTIVATION_COMPLETED`) e su rifiuto per tenant mismatch (`ACTIVATION_ATTEMPTED`/`forbidden`). `fn_revoke_link`, `fn_replace_link`, `fn_public_lookup_link` **non** scrivono ancora su `audit_log` (scrivono solo su `link_events`, che ha una policy di accesso diversa e nessuna decisione di retention propria — v. nota finale di questo blocco). Questo è un gap residuo già tracciato in `docs/KORA_LINK_SECURITY_FOUNDATION_08.md` (TODO-RLS-05), non risolto da questo sprint.
- **Lettori autorizzati (035 draft)**: solo KORA_ADMIN via SELECT. Un accesso DPO via break-glass è documentato come intenzione ("DPO: read access via break-glass function") ma la funzione non esiste ancora in nessuna migrazione proposta.
- **Finalità**: governance KORA_ADMIN, audit DPO, security review, log break-glass — esplicitamente non IU/scoring, non dashboard individuale.
- **Dati pseudonimi**: `token_digest_prefix` (8 char, non invertibile al token completo). `actor_id` è un UUID diretto, non pseudonimizzato.
- **Tenant identifier**: presente (`tenant_id`, nullable per eventi di sistema).
- **Worker identifier**: presente solo indirettamente — non esiste una colonna `worker_id` diretta su `audit_log` (a differenza di `link_events`); il worker è identificabile tramite `actor_id` quando `actor_type = 'worker'`, oppure per join tramite `link_id` → `link_assignments`.
- **Reason code**: non strutturato su `audit_log` (il campo `result` è libero: 'ok', 'failed', 'forbidden', ecc.); i `reason` strutturati (lost/stolen/worker_request/...) vivono su `revocations`/`link_replacements`, non su `audit_log`.
- **Payload/metadata**: JSONB, con divieto esplicito nel commento di colonna di includere `token_value`, `full token_digest`, `worker_name`, `worker_email`.
- **Indici**: su `(link_id, created_at)`, `(tenant_id, created_at)`, `(actor_type, created_at)`, `(action)`.
- **FK**: nessuna su `link_id` (deliberato — l'audit deve sopravvivere alla cancellazione del token).
- **Cancellazione/anonimizzazione**: non implementata in nessuna migrazione proposta. Nessun job esiste. `034` lo dichiara esplicitamente come BLOCKER (TODO-CTO-05 / GATE-3).

## Decisione richiesta — retention per categoria

Il brief richiede categorie distinte, non una retention unica. Le 10 categorie richieste non mappano 1:1 sulle 12 `action` effettivamente definite nello schema; le raggruppo per rischio/finalità omogenei:

| # | Categoria (brief) | Action(s) corrispondenti in `034`/`036` | Worker-identificabile? | Retention proposta | Motivo della durata |
|---|---|---|---|---|---|
| 1 | Eventi tecnici di sicurezza | `ADMIN_OVERRIDE`, `BREAK_GLASS_ACCESS`, esiti `forbidden`/`failed` (incl. tenant-mismatch già scritto da `036`) | A volte (se worker autenticato ha tentato l'azione) | 12 mesi dall'evento, estendibile solo sotto legal hold documentato | Allineato al precedente organizzativo già pubblicato in `lib/legal/privacy-content.ts` §9 ("Log applicativi e di sicurezza: fino a 12 mesi"); sufficiente per investigazione di sicurezza, minimizzato oltre |
| 2 | Eventi di creazione | `BATCH_CREATED`, `TOKEN_GENERATED` | No (pre-assegnazione, nessun worker) | 24 mesi dall'evento, o chiusura batch + 12 mesi | Basso rischio privacy (nessuna identità worker); retention più lunga giustificata da esigenze di audit amministrativo/inventario hardware |
| 3 | Eventi di consegna | `DELIVERED_TO_COMPANY` (in `link_events`, non ancora in `audit_log`) + `link_delivery_records` (v. §15) | No, se `delivered_to_label` resta un'etichetta di ruolo (v. DPO-06) | 12 mesi dalla consegna | Utilità operativa esaurita dopo l'attivazione; nessuna identità worker da proteggere se DPO-06 è rispettata |
| 4 | Eventi di lookup | `fn_public_lookup_link` — oggi **non scrive su `audit_log`** (solo rate-limit Upstash, effimero) | No (nessuna identità restituita dalla funzione) | N/A per `audit_log` — se in futuro si aggiunge logging di lookup, retention ≤ 6 mesi, coerente con basso rischio | Il lookup pubblico non identifica il worker; se loggato in futuro andrebbe minimizzato ulteriormente |
| 5 | Eventi di attivazione | `ACTIVATION_ATTEMPTED`, `ACTIVATION_COMPLETED`, `CONSENT_ACCEPTED` | Sì | Durata dell'assegnazione attiva + 24 mesi dopo la cessazione (revoca/sostituzione/offboarding) | Necessaria come prova di attivazione volontaria e di presa visione della notice (accountability, Art. 5(2) GDPR); non indefinita — allineata alla finestra di difesa da contestazioni post-rapporto |
| 6 | Rigetti | Esiti `forbidden`/`unavailable` di `ACTIVATION_ATTEMPTED` (incl. tenant mismatch) | Sì, se worker autenticato | 12 mesi | Stessa motivazione della categoria "sicurezza" — un rigetto è un segnale di sicurezza, non un evento di vita normale del consenso |
| 7 | Revoca | `TOKEN_REVOKED`, `CONSENT_WITHDRAWN` | Sì | Come categoria 5 (durata rapporto + 24 mesi) | La revoca è il contraltare del consenso — stessa esigenza di accountability e simmetria di trattamento |
| 8 | Sostituzione | `TOKEN_REPLACED` | Sì (indirettamente, worker del token sostituito) | Come categoria 5 | Fa parte della catena di custodia del chip, stessa logica di accountability |
| 9 | Scadenza | Transizione a stato `expired` (oggi non genera una riga `audit_log` dedicata — solo ricalcolo lazy in `fn_company_link_status_aggregate`) | No (chip mai attivato) | 6 mesi se in futuro loggata esplicitamente | Rischio privacy quasi nullo — nessuna identità worker associata a un chip mai attivato |
| 10 | Anomalie/abusi | `ADMIN_OVERRIDE`, `BREAK_GLASS_ACCESS`, pattern di rate-limit ripetuti (oggi solo in Upstash, non in Postgres) | Variabile | 12 mesi, estendibile sotto legal hold | Stessa motivazione della categoria "sicurezza"; consistenza con l'unica retention di sicurezza già approvata a livello di piattaforma |

**Distinzioni esplicite richieste dal brief:**

- **Retention del record link (`kora_link.links`)**: il record del chip (token_digest, status, timestamps) non è di per sé un dato personale prima dell'attivazione. Proposta: conservazione per l'intera vita operativa del chip (fino a dismissione/rottamazione hardware); dopo revoca definitiva, il `token_digest` può restare per prevenire riutilizzo fraudolento del chip fisico, ma senza che sia più raggiungibile alcun collegamento al worker (v. sotto).
- **Retention del token digest**: come sopra — il digest da solo, senza `link_assignments` collegato, non è un dato personale. Nessuna cancellazione forzata separata proposta.
- **Retention degli eventi audit**: tabella sopra, per categoria.
- **Retention degli aggregati**: non applicabile — gli aggregati (`fn_company_link_status_aggregate`) non sono persistiti, sono calcolati on-the-fly ad ogni chiamata. Nessuna retention necessaria.
- **Retention dei dati di consegna**: 12 mesi (categoria 3 sopra), applicata a `link_delivery_records` come tabella, non solo agli eventi corrispondenti in `audit_log`/`link_events`.
- **Retention di `link_assignments` (il legame token↔worker, la tabella più sensibile)**: **non esplicitamente richiesta dal brief per nome, ma necessaria per coerenza** — proposta: la riga resta `status = 'active'` per la durata del rapporto; alla revoca/offboarding, la riga passa a uno stato terminale e viene mantenuta per una finestra breve (proposta: 30 giorni) per gestire eventuali contestazioni immediate, poi **anonimizzata** (es. `worker_id` sostituito con un placeholder non ricollegabile, mantenendo `link_id`/`tenant_id`/timestamps per statistica aggregata) — non conservata indefinitamente in forma identificabile.

## Vincoli rispettati dalla proposta

- Nessuna retention è "per sempre" per dati worker-identificabili.
- L'audit non diventa un registro consultabile dal company admin (resta KORA_ADMIN-only + futuro break-glass DPO).
- Nessuna delle retention proposte è pensata per abilitare ranking o inferenze comportamentali — sono tutte finalizzate a sicurezza/accountability, non a valutazione.

## Cosa NON viene implementato in questo sprint

Nessun job di cancellazione automatica. La proposta chiarisce however **cosa** deve essere cancellato, **quando**, **come**, **chi** e **come verificarlo**:
- Cosa: righe `audit_log`/`link_events` oltre la retention di categoria; righe `link_assignments` terminali oltre 30 giorni (anonimizzazione, non cancellazione, per preservare le statistiche aggregate).
- Quando: retention scaduta calcolata da `created_at`/`ended_at`.
- Come: Supabase Edge Function schedulata (non `pg_cron` — coerente con la raccomandazione ingegneristica già presente nell'header di `034`), eseguita post-Gate-3.
- Chi: KORA_ADMIN/Engineering, sotto supervisione del titolare.
- Verifica: query di conteggio periodiche (`SELECT count(*) WHERE created_at < now() - retention_category`) prima/dopo l'esecuzione del job, loggate esse stesse come evento `ADMIN_OVERRIDE`-equivalente per audit del cleanup.

---

# BLOCCO 2 — request_fingerprint

## Test di necessità

1. **Quale abuso dovrebbe prevenire**: enumerazione/brute-force di token sulla route pubblica `/link/[token]`, e correlazione forense di tentativi di attivazione respinti provenienti dallo stesso dispositivo/rete.
2. **Controlli già esistenti** (verificati nel codice):
   - Token digest: HMAC-SHA256, 64 caratteri esadecimali, spazio di ricerca non forzabile a forza bruta in pratica (`kora_link.links.token_digest`).
   - Rate limiting: Upstash, già bucketizzato su hash di IP+UA (`lib/kora-link/rate-limit.ts`, `KORA_LINK_RATE_LIMIT_MAX_PUBLIC = 20` per finestra di 60s), **effimero**, non persistito in Postgres.
   - Expiry: `pre_activation_expires_at`, TTL 180 giorni, verificato ad ogni lookup/attivazione (query-layer, non solo app-layer — KL-19).
   - Revoca: `fn_revoke_link`, immediata.
   - Single-assignment: indice unico parziale `uq_assignment_link_active` — un solo worker attivo per token.
   - Origin guard: `assertSameOrigin` attivo su `app/link/[token]/activate/route.ts`.
   - Autenticazione: `fn_activate_link_for_worker` richiede `auth.uid()` non nullo; nessuna attivazione anonima.
   - Risposta identica per "not found" e "unusable" su `fn_public_lookup_link` — nessun segnale di enumerazione.
3. **Cosa aggiunge realmente il fingerprint**: solo la possibilità di correlare, **a posteriori e in modo persistente**, più righe di `audit_log` provenienti dallo stesso dispositivo/rete — una capacità forense che i controlli sopra (tutti già attivi o pronti all'attivazione) non forniscono, perché Upstash è a finestra breve e non persiste oltre il rate-limit window.
4. **Può la finalità essere raggiunta con mezzi meno invasivi**: sì — gli stessi controlli sopra (in particolare Upstash + Origin guard + autenticazione obbligatoria per l'attivazione) coprono il caso d'uso realistico per un pilota su chip fisici distribuiti one-to-one, dove l'"abuso" plausibile è lo scanning ripetuto di token altrui, già bloccato da rate limit + spazio digest.
5. **Viene utilizzato o solo previsto**: **solo previsto**. La colonna è `NULL` per design, mai popolata, esplicitamente bloccata da un commento BLOCKER nello schema.
6. **Influenza decisioni automatizzate**: no.
7. **Viene mostrato a company, worker, partner o admin**: no, in nessuna RLS policy o vista.
8. **Consente correlazione nel tempo**: sì, se popolato — un hash stabile di IP+UA è per costruzione riproducibile per lo stesso dispositivo/rete su richieste successive, il pattern esatto di un "fingerprint di dispositivo persistente" che il brief vieta esplicitamente.
9. **Consente correlazione tra tenant**: sì, se popolato senza scoping esplicito per tenant — nulla nello schema attuale lega l'hash a un singolo tenant/finalità.
10. **Invertibile o soggetto a brute force**: un hash naive di IP+UA (senza secret server-side, senza salt, senza rotazione) è soggetto a brute force per combinazioni note/plausibili di IP+UA — è esattamente il rischio che il commento DPO nello schema segnala come non ancora deciso ("confirm IP hashing strategy").

## Classificazione

`request_fingerprint`, così come specificato oggi (hash di IP+UA, senza ulteriore restrizione), è **un identificatore tecnico che costituisce dato personale quando combinato con `tenant_id`/`actor_id` nella stessa riga** — non è anonimo per il solo fatto di essere un hash. Coerentemente con la richiesta esplicita del brief ("non definirlo anonimo solo perché hashato"), la classificazione corretta è: **dato personale / pseudonimo forte**, non anonimo, non "dato non necessario a priori" ma la cui necessità non è dimostrata dal test sopra.

## Fonti possibili

Per design dichiarato nello schema: `IP + user-agent`. Non risultano nel codice altre fonti (nessun cookie, nessun device ID, nessun worker ID incorporato).

## Decisione preferenziale

**Raccomandazione: rimuovere la colonna `request_fingerprint` da `kora_link.audit_log` in `034`.**

Motivazione:
- Il test di necessità (sopra) mostra che i controlli anti-abuso già presenti coprono il caso d'uso plausibile per un pilota di questa scala.
- Esiste un **precedente diretto nello stesso file**: `034` ha già rimosso l'intera tabella `public_lookup_attempts` con la motivazione esplicita "No consumer in v1 ... Upstash handles rate limiting operationally ... High-volume GDPR-relevant table without utility in v1" (A-06/D-06). La stessa logica si applica, a fortiori, a una singola colonna nullable mai popolata e senza consumer.
- Rimuovere ora, prima che 034 sia mai applicata, evita di dover gestire una migrazione di rimozione futura su un ambiente con dati reali.

**Alternativa, se il titolare preferisce mantenere una capacità di anomaly-detection futura:** non implementarla ora (nessun consumer), e se in futuro emergesse un bisogno concreto, introdurla come nuova migrazione con:
- HMAC server-side con secret dedicato (mai un hash semplice di IP/UA);
- scope esplicito per tenant/finalità (non un identificatore globale riutilizzabile);
- rotazione periodica del secret;
- retention breve (proposta: allineata alla categoria "sicurezza", 12 mesi, non di più);
- nessuna esposizione applicativa a nessun ruolo;
- nessuna correlazione cross-tenant abilitata dal design;
- nessun uso analitico o di profilazione, mai citato come input a scoring/KORA Index (già escluso architetturalmente).

**Esplicitamente vietato in qualunque scenario**, coerentemente col brief: SHA semplice di IP o user-agent senza secret; fingerprint persistente di dispositivo; identificatore riutilizzabile tra tenant; fingerprint del worker visibile all'azienda; uso per ranking o affidabilità; conservazione indefinita; logging del dato sorgente (IP/UA in chiaro).

## Base giuridica (se mantenuto in forma limitata)

Se il titolare decidesse di mantenere una versione futura limitata: **Art. 6(1)(f) — legittimo interesse alla sicurezza e prevenzione abusi**, mai il consenso (una misura tecnica di sicurezza non facoltativa non può dipendere da un consenso revocabile).

**Legitimate Interest Assessment sintetico (solo se mantenuto):**
- *Finalità*: prevenzione di enumerazione/abuso della route pubblica di lookup token.
- *Necessità*: da dimostrare caso per caso — oggi non dimostrata (v. test sopra), motivo della raccomandazione di rimozione.
- *Bilanciamento*: l'interesse alla sicurezza è legittimo, ma il mezzo (fingerprint persistente in un audit log worker-identificabile) è sproporzionato rispetto ai controlli già esistenti.
- *Aspettative dell'interessato*: un worker che attiva un chip aziendale non si aspetterebbe un fingerprint di dispositivo persistente e cross-tenant nel log di sicurezza.
- *Impatto*: correlazione comportamentale non necessaria, rischio di percezione di sorveglianza (coerente con il rischio #1 già documentato in `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md` §6).
- *Garanzie*: se mai reintrodotto, HMAC + secret + scope + rotazione + retention breve, come sopra.
- *Diritto di opposizione*: non applicabile a una misura di sicurezza legittima ben scoped; applicabile se il trattamento eccedesse lo scope di sicurezza.

---

# BLOCCO 3 — Consent / activation notice

## Ricostruzione del trattamento

- **Cosa viene attivato**: un chip NFC fisico assegnato dall'azienda al worker viene associato, nel sistema, all'identità del worker che lo scansiona e conferma l'attivazione. Da quel momento il chip permette al worker di accedere rapidamente alla propria area personale My KORA ("quick access").
- **Titolare**: Simone Felicetti (persona fisica) — v. `lib/legal/privacy-content.ts`.
- **Azienda coinvolta**: l'azienda del worker, in qualità di fornitrice/distributrice fisica del chip; **non riceve alcuna informazione individuale** sull'attivazione del singolo worker.
- **Dati trattati**: identità del worker (via sessione autenticata), un legame token↔worker, un record di conferma con versione della notice e timestamp.
- **Finalità**: fornire al worker una funzionalità opzionale di accesso rapido alla propria area personale.
- **Cosa vede l'azienda**: solo conteggi aggregati per stato del chip (attivi/pendenti/revocati), soltanto se il bucket ha ≥10 elementi (soglia `SAFE_AGGREGATION_THRESHOLD`), mai quale worker specifico ha attivato quale chip.
- **Cosa non vede l'azienda**: l'identità del worker che ha attivato un singolo chip; i log di attivazione individuali; l'uso quotidiano ("quick access") del worker.
- **Segnali aggregati**: solo conteggi per stato (`generated`, `active`, `revoked`, ecc.), mai per singolo worker.
- **Soglia minima**: 10 (`SAFE_AGGREGATION_THRESHOLD`, `lib/constants/kora.ts:57` — già applicata in `fn_company_link_status_aggregate`).
- **Volontarietà**: l'attivazione è un'azione volontaria del worker; il chip resta inattivo se il worker non lo attiva; nessun impatto documentato sul rapporto di lavoro per il mancato utilizzo (verifica architetturale, non organizzativa — v. limiti in BLOCCO 8).
- **Conseguenze del rifiuto**: nessuna, per architettura — il chip resta semplicemente inattivo.
- **Revoca**: sì, tramite `fn_revoke_link` (KORA_ADMIN) o motivo `worker_request` nella tabella `revocations`.
- **Scadenza**: TTL di 180 giorni se il chip non viene mai attivato.
- **Durata del trattamento**: per la durata dell'assegnazione attiva; v. §15/BLOCCO 1 per la retention post-cessazione.
- **Diritti**: da esercitare tramite i canali già pubblicati nella privacy policy generale (§10-11 di `lib/legal/privacy-content.ts`).
- **Link alla privacy policy completa**: `/privacy` (pagina pubblica esistente).

## Distinzione fondamentale

Come anticipato in §5: l'azione del worker **non è presentata come l'unica base giuridica del trattamento** (evitando il rischio di consenso invalido in ambito lavorativo), ma resta una **conferma volontaria di attivazione con presa visione della notice** — un elemento di trasparenza e accountability, non la base di liceità primaria (che è il legittimo interesse/servizio richiesto, v. §5).

## Testo del notice (approvato dal titolare — italiano)

**1. Titolo:**
> Attiva il tuo KORA Link

**2. Testo breve:**
> Il tuo KORA Link ti permette di accedere rapidamente alla tua area personale My KORA scansionando il chip. L'attivazione è facoltativa: se non la confermi, il chip resta inattivo e nulla cambia per te. La tua azienda non vede se, quando o come usi il tuo KORA Link — vede solo un conteggio aggregato dei chip attivi in azienda, mai collegato al tuo nome.

**3. Dettagli espandibili:**
> Attivando il KORA Link, questo chip viene associato al tuo account. Da questo momento potrai usarlo per accedere più velocemente alla tua area personale. Nessun dato sulla tua attività individuale con il chip è visibile alla tua azienda: l'azienda vede solo quanti chip sono attivi in totale, mai a livello di singola persona, e solo se il numero è sufficientemente alto da non poter risalire a te. Puoi chiedere in qualsiasi momento la disattivazione del tuo KORA Link scrivendo a simone.felicetti.kora@gmail.com. Per maggiori informazioni sul trattamento dei tuoi dati, consulta la [informativa privacy completa](/privacy).

**4. Checkbox:** nessuna. Espressamente esclusa — l'invio del modulo di attivazione (unico pulsante "Attiva KORA Link") è di per sé l'azione volontaria di attivazione; non è richiesta una casella di conferma separata.

**5. Testo del pulsante:**
> Attiva KORA Link

**6. Messaggio di successo:**
> KORA Link attivato. Puoi usarlo da ora per accedere rapidamente alla tua area personale.

**7. Messaggio di errore privacy-safe:**
> Non è stato possibile completare l'attivazione. Riprova più tardi o contatta il supporto — nessun dettaglio tecnico è stato registrato a tuo carico.
> *(Nota: questo testo generico riflette deliberatamente le risposte "unavailable" uniformi già implementate lato RPC, per non rivelare la causa esatta del rifiuto — coerente con il design anti-enumerazione di `036`.)*

**8. Link alla privacy policy:** `/privacy` (esistente).

**9. Versione inglese:** non richiesta in questo sprint — la piattaforma è Italian-first per copy rivolta al worker (CLAUDE.md §12.15); nessuna versione inglese esistente da cui derivarla.

**10. Versione canonica identificabile:** v. BLOCCO 4 sotto — `kora-link-activation-notice-v1.0`.

**Nota:** questo testo è **approvato dal titolare** (KORA-LINK-DPO-DECISIONS-09, 2026-07-16) ed è il valore reale inserito nella whitelist `activation_notice_version` in `036` (canonico: `kora-link-activation-notice-v1.0`).

---

# BLOCCO 4 — consent_version

## Inventario dei valori attuali

| Fonte | Valore | Stato |
|---|---|---|
| SQL — `034_kora_link_schema.sql` (commento) | `'kora-link-privacy-v1.0'` (esempio in commento) | Esempio, non vincolante di per sé |
| SQL — `036_kora_link_rpc_functions.sql`, `c_valid_consent_version` in `fn_activate_link_for_worker` | `'kora-link-privacy-v1.0'` (hardcoded) | **Valore attualmente imposto lato DB** |
| TypeScript — `lib/kora-link/activation.ts:23` | `KORA_LINK_ACTIVATION_CONSENT_VERSION = 'kora-link-consent-v1-draft'` | **Diverso dal valore SQL — mismatch confermato**, esplicitamente commentato come "provisional — final copy/version requires DPO/legal approval" |
| Test | `tests/unit/kora-link-activation.test.ts`, `tests/unit/kora-link-rls035-review.test.ts`, `tests/unit/kora-link-security-foundation-08.test.ts` | Verificano il comportamento attuale (incluso il mismatch, non lo risolvono) |
| Pattern esistente altrove in piattaforma (non-KORA-Link) | `CURRENT_PRIVACY_CONSENT_VERSION = 'B113-v1.0'` (`app/api/worker/onboarding/route.ts:20`) | Convenzione già in uso: `<sprint-code>-v<major>.<minor>` |
| Documentazione | `docs/KORA_LINK_ADR.md`, `KORA_LINK_GATE_REPORT.md`, `KORA_LINK_DECISION_GATE_07.md`, `KORA_LINK_034_*` (archivio) | Tutti riportano il mismatch come blocker noto, nessuno lo risolve |

## Decisione proposta

**Versione canonica proposta: `kora-link-activation-notice-v1.0`**

Motivazione della convenzione:
- Segue lo stile semantico-descrittivo già presente nel commento SQL esistente (`kora-link-privacy-v1.0`), preferito a una convenzione puramente datata perché descrive *cosa* è stato accettato (la notice di attivazione), non solo *quando*.
- Rinomina da "privacy" a "activation-notice" per precisione: questo non è l'intera privacy policy (quella resta `/privacy`, versionata separatamente via `PRIVACY_DOCUMENT_VERSION` in `lib/legal/privacy-content.ts`), ma la notice specifica mostrata al momento dell'attivazione del chip (v. BLOCCO 3).
- Distinta dalla convenzione `B113-v1.0` (sprint-code) già usata per il consenso onboarding generale, perché sono due notice testualmente diverse per due trattamenti diversi — non vanno confuse sotto lo stesso identificatore.

**Regole di governo della versione:**
- Immutabile una volta pubblicata: ogni modifica sostanziale del testo richiede un nuovo valore (`v1.1`, `v2.0`, ecc.), mai una modifica silenziosa dello stesso valore.
- Deve essere identica, byte-per-byte come stringa, tra SQL (`036`, whitelist in `fn_activate_link_for_worker`) e TypeScript (`lib/kora-link/activation.ts`) — il mismatch attuale deve essere risolto **dopo** l'approvazione, non prima.
- Non deve mai contenere `draft` una volta approvata.
- Salvata solo come prova della scelta dell'utente (in `link_consents.consent_version`), non come strumento di tracciamento comportamentale.

## Compatibilità

- **Record esistenti**: nessuno — `034`/`035`/`036` non sono mai state applicate a nessun database, staging incluso. Verificato: nessun `link_consents` reale può esistere.
- **Record demo/test**: i test unitari usano stringhe di test proprie via `rpcClientOverride`/mock — non toccano un DB reale, nessuna migrazione dati necessaria.
- **Migrazioni mai applicate**: confermato per `034-036`; questo sprint può quindi correggere il valore prima dello staging senza gestire una migrazione di dati.
- **Rollback**: non applicabile — nessun dato da fare rollback.
- **Versione futura / re-consent**: lo schema supporta nativamente il re-consent — lo stato `superseded` su `link_consents.status` è già previsto per "superseded by a newer consent version (re-consent flow)". Nessuna modifica di schema necessaria per supportare una v1.1/v2.0 futura.

---

# BLOCCO 5 — delivered_to_label

## Analisi

- **Dove viene usato**: `kora_link.link_delivery_records.delivered_to_label`, tabella di logistica di consegna fisica batch→azienda, esplicitamente disaccoppiata da qualunque identità worker per design (KL-16 nota A-10).
- **Chi lo inserisce**: KORA_ADMIN (unico ruolo con INSERT/UPDATE su questa tabella in `035`).
- **Chi lo vede**: solo KORA_ADMIN (nessuna policy COMPANY_ADMIN o WORKER in `035` — nonostante il commento originale in `034` ipotizzasse un futuro accesso COMPANY_ADMIN, `035` non lo implementa).
- **Contiene nome, email, matricola o reparto?**: per policy dichiarata, **mai** nome, worker ID o email — solo un'etichetta di ruolo/team (es. "HR Manager", "Office Reception"). Nessun vincolo tecnico (CHECK constraint) impone questo oltre alla lunghezza massima (200 caratteri) — è oggi solo una convenzione documentata nei commenti, non applicata dallo schema.
- **È necessario?**: sì, per la logistica di consegna fisica dei chip durante un pilota (tracciare a chi in azienda sono stati fisicamente consegnati i chip prima dell'attivazione worker).
- **È dato libero?**: sì, oggi (`text`, nessun `CHECK` sul contenuto oltre alla lunghezza) — questo è il rischio segnalato dal brief.
- **Può diventare un identificatore personale?**: sì, se il KORA_ADMIN inserisse un dettaglio di sede/ufficio troppo specifico in un'azienda piccola (l'esempio esplicito nello schema stesso: "HR Manager — Milan office" può ri-identificare in un ufficio piccolo).
- **Parte del flusso logistico NFC?**: sì, esclusivamente.
- **Alternative strutturate?**: sì, disponibili e proposte sotto.

## Decisione preferenziale

**Proposta: sostituire il testo libero con una struttura minimizzata + vincolo tecnico.**

Struttura minimizzata proposta (in linea con l'opzione 7 del brief — "vietare email, nome completo, note e descrizioni"):
- `delivery_batch` — riferimento al batch (già esiste come `batch_id`, FK).
- `delivery_channel` — enum ristretto: `'hr_admin' | 'office_reception' | 'site_admin' | 'other'` (non testo libero).
- `delivered_at` — già esistente.
- `status` — implicito nello stato del batch/delivery record.

**Se il titolare preferisce mantenere un campo descrittivo libero** (per flessibilità operativa reale in un pilota piccolo), la raccomandazione minima è:
- Vincolare tecnicamente (non solo documentalmente) il campo con un `CHECK` che rifiuti pattern tipici di email (`@`) e che limiti la lunghezza a un valore molto più corto dell'attuale 200 (proposta: 60 caratteri, sufficiente per un ruolo/team, insufficiente per una frase descrittiva con dettagli di sede);
- Vietare esplicitamente, a livello di validazione applicativa (non solo commento SQL), l'inserimento di nomi completi o dettagli di sede sotto la soglia di aggregazione (10) — es. impedire stringhe che contengano nomi propri riconoscibili non è tecnicamente verificabile in modo affidabile lato DB, quindi il controllo deve restare procedurale (formazione KORA_ADMIN) più un vincolo di lunghezza stringente.

**Raccomandazione primaria: opzione strutturata (enum) sopra**, perché elimina il rischio alla radice invece di limitarlo. Questa è una decisione dell'ambito CTO/DPO — architetturalmente semplice da implementare in `034` prima della prima applicazione (nessun dato esistente da migrare).

---

# BLOCCO 6 — Data map completa

La data map completa è alla sezione §4 sopra. Include tutti gli elementi richiesti dal brief: token digest, link ID, tenant ID, worker identity reference, delivery record, status, consent/notice version, activation timestamp, revocation timestamp, expiry, audit events, request fingerprint, aggregation bucket. Partner references e campaign/initiative references non esistono in `034-036` (partner_scans deferito a v1.1+, fuori scope) — annotato in tabella come N/A.

---

# BLOCCO 7 — Ruoli e visibilità

## Matrice reale (verificata su `035_kora_link_rls.sql`, non su intenzioni documentali)

| Ruolo | `link_batches` | `links` | `link_assignments` | `link_consents` | `link_events` | `revocations` | `link_replacements` | `audit_log` | `link_delivery_records` | Aggregato company (`fn_company_link_status_aggregate`) |
|---|---|---|---|---|---|---|---|---|---|---|
| anon | Nessuno (solo USAGE su schema, nessun GRANT su tabella) | Nessuno diretto; solo via `fn_public_lookup_link` (status/reason minimi) | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno |
| WORKER | Nessuno | Nessuno diretto | **Nessuno oggi** — la policy self-select è commentata/non attiva in `035` (Gate 4 aperto); l'unico accesso reale è indiretto tramite `fn_activate_link_for_worker` | Nessuno diretto (scrittura solo via RPC) | Nessuno diretto (policy self-select non implementata) | Nessuno diretto | Nessuno | Nessuno | Nessuno | Non applicabile (funzione riservata a COMPANY_ADMIN/KORA_ADMIN) |
| COMPANY_ADMIN | **Nessuno** (nessuna policy SELECT diretta esiste o è pianificata — solo via aggregato RPC) | **Nessuno** | **Nessuno — garanzia costituzionale, "zero tolerance"** | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | **Sì, solo proprio tenant, solo conteggi ≥10, mai singolo worker** |
| COMPANY_VIEWER | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Non testato esplicitamente nel codice attuale — la funzione RPC verifica solo `COMPANY_ADMIN`/`KORA_ADMIN`, quindi COMPANY_VIEWER risulterebbe oggi **escluso anche dall'aggregato** salvo modifica futura |
| PARTNER | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno |
| ADVISOR | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno | Nessuno |
| KORA_ADMIN | SELECT/INSERT/UPDATE | SELECT/INSERT/UPDATE | SELECT/INSERT/UPDATE | SELECT/INSERT | SELECT/INSERT | SELECT/INSERT | SELECT/INSERT | SELECT (INSERT solo via tooling admin diretto; scritture applicative via `service_role` nelle funzioni SECDEF) | SELECT/INSERT/UPDATE | Sì, qualunque tenant |
| service_role (server-side, mai client) | Bypassa RLS | Bypassa RLS | Bypassa RLS | Bypassa RLS | Bypassa RLS | Bypassa RLS | Bypassa RLS | Bypassa RLS | Bypassa RLS | Bypassa RLS |
| Supporto tecnico | Non esiste un ruolo distinto — eredita l'accesso di qualunque ruolo applicativo gli venga assegnato (KORA_ADMIN o nessuno); nessun accesso "indiscriminato" per design | | | | | | | | | |

## Regole minime — verifica di conformità

- **L'azienda non vede attivazioni individuali**: ✅ confermato — nessuna policy lo permette, l'unica via è l'RPC aggregato con soglia 10.
- **L'azienda vede solo aggregati sopra soglia**: ✅ confermato in `fn_company_link_status_aggregate` (`KORA-LINK-S08`, soglia 10 applicata per bucket).
- **Il worker vede soltanto il proprio stato**: ⚠️ **non ancora implementato** — la policy self-select su `link_assignments` è commentata, non attiva. Gate 4 esplicitamente aperto per questo motivo. Non è una violazione (il worker oggi non vede nulla, non vede *troppo*), ma è un gap funzionale, non solo di privacy.
- **Anon non enumera link o stato**: ✅ confermato — `fn_public_lookup_link` restituisce la stessa risposta per "not found" e "unusable".
- **Partner non accede ai dati worker**: ✅ confermato — nessun GRANT, nessuna policy PARTNER esiste.
- **KORA_ADMIN vede solo quanto necessario**: ⚠️ parzialmente — KORA_ADMIN ha oggi SELECT pieno su tutte le tabelle inclusa `link_assignments` (la più sensibile). Questo è dichiarato come necessario per governance/operazioni pilota, ma non è "minimizzato" nel senso stretto — è un'area da rivedere se il volume di worker cresce oltre la scala pilota. Non blocca il Gate DPO di questo sprint (è una scelta di design KORA_ADMIN-privileged coerente con lo stato attuale della piattaforma), ma va segnalato.
- **Audit tecnico non è una dashboard individuale**: ✅ confermato — nessuna UI esiste che esponga `audit_log` o `link_events` per singolo worker; l'unico accesso è KORA_ADMIN via query dirette.
- **Supporto non ottiene accesso indiscriminato**: ✅ confermato — non esiste un ruolo "supporto" distinto nel modello attuale.

## Incoerenze rilevate tra schema, RLS, RPC, UI, documentazione

1. **`034` (commento) vs `035` (implementazione)**: `034` ipotizzava in un commento un futuro accesso COMPANY_ADMIN diretto a `link_batches` via "aggregate view" — `035` chiarisce (nota KORA-LINK-S3B) che questa vista non è mai stata creata e non è pianificata; l'unico accesso aggregato è l'RPC in `036`. Non è una violazione di privacy (l'accesso reale è più restrittivo dell'ipotesi originale), ma è un disallineamento documentale già segnalato e corretto solo a livello di commento, non di codice attivo.
2. **`035` (spec funzione) vs `036` (implementazione reale)**: i nomi delle funzioni SECURITY DEFINER nella sezione spec di `035` (`fn_kora_link_public_lookup`, ecc.) sono storici e diversi dai nomi reali implementati in `036` (`fn_public_lookup_link`, ecc.) — già riconciliato a livello di commento (KL-19), nessun impatto funzionale.
3. **Governance page (`app/admin/kora-link/governance/page.tsx`) vs stato reale**: la pagina elenca 6 decisioni aperte come "Aperta/pending" — sostanzialmente coerente con questo documento, ma non include esplicitamente DPO-07 (DPIA screening) come voce separata; va aggiornata dopo l'approvazione di questo sprint per riflettere le decisioni effettivamente prese (fuori scope di modifica UI per questo sprint, per istruzione esplicita del brief).
4. **`consent_version` — mismatch SQL/TypeScript**: già trattato in dettaglio nel BLOCCO 4.
5. **Worker self-select (`link_assignments`)**: la specifica in `035` esiste solo come commento, non come policy attiva — questo significa che oggi **il worker stesso non ha alcun modo RLS-based di leggere il proprio stato di attivazione**; l'unica via è la risposta sincrona della RPC `fn_activate_link_for_worker` al momento della chiamata. Non è una falla di privacy (nessuno vede più di quanto dovrebbe), ma è un gap dichiarato del Gate 4, non di questo Gate DPO.

**Nessuna modifica a RLS è stata fatta in questo sprint** — le incoerenze sopra sono rilevate e descritte, non corrette, per istruzione esplicita del brief ("Non modificare RLS in questo sprint salvo correzioni strettamente derivanti dalle decisioni DPO e pienamente verificabili staticamente" — nessuna delle 7 decisioni DPO richiede oggi una correzione RLS, quindi nessuna è stata applicata).

---

# BLOCCO 8 — DPIA screening

**Non è una DPIA completa.** È uno screening, per decidere se una DPIA completa è necessaria.

| Criterio | Valutazione per KORA Link (stato attuale: disabilitato, nessun dato reale) |
|---|---|
| Monitoraggio sistematico | Non presente nel design attivo (nessuna dashboard individuale, azienda vede solo aggregati ≥10). Rischio residuo: l'infrastruttura (audit_log + link_events con worker_id) *potrebbe* abilitarlo se mal configurata o se `request_fingerprint` fosse popolato senza restrizioni — motivo aggiuntivo a favore della raccomandazione di rimozione in BLOCCO 2. |
| Scala | Scala pilota, bassa (un numero limitato di chip per azienda pilota). |
| Dati vulnerabili | Nessun dato sanitario trattato *direttamente* da KORA Link. Rischio indiretto: il chip è un gateway verso My KORA, dove possono esistere dati LIFE-pillar/salute-adiacenti — ma quel rischio è già gestito (o da gestire) a livello di piattaforma generale, non introdotto da KORA Link in sé. |
| Uso nel contesto lavorativo | Sì — i chip sono distribuiti dal datore di lavoro. |
| Asimmetria datore-lavoratore | Sì, strutturalmente presente in qualunque programma introdotto dall'azienda — mitigata (non eliminata) dal fatto che l'azienda non vede l'attività individuale. |
| Tecnologie fisiche/NFC | Sì — esplicitamente una tecnologia fisica di tracciamento-adiacente. |
| Osservazione del comportamento | Sì, in senso tecnico — gli eventi di attivazione/quick-access sono eventi comportamentali collegati all'identità worker in `link_events`/`audit_log` (leggibili solo da KORA_ADMIN). |
| Incrocio di dati | Basso — KORA Link è esplicitamente "NOT an IU/PIB/Index source", nessun incrocio con lo scoring. |
| Decisioni automatizzate | Nessuna. |
| Impossibilità di sottrarsi | Non riscontrata nell'architettura (attivazione facoltativa, nessuna conseguenza tecnica per il rifiuto) — **ma verificabile solo a livello di codice, non di prassi organizzativa reale** (v. limiti sotto). |
| Innovatività | Moderata — bridge fisico-digitale in un contesto lavorativo è relativamente nuovo per questa piattaforma. |
| Rischio di re-identificazione | Basso a livello di output aziendale (soglia 10 applicata). **Alto a livello KORA_ADMIN** (accesso pieno a `link_assignments`, `audit_log`, `link_events` con worker_id in chiaro). |
| Effetti negativi | Prevalentemente di percezione/fiducia (rischio di essere percepito come sorveglianza) più che di danno concreto, dato il design employer-blind — coerente con il rischio #1 già registrato in `docs/GATE3_LEGAL_DPO_READINESS_REVIEW.md` §6. |

## Conclusione

**DPIA prudenzialmente raccomandata prima di un pilota reale con KORA Link abilitato; non definitivamente necessaria per lo stato attuale (disabilitato, nessun dato reale, nessuna visibilità individuale al datore di lavoro).**

Questo conferma e precisa — non sovrascrive — la conclusione già raggiunta in `docs/KORA_LINK_DECISION_GATE_07.md` ("DPIA consigliata, non ancora 'probabilmente necessaria' in modo definitivo... la determinazione finale dipende dal modello operativo"). Le decisioni DPO-01..06 di questo sprint riducono il rischio residuo (in particolare la rimozione proposta di `request_fingerprint` e la retention differenziata) ma non lo azzerano, per due ragioni che il codice da solo non può risolvere:

**Informazioni organizzative mancanti, non risolvibili da questo repository:**
1. Se l'azienda pilota presenterà l'attivazione come genuinamente facoltativa nella prassi HR reale (non solo nel codice) — nessuna verifica di codice può confermarlo.
2. Il settore e la dimensione dell'azienda pilota effettiva — rilevante per il rischio di asimmetria e re-identificazione a livello di reparto.
3. L'esito finale delle decisioni DPO-01 (retention) e DPO-02 (request_fingerprint) — se il titolare decidesse di mantenere `request_fingerprint` in forma non limitata, la raccomandazione andrebbe **rivalutata verso "DPIA necessaria"**.

---

# BLOCCO 9 — Condizioni di chiusura Gate DPO

## Checklist binaria (aggiornata post-approvazione, 2026-07-16)

| Condizione | Stato oggi |
|---|---|
| Retention approvata | ✅ Approvata — retention per categoria ratificata (BLOCCO 1); job di cancellazione automatica NON implementato (v. §26) |
| Request fingerprint approvato, rimosso o limitato | ✅ Approvato — colonna rimossa da `034` (BLOCCO 2) |
| Base giuridica definita | ✅ Approvata — Art. 6(1)(f) legittimo interesse, non consenso (§5) |
| Notice approvato | ✅ Approvato nella forma proposta (BLOCCO 3) — testo definitivo resta comunque rivedibile senza richiedere una nuova approvazione di principio |
| Consent/notice version unica | ✅ Approvata — valore canonico `kora-link-activation-notice-v1.0` applicato in `036` e `lib/kora-link/activation.ts`; il mismatch SQL/TS è risolto |
| Delivered_to_label definito | ✅ Approvato — sostituito da `delivery_channel` (enum ristretto) in `034` (BLOCCO 5) |
| Data map completa | ✅ Prodotta in questo sprint (§4) |
| Ruoli e visibilità coerenti | ⚠️ Verificati e documentati (BLOCCO 7); alcune incoerenze documentali rilevate ma non correttive di RLS in questo sprint — invariato dall'approvazione |
| Privacy policy pubblica compatibile | ✅ Verificata — le decisioni approvate non contraddicono `lib/legal/privacy-content.ts` §5 (consenso non usato come base generale) |
| Schema 034-036 allineato | ✅ Applicato — rimozione `request_fingerprint`, `delivery_channel`, rename `link_consents`→`link_activation_acknowledgements`, valore `consent_version` canonico, tutti applicati a `034`/`035`/`036`/`lib/kora-link/activation.ts` e ai test unitari corrispondenti |
| Nessun blocker DPO residuo non dichiarato | ✅ Tutti i blocker noti sono dichiarati in questo documento |
| DPIA | ⚠️ Non chiusa per costruzione — raccomandazione prudenziale (BLOCCO 8), da rivalutare prima di un pilota con dati reali |
| Gate 4 (RLS worker self-select) | ❌ Non chiuso — fuori scope di questo sprint, invariato |

## Verdetto

**GATE DPO: 4 BLOCKER TECNICI RATIFICATI E IMPLEMENTATI (2026-07-16). Gate 3 complessivo resta APERTO.**

Le 7 decisioni DPO-01..DPO-07 sono state approvate dal titolare nella loro forma primaria raccomandata in questo documento. Le modifiche tecniche derivanti (§25) sono state applicate a `034`/`035`/`036`/`lib/kora-link/activation.ts` e verificate con la suite di test unitari (263 test nei 5 file di review + 837 nell'intera suite KORA Link, tutti passanti) e `tsc --noEmit` pulito. Il Gate DPO **complessivo** non è però chiuso da questa approvazione: DPO-07 (DPIA) resta una raccomandazione prudenziale non definitiva, e restano aperti il Gate 4 (RLS self-select worker) e l'RPC di disattivazione self-service — nessuno dei due è stato toccato da questo sprint, per istruzione esplicita del brief.

---

## 14-23. Sezioni tematiche già coperte

I punti "ruoli e visibilità" (14), "soglia aggregazione" (15 — v. §4/BLOCCO 3, soglia 10 confermata ovunque), "diritti degli interessati" (16 — coperti dalla privacy policy generale già pubblicata, nessuna estensione KORA-Link-specifica necessaria oltre l'informativa di attivazione in BLOCCO 3), "revoca" (17 — v. BLOCCO 1 e schema `revocations`), "retention completa" (18 — v. BLOCCO 1), "subprocessor" (19 — nessun subprocessor aggiuntivo rispetto a quelli già elencati in `lib/legal/privacy-content.ts` §7: Supabase, Vercel; KORA Link non introduce nuovi fornitori terzi), "trasferimenti" (20 — nessuna modifica rispetto alla policy generale già pubblicata, KORA Link non tratta con fornitori aggiuntivi), "sicurezza" (21 — v. BLOCCO 2, controlli già presenti), "DPIA screening" (22 — BLOCCO 8), "rischi" (23 — v. BLOCCO 8 e tabella §4) sono trattati nei blocchi tematici sopra per evitare duplicazione.

---

## 24. Checklist Gate DPO

Vedi BLOCCO 9 sopra.

## 25. Modifiche tecniche applicate (post-approvazione, 2026-07-16)

Il titolare ha approvato le 7 decisioni ed esplicitamente esteso lo scope tecnico oltre la lista minima originariamente pianificata qui sotto (v. nota in testa al documento). Le modifiche effettivamente applicate:

1. **`034_kora_link_schema.sql`**: rimossa la colonna `request_fingerprint` da `kora_link.audit_log` (DPO-02) e i relativi commenti BLOCKER, ora marcati `RESOLVED KORA-LINK-DPO-DECISIONS-09`; sostituita `link_delivery_records.delivered_to_label` (free text) con `delivery_channel` (enum ristretto: `hr_admin`/`office_reception`/`site_admin`/`other`) (DPO-06); **estensione approvata**: tabella `kora_link.link_consents` rinominata `kora_link.link_activation_acknowledgements`, colonne `consent_version`→`activation_notice_version`, `accepted_at`→`acknowledged_at`, `withdrawn_at`→`deactivated_at`, stati `accepted`/`withdrawn`→`acknowledged`/`deactivated`; commento di esempio `consent_version` aggiornato al valore canonico approvato (DPO-05); retention per categoria (BLOCCO 1) documentata nei commenti di `audit_log`.
2. **`036_kora_link_rpc_functions.sql`**: `c_valid_activation_notice_version` (rinominata da `c_valid_consent_version`) in `fn_activate_link_for_worker` aggiornata al valore canonico approvato `kora-link-activation-notice-v1.0` (DPO-05); gli `INSERT`/`UPDATE` della funzione ora scrivono su `kora_link.link_activation_acknowledgements` con le colonne rinominate. **Passaggio correttivo (2026-07-24):** il parametro RPC esterno è stato rinominato `p_consent_version` → `p_activation_notice_version`; lo stato restituito `consent_required` → `activation_notice_required`.
3. **`lib/kora-link/activation.ts`**: `KORA_LINK_ACTIVATION_NOTICE_VERSION` (rinominata da `KORA_LINK_ACTIVATION_CONSENT_VERSION`) aggiornata al valore canonico approvato, identico a `036` (DPO-05); rimosso il commento "provisional — final copy/version requires DPO/legal approval". **Passaggio correttivo (2026-07-24):** campo `consentVersion` → `activationNoticeVersion`, stato `'consent_required'` → `'activation_notice_required'`.
4. **Test statici**: aggiornate le assertion nei 4 file di review/hardening (`kora-link-schema034-review.test.ts`, `kora-link-rls035-review.test.ts`, `kora-link-security-foundation-08.test.ts`, `kora-link-activation.test.ts`) per riflettere la ratifica — inclusa l'inversione della regola "non deve contenere 'draft'" ora che il valore è canonico.
5. **Nessuna migrazione applicata**: tutte le modifiche restano in `supabase/proposed/`. Nessun database, staging o produzione, è stato toccato.
6. **Verifica**: `npx tsc --noEmit` pulito; suite KORA Link completa (17 file, 837 test) passante; suite di progetto completa (255 file, 10403 test) passante.

**Passaggio correttivo terminologico (2026-07-24) — secondo commit dello stesso sprint:**

7. **Testo del notice**: placeholder `[contatto privacy — v. PRIVACY_CONTACT_EMAIL]` sostituito con l'indirizzo reale (`simone.felicetti.kora@gmail.com`); nota di chiusura BLOCCO 3 aggiornata da "proposta, non ancora approvata" a testo approvato; riferimento alla checkbox rimosso dal testo del notice (punto 4).
8. **Checkbox eliminata** (espressamente esclusa): `app/link/[token]/page.tsx` — rimossi l'`<input type="checkbox" name="consent_confirmed">` e la nota obsoleta "il testo definitivo del consenso richiede approvazione DPO/legal"; `app/link/[token]/activate/route.ts` — rimossa la lettura di `consent_confirmed` dal form; l'invio del modulo stesso resta l'unica azione volontaria di attivazione.
9. **Rename completato — contratto esterno**: `p_consent_version` → `p_activation_notice_version` (parametro RPC, `036`); `KORA_LINK_ACTIVATION_CONSENT_VERSION` → `KORA_LINK_ACTIVATION_NOTICE_VERSION` (costante TS, `lib/kora-link/activation.ts`); `consentVersion` → `activationNoticeVersion` (campo TS); stato `consent_required` → `activation_notice_required` (SQL + TS + route + page); `link_events.event_type` valore `'consent_accepted'` → `'activation_acknowledged'` (mai scritto da alcuna funzione, morto/inutilizzato — rinominato per coerenza anziché rimosso). Motivazione: `034`-`036` non sono mai state applicate e non hanno consumer reali — nessuna incompatibilità nel rinominare il contratto esterno ora.
10. **Prosa residua riallineata**: commenti in `034`/`035`/`036` ("explicit consent" → "explicit voluntary activation acknowledgement"; "consent, and audit" → "activation acknowledgement, and audit"; commenti sugli stati `links.status`/`link_assignments.status`) riformulati senza terminologia "consent" fuorviante.
11. **Governance UI aggiornata** (`app/admin/governance/page.tsx`, `app/admin/kora-link/governance/page.tsx`): le voci `request-fingerprint-hashing`, `consent-version-privacy-notice` (pagina generale) e `delivered-to-label-semantics` (entrambe le pagine) ora includono una nota che rimanda alla ratifica KORA-LINK-DPO-DECISIONS-09. **Il badge "Aperta / pending" non è stato modificato** — entrambe le pagine hanno un invariante architetturale testato ("il registro non risolve mai nulla autonomamente"; chiusura formale solo via `docs/21-founder-gate-resolution-log.md`), che questo passaggio rispetta deliberatamente.
12. **Verifica finale**: `npx tsc --noEmit` pulito; suite KORA Link + governance passanti; suite di progetto completa passante (v. §26 per i numeri esatti del secondo commit).

## 26. Piano prima dello staging (aggiornato)

1. ✅ Titolare approva le 7 decisioni (tabella finale di questo report) — 2026-07-16.
2. ✅ Documento aggiornato da DRAFT ad APPROVED — 2026-07-16.
3. ✅ Modifiche tecniche (§25) applicate a `034`/`035`/`036`/`lib/kora-link/activation.ts` e ai test unitari corrispondenti, pronte per un commit (`feat(kora-link): implement ratified DPO decisions`, se richiesto).
4. ⬜ Ratifica umana CTO delle risoluzioni KL-19 (già pendente, indipendente da questo sprint).
5. ⬜ Chiusura Gate 4 (RLS 035 — worker self-select, eventuale policy company-facing) — fuori scope di questo sprint.
6. ⬜ Solo allora: applicazione di `034-036` a staging, mai a produzione senza Gate 3 pienamente chiuso con dati reali.
7. ⬜ Implementazione del job di retention (Edge Function schedulata) prima di qualunque dato reale in staging — non implementato da questo sprint, solo documentato.

## 27. Decision log

| Data | Evento |
|---|---|
| 2026-06-30 | `034` creata (KL-05) |
| 2026-07-01 | `035`/`036` create (KL-17/KL-18) |
| 2026-07-04 | KL-19 — Gate 2 tecnico sostanzialmente chiuso; 3 blocker DPO precisati in `034` |
| 2026-07-12 | KORA-LINK-S3A/S3B — hardening grant, correzioni documentali |
| 2026-07-16 | KORA-LINK-SECURITY-FOUNDATION-08 — identity da `auth.uid()`, tenant boundary, soglia 10 |
| 2026-07-16 | **Questo sprint (09)** — inventario completo, analisi e raccomandazioni per le 7 decisioni DPO; documento prodotto in stato DRAFT |
| 2026-07-16 | Titolare approva le 7 decisioni nella forma raccomandata, con estensione di scope confermata esplicitamente (rename `link_consents`→`link_activation_acknowledgements` e colonne correlate) |
| 2026-07-16 | Modifiche tecniche (§25) applicate a `034`/`035`/`036`/`lib/kora-link/activation.ts` e test unitari; verifica `tsc --noEmit` + suite di test completa passanti; documento aggiornato a APPROVED |
| 2026-07-24 | Verifica finale read-only richiesta dal titolare: rilevate 2 incoerenze documentali (placeholder contatto privacy, nota "non ancora approvato" residua) e un residuo terminologico più ampio ("consent") non coperto dal rename di §25 |
| 2026-07-24 | Passaggio correttivo terminologico: doc corretto (contatto reale, nota di approvazione, checkbox rimossa dal testo); rename completato su contratto esterno (`p_consent_version`→`p_activation_notice_version`, costante TS, stato `consent_required`→`activation_notice_required`, checkbox HTML rimossa, evento schema `consent_accepted`→`activation_acknowledged`); governance UI aggiornata (nota di ratifica, badge invariato); secondo commit sullo stesso branch, non pushato |

---

**FINE — APPROVATO.** Le 7 decisioni DPO-01..DPO-07 sono state ratificate dal titolare (2026-07-16) e le modifiche tecniche derivanti sono state applicate a `034`/`035`/`036`/`lib/kora-link/activation.ts` e ai test unitari corrispondenti. Un passaggio correttivo terminologico (2026-07-24) ha poi eliminato le incoerenze documentali residue (placeholder di contatto, nota di approvazione stale) e completato il rename del contratto esterno RPC/TypeScript, poiché `034`-`036` non sono mai state applicate e non hanno consumer reali. Nessuna migrazione è stata applicata a nessun database (nessun ambiente toccato). **Il Gate DPO (Gate 3) complessivo resta APERTO**: DPO-07 (DPIA) è una raccomandazione prudenziale non definitiva, e il Gate 4 (RLS worker self-select) e l'RPC di disattivazione self-service restano fuori scope, invariati da questo sprint.

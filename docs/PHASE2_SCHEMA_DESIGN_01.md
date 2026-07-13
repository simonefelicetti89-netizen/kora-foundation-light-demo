# Phase 2 Schema Design 01 — Docs-Only Data Model Design for Activation Intelligence

**Data:** 2026-07-14
**Branch:** `feature/phase2-schema-design-01`
**Tipo:** Documentazione di design — nessun SQL, nessuna migration, nessuna implementazione DB, nessuna implementazione RLS, nessuna integrazione con il KORA Index live, nessun punteggio companion, nessuna decisione DPO/CTO/fiscale/legale risolta.

---

## 1. Stato e perimetro

**Stato: bozza di design — solo documentazione, nessuna implementazione.**

Questo documento traduce la revisione read-only `PHASE2-SCHEMA-RO` in un artefatto di design concreto, leggibile da revisori CTO/DPO. Non è un piano di implementazione approvato — è materiale di discussione.

Questo documento:
- **non contiene SQL**;
- **non è una migration**;
- **non è un'implementazione DB**;
- **non è un'implementazione RLS**;
- **non integra il Phase 2 con il calcolo live del KORA Index**;
- **non crea un punteggio companion**;
- **non crea un punteggio di attivazione pubblico separato**;
- non mappa i segnali Phase 2 sulle componenti canoniche del KORA Index (questo resta compito di un futuro `KORA-INDEX-PHASE2-COMPONENT-MAPPING-RO`, esplicitamente fuori scope qui);
- non modifica `lib/kora-engine/kora-index-engine.ts`, l'ingestion/UEF, la mappatura pilastri, la generazione del Decision Pack, o `commons.post`/`commons.booking`/`commons.contribution_event`;
- non modifica `lib/auth/access-matrix.ts` (codice) né tratta `docs/access-matrix.md` come modificato in modo autoritativo — ogni riferimento a nuove risorse qui è esplicitamente bozza/riferimento futuro, non un'estensione della matrice vigente.

**Principio di prodotto invariato: ci sarà un solo KORA Index.** Il Phase 2 potrà in futuro alimentare quello stesso KORA Index — mai un indice parallelo, mai un punteggio pubblico separato — ma solo dopo: revisione CTO, revisione DPO/legale, regole di soglia privacy definite, estensione della matrice di accesso canonica, design schema/RLS, e mappatura a livello di metodo sulle componenti canoniche reali del KORA Index. Nessuno di questi passaggi avviene in questo sprint.

---

## 2. Principi di design

Questi principi vincolano ogni futuro design di schema Phase 2, prima ancora che esista una singola tabella:

1. **Il Phase 2 usa sempre "Activity"/"Attività", mai "Initiative"/"Iniziativa"** per naming di schema — vedi `docs/PARTNER_ECOSYSTEM_MODEL_01.md` §5. Questo evita la collisione già documentata con `commons.post` (KORA Space Initiatives).
2. **L'azienda vede solo aggregati.** Nessuna tabella Phase 2 futura espone mai un record individuale lato azienda, in nessuna condizione.
3. **Il lavoratore controlla l'azione volontaria e la condivisione.** Ogni dato nominativo che raggiunge un partner esiste solo perché il lavoratore lo ha condiviso volontariamente.
4. **Il partner vede dati nominativi del lavoratore solo dopo un'azione/consenso avviato dal lavoratore.** Mai prima, mai per navigazione passiva.
5. **L'accesso KORA Admin è sempre auditato e non è mai un bypass generico sui dati individuali del lavoratore** — coerente con `docs/access-matrix.md` (migration 027 ha già rimosso l'accesso `KORA_ADMIN` da `personal.*`).
6. **I segnali Phase 2 non alimentano mai direttamente KORA Contribution.**
7. **KORA Space / Iniziative Contribution restano separate** — `commons.post`, `commons.booking`, `commons.contribution_event` non vengono mai toccati o fusi con lo schema Phase 2.
8. **L'integrazione reale con il KORA Index è futura ed è vincolata a revisione CTO/DPO** — non è uno scope implicito di nessuna tabella qui descritta.
9. **I metadati di categoria fiscale/welfare sono metadati proposti, non un'approvazione fiscale o legale.**
10. **Non esiste un punteggio di attivazione pubblico separato** — né oggi, né come raccomandazione di questo documento.

---

## 3. Namespace futuri proposti

Lo schema Postgres del repo usa già la convenzione "uno schema per dominio": `commons.*` (KORA Space/Contribution), `network.*` (partner directory), `personal.*` (dati worker individuali, il tier più protetto), `analytics.*` (tenant/scoring), `audit.*` (audit trail), `kora_link.*` (proposto, non applicato). Per Phase 2 sono possibili le seguenti opzioni di namespace, discusse qui solo a fini di documentazione:

| Opzione | Descrizione | Pro | Contro |
|---|---|---|---|
| `phase2.*` | Nuovo schema dedicato all'intera Activation Intelligence Phase 2 | Massima chiarezza concettuale; isola completamente il Phase 2 da Phase 1; coerente con la separazione doctrinale già documentata | Nome "phase2" è un'etichetta di sprint, non un nome di dominio durevole — potrebbe richiedere un rename futuro quando Phase 2 non sarà più "nuovo" |
| `partner_activity.*` | Schema nominato sull'entità centrale | Nome durevole, non legato a un numero di fase | Copre solo il lato catalogo/booking, meno naturale per i segnali aggregati |
| `activation.*` | Schema nominato sul concetto di "segnale di attivazione" | Nome durevole e già usato concettualmente nei documenti Phase 2 | Rischia collisione di significato con `Activation Safeguard` (Stage 13, già un concetto distinto e maturo in `lib/kora-engine/activation-engine.ts`) |
| Estensione di `network.*` | Aggiungere tabelle Phase 2 sotto lo schema partner esistente | Riusa uno schema già esistente e già collegato a `network.partner_profile` | Confonde "directory partner" con "catalogo attività + segnali", due concetti distinti nel dominio |
| Estensione di `analytics.*` | Aggiungere tabelle Phase 2 sotto lo schema di scoring/tenant esistente | Vicinanza concettuale ai segnali che un giorno potrebbero alimentare il KORA Index | Rischia di far percepire il Phase 2 come già integrato nel motore di scoring, quando non lo è |

**Raccomandazione a soli fini di documentazione:** `phase2.*` come schema dedicato, per la massima separazione doctrinale rispetto a Phase 1 e a KORA Space/Contribution, con possibilità di rinominare in `activation.*` in un secondo momento se il naming "phase2" risultasse poco durevole. **Il namespace finale del DB richiede revisione CTO** — questa è una raccomandazione documentale, non una decisione.

---

## 4. Catalogo delle entità future

Per ciascuna entità: scopo, campi bozza, relazioni, confine tenant, visibilità per ruolo, rischio privacy, complessità RLS, dipendenza CTO/DPO, tempistica, raccomandazione riuso/nuovo.

### 4.1 `partner_activity`
- **Scopo:** voce di catalogo canonica offerta da un partner — persistenza reale di `lib/partner-activities/catalog.ts`.
- **Campi bozza:** `id, partner_id, title, short_description, activity_type, fiscal_category, fiscal_review_status, primary_pillar, secondary_pillars, delivery_mode, access_mode, future_worker_action, estimated_value_band, status, created_at, updated_at`.
- **Relazioni:** 1—N con `partner_activity_booking`; N—1 con `network.partner_profile`.
- **Confine tenant:** nessuno — catalogo globale, come `network.partner_profile`.
- **Visibilità per ruolo:** azienda (solo pubblicate, via selezione), lavoratore (solo eleggibili), partner (proprie, CRUD), admin (completa).
- **Rischio privacy:** basso.
- **Complessità RLS:** bassa.
- **Dipendenza CTO/DPO:** CTO (schema/namespace), DPO non richiesto (nessun dato individuale).
- **Tempistica:** presto.
- **Riuso/nuovo:** nuova tabella; riusa `network.partner_profile` solo come ancora di identità.

### 4.2 `partner_activity_version`
- **Scopo:** versionamento dei metadati attività, perché categoria fiscale/pilastro/eleggibilità indice possono cambiare nel tempo.
- **Campi bozza:** `id, partner_activity_id, version_number, snapshot_fields (jsonb), valid_from, valid_to`.
- **Relazioni:** 1—N per attività padre.
- **Confine tenant:** nessuno, stesso schema del padre.
- **Visibilità per ruolo:** lettura indiretta (solo la versione corrente è risolta per azienda/lavoratore); partner e admin vedono lo storico completo.
- **Rischio privacy:** basso.
- **Complessità RLS:** media (occorre risolvere "quale versione era attiva quando" in modo retroattivo per l'auditabilità dei segnali).
- **Dipendenza CTO/DPO:** CTO.
- **Tempistica:** più avanti.
- **Riuso/nuovo:** nuova tabella.

### 4.3 `company_activity_selection`
- **Scopo:** perimetro di abilitazione azienda — categoria/pilastro/partner/attività/scelta libera worker, con budget opzionale.
- **Campi bozza:** `id, tenant_id, scope_type, scope_value, budget_cap, active, created_at`.
- **Relazioni:** N—N con `partner_activity` tramite lo scope.
- **Confine tenant:** obbligatorio (`tenant_id`).
- **Visibilità per ruolo:** azienda (CRUD proprio), lavoratore (mai diretta — solo eleggibilità derivata), partner (nessuna), admin (lettura auditata).
- **Rischio privacy:** medio (rivela la strategia welfare dell'azienda se mai esposta al partner).
- **Complessità RLS:** media.
- **Dipendenza CTO/DPO:** possibile DPO se il budget è considerato dato finanziario sensibile.
- **Tempistica:** presto.
- **Riuso/nuovo:** nuova tabella — nessun equivalente statico esiste oggi oltre al copy UI.

### 4.4 `company_activity_budget_policy`
- **Scopo:** entità futura opzionale per budget, tetti, perimetri di categoria fiscale/welfare.
- **Campi bozza:** `id, tenant_id, fiscal_category, cap_amount, period`.
- **Relazioni:** 1—1 o 1—N con `company_activity_selection`.
- **Confine tenant:** obbligatorio.
- **Visibilità per ruolo:** azienda (CRUD proprio), tutti gli altri nessun accesso.
- **Rischio privacy:** medio (dato finanziario reale, non solo un metadato).
- **Complessità RLS:** media.
- **Dipendenza CTO/DPO:** DPO/legale (territorio fiscale).
- **Tempistica:** non ancora.
- **Riuso/nuovo:** nuova tabella.

### 4.5 `worker_activity_eligibility_view`
- **Scopo:** layer di eleggibilità/discovery privacy-safe che determina cosa un lavoratore può vedere senza esporre la strategia aziendale o altri lavoratori.
- **Campi bozza:** `worker_id, activity_id, eligible (bool), reason`.
- **Relazioni:** vista derivata da `company_activity_selection` + attributi worker.
- **Confine tenant:** tramite il lavoratore.
- **Visibilità per ruolo:** lavoratore (solo proprio), azienda (**mai** — rivelerebbe la logica di targeting), admin (lettura auditata, solo per supporto).
- **Rischio privacy:** **alto** — è la superficie RLS più complessa dell'intero catalogo.
- **Complessità RLS:** alta.
- **Dipendenza CTO/DPO:** entrambi.
- **Tempistica:** non ancora.
- **Riuso/nuovo:** nuova entità, nessun equivalente statico oggi.

### 4.6 `worker_activity_action`
- **Scopo:** evento avviato dal lavoratore — book, apply, request_contact, redeem_voucher, discover_more.
- **Campi bozza:** `id, worker_id, activity_id, action_type, occurred_at, status`.
- **Relazioni:** N—1 lavoratore, N—1 attività; può evolvere in `partner_activity_booking`.
- **Confine tenant:** tramite il lavoratore.
- **Visibilità per ruolo:** lavoratore (CRUD proprio), partner (nessuna finché non diventa booking), azienda (**mai** individuale), admin (lettura auditata).
- **Rischio privacy:** alto (dato individuale).
- **Complessità RLS:** media.
- **Dipendenza CTO/DPO:** entrambi.
- **Tempistica:** non ancora.
- **Riuso/nuovo:** nuova tabella.

### 4.7 `partner_activity_booking`
- **Scopo:** richiesta/prenotazione/candidatura visibile al partner, generata da un'azione volontaria del lavoratore — persistenza reale di `lib/partner-activities/bookings.ts`.
- **Campi bozza:** `id, activity_id, worker_id, worker_shared_fields (jsonb, scoped by consent), action_type, status, requested_at, preferred_slot_or_timing`.
- **Relazioni:** N—1 attività, N—1 lavoratore, 1—1 con un evento di consenso.
- **Confine tenant:** tramite il lavoratore.
- **Visibilità per ruolo:** lavoratore (proprie, CRUD), partner (proprie, tramite `partner_worker_relationship`), azienda (**mai individualmente**), admin (lettura auditata).
- **Rischio privacy:** **alto** (nomi/email/telefono).
- **Complessità RLS:** alta.
- **Dipendenza CTO/DPO:** entrambi, obbligatorio.
- **Tempistica:** non ancora.
- **Riuso/nuovo:** nuova tabella; mirror diretto dello shape statico esistente, meno i campi mock.

### 4.8 `partner_worker_relationship`
- **Scopo:** record di relazione che esiste solo dopo condivisione/booking avviati dal lavoratore.
- **Campi bozza:** `id, partner_id, worker_id, consent_basis ('worker_initiated'), first_shared_at, revoked_at`.
- **Relazioni:** 1—1 o 1—N per booking/consenso.
- **Confine tenant:** tramite il lavoratore.
- **Visibilità per ruolo:** lavoratore (lettura/revoca proprie), partner (lettura scoped alle proprie), azienda (**mai**), admin (lettura auditata).
- **Rischio privacy:** alto.
- **Complessità RLS:** alta.
- **Dipendenza CTO/DPO:** entrambi.
- **Tempistica:** non ancora.
- **Riuso/nuovo:** nuova entità.

### 4.9 `activation_signal_source_event`
- **Scopo:** evento nativo di piattaforma Phase 2, non ancora visibile individualmente all'azienda.
- **Campi bozza:** `id, booking_id, signal_type, occurred_at`.
- **Relazioni:** N—1 booking.
- **Confine tenant:** tramite il lavoratore/booking.
- **Visibilità per ruolo:** admin (lettura auditata), nessun altro ruolo.
- **Rischio privacy:** medio-alto (rischio di re-identificazione a N piccolo tramite combinazione di campi).
- **Complessità RLS:** alta.
- **Dipendenza CTO/DPO:** entrambi.
- **Tempistica:** non ancora.
- **Riuso/nuovo:** nuova entità, evoluzione reale di `ActivationSignalPreview.sourceBookingIds`.

### 4.10 `activation_signal_aggregate`
- **Scopo:** segnale aggregato privacy-safe per il reporting aziendale e un futuro input KORA Index.
- **Campi bozza:** `id, tenant_id, aggregation_level, group_key, signal_type, metric_value, privacy_status, computed_at`.
- **Relazioni:** N—1 tenant, derivato da N eventi sorgente.
- **Confine tenant:** obbligatorio.
- **Visibilità per ruolo:** azienda (**solo lettura aggregata**), admin (lettura completa), tutti gli altri nessuno.
- **Rischio privacy:** basso se la soglia è applicata correttamente, alto se non lo è.
- **Complessità RLS:** media.
- **Dipendenza CTO/DPO:** CTO (logica soglia), DPO (regola soglia).
- **Tempistica:** non ancora.
- **Riuso/nuovo:** evoluzione reale di `ActivationSignalPreview` (versione statica esistente).

### 4.11 `privacy_threshold_rule`
- **Scopo:** regola di soglia configurabile.
- **Campi bozza:** `id, rule_name, min_group_size, applies_to, effective_from`.
- **Relazioni:** referenziata dal calcolo degli aggregati.
- **Confine tenant:** globale o override per tenant.
- **Visibilità per ruolo:** admin (CRUD completo), nessun altro.
- **Rischio privacy:** basso (metadato di governance).
- **Complessità RLS:** bassa.
- **Dipendenza CTO/DPO:** **questa tabella è la decisione DPO resa durevole** — dipendenza obbligatoria.
- **Tempistica:** blocca quasi tutto il resto — è la decisione con priorità più alta.
- **Riuso/nuovo:** nuova entità, ma il concetto (`DEFAULT_MIN_GROUP_SIZE = 10`) esiste già in `lib/privacy/group-threshold.ts`.

### 4.12 `privacy_threshold_decision`
- **Scopo:** risultato della valutazione della soglia per un gruppo aggregato specifico.
- **Campi bozza:** `id, aggregate_id, rule_id_applied, passed (bool), suppressed_count`.
- **Relazioni:** N—1 regola, 1—1 aggregato.
- **Confine tenant:** tramite l'aggregato.
- **Visibilità per ruolo:** azienda (solo lo stato, es. badge), admin (completa), nessun altro.
- **Rischio privacy:** basso.
- **Complessità RLS:** bassa.
- **Dipendenza CTO/DPO:** entrambi.
- **Tempistica:** non ancora.
- **Riuso/nuovo:** nuova entità.

### 4.13 `kora_index_phase2_adapter`
- **Scopo:** confine di adapter futuro (non necessariamente una tabella DB) che trasforma i segnali aggregati Phase 2 verso input compatibili con il KORA Index.
- **Campi bozza:** N/A — probabilmente modulo di codice, non tabella.
- **Relazioni:** legge `activation_signal_aggregate`, scrive verso i parametri di `computeKoraIndex`.
- **Confine tenant:** N/A.
- **Visibilità per ruolo:** solo CTO/motore — non un oggetto con ruoli applicativi.
- **Rischio privacy:** basso (rischio di metodologia, non di privacy).
- **Complessità RLS:** N/A.
- **Dipendenza CTO/DPO:** CTO, obbligatorio; DPO non direttamente (nessun dato individuale in questo confine).
- **Tempistica:** **esplicitamente non ora** — richiede `KORA-INDEX-PHASE2-COMPONENT-MAPPING-RO` come prerequisito, fuori scope di questo documento.
- **Riuso/nuovo:** concettuale soltanto in questo sprint.

### 4.14 `partner_delivery_evidence`
- **Scopo:** evidenza lato partner che un servizio/attività è stato erogato, senza esporre dettagli sensibili del lavoratore all'azienda.
- **Campi bozza:** `id, booking_id, delivered_at, evidence_level, notes (testo libero autore partner, vincolato)`.
- **Relazioni:** 1—1 con booking.
- **Confine tenant:** tramite booking.
- **Visibilità per ruolo:** azienda (solo aggregato, mai individuale), partner (proprie, create), admin (lettura auditata).
- **Rischio privacy:** medio (le note libere del partner potrebbero rivelare dettagli del lavoratore se non vincolate da policy di contenuto).
- **Complessità RLS:** media.
- **Dipendenza CTO/DPO:** DPO (definire cosa un partner può scrivere).
- **Tempistica:** più avanti.
- **Riuso/nuovo:** nuova entità.

### 4.15 `worker_consent_event`
- **Scopo:** evento di consenso/condivisione per la visibilità nominativa partner avviata dal lavoratore.
- **Campi bozza:** `id, worker_id, partner_id, scope, granted_at, revoked_at`.
- **Relazioni:** 1—N per lavoratore, referenziato da booking/relazione.
- **Confine tenant:** tramite il lavoratore.
- **Visibilità per ruolo:** lavoratore (CRUD proprio, inclusa revoca), admin (lettura auditata), nessun altro.
- **Rischio privacy:** alto (lo stato di consenso stesso è sensibile).
- **Complessità RLS:** media — la forma proposta (non applicata) `kora_link.link_consents` è un precedente diretto da cui partire.
- **Dipendenza CTO/DPO:** entrambi.
- **Tempistica:** non ancora, ma il design dovrebbe partire dalla forma di `034_kora_link_schema.sql` §`link_consents`.
- **Riuso/nuovo:** nuova entità, ispirata al precedente proposto.

### 4.16 `phase2_audit_event`
- **Scopo:** traccia di audit per azioni partner/azienda/lavoratore/admin nel Phase 2.
- **Campi bozza:** dovrebbe estendere `audit.audit_log`, non creare un nuovo schema.
- **Relazioni:** estende la tabella esistente.
- **Confine tenant:** N/A (eredita dal record auditato).
- **Visibilità per ruolo:** admin (lettura), nessun altro.
- **Rischio privacy:** basso (un audit trail è a basso rischio per natura).
- **Complessità RLS:** bassa — **riusare `audit.audit_log`, non inventare un audit trail parallelo**.
- **Dipendenza CTO/DPO:** nessuna aggiuntiva oltre a quella già presente per `audit.audit_log`.
- **Tempistica:** presto — è la voce a rischio più basso dell'intero elenco, puramente estensiva.
- **Riuso/nuovo:** riuso.

---

## 5. Modello di relazioni

```
tenant/company ──1:N──> company_activity_selection ──N:N──> partner_activity
                                                                    │
                                                                    │ 1:N
                                                                    ▼
worker ──1:N──> worker_activity_action ──1:1(alla conversione)──> partner_activity_booking ──1:1──> partner_worker_relationship
   │                                                                     │                                    │
   │ 1:N                                                                │ 1:1                                │ N:1
   ▼                                                                    ▼                                    ▼
worker_consent_event <────────────────────────────────────────── (vincola)                          network.partner_profile
                                                                          │
                                                                          │ 1:N
                                                                          ▼
                                                        activation_signal_source_event ──N:1──> activation_signal_aggregate
                                                                                                        │
                                                                                                        │ 1:1
                                                                                                        ▼
                                                                                          privacy_threshold_decision ──N:1──> privacy_threshold_rule
                                                                                                        │
                                                                                                        ▼ (futuro, gated CTO)
                                                                                          confine kora_index_phase2_adapter
```

| Classe di relazione | Cardinalità | Chi crea | Chi legge | Chi aggiorna | Chi non legge mai | Azienda vede dati individuali? | Aggregate-only obbligatorio? |
|---|---|---|---|---|---|---|---|
| company_activity_selection → partner_activity | N:N | COMPANY_ADMIN | COMPANY_ADMIN, KORA_ADMIN | COMPANY_ADMIN | WORKER, PARTNER (per logica di scope) | No | N/A |
| worker → worker_activity_action | 1:N | WORKER (proprio) | WORKER (proprio), KORA_ADMIN (audit) | WORKER (proprio, es. annulla) | COMPANY_ADMIN, PARTNER (finché non convertito) | **Mai** | Sì per l'azienda |
| worker_activity_action → partner_activity_booking | 1:1 (alla conversione) | Sistema (su azione worker) | WORKER (proprio), PARTNER (proprie prenotazioni), KORA_ADMIN | PARTNER (stato), WORKER (ritiro) | COMPANY_ADMIN | **Mai** | Sì per l'azienda |
| partner_activity_booking → partner_worker_relationship | 1:1 | Sistema (alla prima prenotazione) | PARTNER (proprie), WORKER (proprie), KORA_ADMIN | WORKER (revoca) | COMPANY_ADMIN | **Mai** | N/A |
| booking → activation_signal_source_event | N:1 | Sistema (al completamento) | Solo KORA_ADMIN | Solo sistema | COMPANY_ADMIN, WORKER, PARTNER | Mai individualmente | Sì, alimenta l'aggregato |
| source_event → activation_signal_aggregate | N:1 | Sistema (batch/schedulato) | COMPANY_ADMIN (aggregato), KORA_ADMIN | Solo sistema | — | No (aggregato per costruzione) | **Sempre** |
| aggregate → privacy_threshold_decision | 1:1 | Sistema | KORA_ADMIN, COMPANY_ADMIN (solo badge di stato) | Solo sistema | — | No | Sì |
| worker → worker_consent_event | 1:N | WORKER (proprio) | WORKER (proprio), KORA_ADMIN (audit) | WORKER (solo revoca) | COMPANY_ADMIN, PARTNER | **Mai** | N/A |

---

## 6. Bozza di matrice ruolo/accesso

**Questa non è ancora la matrice di accesso autoritativa.** La matrice autoritativa resta `docs/access-matrix.md`; questa tabella è una bozza di lavoro per Phase 2, da sottoporre a revisione prima di qualunque estensione reale del documento canonico.

| Oggetto | KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | ADVISOR (futuro) |
|---|---|---|---|---|---|
| partner_activity | admin read/write auditato | tenant read (solo pubblicate, via selezione) | own read (solo eleggibili) | own create/update | no access |
| company_activity_selection | admin read auditato | own create/update | no access | no access | no access |
| worker_activity_eligibility_view | admin read auditato (future CTO review) | no access | own read | no access | no access |
| worker_activity_action | admin read auditato (future CTO review) | no access | own create/update | no access (finché non è booking) | no access |
| partner_activity_booking | admin read auditato (future DPO+CTO review) | no access | own read | partner-scoped read/update (proprie attività) | no access |
| partner_worker_relationship | admin read auditato (future DPO review) | no access | own read/update (revoca) | partner-scoped read (proprie) | no access |
| activation_signal_source_event | admin read auditato (future DPO+CTO review) | no access | no access | no access | no access |
| activation_signal_aggregate | admin read auditato | aggregate read (future CTO review su logica soglia) | no access | no access | no access |
| privacy_threshold_decision | admin read auditato | aggregate read (solo stato) | no access | no access | no access |
| partner_delivery_evidence | admin read auditato | aggregate read (future DPO review) | no access | own create (proprie prenotazioni) | no access |
| worker_consent_event | admin read auditato (future DPO review) | no access | own create/update (revoca) | no access | no access |
| phase2_audit_event | admin read (estende `audit.audit_log`) | no access | no access | no access | no access |

---

## 7. Bozza di piano di naming per policy RLS

**Nessuna policy RLS esiste ancora.** I nomi seguenti sono bozze concettuali per uso documentale, non implementazione:

- `phase2_partner_activity_kora_admin_all`
- `phase2_partner_activity_partner_own_select`
- `phase2_partner_activity_partner_own_update`
- `phase2_partner_activity_company_admin_tenant_select`
- `phase2_partner_activity_worker_eligible_select`
- `phase2_company_activity_selection_company_admin_tenant_all`
- `phase2_worker_activity_eligibility_view_worker_own_select`
- `phase2_worker_activity_action_worker_own_all`
- `phase2_partner_activity_booking_worker_own_select`
- `phase2_partner_activity_booking_partner_scoped_select`
- `phase2_partner_worker_relationship_worker_own_select`
- `phase2_activation_signal_source_event_kora_admin_select`
- `phase2_activation_signal_aggregate_company_admin_aggregate_select`
- `phase2_privacy_threshold_decision_company_admin_status_select`
- `phase2_worker_consent_event_worker_own_all`
- `phase2_partner_delivery_evidence_partner_own_insert`

**Note vincolanti:**
- Nessuna di queste policy esiste oggi in alcuna forma — sono nomi di lavoro proposti.
- Le policy finali richiedono revisione CTO e, per ogni oggetto con dato individuale (booking, relationship, consent, source_event, eligibility_view, action), revisione DPO.
- Ogni policy reale dovrà seguire la convenzione già stabilita nel repo (`<tabella>_<ruolo>_<scope>`) e usare le funzioni helper `kora.kora_role()`/`kora.tenant_id()` già presenti nello schema `kora`, dove applicabile — non introdurre un meccanismo di autorizzazione parallelo.

---

## 8. Gap di design — Access Resource

Oggi **non esiste alcuna voce `AccessResource`** per nessun oggetto Phase 2 in `lib/auth/access-matrix.ts`. La union type `AccessResource` copre solo: `company_kpi_kora_index`, `company_config_source_batch`, `company_submissions_approval`, `aggregates_n_ge_10`, `worker_individual_pib`, `worker_individual_uef`, `personal_pseudonym_map`, `hq_operator_console`.

Qualunque implementazione reale del Phase 2 dovrà estendere sia `docs/access-matrix.md` (la matrice autoritativa) sia `lib/auth/access-matrix.ts` (l'implementazione TypeScript) con nuove voci `AccessResource` per gli oggetti individuati in questo documento — **prima** che venga scritta qualunque riga di SQL. Questa estensione è **un artefatto di governance, non solo una modifica di codice**: `docs/access-matrix.md` dichiara esplicitamente di "superare qualsiasi check hardcoded nel codice" — significa che la sequenza corretta è prima il documento, poi il codice, mai il contrario. Nessuna di queste estensioni avviene in questo sprint.

---

## 9. Gap di design — Soglia di privacy

Il campo statico `privacyThresholdStatus` nel modello Phase 2 attuale (`lib/partner-activities/activation-signals.ts`) **non è una decisione reale** — è un'etichetta di anteprima statica, mai calcolata, mai approvata. Prima di qualunque aggregazione reale:

- Il Phase 2 dovrebbe riusare il concetto già esistente in `lib/privacy/group-threshold.ts` (`DEFAULT_MIN_GROUP_SIZE = 10`), che è già lo stesso valore `safe_aggregation_threshold` citato in `docs/access-matrix.md`.
- **Il DPO deve approvare esplicitamente se N≥10 è sufficiente anche per i dati Phase 2**, non solo per gli aggregati Phase 1 per cui la soglia è stata originariamente pensata.
- I segnali di continuità/utilizzo ripetuto e gli aggregati a livello di singolo partner possono richiedere una gestione più stringente della soglia standard, perché il pattern di utilizzo ripetuto è intrinsecamente più identificante di un conteggio singolo — questo rischio è stato segnalato anche nella revisione `KORA-INDEX-ACTIVATION-INTEGRATION-RO`.

---

## 10. Gap di design — Consenso e revoca

`worker_consent_event` è un prerequisito prima che la visibilità nominativa del partner possa diventare reale (oggi è solo un'affermazione statica nei dati mock). In particolare:

- La **revoca** del consenso deve essere progettata esplicitamente — nessun pattern esistente nel repo gestisce oggi la revoca end-to-end (il precedente più vicino, `kora_link.link_consents` in `034_kora_link_schema.sql`, è esso stesso ancora proposto/non applicato).
- `partner_worker_relationship` deve essere **vincolato** dal consenso/azione del lavoratore — non deve mai poter esistere indipendentemente da un evento di consenso o da una prenotazione avviata dal lavoratore.
- **L'azienda non deve mai vedere la relazione partner-lavoratore**, in nessuna forma, aggregata o individuale — questo vincolo resta invariato indipendentemente da come viene progettato lo schema di consenso.

---

## 11. Raccomandazioni di riuso vs nuova tabella

**Da riusare:**
- `network.partner_profile` / `network.partner_identity` come ancora di identità del partner.
- `audit.audit_log` come traccia di audit del Phase 2 (`phase2_audit_event` dovrebbe essere un'estensione, non un nuovo schema).
- Il concetto di `lib/privacy/group-threshold.ts` per la soppressione dei gruppi piccoli.
- La forma proposta `kora_link.link_consents` (`034_kora_link_schema.sql`) come **precedente concettuale**, non come implementazione — è ancora non applicata.
- La convenzione di naming RLS canonica del repo e le funzioni helper `kora.kora_role()`/`kora.tenant_id()`.

**Da non riusare direttamente:**
- `commons.post`
- `commons.booking`
- `commons.contribution_event`
- `personal.worker_pib`
- `personal.worker_identity`
- `personal.worker_pseudonym_map`
- `personal.worker_profile_private`

Queste ultime quattro rappresentano il tier di dati individuali più protetto del repo (la migration 027 ha rimosso anche l'accesso `KORA_ADMIN`) — un precedente sbagliato per qualunque tabella Phase 2 aziendale-adiacente; le prime tre restano dottrinalmente separate come pipeline Contribution, mai fuse con il Phase 2.

---

## 12. Proposta di ordine di implementazione

Ordine raccomandato, solo documentale:

1. Bozza di estensione di `docs/access-matrix.md`.
2. Revisione di design RLS Phase 2 (`PHASE2-RLS-DESIGN-RO`).
3. Design della soglia di privacy.
4. Design di consenso/revoca.
5. Proposta SQL in bozza.
6. Test statici sulla proposta SQL.
7. Revisione CTO/DPO.
8. Solo dopo: discussione di migration/applicazione.

Questo sprint copre solo l'inventario che precede il passo 1 — nessuno degli 8 passi è stato eseguito qui.

---

## 13. Cosa non implementare ancora

- Nessuna integrazione reale con il KORA Index.
- Nessun punteggio companion.
- Nessun punteggio di attivazione pubblico separato.
- Nessun self-select worker (034/035/036 restano proposti/non applicati).
- Nessuna visibilità individuale per l'azienda.
- Nessuna navigazione bulk dei lavoratori da parte del partner.
- Nessuna disaggregazione per dipartimento/team prima che esistano regole di soglia.
- Nessuna automazione di categoria fiscale/legale.
- Nessuna persistenza di `activation_signal`.
- Nessuna migration.
- Nessun SELECT diretto dell'azienda su tabelle worker/booking/source-event.

---

## 14. Decisioni aperte

1. Namespace finale (`phase2.*` vs alternative).
2. Naming definitivo delle voci `AccessResource`.
3. Soglia minima di gruppo (riuso di N≥10 o soglia più stringente per Phase 2).
4. Visibilità aziendale degli aggregati a livello di singolo partner.
5. Visibilità di continuità/utilizzo ripetuto.
6. Disaggregazione per dipartimento/sito/team.
7. Design di revoca del consenso.
8. Periodo di conservazione dei dati.
9. Autorità sulla categoria fiscale/welfare.
10. Mappatura sulle componenti canoniche del KORA Index.
11. Sequenza di approvazione CTO/DPO.

Nessuna di queste è risolta in questo documento.

---

## 15. Prossimo passo raccomandato

**`PHASE2-RLS-DESIGN-RO`** — una revisione read-only dedicata al design RLS e ai confini di ruolo, che approfondisca la bozza di matrice ruolo/accesso (§6) e il piano di naming delle policy (§7) prima di qualunque bozza SQL. Si raccomanda questo passo rispetto a `PHASE2-PRIVACY-THRESHOLD-DESIGN-01` perché il gap più grande identificato da `PHASE2-SCHEMA-RO` è specificamente l'assenza totale di voci `AccessResource`/RLS (§8), mentre il concetto di soglia di privacy ha già un modulo di piattaforma riutilizzabile (`lib/privacy/group-threshold.ts`) su cui appoggiarsi — il gap RLS/access-matrix è strutturalmente più urgente e blocca di più.

---

## Documenti collegati

`docs/PARTNER_ECOSYSTEM_MODEL_01.md`, `docs/KORA_ACTIVATION_LAYER_01.md`, `docs/ACTIVATION_SIGNAL_PIPELINE_01.md`, `docs/COMPANY_ACTIVITY_SIGNAL_PREVIEW_01.md`, `docs/access-matrix.md`.

**Aggiornamento (PHASE2-ACCESS-MATRIX-DRAFT-01):** il gap di Access Resource descritto in §8 è stato approfondito in `docs/PHASE2_ACCESS_MATRIX_DRAFT_01.md` — anch'esso una bozza non autoritativa, non parte del documento canonico `docs/access-matrix.md`.

**Aggiornamento (PHASE2-PRIVACY-THRESHOLD-DESIGN-01):** il gap di soglia di privacy descritto in §9 è stato approfondito in `docs/PHASE2_PRIVACY_THRESHOLD_DESIGN_01.md` — anch'esso una bozza, non approvata dal DPO, non un'implementazione.

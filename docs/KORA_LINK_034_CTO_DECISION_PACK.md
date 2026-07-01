# KORA Link — 034 CTO Decision Pack

**KL-13 — Decision Pack per CTO/Postgres Reviewer**

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Commit HEAD:** `69b8edc` (KL-12)  
**Scopo:** Trasformare le 8 decisioni bloccanti di KL-12 in raccomandazioni chiare e approvabili dal CTO prima che Gate 2 si chiuda.

---

## 1. Executive Summary

`supabase/proposed/034_kora_link_schema.sql` è un draft proposto in sola lettura — **non è mai stato applicato ad alcun database**. Definisce lo schema `kora_link` con 11 tabelle per il bridge fisico-digitale NFC di KORA Link v1.

La review KL-12 ha individuato **8 decisioni bloccanti** che devono essere risolte prima di:
- promuovere 034 da `proposed/` a `supabase/migrations/`
- redigere e revieware RLS 035
- implementare DB lookup e worker activation

Questo documento propone una **raccomandazione preliminare per ognuna delle 8 decisioni**, accompagnata da pro/contro e spazio per la decisione finale del CTO. Le raccomandazioni sono calibrate per Foundation Light v1 (pilot controllato, scala limitata, nessun live data in produzione).

**Stato gate invariato:** Gate 2 OPEN · Gate 3 OPEN · Gate 4 NOT STARTED.  
DB lookup, activation, e promozione 034 restano bloccati fino a Gate 2 chiuso.

---

## 2. Decision Table

| ID | Decisione | Raccomandazione v1 | Owner | Blocca 035? | Blocca promotion? | Rischio se non deciso |
|----|-----------|-------------------|-------|-------------|------------------|-----------------------|
| D-01 | FK targets su tenant_id / worker_id / partner_id | No FK in v1 (pattern 033) | CTO | Sì — impatta lookup functions | Sì | Inconsistenza pattern repo; FK rotta al primo schema change |
| D-02 | `UNIQUE NULLS NOT DISTINCT` Postgres 15+ | Sostituire con partial index compatibile | CTO + DBA | No | Sì — syntax error su PG<15 | Schema fallisce al apply su istanza PG<15 |
| D-03 | Colonna generata `scan_date` (timezone) | Rimuovere o posticipare con `partner_scans` | CTO | No | Sì — rischio errore apply | Idempotency key con comportamento timezone imprevedibile |
| D-04 | TTL enforcement strategy | App-layer only in v1; pg_cron posticipato | CTO | No | No | Token scaduti restano con `status != expired` in DB |
| D-05 | `audit_log` retention | Schema ok; policy definita con DPO in Gate 3 | CTO + DPO | No | No (blocca prod) | Non bloccante per Gate 2; bloccante per Gate 9 (production) |
| D-06 | `public_lookup_attempts` rimozione da v1 | Rimuovere da 034 v1 | CTO | No | No | Tabella ad alto volume con nessun consumer v1; ridondante con Upstash |
| D-07 | Secret rotation procedure | Definire key_version + runbook; no rotation ordinaria in v1 | CTO | Sì — impatta token lookup design | Sì | Secret irruotabile in emergenza; tutti i token invalidi post-rotazione |
| D-08 | Deferred self-FK `replaced_by_link_id` | Rimuovere deferred FK; usare `link_replacements` | CTO | No | No | Potenziale incompatibilità pooler Supabase; complessità inutile in v1 |

---

## 3. Decision 01 — FK targets

### Stato attuale

034 ha 7 colonne senza FK (o con FK pendente da conferma):

| Colonna | Tabella | Target candidato | Status |
|---------|---------|-----------------|--------|
| `tenant_id` | `link_batches` | `analytics.tenant(id)` | No FK in draft |
| `worker_id` | `link_assignments` | `personal.worker_identity(id)` | No FK — TODO FK-034-2 |
| `worker_id` | `link_consents` | `personal.worker_identity(id)` | No FK — TODO FK-034-3 |
| `worker_id` | `link_events` | `personal.worker_identity(id)` | No FK — TODO FK-034-4 |
| `worker_id` | `revocations` | `personal.worker_identity(id)` | No FK — TODO FK-034-5 |
| `worker_id` | `link_replacements` | `personal.worker_identity(id)` | No FK — TODO FK-034-6 |
| `partner_id` | `partner_scans` | `partner.profile(id)` | No FK — TODO FK-034-7 |

### Opzione A — No FK (raccomandazione v1)

I boundary di tenant e worker sono garantiti da:
- RLS 035: `WHERE tenant_id = kora.tenant_id()` su ogni accesso
- SECURITY DEFINER functions: validazione tenant match a livello DB prima di ogni write
- Application layer: `ActivationSafeguardService` e route server-side

**Pro:** Coerente con migration 033 (stesso pattern no-FK per tenant_id). Nessun rischio di FK rotta se schema target cambia. Rollback più semplice. Non blocca 034 per instabilità schema dipendente.

**Contro:** Nessuna referential integrity a livello DB. Orfani possibili in caso di bug applicativo.

### Opzione B — FK con `ON DELETE RESTRICT`

**Pro:** Referential integrity garantita. Prevenzione orfani a livello DB.

**Contro:** Richiede stabilità confermata di `analytics.tenant`, `personal.worker_identity`, `partner.profile` prima dell'apply. Se questi schemi cambiano, 034 deve essere modificato. FK cross-schema aumenta la complessità di `DROP SCHEMA kora_link CASCADE` (rollback).

### Opzione C — FK solo per target stabili

FK solo dove il target è confermato stabile (es. `auth.users` — già usato in `link_batches.created_by` e `link_delivery_records.delivered_by`); nessuna FK per `tenant_id` e `worker_id` fino a conferma.

**Raccomandazione:** **Opzione A** per v1. Le SECURITY DEFINER functions in 035 sono il punto di enforcement corretto per tenant isolation e worker identity. Non introdurre FK cross-schema prima di aver confermato la stabilità dei target.

**Impatto su 035:** Le SECURITY DEFINER functions (`fn_kora_link_public_lookup`, `fn_kora_link_activate`) devono validare esplicitamente il match `token.tenant_id = worker.tenant_id` senza poter fare affidamento su una FK. Questo è già il design previsto in 035 e non cambia nulla nell'implementazione.

| | Opzione A (no FK) | Opzione B (FK RESTRICT) | Opzione C (FK selettive) |
|-|------------------|------------------------|--------------------------|
| Complessità rollback | Bassa | Alta | Media |
| Rischio instabilità target | Nessuno | Alto | Medio |
| Coerenza con repo (033) | ✅ | ❌ | Parziale |
| Referential integrity DB | App + RLS | DB nativo | Parziale |
| Raccomandazione v1 | **✅** | | |

**Decisione CTO:** `[ ] Opzione A` `[ ] Opzione B` `[ ] Opzione C` `[ ] Altro: ___`

---

## 4. Decision 02 — PostgreSQL Compatibility

### Problema

034 usa due feature che richiedono **PostgreSQL 15+**:

```sql
-- In partner_scans (linea ~862):
CONSTRAINT uq_partner_scan_daily
  UNIQUE NULLS NOT DISTINCT (partner_id, link_id, event_ref, scan_date)
```

`UNIQUE NULLS NOT DISTINCT` è stata introdotta in PostgreSQL 15. Prima di PG15, i NULL erano sempre distinti in una UNIQUE constraint — due righe con `partner_id = NULL` non venivano mai considerate duplicate.

```sql
-- In partner_scans (linea ~843):
scan_date  date  NOT NULL GENERATED ALWAYS AS (occurred_at::date) STORED,
```

Le colonne generate STORED sono disponibili da PostgreSQL 12, ma la sintassi combinata con la constraint sopra richiede PG15+.

### Verifica versione

Prima dell'apply, eseguire su staging:

```sql
SELECT version();
-- Atteso in Supabase Pro (2024+): PostgreSQL 15.x o PostgreSQL 16.x
```

### Se Supabase è PG15+

Nessuna modifica necessaria. Annotare la version requirement come prerequisito:

```sql
-- Prerequisito: PostgreSQL 15+
-- Verificare: SELECT version()
```

### Se Supabase è PG<15

Alternativa compatibile per la constraint di idempotenza:

```sql
-- Rimuovere UNIQUE NULLS NOT DISTINCT
-- Sostituire con partial unique index su valori non-null:
CREATE UNIQUE INDEX uq_partner_scan_daily
  ON kora_link.partner_scans (partner_id, link_id, event_ref, scan_date)
  WHERE partner_id IS NOT NULL
    AND link_id IS NOT NULL
    AND event_ref IS NOT NULL
    AND scan_date IS NOT NULL;
-- Nota: rows con qualunque NULL non sono coperte dall'idempotency check
-- Accettabile per partner_scans in v1 (tutti i campi dovrebbero essere popolati)
```

### Raccomandazione

Se `partner_scans` viene posticipata (vedi D-03 e raccomandazione D-06), questa decisione può essere rinviata. Se rimane in 034: confermare versione PostgreSQL dell'istanza target prima dell'apply, e documentarla come prerequisito esplicito nel file SQL.

**Raccomandazione v1:** Verificare versione PG e, se < 15, sostituire `UNIQUE NULLS NOT DISTINCT` con il partial index equivalente. Se `partner_scans` viene rimossa da 034 (D-06), questa decisione non è bloccante.

**Decisione CTO:** `[ ] PG15+ confermato — mantieni sintassi` `[ ] PG<15 — usa partial index` `[ ] Rinviare con partner_scans` `[ ] Confermare versione: ________`

---

## 5. Decision 03 — Generated Column `scan_date`

### Problema

```sql
scan_date  date  NOT NULL GENERATED ALWAYS AS (occurred_at::date) STORED,
```

Il cast `timestamptz::date` in PostgreSQL usa il timezone della sessione corrente. Se Supabase configura le sessioni con `TimeZone = UTC` (default), un evento alle `23:00:00+02:00` (CEST) risulterebbe `2026-07-01` in UTC, ma fisicamente accade il `2026-07-02` in Europe/Rome.

Questo crea un'idempotency key basata sulla data UTC, non sulla data locale dell'evento. Per il caso d'uso KORA Link (presenze a eventi fisici in Europa), la data locale è probabilmente quella semanticamente corretta.

### Alternative

**Alternativa A — Expression index (non colonna generata):**

```sql
-- Rimuovere la colonna generated scan_date
-- Sostituire la UNIQUE CONSTRAINT con un expression index:
CREATE UNIQUE INDEX uq_partner_scan_daily
  ON kora_link.partner_scans (partner_id, link_id, event_ref,
    (occurred_at AT TIME ZONE 'Europe/Rome')::date)
  WHERE partner_id IS NOT NULL AND link_id IS NOT NULL
    AND event_ref IS NOT NULL;
-- Vantaggio: timezone esplicito e controllato
-- Svantaggio: il timezone hardcoded 'Europe/Rome' non è portabile per deploy internazionali
```

**Alternativa B — Colonna normale, valorizzata dall'applicazione:**

```sql
-- scan_date date NOT NULL  (senza GENERATED ALWAYS AS)
-- Valorizzata dall'applicazione a livello di INSERT
-- Vantaggio: pieno controllo timezone; facile da testare; no dipendenza da behavior PG
-- Svantaggio: validità dei dati dipende dall'app (non enforced dal DB)
```

**Alternativa C — Rimuovere `partner_scans` da 034 (raccomandazione principale):**

`partner_scans` è esplicitamente un placeholder per v1.1+. Toglierla da 034 elimina TODO-CTO-02, TODO-CTO-03, e FK-034-7 in un colpo solo. Si aggiunge in una migration separata (036) quando Track A sarà in scope.

### Raccomandazione

**Se `partner_scans` rimane in 034:** usare Alternativa B (colonna normale, app-managed). Timezone esplicito, no comportamento implicito PG session.

**Raccomandazione v1 principale:** Rimuovere `partner_scans` da 034 e aggiungerla in migration 036 con Track A. Questo elimina tre TODO-CTO correlati in blocco.

**Decisione CTO:** `[ ] Mantenere GENERATED AS (timezone UTC accettabile)` `[ ] Alternativa A (expression index, Europe/Rome hardcoded)` `[ ] Alternativa B (colonna normale, app-managed)` `[ ] Rimuovere partner_scans da 034` `[ ] Decidere con partner_scans scope`

---

## 6. Decision 04 — TTL Enforcement Strategy

### Contesto

I token non attivati scadono dopo 180 giorni (`pre_activation_expires_at = created_at + INTERVAL '180 days'`). Il campo esiste in `kora_link.links`. Nessun job periodico è definito in 034.

**Comportamento attuale:** La scadenza è verificata a livello applicativo nella route (`evaluateKoraLinkPublicRouteState` → future `fn_kora_link_public_lookup`). Un token con `pre_activation_expires_at < now()` viene trattato come non attivabile anche se il suo `status` è `'generated'` o `'delivered'`.

**Conseguenza senza batch job:** I token scaduti rimangono nel DB con `status != 'expired'`. Le query di aggregazione (es. conteggio token per tenant) devono includere la check su `pre_activation_expires_at` oppure mostrano numeri inflati.

### Opzioni

| Opzione | Complessità infra | Consistenza DB | Costo |
|---------|------------------|---------------|-------|
| App-only check (attuale) | Nessuna | DB inconsistente (ok per v1) | Nessun costo extra |
| pg_cron batch notturno | Bassa (se pg_cron abilitato) | DB consistente | Costo extension |
| Supabase Edge Function schedulata | Media | DB consistente | Costo Edge invocations |
| Admin manual process | Nessuna | DB consistente su richiesta | Effort manuale |

### Raccomandazione

**v1 Foundation Light:** App-layer check è sufficiente. Il volume è controllato (pochi batch pilot). Le query di aggregazione in 035 possono filtrare su `pre_activation_expires_at` dove necessario. Il batch job di cleanup può essere aggiunto in fase post-Gate-2 come processo admin o Edge Function, senza modificare lo schema.

Nessuna modifica a 034 richiesta per questa decisione.

**Decisione CTO:** `[ ] App-only check per v1 (no modifica 034)` `[ ] pg_cron da aggiungere in 035 o migration separata` `[ ] Edge Function schedulata` `[ ] Admin manual process`

---

## 7. Decision 05 — `audit_log` Retention

### Contesto

`kora_link.audit_log` è append-only: nessun UPDATE, nessun DELETE è consentito (enforced da RLS in 035). Ogni evento significativo KORA Link genera una riga. Per un'installazione con 200 worker e 10 scansioni/giorno/worker, la tabella produce ~730K righe/anno.

La retention policy deve bilanciare:
- **GDPR Art. 5(1)(e):** dati conservati non più del necessario
- **Accountability/audit:** storia delle operazioni necessaria per audit DPO e security incident

### Stato in 034

Lo schema supporta la retention (nessun vincolo tecnico la impedisce). La policy non è definita nel file SQL — è corretto: la durata deve essere decisa con il DPO (Gate 3), non dall'ingegneria.

### Meccanismo tecnico da decidere ora (Gate 2)

| Meccanismo | Implementazione | Quando |
|-----------|----------------|--------|
| pg_cron `DELETE WHERE created_at < now() - interval` | Extension pg_cron (Supabase Pro) | Post-Gate-3 con durata definita da DPO |
| Supabase Edge Function schedulata | Cron trigger → service_role DELETE | Post-Gate-3 |
| Partitioning mensile (futura migration) | `PARTITION BY RANGE (created_at)` | v2+ se volume lo giustifica |
| Archivio esterno (Supabase Storage / S3) | Export + DELETE dopo N anni | Post-Gate-3 con DPO |

### Raccomandazione

**Non blocca Gate 2.** Lo schema 034 è corretto così com'è: nessuna modifica richiesta ora. La scelta del meccanismo tecnico può essere posticipata a quando il DPO definisce la durata (Gate 3). Il meccanismo preferito per v1 è **pg_cron** (se disponibile), da configurare in una migration separata post-Gate-3.

Nessuna modifica a 034 richiesta per questa decisione.

**Decisione CTO:** `[ ] Posticipare a Gate 3 (DPO definisce durata)` `[ ] Scegliere meccanismo ora: ________` `[ ] Partitioning mensile da subito (v2+)`

---

## 8. Decision 06 — `public_lookup_attempts` — Rimozione da v1

### Contesto

`kora_link.public_lookup_attempts` è un log di ogni scansione sulla route pubblica `/link/[token]`. Ogni richiesta HTTP genera una riga — incluse le richieste con token malformati o rate-limited.

**Stima volume:** Una NFC card scansita 3 volte al giorno × 100 worker × 360 giorni = 108K righe/anno. In scenari di scraping o tentativo di enumerazione: ordini di grandezza superiori.

### Il problema di avere questa tabella in v1

Upstash gestisce già il rate limiting operativo (sliding window Redis). `public_lookup_attempts` aggiungerebbe:
- Una scrittura DB per ogni scan (latency aggiuntiva sulla route pubblica)
- Un volume di dati GDPR-rilevante (anche se minimizzato) da gestire con retention
- Un consumer di questa tabella che in v1 non esiste (anomaly detection non è implementata)

### Argomento per tenerla

Supporto per audit DPO in caso di incident: "quante scansioni ha ricevuto il chip X nel periodo Y?" Senza questa tabella, la risposta è solo in Upstash (che ha retention limitata).

### Raccomandazione

**Rimuovere `public_lookup_attempts` da 034 v1.** Motivazione:
- Nessun consumer in v1 (anomaly detection è fuori scope)
- Upstash è sufficiente per rate limiting
- Riduce volume dati GDPR e surface di attack
- Può essere aggiunta in migration separata (036 o 037) quando anomaly detection entra in scope

Se la tabella viene rimossa, l'audit DPO in caso di incident si appoggia su Upstash (retention configurabile) e su `kora_link.audit_log` (già presente per gli eventi significativi).

**Decisione CTO:** `[ ] Rimuovere da 034 v1 (raccomandato)` `[ ] Mantenere — retention _____ giorni (meccanismo: _____)` `[ ] Mantenere placeholder, ma con INSERT disabilitato in v1`

---

## 9. Decision 07 — Secret Rotation Procedure

### Il problema fondamentale

```
token_digest = HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET)
```

Il `token_value` (la stringa `kl1_...` incisa sul chip fisico) non è mai persistito nel DB. È fisicamente sul chip — la fonte primaria è il chip stesso. Il DB conosce solo `token_digest`.

Se `KORA_LINK_TOKEN_SECRET` viene ruotato:
- Il nuovo digest del token `kl1_ABC...` sarebbe `HMAC-SHA256("kl1_ABC...", newSecret) ≠ stored_digest`
- Il lookup fallisce: tutti i token attivi diventano `not_found`
- Il sistema KORA Link cessa di funzionare per tutti i worker

**Non esiste un modo di aggiornare tutti i `token_digest` nel DB senza accedere ai `token_value` cleartext.** E i cleartext non sono nel DB — sono sui chip fisici.

### Opzioni

**Opzione A — No rotation ordinaria in v1 (raccomandazione Foundation Light):**  
Il secret è generato una volta, conservato in un secret manager, non ruotato per durata del pilot. Se compromesso: emergency procedure (vedi sotto). Questo è accettabile per Foundation Light dato il volume controllato e la durata limitata del pilot.

**Opzione B — Dual-secret lookup (key_version):**  
Aggiungere `key_version integer DEFAULT 1` a `kora_link.links`. Il lookup prova il digest con la versione corrente; se non trovato, prova versione precedente. Dopo la rotazione, un background job aggiorna i token che passano per la route (lazy migration). Token mai ri-scansiti vengono revocati dopo N giorni.

```sql
-- Modifica a 034 se Opzione B:
ALTER TABLE kora_link.links ADD COLUMN key_version integer NOT NULL DEFAULT 1;
-- fn_kora_link_public_lookup verifica digest con current + previous key_version
```

**Opzione C — Emergency migration (re-emissione massiva):**  
In caso di compromissione del secret: revocare tutti i token, generare nuovi chip, inviare ai company. Accettabile solo se la base installata è piccola (pilot → pochi chip).

**Opzione D — Worker re-scan (lazy re-issue):**  
Alla rotazione, il digest non matcha più. La route pubblica invita il worker a "richiedere un nuovo chip" invece di mostrare l'errore standard. I token vengono migrati one-by-one quando il worker ri-scansisce. I chip non ri-scansiti in N giorni vengono revocati.

### Raccomandazione

**Foundation Light v1:** Opzione A + Emergency C come fallback documentato. Il secret non viene ruotato in condizioni ordinarie. In caso di compromissione sospetta: revoca massiva + re-emissione (il volume pilot è gestibile).

Se il volume post-pilot è significativo (100+ company, 10K+ chip), implementare Opzione B con `key_version` prima di scalare.

**Modifica a 034 richiesta per Opzione B:** aggiungere `key_version` a `kora_link.links`. Per Opzione A: nessuna modifica.

**Decisione CTO:** `[ ] Opzione A — no rotation in v1 (raccomandato Foundation Light)` `[ ] Opzione B — key_version + dual-digest lookup` `[ ] Opzione C — emergency re-emissione` `[ ] Definire runbook separato senza modifica schema`

---

## 10. Decision 08 — Deferred Self-FK `replaced_by_link_id`

### Contesto

```sql
-- In kora_link.links:
replaced_by_link_id  uuid  NULL,

-- Aggiunta dopo la CREATE TABLE:
ALTER TABLE kora_link.links
  ADD CONSTRAINT fk_links_replaced_by
  FOREIGN KEY (replaced_by_link_id) REFERENCES kora_link.links (id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
```

La FK differita serve per inserire atomicamente vecchio e nuovo token nella stessa transazione, senza che la FK venga verificata prima del COMMIT. Senza `DEFERRABLE`, l'INSERT del vecchio token con `replaced_by_link_id = new_id` fallirebbe perché il nuovo token non esiste ancora.

### Problema con Supabase

Supabase usa un connection pooler (Supavisor o pgBouncer). In modalità `transaction` pooling, ogni statement può essere eseguito su una connessione diversa. `DEFERRABLE INITIALLY DEFERRED` richiede che il controllo della FK avvenga al COMMIT della transazione, ma in modalità `transaction` pooling la transazione potrebbe essere frammentata su più connessioni, rendendo `DEFERRABLE` inaffidabile.

### Alternative

**Alternativa A — Rimuovere self-FK (raccomandazione):**

`link_replacements` (tabella 7) già traccia la catena di sostituzione: `old_link_id → new_link_id`. La colonna `replaced_by_link_id` in `kora_link.links` è ridondante: la stessa informazione è in `link_replacements.new_link_id`.

Rimuovendo la self-FK e la colonna `replaced_by_link_id`:
- Nessun problema di pooler
- Nessun `DEFERRABLE` in tutto lo schema
- La catena si naviga via `link_replacements`

```sql
-- Modifica a 034: rimuovere
--   replaced_by_link_id  uuid  NULL,
--   CONSTRAINT fk_links_replaced_by ...
-- La catena di sostituzione si legge da link_replacements.new_link_id
```

**Alternativa B — Mantenere self-FK con INSERT ordinato:**

Invece di una transazione unica con DEFERRABLE, inserire i due token in ordine: prima il nuovo token (senza `replaced_by_link_id`), poi aggiornare il vecchio token con `replaced_by_link_id = new_id`. Nessuna FK differita necessaria.

```sql
-- Sequenza application:
-- 1. INSERT INTO kora_link.links (...) VALUES (new_token_data) RETURNING id
-- 2. UPDATE kora_link.links SET replaced_by_link_id = new_id, status = 'replaced' WHERE id = old_id
-- Nessuna DEFERRABLE needed
```

**Alternativa C — Mantenere DEFERRABLE, verificare Supabase pooler mode:**

Se Supabase è configurato in `session` pooling mode (non `transaction`), `DEFERRABLE INITIALLY DEFERRED` funziona correttamente.

### Raccomandazione

**Alternativa A** per v1: rimuovere `replaced_by_link_id` da `kora_link.links` e usare esclusivamente `link_replacements` per navigare la catena. Più semplice, nessun rischio pooler, nessuna ridondanza.

Se si vuole mantenere la colonna per lookup rapido (senza JOIN a `link_replacements`): usare Alternativa B (INSERT ordinato, nessun DEFERRABLE).

**Modifica a 034 richiesta per Alternativa A:** rimuovere colonna `replaced_by_link_id` e constraint `fk_links_replaced_by` da `kora_link.links`.

**Decisione CTO:** `[ ] Alternativa A — rimuovere self-FK e colonna (raccomandato)` `[ ] Alternativa B — INSERT ordinato, no DEFERRABLE` `[ ] Alternativa C — verificare pooler mode Supabase, mantenere DEFERRABLE`

---

## 11. Change Set Consolidato Raccomandato per 034

Le modifiche raccomandate a 034 prima di procedere con 035, ordinate per priorità:

| Priorità | Modifica | Decisione | Impatto |
|----------|----------|-----------|---------|
| 🔴 Alta | Rimuovere `partner_scans` da 034 (→ migration 036 con Track A) | D-03 + D-02 correlati | Elimina TODO-CTO-02, TODO-CTO-03, FK-034-7 |
| 🔴 Alta | Rimuovere `public_lookup_attempts` da 034 (→ migration 037 con anomaly detection) | D-06 | Elimina tabella ad alto volume senza consumer v1 |
| 🔴 Alta | Rimuovere `replaced_by_link_id` da `links` + constraint `fk_links_replaced_by` | D-08 | Elimina self-FK deferrable; catena via `link_replacements` |
| 🟡 Media | Rimuovere `idx_links_token_digest` (ridondante con `uq_link_token_digest`) | NB-01 | Pulizia — nessun impatto funzionale |
| 🟡 Media | Documentare `key_version` strategy se Opzione B approvata in D-07 | D-07 | Aggiunta colonna `key_version` a `kora_link.links` |
| 🟢 Bassa | Aggiungere trigger `updated_at` a `link_consents` | NB-04 | Coerenza — non bloccante |
| 🟢 Bassa | Verificare versione PostgreSQL e annotare come prerequisito nel file | D-02 | Documentazione |

**Nessuna di queste modifiche deve essere applicata come SQL.** Le modifiche vanno apportate al file `supabase/proposed/034_kora_link_schema.sql` dopo approvazione CTO, prima della promozione in `supabase/migrations/`.

**Stima impatto:** Se le 3 modifiche alta-priorità vengono approvate, 034 perde 2 tabelle (rimanendo a 9) e la self-FK deferrable. Lo schema risultante è più snello e pronto per 035 con meno superficie da coprire con RLS.

---

## 12. Decision Template per il Reviewer

Da compilare dal CTO dopo la review di questo documento. Conservare in `docs/` o nel canale di approvazione.

| ID | Status | Scelta Approvata | Note Reviewer | Owner | Data | Impatto su 035 | Impatto su Promotion |
|----|--------|-----------------|---------------|-------|------|----------------|---------------------|
| D-01 FK targets | `[ ] APPROVED` `[ ] CHANGE` `[ ] DEFER` | | | CTO | | Sì — lookup functions | Sì |
| D-02 PG compatibility | `[ ] APPROVED` `[ ] CHANGE` `[ ] DEFER` | PG version: __ | | CTO+DBA | | No | Sì |
| D-03 scan_date | `[ ] APPROVED` `[ ] CHANGE` `[ ] DEFER` | | | CTO | | No | Sì |
| D-04 TTL enforcement | `[ ] APPROVED` `[ ] CHANGE` `[ ] DEFER` | | | CTO | | No | No |
| D-05 audit_log retention | `[ ] APPROVED` `[ ] CHANGE` `[ ] DEFER` | Meccanismo: __ | | CTO+DPO | | No | No (blocca prod) |
| D-06 public_lookup_attempts | `[ ] APPROVED` `[ ] CHANGE` `[ ] DEFER` | | | CTO | | No | No |
| D-07 secret rotation | `[ ] APPROVED` `[ ] CHANGE` `[ ] DEFER` | | | CTO | | Sì | Sì |
| D-08 deferred self-FK | `[ ] APPROVED` `[ ] CHANGE` `[ ] DEFER` | | | CTO | | No | No |

### Decisione Globale

```
034_PROMOTION:  [ ] APPROVED  [ ] APPROVED WITH CHANGES (vedi sopra)  [ ] BLOCKED
035_DRAFT:      [ ] CAN START  [ ] BLOCKED (decisioni D-01, D-07 richieste prima)

Firma CTO: ________________________________
Data: ________________________________
Prerequisiti risolti prima di 035:
  [ ] D-01 (FK) decisa
  [ ] D-07 (secret rotation) decisa
  [ ] Versione PostgreSQL confermata (D-02)
Modifiche a 034 approvate:
  [ ] Lista modifiche: ______________________
```

---

## 13. Go / No-Go

```
┌─────────────────────────────────────────────────────────────────────┐
│  KORA Link v1 — Gate Status al 2026-07-01 (KL-13)                  │
├────────────────────────────┬────────────────────────────────────────┤
│ 034_PROMOTION              │ 🔴 NO-GO                               │
│                            │ Attende D-01, D-02, D-07 risolte      │
│                            │ + eventuali modifiche schema approvate │
├────────────────────────────┼────────────────────────────────────────┤
│ 035_DRAFT                  │ 🔴 NO-GO                               │
│                            │ Attende D-01 (FK → RLS functions)     │
│                            │ Attende D-07 (secret → lookup design) │
│                            │ Attende 034 stabilizzata               │
├────────────────────────────┼────────────────────────────────────────┤
│ DB_LOOKUP                  │ 🔴 NO-GO                               │
│                            │ Attende Gate 2 + Gate 4                │
│                            │ fn_kora_link_public_lookup non esiste  │
├────────────────────────────┼────────────────────────────────────────┤
│ WORKER_ACTIVATION          │ 🔴 NO-GO                               │
│                            │ Attende Gate 2 + Gate 3 + Gate 4       │
│                            │ Consent model non approvato DPO        │
├────────────────────────────┼────────────────────────────────────────┤
│ RUNTIME_PUBLIC_ROUTE       │ 🟡 SKELETON OK — DB non connesso       │
│                            │ /link/[token] esiste e funziona        │
│                            │ Feature flag KORA_LINK_ENABLED=false   │
│                            │ Nessun DB lookup · Nessuna activation  │
│                            │ 253 test verdi · Build OK · E2E 6/6    │
└────────────────────────────┴────────────────────────────────────────┘

Prossima azione raccomandata:
  CTO compila Decision Template (Sezione 12) e ritorna decisioni.
  Engineering applica modifiche a 034 (in proposed/).
  Dopo stabilizzazione: Engineering redige 035 draft.
```

---

*KORA_LINK_034_CTO_DECISION_PACK.md — KL-13 · 2026-07-01*  
*Branch: feat/kora-link-v1-platform*  
*Basato su analisi sola lettura di: supabase/proposed/034_kora_link_schema.sql, docs/KORA_LINK_034_CTO_REVIEW_CHECKLIST.md*  
*Nessun codice runtime modificato · Nessuna migration creata · Nessun SQL eseguito*

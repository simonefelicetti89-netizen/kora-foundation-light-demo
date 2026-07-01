# KORA Link — 034 Schema CTO Review Checklist

**KL-12 — CTO/Postgres Review Checklist per `supabase/proposed/034_kora_link_schema.sql`**

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Commit HEAD:** `8f55570` (KL-11)  
**File analizzato:** `supabase/proposed/034_kora_link_schema.sql` (sola lettura — NON modificato)  
**Scopo:** Documentare tutte le domande bloccanti e non bloccanti per il CTO/Postgres review. Nessun codice modificato in questo documento.

---

## 1. Executive Summary

`034_kora_link_schema.sql` è uno schema draft per KORA Link v1 — il bridge fisico-digitale NFC della piattaforma. Il file si trova in `supabase/proposed/` e **non è mai stato applicato ad alcun database**. RLS (migration 035) non è stato ancora redatto.

Lo schema crea il nuovo schema Postgres `kora_link` con 11 tabelle, covering:

- Gestione del ciclo di vita dei batch NFC e dei chip singoli (`link_batches`, `links`)
- Associazione token↔worker post-consent (`link_assignments`, `link_consents`)
- Log operativo e audit immutabile (`link_events`, `audit_log`)
- Revoca e sostituzione chip (`revocations`, `link_replacements`)
- Placeholder scan partner v1.1+ (`partner_scans`)
- Log pubblici per rate limiting e anomaly detection (`public_lookup_attempts`)
- Tracciabilità consegna fisica (`link_delivery_records`)

Il file contiene **8 explicit TODO CTO** che devono essere risolti prima della promozione in `supabase/migrations/`. Contiene inoltre 2 TODO DPO, 1 TODO retention, e una sezione completa `[RLS-035]` che specifica le policy da implementare nel file successivo.

**Gate bloccante:** Gate 2 (CTO review) blocca l'intera catena: DB lookup → activation → worker flow → staging → production.

---

## 2. Scope della Review

### In scope

| Cosa | Motivazione |
|------|------------|
| `supabase/proposed/034_kora_link_schema.sql` — tutte le 11 tabelle | Schema primario da approvare |
| FK targets per `tenant_id` e `worker_id` (FK-034-1 → FK-034-7) | Pattern inconsistente con il resto del repo se non risolto |
| Compatibilità PostgreSQL versione (`UNIQUE NULLS NOT DISTINCT`, `GENERATED ALWAYS AS`) | Sintassi potenzialmente Postgres 15+ only |
| Self-FK deferrable su `kora_link.links.replaced_by_link_id` | Comportamento DEFERRABLE in Supabase da confermare |
| Pattern indici ridondanti su UNIQUE constraint | Decisione intenzionale documentata — CTO conferma o rimuove |
| Strategy token TTL enforcement (application vs pg_cron) | Impatto su infra e costi |
| Retention policy per `audit_log` e `public_lookup_attempts` | Volume elevato, GDPR compliance |
| Secret rotation e dual-digest migration procedure | Nessuna procedura definita ancora |
| Dependency map su RLS 035 (scope RLS, SECURITY DEFINER functions) | 035 non ancora redatto — 034 deve essere stabile prima |

### Fuori scope (Gate 3 — DPO/Legal)

| Cosa | Gate corretto |
|------|--------------|
| Testo privacy notice per consenso worker | Gate 3 — DPO |
| Approvazione `consent_version` string (es. `kora-link-privacy-v1.0`) | Gate 3 — DPO |
| Strategia hashing IP per `request_fingerprint` | Gate 3 — DPO (TODO DPO-034-1, DPO-034-2) |
| Retention policy `audit_log` durata (definizione in giorni/anni) | Gate 3 — DPO (valore da decidere) |
| Partner scan privacy notice | Gate 3 — DPO |

### Fuori scope (Gate 4 — RLS 035)

| Cosa | Gate corretto |
|------|--------------|
| Redazione e review di `035_kora_link_rls.sql` | Gate 4 — dopo stabilizzazione 034 |
| SECURITY DEFINER functions (`fn_kora_link_public_lookup`, `fn_kora_link_activate`) | Gate 4 |
| Grant e privilege settings per schema `kora_link` | Gate 4 |

---

## 3. Riepilogo del File 034

### Metadati

| Campo | Valore |
|-------|--------|
| File | `supabase/proposed/034_kora_link_schema.sql` |
| Status | PROPOSED / NOT APPLIED |
| Schema creato | `kora_link` (nuovo schema isolato) |
| Tabelle | 11 (elencate sotto) |
| Trigger | 2 (`trg_link_batches_updated_at`, `trg_links_updated_at`) |
| Indici | 25 (mix plain + partial + unique) |
| TODO CTO espliciti | 8 |
| TODO DPO | 2 |
| TODO Retention | 1 |
| TODO RLS | 14 policy items (A–N), in 035 |
| Depends on | Migrations 001–033 applicate; `set_updated_at()`, `kora.kora_role()`, `kora.tenant_id()`, `auth.users` |

### Elenco tabelle

| # | Tabella | Scopo | Append-only? | Trigger updated_at? |
|---|---------|-------|-------------|-------------------|
| 1 | `kora_link.link_batches` | Batch amministrativo NFC, creato da KORA_ADMIN | No | ✅ |
| 2 | `kora_link.links` | Record core token — un chip, un record. Digest HMAC-SHA256 | No | ✅ |
| 3 | `kora_link.link_assignments` | Associazione token↔worker post-consent | No | ✅ |
| 4 | `kora_link.link_consents` | Consenso esplicito worker alla privacy notice | No | No |
| 5 | `kora_link.link_events` | Log operativo tecnico. Append-only | ✅ | No |
| 6 | `kora_link.revocations` | Audit immutabile revoca/sospensione. Append-only | ✅ | No |
| 7 | `kora_link.link_replacements` | Catena sostituzione chip. Un record per chip sostituito | No | No |
| 8 | `kora_link.partner_scans` | Placeholder scan partner (v1.1+) | No | No |
| 9 | `kora_link.audit_log` | Audit trail privacy-safe. Append-only | ✅ | No |
| 10 | `kora_link.public_lookup_attempts` | Log pubblico route `/link/[token]`. Alta frequenza | ✅ (design) | No |
| 11 | `kora_link.link_delivery_records` | Tracciabilità consegna fisica chip | No | No |

### Design invarianti già implementati nel file

| Invariante | Evidenza nel file |
|-----------|-------------------|
| Nessuna colonna `token_value` (cleartext) | `CONSTITUTIONAL: no token_value column` — verificabile con query post-apply |
| Nessuna colonna `nfc_url` | `CONSTITUTIONAL: no nfc_url column` |
| `UNIQUE(token_digest)` su `kora_link.links` | `CONSTRAINT uq_link_token_digest UNIQUE (token_digest)` |
| `CHECK (length(token_digest) = 64)` | Presente su `kora_link.links.token_digest` |
| Pattern `text + CHECK` per enum-like | Documentato nel file header — stesso pattern di 033, 025 |
| Trigger `set_updated_at()` dipendenza da 001 | Dichiarata in dipendenze |
| Self-FK DEFERRABLE su `replaced_by_link_id` | `DEFERRABLE INITIALLY DEFERRED` — TODO-CTO-08 da confermare |
| No RLS in questo file — tutto in 035 | Sezione TODO RLS-035 in fondo al file |

---

## 4. Domande Bloccanti (CTO) — 8 TODO CTO

I seguenti 8 punti devono essere risolti con una decisione documentata prima che 034 possa essere promosso in `supabase/migrations/`. Per ognuno: contesto tecnico, opzioni, raccomandazione provvisoria del team, e casella per la decisione del CTO.

---

### [TODO-CTO-01] FK targets — tenant_id e worker_id (FK-034-1 → FK-034-7)

**Location nel file:** commenti FK-034-1 (linea ~112), FK-034-2 (linea ~349), FK-034-3 (linea ~449), FK-034-4 (linea ~521), FK-034-5 (linea ~630), FK-034-6 (linea ~724), FK-034-7 (linea ~813)

**Contesto:**  
7 colonne `tenant_id` o `worker_id` nelle tabelle 034 non hanno FK definita. Questo è intenzionale nel draft, con i seguenti TODO:

| FK | Colonna | Tabella | Target candidato |
|----|---------|---------|-----------------|
| FK-034-1 | `tenant_id` | `link_batches` | `analytics.tenant(id)` |
| FK-034-2 | `worker_id` | `link_assignments` | `personal.worker_identity(id)` |
| FK-034-3 | `worker_id` | `link_consents` | `personal.worker_identity(id)` |
| FK-034-4 | `worker_id` | `link_events` | `personal.worker_identity(id)` |
| FK-034-5 | `worker_id` | `revocations` | `personal.worker_identity(id)` |
| FK-034-6 | `worker_id` | `link_replacements` | `personal.worker_identity(id)` |
| FK-034-7 | `partner_id` | `partner_scans` | `partner.profile(id)` |

**Opzione A — Nessuna FK (pattern repo corrente):**  
Migration 033 non ha FK su `tenant_id`. Pattern consolidato: isolamento applicativo, nessuna FK cross-schema che complichi `DROP SCHEMA` o `ON DELETE CASCADE`. L'applicazione valida a livello service. Più semplice per rollback e test.

**Opzione B — FK con `ON DELETE RESTRICT`:**  
Referential integrity garantita a livello DB. Previene orfani. Richiede stabilità degli schemi target (`analytics.tenant`, `personal.worker_identity`, `partner.profile`) prima di applicare 034. Se questi schemi cambiano, il rollback è più complesso.

**Domanda per il CTO:**
1. Confermare schema target per `tenant_id`: `analytics.tenant(id)` o altra tabella?
2. Confermare schema target per `worker_id`: `personal.worker_identity(id)` o altra tabella? Questi schemi sono stabili pre-034-apply?
3. Pattern preferito: Opzione A (no FK, come 033) o Opzione B (FK ON DELETE RESTRICT)?

**Decisione CTO:** `[ ] Opzione A — no FK (seguire pattern 033)` `[ ] Opzione B — FK ON DELETE RESTRICT` `[ ] Opzione C — altro (specificare)`

---

### [TODO-CTO-02] `UNIQUE NULLS NOT DISTINCT` su `partner_scans` — Postgres 15+

**Location nel file:** `partner_scans`, linea ~862, commento `TODO-CTO-02`

**Contesto:**  
La sintassi `UNIQUE NULLS NOT DISTINCT (partner_id, link_id, event_ref, scan_date)` è stata introdotta in PostgreSQL 15. Prima di PostgreSQL 15, i NULL venivano sempre trattati come distinti nelle UNIQUE constraint (cioè due righe con `partner_id = NULL` non venivano mai considerate duplicate, anche se avevano gli stessi altri valori).

```sql
-- In 034 attuale:
CONSTRAINT uq_partner_scan_daily
  UNIQUE NULLS NOT DISTINCT (partner_id, link_id, event_ref, scan_date)
```

**Impatto:** Se Supabase non usa Postgres 15+, questa sintassi fallisce silenziosamente o esplicitamente al momento dell'apply.

**Alternativa Postgres <15:**
```sql
-- Partial unique index con COALESCE (standard):
CREATE UNIQUE INDEX uq_partner_scan_daily
  ON kora_link.partner_scans (
    COALESCE(partner_id::text, ''),
    COALESCE(link_id::text, ''),
    COALESCE(event_ref, ''),
    COALESCE(scan_date::text, '')
  );
-- Nota: cambio semantica — la gestione dei NULL va verificata
```

**Domanda per il CTO:**
1. Qual è la versione di PostgreSQL dell'istanza Supabase (staging + production)?
2. Se < Postgres 15: sostituire con alternative compatibili o eliminare la constraint di idempotenza su `partner_scans`?
3. Nota: `partner_scans` è già placeholder per v1.1+ — la constraint può essere posticipata se la tabella non viene usata in v1.

**Decisione CTO:** `[ ] Postgres 15+ confermato — sintassi OK` `[ ] Postgres < 15 — da sostituire con alternativa` `[ ] Rimandare (partner_scans è placeholder v1.1+)`

---

### [TODO-CTO-03] Colonna `GENERATED ALWAYS AS` su `partner_scans.scan_date`

**Location nel file:** `partner_scans`, linea ~843, commento `TODO-CTO-03`

**Contesto:**  
```sql
scan_date  date  NOT NULL GENERATED ALWAYS AS (occurred_at::date) STORED,
```

Una colonna generata `STORED` da un `timestamptz` a `date`. Questa feature è standard Postgres 12+ (colonne generate per stored), ma il cast `timestamptz::date` richiede una considerazione sul timezone: `occurred_at::date` usa il timezone della sessione, che in Supabase potrebbe essere UTC di default ma non garantito.

**Problema potenziale:**  
Il cast `timestamptz::date` è timezone-aware solo nel contesto della sessione corrente. Se la sessione ha `TimeZone = UTC` (default Supabase), `2026-07-01 23:00:00+02` diventerebbe `2026-07-01` (UTC) invece di `2026-07-02` (CEST), creando incoerenze per partner in timezone europee.

**Alternative:**
```sql
-- Opzione A: AT TIME ZONE esplicito (ma GENERATED AS non supporta funzioni non-immutable in Postgres)
-- Opzione B: Popolare scan_date a livello applicativo, non come colonna generata
-- Opzione C: Usare solo occurred_at per le query, senza colonna generata
```

**Domanda per il CTO:**
1. Confermare compatibilità Supabase per `GENERATED ALWAYS AS ... STORED` su `timestamptz → date`.
2. Confermare comportamento timezone atteso per l'idempotency key: UTC-based o Europe/Rome?
3. Se applicativo invece di generato: rimuovere `GENERATED ALWAYS AS` e popolare `scan_date` a livello application.

**Decisione CTO:** `[ ] Colonna generata confermata (UTC base accettabile)` `[ ] Colonna generata confermata (con AT TIME ZONE esplicito, se possibile)` `[ ] Sostituire con colonna applicativa (rimozione GENERATED AS)`

---

### [TODO-CTO-04] TTL Token — Enforcement via pg_cron vs Application Layer

**Location nel file:** `kora_link.links.pre_activation_expires_at`, commento `TODO-CTO-04`

**Contesto:**  
I token non attivati hanno un TTL di 180 giorni (`pre_activation_expires_at = created_at + INTERVAL '180 days'`). Il file non implementa un meccanismo di enforcement automatico: la scadenza è checked a livello applicativo (route + future `fn_kora_link_public_lookup`).

**Problema:** Senza un job periodico, i token scaduti rimangono con `status = 'generated'/'assigned_to_tenant'/'delivered'` invece di `'expired'`. Ciò non è un rischio di sicurezza (la check applicativa usa `pre_activation_expires_at`, non `status`), ma introduce inconsistenza nello stato del DB e complica le query di aggregazione.

**Opzioni:**

| Opzione | Pro | Contro |
|---------|-----|--------|
| Application-only check (attuale) | Nessuna infra aggiuntiva | Inconsistenza `status` nel DB; query di aggregazione complesse |
| `pg_cron` batch job (es. ogni notte) | Consistenza DB; query semplici | Dipendenza da `pg_cron` extension (disponibile in Supabase Pro) |
| Supabase Edge Function schedulata | Portable; no `pg_cron` | Latenza e costo aggiuntivo |
| Lazy TTL check + background batch | Compromesso | Più codice applicativo |

**Domanda per il CTO:**
1. Preferenza architetturale: enforcement TTL a livello DB (pg_cron) o applicativo?
2. `pg_cron` è abilitato/abilitabile nell'istanza Supabase?
3. Per v1 (foundation light): acceptable avere inconsistenza `status` sul DB se la check applicativa è corretta?

**Decisione CTO:** `[ ] Application-only check accettabile per v1` `[ ] pg_cron job (definire query batch)` `[ ] Supabase Edge Function schedulata` `[ ] Altro`

---

### [TODO-CTO-05] Retention `audit_log` — pg_cron / Background Job

**Location nel file:** `kora_link.audit_log`, commento `TODO-CTO-05`, `[RLS-035-AUDIT]`

**Contesto:**  
`audit_log` è append-only e crescerà indefinitamente senza una retention policy. Ogni evento KORA Link significativo genera una riga. Per un'installazione con centinaia di worker e decine di scansioni giornaliere, la tabella può crescere di migliaia di righe al mese.

La retention policy deve essere definita con il DPO (Gate 3), ma il meccanismo tecnico deve essere scelto ora (Gate 2).

**Opzioni:**

| Opzione | Impatto volume | Complessità |
|---------|---------------|-------------|
| Nessuna retention (audit permanente) | Crescita illimitata | Minima |
| pg_cron `DELETE WHERE created_at < now() - INTERVAL 'N years'` | Controllato | Bassa — se pg_cron disponibile |
| Partitioning mensile + `DROP PARTITION` | Alto volume | Alta |
| Supabase Storage archivio esterno | Archivio GDPR-compliant | Media |

**Domanda per il CTO:**
1. Meccanismo tecnico preferito per la retention? (La durata è Gate 3/DPO)
2. Partitioning per `audit_log`: necessario per v1 o posticipabile a v2?
3. `pg_cron` già valutato per TODO-CTO-04: stessa risposta si applica qui?

**Decisione CTO:** `[ ] Nessuna retention in v1 (DPO da consultare in Gate 3)` `[ ] pg_cron definita insieme alla DPO (Gate 3)` `[ ] Partitioning mensile (v2+)` `[ ] Archivio esterno`

---

### [TODO-CTO-06] Retention `public_lookup_attempts` — Partitioning / Aggressive Cleanup

**Location nel file:** `kora_link.public_lookup_attempts`, commento `TODO-CTO-06`, `[RETENTION-034-1]`

**Contesto:**  
`public_lookup_attempts` è il log più ad alto volume: ogni scansione NFC (anche invalida, anche rate-limited) genera una riga. Con rate limiting su Upstash, questa tabella è in parte ridondante come contatore (Upstash gestisce i contatori), ma serve per anomaly detection e audit DPO.

Una stima conservativa: 10 scansioni/ora per chip × 100 chip = 1000 righe/ora → 720K righe/mese per un'installazione media.

**Il file raccomanda:** retention 7–30 giorni, partitioning mensile se il volume lo giustifica.

**Domanda per il CTO:**
1. `public_lookup_attempts` è necessaria se Upstash gestisce già il rate limiting? Scopo residuo: anomaly detection, DPO audit. Decisione: mantenere o rimuovere da v1?
2. Se mantenuta: retention 7 giorni, 30 giorni, o altro? Partitioning da subito o posticipato?
3. Meccanismo di cleanup: stesso del `audit_log` (pg_cron/Edge Function)?

**Decisione CTO:** `[ ] Mantenere — retention 7 giorni (pg_cron)` `[ ] Mantenere — retention 30 giorni` `[ ] Rimuovere da v1 (Upstash è sufficiente per rate limit; anomaly detection posticipata)` `[ ] Posticipare decisione a staging test`

---

### [TODO-CTO-07] Token Version Migration — Procedura per Secret Rotation

**Location nel file:** commento `TODO-CTO-07` in sezione OPEN TODOS

**Contesto:**  
Il campo `token_digest = HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET)` è l'unico identificativo del token nel DB. Se `KORA_LINK_TOKEN_SECRET` viene ruotato (es. per compromissione, audit, policy annuale), tutti i token esistenti hanno un digest calcolato con il vecchio segreto.

**Problema:** Dopo la rotazione, `computeDigest(token_value, newSecret) !== token_digest_stored`. Tutti i token esistenti smettono di funzionare immediatamente.

**Il campo `token_version`** (già presente in `kora_link.links.token_version`) è stato progettato per supportare questa migrazione, ma la procedura non è ancora definita.

**Procedura dual-digest (bozza):**
```
1. Introdurre nuovo secret (versione 2)
2. Aggiungere colonna `token_digest_v2` alla tabella links (o creare tabella separata)
3. Batch: per ogni token con assignment attivo → ricompute digest con nuovo secret
   (richiede accesso temporaneo al token cleartext — MA il cleartext non è mai stato
    persistito, solo fisicamente sul chip NFC. Come si ottiene?)
4. Switch: dopo N giorni, il lookup usa solo token_digest_v2; rimuovere token_digest_v1
5. Revocare tutti i token che non hanno potuto essere migrati (chip persi)
```

**Problema fondamentale:** Il cleartext del token (il valore `kl1_...` stampato/inciso sul chip NFC) non è mai persistito nel DB. La ricomputazione del digest richiede che i chip vengano "re-scansiti" dai worker, o che KORA abbia un altro modo di accedere al token_value (es. log di generazione conservato separatamente). Questo non è attualmente definito.

**Domanda per il CTO:**
1. È necessaria una procedura di secret rotation per v1, o il segreto è considerato immutable per Foundation Light?
2. Se la rotazione è necessaria: come si ottiene il cleartext dei token già emessi per la ricomputazione del digest? (Il DB non lo ha; il chip lo ha; il worker è l'unico che può ri-scansire)
3. Alternativa: revocare automaticamente tutti i token non migrati dopo la rotazione, richiedendo ri-attivazione da parte dei worker?

**Decisione CTO:** `[ ] Secret rotation non necessaria in v1 (segreto immutable per Foundation Light)` `[ ] Secret rotation via re-scan worker (tutti i chip ri-scansiti)` `[ ] Secret rotation via revoca massiva + re-emissione` `[ ] Definire procedura separata pre-production`

---

### [TODO-CTO-08] Deferred Self-FK su `kora_link.links.replaced_by_link_id`

**Location nel file:** `kora_link.links`, linea ~263

**Contesto:**  
```sql
ALTER TABLE kora_link.links
  ADD CONSTRAINT fk_links_replaced_by
  FOREIGN KEY (replaced_by_link_id) REFERENCES kora_link.links (id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
```

Self-FK differita: un token può puntare al suo successore (token di rimpiazzo) tramite `replaced_by_link_id`. La FK è DEFERRABLE per evitare problemi di ordine di insert in transazioni che creano entrambi (vecchio e nuovo token) atomicamente.

**Comportamento in Supabase:**  
`DEFERRABLE INITIALLY DEFERRED` è standard PostgreSQL, ma Supabase usa un connection pooler (pgBouncer o Supavisor) che può avere comportamenti specifici con le transazioni differite, in particolare in modalità `transaction` pooling (dove `SET CONSTRAINTS DEFERRED` non persiste oltre la singola transazione, ma `INITIALLY DEFERRED` dovrebbe funzionare correttamente).

**Domanda per il CTO:**
1. Confermare che `DEFERRABLE INITIALLY DEFERRED` funziona correttamente con il connection pooler di Supabase in production.
2. Verificare: la sostituzione token avviene sempre in una singola transazione? Se sì, la self-FK differita è necessaria. Se vecchio e nuovo token vengono creati in transazioni separate, la self-FK non causa problemi (si può aggiornare `replaced_by_link_id` dopo che il nuovo token esiste).
3. Alternativa senza self-FK: usare `link_replacements.new_link_id` come unica fonte di verità per la catena di sostituzione, rimuovere `replaced_by_link_id` da `kora_link.links`.

**Decisione CTO:** `[ ] Confermare DEFERRABLE INITIALLY DEFERRED compatibile con Supabase pooler` `[ ] Rimuovere self-FK e usare solo link_replacements.new_link_id` `[ ] Testare in staging dry-run e verificare`

---

## 5. Domande Non Bloccanti (CTO) — Review Consigliata

Questi punti non bloccano la promozione di 034, ma il CTO dovrebbe esprimere una preferenza o confermare la scelta attuale.

---

### [NB-01] Indice ridondante `idx_links_token_digest` vs `UNIQUE CONSTRAINT uq_link_token_digest`

**Location:** `kora_link.links`, linee ~277–278

**Contesto:**
```sql
CONSTRAINT uq_link_token_digest UNIQUE (token_digest)
-- ...
CREATE INDEX IF NOT EXISTS idx_links_token_digest ON kora_link.links (token_digest);
```

PostgreSQL crea automaticamente un btree index quando si definisce una UNIQUE constraint. L'indice esplicito `idx_links_token_digest` è quindi ridondante per le query di lookup. Il commento nel file lo giustifica: "for clarity and to support INCLUDE if needed in future."

**Raccomandazione:** Rimuovere l'indice esplicito per pulizia. Se in futuro serve un `INCLUDE`, aggiungere come migration separata. Alternativa: lasciare con commento chiaro.

**Decisione CTO:** `[ ] Rimuovere idx_links_token_digest (il UNIQUE constraint è sufficiente)` `[ ] Mantenere per chiarezza (commentato)` `[ ] Convertire in INCLUDE index quando serve`

---

### [NB-02] Scope `link_delivery_records` — v1 o v1.1+?

**Location:** Tabella 11, `kora_link.link_delivery_records`

**Contesto:**  
La tabella traccia la consegna fisica dei chip dalla produzione all'azienda, senza associare chip a worker. Il campo `delivered_to_label` è non-identificativo (es. "HR Manager", non worker_id).

**Domanda:** Questa tabella è necessaria per Foundation Light v1, o è operativamente rilevante solo quando KORA gestirà la logistica fisica a scala?

**Decisione CTO:** `[ ] Necessaria in v1 (operativa per il pilot)` `[ ] Posticipare a v1.1+ (rimuovere da 034 v1, aggiungere in migration separata)` `[ ] Mantenere come placeholder vuoto`

---

### [NB-03] `public_lookup_attempts` vs Upstash per Rate Limiting

Vedi anche TODO-CTO-06. Il punto non bloccante aggiuntivo è:

**Contesto:** Se l'Upstash rate limiter è il meccanismo operativo per rate limiting (con sliding window e contatori Redis), `public_lookup_attempts` è una seconda copia degli stessi dati a scopo di audit e anomaly detection. Per Foundation Light v1 (pochi pilot, controllati), questo overhead di scrittura può essere ingiustificato.

**Decisione CTO:** `[ ] Mantenere entrambi (Upstash per enforcement, DB per audit)` `[ ] Solo Upstash in v1 (DB anomaly detection è v1.1+)` `[ ] Decidere in staging dopo aver misurato il volume`

---

### [NB-04] `link_consents` — Mancanza di trigger `updated_at`

**Location:** `kora_link.link_consents` — nessun trigger `updated_at`

**Contesto:**  
Delle 11 tabelle, solo `link_batches` e `links` hanno il trigger `trg_*_updated_at`. `link_assignments` ha il trigger. `link_consents` non ce l'ha, anche se ha una colonna `status` mutabile (da `pending` a `accepted`/`withdrawn`/`superseded`).

**Domanda:** È intenzionale? Un consent che viene aggiornato (es. da `pending` a `accepted`) non aggiorna un timestamp. Potrebbe creare confusione in debugging.

**Decisione CTO:** `[ ] Intenzionale — il timestamp si legge da accepted_at/withdrawn_at` `[ ] Aggiungere trigger updated_at a link_consents` `[ ] Non urgente — da aggiungere in 034 prima dell'apply`

---

### [NB-05] `partner_scans` — Scope v1 o Rimozione da 034

**Contesto:**  
`partner_scans` è esplicitamente un "structural placeholder for future Track A partner scan events (v1.1+)." Il commento include "NO automatic IU/PIB/Index scoring — Track A scoring requires v2."

**Domanda:** Ha senso includere questa tabella in 034 se non viene usata in v1, o è preferibile crearla in una migration separata (es. 036) quando Track A sarà in scope?

**Pro mantenere in 034:** Schema `kora_link` completo da subito; nessuna migration aggiuntiva necessaria per v1.1.  
**Pro rimuovere:** 034 più piccolo e più semplice da revieware e testare; riduce la superficie di TODO non risolti (FK-034-7, TODO-CTO-02, TODO-CTO-03 sono tutti legati a `partner_scans`).

**Decisione CTO:** `[ ] Mantenere in 034 come placeholder` `[ ] Rimuovere da 034 e aggiungere in 036 quando Track A è in scope`

---

## 6. Privacy Review Checklist

Da completare congiuntamente con il DPO (Gate 3). Il CTO deve confermare che i meccanismi tecnici sono implementabili prima che il DPO approvi il testo.

| # | Invariante Privacy | Status 034 | Azione richiesta |
|---|--------------------|-----------|-----------------|
| P-01 | Nessuna colonna `token_value` cleartext | ✅ Confermato — query post-apply verifica `0 rows` | Verificare dopo apply |
| P-02 | Nessuna colonna `nfc_url` | ✅ Confermato | Verificare dopo apply |
| P-03 | `link_assignments` mai visibile a ruoli company | ✅ By design — RLS 035 deve implementare | Implementare in 035 |
| P-04 | `partner_scans.worker_id` mai esposto al partner | ✅ By design — RLS 035 deve implementare | Implementare in 035 |
| P-05 | `audit_log.request_fingerprint` — hash IP, non raw IP | ✅ Campo nullable — TODO DPO-034-1 | Gate 3: DPO conferma strategia hashing |
| P-06 | `public_lookup_attempts.request_fingerprint` — hash IP | ✅ Campo nullable — TODO DPO-034-2 | Gate 3: DPO conferma |
| P-07 | `metadata JSONB` — nessun token cleartext né PII | ✅ Documented in COMMENTs — enforced by app | Gate 4: validazione applicativa da implementare |
| P-08 | `link_consents` — `consent_version` referenzia testo DPO-approvato | ✅ Campo presente — contenuto da approvare | Gate 3: DPO approva testo notice + versione |
| P-09 | `delivered_to_label` — mai worker_id/nome, solo label ruolo | ✅ Documented in COMMENT | Applicare a livello applicativo |
| P-10 | `PIB` mai derivabile da dati in schema `kora_link` | ✅ Nessuna colonna IU/PIB/scoring | Confermato architetturalmente |
| P-11 | Dati `kora_link` mai usati per scoring KORA Index in v1 | ✅ Esplicito per `partner_scans` e `link_events` | Confermato — v2+ con methodology review |
| P-12 | Worker controllo del proprio consent (revoca autonoma) | ✅ Modello presente in `link_consents.status = withdrawn` | Gate 3: DPO + Gate 7: implementazione flow |
| P-13 | `audit_log` retention policy | ⚠️ Non definita — dipende da Gate 3/DPO | Gate 3: DPO definisce durata; Gate 2: CTO definisce meccanismo |
| P-14 | `public_lookup_attempts` minimizzazione dati | ✅ Nessun `worker_id`, `tenant_id`, `actor_id` | Confermato by design |

---

## 7. Security Review Checklist

| # | Controllo Sicurezza | Status 034 | Azione richiesta |
|---|---------------------|-----------|-----------------|
| S-01 | `UNIQUE(token_digest)` — impossibile due chip con stesso digest | ✅ `CONSTRAINT uq_link_token_digest UNIQUE` | Verificare dopo apply |
| S-02 | `token_version` presente — supporta dual-digest per key rotation | ✅ Campo `token_version integer DEFAULT 1` | Definire procedura (TODO-CTO-07) |
| S-03 | `uq_assignment_link_active` — un solo token attivo per worker | ✅ `UNIQUE INDEX WHERE status = 'active'` | Verificare dopo apply |
| S-04 | `ON DELETE RESTRICT` su FK critici — no cascade delete | ✅ `batch_id REFERENCES ... ON DELETE RESTRICT` | Confermato |
| S-05 | Self-FK `replaced_by_link_id DEFERRABLE INITIALLY DEFERRED` | ⚠️ Comportamento Supabase da verificare | TODO-CTO-08 |
| S-06 | RLS deny-by-default su tutto `kora_link.*` | ⚠️ NOT IN 034 — rimandato a 035 | Gate 4: 035 obbligatorio prima di apply |
| S-07 | SECURITY DEFINER per `fn_kora_link_public_lookup` | ⚠️ NOT IN 034 — rimandato a 035 | Gate 4 |
| S-08 | INSERT-only su `audit_log` via RLS | ⚠️ NOT IN 034 — rimandato a 035 | Gate 4 |
| S-09 | `kora_link.links` non accessibile direttamente da anon/authenticated | ⚠️ NOT IN 034 — rimandato a 035 | Gate 4 |
| S-10 | `link_consents.uq_link_consent` — no duplicate consent per (worker, link, version) | ✅ `CONSTRAINT uq_link_consent UNIQUE (worker_id, link_id, consent_version)` | Verificare dopo apply |
| S-11 | `link_replacements.uq_replacement_old_link` — un solo successore per token | ✅ `CONSTRAINT uq_replacement_old_link UNIQUE (old_link_id)` | Verificare dopo apply |
| S-12 | `chk_replacement_distinct` — token non può sostituire se stesso | ✅ `CHECK (old_link_id <> new_link_id)` | Verificare dopo apply |
| S-13 | Nessun trigger `AFTER INSERT` che espone dati a ruoli non autorizzati | ✅ Solo `set_updated_at()` trigger — no side effects | Confermato |
| S-14 | `audit_log.link_id` — no FK (audit sopravvive a cancellazione token) | ✅ Commentato: "audit log must survive token deletion" | Confermato intenzionale |
| S-15 | `rollback = DROP SCHEMA kora_link CASCADE` — richede approvazione CTO | ✅ Documentato nel file header | Non eseguire senza CTO sign-off |

---

## 8. RLS 035 — Dependency Map

`035_kora_link_rls.sql` non è stato ancora redatto. Lo schema 034 deve essere stabilizzato prima di scrivere 035. La sezione `[RLS-035]` in fondo al file 034 specifica le policy previste.

### Policy richieste per tabella

| Tabella | Policy RLS (spec in 034) | Note critiche |
|---------|--------------------------|--------------|
| `link_batches` | KORA_ADMIN: SELECT/INSERT/UPDATE; COMPANY_ADMIN: solo aggregate view (non tabella diretta) | Priorità alta |
| `links` | KORA_ADMIN: SELECT/INSERT/UPDATE; altri: NESSUN ACCESSO DIRETTO — solo via SECURITY DEFINER | **Critica — token_digest non deve essere accessibile da anon/auth** |
| `link_assignments` | KORA_ADMIN: SELECT; WORKER: SELECT WHERE worker_id = self; COMPANY_ADMIN: ZERO TOLLERANZA | **Più sensibile — mappa token↔worker** |
| `link_consents` | KORA_ADMIN: SELECT; WORKER: SELECT+INSERT WHERE worker_id = self | Alta |
| `link_events` | KORA_ADMIN: SELECT; WORKER: SELECT WHERE worker_id = self; COMPANY_ADMIN: NO accesso individuale | Media |
| `revocations` | KORA_ADMIN: SELECT/INSERT; WORKER: INSERT (solo proprio); altri: deny | Media |
| `link_replacements` | KORA_ADMIN: SELECT/INSERT; altri: deny | Media |
| `partner_scans` | KORA_ADMIN: SELECT; PARTNER: SELECT WHERE partner_id = self; COMPANY_ADMIN: NO | v1.1+ |
| `audit_log` | KORA_ADMIN: SELECT; INSERT-only via SECURITY DEFINER; no UPDATE, no DELETE | Alta — append-only enforced |
| `public_lookup_attempts` | KORA_ADMIN: SELECT; INSERT solo via SECURITY DEFINER/service_role | Alta |
| `link_delivery_records` | KORA_ADMIN: SELECT/INSERT; COMPANY_ADMIN: SELECT WHERE tenant_id = self | Se inclusa in v1 |

### SECURITY DEFINER functions richieste

| Funzione | Scopo | Priorità |
|----------|-------|----------|
| `fn_kora_link_public_lookup(p_token_digest text)` | Lookup pubblico: token_digest → link record (status, TTL). Usata dalla route `/link/[token]`. Mai espone worker_id | **Bloccante per KL-13+** |
| `fn_kora_link_activate(p_token_digest text, p_worker_id uuid, p_consent_version text)` | Crea atomicamente `link_assignments` + `link_consents`. Valida tenant match. | Bloccante per worker activation |

### Vista aggregata Company (da creare in 035)

```sql
-- Spec da 034 sezione RLS-035-M
CREATE VIEW kora_link.v_batch_stats AS
SELECT tenant_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE status = 'activation_pending') AS pending_count,
  COUNT(*) FILTER (WHERE status IN ('revoked','replaced','expired')) AS inactive_count,
  COUNT(*) AS total_count
FROM kora_link.links
GROUP BY tenant_id;
-- RLS su questa view: tenant_id = kora.tenant_id() per COMPANY_ADMIN/COMPANY_VIEWER
-- NEVER espone link_id, worker_id, token_digest, o timestamp individuali
```

### Prerequisiti per scrivere 035

```
✓ TODO-CTO-01 risolto (FK targets — impatto su RLS per worker_id lookup)
✓ TODO-CTO-08 risolto (self-FK deferrable — impatto su test transazionali in 035)
✓ Tabelle 034 stabilizzate (nessuna ulteriore rimozione/aggiunta)
✓ CTO approva schema 034 finale
✓ DPO conferma: consent model ok (Gate 3 avanzato)
```

### Blocco Gate 4

Gate 4 (RLS 035) non può iniziare prima che Gate 2 sia sostanzialmente avanzato. L'ordine raccomandato:

```
Gate 2 CTO sign-off → 034 in migrations/ → iniziare 035 draft → Gate 4 review → apply staging
```

---

## 9. Istruzioni per il Reviewer

### Per il CTO / Postgres Specialist

1. Leggere il file in sola lettura: `supabase/proposed/034_kora_link_schema.sql`
2. Rispondere alle 8 domande bloccanti nella Sezione 4 (TODO-CTO-01 → TODO-CTO-08)
3. Rispondere alle 5 domande non bloccanti nella Sezione 5 (NB-01 → NB-05) — opzionale ma raccomandato
4. Compilare il Decision Template (Sezione 10)
5. Se sign-off positivo: confermare la promozione in `supabase/migrations/` con il team Engineering
6. Non applicare il file prima di ricevere anche Gate 3 (DPO) e di aver redatto Gate 4 (RLS 035)

### Per il DBA / Postgres Specialist (se separato dal CTO)

Focus su:
- TODO-CTO-02 (`UNIQUE NULLS NOT DISTINCT` — Postgres version check)
- TODO-CTO-03 (`GENERATED ALWAYS AS` — timezone behavior)
- TODO-CTO-08 (`DEFERRABLE INITIALLY DEFERRED` — Supabase pooler)
- NB-01 (indice ridondante)
- Verifica trigger `set_updated_at()` dipendenza da migration 001 (esiste?)
- Verifica `kora.kora_role()` e `kora.tenant_id()` dipendenze da migration 006 (esistono?)

### Verifica dipendenze prima dell'apply

```sql
-- 1. set_updated_at() esiste?
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'set_updated_at';

-- 2. kora.kora_role() esiste?
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'kora' AND routine_name = 'kora_role';

-- 3. kora.tenant_id() esiste?
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'kora' AND routine_name = 'tenant_id';

-- 4. Migrations 001-033 applicate?
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;
```

### Verifica post-apply (da eseguire manualmente — NON automatizzata)

```sql
-- 1. Schema creato
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'kora_link';

-- 2. 11 tabelle create
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'kora_link' ORDER BY table_name;
-- Expected: audit_log, link_assignments, link_batches, link_consents,
--           link_delivery_records, link_events, link_replacements,
--           links, partner_scans, public_lookup_attempts, revocations

-- 3. NESSUNA colonna token_value — invariante costituzionale
SELECT column_name, table_name FROM information_schema.columns
WHERE table_schema = 'kora_link' AND column_name = 'token_value';
-- Expected: 0 rows

-- 4. UNIQUE(token_digest) presente
SELECT indexname FROM pg_indexes
WHERE tablename = 'links' AND schemaname = 'kora_link'
  AND indexname = 'uq_link_token_digest';

-- 5. Partial unique index link_assignments (un solo attivo per link)
SELECT indexname FROM pg_indexes
WHERE tablename = 'link_assignments' AND schemaname = 'kora_link'
  AND indexname = 'uq_assignment_link_active';

-- 6. Triggers presenti
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_schema = 'kora_link' ORDER BY event_object_table;

-- 7. RLS NON attivato (deve essere OFF in 034 — ON solo dopo 035)
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'kora_link' AND rowsecurity = true;
-- Expected: 0 rows (RLS è in 035, non in 034)
```

---

## 10. Decision Template

Da compilare dal CTO dopo la review. Conservare in `docs/` o nel canale di approvazione designato.

```
KORA Link 034 Schema — CTO Review Decision
==========================================
Data: ____________
Reviewer: ____________
File: supabase/proposed/034_kora_link_schema.sql
Commit HEAD al momento della review: ____________

TODO-CTO-01 (FK targets):
  Decisione: [ ] Opzione A (no FK) [ ] Opzione B (FK ON DELETE RESTRICT) [ ] Altro: ____
  FK targets confermati: tenant_id → ________________  worker_id → ________________

TODO-CTO-02 (UNIQUE NULLS NOT DISTINCT):
  Versione PostgreSQL Supabase: ________
  Decisione: [ ] OK Postgres 15+ [ ] Sostituire con alternativa [ ] Rimandare (partner_scans v1.1+)

TODO-CTO-03 (GENERATED ALWAYS AS scan_date):
  Comportamento timezone confermato: [ ] UTC base OK [ ] Sostituire con colonna applicativa
  
TODO-CTO-04 (Token TTL enforcement):
  Decisione: [ ] Application-only OK per v1 [ ] pg_cron [ ] Edge Function [ ] Altro: ____

TODO-CTO-05 (audit_log retention):
  Meccanismo: [ ] Nessuno in v1 [ ] pg_cron [ ] Partitioning [ ] Archivio esterno
  Durata (da DPO): ________

TODO-CTO-06 (public_lookup_attempts retention):
  Decisione: [ ] Mantenere (retention ____ giorni) [ ] Rimuovere da v1 [ ] Decidere in staging

TODO-CTO-07 (Secret rotation procedure):
  Decisione: [ ] Non necessaria v1 [ ] Procedura via re-scan [ ] Revoca massiva + re-emissione
  Note: ________________________________

TODO-CTO-08 (Deferred self-FK):
  Decisione: [ ] Confermato compatibile Supabase [ ] Rimuovere self-FK [ ] Testare staging

DECISION FINALE:
  [ ] ✅ APPROVED — 034 può essere promosso in supabase/migrations/ dopo Gate 3+4
  [ ] ⚠️ APPROVED WITH CONDITIONS — promuovere dopo aver risolto: ____________________
  [ ] 🔴 BLOCKED — blockers da risolvere prima di qualsiasi altra azione: ______________

Firma CTO: ________________________________
Data firma: ________________________________
```

---

## 11. Recommended Outcome

### Stato attuale

```
Gate 1 (Runtime base)     → ✅ COMPLETE (KL-01–KL-10)
Gate 2 (Schema 034)       → 🔴 OPEN — questo checklist è il passo KL-12
Gate 3 (DPO/Legal)        → 🔴 OPEN — può avanzare in parallelo a Gate 2
Gate 4 (RLS 035)          → 🔴 OPEN — dipende da Gate 2 stabilizzato
```

### Percorso raccomandato

**KL-12 (questo documento)** → CTO review di 034 → decisioni documentate

**KL-13** → Redazione `supabase/proposed/035_kora_link_rls.sql` (dopo Gate 2 avanzato)  
→ RLS deny-by-default, SECURITY DEFINER `fn_kora_link_public_lookup`, vista aggregata company

**KL-14** → RLS negative test plan — verifica che employer non veda mai dati individuali  
→ Verifica che `link_assignments` non sia accessibile da `company_admin` in nessun path

**KL-15** → Promozione `034` + `035` da `proposed/` → `supabase/migrations/`  
→ Solo dopo: CTO sign-off Gate 2 + DPO avanzamento Gate 3 + review Gate 4

### Ipotesi sulla durata di Gate 2

Con le 8 decisioni documentate in questo checklist, il CTO può fare la review in una sessione di 60–90 minuti se ha accesso all'ambiente Supabase per verificare la versione PostgreSQL e il comportamento del connection pooler.

Le domande che richiedono più tempo:
- TODO-CTO-07 (secret rotation) richiede una decisione di policy, non solo tecnica
- TODO-CTO-01 (FK targets) richiede conferma della stabilità degli schema target

Le domande risolvibili immediatamente:
- TODO-CTO-02 (`SELECT version()` nell'istanza Supabase — 30 secondi)
- TODO-CTO-08 (test con transazione differita in staging — 10 minuti)

### Blocco assoluto

**Nessuna delle seguenti azioni deve avvenire prima di Gate 2 + Gate 4 chiusi:**

```
✗ supabase db push di 034
✗ supabase migration up di 034
✗ Applicare 034 a staging o production
✗ Scrivere codice che fa query a kora_link.* via Supabase client
✗ Scrivere codice che usa service_role su kora_link.*
✗ Implementare fn_kora_link_public_lookup senza RLS 035 applicata
```

---

*KORA_LINK_034_CTO_REVIEW_CHECKLIST.md — KL-12 · 2026-07-01*  
*Branch: feat/kora-link-v1-platform*  
*Analisi in sola lettura di supabase/proposed/034_kora_link_schema.sql*  
*Nessun codice runtime modificato · Nessuna migration creata · Nessun SQL eseguito*

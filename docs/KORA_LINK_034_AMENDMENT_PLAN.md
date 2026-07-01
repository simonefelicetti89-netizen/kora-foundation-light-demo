# KORA Link — 034 Amendment Plan

**KL-14 — Piano di Modifica per `supabase/proposed/034_kora_link_schema.sql`**

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Commit HEAD:** `91553b9` (KL-13)  
**Scopo:** Tradurre le raccomandazioni KL-13 in un piano operativo di modifica per 034. Nessun SQL modificato in questo documento. Nessuna migration creata.

---

## 1. Executive Summary

Questo documento **non modifica alcun file SQL**. È un piano pre-redline: specifica cosa dovrebbe cambiare in `supabase/proposed/034_kora_link_schema.sql` se il CTO/Postgres reviewer approva le raccomandazioni KL-13.

034 resta in `supabase/proposed/` — non è stata applicata ad alcun database. RLS 035 resta bloccata. Nessuna migration è stata creata. Nessuna modifica deve essere applicata a 034 senza approvazione esplicita CTO/Postgres.

I 12 amendment proposti (A-01→A-12) sono ordinati per impatto su 035 e sulla promozione. Tre modifiche ad alta priorità (A-06, A-08, A-12) potrebbero ridurre il set di tabelle da 11 a 8, semplificando sia 034 che la futura 035. Queste modifiche richiedono tutte conferma CTO prima di essere apportate al file.

Nessuna modifica viene applicata ora. Il documento è input per il reviewer.

---

## 2. Amendment Overview

| ID | Decisione KL-13 | Modifica proposta | Tipo | Rischio | Blocca 035 | Blocca promotion |
|----|----------------|-------------------|------|---------|-----------|-----------------|
| A-01 | D-01 FK policy | Mantenere UUID senza FK; aggiungere commenti con target canonici | keep + comment | Basso | Sì (impatta lookup design) | No |
| A-02 | D-02 PG compat | Sostituire `UNIQUE NULLS NOT DISTINCT` con partial index compatibile | simplify | Medio | No | Sì (syntax error su PG<15) |
| A-03 | D-03 scan_date | Rimuovere colonna `GENERATED ALWAYS AS scan_date` o spostare `partner_scans` | remove / defer | Basso-Medio | No | Sì (comportamento timezone non deterministico) |
| A-04 | D-04 TTL | Mantenere `pre_activation_expires_at`; aggiungere commento enforcement app-layer | keep + comment | Basso | No | No |
| A-05 | D-05 audit_log | Mantenere `audit_log`; aggiungere commento retention DPO-external | keep + comment | Basso | No | No (blocca production, non promotion) |
| A-06 | D-06 remove | Rimuovere `public_lookup_attempts` e relativi indici da 034 v1 | remove | Basso | No | No |
| A-07 | D-07 secret | Aggiungere commento stable-secret policy v1; no `key_version` in 034 | comment | Basso | No | No |
| A-08 | D-08 self-FK | Rimuovere `replaced_by_link_id` e `fk_links_replaced_by` da `kora_link.links` | remove / simplify | Basso | No | No |
| A-09 | NB-01 index | Rimuovere `idx_links_token_digest` (ridondante con `UNIQUE CONSTRAINT`) | remove | Basso | No | No |
| A-10 | NB-02 delivery | Valutare deferral di `link_delivery_records` a v1.1+ | defer | Basso | No | No |
| A-11 | NB-04 consent | Chiarire se `link_consents` è append-only; aggiungere commento o trigger | comment / add trigger | Basso | No | No |
| A-12 | NB-05 partner | Spostare `partner_scans` in migration separata (036) | defer | Basso | No | Sì (rimuove TODO-CTO-02, 03) |

---

## 3. A-01 — FK Policy v1: No Foreign Keys

### Contesto

Le seguenti colonne in 034 sono UUID senza FK esplicita (o con FK pendente da conferma):

| Colonna | Tabella | Target canonico documentato | FK in 034? |
|---------|---------|----------------------------|------------|
| `tenant_id` | `link_batches` | `analytics.tenant(id)` | No |
| `worker_id` | `link_assignments` | `personal.worker_identity(id)` | No — TODO FK-034-2 |
| `worker_id` | `link_consents` | `personal.worker_identity(id)` | No — TODO FK-034-3 |
| `worker_id` | `link_events` | `personal.worker_identity(id)` | No — TODO FK-034-4 |
| `worker_id` | `revocations` | `personal.worker_identity(id)` | No — TODO FK-034-5 |
| `worker_id` | `link_replacements` | `personal.worker_identity(id)` | No — TODO FK-034-6 |

Colonne con FK già definita in 034 (nessun cambiamento):
- `link_batches.created_by` → `auth.users(id)` ON DELETE SET NULL ✅
- `link_delivery_records.delivered_by` → `auth.users(id)` ON DELETE SET NULL ✅
- Tutte le FK intra-schema (`link_id`, `batch_id`, `assignment_id`) ✅

### Perché no FK per tenant_id e worker_id in v1

**Coerenza con repo:** Migration 033 non ha FK su `tenant_id`. Il pattern consolidato è: isolamento applicativo + RLS + SECURITY DEFINER, non FK cross-schema.

**Stabilità degli schema target:** `analytics.tenant` e `personal.worker_identity` devono essere confermati stabili prima di aggiungere FK. Se questi schemi cambiano post-apply, 034 richiede una migration aggiuntiva.

**Semplicità rollback:** `DROP SCHEMA kora_link CASCADE` è un rollback pulito senza FK verso schemi esterni.

**RLS 035 è la mitigazione:** `fn_kora_link_activate` valida esplicitamente `token.tenant_id = worker.tenant_id` prima di creare `link_assignments`. Il boundary è enforced dal SECURITY DEFINER, non da una FK.

### Impatto su 035

Le SECURITY DEFINER functions in 035 devono includere:
```
-- Validazione esplicita (non delegata a FK DB):
IF token_record.tenant_id IS DISTINCT FROM worker_tenant_id THEN
  RAISE EXCEPTION 'tenant_mismatch';
END IF;
```
Questo è già il design previsto. A-01 non cambia nulla in 035.

### Rischio residuo

Orfani possibili se un bug applicativo crea un `link_assignments.worker_id` che non corrisponde a nessun worker reale. Mitigazione: il SECURITY DEFINER valida l'esistenza del worker prima dell'INSERT.

### Proposed SQL action

```
KEEP: UUID columns without FK as-is.

ADD COMMENT on each TODO FK column:
  "Intentionally no FK in v1 (pattern: migration 033).
   Canonical target: [target]. FK deferred until schema confirmed stable.
   Boundary enforced by RLS + SECURITY DEFINER in 035."

DO NOT ADD FK constraints until:
  - canonical target tables confirmed stable
  - CTO approves FK in a future migration
```

---

## 4. A-02 — PostgreSQL Compatibility

### Contesto

034 usa `UNIQUE NULLS NOT DISTINCT` su `partner_scans`:

```sql
CONSTRAINT uq_partner_scan_daily
  UNIQUE NULLS NOT DISTINCT (partner_id, link_id, event_ref, scan_date)
```

Questa sintassi è PostgreSQL 15+ only. Su PostgreSQL <15, l'apply fallirebbe con syntax error.

### Verifica versione

Prima di qualunque apply di 034 su staging o production:
```sql
SELECT version();
-- Esempio atteso Supabase Pro 2024+: "PostgreSQL 15.x ..."
-- Esempio Supabase Free tier (vecchio): "PostgreSQL 14.x ..."
```

### Se PG15+ confermato

Nessuna modifica necessaria. Aggiungere commento:
```
-- Requires PostgreSQL 15+ (UNIQUE NULLS NOT DISTINCT).
-- Verified: SELECT version() on target instance before apply.
```

### Se PG<15

Sostituire la constraint con un partial unique index equivalente:
```
-- Alternativa compatibile PG12+:
-- CREATE UNIQUE INDEX uq_partner_scan_daily
--   ON kora_link.partner_scans (partner_id, link_id, event_ref, scan_date)
--   WHERE partner_id IS NOT NULL
--     AND link_id IS NOT NULL
--     AND event_ref IS NOT NULL
--     AND scan_date IS NOT NULL;
-- Nota: righe con qualunque NULL non sono coperte dall'idempotency check.
-- Accettabile per partner_scans in v1 se tutti i campi sono obbligatori a runtime.
```

### Nota: rimozione partner_scans elimina questo problema

Se A-12 viene approvato (defer `partner_scans`), A-02 non è più bloccante per 034 v1.

### Proposed SQL action

```
IF PG15+ confirmed:
  KEEP UNIQUE NULLS NOT DISTINCT + add version comment.
IF PG<15:
  REPLACE constraint with partial unique index (WHERE NOT NULL on all 4 columns).
IF partner_scans deferred (A-12):
  A-02 not applicable to 034 v1.
```

---

## 5. A-03 — `partner_scans` e Colonna `GENERATED ALWAYS AS scan_date`

### Contesto

In `partner_scans`:
```sql
scan_date  date  NOT NULL GENERATED ALWAYS AS (occurred_at::date) STORED,
```

Il cast `timestamptz::date` usa il timezone della sessione Postgres (default UTC in Supabase). Un evento alle `23:30:00+02` (CEST) diventa `2026-07-01` UTC — ma localmente è `2026-07-02`. L'idempotency key basata su `scan_date` avrebbe quindi semantica UTC, non locale.

### Perché `partner_scans` è più futuro che v1

Il commento nel file 034 stesso lo dichiara: "Structural placeholder for future Track A partner scan events (v1.1+)." Il table non ha consumer in v1. Non blocca worker activation. Non blocca quick access. Non blocca admin batch management.

### Impatto su RLS

`partner_scans` richiederebbe una policy RLS specifica per il ruolo PARTNER (SELECT WHERE partner_id = self), separata dalle altre tabelle. Se la tabella viene rimossa da 034, la policy RLS corrispondente (RLS-035-I) non deve essere scritta in 035, semplificando il review.

### Alternative se partner_scans rimane

**Alternativa 1 — Colonna normale (app-managed):**
```
-- Rimuovere GENERATED ALWAYS AS
-- scan_date  date  NOT NULL,  -- valorizzata dall'applicazione
-- Vantaggio: pieno controllo timezone; testabile
-- Svantaggio: validation non enforced dal DB
```

**Alternativa 2 — Expression index (no colonna generata):**
```
-- Rimuovere scan_date come colonna
-- Usare expression index per idempotency:
-- CREATE UNIQUE INDEX uq_partner_scan_daily
--   ON kora_link.partner_scans (partner_id, link_id, event_ref,
--     (occurred_at AT TIME ZONE 'UTC')::date)
--   WHERE partner_id IS NOT NULL AND ...
-- Timezone UTC esplicito; portabile
```

### Proposed SQL action

```
RECOMMENDED: defer partner_scans to migration 036 with Track A scope.
  → Removes A-02 (PG15 compat), A-03 (generated column), FK-034-7 from v1.

IF partner_scans stays in 034:
  Option 1 (preferred): remove GENERATED ALWAYS AS, use app-managed scan_date.
  Option 2: use expression index with explicit timezone.
  Do NOT keep GENERATED ALWAYS AS with implicit session timezone.
```

---

## 6. A-04 — TTL Enforcement Strategy

### Contesto

`kora_link.links.pre_activation_expires_at` è il campo TTL per token non attivati:
- Valorizzato a `created_at + INTERVAL '180 days'` al momento della generazione del token
- Checked a livello applicativo nella route pubblica (`evaluateKoraLinkPublicRouteState`) e nella futura `fn_kora_link_public_lookup`
- Nessun job periodico in 034

### Perché non usare pg_cron in 034

- Aggiunge dipendenza da extension `pg_cron` non presente in tutti i tier Supabase
- La policy di retention/expiration è responsabilità del lifecycle management, non dello schema
- Per Foundation Light v1 (volume controllato), l'inconsistenza `status != 'expired'` per token scaduti non è un rischio operativo: il lookup applicativo usa `pre_activation_expires_at`, non `status`
- Un batch job di cleanup può essere aggiunto post-Gate-3 come processo admin separato, senza toccare lo schema

### Rischio residuo

Query di aggregazione (es. conteggio token "attivi" per tenant) devono filtrare sia su `status` che su `pre_activation_expires_at`. Le viste in 035 devono tenerne conto:
```
-- Vista aggregata corretta:
-- COUNT(*) FILTER (WHERE status = 'active' AND (pre_activation_expires_at IS NULL
--   OR pre_activation_expires_at > now()))
```

### Proposed SQL action

```
KEEP pre_activation_expires_at column as-is.
ADD COMMENT:
  "TTL for unactivated tokens. Set to created_at + 180 days at generation.
   Enforcement: application layer (route + fn_kora_link_public_lookup in 035).
   No pg_cron in this schema. Batch expiry job deferred post-Gate-3.
   Aggregate views must filter on this field alongside status."
NO pg_cron or scheduled job in 034.
```

---

## 7. A-05 — `audit_log` Retention

### Contesto

`kora_link.audit_log` è append-only per design (RLS 035 enforcea INSERT-only, no DELETE, no UPDATE). La retention policy deve essere definita con il DPO (Gate 3). Il meccanismo tecnico (pg_cron, Edge Function, archivio esterno) deve essere scelto in accordo con la durata approvata dal DPO.

### Cosa rimane invariato in 034

Lo schema è corretto: nessun meccanismo di deletion è definito qui. L'unica aggiunta proposta è un commento esplicito che documenta l'assenza intenzionale di retention automatica in 034.

### Perché non è bloccante per Gate 2

Il commento è informativo, non funzionale. La retention non impatta la struttura delle tabelle né la capacity di 035 di aggiungere policy RLS. Blocca solo Gate 9 (production readiness).

### Proposed SQL action

```
KEEP audit_log as-is.
ADD COMMENT on table (or update existing):
  "Retention policy: NOT defined in this schema.
   Duration must be approved by DPO (Gate 3).
   Mechanism options: pg_cron, Supabase Edge Function scheduled, external archive.
   INSERT-only enforced by RLS (035). No UPDATE, no DELETE policy in this file."
NO automatic deletion in 034.
```

---

## 8. A-06 — Rimozione `public_lookup_attempts` da v1

### Perché rimuovere

**Nessun consumer in v1:** L'anomaly detection non è implementata. Upstash gestisce già il rate limiting operativo con sliding window Redis. `public_lookup_attempts` sarebbe una tabella scritta ad ogni scan ma mai letta da nessun processo v1.

**Volume GDPR-rilevante:** Anche con minimizzazione dei dati, ogni riga è una prova di attività sulla route pubblica. La retention deve essere definita con il DPO. Rimuovere la tabella elimina questo problema per v1.

**Semplifica 035:** La policy RLS-035-K (`public_lookup_attempts`: KORA_ADMIN SELECT, INSERT solo via SECURITY DEFINER) non deve essere scritta in 035. Meno superficie di review.

**Upstash è il layer corretto per rate limit evidence:** Upstash mantiene contatori con retention configurabile. Per audit DPO in caso di incident, `kora_link.audit_log` registra già gli eventi significativi (es. `activation_attempted`, `admin_override`).

### Se il CTO vuole mantenerla

Requisiti minimi prima dell'apply:
1. Retention ≤ 30 giorni confermata con DPO
2. Meccanismo di cleanup definito (pg_cron o Edge Function)
3. Nessun campo aggiuntivo rispetto al design attuale (già minimizzato)

### Ambito della rimozione in 034

- `CREATE TABLE kora_link.public_lookup_attempts` e tutti i suoi campi
- `CREATE INDEX idx_public_attempts_created`
- `CREATE INDEX idx_public_attempts_result`
- `COMMENT ON TABLE kora_link.public_lookup_attempts`
- `COMMENT ON COLUMN kora_link.public_lookup_attempts.*`
- Eventuali riferimenti nella sezione rollback (`DROP SCHEMA kora_link CASCADE` li gestisce automaticamente, ma i commenti vanno aggiornati)
- Aggiornamento del conteggio tabelle nei commenti header (da 11 a 10 — o 9 se A-12 approvato)

### Proposed SQL action

```
REMOVE: CREATE TABLE kora_link.public_lookup_attempts block (table + indexes + comments).
UPDATE: header comment — table count from 11 to 10 (or 9 if partner_scans also removed).
UPDATE: post-apply verification queries — remove public_lookup_attempts from expected table list.
IF retained (CTO override):
  ADD: retention <= 30 days comment + DPO approval reference.
  ADD: mechanism TBD comment (pg_cron or Edge Function, Gate 3 dependency).
```

---

## 9. A-07 — Secret Rotation v1: Stable Secret Policy

### Contesto

`token_digest = HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET)`

Il `token_value` cleartext non è persistito nel DB — è fisicamente sul chip NFC. Se `KORA_LINK_TOKEN_SECRET` viene ruotato, tutti i digest esistenti non matchano più con il nuovo secret. L'unico modo di ricomputarli è che i worker ri-scansino i propri chip.

### Approccio v1 raccomandato: stable secret

Per Foundation Light (pilot controllato, numero limitato di chip emessi):
- Il secret viene generato una volta e conservato in un secret manager (es. Vercel Secrets, AWS Secrets Manager)
- Non viene ruotato in condizioni ordinarie durante il pilot
- In caso di compromissione sospetta: emergency procedure → revocare tutti i token attivi, generare nuovi chip, re-inviare al company

Questo non richiede modifiche allo schema. Richiede solo un commento documentativo e un riferimento al runbook.

### Perché non aggiungere `key_version` in 034 v1

`key_version` è necessario solo se si supporta dual-digest lookup (current secret + previous secret). Questo richiede:
1. Una lookup function che prova entrambi i digest per ogni scan
2. Una procedura di migrazione lazy (aggiornamento digest al primo scan post-rotation)
3. Un background job per revocare i token non migrati dopo N giorni

Per Foundation Light, questo overhead è sproporzionato rispetto al rischio. Il volume pilot è gestibile con emergency re-emissione.

### Proposed SQL action

```
NO key_version column in 034 v1 (unless CTO explicitly requires dual-secret support).
ADD COMMENT on kora_link.links.token_digest:
  "v1 policy: single active KORA_LINK_TOKEN_SECRET. No rotation in ordinary operations.
   Emergency procedure: revoke all tokens, re-issue chips, re-activate.
   If dual-secret/key_version is required in future, add via migration.
   See: docs/KORA_LINK_TOKEN_THREAT_MODEL.md §Secret Rotation."
```

---

## 10. A-08 — Deferred Self-FK `replaced_by_link_id`

### Contesto

```sql
-- In kora_link.links:
replaced_by_link_id  uuid  NULL,
-- ...
ALTER TABLE kora_link.links
  ADD CONSTRAINT fk_links_replaced_by
  FOREIGN KEY (replaced_by_link_id) REFERENCES kora_link.links (id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
```

La FK differita è stata introdotta per permettere INSERT atomico di vecchio e nuovo token nella stessa transazione. Senza `DEFERRABLE`, l'INSERT del vecchio token con `replaced_by_link_id = new_id` fallirebbe se il nuovo token non esiste ancora.

### Problema Supabase pooler

Supabase usa Supavisor (o pgBouncer) come connection pooler. In modalità `transaction` pooling, `DEFERRABLE INITIALLY DEFERRED` può non funzionare come atteso: il check della FK avviene al COMMIT, ma la transazione potrebbe essere distribuita su connessioni diverse.

### Ridondanza con `link_replacements`

`kora_link.link_replacements` (tabella 7) già traccia la catena di sostituzione con `old_link_id` e `new_link_id`. La colonna `replaced_by_link_id` in `kora_link.links` è ridondante: la stessa informazione è disponibile via JOIN su `link_replacements`.

### Alternative

**Alternativa A (raccomandazione):** Rimuovere `replaced_by_link_id` e `fk_links_replaced_by` da `kora_link.links`. La catena si naviga via `link_replacements.new_link_id`. Nessun DEFERRABLE.

**Alternativa B:** Mantenere `replaced_by_link_id` come colonna nullable senza FK (solo riferimento soft). L'applicazione aggiorna la colonna dopo che il nuovo token è stato inserito. INSERT ordinato: prima nuovo token, poi UPDATE del vecchio.

**Alternativa C:** Mantenere `DEFERRABLE`, verificare il pooler mode di Supabase. Se configurato in `session` mode, DEFERRABLE funziona correttamente.

### Proposed SQL action

```
RECOMMENDED (Alternativa A):
  REMOVE replaced_by_link_id column from kora_link.links.
  REMOVE ALTER TABLE ... ADD CONSTRAINT fk_links_replaced_by block.
  Use link_replacements.new_link_id as sole source of replacement chain.
  UPDATE COMMENT on link_replacements to note it is the authoritative replacement chain.

IF CTO prefers soft reference (Alternativa B):
  KEEP replaced_by_link_id column, nullable.
  REMOVE DEFERRABLE constraint.
  ADD COMMENT: "Soft reference — no FK. Updated by application after new token INSERT.
   Authoritative chain: link_replacements.new_link_id."

IF pooler mode confirmed (Alternativa C):
  KEEP DEFERRABLE + ADD: "Requires Supabase session pooling mode, not transaction mode."
```

---

## 11. A-09 — Indice Ridondante `idx_links_token_digest`

### Contesto

```sql
-- In kora_link.links:
CONSTRAINT uq_link_token_digest UNIQUE (token_digest)  -- crea automaticamente un btree index

-- Più avanti:
CREATE INDEX IF NOT EXISTS idx_links_token_digest
  ON kora_link.links (token_digest);  -- ridondante
```

PostgreSQL crea automaticamente un btree index quando si definisce una UNIQUE constraint. L'indice esplicito `idx_links_token_digest` è quindi un duplicato che occupa spazio e richiede maintenance extra per ogni write.

Il commento nel file lo riconosce: "UNIQUE constraint already creates a btree index on token_digest. Explicit index below for clarity and to support INCLUDE if needed in future."

### Quando l'indice esplicito ha senso

Solo se si vuole un `INCLUDE` index in futuro:
```sql
CREATE INDEX idx_links_token_digest ON kora_link.links (token_digest)
  INCLUDE (status, pre_activation_expires_at);
-- Permetterebbe index-only scan per le query più comuni del lookup pubblico
```

Per v1, questo ottimizzazione non è necessaria.

### Proposed SQL action

```
REMOVE: CREATE INDEX IF NOT EXISTS idx_links_token_digest block.
KEEP: CONSTRAINT uq_link_token_digest UNIQUE (token_digest) — questo crea già l'index.
IF INCLUDE index needed in future: add via separate migration post-Gate-2.
UPDATE COMMENT on links table if it references the explicit index.
```

---

## 12. A-10 — `link_delivery_records` Scope

### Contesto

`kora_link.link_delivery_records` traccia la consegna fisica dei chip NFC dalla produzione alla company. Il campo `delivered_to_label` è non-identificativo (es. "HR Manager" — non worker_id, non nome).

### Rischio PII residuo

`delivered_to_label` è testo libero. Senza un CHECK o enforcement applicativo, un operatore potrebbe scrivere un nome di persona reale invece di un label di ruolo. L'enforcement è solo documentale nei commenti del file.

### v1 vs v1.1+

Per Foundation Light (pilot con 1–3 company), la tracciabilità fisica dei chip può essere gestita fuori-sistema (spreadsheet, email). La tabella diventa rilevante quando la logistica scala (decine di company, centinaia di chip).

### Proposed SQL action

```
OPTION A (defer — raccomandato per v1 minimal):
  REMOVE link_delivery_records from 034.
  Add in migration 036 when physical logistics tracking is needed at scale.

OPTION B (keep with stricter comment):
  KEEP link_delivery_records.
  ADD: CHECK (delivered_to_label IS NULL OR length(delivered_to_label) < 100)
    to limit free-text bloat.
  UPDATE COMMENT: "delivered_to_label MUST be a role/team label (e.g., 'HR Manager'),
    NEVER a person's name, worker_id, or email. Application enforces this invariant."
  DPO must approve semantics of delivered_to_label before production.

Decision owner: CTO (scope) + DPO (privacy approval for label field).
```

---

## 13. A-11 — `updated_at` Trigger su `link_consents`

### Contesto

`kora_link.link_consents` ha colonne `accepted_at` e `withdrawn_at` per tracciare i cambiamenti di stato, ma non ha trigger `updated_at`. A confronto, `link_assignments` ha il trigger.

Due design possibili:

**Design A — Append-only consent events (raccomandazione):**  
Ogni cambio di stato del consenso è un nuovo record. `status = 'withdrawn'` non aggiorna il record `status = 'accepted'` precedente — crea un nuovo record `status = 'withdrawn'`. La storia del consenso è completamente auditabile senza `updated_at`. Questo è il pattern GDPR più corretto: nessuna modifica di record storici.

**Design B — Mutable consent record:**  
Un singolo record per (worker, link, consent_version) il cui `status` cambia da `pending` → `accepted` → `withdrawn`. In questo caso `updated_at` è necessario per sapere quando è avvenuta la transizione.

### Il file 034 è ambiguo

`CONSTRAINT uq_link_consent UNIQUE (worker_id, link_id, consent_version)` suggerisce un singolo record mutabile per combinazione. Ma `accepted_at` e `withdrawn_at` come campi separati suggeriscono che lo stesso record può attraversare gli stati.

### Proposed SQL action

```
CHOOSE one design explicitly:

OPTION A (append-only — raccomandato per auditabilità GDPR):
  REMOVE UNIQUE CONSTRAINT uq_link_consent (o mantenerlo solo per accepted records).
  ADD COMMENT: "Append-only consent events. Each state transition creates a new row.
   Previous accepted records are not modified. Full audit trail preserved."
  NO updated_at trigger needed.
  ADD immutable marker or comment.

OPTION B (mutable record):
  KEEP UNIQUE CONSTRAINT uq_link_consent.
  ADD trigger trg_link_consents_updated_at.
  ADD COMMENT: "Single mutable consent record per (worker, link, version).
   Status transitions: pending → accepted → withdrawn/superseded.
   updated_at tracks last transition."
  CLARIFY revocation semantics: does withdrawn create a new record or update the existing one?
```

---

## 14. A-12 — Defer `partner_scans` a Migration Separata

### Perché posticipare

`partner_scans` è esplicitamente etichettata nel file 034 come placeholder per "Track A partner scan events (v1.1+)." Tenerla in 034 introduce:

- TODO-CTO-02 (`UNIQUE NULLS NOT DISTINCT` — PG15 compat)
- TODO-CTO-03 (generated column `scan_date` — timezone)
- FK-034-7 (`partner_id` → `partner.profile(id)` — schema non ancora confermato)
- Policy RLS-035-I (PARTNER role access — complessità aggiuntiva per 035)

Nessuno di questi è necessario per worker activation v1 o quick access v1.

### Core KORA Link v1 non dipende da partner_scans

Le tabelle core per v1 sono: `link_batches`, `links`, `link_assignments`, `link_consents`, `link_events`, `revocations`, `link_replacements`, `audit_log`. Worker activation, consent, quick access, revocation e audit funzionano completamente senza `partner_scans`.

### Proposed SQL action

```
RECOMMENDED: remove partner_scans from 034.
CREATE in migration 036 when Track A / partner scan is in scope (v1.1+).
Migration 036 can introduce: partner_scans + UNIQUE NULLS NOT DISTINCT (after PG15 confirmed)
  + FK-034-7 + generated scan_date (with correct timezone strategy) + RLS partner policy.

IF CTO wants partner_scans in 034 now:
  Apply A-02 (PG compat) and A-03 (scan_date strategy) first.
  Keep as placeholder — ensure partner_scans has zero consumers in v1 runtime code.
```

---

## 15. Proposed v1 Table Set dopo gli Amendment

### Core v1 — Keep (8 tabelle)

| Tabella | Scopo | Amendment applicato |
|---------|-------|---------------------|
| `kora_link.link_batches` | Batch NFC admin | A-01 (comments FK) |
| `kora_link.links` | Token core, digest HMAC | A-07 (comment), A-08 (remove self-FK), A-09 (remove redundant index) |
| `kora_link.link_assignments` | Token↔worker association | A-01 (comments FK) |
| `kora_link.link_consents` | Worker explicit consent | A-11 (design choice append-only vs mutable) |
| `kora_link.link_events` | Log operativo tecnico | A-01 (comments FK) |
| `kora_link.revocations` | Revocation audit trail | A-01 (comments FK) |
| `kora_link.link_replacements` | Token replacement chain | A-08 (now sole source of chain) |
| `kora_link.audit_log` | Governance audit, DPO | A-05 (retention comment) |

**Motivo per mantenere tutte e 8:** Coprono l'intero lifecycle v1: generazione batch → emissione chip → attivazione worker → consenso → quick access → revoca → sostituzione → audit. Nessuna è ridondante.

### Review / Defer (2 tabelle — decisione CTO richiesta)

| Tabella | Motivo review | Proposta | Migration alternativa |
|---------|---------------|----------|----------------------|
| `kora_link.link_delivery_records` | Rischio PII label; non critica per activation | Defer a v1.1+ se logistica fisica non è scope pilot | 036 |
| `kora_link.partner_scans` | v1.1+ per design; introduce 3 TODO-CTO correlati | Defer — nessun consumer in v1 | 036 con Track A |

### Remove from v1 (1 tabella)

| Tabella | Motivo rimozione | Consumer alternativo |
|---------|-----------------|---------------------|
| `kora_link.public_lookup_attempts` | Nessun consumer v1; Upstash copre rate limiting; volume GDPR senza utilità | Upstash per rate limit evidence; `audit_log` per eventi significativi |

### Set finale raccomandato

Se A-06 (remove `public_lookup_attempts`), A-10 (defer `link_delivery_records`), e A-12 (defer `partner_scans`) sono approvati:

**034 v1 = 8 tabelle** (da 11 attuali):
`link_batches` · `links` · `link_assignments` · `link_consents` · `link_events` · `revocations` · `link_replacements` · `audit_log`

---

## 16. Impatto su 035 RLS

| Amendment | Effetto su RLS 035 | Policy semplificata o complicata | Decisione necessaria prima di 035 |
|-----------|-------------------|----------------------------------|----------------------------------|
| A-01 (no FK) | SECURITY DEFINER deve fare validazione esplicita tenant/worker | Uguale — il design SECDEF già lo prevede | ✅ Decisione FK chiarita |
| A-06 (remove public_lookup_attempts) | Elimina policy RLS-035-K | Semplifica 035 — 1 tabella in meno | ✅ Se CTO approva rimozione |
| A-08 (remove self-FK deferred) | Nessun impatto RLS | Uguale | Non bloccante per 035 |
| A-12 (defer partner_scans) | Elimina policy RLS-035-I (PARTNER role) e la SECURITY DEFINER partner-side | Semplifica significativamente 035 — nessun ruolo PARTNER da gestire in v1 | ✅ Se CTO approva deferral |
| A-10 (defer link_delivery_records) | Elimina policy RLS-035-L | Semplifica 035 — 1 tabella in meno | Se CTO approva deferral |
| A-11 (link_consents design) | Impatta policy RLS-035-E: INSERT su consents | Se append-only: INSERT always allowed per worker self; nessun UPDATE | ✅ Design append-only vs mutable |
| A-02, A-03 | Nessun impatto RLS se partner_scans rimossa | N/A se A-12 approvato | Dipendente da A-12 |

**Se A-06 + A-12 entrambi approvati:** 035 scende da 14 policy items (A–N specificate in 034) a 11, con scope PARTNER completamente rimosso. La review e il test di 035 diventano significativamente più semplici.

**Prerequisiti minimi per iniziare 035 draft:**
```
✅ A-01 decisa (FK → SECDEF validation design)
✅ A-11 decisa (consent append-only → INSERT policy)
✅ A-06 decisa (public_lookup_attempts: in scope o rimossa?)
✅ A-12 decisa (partner_scans: 035 include PARTNER role o no?)
✅ D-07 decisa (secret strategy → fn_kora_link_public_lookup signature)
✅ 034 stabilizzata (nessuna ulteriore tabella aggiunta/rimossa)
```

---

## 17. Post-Amendment Validation Checklist

Da eseguire nel futuro step in cui verranno davvero modificate le righe di 034 (non ora):

```
SQL PARSE:
  [ ] psql --file 034_kora_link_schema.sql --no-psqlrc --dry-run (se disponibile)
  [ ] pg_parse (o pg_format --check) per syntax validation senza apply

STRUCTURE CHECKS (post-edit, prima dell'apply):
  [ ] grep -n "public_lookup_attempts" 034_kora_link_schema.sql → 0 results se A-06 approvato
  [ ] grep -n "DEFERRABLE" 034_kora_link_schema.sql → 0 results se A-08 approvato
  [ ] grep -n "UNIQUE NULLS NOT DISTINCT" 034_kora_link_schema.sql → 0 results se A-02+A-12 approvati
  [ ] grep -n "GENERATED ALWAYS AS" 034_kora_link_schema.sql → 0 results se A-03 approvato
  [ ] grep -n "idx_links_token_digest" 034_kora_link_schema.sql → 0 results se A-09 approvato
  [ ] grep -n "replaced_by_link_id" 034_kora_link_schema.sql → 0 results se A-08 approvato
  [ ] grep -n "partner_scans" 034_kora_link_schema.sql → 0 results se A-12 approvato
  [ ] grep -n "key_version" 034_kora_link_schema.sql → 0 results se A-07 applicato (no key_version)
  [ ] grep -n "token_value" 034_kora_link_schema.sql → 0 results (invariante costituzionale)
  [ ] grep -n "nfc_url" 034_kora_link_schema.sql → 0 results (invariante costituzionale)

RLS CHECK:
  [ ] grep -n "CREATE POLICY\|ALTER TABLE.*ENABLE ROW LEVEL" 034_kora_link_schema.sql → 0 results
  [ ] Confermare: RLS rimane in 035, non in 034

SUPABASE IMPORT CHECK:
  [ ] grep -rn "from '@supabase" supabase/proposed/034_kora_link_schema.sql → 0 results
  [ ] Questo è SQL, non TypeScript — solo per sicurezza

COMMENT UPDATE CHECK:
  [ ] Header comment: conteggio tabelle aggiornato
  [ ] POST-APPLY VERIFICATION QUERIES: lista tabelle attesa aggiornata
  [ ] ROLLBACK section: eventuale rimozione riferimenti a tabelle rimosse
  [ ] TODO CTO comments: aggiornati con decisioni applicate o rimossi

RUNTIME CODE CHECK:
  [ ] npx tsc --noEmit → 0 errors (nessun codice runtime modificato)
  [ ] npx vitest run → 8381/8381 o più (nessun test rotto)
  [ ] npx next build → OK

INVARIANTE COSTITUZIONALE FINALE:
  [ ] Nessuna colonna token_value in tutto lo schema kora_link
  [ ] UNIQUE(token_digest) presente su kora_link.links
  [ ] RLS non abilitato in 034 (è in 035)
```

---

## 18. Reviewer Approval Template

Da compilare dal CTO dopo review di KL-14. Una riga per ogni amendment.

| ID | Approve / Change / Defer | Scelta Approvata | Note Reviewer | Owner | Data | Blocca 035 | Blocca Promotion |
|----|-------------------------|-----------------|---------------|-------|------|-----------|-----------------|
| A-01 FK | `[ ]` `[ ]` `[ ]` | Keep no-FK / Add FK: ____ | | CTO | | Sì — impatta SECDEF | No |
| A-02 PG | `[ ]` `[ ]` `[ ]` | PG version: __ / Partial index | | CTO+DBA | | No | Sì se PG<15 |
| A-03 scan_date | `[ ]` `[ ]` `[ ]` | Remove generated / App-managed / Expression index | | CTO | | No | Sì |
| A-04 TTL | `[ ]` `[ ]` `[ ]` | App-layer only / pg_cron / ____ | | CTO | | No | No |
| A-05 retention | `[ ]` `[ ]` `[ ]` | Comment only / Mechanism: ____ | | CTO+DPO | | No | No |
| A-06 lookup_attempts | `[ ]` `[ ]` `[ ]` | Remove / Keep (retention: __) | | CTO | | No | No |
| A-07 secret | `[ ]` `[ ]` `[ ]` | Stable v1 / key_version | | CTO | | No | No |
| A-08 self-FK | `[ ]` `[ ]` `[ ]` | Remove col+FK / Soft ref / DEFERRABLE | | CTO+DBA | | No | No |
| A-09 index | `[ ]` `[ ]` `[ ]` | Remove redundant / Keep / INCLUDE future | | CTO | | No | No |
| A-10 delivery | `[ ]` `[ ]` `[ ]` | Keep v1 / Defer 036 | | CTO+DPO | | No | No |
| A-11 consents | `[ ]` `[ ]` `[ ]` | Append-only / Mutable | | CTO | | Sì — INSERT policy | No |
| A-12 partner_scans | `[ ]` `[ ]` `[ ]` | Defer 036 / Keep placeholder | | CTO | | Sì — PARTNER policy | Parziale |

### Blocchi globali per 035

```
Per iniziare 035 draft, il CTO deve aver compilato:
  [ ] A-01 (FK → SECDEF validation)
  [ ] A-11 (consent INSERT policy)
  [ ] A-06 (public_lookup_attempts: in scope?)
  [ ] A-12 (partner_scans: PARTNER role in 035?)
  [ ] D-07 (secret → fn_kora_link_public_lookup signature)

Firma CTO: _____________________________
Data: _____________________________
Note globali: _____________________________
```

---

## 19. Final Recommendation

```
┌──────────────────────────────────────────────────────────────────────┐
│  KORA Link 034 Amendment Plan — Status al 2026-07-01 (KL-14)        │
├────────────────────────────────┬─────────────────────────────────────┤
│ AMENDMENT_PLAN_STATUS          │ ✅ READY_FOR_CTO_REVIEW             │
│                                │ 12 amendments documentati           │
│                                │ Nessun SQL modificato               │
├────────────────────────────────┼─────────────────────────────────────┤
│ 034_SQL_STATUS                 │ ⚠️ UNCHANGED_PROPOSED               │
│                                │ supabase/proposed/034_...sql        │
│                                │ NON modificato da KL-14             │
├────────────────────────────────┼─────────────────────────────────────┤
│ 034_PROMOTION_STATUS           │ 🔴 NO-GO                            │
│                                │ Attende CTO review + amendments     │
│                                │ applicati a proposed/ + dual review │
├────────────────────────────────┼─────────────────────────────────────┤
│ 035_STATUS                     │ 🔴 BLOCKED                          │
│                                │ Attende: A-01, A-11, A-06, A-12,   │
│                                │ D-07 risolti + 034 stabilizzata     │
├────────────────────────────────┼─────────────────────────────────────┤
│ DB_LOOKUP_STATUS               │ 🔴 BLOCKED                          │
│                                │ Richiede Gate 2 + Gate 4            │
│                                │ fn_kora_link_public_lookup: 035     │
├────────────────────────────────┼─────────────────────────────────────┤
│ ACTIVATION_STATUS              │ 🔴 BLOCKED                          │
│                                │ Richiede Gate 2+3+4+6              │
│                                │ Consent model: Gate 3 DPO           │
├────────────────────────────────┼─────────────────────────────────────┤
│ RUNTIME_PUBLIC_ROUTE           │ 🟡 SKELETON OK — no DB              │
│                                │ /link/[token] funziona              │
│                                │ 253 test · Build OK · E2E 6/6      │
│                                │ KORA_LINK_ENABLED=false (safe)      │
└────────────────────────────────┴─────────────────────────────────────┘

Prossimo step raccomandato:
  1. CTO compila Reviewer Approval Template (Sezione 18)
  2. Engineering applica amendments approvati a supabase/proposed/034_kora_link_schema.sql
  3. Engineering redige supabase/proposed/035_kora_link_rls.sql (dopo A-01, A-11, A-12 decisi)
  4. Gate 2 si chiude con: 034 amendments applicati + CTO sign-off formale
  5. Gate 4 inizia: 035 review CTO + DPO
```

---

*KORA_LINK_034_AMENDMENT_PLAN.md — KL-14 · 2026-07-01*  
*Branch: feat/kora-link-v1-platform*  
*Nessun SQL modificato · Nessuna migration creata · Nessun codice runtime toccato*  
*034 resta PROPOSED · 035 resta BLOCKED · DB lookup resta BLOCKED*

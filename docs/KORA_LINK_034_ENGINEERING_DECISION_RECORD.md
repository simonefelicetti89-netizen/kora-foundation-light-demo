# KORA Link 034 — Engineering Decision Record

**Migration:** `supabase/proposed/034_kora_link_schema.sql`  
**Step:** KL-16  
**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Autore:** Engineering / Foundation Light  
**Status documento:** DEFINITIVO — Engineering provisional (non CTO-approvato)

---

## ⚠ IMPORTANTE: Natura di questo documento

Questo documento registra le decisioni Engineering **provvisorie** applicate internamente a `supabase/proposed/034_kora_link_schema.sql` nel passo KL-16.

**Queste NON sono approvazioni CTO.**

Il file `034_kora_link_schema.sql` rimane in stato `PROPOSED_AMENDED_INTERNAL_ENGINEERING`:
- Non applicato ad alcun database
- Non promosso a `supabase/migrations/`
- Richiede review formale CTO (Gate 2) e DPO (Gate 3) prima di qualsiasi apply

Le decisioni segnate *"Engineering provisional"* sono scelte ragionate di Engineering basate su:
- Analisi KL-12 (checklist) → KL-13 (decision pack) → KL-14 (amendment plan)
- Pattern stabiliti (migration 033, policy codebase)
- Riduzione rischio tecnico pre-review

Le decisioni segnate *"Richiede conferma CTO"* rimangono aperte.

---

## 1. Decisioni applicabili — D-01 → D-08

### D-01 — FK policy: no FK su tenant_id / worker_id / partner_id

**Status:** Engineering provisional — applicato in KL-16  
**Rationale:** Coerenza con migration 033 (stessa scelta, stesso commento). I confini di accesso sono garantiti da RLS 035 + SECURITY DEFINER. FK su tabelle cross-schema (analytics.tenant, personal.worker_identity) introduce dipendenza di ordine di apply e rischio di cascade delete accidentale. Nessun consumer di v1 dipende da FK per integrità referenziale ad alto traffico.  
**Azione applicata:** Commenti espliciti su ogni colonna `tenant_id` / `worker_id` con target canonico e riferimento al pattern D-01.  
**Residual risk:** Schema non auto-documenta integrità referenziale a livello DB. Rischio mitigato da: (a) fn_kora_link_activate in 035 valida esistenza worker prima di INSERT in link_assignments; (b) RLS 035 limita accesso per tenant; (c) test E2E smoke verificano comportamento.  
**CTO deve confermare:** Sì — Engineering provisional; CTO deve formalmente approvare come pattern v1 o richiedere FKs.

---

### D-02 — Evitare costrutti PG15-only

**Status:** Risolto in KL-16 (eliminato con D-03/A-12)  
**Azione applicata:** `partner_scans` (unica tabella con `UNIQUE NULLS NOT DISTINCT` e `GENERATED ALWAYS AS scan_date`) è stata deferita a migration 036. Il 034 amended non contiene alcun costrutto PostgreSQL 15-only. Compatibilità: PG13+.  
**Residual risk:** Nessuno — construtti rimossi dal 034 v1.

---

### D-03 — Defer partner_scans a migration 036

**Status:** Engineering provisional — applicato in KL-16  
**Rationale:** `partner_scans` introduce quattro problemi simultanei: PG15 compat (UNIQUE NULLS NOT DISTINCT), timezone UTC concern (GENERATED ALWAYS AS scan_date), FK instabile (partner_id → partner.profile), complessità RLS-035-I (PARTNER role). Nessuno di questi è risolvibile senza scope aggiuntivo. Track A partner scan è out of scope Foundation Light v1.  
**Azione applicata:** Tabella `kora_link.partner_scans` rimossa da 034. Nota esplicita nel file SQL. 035 non deve più includere RLS-035-I (PARTNER role). migration 036 documentata come riferimento futuro.  
**Residual risk:** Partner scan feature non disponibile in v1. Conforme a scope Foundation Light.  
**CTO deve confermare:** Facoltativo — Engineering considera questa deferral non controversa.

---

### D-04 — TTL enforcement app-layer (no pg_cron in 034)

**Status:** Engineering provisional — applicato in KL-16  
**Rationale:** pg_cron è un'estensione non sempre disponibile su tutte le istanze Supabase managed. Inserire un job cron in una migration proposed (non ancora applicata) crea dipendenza non verificabile. L'enforcement app-layer (controllo `pre_activation_expires_at` in fn_kora_link_public_lookup + route) è sufficiente per v1 pilot.  
**Azione applicata:** Commento aggiornato su `pre_activation_expires_at` che documenta enforcement app-layer. Vista aggregate in 035 deve includere filtro TTL nei conteggi.  
**Residual risk:** Token scaduti rimangono in DB con status `activation_pending` fino a job di pulizia. Un batch expiry job (Edge Function o pg_cron schedulato) deve essere implementato in una migration separata post-Gate-3.  
**CTO deve confermare:** Sì — confermare che app-layer TTL è accettabile per v1.

---

### D-05 — audit_log: retention policy esterna, non in 034

**Status:** Engineering provisional — applicato in KL-16  
**Rationale:** La durata di retention deve essere approvata dal DPO (Gate 3). Definire un valore in questa migration proposed significa hardcodare una policy prima che sia stata legalmente validata. INSERT-only è garantito da RLS in 035 (no UPDATE, no DELETE). Il meccanismo di pulizia sarà una migration separata o Edge Function.  
**Azione applicata:** Commento aggiornato su `kora_link.audit_log` con riferimento esplicito a Gate 3 e DPO.  
**Residual risk:** In produzione, senza una retention job, la tabella cresce indefinitamente. Deve essere implementata prima del go-live.  
**CTO deve confermare:** Sì — confermare range di retention accettabile (90gg? 1 anno?) da passare a DPO.

---

### D-06 — Rimuovere public_lookup_attempts

**Status:** Engineering provisional — applicato in KL-16  
**Rationale:** La tabella non ha consumer in v1. Il rate limiting operativo è gestito da Upstash (sliding window Redis). Una tabella Postgres ad alta scrittura (ogni lookup pubblico genera un record) senza consumer è un GDPR risk inutile. La sicurezza non è ridotta: Upstash copre il rate limiting; audit_log copre gli eventi significativi.  
**Azione applicata:** Tabella `kora_link.public_lookup_attempts` rimossa da 034. Nota esplicita nel file SQL. 035 non deve più includere la policy per questa tabella.  
**Residual risk:** Se in futuro si vuole anomaly detection persistente (pattern lookup per token_digest), questa tabella andrà reintrodotta in una migration successiva.  
**CTO deve confermare:** Facoltativo — Engineering considera questa rimozione non controversa.

---

### D-07 — Stable secret policy (no key_version)

**Status:** Engineering provisional — applicato in KL-16  
**Rationale:** v1 pilot è un ambiente controllato con un numero limitato di chip (O(100-1000)). La complessità di key rotation (dual-lookup, key_version branching, re-HMAC job) non è giustificabile per il pilot. Emergency procedure: revoca tutti i token + re-issue chip. Questa è accettabile per un pilot — non per produzione at scale.  
**Azione applicata:** Commento aggiornato su `token_digest` che documenta la stable secret policy e la emergency procedure. Nessuna colonna `key_version` aggiunta.  
**Residual risk:** Se il secret KORA_LINK_TOKEN_SECRET è compromesso in v1, tutti i token devono essere revocati e re-emessi. Rischio accettabile per pilot controllato.  
**CTO deve confermare:** Sì — confermare che la emergency re-issue procedure è l'unica risposta attesa a una compromissione del secret in v1.

---

### D-08 — Rimuovere replaced_by_link_id e il self-FK DEFERRABLE

**Status:** Engineering provisional — applicato in KL-16  
**Rationale:** `replaced_by_link_id DEFERRABLE INITIALLY DEFERRED` è incompatibile con Supabase PgBouncer in transaction mode (le transazioni Supabase managed non garantiscono il deferral). Il self-FK su `links` crea anche un pattern di navigazione non standard. `kora_link.link_replacements` è già nella schema e copre la catena di sostituzione con un design più chiaro (relazione esplicita old→new).  
**Azione applicata:** Rimossa la colonna `replaced_by_link_id uuid NULL` da `kora_link.links`. Rimosso l'`ALTER TABLE ... ADD CONSTRAINT fk_links_replaced_by ... DEFERRABLE INITIALLY DEFERRED`. Rimosso il COMMENT ON COLUMN relativo. Aggiunto commento su `kora_link.link_replacements` che lo identifica come unica sorgente della catena.  
**Residual risk:** Navigare la catena richiede un JOIN su `link_replacements`. Nessun impatto funzionale.  
**CTO deve confermare:** Facoltativo — Engineering considera questa scelta tecnicamente migliore.

---

## 2. Amendments applicati — A-01 → A-12

| # | Titolo | Status KL-16 |
|---|--------|--------------|
| A-01 | FK policy: no FK, commenti con target canonici | ✅ Applicato |
| A-02 | Rimozione costrutti PG15-only | ✅ Risolto per eliminazione (partner_scans deferred, A-12) |
| A-03 | partner_scans: rimozione GENERATED ALWAYS AS scan_date | ✅ Risolto per eliminazione (A-12) |
| A-04 | TTL: mantenuto pre_activation_expires_at, enforcement app-layer documentato | ✅ Applicato |
| A-05 | audit_log: commento retention DPO-external aggiornato | ✅ Applicato |
| A-06 | Rimozione public_lookup_attempts | ✅ Applicato |
| A-07 | Secret: no key_version, stable secret policy documentata | ✅ Applicato |
| A-08 | Self-FK: rimosso replaced_by_link_id + DEFERRABLE constraint | ✅ Applicato |
| A-09 | Rimosso idx_links_token_digest ridondante (UNIQUE già crea btree) | ✅ Applicato |
| A-10 | link_delivery_records: mantenuto con commento DPO | ✅ Applicato (kept, DPO note) |
| A-11 | link_consents: append-only semantics documentata (v1 mutable, v2 event-sourced) | ✅ Applicato |
| A-12 | partner_scans: deferito a migration 036 | ✅ Applicato |

---

## 3. Tabella v1 definitiva dopo KL-16

| # | Tabella | Status v1 |
|---|---------|-----------|
| 1 | `kora_link.link_batches` | ✅ Incluso v1 |
| 2 | `kora_link.links` | ✅ Incluso v1 (amended: no replaced_by_link_id) |
| 3 | `kora_link.link_assignments` | ✅ Incluso v1 |
| 4 | `kora_link.link_consents` | ✅ Incluso v1 (A-11 semantics documented) |
| 5 | `kora_link.link_events` | ✅ Incluso v1 |
| 6 | `kora_link.revocations` | ✅ Incluso v1 |
| 7 | `kora_link.link_replacements` | ✅ Incluso v1 (ora unica sorgente catena sostituzione) |
| 8 | `kora_link.audit_log` | ✅ Incluso v1 (A-05 retention note) |
| 9 | `kora_link.link_delivery_records` | ✅ Incluso v1 (A-10 DPO note) |
| — | `kora_link.partner_scans` | 🔄 Deferito → 036 (A-03/A-12) |
| — | `kora_link.public_lookup_attempts` | ❌ Rimosso (A-06) |

**Totale v1: 9 tabelle** (era 11).

---

## 4. TODO aperti post-KL-16 (richiedono decisione CTO formale)

| ID | Argomento | Urgenza |
|----|-----------|---------|
| TODO-CTO-01 | FK policy D-01: Engineering provisional — CTO deve confermare pattern v1 | Alta |
| TODO-CTO-04 | TTL enforcement D-04: app-layer accettabile per v1? | Media |
| TODO-CTO-05 | audit_log retention D-05: range da definire con DPO | Alta |
| TODO-CTO-06 | link_delivery_records D-06: confermare inclusione o defer a 036 | Bassa |
| TODO-CTO-07 | Stable secret D-07: emergency re-issue come unica procedura v1? | Alta |
| TODO-DPO-01 | request_fingerprint: IP hashing strategy (Gate 3) | Alta |
| TODO-DPO-02 | consent_version: approvazione testo notice DPO (Gate 3) | Alta |
| TODO-DPO-03 | delivered_to_label semantics: cosa è non-identificativo? (Gate 3) | Media |

---

## 5. Rischi residui post-KL-16

| Rischio | Livello | Mitigazione |
|---------|---------|-------------|
| FK non presenti: integrità referenziale non garantita a DB level | Medio | RLS 035 + SECURITY DEFINER + test E2E |
| TTL: token scaduti non rimossi automaticamente | Basso (v1 pilot) | app-layer check + batch expiry job post-Gate-3 |
| audit_log cresce senza bound | Medio | retention job da implementare post-Gate-3 prima del go-live |
| Secret compromissione: tutti i token da re-emettere | Alto (scenario) / Basso (prob.) | Procedura documentata; accettabile per pilot |
| link_delivery_records.delivered_to_label: rischio associazione pre-consenso | Medio | DPO approval Gate 3; commento nel file |

---

## 6. Stato gate post-KL-16

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN — 034 amended e pronto per review; handoff pack in KL-15 |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| Gate 4 (RLS 035) | 🔴 BLOCKED — attende Gate 2 formale |
| KL-16 | ✅ COMPLETATO — amendments applicati a proposed/034 |
| KL-17 (RLS 035) | 🔴 BLOCKED — attende Gate 2 |

---

## 7. Come usare questo documento

**Per il CTO reviewer:**  
Questo documento elenca le scelte Engineering già incorporate nel file 034 amended. Il CTO deve:
1. Confermare o modificare le decisioni segnate "CTO deve confermare" (§1)
2. Approvare formalmente la tabella v1 definitiva (§3)
3. Autorizzare la promozione di 034 da `proposed/` a `migrations/`

**Per il DPO reviewer:**  
Le note DPO in §4 (TODO-DPO-01, 02, 03) e i commenti nel file SQL identificano i punti che richiedono approvazione DPO prima del go-live su dati reali.

**Per Engineering:**  
Leggere §1 e §2 prima di modificare 034 o di aprire 035 RLS. Nessuna modifica a 034 senza aggiornamento di questo documento e del changelog.

---

*Documento: KL-16 · Engineering Decision Record · 034 KORA Link Schema*  
*Branch: feat/kora-link-v1-platform · Gate 2+3 OPEN · NOT applied to any database*

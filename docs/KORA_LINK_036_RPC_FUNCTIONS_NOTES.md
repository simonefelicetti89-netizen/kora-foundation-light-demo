# KORA Link 036 — RPC Functions Draft Notes

**Migration:** `supabase/proposed/036_kora_link_rpc_functions.sql`  
**Step:** KL-18  
**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Status:** PROPOSED_RPC_FUNCTIONS_DRAFT_INTERNAL_ENGINEERING  
**Gate:** Gate 2 OPEN · Gate 3 OPEN · NOT applied to any database

---

## 1. Funzioni definite

| Funzione | Tipo | Caller | Ruolo richiesto |
|----------|------|--------|-----------------|
| `fn_is_valid_token_digest(text)` | helper IMMUTABLE INVOKER | interno | — |
| `fn_public_lookup_link(text)` | SECURITY DEFINER | route /link/[token] server-side | anon / authenticated |
| `fn_activate_link_for_worker(text,uuid,text)` | SECURITY DEFINER | activation API route server-side | authenticated |
| `fn_revoke_link(uuid,text)` | SECURITY DEFINER | admin API route server-side | authenticated (KORA_ADMIN inside) |
| `fn_replace_link(uuid,uuid,text)` | SECURITY DEFINER | admin API route server-side | authenticated (KORA_ADMIN inside) |
| `fn_company_link_status_aggregate(uuid)` | SECURITY DEFINER | company dashboard server-side | authenticated (COMPANY_ADMIN/KORA_ADMIN inside) |

---

## 2. Scelte di design

### 2.1 fn_public_lookup_link — uniform response

"Not found" e "unusable" restituiscono la stessa risposta (`unavailable` / `link_not_available`). Questo previene token enumeration: un attaccante che vuole scoprire se un digest esiste nel DB riceve la stessa risposta che riceverebbe per un digest inesistente.

La stessa risposta uniforme si applica anche a `service_unavailable` (errori interni): sempre `unavailable` per il caller.

### 2.2 fn_public_lookup_link — 'active' chips restituiscono 'ready'

Design scelto: chip active → `ready`.

Motivazione: i chip active sono usati per il "quick access" flow (il worker scansiona il proprio chip per accedere al profilo KORA). Restituire `unavailable` per chip active romperebbe questo use case.

La risposta non rivela l'identità del worker: il caller sa solo che il chip è funzionale, non a chi appartiene.

[TODO-RPC-01] CTO: confermare questa scelta o scegliere `unavailable` per privacy massima.

### 2.3 fn_activate_link_for_worker — FOR UPDATE NOWAIT

Il row lock su `kora_link.links` con `NOWAIT` previene attivazioni concorrenti dello stesso chip. Se un'altra transazione ha già il lock, la funzione restituisce `{ "status": "error", "reason": "concurrent_request" }` invece di aspettare (evita deadlock e timeout lato HTTP).

Il `UNIQUE INDEX uq_assignment_link_active` su `link_assignments (link_id) WHERE status = 'active'` fornisce una seconda linea di difesa contro race conditions.

### 2.4 fn_activate_link_for_worker — consent_version hardcoded

La version `'kora-link-privacy-v1.0'` è hardcoded come costante nel draft. In produzione deve essere una lista dinamica approvata dal DPO, letta da una tabella di configurazione o da un environment variable.

[TODO-RPC-03] DPO: approvare il testo della notice `kora-link-privacy-v1.0` prima della produzione.

### 2.5 fn_activate_link_for_worker — cross-schema validation assente nel draft

Il draft accetta `p_worker_id` come parametro ma non verifica che corrisponda a `auth.uid() → personal.worker_identity`. Questa validazione DEVE essere implementata dalla route chiamante in v1 e trasferita dentro la funzione in v2.

[TODO-RPC-02] CTO: confermare il path di validazione cross-schema per v1.

### 2.6 fn_replace_link — link_replacements come unica fonte della catena

La funzione NON imposta alcun campo `replaced_by_link_id` su `kora_link.links` (quella colonna è stata rimossa in KL-16/A-08). La catena di sostituzione si naviga via JOIN su `link_replacements.old_link_id`.

### 2.7 fn_company_link_status_aggregate — TTL-aware reclassification

Il count include una reclassificazione TTL: chip in stato `generated`/`delivered`/`activation_pending` che hanno superato `pre_activation_expires_at` vengono contati come `expired` nel risultato aggregato, anche se il DB non ha ancora aggiornato il loro `status`. Questo elimina falsi positivi nei conteggi di chip "attivi" per il company dashboard.

### 2.8 REVOKE ALL FROM PUBLIC prima di ogni GRANT

Ogni funzione fa esplicitamente `REVOKE ALL ... FROM PUBLIC` prima di concedere il minimo necessario. Questo segue il pattern di sicurezza del repo (migrations 031) e previene accesso da PUBLIC non intenzionale.

---

## 3. Pattern di sicurezza rispettati

| Regola | Status |
|--------|--------|
| Nessun token raw accettato | ✅ Solo `token_digest` come input |
| Nessun `token_digest` restituito | ✅ Mai in nessun RETURN |
| Nessun `worker_id` restituito a caller pubblico | ✅ `fn_public_lookup_link` non lo restituisce |
| Nessun `metadata` jsonb raw restituito | ✅ Solo status/count restituiti |
| `USING (true)` / `WITH CHECK (true)` assenti | ✅ Nessun bypass generico |
| `search_path` esplicito in ogni SECURITY DEFINER | ✅ Tutte le 5 funzioni |
| `REVOKE ALL FROM PUBLIC` prima di ogni GRANT | ✅ Tutte le 6 funzioni |
| No `SELECT *` nelle query interne | ✅ Solo colonne necessarie selezionate |
| Errori → risposta safe uniforme | ✅ `EXCEPTION WHEN OTHERS` in tutte le funzioni |
| `FOR UPDATE NOWAIT` per concorrenza | ✅ `fn_activate_link_for_worker`, `fn_revoke_link`, `fn_replace_link` |

---

## 4. TODO aperti per CTO/DPO

| ID | Funzione | Domanda |
|----|----------|---------|
| TODO-RPC-01 | `fn_public_lookup_link` | GRANT a `anon` confermato? O service_role-only? |
| TODO-RPC-02 | `fn_activate_link_for_worker` | Cross-schema validation: route o dentro funzione in v2? |
| TODO-RPC-03 | `fn_activate_link_for_worker` | DPO: approvare testo notice `kora-link-privacy-v1.0` |
| TODO-RPC-04 | `fn_company_link_status_aggregate` | Threshold privacy: count < N → suppress? |

---

## 5. Dipendenze

- `034_kora_link_schema.sql` deve essere applicata prima di questo file
- `035_kora_link_rls.sql` deve essere applicata prima (fornisce `kora_link.is_kora_admin()`)
- `kora.kora_role()` e `kora.tenant_id()` da migration 003/006 (già in produzione)
- `auth.uid()` Supabase built-in

---

## 6. Gate status post-KL-18

| Gate | Status |
|------|--------|
| Gate 2 (CTO) | 🔴 OPEN — 034 + 035 + 036 pronti per review formale |
| Gate 3 (DPO) | 🔴 OPEN — consent model e notice text richiedono approvazione |
| Gate 4 (RLS) | ✅ Draft completato (KL-17) |
| Gate 5 (RPC) | ✅ Draft completato (KL-18) — applicabile dopo Gate 2+3 |
| KL-18 | ✅ COMPLETATO |
| KL-19 (route runtime) | 🔴 BLOCKED — attende Gate 2+3 + staging deploy |

---

*Documento: KL-18 · RPC Functions Draft Notes · Branch feat/kora-link-v1-platform*  
*Gate 2+3 OPEN — NOT applied to any database*

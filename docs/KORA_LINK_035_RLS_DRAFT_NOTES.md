# KORA Link 035 — RLS Draft Notes

**Migration:** `supabase/proposed/035_kora_link_rls.sql`  
**Step:** KL-17  
**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Status:** PROPOSED_RLS_DRAFT_INTERNAL_ENGINEERING  
**Gate:** Gate 2 OPEN · Gate 3 OPEN · NOT applied to any database

---

## 1. Scopo e principi di progettazione

Il file 035 implementa la Row Level Security (RLS) per le 9 tabelle `kora_link.*` definite in 034 amended (KL-16).

**Principio guida:** deny-by-default, con accesso reale solo a `KORA_ADMIN` attraverso il meccanismo JWT `kora.kora_role()` già in produzione (migration 003).

**Nessuna nuova funzione SECURITY DEFINER operativa** è creata in KL-17. Le funzioni di accesso per worker/company sono specificate come TODO commentati nel file SQL, per review CTO prima dell'implementazione.

---

## 2. Scelte di design

### 2.1 Helper `kora_link.is_kora_admin()`

Scelta: thin wrapper su `kora.kora_role() = 'KORA_ADMIN'`, **non** una ridefinizione.

Alternativa scartata: copiare la logica JWT da migration 003 nella kora_link schema. Motivo: duplicazione fragile — se `kora.kora_role()` viene aggiornata (es. chiave JWT cambia), 035 resterebbe desincronizzato.

### 2.2 FORCE ROW LEVEL SECURITY

Applicato su tutte le 9 tabelle. Garantisce che anche il table owner (postgres) sia soggetto a RLS — difesa in profondità contro accidentale bypass da ruolo owner.

### 2.3 GRANT pattern

Seguendo il pattern del repo (migration 001, 026):
- `GRANT SELECT, INSERT, UPDATE TO authenticated` + policy che restringe a `is_kora_admin()`
- `REVOKE DELETE FROM PUBLIC` / `REVOKE UPDATE, DELETE FROM PUBLIC` per tabelle append-only
- `anon`: solo `USAGE` sullo schema — nessun GRANT su tabelle (accesso futuro via SECURITY DEFINER)

### 2.4 Tabelle append-only

`link_events`, `revocations`, `link_replacements`, `link_consents`, `audit_log`:
- `REVOKE UPDATE, DELETE FROM PUBLIC`
- Nessuna policy UPDATE o DELETE
- Scritte only via: KORA_ADMIN (admin tooling) o futuro SECURITY DEFINER (server-side)

### 2.5 Accesso Company

Nessuna policy company in 035 v1. La visibilità aziendale sui link sarà implementata tramite una view aggregata (`v_tenant_batch_stats`) in una migration successiva, quando il column set è approvato dal CTO. Direct table access per `COMPANY_ADMIN` su `kora_link.*` è constitutional never.

### 2.6 Accesso Worker diretto

Nessuna policy worker direct in 035 v1. Il worker interagisce solo tramite:
- `fn_kora_link_public_lookup` (lookup pubblico — future SECURITY DEFINER)
- `fn_kora_link_activate` (attivazione — future SECURITY DEFINER)

La policy worker self-SELECT su `link_assignments` è documentata come future policy commentata nel file SQL — richiede cross-schema join su `personal.worker_identity` e review CTO prima di essere attivata.

---

## 3. Policy count e struttura

| Tabella | Policies v1 | Note |
|---------|-------------|------|
| `link_batches` | 3 (select/insert/update admin) | Company view futura |
| `links` | 3 (select/insert/update admin) | Lookup via SECDEF futuro |
| `link_assignments` | 3 (select/insert/update admin) | Activation via SECDEF futuro |
| `link_consents` | 2 (select/insert admin) | Append-only; no update |
| `link_events` | 2 (select/insert admin) | Append-only |
| `revocations` | 2 (select/insert admin) | Append-only |
| `link_replacements` | 2 (select/insert admin) | Append-only |
| `audit_log` | 2 (select/insert admin) | Insert via service_role in prod |
| `link_delivery_records` | 3 (select/insert/update admin) | DPO gate pending |
| **Totale** | **22 policies** | |

---

## 4. SECURITY DEFINER functions — stato KL-17

Nessuna funzione SECURITY DEFINER operativa creata in KL-17.

| Funzione | Spec in 035 | Status |
|----------|-------------|--------|
| `fn_kora_link_public_lookup` | ✅ Spec commentata | Blocked: Gate 2+3 |
| `fn_kora_link_activate` | ✅ Spec commentata | Blocked: Gate 2+3 |
| `fn_kora_link_revoke` | ✅ Spec commentata | Blocked: Gate 2+3 |
| `fn_kora_link_replace` | ✅ Spec commentata | Blocked: Gate 2+3 |
| `fn_kora_link_company_batch_stats` | ✅ Spec commentata | Blocked: Gate 2+3 |

---

## 5. Dipendenze critiche

### Da 034 (schema)
035 dipende da 034. Se 034 cambia i nomi delle tabelle, 035 va aggiornato.

### Da migration 003 (`kora.kora_role()`)
`kora_link.is_kora_admin()` chiama `kora.kora_role()`. Se la chiave JWT cambia, 006 aggiorna `kora.kora_role()` e 035 funziona automaticamente.

### Da schema `personal` (future policy)
La future policy worker self-SELECT su `link_assignments` richiede:
- RLS su `personal.worker_identity` che permette lookup auth_user_id → worker_id
- Da verificare con CTO: cross-schema join in USING clause è ammesso in questo repo?

---

## 6. TODO aperti per CTO review (RLS)

| ID | Domanda |
|----|---------|
| TODO-RLS-01 | Worker self-SELECT su link_assignments: approvare spec policy commentata? |
| TODO-RLS-02 | fn_kora_link_public_lookup: approvare return type e TTL logic? |
| TODO-RLS-03 | fn_kora_link_activate: SERIALIZABLE vs SELECT FOR UPDATE per race condition? |
| TODO-RLS-04 | Company aggregate view: approvare column set v_tenant_batch_stats? |
| TODO-RLS-05 | audit_log INSERT: service_role sufficiente o serve SECURITY DEFINER INSERT? |
| TODO-RLS-06 | DPO break-glass read su audit_log: approvare procedura di accesso? |
| TODO-DPO-04 | fn_kora_link_activate: DPO deve approvare lista consent_version ammessi |

---

## 7. Gate status post-KL-17

| Gate | Status |
|------|--------|
| Gate 2 (CTO) | 🔴 OPEN — 034 + 035 pronti per review formale CTO |
| Gate 3 (DPO) | 🔴 OPEN — consent model e audit_log richiedono approvazione DPO |
| Gate 4 (RLS) | ✅ Draft completato (KL-17) — applicabile dopo Gate 2+3 |
| KL-17 | ✅ COMPLETATO |
| KL-18 (SECDEF functions) | 🔴 BLOCKED — attende Gate 2+3 + function spec approval |

---

*Documento: KL-17 · RLS Draft Notes · Branch feat/kora-link-v1-platform*  
*Gate 2+3 OPEN — NOT applied to any database*

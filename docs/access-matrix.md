# KORA Access Matrix — Documento Autoritativo

**Versione:** 1.0  
**Data:** 2026-06-17  
**Sprint:** B168 — Privacy Guard Granularization  
**Autorità:** Supera qualsiasi check hardcoded nel codice. In caso di conflitto, questo documento vince.

---

## Principio Operativo

KORA opera in modalità **service-assisted** per 12–18 mesi (Foundation Light → Pilot). Il team KORA (KORA_ADMIN) DEVE poter accedere alla company view per erogare il servizio: setup, QA, supporto, batch approval, monitoraggio KORA Index.

La privacy doctrine "i nomi seguono la fonte" e la promessa worker-owned del PIB restano **INTATTE**. La protezione si sposta dalla granularità "company view" alla granularità "worker individual data".

**Regola operativa:**
- Company-level aggregate data → admin entra, **con audit log**
- Worker-individual data → admin **NON entra MAI**, in nessun environment
- Aggregati N≥10 → già anonimizzati by design, accesso libero

---

## Matrice di Accesso

| Risorsa | KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER / DEMO_VIEWER | Env constraint |
|---|---|---|---|---|---|
| Company KPI / KORA Index org | **ALLOW + audit** | ALLOW | DENY | DENY | tutti |
| Company config / source_batch | **ALLOW + audit** | ALLOW | DENY | DENY | tutti |
| Submissions / approval flow | **ALLOW + audit** | ALLOW | DENY | DENY | tutti |
| Aggregati N≥10 | ALLOW | ALLOW | ALLOW | DENY | tutti |
| Worker individual PIB | **DENY** | DENY | ALLOW (own) | DENY | tutti |
| Worker UEF individuale | **DENY** | DENY | ALLOW (own) | DENY | tutti |
| personal.worker_pseudonym_map | **DENY** | DENY | DENY | DENY | tutti |
| HQ Operator Console | ALLOW | DENY | DENY | DENY | tutti |

**Note:**
- `ALLOW (own)` = il worker può accedere solo ai propri dati, mai a quelli di altri worker
- `personal.worker_pseudonym_map`: zero accessi applicativi — solo procedure SECURITY DEFINER di sistema
- Aggregati N≥10: la soglia privacy (`safe_aggregation_threshold = 10`) è invariata — gruppi sotto soglia restano soppressi

---

## Banner UI per Accesso Privilegiato

Quando `KORA_ADMIN` accede a una risorsa company (ALLOW + audit), il layout server mostra un banner persistente e non dismissibile:

| Ambiente | Variante | Background | Testo |
|---|---|---|---|
| `demo` | `amber` | amber soft | `DEMO ENVIRONMENT — Synthetic data — KORA service access` |
| `live` | `navy` | navy soft | `KORA service team access — Action logged` |
| `future` | `blueprint` | blueprint | `FUTURE ENVIRONMENT — Forecast view` |

Font: Hanken Grotesk, weight 500, 14px. Sticky top, non dismissibile.

---

## Implementazione: `canAccess()`

Funzione pura (no side effect, no async) che implementa la matrice come dati.

```typescript
canAccess(role: KoraRole, resource: AccessResource, env: KoraEnvironment): AccessDecision
```

Restituisce:
- `allowed: boolean` — se l'accesso è consentito
- `requiresAudit: boolean` — se l'accesso deve essere loggato in `audit.audit_log`
- `banner?: BannerVariant` — variante banner se applicabile
- `denyReason?: string` — stringa human-readable del motivo di blocco (non esposta all'utente, per logging)

---

## Enforcement: Defense in Depth

Per ogni risorsa protetta, i livelli di enforcement sono **tutti e tre obbligatori**:

1. **Middleware** (`middleware.ts`) — chiama `canAccess()` per routing
2. **Server Component layout** — secondo livello, anche se middleware bypassato
3. **RLS Supabase** — layer DB, anche se l'app è compromessa

Per `worker-individual` e `pseudonym_map` in particolare: tutti e tre i livelli devono bloccare KORA_ADMIN. **Non basta uno solo.**

---

## Appendice: Codici Risorsa

| Code | Descrizione |
|---|---|
| `company_kpi_kora_index` | Company KPI, KORA Index, activation, pillars, financial, reports |
| `company_config_source_batch` | Tenant config, source_batch, onboarding, data intake |
| `company_submissions_approval` | Data submissions, approval workflow, status center |
| `aggregates_n_ge_10` | Statistiche aggregate con N≥10 (safe aggregation output) |
| `worker_individual_pib` | personal.worker_pib, PIB per singolo worker |
| `worker_individual_uef` | analytics.uef_record per singolo worker (non aggregato) |
| `personal_pseudonym_map` | personal.worker_pseudonym_map — tabella più sensibile |
| `hq_operator_console` | Pannello operativo KORA: admin companies, scoring, provisioning |

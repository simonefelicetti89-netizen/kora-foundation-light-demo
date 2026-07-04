# KORA Access Matrix — Documento Autoritativo

**Versione:** 1.2  
**Data:** 2026-07-04 (matrice ruoli aggiornata in PILOT-SAAS-01; tipo `KoraRole` riconciliato in ROLE-01; corpo documento originale B168 invariato)  
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

**Aggiornamento (PILOT-SAAS-01, 2026-07-04):** la colonna combinata `PARTNER / DEMO_VIEWER` è stata separata — `PARTNER` è oggi un ruolo reale, con login e route dedicate (`app/partner/*`, `requirePartnerUser()`), distinto da `DEMO_VIEWER` (sintetico, nessuna grant su tabelle live by design). È stata aggiunta anche una colonna `ADVISOR` — vedi nota sotto la tabella: il ruolo esiste solo a livello di tipo/DB, senza alcuna route o guard di sessione reale oggi.

**Aggiornamento (ROLE-01, 2026-07-04):** `ADVISOR` è ora modellato esplicitamente in `MATRIX` (`lib/auth/access-matrix.ts`) con una riga `DENY` per ogni risorsa, invece di affidarsi implicitamente al fallback fail-closed di `canAccess()`. Il `KoraRole` di questo file e il `KoraRole` usato altrove nell'app derivano ora dalla stessa fonte canonica (`KORA_ROLES` in `lib/constants/kora.ts`) — vedi la nota aggiornata più sotto in "Implementazione: `canAccess()`".

| Risorsa | KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | DEMO_VIEWER | ADVISOR | Env constraint |
|---|---|---|---|---|---|---|---|
| Company KPI / KORA Index org | **ALLOW + audit** | ALLOW | DENY | DENY | DENY | DENY | tutti |
| Company config / source_batch | **ALLOW + audit** | ALLOW | DENY | DENY | DENY | DENY | tutti |
| Submissions / approval flow | **ALLOW + audit** | ALLOW | DENY | DENY | DENY | DENY | tutti |
| Aggregati N≥10 | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | tutti |
| Worker individual PIB | **DENY** | DENY | ALLOW (own) | DENY | DENY | DENY | tutti |
| Worker UEF individuale | **DENY** | DENY | ALLOW (own) | DENY | DENY | DENY* | tutti |
| personal.worker_pseudonym_map | **DENY** | DENY | DENY | DENY | DENY | DENY | tutti |
| HQ Operator Console | ALLOW | DENY | DENY | DENY | DENY | DENY | tutti |
| network.partner_profile / partner_identity | ALLOW | DENY | DENY | ALLOW (own) | DENY | DENY | tutti |

**Note:**
- `ALLOW (own)` = il worker (o partner) può accedere solo ai propri dati, mai a quelli di altri worker/partner
- `personal.worker_pseudonym_map`: zero accessi applicativi — solo procedure SECURITY DEFINER di sistema
- Aggregati N≥10: la soglia privacy (`safe_aggregation_threshold = 10`) è invariata — gruppi sotto soglia restano soppressi
- **`ADVISOR` (*):** dal ROLE-01, `canAccess()` restituisce `DENY` esplicito per `ADVISOR` su ogni risorsa di questa tabella — non è più un caso non modellato. Per `worker_individual_uef` specificamente, questo `DENY` riguarda l'accesso diretto/individuale via questa risorsa app-layer; `analytics.fn_advisor_uef_read()` esiste separatamente a livello DB (migration 030, `SECURITY DEFINER`, tenant-scoped, payload escluso) ma **nessuna route o guard di sessione reale la richiama oggi** — `ADVISOR` non ha `require*User()` in `lib/auth/kora-session.ts`, non ha login, e `/advisor` reindirizza permanentemente a `/demo/advisor` (showcase statico). Non promettere accesso advisor reale ai clienti. Vedi `docs/FUTURE_ROLES_AND_SURFACES.md`.
- **`PARTNER`** è un ruolo reale con login (`requirePartnerUser()`, `app_metadata.kora_role === 'PARTNER'`), non solo un'etichetta demo — ma oggi limitato al proprio profilo (`network.partner_profile`/`partner_identity`); nessuna visibilità su dati worker o company a livello individuale, per design.

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

**Risolto in ROLE-01 (2026-07-04) — prima due tipi `KoraRole` non coincidenti, trovato in PILOT-SAAS-01:** il `KoraRole` usato da `canAccess()` (`lib/auth/access-matrix.ts`) dichiarava un'unione letterale indipendente (`KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | DEMO_VIEWER`, senza `ADVISOR`) che divergeva silenziosamente da `KoraRole` in `lib/types/index.ts` (derivato da `KORA_ROLES` in `lib/constants/kora.ts`, con `ADVISOR` ma senza `DEMO_VIEWER`). Entrambi ora derivano dalla stessa fonte canonica: `KORA_ROLES = [...ACTIVE_KORA_ROLES, ...FUTURE_KORA_ROLES, ...DEMO_KORA_ROLES]` in `lib/constants/kora.ts` (6 ruoli: `KORA_ADMIN, COMPANY_ADMIN, WORKER, PARTNER, ADVISOR, DEMO_VIEWER`). `ActiveProductRole`/`KoraUserRole` (`lib/types/index.ts`) restano un sottotipo deliberatamente più stretto (5 ruoli, esclude `DEMO_VIEWER`) per i call site che intendono "ruolo prodotto reale" — non un terzo elenco indipendente, ma un derivato di `ACTIVE_PRODUCT_KORA_ROLES`. Verificato da `tests/unit/pilot-saas-01-role-architecture-invariants.test.ts`. Vedi `docs/PILOT_SAAS_READINESS.md` e `docs/FUTURE_ROLES_AND_SURFACES.md`.

---

## Enforcement: Defense in Depth

Per ogni risorsa protetta, i livelli di enforcement sono **tutti e tre obbligatori**:

1. **Middleware** (`middleware.ts`) — chiama `canAccess()` per routing
2. **Server Component layout** — secondo livello, anche se middleware bypassato
3. **RLS Supabase** — layer DB, anche se l'app è compromessa

Per `worker-individual` e `pseudonym_map` in particolare: tutti e tre i livelli devono bloccare KORA_ADMIN. **Non basta uno solo.**

**Nota — `/partner` (PARTNER-01, 2026-07-04):** `network.partner_profile`/`partner_identity` restano l'unica cosa che PARTNER può leggere (riga `network.partner_profile / partner_identity` sopra, `ALLOW (own)`). `/partner` root e `/partner/workspace` sono comunque entrambi dietro lo stesso `app/partner/layout.tsx` → `requirePartnerUser()` — nessun cambiamento di enforcement qui. La modifica di questo sprint è stata solo di prodotto/routing: `/partner` root ora fa redirect a `/partner/workspace` (invece di renderizzare un dashboard 100% sintetico dietro il gate reale) e quel dashboard sintetico si trova ora su `app/demo/partner/page.tsx`, gated da `requireDemoGate()` (DEMO_VIEWER/KORA_ADMIN — mai una sessione PARTNER reale). Vedi `docs/FUTURE_ROLES_AND_SURFACES.md` e `docs/PARTNER_WORKSPACE_FOUNDATION.md`.

**Nota — `/my-kora` (MYKORA-01, 2026-07-04):** `/my-kora` non ha un `AccessResource` dedicato in questa matrice — è una superficie PREVIEW/demo (dati sintetici only in Foundation Light), non una risorsa live coperta da `canAccess()`. `app/my-kora/layout.tsx` è comunque ora un guard server-side: legge la sessione reale (`getSessionKoraRole()`) prima di qualunque render, ammette solo WORKER e KORA_ADMIN reali, e blocca ogni altro ruolo reale (`COMPANY_ADMIN`, `PARTNER`, `DEMO_VIEWER`, ...) prima che la pagina figlia venga mai renderizzata. Il ramo demo-visitor (nessuna sessione reale) resta client-side per design, perché serve solo persona sintetiche — non è un confine di privacy su dati reali. Vedi `docs/PILOT_SAAS_READINESS.md` e `docs/QA_STATUS.md`.

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

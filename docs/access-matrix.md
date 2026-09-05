# KORA Access Matrix — Documento Autoritativo

**Versione:** 1.3  
**Data:** 2026-07-04 (matrice ruoli aggiornata in PILOT-SAAS-01; tipo `KoraRole` riconciliato in ROLE-01; colonna `DEMO_VIEWER` rimossa in CC-00 DEMO_VIEWER role retirement, 2026-09-26; corpo documento originale B168 invariato)  
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

**Aggiornamento (CC-00 DEMO_VIEWER role retirement, 2026-09-26):** la colonna `DEMO_VIEWER` è stata rimossa dalla tabella sottostante e dalla `MATRIX` in `lib/auth/access-matrix.ts` — il ruolo è stato ritirato interamente dal modello di autorizzazione runtime di KORA (founder decision: `DEMO_VIEWER = RETIRE`, non sostituito da un ruolo con un altro nome). Le superfici `/demo` e `/demo/future-vision` rimaste sono ora presentazione statica pubblica, senza alcun ruolo demo-specifico associato. Vedi `lib/architecture/registry.ts`'s `app-surface.demo` entry per il record completo del ritiro.

| Risorsa | KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | ADVISOR | Env constraint |
|---|---|---|---|---|---|---|
| Company KPI / KORA Index org | **ALLOW + audit** | ALLOW | DENY | DENY | DENY | tutti |
| Company config / source_batch | **ALLOW + audit** | ALLOW | DENY | DENY | DENY | tutti |
| Submissions / approval flow | **ALLOW + audit** | ALLOW | DENY | DENY | DENY | tutti |
| Aggregati N≥10 | ALLOW | ALLOW | ALLOW | DENY | DENY | tutti |
| Worker individual PIB | **DENY** | DENY | ALLOW (own) | DENY | DENY | tutti |
| Worker UEF individuale | **DENY** | DENY | ALLOW (own) | DENY | DENY* | tutti |
| personal.worker_pseudonym_map | **DENY** | DENY | DENY | DENY | DENY | tutti |
| HQ Operator Console | ALLOW | DENY | DENY | DENY | DENY | tutti |
| network.partner_profile / partner_identity | ALLOW | DENY | DENY | ALLOW (own) | DENY | tutti |

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

**Risolto in ROLE-01 (2026-07-04) — prima due tipi `KoraRole` non coincidenti, trovato in PILOT-SAAS-01:** il `KoraRole` usato da `canAccess()` (`lib/auth/access-matrix.ts`) dichiarava un'unione letterale indipendente (`KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | DEMO_VIEWER`, senza `ADVISOR`) che divergeva silenziosamente da `KoraRole` in `lib/types/index.ts` (derivato da `KORA_ROLES` in `lib/constants/kora.ts`, con `ADVISOR` ma senza `DEMO_VIEWER`). Entrambi derivano dalla stessa fonte canonica: `KORA_ROLES` in `lib/constants/kora.ts`. `ActiveProductRole`/`KoraUserRole` (`lib/types/index.ts`) restano un sottotipo deliberatamente distinto (per i call site che intendono "ruolo prodotto reale") — non un terzo elenco indipendente, ma un derivato di `ACTIVE_PRODUCT_KORA_ROLES`. Verificato da `tests/unit/pilot-saas-01-role-architecture-invariants.test.ts`. Vedi `docs/PILOT_SAAS_READINESS.md` e `docs/FUTURE_ROLES_AND_SURFACES.md`.

**Aggiornamento (CC-00 DEMO_VIEWER role retirement, 2026-09-26):** `DEMO_VIEWER` è stato rimosso interamente da `KORA_ROLES` — `KORA_ROLES = [...ACTIVE_KORA_ROLES, ...FUTURE_KORA_ROLES]` (5 ruoli: `KORA_ADMIN, COMPANY_ADMIN, WORKER, PARTNER, ADVISOR`). Di conseguenza `ActiveProductRole`/`KoraUserRole` ha ora la stessa membership di `KoraRole` (entrambi escludono solo ruoli che non esistono più) — i due tipi restano distinti per chiarezza semantica, non per membership divergente. `DEMO_KORA_ROLES` non esiste più; `DEMO_VIEWER` è ora elencato in `REMOVED_KORA_ROLES` insieme a `COMPANY_VIEWER`.

---

## Enforcement: Defense in Depth

Per ogni risorsa protetta, i livelli di enforcement sono **tutti e tre obbligatori**:

1. **Middleware** (`middleware.ts`) — chiama `canAccess()` per routing
2. **Server Component layout** — secondo livello, anche se middleware bypassato
3. **RLS Supabase** — layer DB, anche se l'app è compromessa

Per `worker-individual` e `pseudonym_map` in particolare: tutti e tre i livelli devono bloccare KORA_ADMIN. **Non basta uno solo.**

**Nota — `/partner` (PARTNER-01, 2026-07-04):** `network.partner_profile`/`partner_identity` restano l'unica cosa che PARTNER può leggere (riga `network.partner_profile / partner_identity` sopra, `ALLOW (own)`). `/partner` root e `/partner/workspace` sono comunque entrambi dietro lo stesso `app/partner/layout.tsx` → `requirePartnerUser()` — nessun cambiamento di enforcement qui. La modifica di questo sprint è stata solo di prodotto/routing: `/partner` root ora fa redirect a `/partner/workspace` (invece di renderizzare un dashboard 100% sintetico dietro il gate reale) e quel dashboard sintetico si trovava su `app/demo/partner/page.tsx`, gated da `requireDemoGate()` (DEMO_VIEWER/KORA_ADMIN — mai una sessione PARTNER reale). **Entrambi da allora ritirati:** `app/demo/partner/page.tsx` da CC-00 partner demo capability salvage + controlled retirement (2026-09-12); `requireDemoGate()`/`requireDemoAccess()` da CC-00 DEMO_VIEWER role retirement (2026-09-26). Vedi `docs/FUTURE_ROLES_AND_SURFACES.md` e `docs/PARTNER_WORKSPACE_FOUNDATION.md`.

**Nota — `/my-kora` (MYKORA-01, 2026-07-04):** `/my-kora` non ha un `AccessResource` dedicato in questa matrice — è una superficie PREVIEW/demo (dati sintetici only in Foundation Light), non una risorsa live coperta da `canAccess()`. `app/my-kora/layout.tsx` è comunque ora un guard server-side: legge la sessione reale (`getSessionKoraRole()`) prima di qualunque render, ammette solo WORKER e KORA_ADMIN reali, e blocca ogni altro ruolo reale (`COMPANY_ADMIN`, `PARTNER`, ...) prima che la pagina figlia venga mai renderizzata (`DEMO_VIEWER` non esiste più come ruolo reale dal 2026-09-26 — non può comunque raggiungere questo guard). Il ramo demo-visitor (nessuna sessione reale) resta client-side per design, perché serve solo persona sintetiche — non è un confine di privacy su dati reali. Vedi `docs/PILOT_SAAS_READINESS.md` e `docs/QA_STATUS.md`.

**Nota — App/API layer audit (RLS-04, 2026-07-04):** questa matrice governa l'enforcement per `AccessResource`, ma l'enforcement effettivo a livello `app/api/**` è distribuito su decine di route handler, ciascuno con il proprio guard (`requireCompanyUser`/`requireWorkerUser`/`requirePartnerUser`/`requireKoraAdmin`, tutti in `lib/auth/kora-session.ts` — `requireDemoUser`/`requireDemoAccess` sono stati ritirati da CC-00 DEMO_VIEWER role retirement, 2026-09-26). RLS-04 ha verificato staticamente che: nessuna route accetta `tenant_id`/`worker_id` da client (sempre da `app_metadata` di sessione); tutti gli usi del service-role client (bypassa RLS) sono confinati a `app/api/admin/**`, sempre dietro `requireKoraAdmin`; nessuna route worker offre un path alternativo via `requireCompanyUser`/`requirePartnerUser`; `requirePartnerUser` non è mai usato in `app/api/**` — l'enforcement PARTNER oggi vive solo a livello di pagina (`app/partner/layout.tsx`). Dettaglio completo e nuova suite di test in `docs/QA_STATUS.md` (voce "App/API tenant enforcement audit, RLS-04") e `tests/unit/rls04-app-api-tenant-enforcement.test.ts`. Non provato: comportamento runtime di una richiesta autenticata reale attraverso PostgREST/GoTrue.

**Nota — KORA_ADMIN legitimate access control (RLS-06, 2026-07-04):** RLS-03/RLS-05 sono test *negativi* (provano che un ruolo NON può leggere righe altrui); presi da soli, potrebbero mascherare un irrigidimento accidentale futuro che rompe il legittimo bypass KORA_ADMIN. RLS-06 è il controllo *positivo* complementare: chiama direttamente `canAccess()` (non un parsing testuale) per confermare che KORA_ADMIN resta `allowed` esattamente sulle 5 risorse previste (`company_kpi_kora_index`, `company_config_source_batch`, `company_submissions_approval`, `aggregates_n_ge_10`, `hq_operator_console`), che l'accesso company-scoped richiede sempre audit, che nessun altro ruolo eredita `hq_operator_console`, e che i guard `require*User()` in `lib/auth/kora-session.ts` non ammettono mai silenziosamente KORA_ADMIN in un altro ruolo (l'unica eccezione documentata era `requireDemoAccess()`, solo per il preview sintetico `/demo` — ritirata da CC-00 DEMO_VIEWER role retirement, 2026-09-26; nessuna eccezione di questo tipo resta oggi). Un test di integrazione diretto-Postgres complementare (`tests/integration/rls-kora-admin-control.test.ts`, skip-safe, `RLS06_PG_URL`/`RLS06_ALLOW_RUN`) riusa le fixture di RLS-03/05 per provare che KORA_ADMIN legge cross-tenant su `analytics.tenant`/`source_batch`/`kora_index_result`/`activation_result` MA resta a zero righe su `personal.worker_identity`/`worker_pib` (le policy admin su queste tabelle sono state rimosse dalla migration 027 — RLS-06 conferma che quella rimozione è ancora in vigore). Dettaglio completo in `docs/QA_STATUS.md` (voce "KORA_ADMIN legitimate access control, RLS-06") e `tests/unit/rls06-kora-admin-access-control.test.ts`.

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

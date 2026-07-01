# KORA Link — Staging QA Access Runbook (QA-02)

**Data:** 2026-07-01
**Branch:** `qa/kora-link-staging-access-unlock`
**Base:** `main` @ `fe42f9d` (QA-01 merged, PR #10)
**Tipo:** Audit + runbook operativo — nessuna modifica a codice, nessun write reale su Supabase, nessuna nuova feature.

---

## 1. Executive Summary

QA-01 ha identificato tre blocker per la QA browser completa di KORA Link in staging: credenziali KORA_ADMIN mancanti, credenziali PARTNER mancanti, worker di staging bloccati in `onboarding`. Questa audit (QA-02) approfondisce ciascun blocker a livello di codice e produce procedure operative sicure per sbloccarli, senza eseguire alcun write reale su Supabase in questo step (per decisione esplicita).

**Finding nuovo e più importante di QA-02:** il blocco di `/my-kora/kora-link` per sessioni WORKER reali **non dipende solo dall'onboarding**. La causa primaria è un gate di `middleware.ts` che reindirizza **sempre** le sessioni WORKER reali fuori da qualunque path `/my-kora/*`, onboarding completato o no. Questo comportamento è esplicitamente documentato nel codice come scelta Foundation Light / preview-only, con una condizione di promozione futura ("Pilot+") già scritta nel commento originale. Di conseguenza, **completare l'onboarding di un worker di staging non basta, da solo, a rendere `/my-kora/kora-link` raggiungibile in browser con una sessione WORKER reale**. La promozione di `/my-kora/*` a live è una decisione di prodotto/architettura separata, non un bugfix di QA — non è stata toccata in questo step.

Nessuna credenziale, password o token è stato creato, scritto o stampato in questo step. Tutte le procedure sotto sono dry-run/documentali, eseguibili da un operatore con accesso legittimo a Supabase.

---

## 2. Current Blockers from QA-01 — Updated Diagnosis

| Blocker (da QA-01) | Diagnosi QA-02 | Stato |
|---|---|---|
| Credenziali KORA_ADMIN staging mancanti | Confermato: nessun account KORA_ADMIN esiste in staging. Un documento pre-esistente (`docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md`, §6.7) dichiara esplicitamente *"do not create a KORA_ADMIN account in this sprint... pending separate sprint"* — la creazione è stata deliberatamente rimandata, non dimenticata. | Aperto — procedura dry-run documentata in §4 |
| Credenziali PARTNER staging mancanti | Confermato: nessuna credenziale PARTNER disponibile. Il ruolo PARTNER **è realmente implementato** (non un placeholder) — esiste `requirePartnerUser()`, `/partner/*` routing, e un'API di invito funzionante (`/api/admin/partners/[id]/invite-user`). Il vero blocco è a monte: l'API di invito richiede (a) una sessione KORA_ADMIN per chiamarla e (b) un `network.partner_profile` già esistente — entrambi non verificabili senza accesso admin. | Aperto — bloccato in catena da KORA_ADMIN; procedura dry-run in §7 |
| Worker di staging bloccato in `onboarding` | **Diagnosi rivista.** L'onboarding incompleto è reale (nessuno dei 3 worker ha mai completato il wizard `/worker/onboarding`), ma **non è la causa primaria** del blocco su `/my-kora/kora-link`. La causa primaria è `middleware.ts` righe 182-190: qualunque sessione WORKER reale che raggiunge un path `/my-kora/*` viene reindirizzata a `/worker/workspace`, **incondizionatamente**, prima ancora che la pagina o il suo layout vengano valutati. Il commento nel codice (righe 56-61) descrive questo come intenzionale: *"My KORA is PREVIEW-only in Foundation Light... Pilot+: when My KORA is promoted to live, add /my-kora/ here"*. | Aperto — due livelli distinti: (a) onboarding incompleto, sbloccabile via procedura self-service (§6); (b) gate architetturale `/my-kora/*`, **non sbloccabile senza una decisione di prodotto separata — non affrontato in questo step** |
| Gate 2 (CTO review 034/035/036) | Invariato — ancora aperto | Aperto |
| Gate 3 (DPO/legal) | Invariato — ancora aperto | Aperto |

### Nota architetturale — `/my-kora/*` live gate

- Il blocco di `/my-kora/kora-link` non dipende solo dall'onboarding worker.
- La causa primaria è il middleware (`middleware.ts:182-190`) che reindirizza sempre le sessioni WORKER reali fuori da `/my-kora/*`.
- Questo comportamento è esplicitamente documentato nel codice come scelta Foundation Light / preview-only (`middleware.ts:56-61`).
- Completare l'onboarding di un worker di staging **non è sufficiente** per validare `/my-kora/kora-link` in browser con una sessione worker reale.
- La promozione di `/my-kora/*` a live va trattata come decisione di prodotto/architettura separata — **non una correzione QA**.
- **Opzione futura possibile** (non implementata, solo annotata): creare un path live-reachable `/worker/kora-link`, coerente con il pattern già esistente `/my-kora/kora-space` + `/worker/commons` (entrambi coesistono oggi, uno preview e uno live). Questa opzione richiede una decisione di prodotto e non è stata implementata in QA-02.

---

## 3. Required Staging Roles

| Ruolo | Claims richieste (`app_metadata`) | Provisioning route ufficiale | Stato staging |
|---|---|---|---|
| `KORA_ADMIN` | `kora_role: 'KORA_ADMIN'` | Nessuna API self-service — "Manual / Supabase Dashboard" per doctrine (`docs/ACCESS_PROVISIONING_DOCTRINE.md`) | Non esiste |
| `COMPANY_ADMIN` | `kora_role: 'COMPANY_ADMIN'`, `kora_tenant_id`, `kora_status` (opz., default `active`) | `/api/admin/companies/provision` (richiede sessione KORA_ADMIN) | **Esiste e funziona** — `company-admin@staging.kora.internal` |
| `WORKER` | `kora_role: 'WORKER'`, `kora_tenant_id`, `kora_worker_id`, `kora_status` | `/api/admin/workers/provision` (richiede sessione KORA_ADMIN) | Esistono 3 account (`worker-a/b/c@staging.kora.internal`), tutti con onboarding incompleto |
| `PARTNER` | `kora_role: 'PARTNER'`, `kora_partner_id`, `kora_status` | `/api/admin/partners/[id]/invite-user` (richiede sessione KORA_ADMIN + `partner_profile` esistente) | Non esiste |

---

## 4. KORA_ADMIN Access Procedure (dry-run — non eseguito)

Non esiste un'API applicativa self-service per creare un KORA_ADMIN (per doctrine). L'unico percorso documentato nel repo (`docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §5`) è tramite Supabase Auth Admin API o Dashboard, seguendo lo stesso pattern già usato per gli account esistenti.

**Passi (da eseguire da un operatore con accesso al progetto Supabase di staging — non eseguiti in QA-02):**

1. Creare l'utente auth via Supabase Dashboard (Authentication → Users → Invite user) oppure via Admin API:
   ```
   POST {SUPABASE_URL}/auth/v1/admin/users
   apikey: <service_role_key>            # mai committare, mai stampare
   Authorization: Bearer <service_role_key>
   Content-Type: application/json

   { "email": "<scegliere-email-staging>", "email_confirm": true }
   ```
2. Impostare `app_metadata` sull'utente creato:
   ```
   PUT {SUPABASE_URL}/auth/v1/admin/users/{user_id}
   apikey: <service_role_key>
   Authorization: Bearer <service_role_key>
   Content-Type: application/json

   { "app_metadata": { "kora_role": "KORA_ADMIN" } }
   ```
3. Impostare una password tramite Dashboard (mai generarla o stamparla in una sessione AI/chat).
4. Verificare login: `/login?role_hint=admin` → atteso redirect a `/admin`.
5. Verificare accesso a `/admin/kora-link` e `/admin/kora-link-lab` → atteso status 200, nessun redirect.

**Minimo richiesto per aprire `/admin/kora-link-lab`:** solo `kora_role: 'KORA_ADMIN'` in `app_metadata` — nessun tenant, nessun worker_id, nessun claim aggiuntivo. `requireKoraAdmin()` (`lib/auth/kora-session.ts`) non richiede altro.

**Redirect atteso se non autenticato:** `/login?role_hint=admin` (verificato in KL-24).

**Nota storica:** `docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md` riporta esplicitamente *"do not create a KORA_ADMIN account in this sprint"* per lo sprint in cui è stato scritto. Questa nota va considerata superata solo con una decisione esplicita di chi possiede l'ambiente di staging — QA-02 non la sovrascrive né la esegue.

---

## 5. COMPANY_ADMIN Access Procedure (già funzionante)

Nessuna azione necessaria. `company-admin@staging.kora.internal` esiste, ha completato il proprio setup, e l'accesso a `/company/kora-link` è stato **verificato live con successo** (status 200, contenuto corretto, zero errori console propri della pagina — KL-24 e QA-01).

Redirect atteso se non autenticato: `/login?role_hint=company`.

---

## 6. WORKER Onboarding Unlock Procedure (dry-run — non eseguito)

**Causa esatta del blocco onboarding** (indipendente dal gate `/my-kora/*` di §2): `personal.worker_profile_private.onboarding_completed_at` è `NULL` per tutti e 3 gli account worker di staging. `app/worker/onboarding/page.tsx` reindirizza a `/worker/workspace` solo se questo campo è valorizzato; finché è `NULL`, il worker vede sempre il wizard di onboarding.

**Procedura self-service (100% via UI applicativa, nessun service role, nessuno script — non eseguita in QA-02 per decisione esplicita):**

1. Login come `worker-a@staging.kora.internal` (o b/c) su `/login?role_hint=worker`.
2. Il redirect naturale porta a `/worker/onboarding`.
3. Completare il wizard (`_flow.tsx`): richiede `acceptPrivacyBoundary: true` (obbligatorio), `display_name` (opzionale), `preferred_lang` (default `it`).
4. Il wizard chiama `POST /api/worker/onboarding` — write RLS-scoped alla riga del worker stesso (`worker_profile_worker_own_all`, mig 007), nessun service role, nessuna scrittura a dati di altri worker.
5. Al completamento: `onboarding_completed_at` impostato, `worker_identity.status` passa da `invited` ad `active` se era `invited`.
6. Redirect naturale a `/worker/workspace`.

**Importante:** anche dopo questa procedura, `/my-kora/kora-link` **resterà bloccato** dal gate di `middleware.ts` descritto in §2 — la procedura sopra sblocca solo le pagine `/worker/*`, non `/my-kora/*`, per una sessione WORKER reale.

**Verifica amministrativa alternativa (richiede sessione KORA_ADMIN, non eseguibile oggi):** `GET /api/admin/workers/list?tenantCode=<code>` restituisce lo stato (`invited`/`active`/`pending`/`disabled`) di ogni worker senza esporre dati personali — utile per confermare lo stato post-unlock senza accesso diretto al DB.

---

## 7. PARTNER Access Procedure or Gap

Il ruolo PARTNER **è realmente implementato**, non un placeholder:

- `requirePartnerUser()` esiste e valida `kora_role === 'PARTNER'` + `kora_partner_id` presente (`lib/auth/kora-session.ts`)
- `app/partner/layout.tsx` applica il guard server-side
- `/api/admin/partners/[id]/invite-user` è un'API funzionante che invia un vero invito Supabase e crea un record `network.partner_identity`

**Gap reale — catena di dipendenze bloccata:**

1. L'API di invito richiede una sessione KORA_ADMIN per essere chiamata (§4, non disponibile oggi).
2. L'API richiede un `network.partner_profile` **già esistente** per l'`id` passato nell'URL — non è verificabile se esiste già un partner profile di staging senza una sessione KORA_ADMIN (nessuna route pubblica per listarli).

**Dichiarazione esplicita:** *"partner QA requires role/auth completion"* — nello specifico, richiede prima §4 (KORA_ADMIN), poi la verifica/creazione di un `network.partner_profile` di staging (fuori scope per QA-02, richiede probabilmente `/api/admin/partners` POST — non ispezionato in dettaglio in questo step).

**Passi dry-run una volta disponibile KORA_ADMIN (non eseguiti):**

1. `GET /api/admin/partners` (con sessione KORA_ADMIN) → verificare se esiste già un `partner_profile` di staging.
2. Se assente, crearne uno tramite il flusso admin esistente (non ispezionato in dettaglio — fuori scope QA-02).
3. `POST /api/admin/partners/{id}/invite-user` con `{ "email": "<scegliere-email-staging>" }`.
4. Verificare login: `/login?role_hint=partner` → atteso redirect a `/partner/workspace`.
5. Verificare accesso a `/partner/kora-link` → atteso status 200 (nessun blocco middleware aggiuntivo: `PARTNER_ALLOWED_PREFIXES` include `/partner/` generico, quindi `/partner/kora-link` è già coperto — verificato via lettura codice, `middleware.ts:73-79`).

Redirect atteso se non autenticato: `/login?role_hint=partner`.

---

## 8. Claims Matrix

| Ruolo | `kora_role` | `kora_tenant_id` | `kora_worker_id` | `kora_partner_id` | `kora_status` | Verificato da |
|---|---|---|---|---|---|---|
| KORA_ADMIN | ✅ obbligatorio | — | — | — | — | `requireKoraAdmin()` |
| COMPANY_ADMIN | ✅ obbligatorio | ✅ obbligatorio | — | — | opz. (default `active`) | `requireCompanyUser()` + query `analytics.tenant.is_active` |
| WORKER | ✅ obbligatorio | ✅ obbligatorio | ✅ obbligatorio | — | opz. (default `invited`) | `requireWorkerUser()` |
| PARTNER | ✅ obbligatorio | — (mai impostato) | — | ✅ obbligatorio | opz. (default `active`) | `requirePartnerUser()` |

`kora_role` e tutte le claim sopra vivono **esclusivamente** in `app_metadata` (mai `user_metadata`, scrivibile lato client) — verificato in `lib/auth/kora-session.ts` per ogni `require*User()`.

---

## 9. Route QA Matrix

| Route | Guard | Middleware allow-list | Status QA-02 |
|---|---|---|---|
| `/admin/kora-link` | `requireKoraAdmin()` | Nessuna allow-list dedicata — KORA_ADMIN è bloccato solo da `/worker/*`, quindi `/admin/*` è sempre raggiungibile una volta autenticato | Bloccato solo da mancanza credenziali (§4) |
| `/admin/kora-link-lab` | `requireKoraAdmin()` | Idem | Bloccato solo da mancanza credenziali (§4) |
| `/company/kora-link` | `requireCompanyUser()` | Coperto dal prefix generico `/company` in `COMPANY_ALLOWED_PREFIXES` (match `startsWith`) | **Nessun blocco — verificato funzionante live** |
| `/my-kora/kora-link` | Gate client-side in `app/my-kora/layout.tsx` (ammette WORKER reale, KORA_ADMIN preview, demo visitor) | **Bloccato a monte** — `middleware.ts` reindirizza ogni sessione WORKER reale a `/worker/workspace` prima che il layout venga raggiunto (`/my-kora/` assente da `WORKER_ALLOWED_PREFIXES`) | Bloccato dal gate architetturale (§2) — non risolvibile con onboarding da solo |
| `/partner/kora-link` | `requirePartnerUser()` | Coperto dal prefix generico `/partner/` in `PARTNER_ALLOWED_PREFIXES` | Bloccato solo da mancanza credenziali (§7, a sua volta bloccato da §4) |
| `/link/[token]` | Nessuno (pubblico, feature-flag gated) | N/A — non passa dai controlli ruolo del middleware (nessun `sessionKoraRole` per visitatore anonimo) | Nessun blocco — comportamento verificato (404 safe con flag off) |
| `/link/[token]/activate` | `getCurrentWorkerUser()` interno (route handler, non middleware) | N/A | Nessun blocco strutturale — verificato (`GET` → 405, routing corretto) |

---

## 10. NFC Test Prerequisites

Per eseguire il test plan NFC manuale (definito in `docs/KORA_LINK_STAGING_READINESS_QA.md §6`) servono, in ordine:

1. **Credenziale KORA_ADMIN di staging** (§4) — prerequisito assoluto per lo step 1 del test plan (login admin, apertura Lab).
2. Un dispositivo NFC fisico + app di scrittura esterna (fuori dal perimetro software, non risolvibile da questa audit).
3. `KORA_LINK_ENABLED`, `KORA_LINK_TOKEN_SECRET`, `KORA_LINK_PUBLIC_BASE_URL` configurati nell'ambiente di staging (non verificato in QA-02 — audit valori esistente in `docs/KORA_LINK_STAGING_READINESS_QA.md §4`, nessun valore stampato).
4. **Non serve** `KORA_LINK_DB_LOOKUP_ENABLED` o `KORA_LINK_ACTIVATION_ENABLED` per il test plan base (step 1-8, 10-12) — questi restano intenzionalmente `false`.

---

## 11. What Not to Enable Yet

- `KORA_LINK_DB_LOOKUP_ENABLED=true` in staging — richiede Gate 2 (schema 034) + Gate 4 (RLS 035) + Gate 5 (staging con 034/035/036 applicati) chiusi.
- `KORA_LINK_ACTIVATION_ENABLED=true` in staging — richiede in aggiunta Gate 3 (DPO/legal, copy di consenso ancora provvisoria) + Gate 7.
- Qualunque flag KORA Link in produzione.
- Applicazione di `034_kora_link_schema.sql` / `035_kora_link_rls.sql` / `036_kora_link_rpc_functions.sql` — richiede review CTO formale (Gate 2), non fatta in nessuno step QA finora.
- Modifica di `middleware.ts` per promuovere `/my-kora/*` a live — decisione di prodotto separata, non affrontata in QA-02.

---

## 12. Manual Test Checklist After Access Is Ready

Da eseguire una volta completate le procedure di §4, §6, §7 (fuori da questo step):

| # | Test | Ruolo richiesto | Expected | Pass/Fail |
|---|---|---|---|---|
| 1 | Login KORA_ADMIN → `/admin/kora-link` | KORA_ADMIN | Control Tower carica, capability matrix visibile | ☐ Pending |
| 2 | `/admin/kora-link-lab` → genera URL demo | KORA_ADMIN | URL `/link/kl1_...` generato, nessun secret stampato | ☐ Pending |
| 3 | Login COMPANY_ADMIN → `/company/kora-link` | COMPANY_ADMIN | Già verificato ✅ | ✅ Pass (KL-24/QA-01) |
| 4 | Worker completa onboarding → `/worker/workspace` | WORKER | Redirect corretto, nessun errore | ☐ Pending |
| 5 | Worker (post-onboarding) → `/my-kora/kora-link` | WORKER | **Atteso: redirect a `/worker/workspace`** (comportamento corretto per design attuale, non un fallimento) | ☐ Pending |
| 6 | Login PARTNER → `/partner/kora-link` | PARTNER | Pagina roadmap/Track A carica, nessun dato personale | ☐ Pending |
| 7 | Anonimo → `/link/[token]` con token malformato | Nessuno | 404 safe | ✅ Pass (KL-24) |
| 8 | Anonimo → `/link/[token]/activate` GET | Nessuno | 405 | ✅ Pass (KL-24) |

---

## 13. Open Actions

1. Decisione esplicita (owner: chi possiede l'ambiente staging) su creazione account KORA_ADMIN — vedi nota storica §4.
2. Se approvata, eseguire la procedura §4 fuori da questa sessione, con credenziali gestite in modo sicuro (mai in chat, mai nel repo).
3. Eseguire la procedura self-service §6 per almeno un worker (nessuna approvazione speciale richiesta — write RLS-scoped alla propria riga).
4. Verificare/creare `network.partner_profile` di staging (richiede prima §4).
5. Decisione di prodotto separata su promozione `/my-kora/*` a live o creazione di un path parallelo `/worker/kora-link` — non urgente, non bloccante per il resto della QA.
6. Continuare Gate 2 (CTO review 034/035/036) e Gate 3 (DPO/legal) in parallelo — indipendenti da questi blocker di accesso.

---

## 14. Go / No-Go

| Flag | Valore | Motivazione |
|---|---|---|
| `KORA_ADMIN_ACCESS_READY` | **No** | Nessuna credenziale esiste; procedura documentata ma non eseguita |
| `PARTNER_ACCESS_READY` | **No** | Bloccato in catena da KORA_ADMIN; inoltre richiede verifica/creazione `partner_profile` |
| `WORKER_ONBOARDING_UNLOCK_READY` | **Sì** (procedura pronta, non eseguita) | Procedura self-service interamente definita, a basso rischio (RLS-scoped, nessun service role) — pronta per esecuzione su richiesta esplicita |
| `NFC_MANUAL_TEST_READY` | **No** | Bloccato dallo step 1 del test plan (nessuna credenziale KORA_ADMIN) |
| `DB_LOOKUP_ENABLEMENT_READY` | **No** | Gate 2/4/5 aperti |
| `ACTIVATION_ENABLEMENT_READY` | **No** | Gate 2/3/4/5/7 aperti |
| `PRODUCTION_READY` | **No** | Gate 9 e tutti i precedenti aperti |

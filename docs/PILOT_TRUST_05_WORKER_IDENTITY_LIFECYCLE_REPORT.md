# PILOT-TRUST-05 — Worker Identity Self-Reactivation Fix Report

**Sprint:** PILOT-TRUST-05 — WORKER IDENTITY SELF-REACTIVATION FIX
**Data:** 2026-07-29
**Branch:** `feature/pilot-trust-05-worker-identity-lifecycle` (partito da `main` @ `3c5d4c96707db7a14892f69be35dcaf37ed85f21`)
**Ambiente:** Supabase locale (Docker) per sviluppo/test; staging (progetto `haqf****jl`) per la validazione finale FASE 10, con disabilitazione/riattivazione temporanea di una fixture KL11 esistente. Nessun accesso a produzione.

---

## 1. Root cause

Migrazione 022 (`022_worker_rls_gaps.sql`, blocco B163, 2026-06-16) aggiunse la policy `worker_identity_worker_own_update` per sbloccare un flusso reale e tuttora attivo: un WORKER che completa l'onboarding scrive il proprio `personal.worker_identity.status` da `'invited'`/`'pending'` ad `'active'` direttamente tramite il client di sessione RLS-governato (`app/api/worker/onboarding/route.ts`, `app/api/worker/profile/route.ts` PATCH).

Il `WITH CHECK` della policy riverifica correttamente la proprietà della riga (`auth_user_id = auth.uid()`) — il commento originale dell'autore mostra che questa era una scelta deliberata e consapevole per impedire la riassegnazione della riga a un altro utente. Il `WITH CHECK` **non limita, e per costruzione non può limitare, quali ALTRE colonne cambiano o quali valori assumono** — verifica solo che la riga risultante appartenga ancora al chiamante.

---

## 2. Exploit (riprodotto, locale + confermato su staging)

Riprodotto su PostgreSQL locale con simulazione claim JWT diretta (14 scenari):

| # | Scenario | Pre-fix |
|---|---|---|
| 1 | Auto-riattivazione (`status`: disabled → active) | **VULNERABILE** |
| 2 | Modifica `tenant_id` | **VULNERABILE** |
| 3 | Modifica `auth_user_id` | Bloccato (già protetto da `WITH CHECK` esistente) |
| 4 | Modifica `worker_ref` | **VULNERABILE** |
| 5 | Transizione status arbitraria (active → disabled) | **VULNERABILE** |
| 6 | Modifica `created_at` (system-managed) | **VULNERABILE** |
| 6b | Modifica `updated_at` esplicita | Bloccato (già protetto dal trigger pre-esistente `set_updated_at()`) |
| 7-9 | Cross-worker, cross-tenant, claim `kora_worker_id` manomesso | Bloccato (isolamento per `auth_user_id` già corretto) |
| 10-13 | anon, PARTNER, COMPANY_ADMIN, KORA_ADMIN | Bloccato (nessuna policy per questi ruoli; `worker_identity_kora_admin_all` rimossa in migrazione 027) |
| 14 | `service_role` (percorso admin legittimo) | Funzionante (atteso) |

**Altri campi lifecycle modificabili pre-fix**: `tenant_id`, `worker_ref`, `created_at`, e qualunque transizione `status` (non solo la riattivazione da disabled).

Confermato su staging (fixture KL11_WORKER_A2, prima dell'applicazione della migrazione 048): tentativo di auto-riattivazione via chiamata PostgREST reale → riuscito.

---

## 3. Colonne coinvolte (classificazione, FASE 2)

| Classe | Colonne | Note |
|---|---|---|
| A. Lifecycle/amministrative | `tenant_id`, `auth_user_id`, `worker_ref`, `status` | `auth_user_id` già protetto; le altre tre non lo erano |
| B. Worker-editable | `status`, **solo** per la transizione `invited`/`pending` → `active` | Unico self-service legittimo in questa tabella; altri campi self-service (display_name, ecc.) vivono già in `personal.worker_profile_private`, tabella separata e invariata |
| C. System-managed | `id`, `created_at`, `updated_at` | `updated_at` già protetto dal trigger pre-esistente `set_updated_at()`; `created_at` non lo era |

---

## 4. Modello corretto

| OPERAZIONE | WORKER | KORA_ADMIN | COMPANY | PARTNER | SERVICE_ROLE | MOTIVAZIONE |
|---|---|---|---|---|---|---|
| SELECT propria riga | ALLOW | DENY (RLS, dal 2027) | DENY | DENY | ALLOW | Privacy hardening B168 |
| UPDATE status: invited/pending→active | ALLOW | ALLOW (service-role) | DENY | DENY | ALLOW | Unica transizione self-service legittima |
| UPDATE status: qualunque altra transizione | DENY | ALLOW (service-role) | DENY | DENY | ALLOW | Lifecycle amministrativo |
| UPDATE tenant_id / auth_user_id / worker_ref | DENY | ALLOW (service-role) | DENY | DENY | ALLOW | Mai worker-writable |
| UPDATE created_at | DENY | DENY | DENY | DENY | DENY | System-managed, immutabile |

---

## 5. Fix

Soluzione scelta (FASE 5, valutate nell'ordine indicato dal mandato): **trigger `BEFORE UPDATE`** (opzione 4) — non rimuove la policy `worker_identity_worker_own_update` (romperebbe l'onboarding), non introduce una RPC separata (avrebbe richiesto modificare le due route consumer per lo stesso identico risultato di sicurezza), non separa la tabella (sproporzionato per un solo campo lifecycle), non usa privilegi column-level (PostgREST/RLS non li supportano in modo pulito per una regola condizionale come questa).

Il trigger `personal.enforce_worker_identity_lifecycle_protection()`:
- si applica **solo** quando `kora.kora_role() = 'WORKER'` (letto dal JWT, non `current_role` — vedi nota metodologica in §8);
- per ogni altro chiamante (in particolare `service_role`) passa senza restrizioni;
- rifiuta (`RAISE EXCEPTION`) qualunque cambiamento a `tenant_id`, `auth_user_id`, `worker_ref`, `created_at`;
- rifiuta qualunque transizione di `status` eccetto `OLD.status IN ('invited','pending') AND NEW.status = 'active'`.

Nessuna modifica a GRANT/REVOKE, nessuna policy rimossa o modificata, nessun dato alterato.

---

## 6. Migrazione

`supabase/migrations/048_worker_identity_lifecycle_protection.sql` — numero verificato libero. `CREATE OR REPLACE FUNCTION` + `CREATE TRIGGER` — idempotente, nessun dato modificato. Applicata e verificata in locale (`supabase db reset` da zero, 001→048) e su staging (§9) in questo sprint. Non applicata a produzione.

Rollback: `supabase/rollback/048_rollback_048_if_needed.sql` — dichiara esplicitamente che ripristina lo stato vulnerabile, mai eseguito automaticamente.

---

## 7. Test

### RLS-10 (`tests/integration/rls-10-worker-identity-lifecycle.test.ts`)
21 test (20 richiesti + 1 guard), PostgreSQL reale. **7/21 falliscono correttamente contro il codice pre-048** (rollback temporaneo applicato e ripristinato solo in locale) — prova che sono guard di regressione reali. Copertura: auto-riattivazione negata; `tenant_id`/`auth_user_id`/`worker_ref`/`created_at` protetti; transizioni status arbitrarie negate; cross-worker/cross-tenant/claim manomesso negati (isolamento pre-esistente, riconfermato); worker sospeso/tenant sospeso — l'exploit resta negato indipendentemente da questi stati; ANON/PARTNER/COMPANY_ADMIN negati; KORA_ADMIN coerente col modello (nessuna policy RLS diretta, 0 righe); `service_role` percorso amministrativo legittimo funzionante; 0 side effect; stato DB coerente con `requireWorkerUser()` dopo il tentativo fallito; worker valido non regredisce; l'unica transizione self-service prevista funziona.

Aggiunta al job Docker CI insieme a RLS-03..09. **Skipped nel job DB: 0** (108/108 test combinati RLS-03..10 passano).

**Manutenzione correlata**: il test 6b di RLS-09 (PILOT-TRUST-04), che documentava questo stesso bug come "finding fuori perimetro, non corretto", è stato aggiornato per riflettere la correzione — ora conferma che l'auto-riattivazione è bloccata, con riferimento incrociato a questo sprint.

### Comportamentali/regressione (FASE 8)
Suite esistenti (`b104-worker-provisioning`, `b113-worker-onboarding`, `pilot-trust-04-worker-tenant-suspension`, ecc. — 410 test) invariate. Verifica end-to-end reale (dev server locale, sessione worker reale, non mock): `POST /api/worker/onboarding` transizione `invited → active` riuscita (200, `ok: true`), `/worker/workspace` e `/worker/commons` caricano correttamente per il worker risultante — nessuna regressione sul flusso legittimo.

---

## 8. Nota metodologica e limite non corretto

Durante la scrittura di RLS-10 è emerso che questa specifica istanza locale di Postgres, dopo cicli `BEGIN`/`set_config(..., true)`/`ROLLBACK` ripetuti sulla stessa connessione, lascia `request.jwt.claims` come stringa vuota (non `NULL`) invece di ripristinare lo stato precedente — `kora.kora_role()` (funzione pre-esistente, condivisa in tutto il codebase, non modificata in questo sprint) fallisce il cast `::jsonb` in quel caso specifico. Verificato che questo **non si presenta mai in una chiamata PostgREST reale** (che imposta sempre un JSON valido) né in una connessione `postgres` realmente fresca (dove il default è correttamente `NULL`) — è un artefatto del riuso della stessa connessione nel test harness. Corretto nel test harness stesso (simulazione più accurata del claim `role: service_role` reale), non nel codice applicativo. Segnalato qui come limite noto di `kora.kora_role()`, non corretto in questo sprint (mandato: "minimo intervento possibile").

---

## 9. Staging validation

Migrazione 048 applicata a staging tramite flusso canonico (`supabase db push --linked`) — verificato `Remote database is up to date` post-apply. Fixture KL11_WORKER_A2 usata (nessun dato reale):

1. Mapping disabilitato via percorso diretto/amministrativo (nessuna route admin dedicata esiste oggi — confermato in FASE 2).
2. Sessione WORKER reale (login reale, non simulato) → tentativo di auto-riattivazione via chiamata PostgREST reale → **negato** (`"this status transition is not worker-writable..."`).
3. Verificato `/worker/workspace` (dev server locale puntato a staging) → **bloccato**, redirect a `/login`.
4. Riattivazione tramite percorso amministrativo legittimo (`service_role`) → riuscita.
5. Verificato `/worker/workspace` → **operativo**, redirect a `/worker/onboarding` (normale, non `/login`).
6. Stato ripristinato esattamente all'originale (`active`) in `finally`.
7. Fixture check (`check-staging-fixtures.ts`) rieseguito: `overall_coherent: true`. Nessuna riga temporanea residua.

---

## 10. Cleanup

Tutte le fixture locali (tenant/worker sintetici RLS-10 e FASE 8) rimosse a fine test. Su staging, nessuna fixture nuova creata (solo toggle temporaneo di `status` su una riga permanente KL11, ripristinato). Dev server locale e puntato-a-staging arrestati esplicitamente al termine di ogni fase. Nessun file `.env` modificato o committato.

## 11. Limiti

- Vedi §8 per la fragilità pre-esistente, non corretta, di `kora.kora_role()` in scenari di connessione riutilizzata senza claim JWT validi — irrilevante in produzione (PostgREST imposta sempre claim validi), rilevante solo per harness di test che riusano una connessione.
- Non esiste oggi alcuna route amministrativa dedicata per sospendere/riattivare un mapping worker — sia la riproduzione locale che la validazione su staging hanno usato l'accesso diretto (`service_role`/SQL), come già osservato in PILOT-TRUST-02 e PILOT-TRUST-04.
- Il fix non tocca in alcun modo `personal.worker_profile_private` (i campi self-service reali del worker) — restano invariati e fuori perimetro.

## 12. Produzione non coinvolta

Confermato — nessuna connessione, query, o comando eseguito contro produzione in questo sprint. Solo staging (fixture KL11, disabilitazione/riattivazione reversibile, una migrazione) e locale.

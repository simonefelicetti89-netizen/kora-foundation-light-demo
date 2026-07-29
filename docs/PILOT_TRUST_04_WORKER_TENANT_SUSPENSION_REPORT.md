# PILOT-TRUST-04 — Worker Tenant Suspension Enforcement Report

**Sprint:** PILOT-TRUST-04 — WORKER TENANT SUSPENSION ENFORCEMENT
**Data:** 2026-07-29
**Branch:** `feature/pilot-trust-04-worker-tenant-suspension` (partito da `main` @ `423206d67a397c1fe278af47fcfc9e42be01311a`)
**Ambiente:** Supabase locale (Docker) per sviluppo/test; staging (progetto `haqf****jl`) solo per la validazione finale FASE 9, con sospensione/ripristino temporaneo di una fixture KL11 esistente. Nessun accesso a produzione.

---

## 1. Root cause

`requireWorkerUser()` (`lib/auth/kora-session.ts`) validava solo i claim presenti nel JWT (`kora_role`, `kora_tenant_id`, `kora_worker_id`, `kora_status`) senza mai interrogare il database per verificare che:

1. il tenant referenziato esistesse davvero e fosse `is_active = true`;
2. il mapping `personal.worker_identity` esistesse davvero, fosse attivo, e appartenesse effettivamente al tenant dichiarato nel claim.

Il confronto diretto con `requireCompanyUser()` (stessa funzione, stesso file) mostra l'asimmetria esatta: quest'ultima, dopo aver validato i claim, esegue una query `analytics.tenant` e blocca esplicitamente se `!tenantRow.is_active`. `requireWorkerUser()` non aveva alcun equivalente — né per il tenant, né per il mapping worker.

---

## 2. Comportamento pre-fix (riprodotto, locale + confermato su staging)

| Scenario | Comportamento osservato |
|---|---|
| WORKER attivo + tenant attivo | Accesso consentito (corretto) |
| **WORKER attivo + tenant SOSPESO** | **Accesso consentito** — `/worker/workspace` 200, `/worker/commons` 200, API worker 200 |
| WORKER con `kora_status=disabled` | Bloccato (comportamento pre-esistente, corretto, invariato) |
| **Mapping `worker_identity.status=disabled`** | **Accesso consentito** — nessun effetto |
| **Tenant claim manomesso (tenant inesistente)** | **Accesso consentito** — nessuna verifica di esistenza |
| **Worker claim manomesso** | **Accesso parzialmente incoerente** — pagine 200, ma la route `/api/worker/profile` restituiva 404 come effetto collaterale della propria query (non un controllo di sicurezza deliberato) |
| **Mapping cross-tenant (claim tenant A, mapping reale tenant B)** | **Accesso consentito** — nessun controllo di coerenza claim↔mapping |
| anon | Bloccato (invariato) |
| KORA_ADMIN / COMPANY_ADMIN / PARTNER | Reindirizzati fuori da `/worker/*` (invariato — gestito da `middleware.ts` e dal blocco esplicito in `app/worker/layout.tsx`) |

Riprodotto su Supabase locale con 11 fixture sintetiche (4 scenari worker principali + tenant claim manomesso + worker claim manomesso + mapping cross-tenant + 4 ruoli diversi), verificato su `requireWorkerUser()`, `/worker/workspace`, `/worker/commons`, `/api/worker/profile`.

---

## 3. Correzione

Modifica minima a `requireWorkerUser()` (`lib/auth/kora-session.ts`), dopo i controlli esistenti su ruolo/claim/`kora_status` (invariati):

1. Query `personal.worker_identity` per `id = workerId` (claim) → deve esistere, il suo `tenant_id` deve corrispondere esattamente al `tenantId` del claim, e il suo `status` non deve essere `'disabled'`.
2. Query `analytics.tenant` per `id = tenantId` → deve esistere ed essere `is_active = true`.
3. Qualunque condizione non soddisfatta → **un unico messaggio generico** (`"Accesso non disponibile. Contatta il tuo amministratore."`, HTTP 403) — la ragione specifica (tenant sospeso vs. mapping disabilitato vs. mapping non trovato vs. mismatch tenant) non è mai esposta al chiamante, per evitare che un worker deduca lo stato del proprio datore di lavoro.
4. Errore di connessione/query → HTTP 500 (fail-closed, mai un accesso silenzioso).

Coerenza con `requireCompanyUser()`: stesso client (`getSupabaseServiceClient()`), stesso schema di query (`.schema().from().select().eq().maybeSingle()`), stesso principio "tenant verificato server-side, mai fidarsi del client". Nessuna funzione condivisa estratta: la logica di company (una sola query, tenant) e quella di worker (due query, mapping + tenant) non erano sufficientemente sovrapponibili da giustificare un'astrazione senza ampliare lo scope, come esplicitamente richiesto dal mandato.

---

## 4. Differenza auth guard vs RLS

Argomento centrale della suite RLS-09 (§7): la RLS su `personal.worker_identity` (policy `worker_identity_worker_own_select`, migrazione 007) **non verifica e non deve verificare** lo stato del tenant o del mapping — il suo compito è isolamento per **ownership** (`auth_user_id = auth.uid()`), non lifecycle. Verificato empiricamente: un worker con tenant sospeso o mapping disabilitato **può ancora leggere la propria riga via RLS diretta** — questo non è un difetto, è esattamente il confine di responsabilità: l'**auth guard applicativo** (`requireWorkerUser()`, corretto in questo sprint) blocca il lifecycle **prima** che una richiesta reale raggiunga mai una query RLS-governata; la RLS blocca l'accesso cross-owner/cross-tenant (verificato in RLS-05/06/07/09).

**Scoperta collaterale, fuori perimetro, documentata non corretta** (vedi §8 Limiti): esiste una policy `worker_identity_worker_own_update` (aggiunta dopo la migrazione 007, confermata via `pg_policies` diretta, non presente nella migrazione 007 che avevo letto per la ricostruzione iniziale) che permette a un WORKER di aggiornare la propria riga `worker_identity` — inclusi, potenzialmente, i campi `status`/`tenant_id`, poiché la clausola `with_check` verifica solo la proprietà della riga, non quali colonne cambiano. Verificato: un worker con mapping disabilitato può riattivare il proprio `status` a `'active'` tramite una `UPDATE` diretta (es. via PostgREST), bypassando l'auth guard applicativo. **Non corretto in questo sprint** (mandato esplicito: "non correggere altri finding") — segnalato come raccomandazione per un prossimo sprint dedicato.

---

## 5. Test

### Comportamentali (`tests/unit/pilot-trust-04-worker-tenant-suspension.test.ts`)
18 test, mock solo al confine I/O (`@/lib/supabase/server`), codice reale (`requireWorkerUser()`, `app/worker/layout.tsx`, `app/worker/commons/page.tsx`, `GET /api/worker/profile`) mai mockato. Verificato che **10/18 test falliscono contro il codice pre-fix** (stash temporaneo, ripristinato) — prova che sono guard di regressione reali, non tautologie.

Copertura: worker valido → PASS; tenant sospeso → DENY (403, nessun leak nel messaggio); worker sospeso → DENY (invariato); mapping disabilitato → DENY; tenant claim manomesso → DENY; worker claim manomesso → DENY; mapping cross-tenant → DENY; anon → DENY (401); COMPANY_ADMIN/PARTNER/KORA_ADMIN/DEMO_VIEWER → DENY; errore DB → 500 fail-closed; nessun side effect (query contate); `/worker/workspace` e `/worker/commons` bloccati per tenant sospeso; API worker bloccata senza mai raggiungere la logica di lookup profilo; nessuna regressione per worker valido.

### RLS-09 (`tests/integration/rls-09-worker-tenant-suspension.test.ts`)
10 test, PostgreSQL locale reale, stesso meccanismo di simulazione claim di RLS-03/05/06/07/08. Documenta esplicitamente il confine auth-guard/RLS (§4): tenant attivo → coerente; tenant sospeso → RLS non nega (per design, documentato); cross-owner → negato (isolamento reale); mapping disabilitato → RLS non nega (per design, documentato); claim manomesso → nessun effetto sulla policy own-row (dipende solo da `auth_user_id`); scrittura UPDATE → permessa da una policy reale (verificata, non assunta) con relativa segnalazione del rischio di auto-riattivazione; scrittura DELETE → negata (nessun GRANT); 0 righe residue a fine suite.

Aggiunta al job Docker CI obbligatorio (`.github/workflows/ci.yml`), insieme a RLS-03/05/06/07/08. **Skipped nel job DB: 0** (verificato: 87/87 test passano, 0 skip, sull'esecuzione combinata locale).

---

## 6. Staging validation

Fixture KL11 utilizzate, nessun dato reale. Metodo: `UPDATE analytics.tenant SET is_active = false WHERE id = <KL11_TENANT_A>`, diretto e reversibile, stesso meccanismo che l'applicazione stessa userebbe per una sospensione reale.

Dev server locale puntato esplicitamente a Supabase **staging** (stessa tecnica già usata negli sprint precedenti — nessun URL applicativo staging affidabile è risultato raggiungibile: l'unico riferimento documentato, `kora-staging.vercel.app`, risolve a un'app di terzi non correlata, verificato in PILOT-TRUST-03).

| Chiamante | Esito |
|---|---|
| KL11_WORKER_A1 (tenant A, ora SOSPESO) | `/worker/workspace` → 307 → `/login`; `/worker/commons` → 307 → `/login` — **BLOCCATO** |
| KL11_WORKER_B1 (tenant B, ancora ATTIVO) | `/worker/workspace` → 307 → `/worker/onboarding` (normale, non `/login`) — **OPERATIVO** |
| KL11_COMPANY_ADMIN_A (tenant A, ora SOSPESO) | `/company/workspace` → 307 → `/login?role_hint=company` — **BLOCCATO, coerente** |

Nessun contenuto di risposta è mai stato letto (solo status HTTP e header `Location`). Tenant ripristinato (`is_active = true`) in `finally`, verificato identico allo stato iniziale. Fixture check (`check-staging-fixtures.ts`) rieseguito post-ripristino: `overall_coherent: true`. Nessuna riga nuova creata in questa fase (solo un flag esistente alternato e ripristinato) — residue: 0.

---

## 7. Cleanup

Tutte le fixture locali (11 utenti sintetici + 2 tenant + relative righe `worker_identity`) rimosse a fine FASE 3/5. Nessuna fixture di staging creata in FASE 9 (solo toggle temporaneo su una riga permanente KL11, ripristinato). Dev server locale e puntato-a-staging arrestati esplicitamente al termine di ogni fase. Nessun file `.env` modificato o committato.

---

## 8. Limiti

- **Non corretto in questo sprint** (fuori mandato): la policy `worker_identity_worker_own_update` permette a un WORKER di modificare la propria riga `worker_identity`, incluso potenzialmente `status`/`tenant_id`, senza restrizione a livello di colonna — un worker con mapping disabilitato potrebbe auto-riattivarsi bypassando l'auth guard. Riprodotto e documentato in RLS-09 (test 6b). **Raccomandato come oggetto di un prossimo sprint dedicato** (candidato naturale: PILOT-TRUST-05).
- Non esiste oggi alcuna interfaccia applicativa per sospendere un tenant (nessuna route scrive `is_active=false`) — sia la riproduzione locale che la validazione su staging hanno impostato il flag direttamente via SQL, come già osservato in PILOT-TRUST-02.
- Nessun deployment web di staging affidabile è stato identificabile per un test end-to-end HTTP "esterno" — la validazione FASE 9 ha usato un dev server locale puntato al database di staging reale (stessa tecnica, stessi limiti, già documentati negli sprint precedenti).
- Il messaggio di errore generico introdotto (`"Accesso non disponibile..."`) è deliberatamente meno specifico di quello usato da `requireCompanyUser()` (che dichiara esplicitamente "Workspace aziendale sospeso") — scelta consapevole per questo fix, non un'incoerenza: minimizzare l'esposizione di informazioni sullo stato del datore di lavoro verso il worker.

## 9. Produzione non coinvolta

Confermato — nessuna connessione, query, o comando eseguito contro produzione in questo sprint. Solo staging (fixture KL11, sospensione/ripristino reversibile, nessuna migrazione) e locale.

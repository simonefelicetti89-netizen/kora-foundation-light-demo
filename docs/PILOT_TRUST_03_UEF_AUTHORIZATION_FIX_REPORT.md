# PILOT-TRUST-03 — UEF SECURITY DEFINER Authorization Fix Report

**Sprint:** PILOT-TRUST-03 — UEF SECURITY DEFINER AUTHORIZATION FIX
**Data:** 2026-07-29
**Branch:** `feature/pilot-trust-03-uef-auth-fix` (partito da `main` @ `527cc3d09d5c589750852f2ac7ba3bbabbf1a6d1`)
**Ambiente:** Supabase locale (Docker) + fixture sintetiche. Nessun accesso a staging o produzione.

---

## 1. Executive summary

L'audit PILOT-TRUST-02 aveva classificato REAL-CRITICAL un bypass di autorizzazione nelle 4 funzioni `SECURITY DEFINER` che governano `analytics.uef_record`. Questo sprint ha:

1. Ricostruito integralmente le 4 funzioni e riprodotto l'exploit con evidenza empirica (10 scenari, PostgreSQL locale reale).
2. Determinato un modello di autorizzazione corretto per ciascuna funzione, basato sui consumer reali, non sul solo `GRANT` SQL.
3. Identificato la causa radice esatta: `current_role`, all'interno di una funzione `SECURITY DEFINER`, è sempre il *proprietario* della funzione (`postgres`) — mai il chiamante reale — per qualunque chiamante, confermato con chiamate PostgREST reali (non solo simulazione).
4. Applicato la correzione minima: una nuova funzione helper `kora.is_service_role_context()` che legge il claim JWT `role` di primo livello (un GUC di sessione, immune allo swap di ruolo di `SECURITY DEFINER`) al posto di `current_role`.
5. Creato la migrazione 047, il rollback 047, la suite comportamentale RLS-08 (32 test + 1 guard, PostgreSQL reale), verificato che la suite fallisce sul codice pre-047 (18/33 fallimenti) e passa integralmente post-047 (33/33).
6. Verificato l'assenza di regressioni sul golden path (l'unico consumer applicativo reale, `GET /api/admin/uef/review`, chiamato end-to-end via HTTP reale con sessione KORA_ADMIN reale).
7. Eseguito l'intera validazione locale richiesta (17 punti) — tutti PASS.

**Nessuna modifica a staging o produzione in questo sprint.**

---

## 2. Root cause

All'interno di una funzione `SECURITY DEFINER`, PostgreSQL esegue il corpo della funzione con i privilegi del *proprietario* della funzione — questo è comportamento documentato e standard (PostgreSQL, `CREATE FUNCTION`, sezione Security). Una conseguenza meno nota ma ugualmente documentata: **`current_role`/`current_user`, letti dall'interno del corpo della funzione, riflettono il proprietario, non il chiamante originale**, per l'intera durata dell'esecuzione della funzione.

Le 4 funzioni introdotte dalla migrazione 030 usavano:

```sql
current_role NOT IN ('service_role', 'postgres')   -- (o la forma IN)
```

come condizione per un bypass di autorizzazione "contesto server fidato". Essendo `current_role` sempre `postgres` (il proprietario) all'interno di queste funzioni, **questa condizione è sempre falsa per ogni chiamante**, rendendo l'intero blocco di controllo autorizzativo codice morto.

**Confermato empiricamente con chiamate PostgREST reali (non simulazione), tramite una funzione di debug dedicata:**

| Chiamante reale | `session_user` | claim JWT `role` | `current_role` dentro la funzione |
|---|---|---|---|
| anon | `authenticator` | `anon` | `postgres` |
| authenticated (JWT utente reale) | `authenticator` | `authenticated` | `postgres` |
| service_role | `authenticator` | `service_role` | `postgres` |

Sia `session_user` sia `current_role` risultano **inutili** per distinguere il chiamante reale in questo contesto: il primo è sempre il ruolo fisso di autenticazione di PostgREST, il secondo è sempre il proprietario della funzione. L'unico segnale affidabile, GUC-based e immune allo swap di `SECURITY DEFINER`, è il claim `role` di primo livello nel JWT (`current_setting('request.jwt.claims', true)::jsonb ->> 'role'`) — lo stesso meccanismo già usato correttamente da `kora.kora_role()` e `kora.tenant_id()` in questo schema.

---

## 3. Funzioni vulnerabili

Tutte in `analytics`, introdotte dalla migrazione 030 (`030_uef_admin_access_hardening.sql`), corrette dalla migrazione 047.

| Funzione | Firma | Operazione | Owner | Grant pre-047 | Grant post-047 |
|---|---|---|---|---|---|
| `fn_admin_uef_review` | `(p_batch_id uuid) RETURNS TABLE(...)` | SELECT (lettura, `payload` escluso) | `postgres` | `authenticated`, `service_role` (no `anon`, no `PUBLIC` da mig. 031) | invariato |
| `fn_admin_uef_update_review` | `(p_uef_id uuid, p_action text, p_notes text, p_reviewer text) RETURNS void` | UPDATE (approve/reject/needs_info) | `postgres` | idem | invariato |
| `fn_admin_uef_enrich` | `(p_uef_id uuid, p_enrichment_fields jsonb, p_reviewer text) RETURNS void` | UPDATE (arricchimento payload, whitelist) | `postgres` | idem | invariato |
| `fn_advisor_uef_read` | `(p_tenant_id uuid) RETURNS TABLE(...)` | SELECT (lettura tenant-scoped, `payload` escluso) | `postgres` | idem | invariato |

Tutte con `SET search_path = analytics, kora, public` esplicito (invariato). Nessuna modifica a firme, tipi di ritorno, whitelist campi, o `GRANT`/`REVOKE` — solo la logica del controllo autorizzativo interno è stata sostituita.

---

## 4. Exploit riprodotto

Tutti gli scenari eseguiti su PostgreSQL locale reale (simulazione claim JWT via `SET LOCAL ROLE` + `set_config('request.jwt.claims', ...)`, stesso meccanismo di RLS-03/05/06/07), transazioni con `ROLLBACK`/`SAVEPOINT`, fixture sintetiche rimosse a fine esecuzione.

| # | Scenario | Pre-047 | Post-047 |
|---|---|---|---|
| 1 | WORKER legge UEF non proprio (`fn_advisor_uef_read`) | **VULNERABILE — riga letta, `raw_name` esposto** | Bloccato (`ADVISOR role required`) |
| 2 | WORKER scrive/modifica UEF non autorizzato (`fn_admin_uef_update_review`) | **VULNERABILE — `review_status` mutato da `pending` ad `approve`** | Bloccato (`KORA_ADMIN required`) |
| 3 | WORKER con tenant claim manomesso/inesistente | **VULNERABILE** | Bloccato |
| 4 | WORKER senza mapping valido (nessun claim `kora_worker_id`) | **VULNERABILE** | Bloccato |
| 5a | anon | Bloccato (mancanza GRANT schema, invariato) | Bloccato |
| 5b | authenticated generico (nessun claim `kora_role`) | **VULNERABILE** | Bloccato |
| 6 | PARTNER | **VULNERABILE** | Bloccato |
| 7a | COMPANY_ADMIN lettura | **VULNERABILE** | Bloccato |
| 7b | COMPANY_ADMIN scrittura (`fn_admin_uef_enrich`) | **VULNERABILE — payload mutato** | Bloccato |
| 8 | KORA_ADMIN legittimo, lettura | Funzionante (atteso) | Funzionante (invariato) |
| 9 | KORA_ADMIN legittimo, scrittura | Funzionante (atteso) | Funzionante (invariato) |

**Riepilogo exploit lettura pre-fix: PASS (riprodotto con successo, cioè la vulnerabilità è confermata riproducibile).**
**Riepilogo exploit scrittura pre-fix: PASS (riprodotto con successo).**
**Riepilogo cross-tenant pre-fix: PASS (riprodotto — nessun controllo di tenant applicato dentro il bypass rotto).**

Post-fix: **0 scenari vulnerabili su 9** (i restanti 2 sono i controlli positivi KORA_ADMIN, che devono e continuano a funzionare).

---

## 5. Impatto

- **Confidenzialità**: qualunque ruolo autenticato (inclusi ruoli senza alcun claim `kora_role`) poteva leggere dati UEF di qualunque tenant tramite chiamata RPC diretta a `fn_advisor_uef_read`, bypassando interamente l'applicazione Next.js.
- **Integrità**: lo stesso principio si applicava alle 2 funzioni di scrittura (`fn_admin_uef_update_review`, `fn_admin_uef_enrich`) — un chiamante non autorizzato poteva approvare/rifiutare record di revisione o alterare campi di arricchimento payload per qualunque tenant.
- **Superficie reale**: le 4 funzioni hanno `GRANT EXECUTE` a `authenticated` (necessario per i consumer legittimi) — questo le rende raggiungibili da **qualunque sessione autenticata**, tramite l'endpoint RPC standard di PostgREST (`POST /rest/v1/rpc/<funzione>`), indipendentemente da cosa fa o non fa il codice applicativo Next.js.
- **Consumer applicativi reali oggi**: di 4 funzioni, solo **`fn_admin_uef_review`** è effettivamente chiamata da una route esistente (`GET /api/admin/uef/review`, via `.rpc()`). Le altre 3 (`fn_admin_uef_update_review`, `fn_admin_uef_enrich`, `fn_advisor_uef_read`) non sono chiamate da alcuna route applicativa oggi — restano comunque pienamente vulnerabili a chi le invoca direttamente via RPC, un vettore che non richiede di passare dall'interfaccia dell'app.

---

## 6. Authorization matrix

Determinata da: commenti originali di migrazione 030/031 (ripetuti, coerenti), `CLAUDE.md` §13 ("Employer roles MUST NEVER see... Individual UEF records"), commento originale in migrazione 001 ("No COMPANY_ADMIN policy — employers see only aggregated outputs"), assenza di `requireAdvisorUser()`/`app/advisor/*` in `lib/auth/kora-session.ts` (ADVISOR non è un ruolo con sessione live nel codebase attuale), assenza di qualunque consumer WORKER/PARTNER nei route/servizi.

| FUNZIONE | KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | SERVICE_ROLE | MOTIVAZIONE |
|---|---|---|---|---|---|---|
| `fn_admin_uef_review` | ALLOW | DENY | DENY | DENY | ALLOW | Dato pipeline/operativo — CLAUDE.md §13, commento migrazione 001/030 |
| `fn_admin_uef_update_review` | ALLOW | DENY | DENY | DENY | ALLOW | Azione di scrittura — più restrittiva della lettura, stesso principio |
| `fn_admin_uef_enrich` | ALLOW | DENY | DENY | DENY | ALLOW | Azione di scrittura — whitelist campi già presente e invariata |
| `fn_advisor_uef_read` | **DENY** (via JWT) | DENY | DENY | DENY | ALLOW | ADVISOR (proprio tenant) è l'unico percorso JWT nel design originale — mai esteso a KORA_ADMIN via JWT nel codice originale. ADVISOR non ha oggi un percorso di sessione live (`requireAdvisorUser()` non esiste) — la correzione preserva l'intento originale già scritto nel codice, senza aggiungere nuovo accesso |

Nessuna decisione di prodotto mancante — la matrice è stata determinata con certezza dai sorgenti sopra elencati, senza necessità di fermarsi con BLOCKED.

---

## 7. Fix applicato

Nuova funzione helper, unica fonte di verità per il "contesto service_role fidato":

```sql
CREATE OR REPLACE FUNCTION kora.is_service_role_context()
  RETURNS boolean LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role', ''
  ) = 'service_role';
$$;
```

In ciascuna delle 4 funzioni, `current_role NOT IN ('service_role','postgres')` (o la forma `IN`) è stato sostituito con `NOT kora.is_service_role_context()` (o `kora.is_service_role_context()`). Nessun'altra riga di logica applicativa, whitelist, o firma è stata toccata. Il branch `'postgres'` è stato rimosso deliberatamente: era anch'esso sempre vero all'interno del contesto `SECURITY DEFINER` per lo stesso identico motivo, quindi non identificava mai realmente "una sessione psql diretta come superuser" — riaggiungerlo con `session_user = 'postgres'` avrebbe reintrodotto un bypass sfruttabile da chiunque avesse accesso diretto al DB, e avrebbe rotto la tecnica di simulazione claim (connessione diretta come `postgres` + `SET LOCAL ROLE`) già usata da tutta la suite RLS-03/05/06/07/08 esistente.

Fail-closed: in assenza di `request.jwt.claims` (nessun contesto JWT), `kora.is_service_role_context()` restituisce `false` (mai `NULL`), quindi il ramo di bypass non si attiva mai per errore.

---

## 8. Migrazione

`supabase/migrations/047_uef_security_definer_authorization_fix.sql` — numero verificato libero (non presente, non nella lista dei numeri ritirati `[29,37,38,40,41,43,44]`). `CREATE OR REPLACE FUNCTION` per tutte e 4 le funzioni + la nuova funzione helper — idempotente, nessun dato modificato, nessun nuovo oggetto estraneo. Applicata e verificata **solo in locale** in questo sprint (`supabase db reset` da zero, 001→047, pulito). Non applicata a staging né produzione.

Rollback: `supabase/rollback/047_rollback_047_if_needed.sql` — ripristina esplicitamente lo stato vulnerabile pre-047 (dichiarato con avvisi espliciti nel file stesso), mai eseguito automaticamente, non incluso nel percorso forward.

---

## 9. Grant/revoke

**Nessuna modifica** — confermato dalla suite RLS-08 (test 29-32): `EXECUTE` resta a `authenticated` + `service_role` + `postgres` (owner) su tutte e 4 le funzioni, nessun grant a `anon`, nessun grant a `PUBLIC`. Il bug era interamente nella logica interna delle funzioni, non nel `GRANT` — coerente con quanto già determinato nell'audit PILOT-TRUST-02 (i grant erano già least-privilege dalla migrazione 031).

---

## 10. Test negativi (RLS-08, PostgreSQL reale)

17 test — ANON, authenticated generico, WORKER (lettura, scrittura, tenant manomesso, mapping assente, mapping fabbricato), PARTNER, COMPANY_ADMIN (lettura, scrittura, cross-tenant), KORA_ADMIN dove il modello non concede accesso via JWT, parametro tenant manomesso, chiamata RPC reale non autorizzata (PostgREST end-to-end, non solo simulazione), verifica assenza side-effect, verifica assenza righe parziali, verifica assenza leakage nei messaggi di errore. **17/17 PASS post-047.**

## 11. Test positivi

7 test — ADVISOR legge solo il proprio tenant, KORA_ADMIN scrive esattamente quanto previsto, tenant resolution corretta, `service_role` (claim JWT `role` di primo livello, nessun `app_metadata.kora_role`) consentito su tutte e 4 le funzioni, KORA_ADMIN non dipende da alcun claim `kora_status`, forma golden-path (`approved_for_impact_units` calcolato correttamente), forma colonne del consumer esistente invariata (`payload` ancora escluso). **7/7 PASS.**

## 12. Test cross-tenant

4 test — tenant A (ADVISOR) non legge tenant B, ADVISOR non ha alcun percorso di scrittura su nessun tenant, claim tenant A + parametro tenant B negato con eccezione esplicita, simmetrico claim B + parametro A. **4/4 PASS.**

Più 4 test di GRANT (sezione 9) e 1 test guard (host locale). **Totale RLS-08: 33/33 PASS.**

**Verifica regressione**: la stessa suite, eseguita contro lo stato pre-047 (rollback temporaneo applicato solo in locale, poi ripristinato), fallisce **18 test su 33** — prova diretta che la suite è un guard comportamentale reale, non un test statico che passerebbe comunque.

---

## 13. Regressione golden path

Consumer reali identificati per lettura diretta del codice (non per ipotesi):

- `fn_admin_uef_review` → **unico consumer applicativo reale**: `GET /api/admin/uef/review` (`app/api/admin/uef/review/route.ts`), via `.rpc('fn_admin_uef_review', ...)`, dopo `requireKoraAdmin()`.
- `fn_admin_uef_update_review` → **nessun consumer applicativo oggi**. La route POST corrispondente (`app/api/admin/uef/review/route.ts`) esegue un `UPDATE` diretto via `getSupabaseServiceClient()` con logica propria — il commento nel codice conferma: "switch to `fn_admin_uef_update_review()` è uno step separato post-031, mai completato".
- `fn_admin_uef_enrich` → **nessun consumer applicativo oggi**. La route `app/api/admin/uef/enrich/route.ts` usa `getSupabaseServiceClient()` con whitelist propria in TypeScript, non la funzione RPC.
- `fn_advisor_uef_read` → **nessun consumer applicativo oggi**, nessuna route ADVISOR live esiste.

**Verifica end-to-end reale eseguita** (dev server locale puntato a Supabase locale, sessione KORA_ADMIN reale via password-grant + cookie, non mock): `GET /api/admin/uef/review?batchId=...` → **200**, corpo con le chiavi attese (`ok`, `batchId`, `candidates`, `summary`), campo `payload` correttamente assente. **Nessuna regressione.**

Nessun consumer richiede oggi un privilegio che violi il modello privacy — non è stato necessario dichiarare BLOCKED.

---

## 14. Limiti

- Solo 1 delle 4 funzioni ha un consumer applicativo reale oggi — la copertura di non-regressione per le altre 3 si basa sulla suite RLS-08 (comportamentale, PostgreSQL reale) e non su un test end-to-end HTTP dedicato, poiché non esiste alcuna route che le invochi.
- Non è stato verificato se lo stesso pattern (`current_role NOT IN (...)`) sia presente in altre funzioni `SECURITY DEFINER` del codebase al di fuori del dominio UEF — esplicitamente fuori perimetro per questo sprint isolato (mandato: "Non correggere... altri finding"). Fortemente raccomandato come prossimo controllo indipendente.
- La correzione è stata applicata e validata **solo in locale**. Il mandato richiede l'applicazione "in modo controllato sullo staging" ma anche, esplicitamente, di non applicarla a staging in questa fase e di fermarsi dopo il report — le due istruzioni sono state riconciliate seguendo l'istruzione più restrittiva e più specifica (FASE 10 + blocco finale: "Non applicare la migrazione a staging").
- Il test end-to-end reale (RLS-08 #14 e la verifica golden-path FASE 7) usa Supabase locale via PostgREST reale — non è stato eseguito alcun equivalente contro staging.

---

## 15. Staging non ancora modificato

Confermato — nessuna connessione, query, o comando eseguito contro il progetto staging (`haqflkurpmeaxpikozjl`) in questo sprint. La migrazione 047 esiste solo come file nel branch locale, applicata esclusivamente al Supabase Docker locale.

## 16. Produzione non coinvolta

Confermato — nessuna connessione, query, o comando eseguito contro produzione in questo sprint, né in alcuno sprint precedente per questa famiglia di migrazioni (030/031/047).

## 17. Ordine di rilascio

1. **Code review umana** di questo commit locale (migrazione 047, rollback, RLS-08, CI, questo report) — non ancora avvenuta, questo sprint si ferma qui per mandato esplicito.
2. **Push** del branch `feature/pilot-trust-03-uef-auth-fix` (non eseguito in questo sprint — richiede autorizzazione esplicita separata).
3. **PR + merge su `main`** (non eseguito — richiede autorizzazione esplicita separata).
4. **Applicazione a staging** — solo dopo il merge, con verifica live dedicata (stesso pattern di rigore già usato per le migrazioni 045/046 in PILOT-TRUST-01: `supabase db push --linked`, validazione live con fixture KL11/temporanee, mai fixture persistenti), in uno sprint futuro esplicitamente autorizzato.
5. **Gate 3 (DPO)** resta aperto e indipendente — questa correzione non lo chiude né lo modifica.
6. Nessuna applicazione a produzione prevista in questo percorso — produzione non ha mai ricevuto le migrazioni 030/031/047.

---

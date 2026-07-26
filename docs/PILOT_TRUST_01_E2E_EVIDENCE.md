# PILOT-TRUST-01 — E2E Golden Path Evidence (FASE 8)

**Sprint:** PILOT-TRUST-01 — CHIUDERE IL PERIMETRO LIVE (F-08)
**Data:** 2026-07-26
**Ambiente:** locale — Next.js dev server (`npm run dev`) + Supabase locale (Docker, via Supabase CLI). Nessun accesso a staging o produzione in nessuna fase.
**Branch:** `feature/pilot-trust-01`

---

## 1. Comando per riprodurre

```bash
# 1. Avviare Supabase locale (applica le migrazioni 001-045 da zero)
supabase start
# oppure, se già avviato e si vuole ripartire pulito:
supabase db reset

# 2. Seminare le fixture E2E locali (crea 3 utenti Auth reali + tenant + worker)
STATUS=$(supabase status -o json)
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY));")
export E2E_LOCAL_SEED_CONFIRM=YES
npx tsx scripts/e2e/seed-local-golden-path.ts
# → scrive .env.e2e-local-golden-path.local (gitignored, mai committato)

# 3. Avviare il dev server puntato esplicitamente al Supabase locale
#    (senza questo override, .env.local punta a staging — vedi §4)
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY));")
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$STATUS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).SERVICE_ROLE_KEY));")
npm run dev

# 4. Eseguire lo smoke (in un altro terminale)
set -a; source .env.e2e-local-golden-path.local; set +a
export E2E_LOCAL_SUPABASE_URL="http://127.0.0.1:54321"
export E2E_LOCAL_SUPABASE_ANON_KEY=$(supabase status -o json | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).ANON_KEY));")
npx playwright test tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts
```

## 2. Scenari e risultato

| # | Scenario | Ruolo | Esito |
|---|---|---|---|
| 1 | Health endpoint (`GET /api/health`) risponde 200, `database: reachable` | — (pubblico) | PASS |
| 2 | Login reale → `/worker/workspace`, dashboard visibile, email corretta mostrata | WORKER | PASS |
| 3 | Cross-role: sessione WORKER su `/company/workspace` → non resta su quell'URL | WORKER | PASS |
| 4 | Logout WORKER (`Esci`) → torna a `/login` o `/` | WORKER | PASS |
| 5 | Login reale → `/company/workspace`, dashboard visibile, tenant code corretto mostrato | COMPANY_ADMIN | PASS |
| 6 | Cross-role: sessione COMPANY_ADMIN su `/worker/workspace` → non resta su quell'URL | COMPANY_ADMIN | PASS |
| 7 | Logout COMPANY_ADMIN (`Esci`) → torna a `/login` o `/` | COMPANY_ADMIN | PASS |
| 8 | Login reale → `/admin` raggiunto | KORA_ADMIN | PASS |

**Risultato complessivo: 4/4 test Playwright PASS** (`tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts`), riproducibile da un `supabase db reset` pulito (verificato due volte, inclusa una rieseguzione completa dopo reset da zero).

**Durata:** ~5 secondi per l'intera suite (4 test, 1 worker Playwright), esclusi i tempi di avvio di Supabase locale e del dev server.

## 3. Perché il login non passa dal vero form `/login`

Durante la costruzione di questo smoke è emerso un vincolo architetturale reale, non un bug di questa sessione: la Content-Security-Policy dell'app (`next.config.ts`, **non modificata da questo sprint** — "Non intervenire sulla CSP" è un vincolo esplicito) limita `connect-src` a `'self' https://*.supabase.co ...`. Un Supabase locale (`http://127.0.0.1:54321`) non rientra in questo allowlist: qualunque tentativo del browser di chiamare `supabase.auth.signInWithPassword()` contro il Supabase locale viene bloccato dal browser stesso (verificato: la console del browser mostra esplicitamente la violazione CSP e `TypeError: Failed to fetch`).

Questo significa che il vero form `/login` non può autenticarsi contro un Supabase locale in questo repository, con l'attuale CSP. Le suite E2E preesistenti (`golden-data-bearing.spec.ts`, `golden-admin-company.spec.ts`, ecc.) che guidano il form `/login` presuppongono quindi un progetto Supabase reale raggiungibile su un dominio `*.supabase.co` (staging/preview) — non un Postgres locale.

**Soluzione adottata, senza toccare CSP, senza usare staging:** `tests/e2e/helpers/local-session.ts` ottiene una sessione reale tramite una password grant diretta (lato Node/Playwright, non lato browser — quindi mai soggetta alla CSP della pagina, che regola solo le fetch del JavaScript caricato nel documento) contro il vero GoTrue locale, poi usa `@supabase/ssr`'s `createServerClient` con un adapter di cookie "catturante" per calcolare esattamente il nome/valore del cookie di sessione che l'app stessa scriverebbe, e lo inietta nel browser context Playwright prima della navigazione. Da quel punto in poi, tutto è reale: sessione GoTrue reale, cookie letto server-side da `getSupabaseServerClient()` esattamente come farebbe con un cookie scritto dal browser, RLS realmente applicata, pagine realmente renderizzate. L'unico passo "saltato" è la chiamata browser-side bloccata dalla CSP — non l'autenticazione stessa, non il rendering, non l'RLS.

## 4. Due problemi ambientali reali scoperti e corretti durante questa fase

Nessuno dei due è tra i 4 finding originari (F-01/F-02/F-04/F-08), ma entrambi bloccavano la verifica del golden path e sono stati corretti con il minimo intervento necessario:

1. **`supabase/config.toml` non esponeva gli schemi applicativi a PostgREST locale** (`schemas = ["public", "graphql_public"]` soltanto). Ogni query `.schema('analytics'|'personal'|'commons'|'network'|'audit')` falliva localmente con `PGRST106 Invalid schema`, mentre su staging/produzione questi schemi sono già esposti (configurazione dashboard, mai stata sincronizzata nel file locale). Corretto aggiungendo i 5 schemi effettivamente usati dal codice applicativo (grep-verificato) alla lista locale. **Nessun impatto su staging/produzione — file di configurazione locale, RLS resta comunque il perimetro reale di accesso su ogni tabella.**
2. **`app/worker/layout.tsx`**: `getCurrentKoraUser()` restituisce un oggetto "truthy" per QUALSIASI ruolo autenticato (verifica solo la presenza di `kora_role`, non l'uguaglianza con `'KORA_ADMIN'`). Il controllo `if (koraAdmin)` bloccava quindi ogni WORKER con la schermata "Accesso negato", non solo KORA_ADMIN. Corretto con `if (koraAdmin?.koraRole === 'KORA_ADMIN')`, lo stesso pattern già usato correttamente da ogni altro chiamante di `getCurrentKoraUser()` in questo repository (`app/partner/layout.tsx`, `app/company/workspace/layout.tsx`, `app/admin/workers/page.tsx`). Vedi `tests/unit/pilot-trust-01-worker-layout-admin-block-fix.test.ts` per la prova comportamentale (before/after).

## 5. Fixture

Create da `scripts/e2e/seed-local-golden-path.ts` (locale-only, guardia anti-staging/produzione, richiede `E2E_LOCAL_SEED_CONFIRM=YES`):
- 1 tenant sintetico (`E2E-LOCAL-GOLDEN-<suffix>`, `is_active=true`)
- 3 account Auth reali su Supabase locale (dominio `@e2e-local.test`): 1 KORA_ADMIN, 1 COMPANY_ADMIN, 1 WORKER — password generate casualmente, scritte solo in `.env.e2e-local-golden-path.local` (gitignored, mai stampate su stdout)
- 1 riga `personal.worker_identity` + 1 riga `personal.worker_profile_private` (con `onboarding_completed_at` già impostato, per raggiungere direttamente la workspace)

**Nessun dato reale.** Dominio email sintetico, tenant esplicitamente sintetico, nessun nome/cognome reale.

## 6. Cleanup

Le fixture di questo smoke vivono esclusivamente nel database locale Docker. Non è necessario un cleanup esplicito tra un run e l'altro (lo script è idempotente — cancella eventuali righe residue con lo stesso pattern di tag prima di reinserire), e un `supabase db reset` le rimuove comunque per intero insieme a qualunque altro dato locale. Nessuna fixture di questo smoke tocca staging o produzione, quindi non esiste alcun cleanup remoto da eseguire.

## 7. Limiti — cosa NON è coperto

- **La pipeline dati profonda** (upload → intake → UEF → scoring → KORA Index → Decision Pack) non è ripetuta qui. È già implementata end-to-end da `tests/e2e/golden-data-bearing.spec.ts` (GD01), che guida il vero form `/login` — per questo richiede un progetto Supabase reale (staging/preview) raggiungibile entro l'allowlist CSP, non Postgres locale. Non eseguita in questa sessione ("non usare staging" è un vincolo esplicito di questo sprint).
- **La garanzia di isolamento tenant/worker** non si basa su questo smoke per la prova rigorosa — quella è responsabilità di `tests/integration/rls-two-tenant-negative.test.ts` (RLS-03), `rls-worker-isolation.test.ts` (RLS-05), `rls-kora-admin-control.test.ts` (RLS-06), `rls-worker-own-initiative-participation.test.ts` (RLS-07): 40/40 assert dirette contro Postgres reale, senza passare dal browser, ora eseguite obbligatoriamente nel job CI Docker (FASE 4).
- Questo smoke non verifica upload di file, generazione PDF, invio email, o qualunque altra integrazione esterna.
- Non dichiariamo "full E2E": questo è uno smoke di routing/autenticazione/autorizzazione/cross-role sul golden path, non l'intera pipeline prodotto.

## 8. Staging e produzione

**Staging non coinvolto.** **Produzione non coinvolta.** Ogni comando di questa fase opera esclusivamente contro `http://127.0.0.1:54321` / `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (Supabase locale via Docker). Gli helper (`local-session.ts`, `seed-local-golden-path.ts`) rifiutano esplicitamente qualunque host non loopback.

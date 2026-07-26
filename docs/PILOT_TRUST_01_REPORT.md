# PILOT-TRUST-01 — Chiudere il Perimetro Live — Report Finale

**Sprint:** PILOT-TRUST-01
**Data:** 2026-07-27
**Branch:** `feature/pilot-trust-01` (da `main`, HEAD iniziale `cdd65db`)
**Ambito:** solo repository locale + Supabase locale (Docker). Nessuna azione su staging o produzione in nessuna fase.

---

## Nota preliminare — discrepanza rispetto al contesto fornito

Il documento `docs/KORA_EXTRAORDINARY_REPOSITORY_AUDIT.md`, richiamato nel contesto dello sprint come fonte delle findings F-01/F-02/F-04/F-08, **non esiste nel repository** (verificato nella working tree, nell'intera storia git e su tutti i branch). Le quattro findings sono comunque specificate in modo autosufficiente e concreto nel prompt dello sprint (percorsi di file, nomi di funzioni, comportamento atteso) e sono state verificate direttamente nel codice prima di agire — questa assenza non ha bloccato l'esecuzione ma va segnalata come discrepanza.

---

## 1. Metodologia di test — tassonomia

Questo sprint tocca più livelli di test distinti; il totale grezzo dei test non è una metrica sufficiente da sola:

| Tipo | Cosa prova | Dove | Esecuzione |
|---|---|---|---|
| **Statico** | Il codice/YAML dice ciò che deve dire (import corretti, allowlist, assenza di `\|\| true`) — non richiede DB | `tests/unit/pilot-trust-01-*.test.ts` (lint-gate, rls-ci-gate, service-role-guard) | `npm test`, sempre |
| **Comportamentale (mock)** | Logica applicativa isolata (es. health endpoint, worker/layout.tsx fix) con dipendenze mockate | `tests/unit/pilot-trust-01-health-endpoint.test.ts`, `tests/unit/pilot-trust-01-worker-layout-admin-block-fix.test.ts` | `npm test`, sempre |
| **DB reale (RLS)** | Row Level Security realmente applicata da Postgres, non simulata | `tests/integration/rls-*.test.ts` (RLS-03/05/06/07) | Locale con Supabase Docker, ora anche nel job CI obbligatorio |
| **DB reale (KORA Link)** | Suite comportamentale C1–C10 già esistente (13C), non modificata da questo sprint salvo l'aggiunta di uno scenario partner nel runner live | `scripts/kora-link/run-behavioral-suite.ts` | Locale con Supabase Docker |
| **Concorrenza** | Race condition reali a due connessioni Postgres distinte (C10) | Stesso runner, `--only=c10` | Locale con Supabase Docker |
| **E2E (browser)** | Login reale, rendering pagina reale, cross-role reale, in un vero browser Chromium | `tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts` | Locale, Playwright + Supabase Docker |

---

## 2. F-01 — Lint gate

**Root cause:** `npm run lint` andava in crash (`TypeError: expand is not a function` in `Minimatch.braceExpand`), non produceva mai un vero risultato pass/fail. Causa: l'override globale `"brace-expansion": "5.0.8"` in `package.json` (introdotto in SECURITY-DEPENDENCY-HYGIENE-10 per chiudere l'advisory `GHSA-3jxr-9vmj-r5cp`) è incompatibile con l'API che `minimatch@3.1.5` (dipendenza diretta di `eslint@9.39.4` e di `@eslint/config-array`) si aspetta dalla vecchia `brace-expansion`. Verificato empiricamente che **non esiste alcuna versione di `brace-expansion` contemporaneamente compatibile con `minimatch@3.1.5` e priva di vulnerabilità note** (una seconda advisory, `GHSA-mh99-v99m-4gvg`, copre l'intera serie `<=5.0.7`, incluse tutte le patch 1.x) — ogni tentativo di scoping per versione (già provato e fallito in hygiene-10, riprovato e ri-fallito qui) destabilizza la risoluzione npm su un altro ramo (`exceljs`→`unzipper`→`rimraf`/`glob`), riesumando 11–16 vulnerabilità storiche non correlate.

**Soluzione (opzione "c" — aggiornamento mirato):** override chirurgico di `@eslint/config-array` a `0.23.5` (l'unico pacchetto nella catena che ha aggiornato la propria dipendenza interna a `minimatch@^10.2.4`, moderno e già compatibile con `brace-expansion@5.0.8`). Nessun upgrade di ESLint stesso (bloccato: `eslint-plugin-react`/`import`/`jsx-a11y` limitano il peer a `eslint ^9`, quindi ESLint 10 non è un'opzione senza un upgrade a cascata dei plugin — verificato, non tentato). Aggiunto anche, separatamente, un override `"archiver": "8.0.0"` (rimuove una dipendenza da `minimatch@3.1.5` nel ramo `exceljs`, riduzione di superficie legittima, verificata isolatamente).

**Stato gate CI:** `.github/workflows/ci.yml`, step "Lint (blocking)" — nessuna maschera, nessun `continue-on-error`. I 114 errori storici pre-esistenti (soprattutto `@typescript-eslint/no-explicit-any` e `no-require-imports` in `tests/unit/*`) sono catturati come baseline a conteggio esatto in `eslint-suppressions.json` (meccanismo nativo ESLint `--suppress-all`, generato una volta, committato) — un nuovo errore, anche in un file già presente in baseline, fa fallire il gate per davvero. Guardia: `tests/unit/pilot-trust-01-lint-gate.test.ts`.

## 3. F-02 — Service-role nelle 6 pagine

Le 6 pagine (`app/worker/workspace`, `app/worker/opportunities`, `app/worker/onboarding`, `app/worker/dynamic-cv/print`, `app/company/commons`, `app/company/layout.tsx`) sono state migrate da `getSupabaseServiceClient()` a `getSupabaseServerClient()`. L'identità (tenant/worker/ruolo) era già derivata correttamente dalla sessione server-side in tutte e 6 — nessuna modifica a quella logica.

**Gap RLS reale scoperto e chiuso:** `personal.worker_initiative` aveva solo una policy `status='published'` per WORKER; tre query (storico partecipazioni, profilo di attivazione, CV stampabile) mostrano iniziative anche `closed` cui il worker ha partecipato — con la sola policy esistente, sarebbero silenziosamente scomparse. Migrazione `045_worker_initiative_own_participation_rls.sql`: policy additiva "un worker vede una propria iniziativa referenziata dalla propria `worker_participation`, a prescindere dallo stato". Rollback in `supabase/rollback/045_rollback_045_if_needed.sql`. Test comportamentale RLS dedicato: `tests/integration/rls-worker-own-initiative-participation.test.ts` (RLS-07, 6 assert + 1 guardia). **Non applicata a staging.**

## 4. F-04 — Test RLS nel gate CI obbligatorio

Job `kora-link-local-integration` di `.github/workflows/ci.yml` (già esistente, avvia Supabase locale per la suite KORA Link) esteso per eseguire RLS-03/05/06/07 nello stesso job, senza una seconda infrastruttura Docker. Il controllo Docker non è più un soft-skip: se il Docker daemon non è disponibile, il job fallisce esplicitamente (`exit 1`), non salta silenziosamente. Un'assertion machine-readable dedicata verifica `numFailedTests === 0` e `numPendingTests === 0` dopo l'esecuzione — uno skip involontario (`describe.skipIf` non risolto) è un fallimento del gate, non un pass silenzioso. Guardia: `tests/unit/pilot-trust-01-rls-ci-gate.test.ts`.

## 5. F-08 — Health endpoint e smoke E2E

`app/api/health/route.ts`: GET-only, nessuna autenticazione, nessun dato sensibile, query minimale (`analytics.tenant`, `limit(1)`, nessun dato tenant restituito), timeout 3s, 200/`reachable` o 503/`unreachable`. `export const dynamic = 'force-dynamic'` esplicito — necessario perché senza questo il caching di Next.js poteva servire una risposta "reachable" stantia dopo che il DB era realmente andato giù (scoperto empiricamente durante la validazione).

Smoke E2E (`tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts`): login reale (WORKER, COMPANY_ADMIN, KORA_ADMIN), dashboard corretta, tenant/ruolo corretti, cross-role negato, logout, health 200 — **4/4 PASS**, riprodotto due volte da `supabase db reset` pulito. Vedi `docs/PILOT_TRUST_01_E2E_EVIDENCE.md` per il verbale completo, inclusi due problemi ambientali reali scoperti e corretti nel farlo funzionare (`supabase/config.toml` non esponeva gli schemi applicativi a PostgREST locale; `app/worker/layout.tsx` bloccava ogni WORKER, non solo KORA_ADMIN — vedi §6) e il motivo per cui il login passa da un'iniezione di sessione reale invece che dal form browser (CSP, non modificata — dettagli nel verbale).

La pipeline dati profonda (upload → UEF → scoring → Decision Pack) resta coperta da `tests/e2e/golden-data-bearing.spec.ts`, non eseguita in questo sprint (richiede un progetto Supabase reale entro l'allowlist CSP — "non usare staging" è un vincolo esplicito qui).

## 6. Scoperta non pianificata — `app/worker/layout.tsx`

`getCurrentKoraUser()` (`lib/auth/kora-session.ts`) restituisce un oggetto "truthy" per **qualunque** ruolo autenticato (verifica solo la presenza di `app_metadata.kora_role`, non l'uguaglianza con `'KORA_ADMIN'` — il campo `koraRole` restituito è un cast TypeScript, non un valore verificato). Il controllo `if (koraAdmin)` in `app/worker/layout.tsx` bloccava quindi **ogni WORKER**, non solo KORA_ADMIN, con la schermata "Accesso negato" — un bug severo, pre-esistente, non incluso nei 4 finding originari, scoperto mentre si costruiva lo smoke E2E (nessuno spec E2E preesistente in questo repository esercitava effettivamente un login WORKER fino a `/worker/workspace`). Bloccava direttamente la verifica del golden path richiesta da questo stesso sprint — corretto con `if (koraAdmin?.koraRole === 'KORA_ADMIN')`, lo stesso pattern già usato correttamente da ogni altro chiamante della funzione in questo repository. Test comportamentale before/after: `tests/unit/pilot-trust-01-worker-layout-admin-block-fix.test.ts`.

## 7. Guardia anti-service-role (F-06)

`tests/unit/pilot-trust-01-service-role-guard.test.ts`: scansiona `app/`, `lib/`, `services/`, `scripts/` per import reali di `getSupabaseServiceClient` e fallisce per qualunque file fuori da un'allowlist esplicita, per-file/per-prefisso (mai `app/**`/`lib/**`). 13 voci, ciascuna con una motivazione di una riga: `lib/supabase/server.ts` (definizione), `app/admin/`, `app/api/admin/` (workspace KORA_ADMIN, non tenant-facing), 5 wrapper `lib/supabase/*-service-key.ts` + `lib/auth/kora-session.ts` + `lib/data-intake/evidence-attachment-storage.ts` + `lib/live/persistence.ts` (contesti server-only documentati), e due **eccezioni pre-esistenti dichiarate, non finte approvazioni**: `app/cv/share/[token]/page.tsx` (rotta pubblica anonima, nessuna sessione da cui derivare RLS) e `app/partner/workspace/page.tsx` (gap noto, fuori dallo scope delle 6 pagine di questo sprint — manca una policy RLS PARTNER-self su `network.partner_profile`, non creata qui).

## 8. Limiti residui

- `app/partner/workspace/page.tsx` resta su service-role — gap noto, tracciato, non in scope.
- I 95 warning ESLint pre-esistenti (`no-unused-vars`, quasi tutti in `tests/unit/*`) restano — non sono errori, non bloccano il gate, non è stato chiesto di azzerarli.
- Lo smoke E2E copre login/dashboard/cross-role/logout/health, non l'intera pipeline dati (vedi §5 e il verbale FASE 8).

## 9. Staging e produzione

**Staging non modificato.** **Produzione non coinvolta.** La migrazione 045 non è stata applicata a staging. Nessun comando in questo sprint ha usato una connection string o una chiave diversa da quelle locali (`127.0.0.1`/`localhost`).

## 10. Revisione avversariale del commit — findings e correzioni

Una revisione avversariale successiva ha analizzato il commit originale con l'obiettivo esplicito di verificare i cambiamenti non pianificati (migrazione 045, correzione `app/worker/layout.tsx`, modifica `supabase/config.toml`). Ha prodotto:

1. **RLS-07 rafforzata** (7 → 11 test): aggiunti test per ruolo non autorizzato (COMPANY_ADMIN, PARTNER), anon, e un claim `kora_tenant_id` manomesso rispetto al tenant reale — quest'ultimo prova che la clausola `tenant_id = kora.tenant_id()` della migrazione 045 non è codice morto (blocca l'accesso anche quando la subquery su `auth_user_id` da sola lo permetterebbe).
2. **Copertura ruoli di `app/worker/layout.tsx` completata** (3 → 7 test): aggiunti COMPANY_ADMIN, PARTNER, DEMO_VIEWER, worker disabilitato — tutti correttamente reindirizzati a `/login`, mai mostrato contenuto, mai mostrato il blocco specifico KORA_ADMIN.
3. **Gap reale trovato e corretto — grant mancante sullo schema `commons`:** la migrazione 013 concede privilegi a livello di tabella su `commons.post`/`booking`/`contribution_event` ad `authenticated`, ma non ha mai concesso `USAGE ON SCHEMA commons` — senza il quale ogni grant di tabella è inerte. Invisibile finché ogni pagina commons usava il service-role; diventato un rischio reale di outage nel momento in cui FASE 5 ha migrato `app/company/commons/page.tsx` al client di sessione (`app/worker/commons/page.tsx`, già sul client di sessione prima di questo sprint, ne era già silenziosamente affetto). **Migrazione 046** (`GRANT USAGE ON SCHEMA commons TO authenticated`), con rollback dedicato e test comportamentale diretto su Postgres (`tests/integration/commons-schema-usage-grant.test.ts`, 5/5 PASS). Verificato anche live via browser (sessione reale iniettata): `/company/commons` e `/worker/commons` rispondono 200 senza errori dopo la migrazione, fallivano con "permission denied for schema commons" prima. **Non applicata a staging.**
4. **Osservazioni fuori scope, non corrette** (pre-esistenti, non toccate da questo commit): `requireWorkerUser()` non verifica lo stato attivo del tenant (asimmetria rispetto a `requireCompanyUser()`); `analytics.uef_record` ha 0 policy RLS mentre `app/api/company/initiatives/explainability/route.ts` (non toccato da questo commit) commenta "company-scoped by RLS" — con 0 policy l'esito reale è 0 righe sempre, non un filtro per tenant; `app/partner/workspace/page.tsx` resta su service-role (già segnalato in §7).
5. **12 tabelle su 26** negli schemi ora esposti localmente hanno RLS *enabled* ma non *forced* — irrilevante in pratica poiché PostgREST/l'app autenticano sempre come `authenticated`/`anon`/`service_role`, mai come owner della tabella (unico ruolo per cui FORCE ha effetto); condizione pre-esistente alle migrazioni, non introdotta né aggravata da questo commit.
6. Confermato: `anon` non ha `USAGE` su nessuno dei 5 schemi aggiunti a `supabase/config.toml` (`analytics`, `personal`, `commons`, `network`, `audit`) — solo `authenticated`/`service_role`/`postgres`.

Ordine di rilascio sicuro per staging (non eseguito in questa sessione): 1) applicare le migrazioni 045 e 046 (additive, zero impatto sul codice attualmente in esecuzione, che usa service-role); 2) verificare `migration list --linked`; 3) test RLS/comportamentali live read-only controllati; 4) confermare che lo schema `commons` sia già esposto lato dashboard PostgREST su staging (assunto sulla base di evidenze indirette, non riverificato in questa sessione); 5) deploy del codice; 6) smoke post-deploy. Deployare il codice PRIMA delle migrazioni degraderebbe (non a rischio sicurezza) lo storico partecipazioni per iniziative chiuse e romperebbe `/company/commons`+`/worker/commons` con un errore 500 fino all'applicazione di 045/046.

## Decisione finale

**“Live pilot trust perimeter consolidated locally and in CI.”**

Non dichiariamo pilot con dati reali pronto, production-ready, o SaaS-ready.

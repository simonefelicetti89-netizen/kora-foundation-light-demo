# KORA — Platform Readiness Summary

> **Superseded as the current-status reference by `docs/STATUS.md`** (CLEANUP-01, 2026-07-03).
> This document is a historical snapshot dated 2026-06-30 — kept for record, not for current facts.

**Branch:** `platform/readiness`
**Base:** `value-freeze-v1` (`eaecdad`) = `main`
**HEAD:** `b9f0359` (CC-14)
**Data:** 2026-06-30
**Pubblico:** CTO, advisor tecnico, investitore, revisore esterno

---

## 1. Executive Summary

Il branch `platform/readiness` contiene 8 cicli di miglioramento (CC-07 → CC-14) applicati alla Foundation Light demo di KORA. Nessuna modifica è stata apportata al codice di business logic, alle migrazioni Supabase, alla RLS, all'autenticazione o alla produzione.

**Cosa è stato fatto:**
Il lavoro ha indirizzato i principali rischi tecnici di un prototipo costruito con velocità ("vibecoding"): assenza di lint enforcement, nessun test browser, API route senza validazione degli input, client Supabase usati in modo inconsistente, assenza di documentazione della superficie API. Ogni intervento è stato piccolo, mirato e verificato con build + test completi.

**Perché migliora KORA:**
La demo Foundation Light è ora più coerente con ciò che un revisore tecnico esterno, un CTO o un partner enterprise si aspetterebbe: ESLint clean, build verificata, smoke test Playwright, Zod su endpoint critici, matrice delle route documentata, service-role usage ridotto al minimo.

**Perché riduce il rischio "vibecoding":**
I rischi tipici di un prototipo rapido (API che accettano qualsiasi input, client DB usato nel modo sbagliato, nessun test browser, nessuna documentazione della superficie di attacco) sono stati ridotti o documentati. Ogni CC ha lasciato il codebase verificabile e le regressioni tracciabili.

**Cosa è ora più enterprise-ready:**
Validazione strutturata degli input (Zod), coerenza del client Supabase, comportamento esplicito per casi edge (no-session logout), documentazione tecnica della superficie API completa, test suite green su build pulita.

**Cosa resta da fare:**
Autenticazione E2E (richiede account staging), Zod su `live-company` (route grande, sessione separata), rate limiting (decisione architetturale CTO), RLS negative test (post Gate 2), KORA Link (post Gate 3). Nessuno di questi blocca la demo Foundation Light.

---

## 2. Before / After

| Area | Prima (`value-freeze-v1`) | Dopo (`b9f0359`) | Impatto |
|------|--------------------------|-----------------|---------|
| ESLint | 15+ errori runtime (entities, state-in-effect, static components) | 0 errori nei file modificati | Build più stabile, lint CI-ready |
| E2E browser | Nessun test Playwright | 6 smoke test pubblici verdi | Regressioni visibili immediatamente |
| Shell/demo surfaces | `kora-space` e portfolio page senza gating | Badge "Preview" + sidebar flag attivi | Superfici non pronte chiaramente marcate |
| API route matrix | Nessuna documentazione della superficie API | `API_ROUTE_AUTH_MATRIX.md` — 85+ route analizzate | CTO può leggere l'intera superficie |
| Hardening backlog | Nessuna lista finding | `API_HARDENING_BACKLOG.md` — 15 finding catalogati con priorità | Rischi tracciati, decisioni documentate |
| Service-role usage | `commons/posts*` usava service client (bypass RLS potenziale); `data-intake` e `decision-pack` usavano `createClient` diretto | Tutti i path corretti — server client dove RLS deve applicarsi | P0 risk eliminato |
| Zod validation (body) | Nessuna validazione strutturata su POST endpoint | 4 POST endpoint con schema Zod (provision worker, provision company, scoring batch, interest) | Input injection mitigato |
| Query param validation | `tenantId` accettato come stringa grezza senza format check | 4 GET endpoint con `z.string().uuid()` / `z.string().min(1).max(40)` | Errori DB prevenuti, comportamento ambiguo eliminato |
| Logout consistency | No-session path implicito (signOut no-op silenzioso) | Early return esplicito `if (!user)` | Comportamento documentato e testato |
| Test suite (vitest) | 8079 test | 8128 test (+49) | Copertura ampliata su path critici |
| Build | OK (non verificata sistematicamente) | OK — verificata a ogni CC | Regressioni di build rilevabili |
| TypeScript | Compilava con warning | 0 errori `tsc --noEmit` | Type safety confermata |

---

## 3. Work Completed CC-07 → CC-14

### CC-07 — ESLint Runtime Fixes
**Commit:** `bcd0c54` + `7401daa`
**File principali:** 7 pagine/componenti JSX, `useCountUp.ts`
**Miglioramento:** Eliminati 15 errori ESLint bloccanti (entities non escaped, setState in effect, componenti statici in server context). Primo PLATFORM_READINESS_CHANGELOG.
**Test:** build OK, vitest invariato
**Rischio residuo:** nessuno

### CC-08 — Playwright E2E Setup
**Commit:** `aebd56b`
**File principali:** `playwright.config.ts`, `tests/e2e/kora-smoke.spec.ts`
**Miglioramento:** 6 smoke test pubblici (landing, login, role_hint, request-access, demo). Playwright installato, proxy server configurato per test locali e staging.
**Test:** 6/6 E2E green
**Rischio residuo:** test pubblici only; autenticati richiedono account staging

### CC-09 — Shell/Demo Page Gating
**Commit:** `47cd6f1`
**File principali:** `components/layout/Sidebar.tsx`, `app/demo/portfolio/page.tsx`, `app/my-kora/kora-space/page.tsx`
**Miglioramento:** Badge "Preview" e flag sidebar su superfici non complete. Le pagine non pronte sono chiaramente marcate nell'interfaccia.
**Test:** vitest invariato, build OK
**Rischio residuo:** nessuno

### CC-10 — API Route Auth Matrix + Hardening Backlog
**Commit:** `8f616dd`
**File principali:** `docs/API_ROUTE_AUTH_MATRIX.md`, `docs/API_HARDENING_BACKLOG.md`
**Miglioramento:** Audit completo di 85+ route API. Matrice guard/client/validation. 15 finding catalogati H-001–H-015 con priorità P0/P1/P2/P3. Nessuna modifica runtime.
**Test:** vitest invariato
**Rischio residuo:** finding aperti documentati per sessioni successive

### CC-11 — P0 Service-Role Cleanup (H-001 + H-002)
**Commit:** `541df1b`
**File principali:** `app/api/commons/posts/route.ts`, `app/api/commons/posts/[id]/route.ts`, `app/api/admin/data-intake/accept/route.ts`, `app/api/admin/decision-pack/status/route.ts`
**Miglioramento:** `commons/posts*` migrati da service client a server client (RLS ora applicata). `data-intake/accept` e `decision-pack/status` migrati da `createClient` diretto a `getSupabaseServiceClient()`. Analisi RLS completa pre-fix.
**Test:** vitest 8079/8079 green, build OK
**Rischio residuo:** commons RLS confermata — comportamento cross-tenant corretto (404 invece di 403 per PATCH su post altrui = più sicuro)

### CC-12 — Zod Body Validation P1 (H-004 parziale)
**Commit:** `e95a0ff`
**File principali:** 4 route POST + `tests/unit/cc12-zod-validation.test.ts`
**Miglioramento:** Zod installato (v4.4.3). Schema su `workers/provision`, `companies/provision`, `scoring/run-approved-batch`, `worker/initiatives/[id]/interest`. Privacy: InterestSchema esclude `worker_id`/`tenant_id` da body per costruzione.
**Test:** 25 nuovi test Zod, 8104/8104 green
**Rischio residuo:** `live-company` e `data-intake` rimandati

### CC-13 — UUID Query Param Validation P1 (H-006)
**Commit:** `bb126fc`
**File principali:** 4 route GET + `tests/unit/cc13-query-param-validation.test.ts`
**Miglioramento:** `z.string().uuid()` su `tenantId` param per `impact-units`, `worker-initiatives`, `company-users`. `z.string().min(1).max(40)` su `tenantCode` per `workers/list`. Errore 400 privacy-safe (raw value non echeggiato).
**Test:** 22 nuovi test, 8126/8126 green
**Rischio residuo:** nessuno

### CC-14 — Auth/Logout Guard Consistency (H-005)
**Commit:** `b9f0359`
**File principali:** `app/api/auth/logout/route.ts`, `tests/unit/b112-auth-ux.test.ts`
**Miglioramento:** Early return esplicito `if (!user)` dopo `getUser()`. No-session path ora documentato nel codice — redirect a `/company/login` senza chiamare `signOut()` no-op. Route cross-role by design (nessun `requireXxx`).
**Test:** 2 nuovi test b112, 8128/8128 green, E2E 6/6 green, build OK
**Rischio residuo:** nessuno

---

## 4. Security / Privacy Improvements

### Finding chiusi

| Finding | Descrizione | Chiuso in |
|---------|-------------|-----------|
| H-001 | `commons/posts*` usava service client — bypass RLS potenziale su path company/worker | CC-11 |
| H-002 | `data-intake/accept` e `decision-pack/status` usavano `createClient` diretto con service key | CC-11 |
| H-005 | `auth/logout` no-session path implicito — comportamento ambiguo | CC-14 |
| H-006 | `tenantId` UUID non validato su 4 GET endpoint — input malevolo produceva errori DB | CC-13 |

### Miglioramenti strutturali

**Service-role usage ridotto:** Il client service-role bypassa RLS. Dopo CC-11, viene usato solo dove il design lo richiede intenzionalmente (endpoint admin che operano cross-tenant per design). Path company e worker usano server client con RLS attiva.

**Validazione input migliorata:** 8 route (4 POST + 4 GET) ora hanno schema Zod. Input invalidi vengono rifiutati con 400 prima di raggiungere il DB. Messaggi di errore privacy-safe — raw value non echeggiato.

**Route matrix documentata:** Ogni route ha guard, client, validazione e note di rischio documentati. I revisori futuri (CTO, security, auditor) hanno una mappa leggibile.

**Output privacy-safe preservato:** Tutti i fix mantengono l'output invariato per input validi. Nessun dato sensibile esposto in messaggi di errore. InterestSchema esclude `worker_id` e `tenant_id` da body per costruzione (non solo ignorati — non parsati).

**Non toccato per correttezza:** SQL, RLS, auth core, middleware, service-role wrappers, KORA Engine, methodology config sono rimasti invariati. I finding che richiedono modifiche a questi layer sono stati documentati e rimandati a sessioni con CTO.

---

## 5. Test Maturity Improvements

### Vitest (unit/integration strutturali)

| Punto nel tempo | Test totali | File test |
|-----------------|------------|-----------|
| Base `value-freeze-v1` | 8079 | 191 file |
| Post CC-12 | 8104 | 192 file |
| Post CC-13 | 8126 | 193 file |
| Post CC-14 (HEAD) | **8128** | **193 file** |

+49 test aggiunti. Tutti i test usano pattern `readFileSync` — nessuna chiamata Supabase live, nessun mock di rete.

### Playwright E2E

Aggiunto in CC-08. 6 smoke test su pagine pubbliche:

| Test | Path | Verifica |
|------|------|---------|
| S01 | `/` | Landing carica, contenuto KORA presente |
| S02 | `/login` | Form email presente, heading "Accedi a KORA" |
| S03 | `/login?role_hint=company` | Copy "Area Aziendale" |
| S04 | `/login?role_hint=worker` | Copy "spazio privato" |
| S05 | `/request-access` | Pagina pubblica senza crash |
| S06 | `/demo` | Risponde senza 500 (redirect login OK) |

**Limiti attuali:**
- Test pubblici only — nessun test autenticato (richiede account staging con sessione attiva)
- Nessun test di route API dirette
- Nessun RLS negative test (richiede schema DB Gate 2)

### Build e TypeScript

- `npm run build` verificata a ogni CC — 0 errori in tutti i cicli
- `tsc --noEmit` clean — 0 errori TypeScript
- ESLint: 0 errori/warning nei file modificati da CC-11 in poi

---

## 6. Client / Investor Readiness Improvements

**Cosa appare più solido:**
La demo ha ora una baseline tecnica verificabile. Un revisore esterno può eseguire `npm run build && npm test && npm run test:e2e` e vedere tutto verde. La superficie API è documentata. I rischi sono tracciati, non nascosti.

**Cosa è meno ambiguo:**
Le route che usano service-role vs server client sono ora documentate e corrette. Le API che prima accettavano qualsiasi input ora restituiscono 400 coerenti per input malformati. Il comportamento no-session del logout è esplicito.

**Cosa è più sicuro in demo:**
Le pagine shell incomplete sono marcate come "Preview". Le route API critiche hanno validazione input. Il client Supabase è usato in modo coerente con le policy RLS documentate.

**Cosa può essere raccontato a investitori:**
"Foundation Light è una demo controllata su dati sintetici con una baseline tecnica verificabile: build clean, type-safe, con test unitari su 193 file e smoke test browser automatici. La superficie API è documentata e i principali rischi tecnici sono stati identificati, classificati e — per i P0 — risolti prima della demo con potenziali clienti."

**Cosa non va ancora promesso:**
- Nessuna produzione con dati reali (Gate 2 e Gate 3 aperti)
- Nessun rate limiting sulle API
- Nessuna autenticazione E2E automatizzata
- I punteggi KORA Index sono metodologia v0.1 pre-empirica — non certificati

---

## 7. Remaining Risks

### Tecnici — aperti

| Rischio | Dettaglio | Priorità | Gate |
|---------|-----------|----------|------|
| 7 `setState in useEffect` rimasti | Non nei file CC-07 — altri componenti non toccati | P1 | — |
| `live-company` Zod non fatto | 400+ righe, payload 10+ campi — rimandato da CC-12 | P1 | — |
| `data-intake/accept` Zod non fatto | Multipart, costoso — rimandato da CC-12 | P1 | — |
| Rate limiting zero | Nessuna route ha rate limiting; abuse risk su provision/scoring | P1 | CTO |
| Error shape non standardizzato | Mix `{ error }` / `{ ok: false, error }` / `{ message }` — H-007 | P2 | — |
| E2E autenticati assenti | Nessun test di flusso login → dashboard → logout | P1 | Staging account |
| RLS negative test assenti | Non verificato che RLS blocchi cross-tenant in test automatizzati | P2 | Gate 2 |
| Sidebar.tsx unstaged | 1 file modificato non committato — review necessaria | — | — |

### Architetturali — bloccati da gate

| Rischio | Gate che sblocca |
|---------|----------------|
| Produzione SQL schema | Gate 2 (CTO review) |
| KORA Link v1 | Gate 2 + Gate 3 (legal/privacy) |
| Real HRIS/LMS integration | Gate 3 |
| Live fiscal output | Gate 5 |

### Metodologici

- KORA Methodology v0.1 pre-empirical calibration — pesi non validati empiricamente
- Confidence Score è companion indicator non KORA Index component — sempre obbligatorio in UI
- Delphi Study calibration è post-pilot

---

## 8. Next Recommended Steps

### P0 (Immediato)

- Review del branch `platform/readiness` da parte di CTO/tech lead
- Verifica `Sidebar.tsx` (1 file unstaged modificato in gitStatus iniziale)
- Conferma su staging build prima di merge controllato

### P1 (Pre-pilot con clienti)

- Account test su staging per E2E autenticati (1 company admin, 1 worker)
- Zod su `live-company` (sessione separata — CC-16 candidate)
- Standardizzazione error shape API — H-007 (meccanico, molti file)
- Decisione rate limiting — richiede CTO: Upstash/Redis vs Vercel Edge

### P2 (Pre-KORA Link)

- Design doc `feat/kora-link-v1` — route pubblica, token pattern, audit trail
- Candidate migrations 034/035 per KORA Link (post Gate 2)
- RLS negative test suite (post Gate 2 schema definito)
- Public route threat review con CTO/security

---

*PLATFORM_READINESS_SUMMARY.md — CC-15 · 2026-06-30 · Branch `platform/readiness`*

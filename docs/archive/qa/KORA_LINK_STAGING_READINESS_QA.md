# KORA Link — Staging Readiness QA (QA-01)

**Data:** 2026-07-01
**Branch:** `qa/kora-link-staging-readiness`
**Base:** `main` @ `db89f05` (merge: KORA Link platform branch)
**Tipo:** Audit — nessuna modifica a codice, nessuna feature nuova, nessun fix salvo bloccanti (nessuno trovato in questo step).

---

## 1. Executive Summary

KORA Link è mergiato in `main` (`db89f05`) con tutte le verifiche tecniche verdi (TypeScript 0 errori, Vitest 8622/8622, build OK, E2E 6/6). Il codice runtime (route pubblica, DB lookup, activation, Lab NFC, ecosystem control layer multi-ruolo) è completo e testato a livello unitario/build. Tutti i flag operativi restano **off di default**, coerente con il design "safe by default".

La QA browser reale con ruoli autenticati è **parziale**: `/company/kora-link` è stato verificato live con sessione reale e funziona correttamente. `/admin/kora-link`, `/admin/kora-link-lab` e `/partner/kora-link` **non** sono stati verificati live per assenza di credenziali di staging KORA_ADMIN/PARTNER. `/my-kora/kora-link` non è stato verificato live perché i 3 account worker di staging disponibili sono bloccati in stato `onboarding` (comportamento pre-esistente, non specifico di KORA Link — confermato in KL-24).

Nessun blocco tecnico nel codice. I blocchi residui sono: (a) Gate 2/3 (CTO/DPO review di 034/035/036) ancora aperti — corretto, per design; (b) credenziali di staging mancanti per due dei quattro ruoli; (c) stato onboarding del worker di staging.

---

## 2. Current Main Status

| Verifica | Esito |
|---|---|
| Commit main | `db89f05` (merge: KORA Link platform branch) |
| TypeScript | 0 errori |
| Vitest | 8622/8622 passed (202 file) |
| Build | OK — tutte le 7 route KORA Link presenti |
| E2E Playwright | 6/6 passed |
| 034/035/036 | Solo in `supabase/proposed/`, non modificati, nessuna migration |
| `supabase/migrations/` | Nessuna migration `kora_link` |
| File `.env*` reali tracciati in git | Nessuno (solo `.env.local.example`, template) |
| Working tree branch QA | Pulito (solo `supabase/.temp/` non tracciato) |

---

## 3. Routes Readiness

| Route | Role expected | Guard/auth expected | Public/Private | Expected behavior — flags off | Expected behavior — flags on | Manual QA status |
|---|---|---|---|---|---|---|
| `/link/[token]` | Worker (visitatore anonimo che scansiona NFC) | Nessuno a livello route — gating tramite feature flag (`KORA_LINK_ENABLED`) | Public | `hidden` → `notFound()` (404), indistinguibile da route inesistente | `true` + lookup off → `skeleton` safe; `true` + lookup on → `ready` o `unavailable` safe fallback | Verificato via test automatici (117+ test dedicati) + comportamento 404 confermato live in staging (KL-24, `KORA_LINK_ENABLED` attualmente off). Rendering visivo di `skeleton`/`ready` **non** verificato live (richiederebbe modificare env, fuori scope) |
| `/link/[token]/activate` | Worker autenticato | Sessione WORKER richiesta internamente (`getCurrentWorkerUser`) + feature flag (`KORA_LINK_ACTIVATION_ENABLED`) | Public (route), auth interna | Redirect a `?activation=disabled` | Valida token/readiness/auth/consenso → chiama RPC → redirect con esito safe | Verificato live: `GET` → `405` (Method Not Allowed), conferma routing corretto (KL-24). Flusso `POST` completo non eseguito live (flag off by design) |
| `/admin/kora-link` | KORA_ADMIN | `requireKoraAdmin()` server-side | Private | Capability matrix mostra `locked`/`requires_gate`, gate ladder Gate 2-9 aperti | Capability flag-gated → `configured` (mai `available` finché i gate non chiudono) | **Non verificato live** — nessuna credenziale KORA_ADMIN di staging disponibile (blocker). Verificato: redirect guard per visitatore anonimo, build, typecheck, code review, riuso degli stessi componenti condivisi validati live su `/company/kora-link` |
| `/admin/kora-link-lab` | KORA_ADMIN | `requireKoraAdmin()` server-side | Private | Non dipende da `KORA_LINK_ENABLED` — genera sempre un token demo se `KORA_LINK_PUBLIC_BASE_URL` è configurato | Stesso comportamento (Lab è `always_on`, indipendente dai flag della route pubblica) | **Non verificato live** — stesso blocker credenziali admin. `demo-lab.ts` ha 55 test unitari dedicati; pagina rivista a livello di codice in KL-20/21 |
| `/my-kora/kora-link` | WORKER (anche preview KORA_ADMIN, visitatore demo) | Gate client-side in `app/my-kora/layout.tsx` (sessione WORKER, preview admin, o demo-state) | Private | Messaggio "Activation non abilitata in questo ambiente" | CTA login se worker non autenticato; form di attivazione se autenticato | Voce nav confermata live (sidebar mostra "My KORA Link" con href corretto anche su `/worker/onboarding`). Rendering completo **bloccato**: i 3 account worker di staging (`worker-a/b/c`) sono tutti in stato `onboarding` e **tutte** le route `/my-kora/*` (incluse quelle pre-esistenti) li rediretto a `/worker/workspace` — confermato non specifico di KORA Link (KL-24) |
| `/company/kora-link` | COMPANY_ADMIN | `requireCompanyUser()` server-side | Private | Stato `requires_gate` indipendente dai 3 flag runtime (capability `drafted_pending_gate`, bloccata su Gate 2/4/5) | Stesso — non dipende dai flag runtime | **Verificato live** con sessione reale `company-admin@staging.kora.internal` — status `200`, contenuto corretto (banner "Nessuna visibilità individuale", capability card, gate ladder), zero errori console propri della pagina |
| `/partner/kora-link` | PARTNER | `requirePartnerUser()` server-side | Private | Contenuto interamente roadmap/Track A futuro — non dipende dai flag runtime | Stesso | **Non verificato live** — nessuna credenziale PARTNER di staging disponibile (blocker). Verificato: redirect guard per visitatore anonimo, build, typecheck, code review |

---

## 4. Env Readiness Matrix

Nessun valore segreto è stato letto o stampato in questa audit — solo presenza/assenza e comportamento atteso a livello di codice.

| Env var | Required for | Default behavior if missing | Safe for staging | Safe for production | Note |
|---|---|---|---|---|---|
| `KORA_LINK_ENABLED` | Flag master della route pubblica `/link/[token]` | `false` → stato `hidden` → 404 safe, nessun dato esposto | Sì | Sì | Deve essere esattamente `'true'` (case-sensitive); default off è la baseline sicura |
| `KORA_LINK_TOKEN_SECRET` | HMAC-SHA256 digest per DB lookup + activation; parte della readiness runtime complessiva | Mancante → readiness fallisce → route `unavailable` safe; digest throw catturato internamente | Sì, se generato ad hoc per staging (≥256 bit, mai riusato da produzione) | Sì, ma deve essere un valore distinto, mai committato, minimo 64 char hex | Mai stampato in nessuna UI (verificato in Fase 7); deve differire tra staging e produzione (KL-04 threat model) |
| `KORA_LINK_PUBLIC_BASE_URL` | Costruzione URL demo `/link/<token>` (Lab) e URL reale per contenuto chip NFC | Mancante → throw interno → readiness fallisce → route `unavailable`; Lab mostra "non configurato", nessun URL generato | Sì — va puntato all'URL app di staging | Sì — richiesto, deve essere l'URL reale di produzione prima di provisionare chip fisici | `http://` accettato solo per dev locale; produzione deve usare `https://` |
| `KORA_LINK_RATE_LIMIT_PROVIDER` | Selezione rate limiter (`disabled` \| `upstash`) per la route pubblica | Mancante → dev/test: route `unavailable`; produzione: factory lancia eccezione (hard block) | Sì se `upstash` con credenziali reali; `disabled` solo per dev/test interno, non per QA staging esposta | Solo `upstash` è sicuro in produzione; `disabled` non deve mai essere usato in produzione (bloccato dal codice) | `disabled` è dev/test only by design |
| `KORA_LINK_DB_LOOKUP_ENABLED` | Abilita il DB lookup reale (RPC `fn_public_lookup_link`) | `false` (default) → stato `skeleton` safe, nessun accesso DB tentato | **No, non ancora** — richiede Gate 2 (schema 034) + Gate 4 (RLS 035) + Gate 5 (staging con 034/035/036 applicati) | No — bloccato finché 036 non è applicato e revisionato | Default OFF è corretto oggi; non abilitare prima che i gate chiudano |
| `KORA_LINK_ACTIVATION_ENABLED` | Abilita il flusso di attivazione worker (RPC `fn_activate_link_for_worker`) | `false` (default) → pannello mostra "non abilitata in questo ambiente", nessuna RPC tentata | **No, non ancora** — stesse dipendenze di DB lookup + Gate 7 (worker activation) + Gate 3 (DPO/legal, copy di consenso ancora provvisoria) | No — bloccato finché Gate 2/3/4/5/7 non chiudono | Default OFF è corretto; copy di consenso esplicitamente marcata provvisoria |
| `UPSTASH_REDIS_REST_URL` | Rate limiting reale quando `KORA_LINK_RATE_LIMIT_PROVIDER=upstash` | Mancante → throw privacy-safe (nessun valore esposto) → route `unavailable` | Sì, una volta provisionata un'istanza Upstash di staging | Sì, richiesta se `KORA_LINK_ENABLED=true` — istanza separata da staging consigliata | Mai loggato; solo la presenza viene controllata |
| `UPSTASH_REDIS_REST_TOKEN` | Credenziale accoppiata a `UPSTASH_REDIS_REST_URL` | Stesso comportamento — throw safe, route `unavailable` | Sì, una volta provisionato | Sì, richiesto | Mai loggato, trattato come segreto |

**Nota documentale (non bloccante):** `.env.local.example` non elenca ancora nessuna delle 8 variabili KORA Link. Non modificato in questo step (regola "non modificare file .env"), ma segnalato come gap di documentazione da colmare in un task dedicato.

---

## 5. Role QA Matrix

| Ruolo | Credenziale disponibile | Route da testare | Cosa deve vedere | Cosa non deve vedere | Rischio privacy da verificare | Blocker attuale |
|---|---|---|---|---|---|---|
| **KORA_ADMIN** | **No** | `/admin/kora-link`, `/admin/kora-link-lab` | Control Tower completo: readiness, lifecycle, capability matrix 13×6, gate status, azioni operative; generazione token demo nel Lab | Scoring individuale worker, dati worker-level fuori contesto infrastrutturale | Che l'admin gestisca solo infrastruttura, mai scoring individuale (verificato staticamente — nessun riferimento a PIB/IU nei file KORA Link) | **Nessuna credenziale KORA_ADMIN di staging disponibile** — blocker operativo |
| **COMPANY_ADMIN** | **Sì** (`company-admin@staging.kora.internal`, verificata funzionante) | `/company/kora-link` | Governance aggregata: rollout readiness, 4 metric card (stato derivato, non numeri finti), capacità company, gate, confini privacy | `worker_id`, nomi worker, attività individuale, token raw, digest | Confermato: nessun dato worker-level esposto — banner esplicito "Nessuna visibilità individuale" presente nel rendering reale | Nessuno — **verificato live con successo** |
| **WORKER (fully onboarded)** | **Unknown/No** — 3 account esistono (`worker-a/b/c@staging.kora.internal`) ma tutti bloccati in `onboarding` | `/my-kora/kora-link` | Stato attivazione, cosa può fare, spiegazione consenso, checklist NFC, cosa l'azienda non vede | Dati di altri worker, vista aggregata company come se fosse propria | Che il worker non veda mai dati di altri worker e che il testo "cosa l'azienda non vede" sia coerente con la company page | **Nessun account worker di staging ha completato l'onboarding** — redirect automatico a `/worker/workspace` su tutte le route `/my-kora/*` (pre-esistente, non specifico KORA Link) |
| **PARTNER** | **No** | `/partner/kora-link` | Scan readiness (roadmap), requisito accreditamento, interazione privacy-safe, capacità partner, gate | Qualsiasi dato identificativo personale di un worker | Che la pagina non esponga mai dati personali anche in stato "roadmap" (verificato staticamente — nessun dato reale nel codice, solo testo descrittivo) | **Nessuna credenziale PARTNER di staging disponibile** — blocker operativo |

---

## 6. Manual NFC Test Plan

Checklist operativa per il test fisico con chip NFC. Da eseguire non appena la credenziale KORA_ADMIN di staging sarà disponibile.

| # | Step | Expected result | Pass/Fail | Notes |
|---|---|---|---|---|
| 1 | Login come KORA_ADMIN su staging | Accesso a `/admin`, sessione KORA_ADMIN attiva | ☐ Pending | Bloccato: nessuna credenziale KORA_ADMIN disponibile |
| 2 | Apri `/admin/kora-link-lab` | Pagina Lab si carica, mostra stato runtime senza secret | ☐ Pending | — |
| 3 | Genera URL demo | URL `/link/kl1_...` generato, token mostrato con nota "demo only, not persisted" | ☐ Pending | — |
| 4 | Copia URL | URL copiabile tramite selezione testo (`textarea readOnly` con `userSelect: all`) | ☐ Pending | — |
| 5 | Scrivi URL su chip NFC con app esterna | Chip scritto con successo (es. NFC Tools o app equivalente) | ☐ Pending | Richiede hardware fisico + app esterna, fuori dal perimetro software |
| 6 | Scansiona chip da telefono | Telefono apre il browser sull'URL scritto | ☐ Pending | — |
| 7 | Verifica apertura `/link/[token]` | Pagina pubblica si apre, nessun crash, nessun errore 500 | ☐ Pending | Confermato via test automatici + comportamento 404 quando flag off |
| 8 | Verifica comportamento con `KORA_LINK_ENABLED=false` | Pagina 404 safe, nessun dato esposto | ✅ **Verificato live in KL-24** | Confermato: comportamento attuale in staging (`KORA_LINK_ENABLED` non impostato) |
| 9 | Verifica comportamento con `KORA_LINK_ENABLED=true` e lookup off | Stato `skeleton` safe mostrato | ☐ Pending | Richiederebbe modificare env — fuori scope per questa audit (regola "non modificare .env") |
| 10 | Verifica che non avvenga activation | Nessuna chiamata RPC di attivazione se `KORA_LINK_ACTIVATION_ENABLED` è off | ✅ **Verificato via test unitari** | 52 test dedicati in `kora-link-activation.test.ts` coprono ogni combinazione flag/stato |
| 11 | Verifica che non venga salvato nulla | Nessun record DB creato, nessuna persistenza token | ✅ **Verificato via codice + test** | Nessuna chiamata Supabase scrittura nel percorso Lab/route pubblica quando i flag sono off; confermato staticamente (Fase 7) |
| 12 | Registra browser/device/app NFC usata | Log completo dell'ambiente di test | ☐ Pending | Da compilare al momento del test fisico reale |

---

## 7. Safety Boundary Verification

Controlli statici eseguiti su tutti i file KORA Link (`lib/kora-link/*`, `components/kora-link/*`, 5 pagine ruolo, route pubblica, route activation):

| Controllo | Esito |
|---|---|
| `grep service_role` nei file KORA Link | **0** — nessun match |
| `grep token_value\|raw_token\|clear_token\|token_plaintext` | **0** — unico match è l'id dichiarativo `no_raw_token_persistence` (boundary che *dichiara* l'assenza, non un valore reale) |
| `grep KORA_LINK_TOKEN_SECRET` nelle UI | **0** — mai stampato |
| `grep worker_id` nella company page | Presente solo come prosa descrittiva ("...identificativi worker (worker_id)...") che dichiara cosa **non** verrà mai mostrato — nessun dato esposto |
| `grep` creazione Impact Unit nei file KORA Link | **0** |
| `grep` mutazione KORA Index nei file KORA Link | **0** |
| `034_kora_link_schema.sql` / `035_kora_link_rls.sql` / `036_kora_link_rpc_functions.sql` modificati | **No** — diff vuoto vs `origin/main` |
| Migration nuove in `supabase/migrations/` | **0** |
| `package.json` / `package-lock.json` modificati | **No** — diff vuoto vs `origin/main` |

---

## 8. Known Blockers

1. **Gate 2 (CTO review 034/035/036) ancora aperto** — atteso, per design. Blocca l'applicazione reale dello schema/RLS/RPC.
2. **Gate 3 (DPO/legal) ancora aperto** — atteso. Blocca l'approvazione del testo di consenso definitivo e la whitelist `consent_version`.
3. **DB lookup reale non abilitabile** senza SQL/RLS/RPC applicati (Gate 2/4/5) — corretto stato attuale, flag default off.
4. **Activation reale non abilitabile** senza DPO/legal (Gate 3) + Gate 7 — corretto stato attuale, flag default off.
5. **Credenziali KORA_ADMIN di staging mancanti** — impedisce la QA browser live di `/admin/kora-link` e `/admin/kora-link-lab`, e blocca l'esecuzione fisica del test plan NFC (step 1).
6. **Credenziali PARTNER di staging mancanti** — impedisce la QA browser live di `/partner/kora-link`.
7. **Worker di staging bloccati in `onboarding`** — tutti e 3 gli account worker disponibili (`worker-a/b/c`) sono bloccati in questo stato, impedendo la QA browser live di `/my-kora/kora-link` (comportamento pre-esistente e generale a tutte le route `/my-kora/*`, non specifico di KORA Link — confermato in KL-24).
8. **(Non bloccante) Gap documentale** — `.env.local.example` non documenta ancora le 8 variabili env KORA Link.

---

## 9. What Is Safe to Test Now

- Navigazione anonima di tutte e 7 le route KORA Link (conferma redirect/guard corretti)
- QA completa di `/company/kora-link` con credenziale `company-admin@staging.kora.internal` — **già verificata con successo**
- Suite di test automatici completa (unit + E2E) — sempre eseguibile in sicurezza, nessun impatto su staging/produzione
- Build e typecheck — sempre eseguibili in sicurezza
- Ispezione del Lab e delle pagine admin/partner tramite code review (già fatto, nessun problema strutturale trovato)

---

## 10. What Remains Blocked

- QA browser live di `/admin/kora-link`, `/admin/kora-link-lab`, `/partner/kora-link` (credenziali mancanti)
- QA browser live di `/my-kora/kora-link` (worker onboarding incompleto)
- Test fisico NFC end-to-end (richiede step 1 del test plan, bloccato dalle credenziali admin)
- Abilitazione reale di `KORA_LINK_DB_LOOKUP_ENABLED` e `KORA_LINK_ACTIVATION_ENABLED` in staging (richiede Gate 2/3/4/5/7 chiusi)
- Qualsiasi abilitazione in produzione (richiede tutti i gate chiusi, Gate 9 incluso)

---

## 11. Recommended Next Action

1. **Provisioning credenziali di staging** per KORA_ADMIN e PARTNER (via Supabase Auth Admin API o dashboard, seguendo lo stesso pattern documentato in `docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md` per company/worker) — sblocca 3 dei 4 blocker QA.
2. **Sbloccare l'onboarding** di almeno un account worker di staging — sblocca la QA di `/my-kora/kora-link` e permette il completamento del test plan NFC end-to-end.
3. **Sottoporre 034/035/036 a review CTO formale** (Gate 2) — prerequisito per ogni ulteriore step di abilitazione reale.
4. Una volta completati i punti 1-2, rieseguire questa audit (o una sua versione ridotta) per portare `STAGING_BROWSER_QA_READY` e `NFC_DEMO_READY` a `yes`.

### Conclusione

| Flag | Valore |
|---|---|
| `STAGING_BROWSER_QA_READY` | **No** (parziale — 1 di 4 ruoli verificato live con successo; 3 bloccati da credenziali/onboarding, non da bug) |
| `NFC_DEMO_READY` | **No** (bloccato allo step 1 del test plan — nessuna credenziale KORA_ADMIN) |
| `DB_LOOKUP_ENABLEMENT_READY` | **No** (Gate 2/4/5 aperti) |
| `ACTIVATION_ENABLEMENT_READY` | **No** (Gate 2/3/4/5/7 aperti) |
| `PRODUCTION_READY` | **No** (Gate 9 e tutti i precedenti aperti) |

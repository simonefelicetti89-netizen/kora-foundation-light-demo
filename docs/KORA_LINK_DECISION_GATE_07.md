# KORA-LINK-DECISION-GATE-07 — Gate 3 DPO / Decision Gate

**Data:** 2026-07-15
**Branch:** `feature/kora-link-decision-gate-07`
**HEAD di partenza:** `cd144e18ffc71a7dbab3d1e251048b1c7813a7b8` (merge PR #80, `SENTRY-PRIVACY-HARDENING-06`)
**Tipo di sprint:** decision gate — nessuna modifica a codice, migrazioni, database, feature flag, navigazione, auth, Sentry, CSP, Origin guard, rate limiting.

## Domanda decisionale

> KORA Link è oggi abbastanza definito, coerente e privacy-safe da essere attivato su staging e incluso nel prossimo pilota, oppure deve essere nascosto?

**Risposta anticipata (dettagli in §9):** **HIDE FROM PILOT.** Il codice resta nel repository — è tecnicamente pulito, l'architettura è ragionevole e nessun dato reale viene oggi processato — ma non è ancora sicuro da esporre a utenti reali del pilota senza una sospensione esplicita a livello di navigazione, oltre ai tre flag di backend già presenti.

> **Nota (2026-07-16, KORA-LINK-SECURITY-FOUNDATION-08):** i blocker tecnici #1 (identità
> worker non verificata in `fn_activate_link_for_worker`) e #2 (assenza di soglia minima di
> aggregazione in `fn_company_link_status_aggregate`) elencati in §9 sono stati affrontati con
> una correzione engineering — vedi `docs/KORA_LINK_SECURITY_FOUNDATION_08.md`. Questo **non**
> modifica retroattivamente il verdetto `HIDE FROM PILOT` sopra: i blocker #3, #4, #5, #6, #7,
> #9, #10 restano aperti, e la chiusura dei blocker #1/#2 richiede ancora ratifica umana CTO
> (non concessa da questa nota). Un nuovo decision gate resta necessario prima di qualunque
> inclusione nel pilota.

---

## 0. Verifiche preliminari (eseguite prima di qualsiasi analisi)

| Verifica | Esito |
|---|---|
| `git status --short` | pulito |
| Branch di partenza | `main`, allineato a `origin/main` |
| HEAD | `cd144e1` (merge Sentry privacy hardening, come atteso dal brief) |
| `npx tsc --noEmit` | **PASS** — 0 errori |
| `npm test -- --run` (baseline, pre-modifiche) | **PASS** — 254 file di test, 10328 test passati, 30 skipped, 0 falliti |
| `npm run build` | **PASS** |
| `npm audit` | 0 vulnerabilità (info/low/moderate/high/critical tutti a 0) |
| `gitleaks` | **non eseguibile in questo ambiente** — binario non installato, nessun package manager (`brew`, `go`, `pipx`) disponibile per installarlo. Non è stato possibile eseguire una scansione locale; si presume la copertura esistente in CI (già completata secondo lo storico del progetto) |
| Inventario migrazioni Supabase | confermato — vedi §2 |

Ogni assunzione del brief è stata riverificata sul repository reale, non data per buona a priori (vedi correzioni in §1 e §7).

---

## 1. Inventario completo KORA Link

### 1.1 Libreria runtime — `lib/kora-link/` (8 file, 1863 righe, solo server, zero scritture DB a riposo)

| File | Righe | Scopo | Stato | Dipendenze DB | Ruolo che vi accede | Dati trattati | Rischio se esposto prematuramente |
|---|---|---|---|---|---|---|---|
| `token.ts` | 179 | Generazione/validazione formato/digest del token (`kl1_` + 48 char base62, ~285 bit entropia), redazione per i log | operativo | nessuna | interno (chiamato da altri moduli) | nessuno (funzioni pure) | basso — logica pura, nessuna persistenza |
| `config.ts` | 197 | 3 feature flag (`KORA_LINK_ENABLED`, `KORA_LINK_DB_LOOKUP_ENABLED`, `KORA_LINK_ACTIVATION_ENABLED`), match esatto `=== 'true'` (case-sensitive, nessuna coercizione truthy) | operativo | nessuna | interno | nessuno | basso — verificato: default `false` ovunque |
| `rate-limit.ts` | 297 | Rate limiter Upstash + fallback in-memory | operativo | nessuna (Upstash esterno) | interno | IP/identificatore tecnico (solo prefix digest, mai token raw) | basso-medio se Upstash non configurato in staging (fallback in-memory non persiste tra istanze) |
| `public-route.ts` | 114 | Macchina a stati per `/link/[token]` (hidden/token_invalid/unavailable/rate_limited/skeleton/ready) | operativo | nessuna (client RPC iniettato) | pubblico via route | nessuno | basso |
| `public-lookup.ts` | 102 | Chiama `fn_public_lookup_link` (RPC non distribuita) | parziale — safe-fail a `unavailable` quando `KORA_LINK_DB_LOOKUP_ENABLED` è off | `kora_link.links` (proposta, non applicata) | pubblico via route | nessuno oggi (RPC non raggiungibile) | basso oggi; medio se il flag venisse attivato senza aver chiuso il gap RPC (§2, 036) |
| `activation.ts` | 212 | Chiama `fn_activate_link_for_worker` (RPC non distribuita) | parziale — safe-fail quando `KORA_LINK_ACTIVATION_ENABLED` è off | `kora_link.links`, `link_assignments`, `link_consents`, `link_events` (proposte) | worker autenticato | consenso, worker_id (se mai attivato) | **alto se attivato prima della fix RPC** — vedi gap critico §2 |
| `demo-lab.ts` | 174 | Generatore effimero di token/URL NFC demo, non persistito | operativo (solo demo) | nessuna | KORA_ADMIN | nessuno reale (dati demo) | basso |
| `ecosystem.ts` | 588 | Modello statico canonico: 6 ruoli, 9 gate, 13 capacità, 6 dichiarazioni di confine privacy | operativo (dati statici) | nessuna | tutti (dati statici) | nessuno | basso |

### 1.2 Route/pagine (10 totali, tutte verificate direttamente nel sorgente)

| Path | Guardia di ruolo (verificata) | Stato | Dipendenza DB | Dati trattati | Rischio |
|---|---|---|---|---|---|
| `app/link/[token]/page.tsx` | **nessuna — pubblica**, ma `notFound()` se `isKoraLinkEnabled()` è false (verificato nel codice) | shell/skeleton | nessuna live | nessuno (fail-closed) | basso oggi; l'unica superficie raggiungibile da visitatore anonimo |
| `app/link/[token]/activate/route.ts` (POST) | richiede sessione worker autenticata + consenso esplicito + `assertSameOrigin` | parziale, feature-flag `KORA_LINK_ACTIVATION_ENABLED` (default off) | nessuna live | consenso, worker session | vedi gap RPC §2 se mai attivata |
| `app/admin/kora-link/page.tsx`, `/governance`, `/pilot-readiness`, `app/admin/kora-link-lab/page.tsx` | `requireKoraAdmin` | shell/dashboard di stato + demo lab | nessuna | nessuno reale | basso |
| `app/company/kora-link/page.tsx`, `/campaigns` | `requireCompanyUser` | shell, solo etichette aggregate, pannello esplicito "Nessuna visibilità individuale" | nessuna | nessuno | basso |
| `app/my-kora/kora-link/page.tsx` | gate worker/demo (layout `app/my-kora/layout.tsx`) | shell statico | nessuna | nessuno | basso |
| `app/worker/kora-link/activate/page.tsx` | `requireWorkerUser` (redirect a login se non autenticato) | anteprima UI/UX | nessuna | nessuno | basso |
| `app/partner/kora-link/page.tsx`, `/initiatives` | `requirePartnerUser` | shell, dati mock | nessuna | nessuno | basso — nessun endpoint di scansione/tabella `partner_scans` esiste (gap di modello, non di sicurezza) |

Tutte le pagine autenticate usano i guardiani di ruolo già esistenti nel layout (`requireKoraAdmin`/`requireCompanyUser`/`requireWorkerUser`/`requirePartnerUser`) — nessun sistema di auth nuovo, nessuna lacuna trovata a livello di pagina. L'unica route raggiungibile senza autenticazione è `/link/[token]`, e fallisce chiusa (`notFound()`) a meno che `KORA_LINK_ENABLED` non sia esattamente `'true'`.

### 1.3 Componenti

`components/kora-link/{KoraLinkBoundaryCard,KoraLinkCapabilityCard,KoraLinkReadinessPanel,KoraLinkRoleDashboard}.tsx` (219 righe totali) — solo presentazionali, consumano `ecosystem.ts` (dati statici), nessun accesso diretto a seed file o DB.

### 1.4 Feature flag — verificate contro gli env file reali, non solo la documentazione

3 flag a cascata in `config.ts`: `KORA_LINK_ENABLED` → `KORA_LINK_DB_LOOKUP_ENABLED` → `KORA_LINK_ACTIVATION_ENABLED`. Tutte di default `false`, match a stringa esatta `'true'`.

- `.env.local.example` imposta esplicitamente tutte e tre a `false`.
- Verificati tutti gli altri env file locali (`.env.local`, `.env.staging.local`, `.env.e2e.local`, `.env.production.local.backup`, `.env.kora-next-review.local*`): **nessuno** imposta variabili `KORA_LINK_*`, quindi ereditano il default `false`.
- **Non è stato possibile verificare i valori reali su Vercel staging/produzione** — nessun accesso a strumenti di deploy/Vercel CLI in questo ambiente. Questo è un gap esplicito da segnalare: il default a livello di repo è dimostrabilmente `false`, ma lo stato degli ambienti effettivamente distribuiti **non è verificabile da qui**.
- Non esiste un registro di feature flag condiviso (`lib/feature-flags.ts` o simile): KORA Link usa un proprio sistema dedicato a 3 flag, non un sistema di flag di piattaforma condiviso.

### 1.5 Navigazione — KORA Link è oggi visibile in 4 ruoli autenticati, non nascosto

| Posizione | File | Voci |
|---|---|---|
| Admin sidebar | `lib/navigation/admin-nav-groups.ts:54-56` | Control Tower, Governance, Pilot Readiness |
| Company sidebar | `components/layout/Sidebar.tsx:122-123` | 2 voci, una marcata "Anteprima design — nessuna campagna reale" |
| Worker/My KORA sidebar | `components/layout/Sidebar.tsx:164-165` | 2 voci, una marcata "Anteprima design — nessuna attivazione reale" |
| Partner sidebar | `components/layout/Sidebar.tsx:196-197` | 2 voci, una marcata "Anteprima design — dati mock" |

**Punto rilevante per la decisione:** anche con il backend disattivato (`KORA_LINK_ENABLED=false`), le voci di navigazione e le pagine stesse sono oggi raggiungibili da qualsiasi utente autenticato demo in ogni ruolo. Il contenuto è shell/statico e onestamente etichettato ("Anteprima design"), non è una pagina rotta — ma non è nemmeno nascosto. Questo è rilevante perché il prossimo pilota include utenti aziendali/worker reali, non solo tester interni: la scelta "visibile ma etichettato come anteprima" è ragionevole per un ambiente demo controllato, ma non è la stessa cosa di una sospensione attiva tramite feature flag di navigazione, che oggi **non esiste** (i 3 flag `KORA_LINK_*` controllano solo il comportamento backend, non la visibilità delle voci di menu).

### 1.6 Documentazione

`docs/KORA_LINK_STATUS.md`, `docs/KORA_LINK_ADR.md`, `docs/KORA_LINK_GATE_REPORT.md` (+ addendum KL-19), `docs/KORA_LINK_CHANGELOG.md` (2129 righe), più 11 file storici in `docs/archive/kora-link/`. Il Gate Report esistente (KL-11, 2026-07-01) riporta già uno stato interno coerente con questa analisi indipendente:

```
STAGING_ENABLEMENT  → NOT_READY — richiede Gate 2+3+4+5
La feature flag KORA_LINK_ENABLED deve restare 'false' in tutti gli ambienti
fino alla chiusura di Gate 2+3+4 e al completamento di Gate 5+6.
```

Questo Gate 07 (Gate 3 — DPO) è quindi una delle condizioni già riconosciute internamente come bloccanti, non una sorpresa. **Gate 2 (CTO/Postgres review) risulta tuttora aperto** per CLAUDE.md §9 — condizione bloccante indipendente da questo gate.

**Correzione a una lettura iniziale della documentazione (importante per l'accuratezza):** una prima analisi aveva segnalato come "overclaim" la voce `E2E: 6/6` nel Gate Report. Verifica diretta (righe 241-274 del report) mostra che il documento è in realtà accurato e onesto: `E2E 6/6` si riferisce a 6 smoke test generici (`tests/e2e/kora-smoke.spec.ts`), esplicitamente elencati come "già pronti" ma **non specifici a KORA Link**, mentre la sezione "Cosa manca per enablement" elenca esplicitamente `✗ E2E smoke con KORA_LINK_ENABLED=true` come mancante. Il gap di copertura E2E KORA-Link-specifica è reale (vedi §7), ma la documentazione non lo nasconde.

**Seconda correzione:** una prima analisi aveva segnalato l'assenza di test Sentry specifici per KORA Link. Verifica diretta di `tests/unit/sentry-privacy-hardening-06.test.ts` (righe 114-151) mostra che esiste un test dedicato che asserisce esplicitamente la sanificazione di `/link/[token]` e `/link/[token]/activate` in `lib/sentry/scrub.ts`. La copertura Sentry per KORA Link **è presente e specifica**, non solo generica.

### 1.7 Migrazioni 037/038 — non sono KORA Link

I file `037_contribution_atomic_attribution.sql` e `038_initiative_adoption_source_model.sql` non appartengono a KORA Link: i loro stessi header dichiarano di essere migrazioni riassegnate per funzionalità non correlate (attribuzione atomica di KORA Contribution, modello di adozione iniziative), collocate nella numerazione 037/038 solo perché 034-036 erano già riservate a KORA Link. Non hanno alcuna dipendenza dallo schema `kora_link`. Sono incluse nell'inventario §2 solo per completezza rispetto al brief, ma non fanno parte della superficie di rischio KORA Link.

---

## 2. Analisi migrazioni 034-038

**Stato di collocazione:** tutte e 5 le migrazioni restano in `supabase/proposed/`, **mai applicate, mai spostate in `supabase/migrations/`** (confermato via `find` e `git log --follow` sulla cronologia completa). Le migrazioni applicate coprono 001-028, 030-033 (nessun salto non intenzionale). 034-038 sono le uniche migrazioni proposte/non applicate nel repository.

### 034_kora_link_schema.sql (1341 righe)

- **Scopo:** schema `kora_link` — 9 tabelle: `link_batches`, `links`, `link_assignments`, `link_consents`, `link_events`, `revocations`, `link_replacements`, `audit_log`, `link_delivery_records`.
- **Dipendenze:** richiede 001 (`set_updated_at()`), 006 (`kora.kora_role()`, `kora.tenant_id()`), tutte le migrazioni 001-033 applicate. Deve precedere 035.
- **Idempotenza:** sì — `CREATE SCHEMA IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, racchiuso in `BEGIN…COMMIT`.
- **Rollback:** `DROP SCHEMA kora_link CASCADE` (documentato, richiede approvazione CTO, non automatizzato).
- **Impatto su tabelle esistenti:** nessuno — schema completamente nuovo/isolato, nessun `ALTER` su tabelle esistenti.
- **Dati distruttivi:** nessuno.
- **Default pericolosi:** nessuno rilevato.
- **Policy FK:** deliberatamente **nessuna FK cross-schema** su `tenant_id`/`worker_id` (segue il precedente della migrazione 033) — il confine è imposto da RLS (035) + SECURITY DEFINER, non da integrità referenziale. FK interne allo schema presenti (es. `batch_id → link_batches`).
- **Sicurezza token:** `token_digest` (HMAC-SHA256, 64 char hex, `UNIQUE`) è l'unico identificatore di token persistito — nessuna colonna con token in chiaro in tutto lo schema (verificato: nessuna colonna `token_value` o `nfc_url`).
- **SECURITY DEFINER:** nessuna in questo file (solo schema).
- **RLS:** esplicitamente **non abilitata** in 034 (rimandata a 035).
- **Grants:** nessuno in questo file.
- **Seed/demo:** nessuno.
- **Blocchi Gate 3/DPO ancora aperti, documentati nel file stesso** (non risolti a livello di engineering): durata di retention di `audit_log`; strategia di hashing/base giuridica di `request_fingerprint`; approvazione del testo di `link_consents.consent_version`; semantica di `delivered_to_label`.
- **Rischio applicazione staging:** basso — puramente additivo, schema isolato.
- **Rischio applicazione produzione futura:** basso a livello di schema; il rischio reale è a valle (RLS/RPC, vedi 035/036).

### 035_kora_link_rls.sql (780 righe)

- **Scopo:** policy RLS + grant per le 9 tabelle di 034.
- **Dipendenze:** 034 applicata.
- **Marcatore di stato nel file:** `PROPOSED_RLS_DRAFT_INTERNAL_ENGINEERING` — dichiara esplicitamente che la chiusura Gate 2 di 034 **non** si estende a 035, che ha una propria review separata ancora aperta (chiamata "Gate 4" nel repo).
- **Idempotenza:** sì (`DROP POLICY IF EXISTS` prima di ogni `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`).
- **RLS:** abilitata + **FORCE ROW LEVEL SECURITY** su tutte le 9 tabelle, deny-by-default, quasi ovunque solo KORA_ADMIN.
- **SECURITY DEFINER:** una sola funzione, `kora_link.is_kora_admin()` — **non** è SECURITY DEFINER (è SECURITY INVOKER di default), delega a `kora.kora_role()`. `REVOKE ALL … FROM PUBLIC` poi `GRANT EXECUTE TO authenticated` — pattern corretto.
- **Gap rilevante n.1:** nessuna policy di self-select per il worker su `link_assignments` — completamente specificata ma commentata, bloccata in attesa di review RLS cross-schema con `personal.worker_identity`.
- **Gap rilevante n.2:** nessuna policy SELECT company-facing né vista aggregata in 035 — la visibilità aziendale è interamente rimandata alla RPC in 036.
- **Grants:** `anon` riceve solo `USAGE` sullo schema, nessun grant a livello di tabella — corretto per il design "nessun accesso diretto alle righe". `service_role` riceve grant che rispecchiano `authenticated`, esplicitamente nessun `DELETE` da nessuna parte.
- **Rollback:** sequenza manuale documentata (disabilitare RLS per tabella, drop funzione, revoke usage).
- **Dati distruttivi/seed:** nessuno.

### 036_kora_link_rpc_functions.sql (891 righe)

- **Scopo:** 6 funzioni — `fn_is_valid_token_digest` (INVOKER), `fn_public_lookup_link`, `fn_activate_link_for_worker`, `fn_revoke_link`, `fn_replace_link`, `fn_company_link_status_aggregate` (le ultime 5 SECURITY DEFINER).
- **Dipendenze:** 034 + 035 applicate, e 035 testata su staging prima di applicare 036.
- **`search_path`:** ogni funzione SECURITY DEFINER imposta esplicitamente `SET search_path = kora_link, kora, public` — corretto, evita il classico problema di hijack del `search_path` in funzioni SECURITY DEFINER Postgres.
- **Grants:** pattern `REVOKE ALL … FROM PUBLIC` poi `GRANT EXECUTE` selettivo, coerente in tutto il file.

**Gap critico confermato (non un semplice commento TODO, ma una lacuna di validazione reale nel codice):**

```sql
-- riga 94-96:
-- [TODO-RPC-02] fn_activate_link_for_worker: cross-schema validation.
--   p_worker_id is accepted as a parameter. In production, the caller (server-side route)
--   must verify p_worker_id = auth.uid() → personal.worker_identity cross-schema join.
```

`fn_activate_link_for_worker(p_token_digest, p_worker_id, p_consent_version)` (riga 296) accetta `p_worker_id` come parametro fornito dal chiamante **senza validazione contro `auth.uid()`** all'interno della funzione stessa — la funzione si limita a verificare `p_worker_id IS NULL` (riga 323), non che coincida con la sessione del chiamante. La funzione è già concessa (`GRANT EXECUTE … TO authenticated, service_role`, riga 442). Come scritto oggi, qualunque chiamante autenticato che invocasse direttamente questa RPC (bypassando la route server-side) potrebbe passare un `worker_id` arbitrario e creare un'associazione token↔worker per un'altra persona — violazione diretta dell'invariante "solo server-side, dopo login + consenso esplicito" dichiarato in 034. **Questo è un gap di sicurezza/privacy autentico e non ancora mitigato**, non solo una nota di documentazione.

Altri elementi rilevati:

- `fn_public_lookup_link`: design anti-enumerazione solido — risposta identica per "non trovato" e "non utilizzabile", non restituisce mai `worker_id`/`tenant_id`/`token_digest`/`link_id`. Grant a `anon` ancora marcato `[TODO-RPC-01]` non confermato da CTO.
- `consent_version` in `fn_activate_link_for_worker` è **hardcoded** al valore letterale `'kora-link-privacy-v1.0'` (`[TODO-RPC-03]`, irrisolto) — il testo reale dell'informativa deve essere approvato dal DPO.
- `fn_company_link_status_aggregate`: valida correttamente `p_tenant_id = kora.tenant_id()` per `COMPANY_ADMIN` (guardia cross-tenant presente), restituisce solo `(status, count)` — nessun dato per singolo chip. **Nessuna soglia minima di soppressione applicata** (`[TODO-RPC-04]`, irrisolto): un tenant con esattamente 1 chip attivo mostrerebbe `count=1`, il che, combinato con la conoscenza dell'organico, rischia re-identificazione in aziende/reparti molto piccoli — a differenza della soglia ≥10 (`safe_aggregation_threshold`) usata altrove nella piattaforma.
- Concorrenza: `fn_activate_link_for_worker`, `fn_revoke_link`, `fn_replace_link` usano tutte `SELECT … FOR UPDATE NOWAIT` con gestione esplicita dell'eccezione `lock_not_available` — protezione da race condition solida.
- Rollback: `DROP FUNCTION` documentato per funzione.
- Nessuna operazione distruttiva, nessun seed.

### 037/038 — non KORA Link (vedi §1.7)

Brevemente per completezza: 037 avvolge due insert atomici in `commons.contribution_event` (fix di scrittura parziale, funzione SECURITY DEFINER con `search_path` esplicito, grant solo `service_role`); 038 crea `commons.initiative_adoption` con esclusione costituzionale esplicita di colonne per-worker (RLS abilitata, policy KORA_ADMIN-all + SELECT scoped per azienda). Entrambe dipendono solo da 025 (REVISED), indipendenti tra loro e da 034-036.

### Ordine di applicazione

`033 (applicata) → 034 → 035 → 036` è un ordine stretto, documentato, non negoziabile per KORA Link. 037 e 038 dipendono solo da 025 (REVISED) e sono indipendenti l'una dall'altra e dal blocco 034-036 — non le bloccano né ne sono bloccate.

### Test che referenziano queste migrazioni

`tests/unit/kora-link-schema034-review.test.ts` e `tests/unit/kora-link-rls035-review.test.ts` sono **revisori statici del testo SQL**, non test eseguiti contro un database reale. Nessun test della suite esercita queste migrazioni contro un'istanza Postgres reale — tutto è statico/mockato, coerente con il fatto che le migrazioni non sono mai state applicate da nessuna parte.

---

## 3. Matrice di tracciabilità UI ↔ API/RPC ↔ DB

| Azione utente | Pagina/componente | API/RPC | Tabella | Auth | RLS | Output visibile | Test esistente | Stato E2E |
|---|---|---|---|---|---|---|---|---|
| Creazione KORA Link (batch) | *nessuna UI trovata* | *nessuna RPC di creazione tra le 6 definite in 036* | `link_batches`, `links` (proposte) | — | — | — | nessuno | **non implementato** — gap di modello, non solo di stato "non testato" |
| Generazione token | `demo-lab.ts` (solo demo, effimero) | `token.ts:generateToken()` (pura funzione) | nessuna (non persistito) | KORA_ADMIN | n/a | token demo mostrato in UI admin | `kora-link-token.test.ts`, `kora-link-demo-lab.test.ts` | solo UI (demo), completo per lo scopo demo |
| Accesso tramite token | `app/link/[token]/page.tsx` | `public-route.ts` → `public-lookup.ts` → `fn_public_lookup_link` (non distribuita) | `kora_link.links` (proposta) | nessuna (pubblico) | n/a (RPC non distribuita) | stato `unavailable`/skeleton | `kora-link-public-route.test.ts`, `kora-link-public-lookup.test.ts` | solo UI — RPC non raggiungibile |
| Validazione token | `token.ts:validateTokenFormat` (formato) + `fn_is_valid_token_digest` (non distribuita) | come sopra | `kora_link.links` | n/a | n/a | — | `kora-link-token.test.ts` (formato); nessun test su `fn_is_valid_token_digest` reale | incompleto |
| Scadenza (expiry) | non individuata alcuna UI/logica applicativa esplicita per la gestione TTL | presumibilmente interna a `fn_activate_link_for_worker`/`fn_public_lookup_link` (non verificabile senza DB) | `links.expires_at` (presunta, da schema) | — | — | — | **nessuno**, nemmeno statico | non testato |
| Revoca | *nessuna UI trovata che invochi la revoca* | `fn_revoke_link` (definita, non distribuita) | `kora_link.links`, `revocations` | KORA_ADMIN (da grant) | RLS KORA_ADMIN-only | — | **nessuno** | non testato, solo DB (proposto) |
| Attivazione | `app/worker/kora-link/activate/page.tsx`, `app/link/[token]/activate/route.ts` | `activation.ts` → `fn_activate_link_for_worker` (non distribuita, **gap critico** su `p_worker_id`) | `link_assignments`, `link_consents`, `link_events` | worker autenticato + consenso + `assertSameOrigin` | RLS deny-by-default, nessuna policy self-select worker ancora attiva | UI di conferma attivazione | `kora-link-activation.test.ts` (mockato) | incompleto — gap RPC non coperto da alcun test |
| Partecipazione/risposta | non individuata alcuna funzionalità distinta dall'attivazione | — | — | — | — | — | — | non applicabile / non implementato in Foundation Light |
| Visualizzazione azienda | `app/company/kora-link/page.tsx`, `/campaigns` | `fn_company_link_status_aggregate` (non distribuita, manca soglia minima) | vista aggregata su `links` | `requireCompanyUser` | RLS + guardia tenant nella RPC | solo etichette aggregate statiche, "Nessuna visibilità individuale" | nessun test end-to-end della RPC; test statici sulla pagina | solo UI (statica) |
| Visualizzazione worker | `app/my-kora/kora-link/page.tsx` | nessuna chiamata dati reale | — | gate worker/demo | — | wallet view statico | `worker-personal-area-kora-link-01.test.ts` | solo UI (statica) |
| Accesso partner | `app/partner/kora-link/page.tsx`, `/initiatives` | nessuna | — | `requirePartnerUser` | — | dati mock | test statici sulla pagina | solo UI (mock) — nessuna tabella `partner_scans` esiste, modello di accesso partner non definito a livello DB |
| Audit dell'azione | *nessun codice applicativo che scriva su `audit_log`* (nessuna RPC distribuita) | funzioni SECURITY DEFINER in 036 scrivono su `audit_log` internamente (non verificabile senza DB) | `kora_link.audit_log` (proposta) | — | RLS KORA_ADMIN-only (da 035) | — | test statico sul testo SQL | solo DB (schema, non collegato) |
| Cancellazione | non prevista come hard-delete — il meccanismo di design è la revoca (append-only, coerente con "nessuna operazione distruttiva" osservata in 034/035) | — | — | — | — | — | — | gestita concettualmente tramite revoca, non tramite cancellazione |
| Gestione errori | `public-route.ts` (macchina a stati: hidden/token_invalid/unavailable/rate_limited/skeleton/ready) | — | — | — | — | pagine di errore sicure, nessun oracolo di esistenza token | `kora-link-public-route.test.ts` (28 casi) | **completo** per il livello UI attualmente implementato |
| Rate limiting | `rate-limit.ts` + Upstash/fallback in-memory | — | — | — | — | risposta 429 | `kora-link-rate-limit.test.ts`, `kora-link-rate-limit-upstash.test.ts` (Upstash mockato) | completo a livello unit, non verificato contro Upstash reale in staging |
| Origin guard | `app/link/[token]/activate/route.ts` usa `assertSameOrigin` | — | — | — | — | — | `security-origin-guard-03-routes.test.ts` (asserzione statica sull'import) | presente, verificato solo staticamente |
| Sanitizzazione Sentry | `lib/sentry/scrub.ts` — pattern espliciti per `/link/[token]` e `/link/[token]/activate` | — | — | — | — | — | `tests/unit/sentry-privacy-hardening-06.test.ts` (righe 114-151, asserzioni dirette) | **completo e specifico** — corretto rispetto a una prima valutazione che lo segnalava come solo generico |

**Sintesi:** nessun percorso della matrice è "completo" end-to-end nel senso pieno (UI + API + DB + RLS + test dal vivo). I percorsi più maturi (gestione errori, rate limiting, Sentry) sono completi a livello di UI/applicazione ma non hanno mai attraversato un database reale perché non esiste ancora un database da attraversare. I percorsi meno maturi (creazione link, revoca, scadenza, partecipazione) hanno lacune di modello, non solo di stato di implementazione.

---

## 4. Privacy Gate 3 — analisi dettagliata

### 4.1 Token e link

| Aspetto | Valutazione |
|---|---|
| Entropia | ~285 bit (48 char base62 con rejection sampling) — solida |
| Durata | schema prevede `expires_at` (presunto), ma nessuna logica applicativa di scadenza verificata né testata |
| Single-use o multi-use | non determinabile senza applicare 034 e ispezionare i vincoli reali; il design a "batch" (`link_batches`) suggerisce link riutilizzabili per campagna, ma la semantica esatta non è documentata in modo verificabile in questo passaggio |
| Revoca | RPC `fn_revoke_link` definita con locking corretto, ma **zero copertura di test** (nemmeno statica) e nessuna UI che la invochi |
| Esposizione in URL | il token appare in chiaro nell'URL pubblico (`/link/[token]`) — è il design atteso per un link condivisibile, ma comporta rischio di leakage via browser history, referrer, log di terze parti, screenshot condivisi |
| Logging | `token.ts` include redazione esplicita per i log; Sentry ha pattern dedicati che sostituiscono il token con `[token]` nel path — verificato con test specifico |
| Browser history / referrer | rischio strutturale di qualsiasi link magic-token, non mitigato da alcuna funzionalità specifica (es. nessun redirect a URL "puliti" dopo il primo uso osservato) |
| Condivisione accidentale | rischio intrinseco al modello token-in-URL; nessuna misura aggiuntiva oltre alla revoca (non testata) |
| Brute force / enumerazione | mitigato bene lato design: `fn_public_lookup_link` restituisce risposta identica per token inesistente/non utilizzabile, mai un oracolo di esistenza; rate limiting presente |
| Possibilità di enumerazione | bassa, grazie a entropia + risposta uniforme + rate limiting, **ma tutto ciò dipende da una RPC non ancora distribuita** — oggi la mitigazione è solo teorica/di design |

### 4.2 Dati

- **Prima dell'autenticazione:** in teoria nessun dato personale (il lookup pubblico non richiede login), solo metadati tecnici per rate limiting (IP/identificatore, mai il token raw).
- **Dopo l'attivazione:** worker_id, consenso (`consent_version`, testo non ancora approvato dal DPO), timestamp, evento di attivazione.
- **Identificatori personali:** nessuna colonna con nome/email osservata nello schema 034 (verificato staticamente da `kora-link-privacy-invariants.test.ts`).
- **Audit log:** tabella `audit_log` prevista in 034, ma **retention non definita** (blocco esplicito nel file stesso) e nessuna logica applicativa distribuita per scriverci.
- **Metadati tecnici:** `request_fingerprint` menzionato nello schema con base giuridica/strategia di hashing non ancora decisa (blocco esplicito).

### 4.3 Visibilità per ruolo

| Ruolo | Cosa può vedere oggi (stato reale, non teorico) |
|---|---|
| KORA_ADMIN | dashboard di stato/governance statiche, generatore demo token (non persistito) |
| COMPANY_ADMIN | etichette aggregate statiche, nessun dato reale (DB non distribuito) |
| COMPANY_VIEWER | stesso di COMPANY_ADMIN a livello di superficie oggi disponibile |
| WORKER | wallet view statico, pagina di attivazione (non funzionale, RPC non distribuita) |
| PARTNER | shell con dati mock, nessun endpoint di scansione |
| Visitatore anonimo | può raggiungere `/link/[token]` se il flag fosse acceso; oggi vede solo stato "non disponibile" |
| Titolare del link / organizzazione emittente | nessuna UI di creazione/gestione trovata — gap di modello (vedi §3) |

**Nessun ruolo può oggi inferire dati individuali reali**, semplicemente perché non esiste alcun dato reale nel sistema (DB non applicato). Questa è una garanzia "per assenza", non una garanzia architetturale dimostrata sotto carico reale — è il punto centrale del gap identificato in §2 su `fn_company_link_status_aggregate` (soglia minima assente) e su `fn_activate_link_for_worker` (validazione worker_id assente): se il DB venisse applicato oggi così com'è, queste garanzie di privacy per ruolo **non reggerebbero** in tutti i casi.

### 4.4 Piccoli numeri

- **Soglia minima di aggregazione:** la piattaforma usa altrove `safe_aggregation_threshold` ≥ 10 (da CLAUDE.md §13). `fn_company_link_status_aggregate` in 036 **non implementa questa soglia** — rischio concreto di re-identificazione per aziende/reparti piccoli se applicata senza fix.
- **Rischio di re-identificazione:** presente in potenza (RPC non distribuita, quindi non sfruttabile oggi), ma è un difetto di design da correggere prima di qualunque distribuzione, non un dettaglio implementativo minore.
- **Filtri/combinazioni/esportazioni:** nessuna funzionalità di esportazione o filtro granulare individuata per KORA Link — riduce la superficie di rischio rispetto ad altre aree della piattaforma, ma solo perché la funzionalità non esiste ancora.

---

## 5. Gate DPO

### A. Finalità

- **Finalità dichiarata:** attivare la partecipazione volontaria del lavoratore a un'iniziativa KORA tramite un link/chip fisico o digitale, con consenso esplicito, senza creare visibilità individuale per il datore di lavoro.
- **Finalità realmente implementata oggi:** nessuna — il flusso end-to-end non è mai stato eseguito contro un database reale; ciò che esiste è un impianto di design e shell UI coerenti con la finalità dichiarata, non ancora un sistema funzionante.
- **Divergenze:** nessuna divergenza di intento rilevata tra ciò che i documenti dichiarano e ciò che il codice implementa — il gap è di completezza, non di direzione.
- **Uso secondario dei dati:** non individuato; nessun collegamento a KORA Index, PIB o altri output di scoring è stato trovato nel codice KORA Link stesso (coerente con il vincolo costituzionale che PIB non è mai employer-visible).

### B. Necessità e proporzionalità

- **Dati realmente necessari:** token digest, worker_id (dopo attivazione), timestamp, stato del consenso.
- **Dati eliminabili/da rivedere:** `request_fingerprint` — la sua necessità e la sua base giuridica non sono ancora state stabilite (blocco esplicito nel file 034); va deciso se è indispensabile per anti-abuso o se può essere eliminato/minimizzato.
- **Identificatori non necessari:** nessuno osservato oltre a quanto sopra — lo schema è già minimale nella sua forma attuale (nessuna colonna nome/email/dati sensibili nello schema 034).
- **Durata necessaria dei token:** da definire — non trovata alcuna policy TTL implementata o documentata con un valore specifico.
- **Durata necessaria dei dati (audit log):** esplicitamente non definita — blocco aperto nel file 034 stesso.
- **Alternative meno invasive:** non applicabile in questa fase — il modello (token opaco, nessun identificatore in chiaro, aggregazione lato azienda) è già orientato alla minimizzazione; il lavoro restante è chiudere le decisioni aperte, non ripensare l'approccio.

### C. Base giuridica proposta (da validare — non pubblicata come policy definitiva)

Il consenso non è usato come base universale, per istruzione esplicita del brief.

- **Azienda cliente:** verosimilmente esecuzione di un accordo/contratto con KORA per l'erogazione della piattaforma di attivazione (rapporto azienda↔KORA), distinto dal trattamento sul singolo lavoratore.
- **Lavoratore:** per l'atto specifico di attivazione/partecipazione, il **consenso specifico e revocabile** è appropriato (coerente con `link_consents.consent_version` già previsto nello schema e con il principio costituzionale di "partecipazione volontaria"). Per l'infrastruttura di trattamento sottostante (es. mantenimento dell'associazione token↔worker una volta attivata), la base più adatta è probabilmente l'esecuzione di un'iniziativa nell'ambito del rapporto di lavoro/legittimo interesse dell'azienda, non il consenso duplicato.
- **Visitatore anonimo (click pre-autenticazione):** legittimo interesse per il trattamento tecnico minimo (rate limiting, anti-abuso), nessun dato personale trattato in questa fase salvo metadati tecnici.
- **Partner:** da definire in base al modello contrattuale partner, non ancora specificato nel codice o nei documenti disponibili.
- **Utenti demo/test:** nessuna base giuridica reale necessaria — dati sintetici, non persone reali.

### D. Ruoli privacy (qualificazione probabile, non definitiva)

Il brief richiede esplicitamente di non dichiarare una qualificazione definitiva senza un modello contrattuale chiuso. Sulla base di quanto osservato:

- **KORA come responsabile del trattamento (processor)** per i dati dei lavoratori trattati per conto dell'azienda cliente è la qualificazione più probabile per il flusso worker↔azienda, coerente con il resto della piattaforma KORA (misura organizzazioni, non individui, e opera su dati forniti/gestiti dall'azienda).
- **Azienda cliente come titolare** per i dati dei propri lavoratori.
- **Contitolarità** non esclusa per la fase di progettazione/gestione del link stesso (KORA definisce token, entropia, scadenza, revoca — decisioni che incidono sul trattamento), ma richiede analisi contrattuale specifica.
- **Per il partner:** qualificazione non determinabile — il modello di accesso partner non è nemmeno definito a livello di schema (nessuna tabella `partner_scans`).

Nessuna qualificazione definitiva viene dichiarata qui: il modello contrattuale non è ancora chiuso.

### E. Rischi

| Rischio | Probabilità | Impatto | Rischio residuo | Misura necessaria |
|---|---|---|---|---|
| Identificazione indebita del lavoratore da parte del datore tramite aggregati piccoli | media (se attivato senza fix) | alto | alto senza fix | implementare soglia minima ≥10 su `fn_company_link_status_aggregate` prima di qualunque distribuzione |
| Assegnazione di un token a un worker_id arbitrario (spoofing di attivazione) | media (RPC già concessa a `authenticated`) | alto | alto senza fix | validare `p_worker_id = auth.uid()` dentro la RPC stessa, non solo a livello di route applicativa |
| Link leakage (token in URL condiviso accidentalmente) | media (intrinseco al modello) | medio | medio, mitigabile ma non eliminabile | policy di revoca rapida testata e funzionante; considerare notifica al worker in caso di attivazione |
| Coercizione (datore che spinge il lavoratore ad attivare) | bassa-media (dipende da comunicazione aziendale, fuori dal controllo tecnico) | medio | medio | messaggistica chiara di volontarietà nel testo di consenso (`consent_version`), non ancora approvato |
| Monitoraggio del lavoratore da parte del datore | bassa, se le soglie di aggregazione vengono corrette | alto se il gap non viene corretto | alto senza fix | vedi rischio "identificazione indebita" sopra |
| Inferenze da combinazione di dataset | bassa oggi (nessuna integrazione osservata con KORA Index/PIB) | medio se introdotta in futuro | basso oggi | mantenere la separazione già osservata nel codice |
| Accesso cross-tenant | bassa (guardia `p_tenant_id = kora.tenant_id()` presente in `fn_company_link_status_aggregate`) | alto se sfruttato | basso-medio, non testato dal vivo | aggiungere test comportamentale cross-tenant reale (oggi solo verifica statica del testo SQL) |
| Uso improprio da parte del datore (es. tentativo di ottenere dati individuali) | bassa (nessun percorso UI/RPC restituisce dati individuali al datore, per design) | alto se un percorso venisse aggiunto senza review | basso oggi | mantenere il vincolo costituzionale in ogni futura RPC aggiuntiva |
| Piccoli numeri (vedi sopra, duplicato per enfasi) | media | alto | alto senza fix | soglia minima di aggregazione |
| Conservazione eccessiva (retention non definita) | alta (nessuna policy esiste) | medio-alto nel tempo | alto finché non definita | decisione DPO su retention di `audit_log` e dati di attivazione |
| Revoca inefficace (non testata, non collegata a UI) | media | medio | medio | UI di revoca + test comportamentale prima di staging |
| Assenza di informativa contestuale | alta (testo di consenso non approvato) | medio | medio-alto | approvazione testo `consent_version` da parte del DPO prima di qualunque attivazione reale |
| Sicurezza token | bassa (entropia solida, digest-only, anti-enumerazione) | alto se compromesso | basso | nessuna azione aggiuntiva urgente, buona pratica già applicata |
| Abuso API (chiamata diretta alla RPC bypassando la route) | media (RPC concesse a `authenticated`, non solo a `service_role`) | alto (vedi spoofing worker_id sopra) | alto senza fix | stessa fix di validazione `p_worker_id` |
| Mancata cancellazione | bassa (il modello usa revoca append-only, non cancellazione — scelta di design coerente con audit trail) | basso | basso | nessuna azione, purché la retention venga comunque definita |

### F. DPIA trigger

Valutando i criteri (monitoraggio sistematico, valutazione di persone, contesto lavorativo, scala, uso innovativo, combinazione di dataset, soggetti vulnerabili, decisioni che incidono sulle persone):

- **Contesto lavorativo:** sì, presente.
- **Scala:** potenzialmente ampia (tutti i lavoratori delle aziende pilota), ma dipende dal volume reale del pilota.
- **Valutazione di persone / decisioni automatizzate su individui:** non individuata — KORA Link non produce scoring individuale, coerente con il vincolo costituzionale che il PIB non è mai employer-visible.
- **Monitoraggio sistematico:** non nella forma attuale (nessun tracking comportamentale continuo osservato), ma il combinato "audit_log + request_fingerprint" con retention non definita **potrebbe** avvicinarsi a questo profilo se implementato senza minimizzazione — dipende da decisioni non ancora prese.
- **Soggetti vulnerabili:** nessuno specificamente individuato.

**Conclusione (non una DPIA completa, come richiesto dal brief):** **DPIA consigliata**, non ancora "probabilmente necessaria" in modo definitivo — la determinazione finale dipende dal modello operativo (in particolare: come verrà usato `request_fingerprint`, quale sarà la retention reale, e se il modello di accesso partner introdurrà nuove forme di osservabilità individuale). Coerentemente con l'istruzione del brief, **non è possibile una decisione definitiva senza il modello operativo conclusivo**; si raccomanda di avviare una DPIA leggera prima della chiusura di questo gate per il prossimo pilota, e di renderla completa se il modello di retention/fingerprint dovesse ampliare la superficie di osservabilità.

---

## 6. Feature flag e visibilità attuale

Confermato in dettaglio in §1.4 e §1.5. Sintesi per la decisione:

- Oggi KORA Link **è raggiungibile** da: utenti demo, utenti azienda (autenticati), worker (autenticati), partner (autenticati) — tramite sidebar item onestamente etichettati come anteprima.
- **Non è raggiungibile** da: pubblico generico che naviga senza un link diretto (nessuna voce in sitemap/footer pubblico osservata) — l'unica superficie pubblica è `/link/[token]`, raggiungibile solo conoscendo/ricevendo un token, e comunque fail-closed se il flag è off.
- **Un utente può raggiungere superfici incomplete anche senza link in navigazione?** Sì, in teoria, per URL diretto (`/link/[token]` con un token qualsiasi anche non valido) — ma il comportamento è sicuro (stato `token_invalid`/`hidden`, nessun oracolo).
- **Non esiste un meccanismo di feature flag che sospenda la visibilità di navigazione** — i 3 flag `KORA_LINK_*` controllano solo il comportamento backend (lookup DB, attivazione), non se le voci di sidebar/le pagine shell compaiono. Questo è il gap operativo centrale della sezione 6: per un pilota con utenti aziendali reali, "onestamente etichettato come anteprima" potrebbe non essere sufficiente — serve una sospensione esplicita se si vuole davvero che il pilota non veda nulla di KORA Link fino al completamento dei gate.

Nessun feature flag è stato applicato in questo sprint, come da vincolo del brief.

---

## 7. Test e readiness

### 7.1 Inventario (16 file dedicati KORA Link, ~691 casi di test)

| File | Cosa testa realmente | Mock/statico o richiede DB reale |
|---|---|---|
| `kora-link-token.test.ts` (65 casi) | generazione/formato/digest/redazione token | pure function, no DB |
| `kora-link-config.test.ts` (75 casi) | 3 flag, match a stringa esatta, readiness | pure function, no DB |
| `kora-link-rate-limit.test.ts` (59 casi) | policy per route, comportamento disabled/unavailable | pure function, no rete |
| `kora-link-rate-limit-upstash.test.ts` (36 casi) | costruzione client Upstash e `check()` | **completamente mockato** (`vi.mock`, dichiarato nell'header del file) |
| `kora-link-public-route.test.ts` (28 casi) | macchina a stati completa | pure function, client RPC/rate-limiter iniettati |
| `kora-link-public-lookup.test.ts` (23 casi) | mapping RPC→stato, mai invia token raw | RPC client iniettato, **nessuna chiamata RPC reale possibile** |
| `kora-link-activation.test.ts` (53 casi) | shape chiamata RPC, mapping risposta→esito, mai restituisce digest/worker_id | RPC client iniettato, **RPC reale non invocabile** (non distribuita) |
| `kora-link-demo-lab.test.ts` (55 casi) | generatore demo, boundary di sicurezza | nessuna persistenza da testare |
| `kora-link-ecosystem.test.ts` (98 casi) | integrità del modello statico (ruoli/gate/capacità) | dati statici |
| `kora-link-privacy-invariants.test.ts` (10 casi) | nessuna colonna PII vietata in 034/035/036, RPC company non restituisce identificatori individuali, pagine non referenziano identificatori worker | **assertion statica sul testo dei file SQL/sorgente**, non su un DB vivo |
| `kora-link-schema034-review.test.ts` (17 casi) | coerenza tabelle/nomi tra 034/035/036, eliminazione costrutti PG15 | statico, testo SQL |
| `kora-link-rls035-review.test.ts` (54 casi) | RLS forzata su tutte le tabelle, set di policy KORA_ADMIN, conferma che la policy self-select worker è ancora commentata, conferma assenza di policy SELECT company diretta, igiene `search_path`/grant | statico, testo SQL — **non valuta mai una policy RLS realmente eseguita da Postgres** |
| `kora-link-shell-01.test.ts` (27 casi) | esistenza pagine shell per 4 ruoli, banner "non attivo", nessun import Supabase/RLS/RPC | statico, testo sorgente |
| `kora-link-public-skeleton-polish-01.test.ts` (32 casi) | regressione copy, nessuna aggiunta di codice DB/attivazione | statico |
| `kora-link-pilot-readiness-checklist-01.test.ts` (33 casi) | checklist admin read-only | statico |
| `worker-personal-area-kora-link-01.test.ts` (26 casi) | cross-link worker↔KORA Link, blocco KORA_ADMIN, messaggistica aggregate-only | statico |

**Nessun file di test KORA-Link-specifico stabilisce una connessione a un database reale** (verificato via grep incrociato per stringhe di connessione: zero corrispondenze).

### 7.2 File adiacenti verificati

- `security-origin-guard-03-routes.test.ts`: include `app/link/[token]/activate/route.ts` nella lista rappresentativa — asserzione statica che il file importi `assertSameOrigin`, non un test HTTP cross-origin dal vivo.
- `tests/integration/rls-two-tenant-negative.test.ts`: **esclude esplicitamente** le tabelle `kora_link` (commento nel file: "frozen, out of scope — supabase/proposed/034-036").
- `tests/e2e/kora-smoke.spec.ts`: 6 test, **zero** relativi a `/link/[token]` — sono smoke test generici di pagine pubbliche (landing, login, request-access, demo). Coerente con quanto il Gate Report esistente dichiara onestamente (§1.6).
- `tests/unit/sentry-privacy-hardening-06.test.ts`: **copertura specifica confermata** per `/link/[token]` e `/link/[token]/activate` (righe 114-151).

### 7.3 Presenza/assenza per tipo di test

| Tipo | Presente? |
|---|---|
| Unit — token/config/rate-limit/route-state | presente, solido |
| RLS eseguita contro Postgres reale | **assente** — solo verifica statica del testo SQL |
| Auth (guardia di sessione sulle 4 pagine di ruolo) | presente, ma solo verifica statica del sorgente |
| Revoca token | **assente** — nessun test, nemmeno statico |
| Scadenza token (TTL) | **assente** — zero copertura |
| Isolamento cross-tenant per `kora_link.*` | **assente** — nessun test comportamentale, esplicitamente escluso altrove |
| Rate limiting | presente, mockato |
| Origin guard | presente, solo verifica statica |
| Sanitizzazione Sentry | **presente e specifico** (corretto rispetto a una prima valutazione più severa) |
| Privacy boundary / piccoli aggregati | presente, solo statico |
| E2E specifico KORA Link | **assente** — i 6 E2E esistenti sono generici, non toccano `/link/[token]` |

### 7.4 Set minimo obbligatorio prima dell'attivazione su staging (giudizio)

1. Test RLS dal vivo (Postgres reale, anche locale/throwaway) di 034+035+036: negativo self-select worker, negativo lettura company su `link_assignments`/`link_consents`, positivo KORA_ADMIN.
2. Test dal vivo che dimostri che `fn_activate_link_for_worker` rifiuta un `p_worker_id` diverso dalla sessione del chiamante — l'unico gap funzionale che la revisione statica non può cogliere.
3. E2E Playwright reale che percorra `/link/[token]` con `KORA_LINK_ENABLED=true` in un ambiente di test.
4. Test comportamentale cross-tenant per `fn_company_link_status_aggregate` (COMPANY_ADMIN del tenant A deve ricevere zero righe per il tenant B), non solo la verifica statica attuale.
5. Test comportamentali di revoca e scadenza, una volta applicata 036.

---

## 8. Decision matrix

Soglie definite **prima** del calcolo del punteggio (non adattate a posteriori):

- **GO:** ≥ 38/45 (≥85%), zero aree a 0, nessun blocco critico di sicurezza/privacy non risolto.
- **CONDITIONAL GO:** 27-37/45 (60-84%), al massimo 2 aree a 0 e nessuna di esse tra le aree critiche per sicurezza/privacy (RLS, auth, token security, privacy boundary, retention), lista di correzioni chiusa e per lo più di competenza engineering.
- **HIDE FROM PILOT:** 15-26/45 (33-59%), **oppure** qualunque area tra RLS/auth/privacy boundary/retention/token security ≤ 1 anche se il punteggio aggregato supera 27 — il prodotto non è concettualmente sbagliato ma non è sicuro da esporre oltre l'attuale forma statica/etichettata.
- **NO-GO/REDESIGN:** < 15/45, oppure un conflitto architetturale/privacy fondamentale che richiede una ridefinizione, non solo completamento.

| Area | Punteggio (0-3) | Motivazione sintetica |
|---|---|---|
| Definizione prodotto | 2 | modello concettuale maturo (6 ruoli, 9 gate, 13 capacità), ma manca del tutto il flusso di creazione/emissione link |
| Schema database | 2 | 034 solido, isolato, idempotente, ma 3-4 blocchi Gate 3 espliciti ancora aperti nel file stesso |
| RLS | 1 | self-select worker commentato, nessuna policy SELECT company diretta, review "Gate 4" dichiarata ancora aperta dal file stesso |
| Auth | 1 | guardie di pagina solide, ma gap di validazione `p_worker_id` a livello RPC è un buco reale nel livello dati |
| Token security | 2 | entropia, digest-only, anti-enumerazione ben progettati; revoca non testata/non collegata a UI, scadenza non verificata |
| Privacy boundary | 1 | intento e messaggistica corretti, ma assenza di soglia minima di aggregazione è una violazione potenziale diretta di un principio costituzionale della piattaforma |
| Retention | 0 | nessuna policy definita, blocco esplicito e irrisolto nel file 034 stesso |
| Revoca | 1 | RPC ben progettata (locking corretto) ma zero test, zero UI collegata |
| Audit | 1 | tabella progettata correttamente ma nessun codice applicativo distribuito la popola |
| UX | 2 | shell honestamente etichettate, buona disciplina di non-regressione, ma visibili in navigazione senza sospensione dedicata |
| Test | 1 | copertura unit ampia (691 casi) ma 100% statica/mockata, zero comportamentale dal vivo, zero E2E specifico |
| Deploy readiness | 1 | nulla applicato in alcun ambiente; stato reale delle variabili `KORA_LINK_*` su staging/produzione non verificabile da questo ambiente |
| Rollback | 2 | rollback manuale ben documentato per ogni migrazione, non automatizzato/testato |
| Documentazione | 2 | estesa e sostanzialmente accurata (corretta una valutazione iniziale troppo severa sul claim E2E) |
| Supporto operativo | 0 | nessun runbook/procedura di incident response specifica per KORA Link individuata |

**Totale: 19/45 (≈42%)**

Applicando le soglie: il punteggio aggregato ricade nella fascia 15-26 (**HIDE FROM PILOT**), e la condizione di override si attiva comunque in modo indipendente — RLS (1), Auth (1) e Privacy boundary (1) sono tutte ≤ 1, quindi anche a parità di punteggio aggregato più alto la soglia HIDE FROM PILOT scatterebbe lo stesso.

---

## 9. Decisione finale

## HIDE FROM PILOT

Il codice resta nel repository. Ogni superficie KORA Link (route pubbliche, pagine di ruolo, voci di navigazione) deve essere sospesa in modo esplicito — non solo "onestamente etichettata" — fino al completamento degli elementi elencati sotto, prima di essere inclusa in un pilota con aziende e lavoratori reali.

### Motivazione

L'architettura è concettualmente solida e onesta: nessuna operazione distruttiva, buon design di token/anti-enumerazione, separazione schema pulita, guardie di pagina corrette, disclosure onesta nella documentazione esistente (il Gate Report interno KL-11 già classificava `STAGING_ENABLEMENT` come `NOT_READY`, coerentemente con questa analisi indipendente). Non è un caso di redesign. Ma restano aperti, contemporaneamente:

1. un gap di sicurezza concreto e non mitigato a livello di RPC (`p_worker_id` non validato contro `auth.uid()` in `fn_activate_link_for_worker`);
2. un gap di privacy concreto e non mitigato (assenza di soglia minima di aggregazione in `fn_company_link_status_aggregate`, in contrasto diretto con `safe_aggregation_threshold` ≥ 10 usato altrove nella piattaforma);
3. decisioni di competenza legale/DPO non ancora prese (retention di `audit_log`, base giuridica di `request_fingerprint`, testo di `consent_version`) — non risolvibili dalla sola ingegneria;
4. zero test comportamentali dal vivo su RLS/RPC (tutto ciò che esiste è verifica statica del testo SQL);
5. nessun meccanismo di sospensione della visibilità di navigazione, mentre il pilota include per la prima volta utenti aziendali/worker reali, non solo demo interni.

### Blockers obbligatori (per passare a una futura CONDITIONAL GO)

| # | Blocker | Tipo | Stima |
|---|---|---|---|
| 1 | Validare `p_worker_id = auth.uid()` dentro `fn_activate_link_for_worker` (non solo a livello di route) | engineering | piccola |
| 2 | Implementare soglia minima ≥10 su `fn_company_link_status_aggregate` | engineering | piccola |
| 3 | Chiudere Gate 2 (review CTO/Postgres di 034) — condizione già bloccante indipendentemente da questo gate | engineering + CTO | media |
| 4 | Chiudere la review RLS "Gate 4" per 035 (policy self-select worker, policy company) | engineering + review esterna | media |
| 5 | Decisione DPO su retention `audit_log`, base giuridica `request_fingerprint`, approvazione testo `consent_version` | legale/DPO | media, non comprimibile da engineering da sola |
| 6 | Test RLS dal vivo (Postgres reale) per i tre casi minimi (§7.4 punti 1-2) | engineering | media |
| 7 | Test E2E reale con flag attivo in ambiente di test (§7.4 punto 3) | engineering | media |
| 8 | Verificare lo stato reale delle variabili `KORA_LINK_*` in ogni ambiente Vercel raggiungibile da utenti reali (non verificabile da questo ambiente) | ops | piccola |
| 9 | Introdurre un meccanismo di sospensione della navigazione (non solo dei flag di backend) per le voci KORA Link, finché i punti 1-8 non sono chiusi | engineering | piccola-media |
| 10 | Definire e implementare il flusso di creazione/emissione dei link (gap di modello, nessuna RPC di creazione esiste tra le 6 definite) | engineering | media-grande |
| 11 | Test comportamentali di revoca e scadenza | engineering | media |

### Rischi accettabili oggi (senza azione immediata)

- Le pagine shell rimangono visibili in navigazione con etichetta "Anteprima design" per utenti demo interni — accettabile finché il pilota non include ancora aziende/lavoratori reali.
- L'assenza di rollback automatizzato per le migrazioni — accettabile poiché nessuna migrazione è applicata.
- L'assenza di test E2E specifici in questo momento — accettabile poiché il flag è off ovunque nel codice sorgente verificato.

### Rischi non accettabili per procedere a staging/pilota

- Applicare 034-036 così come sono oggi, senza le fix ai punti 1 e 2 sopra.
- Attivare `KORA_LINK_ENABLED`/`KORA_LINK_ACTIVATION_ENABLED` in qualunque ambiente raggiungibile da utenti reali prima della chiusura dei blocchi 1, 2, 5, 6.
- Includere KORA Link nel prossimo pilota con aziende/lavoratori reali senza una sospensione esplicita della navigazione (blocco 9), dato che oggi la sospensione esiste solo a livello di backend RPC, non di superficie visibile.

### Evidenza richiesta per superare il gate

- Diff delle fix RPC (punti 1, 2) + relativi test dal vivo che dimostrino il comportamento corretto.
- Sign-off scritto del DPO sui tre punti legali (retention, base giuridica, testo di consenso).
- Esito di una review RLS dal vivo (non solo statica) contro un'istanza Postgres con 034-036 applicate in un ambiente isolato.
- Conferma dello stato delle variabili d'ambiente `KORA_LINK_*` in staging e produzione, ottenuta con accesso agli strumenti di deploy.
- Chiusura formale di Gate 2 (CTO) per 034, come da CLAUDE.md §9.

---

## 10. Piano successivo (proposto, non vincolante)

1. **Immediato:** nessuna azione di codice da questo sprint — è un gate decisionale, non un'implementazione.
2. **Prossimo sprint proposto:** un ciclo di correzioni engineering circoscritto ai blocchi 1, 2, 6, 7, 9 (i punti tecnici a maggior autonomia, nessuna decisione legale/DPO richiesta per iniziare).
3. **In parallelo, fuori dall'ambito engineering:** avviare la decisione DPO sui tre punti legali (blocco 5) e la chiusura formale di Gate 2 (blocco 3), poiché sono sul percorso critico e non dipendono dal lavoro tecnico.
4. **Dopo la chiusura dei blocchi 1-9:** rivalutare con un nuovo decision gate (Gate 08 o revisione di questo) se le condizioni per CONDITIONAL GO sono soddisfatte, prima di considerare l'inclusione nel pilota.
5. **Il blocco 10 (flusso di creazione link)** e il blocco 11 (test revoca/scadenza) possono procedere in parallelo ma non sono sul percorso critico per una eventuale attivazione minimale (solo lookup pubblico + attivazione base), a condizione che la creazione dei link resti un processo manuale/admin-only fino a quel momento — da confermare con il team di prodotto.

---

*Documento generato da KORA-LINK-DECISION-GATE-07. Nessuna migrazione applicata, nessun database modificato, nessuna superficie resa pubblica, nessuna correzione implementata in questo sprint, come da vincolo del brief.*

# KORA Link — KL-02 Decision Gate

**Branch:** `feat/kora-link-v1`
**Status:** Design + decisioni pre-codice — nessun runtime
**Data:** 2026-06-30
**Pubblico:** Founder, CTO, DPO

---

## 1. Executive Summary

KL-01 è stato completato e pushato su `origin/feat/kora-link-v1`. Il documento `docs/KORA_LINK_V1_DESIGN.md` definisce il design tecnico-funzionale completo di KORA Link v1 — token model, privacy boundary, lifecycle, threat model, actor matrix, due-track event model, migration plan concettuale, 15 open questions, 9 gate di implementazione.

KORA Link è ancora **design-only**: nessun codice runtime è stato scritto, nessuna migration esiste, nessuna route è implementata.

Il branch `feat/kora-link-v1` diverge da `platform/readiness` nello stesso punto di base (`eaecdad`). Contiene 1 commit (KL-01 docs) ed è 10 commit indietro rispetto ai miglioramenti di hardening di `platform/readiness` (CC-07 → CC-15): ESLint fix, Playwright E2E, Zod validation, service-role cleanup, UUID param validation, logout guard, API matrix.

Per i documenti KL-01, questa divergenza è accettabile: i doc non dipendono da runtime hardening. Per il codice KORA Link (KL-05+), la divergenza è **inaccettabile**: KORA Link deve essere costruito sopra la base hardenizzata di `platform/readiness`, non sopra `value-freeze-v1`.

Questo documento risolve 15 open question critiche, raccomanda la strategia branch e definisce i gate pre-migration e pre-runtime necessari prima di qualsiasi codice.

---

## 2. Current Branch Topology

### Stato branch

```
git status: On branch feat/kora-link-v1 — working tree clean
git HEAD:   361829a — docs: KL-01 define KORA Link v1 design
git base:   eaecdad — value-freeze-v1 (= main locale)
```

### Grafico topologia (estratto)

```
* 361829a  (HEAD → feat/kora-link-v1)  docs: KL-01 define KORA Link v1 design
| * 418e3b2  (platform/readiness)  CC-15 platform readiness summary and merge gate
| * b9f0359  CC-14 auth/logout guard
| * bb126fc  CC-13 UUID query param validation
| * e95a0ff  CC-12 Zod body validation
| * 541df1b  CC-11 P0 service-role cleanup
| * 8f616dd  CC-10 API route auth matrix
| * 47cd6f1  CC-09 shell/demo gating
| * aebd56b  CC-08 Playwright E2E
| * 7401daa  CC-07 docs
| * bcd0c54  CC-07 ESLint fixes
|/
* eaecdad  (tag: value-freeze-v1, main)  ← COMMON BASE
```

### Divergenza misurata

| Metrica | Valore |
|---------|--------|
| Merge base | `eaecdad` (= `value-freeze-v1`) |
| `feat/kora-link-v1` ahead | **1 commit** (KL-01 docs) |
| `feat/kora-link-v1` behind `platform/readiness` | **10 commit** (CC-07 → CC-15) |

### Perché è accettabile per docs-only

I file modificati in KL-01 (`docs/KORA_LINK_V1_DESIGN.md`, `docs/KORA_LINK_CHANGELOG.md`) sono nuovi file doc che non esistono in nessun altro branch. Non ci sono conflitti. Il branch ha passato tsc/vitest/build sul codice base (`value-freeze-v1`), che è identico al codice di `platform/readiness` meno i fix CC-07→CC-15.

### Perché NON è accettabile per codice KORA Link

Il codice KORA Link (route pubblica, activation flow, admin batch, RLS) dovrà interagire con:
- API route già hardened (service-role cleanup CC-11)
- Zod validation pattern (CC-12/CC-13)
- Auth guard pattern coerente (CC-14)
- Test infrastructure Playwright (CC-08)
- ESLint clean baseline (CC-07)

Costruire KORA Link su `value-freeze-v1` e poi tentare di mergiare con `platform/readiness` creerebbe debito tecnico, rischio di conflitti e regressioni. La base di sviluppo deve essere `platform/readiness`.

---

## 3. Open Questions from KL-01

### OQ-01 — URL Dominio NFC

**Opzioni valutate:**

| Opzione | Pro | Contro |
|---------|-----|--------|
| `https://app.kora.ai/link/<token>` | Dominio unico, meno DNS, path chiaro | URL lungo (NFC ha limite pratico ~200 char) |
| `https://link.kora.ai/<token>` | URL corto, brand, dedicated routing | Richiede sottodominio configurato + wildcard cert |
| `https://k.kora.ai/<token>` | URL brevissimo | Meno leggibile, brand ambiguo |
| Staging: `https://staging.kora.ai/link/<token>` | Test isolato | Stesso dominio = condivisione infrastruttura |

**Raccomandazione per v1:**

`https://app.kora.ai/link/<token>` per staging e produzione v1.

Motivazione: massima semplicità infrastrutturale (stessa app Next.js, stessa route), nessun DNS aggiuntivo, nessun cert aggiuntivo. L'URL è abbastanza corto per NFC tipo 4 (≤200 char). Un sottodominio dedicato è roadmap v2 quando il traffico KORA Link giustifica il routing separato.

### OQ-02 — Token Hash Sì/No

**Opzioni valutate:**

| Opzione | Pro | Contro |
|---------|-----|--------|
| Token cleartext nel DB | Lookup diretto O(1), debug semplice | Se DB leakato, token immediamente usabili |
| Solo hash (BLAKE2b/SHA-256) nel DB | DB leak non espone token attivi | Lookup richiede hash dell'input; debug più complesso |
| Token cleartext + colonna hash indicizzata | Lookup per hash, revoca via cleartext se necessario | Ridondanza; cleartext comunque in DB |

**Raccomandazione per v1:**

**Salva solo l'hash** (BLAKE2b o SHA-256 con salt di deployment fisso). Lookup per hash. Il token cleartext non entra mai nel DB, nei log, nei messaggi di errore.

Motivazione:
- DB leak è il vettore di attacco più comune — token hashati sono inutili senza inversa
- Lookup per hash è O(1) con indice UNIQUE su `token_hash`
- La complessità aggiunta al debug è marginale (i tool admin lavorano con `token_id` UUID interno, non con il token pubblico)
- Revoca e rotazione funzionano identicamente: cambia lo stato del record, non il token stored
- I log di sistema devono loggare `token_id` (UUID interno), mai `token_value` o `token_hash`

**Pattern lookup (pseudocodice):**
```typescript
const tokenHash = blake2b(rawToken, deploymentSalt);
const record = await db.from('kora_link.token').where({ token_hash: tokenHash });
```

### OQ-03 — TTL Token Sì/No

**Opzioni valutate:**

| Opzione | Descrizione | Rischio |
|---------|-------------|---------|
| Nessun TTL, solo revocabile | Token valido finché non revocato | Chip smarrito anni dopo resta attivo finché non segnalato |
| TTL pre-attivazione | Token scade se non attivato entro N giorni dall'emissione | Forza distribuzione tempestiva chip |
| TTL post-attivazione | Token scade dopo N anni dall'attivazione | Forza rinnovo periodico |
| TTL rotabile | Token può essere rinnovato mantenendo l'associazione | Massima sicurezza, maggiore complessità |

**Raccomandazione per v1:**

**TTL pre-attivazione: 180 giorni dall'emissione** + **nessun TTL post-attivazione in v1**.

Motivazione:
- Un chip non attivato dopo 6 mesi è quasi certamente perso o non consegnato — il TTL pre-attivazione riduce il numero di token "zombie" non revocati
- Post-attivazione: forzare scadenza su chip già attivi richiede UX di rinnovo (notifica, replacement) che è fuori scope v1
- Il token post-attivazione rimane revocabile manualmente (offboarding worker, perdita chip)
- TTL rotabile (v2): da considerare quando c'è volume sufficiente di chip e track record di gestione replacement

**Schema implication:** colonna `pre_activation_expires_at` nullable su `kora_link.token`; null = nessuna scadenza pre-attivazione.

### OQ-04 — Pre-Assignment Requirement

**Opzioni valutate:**

| Opzione | Privacy | Operatività |
|---------|---------|------------|
| Chip anonimo, qualsiasi worker lo può attivare | Massima anonimità pre-attivazione | Rischio: worker di azienda A attiva chip di azienda B |
| Chip preassegnato a tenant | Solo worker del tenant corretto può attivare | Richiede link batch↔tenant prima della distribuzione |
| Chip preassegnato a worker specifico | Massimo controllo | Viola privacy (chip porta info sul destinatario) |
| Attivabile solo se worker appartiene al tenant del batch | Controllo tenant server-side, chip rimane anonimo | Balance ottimale |

**Raccomandazione per v1:**

**Chip preassegnato a tenant (batch↔tenant), con verifica server-side al momento dell'attivazione.**

Il chip fisico rimane anonimo (solo token opaco). L'associazione batch↔tenant è server-side. Al momento dell'attivazione, il sistema verifica che il `tenant_id` del worker loggato corrisponda al `tenant_id` del batch a cui appartiene il token. Se non corrisponde → errore "Questo link non è valido per il tuo account".

Motivazione: previene cross-tenant activation senza mettere informazioni sul chip. Il chip visto fisicamente non rivela a quale azienda appartiene — solo il server lo sa.

### OQ-12 — Schema Isolation

**Opzioni valutate:**

| Opzione | Pro | Contro |
|---------|-----|--------|
| Schema `kora` esistente | Nessun nuovo schema | KORA Link mischiato con logica core |
| Schema `kora_link` dedicato | Isolamento completo, revocabile | Nuovo schema, nuovi grant |
| Schema `personal` | Vicino ai dati worker | Semanticamente sbagliato (non tutti i dati Link sono "personal") |
| Schema misto (`kora_link.*` + `audit.*`) | Separazione per dominio | Più grant da gestire |

**Raccomandazione per v1:**

**Schema `kora_link` dedicato** per tutte le tabelle KORA Link (`batch`, `token`, `chip`, `assignment`, `activation_event`, `consent_record`, `link_event`, `revocation`, `replacement`, `partner_scan`).

Gli audit record vanno in `audit.kora_link_audit` (estensione dello schema audit esistente, se presente) o in `kora_link.audit_log` se lo schema audit non esiste ancora.

Motivazione:
- Isolamento completo: KORA Link può essere disabilitato/rimosso senza toccare altri schemi
- RLS grants separati: policies `kora_link.*` non interferiscono con `analytics.*` o `personal.*`
- Revocabilità: in caso di necessità (legal, security), lo schema può essere droppato isolatamente
- Coerenza con il pattern esistente (`analytics`, `personal`, `governance` — ogni dominio ha il suo schema)

---

## 4. Additional Open Questions

| # | Domanda | Owner | Blocca codice | Blocca produzione | Note |
|---|---------|-------|:---:|:---:|------|
| OQ-05 | **Rate limiting provider** — Upstash Redis, Vercel Edge, Cloudflare, in-memory? | CTO | **SÌ** | SÌ | Route pubblica senza rate limiting è inaccettabile in produzione |
| OQ-06 | **Token length** — 32, 48, 64 char? URL-safe base64 o hex? | CTO | SÌ (schema) | SÌ | Impatta NFC URL length, storage, lookup |
| OQ-07 | **Token charset** — base62 (A-Za-z0-9), base58 (no 0OIl), URL-safe base64? | CTO | SÌ (schema) | SÌ | Base62 consigliato: leggibile, nessun carattere ambiguo |
| OQ-08 | **QR fallback sì/no** — lo stesso token è usabile via QR code oltre NFC? | Product | NO (aggiuntivo) | NO | Low risk — stesso token, canale diverso |
| OQ-09 | **NFC write format** — NDEF Type 2 o Type 4? NDEF URL record standard? | Ops/Hardware | NO (hardware) | SÌ (produzione chip) | NFC tipo 4 raccomandato per URL lunghi |
| OQ-10 | **Lost/replacement process** — chi gestisce fisicamente la sostituzione? SLA? | Ops/Product | NO | SÌ (pilot) | Richiede processo documentato prima di distribuzione |
| OQ-11 | **Audit retention** — quanto a lungo conservare audit records? Differenziare per tipo? | DPO/Legal | NO | SÌ | GDPR richiede minimizzazione — retention eccessiva è rischio |
| OQ-13 | **Break-glass approval** — chi può autorizzare? Dual approval? Processo documentale? | CTO/DPO/Founder | NO (design) | SÌ | Serve policy prima di produzione |
| OQ-14 | **Partner pilot timing** — c'è già un partner identificato per v1.1? Timeline? | Founder/Sales | NO | NO | Impatta scope v1.1 |
| OQ-15 | **Privacy notice text KORA Link** — testo italiano da validare DPO; versioning | DPO/Legal | **SÌ** (Gate 3) | SÌ | Gate 3 richiesto prima di attivazione worker |
| OQ-16 | **Staging test accounts** — chi provisiona worker+company test su staging? Quanti? | CTO/Ops | **SÌ** (KL-08) | N/A | Richiesti per E2E activation flow test |
| OQ-17 | **Consent versioning** — sistema versioning informativa + migrazione su nuova versione | DPO | NO | SÌ | Gestione GDPR re-consent |
| OQ-18 | **Physical chip spec** — fornitore NFC? MOQ? Lead time? Lock URL in chip? | Ops/Founder | NO | SÌ (pilot) | Hardware decision separate da software |
| OQ-19 | **Partner scan endpoint auth** — come si autentica il device partner? JWT, API key, OAuth? | CTO | NO | SÌ (v1.1+) | Rilevante per partner scan — non blocca v1 |
| OQ-20 | **Worker offboarding automation** — trigger automatico revoca da HR integration, oppure solo manuale? | Product/CTO | NO | SÌ (real data) | In Foundation Light: solo manuale |

---

## 5. Recommended Decisions

| Domanda | Decisione raccomandata | Rationale | Da decidere prima di | Rischio residuo |
|---------|----------------------|-----------|---------------------|----------------|
| OQ-01 URL dominio | `https://app.kora.ai/link/<token>` | Nessuna infra aggiuntiva; stessa app Next.js | KL-05 (route skeleton) | Cambio dominio richiede ri-produzione chip |
| OQ-02 Token hash | Solo hash (BLAKE2b + salt) nel DB | DB leak non espone token; O(1) lookup | KL-05 (migration 034) | Debug più verboso |
| OQ-03 TTL | 180gg pre-attivazione, nessun TTL post | Riduce zombie token; evita complessità rinnovo | KL-05 (migration 034) | Chip perso post-attivazione resta teoricamente attivo finché non segnalato |
| OQ-04 Pre-assignment | Batch↔tenant; worker verifica al login | Privacy (chip anonimo) + sicurezza (no cross-tenant) | KL-05 (activation flow) | Richiede batch delivery tracking operativo |
| OQ-05 Rate limiting | Upstash Redis (già usato per sessioni in KORA?) o Vercel Edge Rate Limit | Inattaccabile senza rate limit su route pubblica | KL-07 (route skeleton) | Blocca produzione se non deciso |
| OQ-06 Token length | 48 char base62 | Balance URL NFC (196 char tot), sicurezza (~285 bit entropia), storage | KL-05 (migration 034) | Cambio dopo produzione chip = impossibile |
| OQ-07 Token charset | Base62 (A-Za-z0-9) | Leggibile, nessun carattere ambiguo, URL-safe senza encoding | KL-05 (migration 034) | Minimo |
| OQ-12 Schema | `kora_link.*` dedicato | Isolamento, revocabilità, RLS separation | KL-05 (migration 034) | Schema aggiuntivo da gestire |
| OQ-15 Privacy notice | Draft DPO → approvazione Gate 3 | Legally required per consenso worker GDPR | KL-08 (activation UI) | Senza approvazione DPO, l'attivazione non può andare in produzione |

---

## 6. Branch Strategy Options

### Option A — Merge `platform/readiness` into `feat/kora-link-v1`

**Come funzionerebbe:**
```bash
git checkout feat/kora-link-v1
git merge platform/readiness
# Risolvi eventuali conflitti (attesi: nessuno — file disjoint)
```

**Pro:**
- Mantiene il branch `feat/kora-link-v1` esistente (già su remote)
- KL-01 docs restano in posizione, nessun cherry-pick
- Un solo branch da gestire

**Contro:**
- La storia del branch diventa ibrida: docs KORA Link + 10 commit di hardening mischiati
- Un merge "inverso" (feature ← hardening) è semanticamente strano
- Se `platform/readiness` viene successivamente ribasato o modificato, il merge deve essere rifatto
- Più difficile da leggere per un CTO in review: "perché questo branch KORA Link contiene ESLint fix e Zod validation?"
- Blocca questo prompt (no merge consentito)

### Option B — New branch `feat/kora-link-v1-platform` from `platform/readiness`

**Come funzionerebbe:**
```bash
git checkout platform/readiness
git checkout -b feat/kora-link-v1-platform
# Cherry-pick solo KL-01 (2 doc files, zero conflitti possibili)
git cherry-pick 361829a
```

**Pro:**
- KORA Link nasce sopra la base hardenizzata (CC-07→CC-15) — l'unica base corretta per codice runtime
- Cherry-pick di KL-01 è zero-risk: solo 2 nuovi file doc, nessun file modificato in `platform/readiness` tocca `docs/KORA_LINK_*`
- Storia pulita: `platform/readiness` → KORA Link commit
- Facile da leggere in review: "branch KORA Link su base hardenizzata"
- Il vecchio `feat/kora-link-v1` può essere mantenuto come archivio o chiuso
- Non blocca la review CTO di `platform/readiness`

**Contro:**
- Richiede un nuovo branch (gestione nomi, remote)
- Il cherry-pick di KL-01 crea un commit con hash diverso (361829a → nuovo hash)
- Il vecchio `feat/kora-link-v1` su remote può creare confusione se non chiuso

### Option C — Wait for `platform/readiness` merge to `main`

**Come funzionerebbe:**
```bash
# 1. CTO review + approvazione platform/readiness
# 2. git checkout main && git merge platform/readiness
# 3. git checkout -b feat/kora-link-v2 (o feat/kora-link-v1-clean)
# 4. Cherry-pick o reapply KL-01
```

**Pro:**
- Base canonicale pulitissima: `main` include sia il codice originale che il hardening
- KORA Link branch ha una radice unica e definitiva
- Massima chiarezza per revisori futuri

**Contro:**
- Rallenta KORA Link: dipende dalla review CTO + merge approvazione di `platform/readiness`
- Il design work (KL-02, KL-04 threat model) può continuare su `feat/kora-link-v1` senza sbloccare il codice, ma crea un'ulteriore discontinuità

---

## 7. Recommended Branch Strategy

### Raccomandazione: **Option B**

Creare `feat/kora-link-v1-platform` da `platform/readiness`, poi cherry-pick di `361829a` (KL-01).

### Motivazione

**Sicurezza:** KORA Link deve essere costruito sopra il codice hardenizzato. Un service-role usage non corretto (H-001/H-002, risolti CC-11) nella base è inaccettabile per un sistema che gestisce token pubblici e activation di worker. Non è teorico — è un rischio concreto.

**Pulizia Git:** La storia `platform/readiness → KORA Link commits` è semanticamente corretta e leggibile. Un merge `feat/kora-link-v1 ← platform/readiness` è invertito e confonde la review.

**Rischio regressione:** Il cherry-pick di KL-01 è il move meno rischioso possibile — 2 nuovi file doc, zero conflitti matematicamente impossibili con qualsiasi file di `platform/readiness`.

**Velocità:** Non blocca sulla review/merge di `platform/readiness` in `main`. KORA Link può avanzare in parallelo con la review CTO di `platform/readiness`.

**Review CTO:** Un singolo branch `feat/kora-link-v1-platform` con storia `base-hardenizzata → KL-01 → KL-02 → ...` è più facile da revisionare di un branch con merge history ibrida.

**Rollback:** Se KORA Link va in direzione sbagliata, il branch viene chiuso — non tocca né `platform/readiness` né `main`.

**Timing esecuzione:** KL-03 (che eseguirà la branch strategy) deve essere il primo prompt della prossima sessione, prima di qualsiasi altro lavoro KORA Link.

---

## 8. Pre-Migration Gates

Tutto ciò che deve essere deciso/completato prima di scrivere `034_kora_link_schema.sql`:

| Gate | Decisione richiesta | Owner | Status |
|------|--------------------|----|--------|
| MG-01 | Branch strategy eseguita (`feat/kora-link-v1-platform` creato) | CTO | ❌ In attesa KL-03 |
| MG-02 | Schema isolation confermata: `kora_link.*` | CTO | ✅ Raccomandato OQ-12 |
| MG-03 | Token hash decision: BLAKE2b + salt | CTO | ✅ Raccomandato OQ-02 |
| MG-04 | Token length e charset: 48 char base62 | CTO | ✅ Raccomandato OQ-06/07 |
| MG-05 | Token TTL: 180gg pre-attivazione | CTO | ✅ Raccomandato OQ-03 |
| MG-06 | Pre-assignment: batch↔tenant | Product/CTO | ✅ Raccomandato OQ-04 |
| MG-07 | Audit retention policy bozza (da confermare DPO) | DPO | ❌ Aperto OQ-11 |
| MG-08 | Rate limiting strategy decisa (anche se non implementata) | CTO | ❌ Aperto OQ-05 |
| MG-09 | Privacy notice draft disponibile (non serve approvazione finale) | DPO | ❌ Aperto OQ-15 |
| MG-10 | Gate 2 CTO review completato (schema produzione bloccato) | CTO | ❌ OPEN |

**Minimum per iniziare KL-05 (migration draft):** MG-01 + MG-02 + MG-03 + MG-04 + MG-05 + MG-06. MG-07/08/09 possono essere in progress.

---

## 9. Pre-Runtime Gates

Tutto ciò che deve essere deciso/completato prima di scrivere la route `/link/[token]`:

| Gate | Decisione richiesta | Owner | Status |
|------|--------------------|----|--------|
| RG-01 | Tutti i Pre-Migration Gates completati | — | ❌ |
| RG-02 | Public route threat model documentato (KL-04) | CTO | ❌ |
| RG-03 | Rate limiting implementato o decision documentata con workaround accettato | CTO | ❌ |
| RG-04 | Token invalid response: `404` uniforme (no oracle) — confermato | CTO | ✅ Documentato §5 KL-01 |
| RG-05 | Logging rules: token value/hash mai nei log; solo `token_id` UUID | CTO | ✅ Documentato §14 KL-01 |
| RG-06 | `KORA_LINK_ENABLED` feature flag implementato e default=false | CTO | ❌ Richiede runtime (KL-07) |
| RG-07 | Error shape definita per route pubblica | CTO | ❌ H-007 (platform/readiness) |
| RG-08 | Redirect strategy: solo dominio KORA; allowlist verificata | CTO | ❌ |
| RG-09 | CSRF handling: POST-only per activation; no GET side-effects | CTO | ❌ |
| RG-10 | Replay handling: idempotency su activation attempts | CTO | ❌ |
| RG-11 | Staging test accounts pronti per E2E activation test | CTO/Ops | ❌ OQ-16 |
| RG-12 | Gate 2 chiuso | CTO | ❌ OPEN |
| RG-13 | Gate 3 chiuso (o privacy notice approvata per staging test) | DPO | ❌ OPEN |

**Minimum per route skeleton (feature flag, no data):** RG-01 + RG-02 + RG-04 + RG-05 + RG-06.
**Minimum per route funzionante in staging:** tutti RG.

---

## 10. Recommended Next KL Prompts

| Step | Prompt | Contenuto | Prerequisiti |
|------|--------|-----------|-------------|
| **KL-03** | Branch strategy execution | Creare `feat/kora-link-v1-platform` da `platform/readiness`; cherry-pick KL-01/KL-02; verificare baseline | Approvazione raccomandazione B da Founder/CTO |
| **KL-04** | Token threat model | Documento dettagliato minacce su `/link/[token]`; token lifecycle security; logging rules; rate limiting spec | KL-03 completato |
| **KL-05** | Migration 034 draft | `034_kora_link_schema.sql` — solo draft, NON applicata; tabelle, enum, indici, vincoli schema `kora_link` | MG-01→MG-06 completati; Gate 2 chiuso |
| **KL-06** | RLS 035 draft | `035_kora_link_rls.sql` — solo draft; policies per ogni tabella, SECURITY DEFINER functions | KL-05 approvato; OQ-11 risolto (audit retention); Gate 3 |
| **KL-07** | Public route skeleton | `/app/link/[token]/page.tsx` o route API dietro `KORA_LINK_ENABLED=false`; Zod su param; nessun DB query reale | Gate 2 chiuso; RG-01→RG-06 |
| **KL-08** | Worker activation UI | Consent screen, My KORA sezione Link, revoca self-service — tutto dietro feature flag | KL-07; migration in staging; staging test accounts |

**Non eseguire nessuno di questi step in questo prompt.**

---

*KORA_LINK_KL02_DECISION_GATE.md — KL-02 · 2026-06-30 · Branch `feat/kora-link-v1`*
*Prossimo step: attendere approvazione Founder/CTO su OQ raccomandate + branch strategy B → KL-03*

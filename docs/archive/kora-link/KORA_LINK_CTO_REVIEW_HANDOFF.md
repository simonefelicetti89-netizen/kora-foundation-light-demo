# KORA Link — CTO Review Handoff Pack

**KL-15 — Handoff Pack per CTO/Postgres Reviewer**

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Commit HEAD:** `51c053e` (KL-14)  
**Destinatario:** CTO / Postgres Specialist / Reviewer esterno  
**Scopo:** Permettere a un reviewer di valutare lo schema 034 e restituire decisioni senza perdere tempo.

---

## 1. Executive Summary per il Reviewer

KORA Link è un bridge fisico-digitale NFC per la piattaforma KORA. La **route pubblica** `/link/[token]` esiste già ed è operativa: 253 test verdi, build OK, E2E 6/6. Non fa DB lookup. Non fa activation. La feature flag `KORA_LINK_ENABLED` è default off in tutti gli ambienti.

Lo **schema** `kora_link.*` (11 tabelle) è in `supabase/proposed/034_kora_link_schema.sql` — **draft proposto, mai applicato ad alcun database**. Nessuna migration KORA Link è in `supabase/migrations/`. RLS (035) non è stato ancora redatto.

Il reviewer deve valutare il draft 034, rispondere a 8 decisioni bloccanti (D-01→D-08) e approvare/modificare/differire 12 amendment proposti (A-01→A-12). **Non deve applicare SQL. Non deve modificare produzione. Non deve scrivere 035.**

L'output atteso è la Sezione 11 (Response Template) compilata e firmata. Con quel documento, Engineering può applicare gli amendment approvati a `proposed/034` e iniziare il draft `035_kora_link_rls.sql`.

---

## 2. Review Objective

Il reviewer deve rispondere a **tre domande:**

**Domanda 1 — Schema 034 può essere stabilizzato come schema v1?**  
034 è un draft con 8 TODO CTO aperti. Dopo le decisioni e i relativi amendment, Engineering può aggiornare il file `proposed/034` con le modifiche approvate. Solo allora 034 è pronto per la promozione.

**Domanda 2 — Quali amendment (A-01→A-12) vanno approvati, cambiati o differiti?**  
KL-14 propone 12 modifiche specifiche. Il reviewer sceglie per ognuna: APPROVE (applica come proposto), CHANGE (applica con modifica specificata), DEFER (non applicare in v1). Non deve scrivere le modifiche SQL — solo prendere la decisione.

**Domanda 3 — Dopo le decisioni, Engineering può scrivere il draft 035 RLS?**  
035 dipende da 034 stabilizzata. Alcune decisioni (D-01 FK, D-07 secret, A-11 consent design, A-12 partner_scans) impattano direttamente le policy RLS che Engineering dovrà scrivere. Il reviewer sblocca 035 con il suo sign-off.

---

## 3. Files to Read

Leggere in questo ordine. Non è necessario leggere tutto prima di prendere le decisioni — la Sezione 3 e 4 del Decision Pack bastano per il 90% delle decisioni.

| Ordine | File | Scopo | Tempo stimato | Output atteso |
|--------|------|-------|---------------|---------------|
| 1 | `docs/KORA_LINK_RUNTIME_CHECKPOINT.md` | Capire cosa è già implementato e cosa non lo è | 10 min | Contesto operativo |
| 2 | `docs/KORA_LINK_GATE_REPORT.md` | Stato dei 9 gate e cosa sblocca cosa | 5 min | Mappa delle dipendenze |
| 3 | `docs/KORA_LINK_034_CTO_DECISION_PACK.md` | **Lettura principale** — 8 decisioni con raccomandazioni, pro/contro, template | 30–45 min | Decisioni D-01→D-08 |
| 4 | `docs/KORA_LINK_034_AMENDMENT_PLAN.md` | 12 amendment proposti con SQL action e impatto su 035 | 20–30 min | Approvazione A-01→A-12 |
| 5 | `docs/KORA_LINK_034_CTO_REVIEW_CHECKLIST.md` | Checklist dettagliata privacy/security/RLS (solo se serve approfondimento) | 20 min (opzionale) | Verifica invarianti |
| 6 | `supabase/proposed/034_kora_link_schema.sql` | SQL draft da revieware | 20–30 min | Conferma SQL-level |
| 7 | `docs/KORA_LINK_TOKEN_THREAT_MODEL.md` | Threat model token NFC — per review D-07 e sicurezza | 10 min (opzionale) | Contesto sicurezza |

**Tempo totale stimato:** 60–90 minuti per una review completa, 30–45 minuti per decisioni essenziali (solo 3 e 4).

---

## 4. What Is Already Implemented

Il runtime KORA Link esiste e funziona. Non richiede modifiche da parte del reviewer.

| Componente | File | Stato | Note |
|-----------|------|-------|------|
| Token generation | `lib/kora-link/token.ts` | ✅ Production-ready | CSPRNG, `kl1_<48 base62>`, 65 test |
| Token validation | `lib/kora-link/token.ts` | ✅ Production-ready | Formato, lunghezza, charset |
| Digest HMAC-SHA256 | `lib/kora-link/token.ts` | ✅ Production-ready | `computeDigest()`, `node:crypto` only |
| Token redaction | `lib/kora-link/token.ts` | ✅ Production-ready | `redactToken()` — no raw in logs |
| Runtime config | `lib/kora-link/config.ts` | ✅ Production-ready | Feature flag, readiness, env injectable |
| Feature flag | `KORA_LINK_ENABLED` env var | ✅ Default off | `false` in tutti gli ambienti |
| Rate limit skeleton | `lib/kora-link/rate-limit.ts` | ✅ Production-ready | Policy per-route, disabled/unavailable/upstash |
| Upstash adapter | `lib/kora-link/rate-limit.ts` | ✅ Production-ready | Lazy sliding window, production guard |
| Public route helper | `lib/kora-link/public-route.ts` | ✅ Production-ready | `evaluateKoraLinkPublicRouteState()` |
| Public route page | `app/link/[token]/page.tsx` | ✅ Skeleton complete | Server component, `runtime=nodejs`, no DB |
| AppShell suppress | `components/layout/AppShell.tsx` | ✅ | `/link/` in PUBLIC_ROUTE_PREFIXES |
| Unit tests KORA Link | `tests/unit/kora-link-*.test.ts` | ✅ 253/253 | 5 file, 33 suite, zero vi.mock |
| Build | Next.js | ✅ OK | `/link/[token]` come route `ƒ Dynamic` |
| E2E | Playwright | ✅ 6/6 | Nessuna regressione |

---

## 5. What Is Not Implemented

I seguenti componenti **non esistono** e non devono essere implementati prima della chiusura dei gate indicati:

| Componente | Gate bloccante | Note |
|-----------|---------------|------|
| DB lookup `token_digest → link record` | Gate 2 + Gate 4 | `fn_kora_link_public_lookup` in 035 |
| Worker activation flow | Gate 2 + Gate 3 + Gate 4 | Consent, privacy notice DPO-approvata |
| Consent record creation | Gate 3 | Testo notice da approvare DPO |
| Token↔worker assignment | Gate 2 + Gate 3 + Gate 4 | |
| RLS `035_kora_link_rls.sql` | Gate 4 | Non redatto — dipende da Gate 2 |
| Promotion 034 → `migrations/` | Gate 2 chiuso | Nessuna migration applicabile prima |
| Admin batch generation UI | Gate 2 | Richiede tabelle 034 |
| Company aggregate dashboard | Gate 2 + Gate 4 | Solo dati aggregati, RLS obbligatoria |
| Partner scan (Track A) | Gate 2 + Gate 3 + Gate 4 + Gate 8 | v1.1+ scope |
| Impact Units da KORA Link | Post-Gate-2 | Fuori scope v1 |
| KORA Index effect da Link | Post-Gate-2 | |
| Staging env abilitato | Gate 5 | `KORA_LINK_ENABLED=true` in staging |
| Production enablement | Gate 6+ | Tutti i gate precedenti |

---

## 6. Files the Reviewer Must Not Apply

**Il reviewer non deve:**

```
✗ Eseguire supabase db push
✗ Eseguire supabase migration up
✗ Copiare 034 in supabase/migrations/
✗ Applicare 034 su qualsiasi istanza Supabase (staging o production)
✗ Creare o scrivere 035_kora_link_rls.sql
✗ Abilitare KORA_LINK_ENABLED=true in production o staging
✗ Modificare variabili d'ambiente Vercel
✗ Modificare codice runtime (lib/kora-link/*, app/link/*)
✗ Fare deploy su Vercel
✗ Mergare il branch feat/kora-link-v1-platform in main
```

**Il reviewer può (e deve):**

```
✓ Leggere i file elencati nella Sezione 3
✓ Verificare SELECT version() sull'istanza Supabase per D-02 (se ha accesso)
✓ Compilare il Response Template (Sezione 11)
✓ Prendere decisioni D-01→D-08 e approvare/modificare/differire A-01→A-12
✓ Aggiungere note tecniche su compatibilità PostgreSQL, pooler, RLS
✓ Restituire il template compilato a Engineering
```

**I file PROPOSED non vanno toccati:**

```
supabase/proposed/034_kora_link_schema.sql  ← read-only per il reviewer
supabase/proposed/032_*.sql                 ← non correlato a KORA Link
supabase/proposed/033_*.sql                 ← non correlato a KORA Link
```

---

## 7. Decision Checklist — D-01→D-08

Per ogni decisione: leggere il Decision Pack KL-13 Sezione 3–10 per il contesto completo.

| ID | Decisione | Raccomandazione Engineering | Reviewer Decision | Note Reviewer | Blocca 035 | Blocca Promotion |
|----|-----------|----------------------------|------------------|---------------|-----------|-----------------|
| D-01 | FK targets (7 colonne UUID senza FK) | No FK in v1 — pattern migration 033. Boundary via RLS+SECDEF | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | Sì | No |
| D-02 | `UNIQUE NULLS NOT DISTINCT` — richiede PG15+ | Verificare `SELECT version()`. Se PG<15: partial index. Se `partner_scans` rimossa: N/A | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | PG version: _____ | No | Sì se PG<15 |
| D-03 | Colonna `GENERATED ALWAYS AS scan_date` (timezone UTC vs locale) | Rimuovere `partner_scans` da 034 → problema scompare. Se resta: app-managed `scan_date` | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | No | Sì |
| D-04 | TTL enforcement 180gg (app-layer vs pg_cron) | App-layer check in v1. Batch job posticipato post-Gate-3 | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | No | No |
| D-05 | `audit_log` retention policy | Schema ok; durata da DPO (Gate 3); meccanismo da decidere con DPO | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | Meccanismo preferito: _____ | No | No (blocca Gate 9) |
| D-06 | `public_lookup_attempts` rimozione da v1 | Rimuovere — Upstash copre rate limit; nessun consumer v1; volume GDPR | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | No | No |
| D-07 | Secret rotation procedure | Stable secret in v1 pilot. Emergency: revoca+re-emissione. No `key_version` | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | Sì — impatta lookup signature | Sì |
| D-08 | Deferred self-FK `replaced_by_link_id` (Supabase pooler concern) | Rimuovere self-FK. Catena via `link_replacements.new_link_id` | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | Pooler mode: _____ | No | No |

---

## 8. Amendment Checklist — A-01→A-12

Per ogni amendment: leggere Amendment Plan KL-14 Sezione 3–14 per il contesto completo.

| ID | Proposta | Tipo | Reviewer Decision | Note Reviewer | Apply to 034? | Blocca 035? |
|----|----------|------|------------------|---------------|--------------|------------|
| A-01 | Mantenere UUID senza FK; aggiungere commenti target canonici | keep + comment | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | Sì |
| A-02 | Sostituire `UNIQUE NULLS NOT DISTINCT` con partial index se PG<15 | simplify | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-03 | Rimuovere `GENERATED ALWAYS AS scan_date` o spostare `partner_scans` | remove/defer | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-04 | Mantenere `pre_activation_expires_at`; aggiungere commento app-layer | keep + comment | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-05 | Mantenere `audit_log`; commento retention DPO-external | keep + comment | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-06 | Rimuovere `public_lookup_attempts` e relativi indici/commenti | remove | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-07 | Nessun `key_version` in 034; commento stable-secret policy | comment | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-08 | Rimuovere `replaced_by_link_id` colonna e `fk_links_replaced_by` | remove | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-09 | Rimuovere `idx_links_token_digest` (ridondante con UNIQUE constraint) | remove | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-10 | Defer `link_delivery_records` a migration 036 (v1.1+ scope) | defer | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | No |
| A-11 | Design `link_consents`: append-only (raccomandato) vs mutable record | comment/design | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | Scelta: `[ ] Append-only` `[ ] Mutable` | `[ ] Sì` `[ ] No` | Sì |
| A-12 | Defer `partner_scans` a migration 036 con Track A (v1.1+) | defer | `[ ] APPROVE` `[ ] CHANGE` `[ ] DEFER` | | `[ ] Sì` `[ ] No` | Sì |

---

## 9. Minimal Approval Required to Proceed

### Minimo per iniziare 035 draft

Engineering può iniziare a redigere `supabase/proposed/035_kora_link_rls.sql` solo dopo che **tutte** le seguenti decisioni sono state prese:

```
✅ D-01 DECISO — FK strategy chiarita
     → impatta design delle SECURITY DEFINER functions in 035
     → senza questa, le lookup functions non possono essere progettate

✅ D-02 DECISO — PG version confermata
     → impatta sintassi in 035 se si usano feature PG15+

✅ D-06 DECISO — public_lookup_attempts in scope o rimossa?
     → se rimossa: policy RLS-035-K non va scritta
     → se mantenuta: Engineering deve scrivere INSERT-only SECDEF

✅ D-07 DECISO — secret rotation strategy
     → impatta la signature di fn_kora_link_public_lookup
     → se key_version: la lookup function prova N digest; se stable: prova solo 1

✅ A-01 APPROVATO o modificato — conferma no-FK design
✅ A-06 APPROVATO o modificato — scope public_lookup_attempts
✅ A-11 APPROVATO o modificato — consent append-only vs mutable (impatta RLS-035-E)
✅ A-12 APPROVATO o modificato — partner_scans: PARTNER role in 035 o no?
```

**Se A-12 APPROVATO (defer partner_scans):** 035 non include policy PARTNER. Scope 035 ridotto da 14 a 11 policy items. Review 035 più veloce.

### Minimo per promuovere 034

Tutti i passi seguenti devono essere completati prima che Engineering sposti 034 da `proposed/` a `migrations/`:

```
✅ Tutte le decisioni D-01→D-08 prese dal CTO
✅ Tutti gli amendment A-01→A-12 approvati/modificati/differiti formalmente
✅ Engineering applica amendments approvati a supabase/proposed/034_kora_link_schema.sql
✅ Review post-amendment: grep checks (no token_value, no DEFERRABLE, ecc.)
✅ SQL dry-run completato su istanza staging vuota (non production)
✅ 035 draft completato o chiaramente pianificato
✅ DPO avanzamento Gate 3 (per consent_version e privacy notice text)
✅ CTO sign-off formale sulla 034 modificata
```

---

## 10. Reviewer Output Expected

Il reviewer deve restituire a Engineering:

1. **Decision table compilata** — D-01→D-08, una decisione per riga (Sezione 7 compilata)
2. **Amendment table compilata** — A-01→A-12, una decisione per riga (Sezione 8 compilata)
3. **Note PostgreSQL compatibility** — versione confermata (`SELECT version()`), compatibilità `UNIQUE NULLS NOT DISTINCT`, comportamento pooler per `DEFERRABLE`
4. **Note architetturali su RLS 035** — preferenze su scope delle SECURITY DEFINER functions, grant structure, deny-by-default pattern
5. **Go/No-Go per Engineering** — può Engineering applicare i amendments a `proposed/034`? Può iniziare il draft 035?
6. **No-Go esplicito per production** — `KORA_LINK_ENABLED=true` in produzione rimane NO-GO; il reviewer lo conferma per iscritto
7. **Response Template compilato** (Sezione 11)

---

## 11. Suggested Response Format for Reviewer

```
═══════════════════════════════════════════════════════════
KORA Link 034 — CTO Review Response
═══════════════════════════════════════════════════════════
Reviewer:          ___________________________________
Date:              ___________________________________
PostgreSQL version (from SELECT version()):  ___________
Supabase pooler mode (session/transaction):  ___________

OVERALL DECISION:
  034 schema status:      [ ] APPROVED  [ ] APPROVED_WITH_CHANGES  [ ] BLOCKED
  035 draft status:       [ ] CAN_START  [ ] BLOCKED_UNTIL: ________
  034 promotion status:   [ ] READY_AFTER_AMENDMENTS  [ ] BLOCKED_UNTIL: ________

APPROVED DECISIONS (Engineering can proceed as recommended):
  D-01  [ ]    D-02  [ ]    D-03  [ ]    D-04  [ ]
  D-05  [ ]    D-06  [ ]    D-07  [ ]    D-08  [ ]

CHANGE REQUIRED (Engineering must implement specified change instead):
  D-__  Change: _____________________________________________
  D-__  Change: _____________________________________________

DEFERRED (no action required in v1):
  D-__  Reason: _____________________________________________

APPROVED AMENDMENTS (apply to proposed/034):
  A-01  [ ]    A-02  [ ]    A-03  [ ]    A-04  [ ]
  A-05  [ ]    A-06  [ ]    A-07  [ ]    A-08  [ ]
  A-09  [ ]    A-10  [ ]    A-11  [ ]    A-12  [ ]

CHANGE REQUIRED on amendments:
  A-__  Change: _____________________________________________
  A-__  Change: _____________________________________________

DEFERRED AMENDMENTS:
  A-__  Reason: _____________________________________________

BLOCKING NOTES (must be resolved before promotion):
  ___________________________________________________________
  ___________________________________________________________

RLS 035 NOTES (for Engineering to incorporate in 035 draft):
  ___________________________________________________________
  ___________________________________________________________

AUTHORIZATIONS:
  Can Engineering amend supabase/proposed/034?    [ ] YES  [ ] NO
  Can Engineering draft supabase/proposed/035?    [ ] YES  [ ] NO — pending: ________
  Can DB lookup be implemented?                   NO — not before Gate 2+4
  Can worker activation be implemented?           NO — not before Gate 2+3+4
  Can KORA_LINK_ENABLED=true in production?       NO — explicit no-go
  Can KORA_LINK_ENABLED=true in staging?          NO — pending Gate 2+3+4+5

Signature: _____________________________
Date: _________________________________
═══════════════════════════════════════════════════════════
```

---

## 12. Current Gate Status

| Gate | Nome | Status | Owner | Sblocca |
|------|------|--------|-------|---------|
| Gate 1 | Runtime Base | ✅ COMPLETE | Engineering | — |
| Gate 2 | Schema 034 CTO Review | 🔴 OPEN | **CTO** | DB lookup, activation, tutto il DB path |
| Gate 3 | Privacy / DPO / Legal | 🔴 OPEN | DPO + Legal | Activation consent, partner scan, live data |
| Gate 4 | RLS 035 | 🔴 NOT STARTED | CTO + DBA | Qualsiasi DB write/read con RLS |
| Gate 5 | Staging Env | 🔴 OPEN | Engineering + Infra | Test reali con flag enabled |
| Gate 6 | Public Route Enablement | 🟡 SKELETON OK | Engineering | DB lookup + privacy notice |
| Gate 7 | Worker Activation | 🔴 BLOCKED | Engineering + DPO | Gate 2+3+4+6 |
| Gate 8 | Partner Scan | 🔴 BLOCKED (v1.1+) | Product + Engineering | Track A scope |
| Gate 9 | Production Readiness | 🔴 BLOCKED | Engineering + CTO + DPO | Tutti i gate precedenti |

**Gate 2 è il critical path.** Chiudere Gate 2 sblocca la catena: 035 → Gate 4 → staging → Gate 5 → DB lookup → Gate 6 → activation → Gate 7.

---

## 13. Final Instruction to Reviewer

Il reviewer deve:

**FARE:**
```
✓ Leggere i file nell'ordine di Sezione 3
✓ Compilare la Decision Table (Sezione 7) — D-01→D-08
✓ Compilare l'Amendment Table (Sezione 8) — A-01→A-12
✓ Compilare il Response Template (Sezione 11) e firmarlo
✓ Aggiungere note su PostgreSQL version e pooler mode
✓ Aggiungere preferenze su RLS 035 scope
✓ Restituire il template compilato a Engineering
```

**NON FARE:**
```
✗ Non applicare 034 su alcun database
✗ Non copiare 034 in supabase/migrations/
✗ Non eseguire supabase db push o supabase migration up
✗ Non creare o scrivere 035_kora_link_rls.sql
✗ Non modificare variabili d'ambiente (Vercel, .env.*)
✗ Non abilitare KORA_LINK_ENABLED in alcun ambiente
✗ Non fare deploy su Vercel
✗ Non fare merge o push su main
✗ Non modificare codice runtime (lib/kora-link/*, app/link/*)
```

**Regola finale:** Il reviewer risponde solo con il template compilato. Engineering implementa. Nessuna azione di deployment o SQL apply può avvenire prima del sign-off formale del CTO.

---

*KORA_LINK_CTO_REVIEW_HANDOFF.md — KL-15 · 2026-07-01*  
*Branch: feat/kora-link-v1-platform · HEAD: 51c053e*  
*Nessun SQL modificato · Nessuna migration creata · Nessun codice runtime toccato*

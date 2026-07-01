# KORA Gate 3B — Privacy Readiness Pack

**Stato:** OPEN — preparation pack documentale  
**Creato:** 2026-05-30  
**Aggiornato:** 2026-05-30 — aggiunta sezione H: PII Upload Guard  
**Prerequisito:** nessun dato reale prima che questo gate sia chiuso  
**Riferimento backlog:** `docs/technical-backlog.md` TODO-003, TODO-004

---

## A. Scopo del Gate 3B

Gate 3B prepara KORA a una review privacy/legal prima di qualunque onboarding di dati reali.

L'obiettivo non è ottenere una certificazione complessa — è verificare che le garanzie già esistenti nel codice siano integrate da un framework contrattuale e procedurale minimale che renda il trattamento dei dati dei lavoratori legalmente e eticamente sostenibile nel pilot iniziale.

Gate 3B non apre la piattaforma al pubblico. Apre la possibilità di ingestion di dati da un singolo tenant pilota, in ambiente controllato, con DPA firmato, con pseudonimizzazione verificata all'origine.

---

## B. Confine non negoziabile

**Nessun dato reale di aziende o lavoratori può entrare in KORA prima che Gate 3B sia chiuso.**

Dati sintetici, tenant di test (`TEST-001`, `TEST-A`, `TEST-B`, `OP-001`) e fixture demo (Meridiana S1/S2) rimangono l'unico contenuto del sistema fino ad allora.

---

## C. Garanzie enforce-by-code

Queste garanzie sono implementate nel codice e verificabili tramite test automatici. Non richiedono azioni contrattuali per essere attive.

| Garanzia | Cosa garantisce | Dove è implementata | Test/verifica | Limite residuo |
|---|---|---|---|---|
| **N≥10 enforcement** | Nessun segmento employer-visible con < 10 lavoratori è persistito o esposto | `lib/privacy/group-threshold.ts`, `lib/live/workforce-baseline.ts`, `lib/live/persistence.ts` | `npx tsx scripts/test-privacy-threshold.ts` — 57/57 PASS; route `/api/test/privacy-threshold` | Enforcement è applicativo; nessun DB constraint JSONB fragile by design |
| **No employer access a `personal.uploaded_record`** | Nessun ruolo company/employer può leggere record pseudonimizzati individuali | RLS policy `kora_admin_only_uploaded_records` (migration 001); GRANT SELECT solo a `authenticated` ma RLS filtra a KORA_ADMIN (migration 004) | `GET /api/test/auth-isolation` → COMPANY_ADMIN: 0 righe su uploaded_record | GRANT SELECT esiste per `authenticated` (necessario per RLS); la protezione è solo da RLS, non da assenza di GRANT |
| **Tenant isolation via RLS/claims** | Un company user vede solo il proprio tenant; non può accedere ai dati di altri tenant | `kora.kora_role()`, `kora.tenant_id()` (migration 004); policy su ogni tabella analytics | `GET /api/test/auth-isolation` — admin-A vede solo TEST-A, admin-B vede solo TEST-B | Dipende da corretta configurazione di `app_metadata` al provisioning utente |
| **KORA_ADMIN-only operator access** | Solo utenti con `app_metadata.kora_role = KORA_ADMIN` possono accedere all'operator flow | `lib/auth/kora-session.ts` `requireKoraAdmin()`; `/api/admin/operator-flow` `checkAuth()` | `GET /api/test/auth-access-check` — KORA_ADMIN→200, company→403, no-session→401 | Fallback `x-kora-operator-secret` DEPRECATED ancora presente in dev (bloccato in production) — rimozione in TODO-002 |
| **Audit log scritto dall'operator flow** | Ogni operazione sull'operator flow genera eventi tracciati in `audit.audit_log` | Scritto in ogni step del POST operator flow; `audit.audit_log` append-only per `authenticated` | Response POST include `audit_events_written` e `audit_actions`; GET include `audit_summary` (last 10) | Nessun audit explorer completo; lettura solo via query diretta o console (ultimi 10 eventi) |
| **Production guard su route test** | Le route `/api/test/*` sono inaccessibili in ambiente production | `NODE_ENV === 'production' → 404` in tutte e 6 le route test | Verificato per ogni route in `docs/test-routes-removal-before-production.md` | Le route esistono ancora nel codice — rimozione definitiva è manuale prima del deploy prod |
| **Operator flow con sessione KORA_ADMIN** | L'accesso all'operator flow richiede una sessione Supabase Auth verificata server-side | `requireKoraAdmin()` chiama `supabase.auth.getUser()` server-side; legge `app_metadata` (non `user_metadata`) | `GET /api/test/auth-access-check` — tutti e 4 i casi PASS | Middleware refresh sessione attivo; `app_metadata` è server-controlled (Admin API only) |

---

## D. Garanzie enforce-by-contract/process

Queste garanzie non possono essere fornite solo dal codice. Richiedono documenti legali, istruzioni operative, accordi con il cliente/titolare del trattamento, e verifiche esterne.

| Garanzia | Cosa serve | Perché non è garantita solo dal codice | Decisione richiesta prima dei dati reali |
|---|---|---|---|
| **Pseudonimizzazione all'origine** | Il cliente deve pseudonimizzare i dati dei lavoratori *prima* dell'upload; KORA riceve solo `pseudonym_id` e `raw_hash`, mai nome/email/CF reali | KORA riceve i file dal cliente; non può verificare tecnicamente la completa assenza di PII in ogni campo del payload senza un validatore anti-PII attivo (che non esiste ancora) | Formalizzare contrattualmente che la pseudonimizzazione è responsabilità del titolare; valutare validatore tecnico prima di scala |
| **Divieto upload PII** | Il cliente si impegna a non caricare dati identificativi diretti (nome, CF, email, matricola) | Il campo `payload` in `uploaded_record` è `jsonb` libero; KORA non ispeziona il contenuto per PII | Aggiungere clausola contrattuale; valutare validatore tecnico (anti-PII scanner) come misura complementare |
| **Retention** | Definire per quanto tempo i dati vengono conservati e quando vengono eliminati automaticamente o su richiesta | Il DB non ha oggi un meccanismo di retention automatica (es. TTL su righe, job schedulati di pulizia) | Definire policy di retention per ogni schema/tabella prima dell'onboarding; implementare o documentare il processo manuale |
| **Cancellazione / right-to-erasure** | Il lavoratore (o il titolare per conto di esso) può richiedere la cancellazione dei propri dati | Soft-delete su `analytics.tenant` esiste (`deleted_at` + cascade FK), ma hard delete di `personal.uploaded_record` per singolo `pseudonym_id` non è ancora automatizzato — è un processo manuale oggi | Definire e documentare il processo di cancellazione; valutare API di cancellazione per future fasi |
| **DPA / nomina responsabile** | KORA deve essere nominata responsabile del trattamento dal titolare (azienda cliente) via DPA firmato | È un documento legale, non una funzione software | DPA deve essere preparato, revisionato da consulente legale, firmato dal cliente prima dell'ingestion |
| **Istruzioni del titolare** | Il titolare deve fornire istruzioni scritte su finalità, categorie di dati, base giuridica, trasferimenti | Le policy di consenso e le finalità del trattamento non sono configurabili in codice — sono definite per contratto | Definire modulo di istruzioni; raccogliere prima dell'onboarding |
| **Categorie dati ammesse/escluse** | Definire quali categorie di dati welfare/HR sono accettabili e quali sono escluse (es. dati di salute, dati sindacali, categorie particolari ex Art. 9 GDPR) | Il codice non ha oggi un sistema di categoria-dati enforcement; la classificazione pillar (LIFE, GROWTH, ecc.) non costituisce un filtro categorie Art. 9 | Prima dell'onboarding: lista positiva delle categorie accettabili + policy esclusione categorie particolari |
| **Gestione file sorgenti** | I file originali caricati dal cliente (export welfare, LMS, HR) possono contenere PII e devono essere trattati secondo le istruzioni del titolare | KORA processa i file ma non li archivia nel DB (solo `raw_hash`); tuttavia la gestione temporanea del file durante il parsing deve essere documentata | Documentare il lifecycle del file sorgente durante l'upload: dove transita, quanto persiste, quando viene eliminato |

---

## E. Decisione aperta chiave — Pseudonimizzazione all'origine

Questa è la decisione più critica di Gate 3B, perché impatta l'architettura tecnica e il modello contrattuale.

### Opzione 1: Enforced-by-contract

Il cliente (titolare) si impegna contrattualmente a pseudonimizzare i dati prima dell'upload. KORA riceve solo `pseudonym_id` + `raw_hash` per ogni lavoratore. KORA non detiene la chiave di re-identificazione.

**Pro:** architettura più semplice; KORA non tratta mai dati identificativi diretti; responsabilità chiara sul titolare.  
**Contro:** KORA non può verificare tecnicamente la compliance del cliente; richiede fiducia + audit esterni.

### Opzione 2: Enforced-by-code con validatore anti-PII upload

KORA implementa un validatore tecnico che scansiona i file in upload per pattern PII (regex su email, CF, telefono, ecc.) e blocca/segnala file con contenuto identificativo prima che entrino nel DB.

**Pro:** riduce dipendenza dalla compliance del cliente; detecta errori di pseudonimizzazione involontari.  
**Contro:** nessun validatore è completo (falsi negativi); aggiunge complessità; è misura complementare, non sostitutiva del contratto.

### Raccomandazione provvisoria

**Contrattuale nel pilot iniziale + validatore tecnico da valutare prima di produzione più ampia.**

Per il pilot con un singolo tenant controllato: formalizzare contrattualmente la pseudonimizzazione all'origine (Opzione 1). Prima di onboarding multi-tenant o produzione: valutare l'implementazione di un validatore tecnico complementare (Opzione 2) come misura di sicurezza aggiuntiva, non sostitutiva.

---

## F. Note tecniche minori

Queste limitazioni tecniche esistono oggi nel codice e sono rilevanti per Gate 3B:

1. **`deleted_at` su `analytics.tenant`** — soft-delete implementato (migration 002). Cascade FK su tabelle figlie. Il record non viene eliminato fisicamente dal DB, solo marcato come cancellato.

2. **Hard delete / right-to-erasure su `personal.uploaded_record`** — non ancora automatizzato. Per cancellare righe specifiche di un lavoratore (per `pseudonym_id`), è necessario un processo manuale con accesso service_role. Non esiste un'API di cancellazione per `pseudonym_id`. Questo deve essere risolto prima di dati reali.

3. **Audit log** — scritto correttamente da ogni step dell'operator flow; accessibile a KORA_ADMIN via query e via console (ultimi 10 eventi per tenant). Non esiste ancora un audit explorer completo con filtri per data, azione, resource_type, esportazione. Questa è una funzionalità futura, non un blocco per Gate 3B se si accetta lettura via query.

4. **Validatore anti-PII** — non implementato. Vedi decisione aperta in sezione E.

5. **Generazione tipi Supabase** — tipi hand-maintained (TODO-001). Non bloccante per Gate 3B ma da risolvere prima di produzione multi-tenant.

---

## G. Checklist Gate 3B prima di dati reali

Questa checklist deve essere completata prima di qualunque onboarding di dati reali.

### Legale / contrattuale

- [ ] DPA redatto e firmato con il primo cliente pilota
- [ ] Informativa privacy preparata (per lavoratori, se applicabile)
- [ ] Ruoli privacy chiariti: titolare, responsabile, eventuali sub-responsabili
- [ ] Istruzioni del titolare ricevute e archiviate
- [ ] Clausola pseudonimizzazione all'origine inclusa nel contratto
- [ ] PII policy accettata dal cliente
- [ ] Retention e cancellazione definite e documentate
- [ ] Base giuridica trattamento verificata (consenso, legittimo interesse, contratto)
- [ ] Categorie dati ammesse/escluse (Art. 9 GDPR) documentate

### Tecnico / operativo

- [ ] Route test (`/api/test/*`) rimosse o definitivamente production-inert nel deploy reale
- [ ] Fallback `x-kora-operator-secret` rimosso da operator flow (TODO-002)
- [ ] Processo manual di hard delete / right-to-erasure documentato (fino ad automazione)
- [ ] Lifecycle file sorgente durante upload documentato
- [ ] Decisione su validatore anti-PII presa (Opzione 1 o 2, sezione E)
- [x] **PII Upload Guard implementato** (Foundation Light: review_required + redaction) — vedi sezione H
- [ ] **PII Guard production policy definita**: strict reject vs review_required per dati reali (TODO-004)
- [ ] Generated types Supabase rivalutati (TODO-001)
- [ ] Audit log accessibilità verificata per KORA_ADMIN in ambiente reale
- [ ] Utenti test (`*@example.test`) rimossi da Supabase Auth
- [ ] Tenant sintetici (`TEST-001`, `TEST-A`, `TEST-B`, `OP-*`) rimossi prima dell'ambiente reale

---

## H. PII Upload Guard — technical safety layer

Implementato in `lib/privacy/pii-guard.ts`. Attivo nell'operator flow e nel seed route TEST-001.

### Cosa rileva

| Tipo PII | Metodo | Severità |
|---|---|---|
| Email | Pattern regex | HIGH |
| Telefono (IT/int.) | Regex con minimo 9 cifre o prefisso internazionale | MEDIUM |
| Codice Fiscale IT | Pattern 16 char specifico | HIGH |
| IBAN | Pattern formato IBAN | HIGH |
| Chiavi nome/cognome | Match esatto su key: nome, cognome, full_name, ecc. | MEDIUM |
| Identificativi diretti | Match esatto su key: email, telefono, codice_fiscale, iban, ecc. | HIGH |
| Campi indirizzo | Match esatto su key: indirizzo, via, address, ecc. | LOW |

### Invariante di sicurezza

**I valori PII rilevati non vengono mai salvati** in:
- `audit_log.payload`
- response JSON
- `console.log`
- test output
- metadata degli audit events

Gli audit events contengono solo: `field_path`, `risk_type`, `severity`, conteggi. Mai il valore originale.

### Comportamento in Foundation Light

**Policy: `review_required + redaction`**

- PII rilevata → valore nel payload sostituito con `[REDACTED_PII:TIPO]`
- `eligibility_status` del record → `review_required`
- Audit event `pii_guard_flagged` scritto (senza valori)
- Pipeline continua (non bloccata)
- Dati sintetici OP-001 e TEST-001: tutti safe, nessuna regressione

### Cosa non garantisce

1. **Non sostituisce la pseudonimizzazione all'origine** — il guard opera a valle; se il cliente carica PII, il guard la intercetta ma non la elimina dall'origine.
2. **Non è un sistema di anonimizzazione** — rileva pattern evidenti; non rileva PII implicita o codificata in modo non standard.
3. **Non sostituisce il DPA** — è un guardrail tecnico complementare, non un obbligo legale adempiuto.
4. **Non copre tutti i formati PII** — non rileva immagini, PDF, dati biometrici, audio.
5. **Falsi negativi possono esistere** — pseudonimi mal formati o PII offuscata possono non essere rilevati.

### Decisione aperta: policy per dati reali (Gate 3B)

Per dati reali, la policy raccomandata è **strict reject**:
- Se PII rilevata → rifiutare il batch/record completamente
- Non persistere nulla
- Notificare l'operatore
- Non marcare `review_required` (che implica che qualcuno leggerà il dato)

Questa policy è documentata in `docs/technical-backlog.md` TODO-004 e dovrà essere confermata prima dell'onboarding di dati reali.

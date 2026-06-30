# KORA — Data Model Reference

**Branch:** `docs/consolidation`
**Versione:** CC-04 · 2026-06-30
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN (blocks SQL apply to production) · Gate 3 OPEN · Gate 5 OPEN

Questo documento è la mappa tecnica completa del modello dati KORA. Destinatari: CTO, reviewer tecnico esterno, team di sviluppo. Si basa unicamente sulle migration in `supabase/migrations/` e `supabase/proposed/` — nessuna connessione remota.

---

## 1. Executive Summary

Il modello dati KORA è organizzato attorno a due principi architetturali non negoziabili:

**Principio 1 — Schema come boundary di accesso.** I 7 schemi non sono solo namespace: ciascuno definisce chi può accedere. Lo schema `personal` è accessibile solo a `KORA_ADMIN` e al worker stesso. Lo schema `analytics` è il layer di output aggregato visibile alle aziende. Questa separazione è enforced a livello RLS — non è una convenzione applicativa.

**Principio 2 — Input aziendale ≠ visibilità aziendale.** L'azienda carica file che generano dati individuali (PIB, IU, partecipazioni). L'azienda non può mai leggere quei dati individuali — li alimenta come input, non li riceve come output. Solo aggregati company-level tornano all'azienda.

**Metriche schema corrente:**
- 7 schemi: `analytics`, `personal`, `gov`, `audit`, `kora`, `commons`, `network`
- ~30 tabelle definite (variazioni per ADD COLUMN nelle migration successive)
- 31 migration applicate (001–031, no 029)
- 2 migration proposed (032, 033 — in `supabase/proposed/`)
- 2 migration pianificate (034, 035 — KORA Link, non ancora scritte)

---

## 2. Schema Map

| Schema | Purpose | Chi accede | Privacy level |
|--------|---------|-----------|---------------|
| `analytics` | Company-level aggregates, KORA Index results, scoring pipeline outputs | KORA_ADMIN (ALL), COMPANY_ADMIN/VIEWER (own tenant, read), ADVISOR (own tenant, read) | Medium — aggregato, nessun dato individuale |
| `personal` | Pseudonymized individual-level records — worker identity, PIB, partecipazioni, CV, pseudonym map | KORA_ADMIN (ALL), WORKER (own rows only) — ZERO accesso company | Alto — massima restrizione RLS |
| `gov` | Financial governance, budget evidence per BTI | KORA_ADMIN (ALL), COMPANY_ADMIN/VIEWER (own tenant, read) | Medium |
| `audit` | Append-only audit trail — immutabile dopo insert | KORA_ADMIN o sub-role `audit_reader` (read), service_role (write) | Alto — nessun UPDATE/DELETE |
| `kora` | JWT claim helpers — funzioni utility lette da tutte le RLS policy | Qualsiasi role autenticato (EXECUTE) | N/A — solo funzioni |
| `commons` | KORA Space — post moderati, booking cross-company, KORA Contribution events | KORA_ADMIN (ALL), COMPANY_ADMIN (own tenant draft/pending/published), WORKER (own bookings + published posts) | Medium-alto — booking individuali mai visibili a company |
| `network` | Partner catalog — profili, identity, accreditamento | KORA_ADMIN (ALL), WORKER (published partners read), PARTNER (own identity only) | Basso — dati pubblici del catalogo |

**Nota `commons` schema:** create da migrazione 013. Separato da `personal` perché i post sono company-authored (non worker-private) ma i booking sono worker-private. La funzione SECURITY DEFINER `booking_aggregate_for_promoter()` è l'unico path sicuro per l'azienda promotrice.

---

## 3. Core Entity Map

### Schema `analytics`

| Tabella | Migration | Scopo | FK chiave |
|---------|-----------|-------|-----------|
| `analytics.tenant` | 001 (ext: 014, 021) | Company registry — una riga per azienda onboarded | — |
| `analytics.source_batch` | 001 | Un batch per file/fonte caricata | `tenant_id` |
| `analytics.uef_record` | 001 | Unified Event Frame — Stage 5 — una riga per iniziativa/categoria | `tenant_id`, `batch_id` |
| `analytics.impact_unit` | 005 | IU trace — Stage 10 — fattori formula + output per pillar | `tenant_id`, `uef_record_id`, `source_batch_id` |
| `analytics.activation_result` | 001 | Aggregato activation company-level (AR, MAR, continuità) | `tenant_id` |
| `analytics.confidence_result` | 001 | Confidence Score — esterno al KORA Index, weight=0 | `tenant_id` |
| `analytics.bti_result` | 001 | Budget-to-Human-Impact Engine output — macroblock 4 | `tenant_id` |
| `analytics.kora_index_result` | 001 | KORA Index v3 — output immutabile, is_current per period | `tenant_id`, FK opzionali a confidence/activation |
| `analytics.decision_pack_version` | 001 | Decision Pack versioning — aggrega 4 result FK | `tenant_id`, `kora_index_result_id`, `bti_result_id`, etc. |

**Colonne chiave `analytics.tenant`:**
```
id, tenant_code, company_name, industry_code, country_code
onboarding_status, data_readiness_status, decision_pack_status
methodology_version_id, is_active, created_at, updated_at, deleted_at
tenant_kind (014): LIVE | DEMO | TEST | SANDBOX
production_ready (021): boolean DEFAULT false — flag Pilot+
production_ready_at, production_ready_by
```

**`analytics.kora_index_result` — design immutability:**
```
is_current: boolean — solo un risultato current per (tenant_id, reporting_period)
  Partial UNIQUE INDEX garantisce l'invariante.
  Nuovo scoring → is_current = false sull'old, nuovo record current.
No updated_at — record immutabile.
components: JSONB (KoraIndexComponent[]) — JSONB per versioning metodologia
macroblocks: JSONB (MacroblockScore[]) — JSONB per versioning metodologia
```

### Schema `personal`

| Tabella | Migration | Scopo | Visibilità company |
|---------|-----------|-------|-------------------|
| `personal.workforce_baseline` | 001 | Headcount aggregato per tenant × periodo | Sì (aggregato, N≥10) |
| `personal.uploaded_record` | 001 | Righe pseudonymizzate da file aziendali | **MAI** |
| `personal.worker_identity` | 007 | Collega `auth.users` a tenant KORA | **MAI** |
| `personal.worker_profile_private` | 007 (ext: 009) | Profilo privato worker + consent | **MAI** |
| `personal.worker_initiative` | 008 (ext: 016) | Catalogo iniziative per tenant | Solo count aggregato via service-role |
| `personal.worker_participation` | 008 | Record partecipazione worker a iniziativa | **MAI** |
| `personal.worker_cv_share` | 011 | Token SHA-256 per condivisione Dynamic CV | **MAI** |
| `personal.worker_pseudonym_map` | 017 | Collega `worker_identity_id` ↔ `pseudonym_id` | **MAI — tabella più sensibile dello schema** |
| `personal.worker_pib` | 018 | Personal Impact Balance — Stage 11 | **MAI** |

**`personal.worker_pseudonym_map` — massima sensitività:**
```
worker_identity_id → pseudonym_id (1:1 in Foundation Light)
FORCE ROW LEVEL SECURITY — anche superuser bloccato in sessioni authenticate
ZERO policy company — 0 righe visibili per costruzione
Accesso: KORA_ADMIN (ALL) + WORKER (own row via subquery canonical)
```

**`personal.worker_pib` — due dimensioni temporali:**
```
TEMPO 1 (momento attività):
  iu_value, verification_status, is_exportable
  → STABILE, non aggiornato retroattivamente

TEMPO 2 (maturazione percorso cross-periodo):
  generative_index, generative_circle1/2/3
  → NULL in Foundation Light, popolati post-Pilot+

source_kind: company_sourced | partner_sourced | worker_declared
source_uef_record_id: FK → analytics.uef_record (se company_sourced)
source_participation_id: FK → personal.worker_participation (se partner/worker_declared)
```

**Idempotency indexes su `personal.worker_pib`:**
```sql
[U1] UNIQUE (worker_identity_id, source_uef_record_id, pillar)
     WHERE source_uef_record_id IS NOT NULL   -- PIB da UEF (company_sourced)

[U2] UNIQUE (worker_identity_id, source_participation_id, pillar)
     WHERE source_participation_id IS NOT NULL -- PIB da partecipazione
```

### Schema `gov`

| Tabella | Migration | Scopo |
|---------|-----------|-------|
| `gov.budget_governance` | 001 | Budget dichiarato azienda + evidence level per BTI |

**`gov.kip_records` non esiste e non deve mai essere creato.** Escluso esplicitamente da Foundation Light (CLAUDE.md §17.5, doc 22A §7).

**Evidence levels (`budget_evidence_level`):**
```
L0_NO_EVIDENCE → L1_SELF_DECLARED → L2_INTERNAL_DOCUMENT
→ L3_THIRD_PARTY_DOCUMENT → L4_VERIFIED_EVIDENCE
```

### Schema `audit`

| Tabella | Migration | Scopo |
|---------|-----------|-------|
| `audit.audit_log` | 001 (ext: 028) | Audit trail immutabile, append-only |

**Colonne aggiunte in 028:**
```
environment: 'demo' | 'live' | 'future'
ip_hash: SHA-256(ip_address) — one-way hash, non l'IP raw
user_agent_hash: SHA-256(user_agent) — one-way hash
```

**Invariante immutabilità:**
```sql
REVOKE UPDATE, DELETE ON audit.audit_log FROM PUBLIC;
-- Nessuna RLS policy UPDATE/DELETE — enforced doppio livello
```

### Schema `commons`

| Tabella | Migration | Scopo |
|---------|-----------|-------|
| `commons.post` | 013 (ext: 024) | KORA Space posts — annunci, iniziative, eventi, risorse |
| `commons.booking` | 025 | Prenotazioni worker a iniziative cross_company |
| `commons.contribution_event` | 025 | Binario KORA Contribution per tenant |

**`commons.post` — stati workflow:**
```
draft → pending_review → published → archived
                      ↘ rejected
COMPANY_ADMIN: crea draft/pending_review, non può pubblicare
KORA_ADMIN: unico che può impostare status = 'published'
WORKER: vede solo published del proprio tenant
```

**`commons.post` — opening_grade (ext 024):**
```
company_internal  — solo lavoratori tenant promotore
company_extended  — lavoratori + familiari/comunità (self-reported)
cross_company     — aperta ad altre aziende KORA (cross-tenant)
```

**`commons.contribution_event` — 11 contribution_kind:**
```
cross_company_participation    — booking confermato (mig 025)
external_participants_event    — evento con partecipanti esterni
company_adoption               — adozione formale iniziativa
company_sponsorship            — sponsorizzazione
company_support                — supporto generico
company_cofunding              — cofinanziamento
kora_originated_adoption       — adozione iniziativa KORA-originated
kora_enabled_adoption          — adozione resa possibile da KORA
initiative_replication         — replica iniziativa esistente
aggregate_feedback             — feedback aggregato (N≥10 only)
aggregate_follow_up            — follow-up aggregato
```

### Schema `network`

| Tabella | Migration | Scopo |
|---------|-----------|-------|
| `network.partner_profile` | 010 | Catalogo partner — profili, servizi, accreditamento |
| `network.partner_identity` | 012 | Collega `auth.users` a `partner_profile` |

---

## 4. Privacy Boundary Map

La matrice qui sotto è il contratto di accesso. Le X indicano "zero rows — nessuna RLS policy".

| Tabella | KORA_ADMIN | COMPANY_ADMIN | COMPANY_VIEWER | WORKER | PARTNER | ADVISOR |
|---------|-----------|---------------|----------------|--------|---------|---------|
| `analytics.tenant` | ALL | own (R) | own (R) | — | — | own (R) |
| `analytics.source_batch` | ALL | own (R) | own (R) | — | — | — |
| `analytics.uef_record` | ALL | ✗ | ✗ | — | — | own (R) |
| `analytics.impact_unit` | ALL | ✗ | ✗ | — | — | — |
| `analytics.activation_result` | ALL | own (R) | own (R) | — | — | — |
| `analytics.confidence_result` | ALL | own (R) | own (R) | — | — | — |
| `analytics.bti_result` | ALL | own (R) | own (R) | — | — | — |
| `analytics.kora_index_result` | ALL | own current (R) | own current (R) | — | — | — |
| `analytics.decision_pack_version` | ALL | own ready/exported (R) | own ready/exported (R) | — | — | — |
| `personal.workforce_baseline` | ALL | own (R) | own (R) | — | — | — |
| `personal.uploaded_record` | ALL | ✗ | ✗ | — | — | — |
| `personal.worker_identity` | ALL | ✗ | ✗ | own (R) | — | — |
| `personal.worker_profile_private` | ALL | ✗ | ✗ | own (ALL) | — | — |
| `personal.worker_initiative` | ALL | ✗ | ✗ | published (R) | — | — |
| `personal.worker_participation` | ALL | ✗ | ✗ | own (ALL) | — | — |
| `personal.worker_cv_share` | ✗ (no UI path) | ✗ | ✗ | own (ALL) | — | — |
| `personal.worker_pseudonym_map` | ALL | ✗ | ✗ | own (R) | — | — |
| `personal.worker_pib` | ALL | ✗ | ✗ | own (ALL) | — | — |
| `gov.budget_governance` | ALL | own (R) | own (R) | — | — | — |
| `audit.audit_log` | R (audit_reader) | ✗ | ✗ | — | — | — |
| `commons.post` | ALL | own (R+W draft/pending) | ✗ | published (R) | — | — |
| `commons.booking` | ALL | ✗ (solo fn aggregate) | ✗ | own (ALL) | — | — |
| `commons.contribution_event` | ALL | own (R) | own (R) | ✗ | — | — |
| `network.partner_profile` | ALL | ✗ | ✗ | published (R) | own (R) | — |
| `network.partner_identity` | ALL | ✗ | ✗ | ✗ | own (R) | — |

**Legenda:** `ALL` = SELECT+INSERT+UPDATE+DELETE, `R` = SELECT only, `W` = write perms, `✗` = zero rows (no policy), `—` = non applicabile per questo ruolo.

**Pattern canonico worker (subquery, tutte le tabelle personal):**
```sql
-- Evita corto-circuiti RLS. Pattern uguale in mig 007, 008, 017, 018, 025.
worker_identity_id IN (
  SELECT id FROM personal.worker_identity
  WHERE auth_user_id = auth.uid()
)
```

---

## 5. Migration Map

### Migration applicate (`supabase/migrations/`)

| N. | File | Scopo | Schema |
|----|------|-------|--------|
| 001 | `live_v1_foundation` | Schemi foundation, 9 tabelle core, JWT helpers, RLS base | analytics, personal, gov, audit, kora |
| 002 | `grants_and_softdelete` | Grant role, soft-delete helpers | analytics |
| 003 | `claim_functions_app_metadata` | Funzioni JWT claim v1 | kora |
| 004 | `gate3a_claims_and_grants` | Gate 3 claim upgrade, grant authenticated | kora, personal |
| 005 | `impact_unit_trace_layer` | `analytics.impact_unit` — Stage 10 IU record | analytics |
| 006 | `canonical_tenant_key` | `kora_tenant_id` come chiave JWT canonica (sostituisce `tenant_id` raw) | kora |
| 007 | `worker_provisioning` | `worker_identity` + `worker_profile_private` + RLS | personal |
| 008 | `worker_initiatives` | `worker_initiative` + `worker_participation` + RLS | personal |
| 009 | `worker_onboarding` | Campi consent/onboarding su `worker_profile_private` | personal |
| 010 | `partner_profile` | Schema `network`, `partner_profile` + RLS | network |
| 011 | `worker_cv_share` | `worker_cv_share` — token SHA-256 per Dynamic CV | personal |
| 012 | `partner_identity` | `network.partner_identity` — collega auth users a partner | network |
| 013 | `kora_commons` | Schema `commons`, `commons.post` + RLS + moderazione | commons |
| 014 | `tenant_classification` | `tenant_kind` (LIVE/DEMO/TEST/SANDBOX) su `analytics.tenant` | analytics |
| 015 | `company_safe_aggregation_layer` | 2 funzioni SECURITY DEFINER + 2 VIEW company-safe | analytics |
| 016 | `worker_initiative_source` | `source_kind` + `source_uef_record_id` su `worker_initiative` | personal |
| 017 | `worker_pseudonym_map` | `worker_pseudonym_map` — tabella più sensibile | personal |
| 018 | `worker_pib` | `worker_pib` — PIB Stage 11 con due tempi | personal |
| 019 | `bridge_uef_to_worker_initiative` | Funzione SECURITY DEFINER UEF→initiative bridge | personal |
| 020 | `redistribute_worker_pib_rpc` | RPC ridistribuzione PIB | personal |
| 021 | `tenant_pilot_ready` | `production_ready` flag su `analytics.tenant` | analytics |
| 022 | `worker_rls_gaps` | Fix gap RLS WORKER non coperta da mig precedenti | personal |
| 023 | `uploaded_record_attendee` | Canale nominativo pseudonymizzato — attribuzione d'ufficio PIB | personal |
| 024 | `commons_initiative_fields` | `opening_grade`, geolocalizzazione, capienze su `commons.post` | commons |
| 025 | `commons_booking_contribution` | `commons.booking`, `commons.contribution_event`, fn aggregate | commons |
| 026 | `company_route_rls_gaps` | Fix gap RLS company route | analytics, personal |
| 027 | `worker_individual_rls_refactor` | Refactor RLS WORKER — coerenza pattern subquery | personal |
| 028 | `audit_log_enrichment` | `environment`, `ip_hash`, `user_agent_hash` su `audit.audit_log` | audit |
| ~~029~~ | *(non esiste)* | Numero saltato | — |
| 030 | `uef_admin_access_hardening` | Hardening accesso admin su `uef_record` | analytics |
| 031 | `revoke_public_execute_uef_definer_functions` | Revoca EXECUTE PUBLIC su funzioni SECURITY DEFINER UEF | analytics |

**Nota 029:** il numero 029 non esiste — saltato durante lo sviluppo. Non è un errore; numeri non contigui sono accettabili in Supabase.

### Migration proposed (`supabase/proposed/`)

| N. | File | Scopo | Status |
|----|------|-------|--------|
| 032 | `contribution_atomic_attribution` | Funzione PL/pgSQL transazionale per 2-row attribution booking→contribution atomico | READY_FOR_REVIEW |
| 033 | `initiative_adoption_source_model` | `commons.initiative_adoption` — sorgente adozioni/sponsorizzazioni per Contribution V2 | READY_FOR_REVIEW |

**Prerequisiti per apply 032:** migration 025 REVISED (M025-7) applicata su target DB.
**Prerequisiti per apply 033:** migration 025 REVISED + 032 applicati; `uq_contribution_external` nella forma a 5 colonne (M025-7).

### Migration pianificate (KORA Link)

| N. | File (previsto) | Scopo |
|----|----------------|-------|
| 034 | `034_kora_link_schema.sql` | Schema KORA Link v1 — device registry, scan events, NFC/QR record attribution |
| 035 | `035_kora_link_rls.sql` | RLS policies KORA Link — accesso KORA_ADMIN e PARTNER only |

**032 e 033 sono occupati.** KORA Link deve usare 034 come primo numero libero.

---

## 6. RLS Model

### Meccanismo canonico

Tutte le RLS policy KORA usano i claim helper nello schema `kora`:

```sql
kora.kora_role()   -- legge app_metadata.kora_role con fallback
kora.tenant_id()   -- legge app_metadata.kora_tenant_id (canonico da mig 006)
```

**Regola non derogabile:** non usare `auth.jwt()->> 'tenant_id'` direttamente — bypassa il fallback canonical e non beneficia di future modifiche alla chiave claim.

### Pattern policy per tipo

**KORA_ADMIN — tutti i tenant, tutte le operazioni:**
```sql
FOR ALL USING (kora.kora_role() = 'KORA_ADMIN')
```

**Company — proprio tenant, read:**
```sql
FOR SELECT USING (
  kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
  AND tenant_id = kora.tenant_id()
)
```

**WORKER — propria riga via subquery (pattern canonico):**
```sql
FOR ALL USING (
  kora.kora_role() = 'WORKER'
  AND worker_identity_id IN (
    SELECT id FROM personal.worker_identity
    WHERE auth_user_id = auth.uid()
  )
)
```

**FORCE ROW LEVEL SECURITY** è applicato su tutte le tabelle `personal.*` e `commons.booking`. Garantisce che anche i superuser siano bloccati nelle sessioni authenticate.

### Funzioni SECURITY DEFINER

Funzioni che bypassano RLS internamente con verifica manuale del ruolo JWT:

| Funzione | Schema | Scopo | Caller |
|---------|--------|-------|--------|
| `fn_company_worker_status()` | analytics | Conteggio worker per status (aggregate-safe) | Company routes |
| `fn_company_activation_summary(period)` | analytics | Summary activation aggregato | Company routes |
| `booking_aggregate_for_promoter(post_id)` | commons | Count booking per status, N≥10 threshold | Company Space routes |
| `attribute_contribution_for_booking_atomic(...)` | commons | Scrittura atomica 2-row contribution (PROPOSED 032) | Attribution service |
| Bridge UEF→initiative (mig 019) | personal | UEF approvato → worker_initiative draft | Admin pipeline |

**N≥10 threshold in `booking_aggregate_for_promoter`:**
```
v_total_count < 10 (COMPANY_ADMIN caller):
  → RETURN QUERY SELECT 'below_threshold', v_total_count
  → Nessun breakdown per status — previene re-identificazione
KORA_ADMIN: bypass threshold per oversight/moderation
```

---

## 7. Supabase Types — Stato e Rischi di Drift

**File:** `lib/supabase/types.ts` (542 righe, hand-written)

Il file è mantenuto manualmente perché `npx supabase gen types typescript` richiede un `SUPABASE_ACCESS_TOKEN` non disponibile in ambiente locale. I tipi sono verificati contro `information_schema` al momento della loro scrittura.

**Rischi identificati:**

| Rischio | Descrizione | Impatto |
|---------|-------------|---------|
| **Drift silenzioso** | Una migration ADD COLUMN non aggiorna automaticamente `types.ts` | TypeScript non rileva colonne mancanti nel tipo, le query tornano undefined |
| **Schema non coperto** | `commons.*` e `network.*` potrebbero avere copertura parziale | I servizi che accedono a `commons.booking` o `network.partner_profile` usano `Json` o `any` |
| **JSONB non tipizzato** | Colonne `components`, `macroblocks`, `factor_trace`, `payload` sono `Json` generico | Nessun type-safety sulla struttura interna — errori solo a runtime |
| **Colonne extension** | Migration 014, 021, 024, 028 aggiungono colonne — `types.ts` deve essere aggiornato a mano | Drift in `TenantRow`, `PostRow` (se esiste), `AuditLogRow` |
| **Funzioni SECURITY DEFINER** | `fn_company_worker_status()`, `booking_aggregate_for_promoter()` non hanno tipi return TypeScript | Chiamate `.rpc()` usano `any` come return type |

**Azione raccomandata (post Gate 2):** generare tipi automatici con `supabase gen types typescript --project-id <staging-ref>` e sostituire `lib/supabase/types.ts`. Fino ad allora, aggiornare manualmente dopo ogni migration che modifica colonne.

---

## 8. KORA Index Data Model

Il KORA Index v3 è il prodotto di una catena di aggregazione in 14 stage che passa per 5 tabelle analytics.

```
File upload
  → analytics.source_batch          (Stage 1: batch ingestion)
  → analytics.uef_record            (Stage 5: UEF — record per iniziativa)
  → analytics.impact_unit           (Stage 10: IU_{e,p} per pillar)
  → analytics.activation_result     (Stage 12: aggregato company-level)
  → analytics.confidence_result     (Confidence Score — esterno al KORA Index)
  → analytics.bti_result            (BTI Engine — macroblock 4)
  → analytics.kora_index_result     (Stage 14: KORA Index v3 output)
  → analytics.decision_pack_version (Decision Pack — aggrega tutti i result FK)
```

**KORA Index v3 — 4 macroblocchi (pesi letti da `lib/methodology-config/v0.1.ts`):**
```
REACH (25%)  : AR (12.5%) + MAR (12.5%)
QUALITY (30%): EVQ (~10%) + INT (~10%) + CONT (~10%)
EQUITY (25%) : EQW (~7.5%) + EQS (~5%) + PC (~6.25%) + PB (~6.25%)
BTI (20%)    : BTI Engine — non da somma component values
```

**Invariante immutabilità scoring:**
```sql
analytics.kora_index_result.is_current
  Partial UNIQUE: (tenant_id, reporting_period) WHERE is_current = true
  → al più 1 risultato current per tenant × periodo
  → nuovo scoring: SET is_current = false + INSERT nuovo record
  → record vecchi conservati per audit trail
```

**Confidence Score — non confondere con componenti:**
```
CS (Confidence Score):
  - Calcolato in analytics.confidence_result
  - linked_to kora_index_result via confidence_result_id FK
  - weight = 0 nel KORA Index (non influenza il valore)
  - DEVE essere mostrato accanto al KORA Index value (non suppressibile)
  - calibration_status = 'pre_empirical_calibration' (non suppressibile)
```

---

## 9. Worker PIB Data Model

Il PIB (Personal Impact Balance) è lo Stage 11 del pipeline — l'intermediario obbligatorio tra eventi individuali e aggregazione company-level. Non è mai visibile all'azienda.

```
personal.worker_identity          (auth.uid() → worker_identity.id)
  ↓
personal.worker_pseudonym_map     (worker_identity.id → pseudonym_id)
  ↓ pseudonym_id
analytics.uploaded_record         (company upload, pseudonymizzato)
  ↓ approvazione + bridge
personal.worker_initiative        (source_kind=company_sourced, status=published)
  ↓ partecipazione worker
personal.worker_participation     (worker clicks "partecipa")
  ↓ IU computation via pipeline
personal.worker_pib               (Stage 11: iu_value per pillar per periodo)
  ↓ aggregazione in Stage 12
analytics.activation_result       (company-level — worker PIB mai esposto)
```

**Re-identificazione prevention:**
```
analytics.uploaded_record     → pseudonym_id (mai nome reale)
analytics.uef_record          → raw_name = nome iniziativa (non worker)
personal.worker_pseudonym_map → ZERO accesso company
La mappa re-identificazione NON è detenuta da KORA — la pseudonymizzazione
avviene lato cliente prima dell'upload. La chiave resta al titolare.
```

**Tre source_kind del PIB:**
```
company_sourced:
  Azienda carica CSV → UEF record approvato → bridge → worker_initiative
  Worker partecipa → worker_participation → PIB computation
  source_uef_record_id: FK non-null

partner_sourced:
  Partner organizza evento → partecipazione verificata (EV=L4)
  source_participation_id: FK non-null
  (FUTURE — schema presente, logica disabilitata in Foundation Light)

worker_declared:
  Worker dichiara attività autonoma → verifica KORA_ADMIN
  is_exportable = false fino a verifica
  (FUTURE — schema presente, logica disabilitata in Foundation Light)
```

---

## 10. KORA Space / Contribution Data Model

KORA Contribution è un **companion indicator** — non è un componente del KORA Index. Deve essere mostrato separatamente, mai fuso nel calcolo KORA Index.

### Flusso cross-company (Foundation Light)

```
commons.post (cross_company, published)
  ↓ worker prenota
commons.booking (pending → approved → attended)
  ↓ KORA_ADMIN segna attended_at
commons.contribution_event ×2 (atomico via fn 032 o sequenziale via attribution service):
  [row 1] tenant_id = post.tenant_id (Beta = promotrice)    role='promoter'
           contribution_kind='cross_company_participation'   impact_weight=1.0
  [row 2] tenant_id = booking.worker_tenant_id (Acme = origine) role='origin_employer'
           contribution_kind='cross_company_participation'   impact_weight=0.5
```

**Privacy guarantee cross-company:**
```
Acme (azienda di provenienza del worker):
  → NON vede i booking dei propri worker (zero policy su commons.booking)
  → Vede il proprio commons.contribution_event (own tenant_id, read)
  → Non sa quanti/quali worker hanno partecipato all'iniziativa di Beta

Beta (promotrice):
  → Vede count aggregato via booking_aggregate_for_promoter()
  → N<10 → 'below_threshold' (nessun breakdown per status)
  → Non vede mai worker_identity_id, nomi, o tenant di provenienza individuali
```

### Flusso adozione/sponsorizzazione (PROPOSED 033)

```
commons.initiative_adoption (company decision record — NON worker activity)
  ↓ attribution function
commons.contribution_event (adoption event — contribution_kind: company_adoption, etc.)
```

**`commons.initiative_adoption` — campo VIETATO per costruzione:** `worker_identity_id`, `worker_id`, `individual booking_id` non esistono e non devono mai essere aggiunti.

---

## 11. KORA Link v1 — Candidate Data Model (034/035)

KORA Link è in stato **Future Vision / Feature-flagged OFF** (`FEATURE_FLAGS.KORA_LINK_ENABLED = false`). Le migration 034/035 non sono ancora scritte. Questo paragrafo documenta il modello candidato.

**Due modalità operative:**

```
Modalità A (partner verified → IU → PIB → KORA Index):
  Worker scannerizza NFC/QR su servizio partner fisico accreditato
  → EV = L4 (L4_VERIFIED_EVIDENCE — massima qualità evidenza)
  → IU computation → PIB worker → aggregazione KORA Index
  → Prerequisiti: Gate 3 chiuso, partner L4 accreditato

Modalità B (collective/mentorship/cross-company → KORA Contribution):
  Worker scannerizza in contesto collettivo o mentoring
  → alimenta commons.contribution_event
  → companion indicator KORA Contribution (non KORA Index)
  → Prerequisiti: Gate 3 chiuso
```

**Tabelle candidate (034):**
```sql
-- Candidato — non ancora scritto, richiede CTO review
CREATE TABLE kora_link.device_registry (
  id               uuid PRIMARY KEY,
  partner_id       uuid REFERENCES network.partner_profile(id),
  device_type      text, -- 'nfc' | 'qr_static' | 'qr_dynamic'
  location_ref     text,
  accreditation_ev text, -- 'L4_VERIFIED_EVIDENCE' per Modalità A
  is_active        boolean,
  registered_at    timestamptz
);

CREATE TABLE kora_link.scan_event (
  id                  uuid PRIMARY KEY,
  device_id           uuid REFERENCES kora_link.device_registry(id),
  worker_identity_id  uuid, -- FK personal.worker_identity — MAI visibile a company
  scanned_at          timestamptz,
  raw_hash            text,   -- SHA-256 per deduplication
  attribution_mode    text,   -- 'modalita_a' | 'modalita_b'
  attribution_status  text,   -- 'pending' | 'attributed' | 'rejected'
  result_pib_id       uuid,   -- FK personal.worker_pib (dopo attribution)
  result_contribution_id uuid -- FK commons.contribution_event (Modalità B)
);
```

**RLS candidata (035):**
```
KORA_ADMIN: ALL su entrambe le tabelle
PARTNER: SELECT su device_registry WHERE partner_id = kora.kora_partner_id()
WORKER, COMPANY: ZERO — nessuna policy
```

**Prerequisiti per abilitare:**
1. Gate 3 chiuso (accesso dati reali)
2. Partner L4 accreditato (budget_evidence_level = L4 in `gov.budget_governance`)
3. `KORA_LINK_ENABLED=true` in environment variables
4. Migration 034/035 scritte e reviewate da CTO
5. `feat/kora-link-v1` branch completato e mergiato

---

## 12. Two-Track Event Model

Il modello distingue due binary distinte per gli eventi che generano impatto.

### Track 1 — Company Upload (KORA Index path)

```
Attore:  COMPANY_ADMIN carica file
Stage 1–4: AI Studio + Privacy Layer + Quality Engine (servizi mock)
Stage 5:  analytics.uef_record (UN record per iniziativa/categoria, non per worker)
Stage 10: analytics.impact_unit (IU_{e,p} per pillar)
Stage 11: personal.worker_pib (via bridge — se worker è identificato)
Stage 12: analytics.activation_result (aggregato)
Stage 14: analytics.kora_index_result (output finale)
```

**Caratteristica chiave:** l'UEF record rappresenta un'iniziativa, non un worker. Il worker appare solo nel PIB (personal schema), mai nell'output aziendale.

### Track 2 — Worker + Partner Activity (KORA Contribution path)

```
Attore:  WORKER partecipa ad attività partner/commons / COMPANY decide di adottare
commons.booking       → worker prenota evento cross_company
commons.post          → iniziativa pubblicata dalla company in KORA Space
commons.initiative_adoption (PROPOSED 033) → company adotta/sponsorizza
commons.contribution_event → binario Contribution per tenant
```

**Caratteristica chiave:** KORA Contribution non passa per la IU formula. Non alimenta il KORA Index. È un companion indicator calcolato separatamente.

### Punto di separazione

```
personal.worker_pib (source_kind='company_sourced')  → Track 1 → KORA Index
commons.contribution_event                           → Track 2 → KORA Contribution
```

Le due track **non si sommano** e **non si confondono**. Le tabelle di output sono separate. La UI deve mostrare i due valori in pannelli distinti.

---

## 13. Partner L4 Accreditation

L'accreditamento L4 è il prerequisito per i servizi partner che alimentano il KORA Index via Track 1 (EV = L4_VERIFIED_EVIDENCE).

```
network.partner_profile
  accreditation_level: L0 | L1 | L2 | L3 | L4
  accreditation_status: pending | active | suspended | expired

gov.budget_governance
  budget_evidence_level: L0_NO_EVIDENCE → L4_VERIFIED_EVIDENCE
  (EV correction factor nella formula IU lega a questo valore)
```

**Formula IU — dipendenza da EV:**
```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
EV range: 0.20 (L0) → 1.00 (L4)
AGF = 0 → IU = 0 (Anti-Gaming Factor disqualificante)
```

**In Foundation Light:** il logic partner L4 è presente nello schema ma disabilitato nel flusso live. L'accreditamento è gestito solo da KORA_ADMIN via route admin. Nessuna self-accreditation partner.

---

## 14. Wallet Hook — Predisposto, Non Implementato

**`gov.kip_records` non esiste e non deve mai essere creato.** È escluso esplicitamente (CLAUDE.md §17.5, doc 22A §7).

Il sistema wallet/KIP è documentato come **Future Vision** — architettura preparata, nessuna implementazione.

**Cosa è presente:**
```
gov.budget_governance → budget evidence per BTI — IMPLEMENTATO
analytics.bti_result  → output BTI Engine — IMPLEMENTATO
gov.kip_records       → ESCLUSO — non esiste, non creare
```

**Cosa non è presente (e non va creato prima di Gate 5):**
- Movimentazioni wallet individuali
- Voucher, checkout, pagamenti
- KIP allocation o redemption
- Fiscal/tax classification automatica

**Gate 5 (Tax/Fiscal Advisor) blocca:** qualsiasi output fiscale live, classificazione automatica, guardrail fiscali enforced.

---

## 15. Data Risks

I seguenti rischi sono identificati a partire dall'analisi delle migration. Nessuno è bloccante per Foundation Light, ma devono essere affrontati prima del go-live produzione.

| ID | Rischio | Tabella/Area | Severità | Mitigazione |
|----|---------|-------------|---------|-------------|
| DR-01 | **Drift tipi TypeScript** | `lib/supabase/types.ts` | Alta | Generare tipi automatici post Gate 2 con `supabase gen types typescript` |
| DR-02 | **Contesto JSONB non tipizzato** | `kora_index_result.components`, `impact_unit.factor_trace` | Media | Aggiungere Zod schema per parse runtime dei JSONB in API routes |
| DR-03 | **N≥10 threshold solo in fn SECURITY DEFINER** | `commons.booking`, `personal.workforce_baseline` | Alta | Il threshold è enforced in SQL per booking_aggregate e a app layer per workforce_baseline — documentare e testare entrambi i path prima del go-live |
| DR-04 | **Migration 025 REVISED (M025-7) non applicata a staging** | `commons.contribution_event.uq_contribution_external` | Alta | Applicare 025 REVISED prima di 032/033 — il constraint a 5 colonne è prerequisito |
| DR-05 | **Numero 029 mancante** | `supabase/migrations/` | Bassa | Non è un errore, ma documentare esplicitamente per evitare confusione in code review |
| DR-06 | **personal.worker_cv_share senza KORA_ADMIN policy** | `personal.worker_cv_share` | Media | Verificare che il path public share usi service_role (non JWT authenticated) per lookup sicuro del token SHA-256 |
| DR-07 | **audit.audit_log ip_address raw** | `audit.audit_log` | Media | Mig 028 aggiunge `ip_hash` — ma la colonna `ip_address inet` raw rimane per backward compat. Pre go-live: decidere se droppare ip_address o zeriarla in insert |
| DR-08 | **KORA Link feature flag senza runtime guard** | `lib/constants/feature-flags.ts` | Bassa | `FEATURE_FLAGS.KORA_LINK_ENABLED` è letto server-side — verificare che NESSUNA route KORA Link esista prima di abilitare il flag |

---

## 16. Migration Roadmap

Ordine di apply pianificato per il ciclo Pilot+ e oltre.

### Fase immediata (staging — Gate 2 prerequisito)

```
Verificare staging DB state:
  SELECT table_name FROM information_schema.tables
  WHERE table_schema IN ('analytics', 'personal', 'commons', 'gov', 'audit', 'network')
  ORDER BY table_schema, table_name;

Applicare se non già presenti:
  025 REVISED (M025-7) — prerequisito per 032 e 033
```

### Fase Pilot+ (post Gate 2 chiuso)

```
032  attribute_contribution_for_booking_atomic
     — atomicità attribution booking → 2×contribution_event
     — Prerequisito: 025 REVISED applicato

033  initiative_adoption_source_model
     — commons.initiative_adoption (adoption/sponsorship source)
     — Prerequisito: 025 REVISED + 032 applicato
     — No ordering dependency tra 032 e 033
```

### Fase KORA Link (post Gate 3 chiuso + partner L4)

```
034  kora_link_schema            [DA SCRIVERE]
     — device_registry, scan_event
     — Prerequisito: KORA Link design review CTO

035  kora_link_rls               [DA SCRIVERE]
     — RLS KORA_ADMIN + PARTNER su tabelle 034
     — Prerequisito: 034 applicato
```

### Fase produzione (post Gate 2 + Gate 3 chiusi)

```
SQL review completo da CTO (doc 27)
Prisma schema generato da migration (non viceversa)
Supabase prod project provisioning con migration run sequenziale 001→035
Generazione tipi automatici: supabase gen types typescript
NEVER: supabase db push senza review esplicita
```

### Numero liberi confermati

```
034 — primo numero libero (KORA Link schema)
035 — secondo numero libero (KORA Link RLS)
032, 033 sono OCCUPATI (in supabase/proposed/)
```

---

*Data Model Reference — CC-04 · Branch `docs/consolidation` · Gate 2 OPEN*
*Nessuna connessione a Supabase effettuata per produrre questo documento.*
*Nessuna migration applicata. Nessun segreto stampato. Produzione non toccata.*

# Partner Ecosystem Model 01 — Initiatives vs Partner Activities

**Data:** 2026-07-12
**Branch:** `feature/partner-ecosystem-model-01`
**Tipo:** Allineamento concettuale/prodotto — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO/fiscale/legale presa, nessun catalogo o booking reale costruito.

## Perché questo documento

L'audit read-only `PARTNER-ECOSYSTEM-MODEL-RO` (2026-07-12) ha rilevato che il repo contiene già un sistema maturo, testato e DB-backed per le **iniziative KORA Space / Contribution**, ma non contiene ancora un'entità per le **attività standard offerte dai partner**. Ha inoltre rilevato una collisione di naming reale: la parola "iniziativa"/"initiative" è oggi usata per tre concetti diversi e scollegati. Questo documento formalizza la distinzione prima che venga scritto altro codice sotto quel nome.

---

## 1. Sistema esistente e maturo: KORA Space / Contribution Initiatives

**Entità sorgente:** `commons.post` (`CommonsPost`, `lib/commons/types.ts`).

**Partecipazione:** `commons.booking` (`CommonsBooking`, `lib/commons/booking-types.ts`) — worker-initiated, moderato, stato `pending/approved/rejected/cancelled/attended`.

**Contribution:** `commons.contribution_event` (`ContributionEvent`) — generato quando una booking passa a `attended`, con `role` (`promoter`/`origin_employer`), `contribution_kind` (`cross_company_participation`/`external_participants_event`), `impact_weight`.

**Output:** KORA Contribution — companion indicator, **mai** componente KORA Index (`lib/kora-contribution/contribution-methodology.ts`: `CONTRIBUTION_ALTERS_KORA_INDEX = false`), nessun ranking, nessun punteggio individuale, nessuna leaderboard.

**Visibilità:** solo aggregata per l'azienda (`ContributionPromoterView`/`ContributionOriginEmployerView`, `lib/commons/contribution-views.ts`) — mai il legame worker↔iniziativa.

**Grado di apertura (`InitiativeOpeningGrade`):** `company_internal` / `company_extended` / `cross_company` — questo è già il meccanismo con cui il sistema rappresenta iniziative ecosistemiche, programmi cross-company, community, campagne ed eventi.

**Chi autora oggi:** `CommonsPost.author_role` è tipizzato `'KORA_ADMIN' | 'COMPANY_ADMIN'`. Il Partner **non** è un author_role valido oggi.

**Percorso futuro per il Partner (deciso in questo sprint, non implementato):**

```
Proposta Partner → revisione KORA/Admin → adozione Company/KORA → pubblicazione CommonsPost/KORA Space
```

Il Partner non scrive mai direttamente in `commons.post`. Propone; KORA Admin (o l'azienda che adotta) pubblica. Questo mantiene invariata la superficie DB-backed esistente e non richiede alcuna modifica a `commons.post`, `commons.booking` o `contribution_event`.

**Copertura test esistente:** `b97b-commons-foundation`, `b116-worker-partner-map`, `b127-partner-workspace`, `b128-kora-commons`, `b165-commons-initiatives`, `b166-bookings-contribution`, `b167-contribution-dashboard`, `kora-space-admin-bookings-control`, `kora-space-contribution-worker-activation`, `kora-space-inline-booking-ux`, `kora-contribution-hardening/pipeline/strategic-framing/version-b`.

---

## 2. Sistema futuro: Partner Activity Catalog / KORA Index Activities

**Non esiste ancora come entità.** Non c'è alcuna tabella, tipo, o mock che rappresenti "un'attività specifica offerta da un partner, prenotabile dal worker."

**Cosa esiste oggi, adiacente ma non equivalente:**
- `network.partner_profile` — un solo pilastro, una sola categoria, per organizzazione partner. Directory, non catalogo di attività. Esposta read-only a `app/api/worker/partner-catalog/route.ts` e `app/worker/opportunities/page.tsx` — nessun booking, nessun marketplace, nessun prezzo (per design, commento B116).
- `data/synthetic/action-taxonomy.json` — 79 voci con `fiscal_perimeter`, `primary_pillar`/`secondary_pillars`, `eligible_for_worker_pib`, `eligible_for_company_index`, `eligible_for_contribution_index`. Ha già la forma corretta per la classificazione fiscale/pillar/index-vs-contribution — ma è cablata alla classificazione di dati aziendali già caricati (ingestion/UEF), non a un'attività offerta da un partner specifico. Nessun campo `partner_id`.
- `docs/04-fiscal-policy-eligibility-layer.md` (stato: Approved) — definisce concettualmente le 4 dimensioni (Impact Pillar / Fiscal-Budget Perimeter / Partner-Service Eligibility / Policy Rules) — esattamente il modello concettuale richiesto qui, ma non ancora implementato come catalogo.

**Entità futura (nome di lavoro, non ancora creata):** `partner_activity`.

**Classificazione prevista:**
- categoria fiscale/welfare (riusando il vocabolario di `fiscal_perimeter` già esistente in `action-taxonomy.json` e nel doc 04);
- pilastro KORA (uno o più);
- eleggibilità come segnale KORA Index.

**Azione worker prevista:** booking, candidatura, richiesta di contatto, uso di voucher/servizio.

**Output previsto:** segnali aggregati KORA Index — **mai** KORA Contribution.

**Visibilità nominativa del partner:** solo dopo un'azione volontaria del worker (booking, candidatura, contatto, condivisione profilo) — esattamente il modello già implementato in `/partner/relationships` (PARTNER-SURFACE-01).

**Visibilità azienda:** solo aggregata — invariata rispetto al resto della piattaforma.

---

## 3. Differenza esplicita

| | Initiative (KORA Space) | Activity (Partner Catalog) |
|---|---|---|
| Natura | Oggetto ecosistema/community/contribution | Oggetto catalogo/servizio/welfare/opportunità |
| Entità | `commons.post` (esistente) | `partner_activity` (futura, non esiste) |
| Alimenta | KORA Contribution | KORA Index (segnali aggregati) |
| Autore oggi | KORA_ADMIN / COMPANY_ADMIN | — (non esiste ancora) |
| Autore futuro | + Partner via proposta → revisione → adozione | Partner direttamente (catalogo di servizi) |
| Azione worker | Partecipazione/booking a un evento/programma | Booking/candidatura/uso di un servizio |
| Nome individuale al partner | Mai (aggregato anche lato promoter) | Solo se il worker avvia volontariamente |

**Nota importante:** alcune attività potranno in futuro essere *impacchettate* dentro un'iniziativa (es. un partner offre un'attività che diventa parte di un programma cross-company pubblicato come `commons.post`), ma restano due oggetti distinti con due pipeline di output distinte (Contribution vs KORA Index). Non vanno mai fusi in un'unica tabella o in un'unica pipeline di segnale.

---

## 4. Registro delle collisioni di naming

| # | Superficie | Cosa rappresenta oggi | Stato |
|---|---|---|---|
| 1 | `commons.post` / `CommonsInitiative` | Iniziativa KORA Space reale, DB-backed, alimenta Contribution | Maturo, in produzione concettuale (Foundation Light) |
| 2 | `/partner/kora-link/initiatives` | Iniziative verificate Track A (scan fisico KORA Link) | Mock, no-DB, KORA Link-specifico |
| 3 | `/partner/initiatives` | Pipeline di proposta/sponsorship/adozione del partner | Mock, no-DB, PARTNER-SURFACE-01 |
| 4 | Partner Activity Catalog (futuro) | Attività/servizio standard del partner | Non esiste — concetto, non implementazione |

Tre superfici diverse usano oggi "iniziativa"/"initiative" per tre cose diverse. Questo documento e la pagina `/admin/partner-ecosystem-model` esistono per rendere questa distinzione visibile prima che venga aggiunto altro codice sotto lo stesso nome.

---

## 5. Naming raccomandato

- `/partner/initiatives` deve essere descritta come **"Proposte Partner"** (o "Iniziative proposte dai Partner") — non come iniziative KORA Space live, non come il futuro Partner Activity Catalog.
- Il futuro catalogo di attività deve usare la parola **"Activity"/"Attività"**, mai "Initiative"/"Iniziativa", per restare distinguibile a colpo d'occhio da `commons.post`.
- KORA Link Track A mantiene il proprio linguaggio ("iniziative verificate Track A") — resta scope-specifico e non va rinominato in questo sprint.

---

## 6. Decisioni umane ancora pendenti

Nessuna di queste è stata decisa in questo sprint — restano esplicitamente aperte:

1. Se `PARTNER` diventerà mai un `CommonsPost.author_role` valido, o se il percorso proposta→revisione→adozione resterà permanente.
2. Se le proposte partner richiederanno sempre revisione KORA/Admin, o se in futuro alcune categorie di partner accreditati potranno pubblicare direttamente.
3. Se la classificazione futura delle Partner Activity riuserà `action-taxonomy.json` direttamente o richiederà un sottoinsieme partner-specifico più stretto.
4. Chi possiede la validazione fiscale/legale delle categorie welfare/fringe benefit applicate alle Partner Activity.
5. Il testo di consenso/legale DPO per le relazioni nominative worker-partner (già segnalato come pendente in `/partner/privacy-boundary` e nel registro `/admin/governance`).

---

## Documenti collegati

`docs/PARTNER_SURFACE_01.md`, `docs/GOVERNANCE_UI_01.md`, `docs/KORA_LINK_CHANGELOG.md`, `docs/04-fiscal-policy-eligibility-layer.md`, `docs/11-economic-fiscal-architecture-integration.md`.

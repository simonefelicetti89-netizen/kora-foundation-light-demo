# KORA Link — Changelog

**Branch:** `feat/kora-link-v1-platform` (mergiato in `main` @ `db89f05`, 2026-07-01)
**Base:** `eaecdad` (`value-freeze-v1`)
**Stato:** codice mergiato in `main`. Gate 2 (CTO schema review) e Gate 3 (DPO/legal) restano aperti — nessuna abilitazione reale (DB lookup, activation) è consentita in staging/produzione finché non chiudono.

---

## KORA-ACTIVATION-LAYER-01 — Define Phase 2 Activation Intelligence Layer

**Data:** 2026-07-12
**Tipo:** Allineamento concettuale/prodotto — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessun calcolo KORA Index modificato, nessuna persistenza creata. Dettaglio completo in `docs/KORA_ACTIVATION_LAYER_01.md`.

Formalizza il **KORA Activation Layer**: la Fase 1 (Raw Data Intelligence — dati organizzativi caricati, classificati, che alimentano il KORA Index esistente) resta separata dalla Fase 2 (Activation Intelligence — segnali generati nativamente dalla piattaforma tramite Catalogo Attività Partner, abilitazione azienda, e scelta volontaria worker). Entrambe le fasi possono alimentare il KORA Index, ma restano due pipeline di segnale distinte — nessuna delle due è stata modificata da questo sprint.

- Creato `docs/KORA_ACTIVATION_LAYER_01.md` — dottrina completa: Fase 1, Fase 2, relazione con KORA Index, confine Contribution, confine privacy, sequenza di implementazione futura (COMPANY-ACTIVITY-SELECTION-01 → WORKER-ACTIVITY-DISCOVERY-01 → PARTNER-ACTIVITY-BOOKINGS-01 → ACTIVATION-SIGNAL-PIPELINE-01 → KORA-INDEX-ACTIVATION-INTEGRATION-01). Include un registro esplicito della collisione di naming su "activation" (già usato per Activation Safeguard, Activation Intelligence™ su `/company/activation`, attivazione fisica KORA Link, e profilo di attivazione worker) — la Fase 2 di questo documento è un quinto concetto distinto, non va confusa con `/company/activation`.
- Aggiunta `/admin/kora-activation-layer` — mappa di allineamento in sola lettura: modello a due flussi, flow diagram per entrambe le fasi, tabella di confine (sorgente/attore/tipo segnale/privacy/output/stato), stato di implementazione attuale, pannello privacy, sprint successivo raccomandato (COMPANY-ACTIVITY-SELECTION-01).
- Cross-link aggiunti: `/admin/partner-ecosystem-model` → `/admin/kora-activation-layer`, `/partner/activity-catalog` → `/admin/kora-activation-layer`, e viceversa.
- Aggiunta voce di navigazione admin "KORA Activation Layer" sotto "Network & Content", accanto a Partner Ecosystem Model.

Creato `tests/unit/kora-activation-layer-01.test.ts` (32 assertion statiche): esistenza route, distinzione Fase 1/Fase 2, principio dei due flussi KORA Index, input dichiarati per entrambe le fasi, nessun calcolo live modificato, stato di implementazione per ciascun componente futuro, confine Contribution, confine privacy, assenza totale di dati worker-level, nessun import Supabase/RPC/env, nessun feature flag, nessuna decisione DPO/CTO/fiscale/legale marcata risolta, navigazione e cross-link presenti, registro della collisione di naming "activation", e invarianti 034/035/036/self-select/company-SELECT/KORA-Index-engine-invariato.

**Nessun file toccato fuori da `app/admin/kora-activation-layer/page.tsx`, i cross-link aggiunti a `app/admin/partner-ecosystem-model/page.tsx` e `app/partner/activity-catalog/page.tsx`, `lib/navigation/admin-nav-groups.ts`, il nuovo test file, e i due doc.** `lib/kora-engine/kora-index-engine.ts`, l'ingestion/UEF, `commons.post`/`commons.booking`/`commons.contribution_event`, e `supabase/proposed/034/035/036` sono tutti invariati.

**Gate status invariato:** nessun gate toccato — questo step è puro allineamento concettuale, non tocca schema, RLS, RPC, calcolo KORA Index, o governance reale.

---

## PARTNER-ACTIVITY-CATALOG-01 — Standard Partner Activities Catalog Shell

**Data:** 2026-07-12
**Tipo:** No-DB/no-RLS UI shell + static model — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessun booking reale costruito. Dettaglio completo in `docs/PARTNER_ACTIVITY_CATALOG_01.md`.

Segue `PARTNER-ECOSYSTEM-MODEL-01`, che aveva formalizzato la Corsia B (Partner Activity Catalog/KORA Index Activities) come concetto futuro non implementato. Questo sprint costruisce la prima anteprima:

- Creato `lib/partner-activities/catalog.ts` — modello statico puro (tipi, etichette italiane, 8 attività mock, funzioni di accesso pure e riepilogo derivato). Non è un'iniziativa: non tocca `commons.post`/`commons.booking`/`commons.contribution_event`, non importa/modifica `data/synthetic/action-taxonomy.json`.
- Aggiunta `/partner/activity-catalog` — catalogo raggruppato per categoria fiscale, con card di riepilogo, nota privacy e nota di classificazione fiscale (metadato proposto, non approvazione).
- Aggiunta `/partner/activity-catalog/[activityId]` — dettaglio attività: classificazione, mappatura pilastri, modalità future di selezione azienda, azione futura worker, anteprima segnale KORA Index (mai reale), confine privacy, disclaimer fiscale/legale.
- Chiarito `/partner/initiatives`: aggiunto cross-link verso `/partner/activity-catalog` come corsia separata. Aggiornata anche l'etichetta di navigazione da "Iniziative Partner" a "Proposte Partner" per coerenza con il copy già introdotto in PARTNER-ECOSYSTEM-MODEL-01.
- Aggiunta voce di navigazione partner "Catalogo Attività" (badge `preview`).

Creato `tests/unit/partner-activity-catalog-01.test.ts` (43 assertion statiche): esistenza route/modello, linguaggio "Attività" mai "Iniziativa" per gli oggetti catalogo, distinzione da Proposte Partner/KORA Space, output dichiarati (KORA Index vs mai Contribution diretto), categoria fiscale + stato revisione senza claim di approvazione, mappatura pilastri, modello azione futura worker, assenza totale di dati worker-level, confine privacy (azienda aggregate-only, partner worker-initiated), nessun import Supabase/RPC/env, nessun feature flag, integrità del modello statico (summary derivato correttamente, nessun `contributionEligibility` implica feed diretto), nessuna decisione DPO/CTO/fiscale/legale marcata risolta, `/partner/initiatives` ancora chiaro, voce di navigazione, e invarianti 034/035/036/self-select/company-SELECT.

**Nessun file toccato fuori da `lib/partner-activities/catalog.ts`, `app/partner/activity-catalog/page.tsx`, `app/partner/activity-catalog/[activityId]/page.tsx`, il copy/cross-link di `app/partner/initiatives/page.tsx`, `components/layout/Sidebar.tsx` (nav), il nuovo test file, e i due doc.** `commons.post`, `commons.booking`, `commons.contribution_event`, il calcolo del KORA Index, `data/synthetic/action-taxonomy.json`, e `supabase/proposed/034/035/036` sono tutti invariati.

**Gate status invariato:** nessun gate toccato — questo step è puro shell UI/modello statico, non tocca schema, RLS, RPC o governance reale.

---

## PARTNER-ECOSYSTEM-MODEL-01 — Align Initiatives vs Partner Activities

**Data:** 2026-07-12
**Tipo:** Allineamento concettuale/prodotto — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO/fiscale/legale presa, nessun catalogo o booking reale costruito. Dettaglio completo in `docs/PARTNER_ECOSYSTEM_MODEL_01.md`.

Segue l'audit read-only `PARTNER-ECOSYSTEM-MODEL-RO`, che ha rilevato un sistema KORA Space/Contribution maturo (`commons.post` → `commons.booking` → `commons.contribution_event`) e una collisione di naming reale su "iniziativa" tra tre superfici scollegate. Questo sprint formalizza la distinzione prima di costruire un catalogo:

- Creato `docs/PARTNER_ECOSYSTEM_MODEL_01.md` — definisce la Corsia A (KORA Space/Contribution Initiatives, esistente e maturo) e la Corsia B (Partner Activity Catalog/KORA Index Activities, futura e non implementata), il registro delle collisioni di naming, il naming raccomandato, e le decisioni umane ancora pendenti (nessuna risolta qui).
- Aggiunta `/admin/partner-ecosystem-model` — mappa di allineamento in sola lettura per KORA_ADMIN: modello a due corsie, stato attuale (cosa esiste/mock/non esiste), flow map di entrambe le corsie, guardia di naming, confine privacy, prossime opzioni di implementazione.
- Chiarito il copy di `/partner/initiatives`: ora si presenta esplicitamente come "Proposte Partner", distinta sia dalle iniziative KORA Space già pubblicate (`commons.post`) sia dal futuro catalogo di attività partner. Nessuna modifica funzionale, nessun rename di route.
- Aggiunta una voce di navigazione admin "Partner Ecosystem Model" sotto "Network & Content", accanto a Partner Map/KORA Space Moderation/Worker Initiatives.

Creato `tests/unit/partner-ecosystem-model-01.test.ts` (22 assertion statiche): esistenza route, distinzione delle due corsie, output dichiarati (Contribution vs KORA Index), invarianti privacy, stato "futuro/non implementato" del catalogo, riferimento alla pipeline commons.post/booking/contribution esistente, nessun import Supabase/RPC/env, nessun feature flag, nessuna decisione DPO/CTO/fiscale/legale marcata come presa, copy di `/partner/initiatives` aggiornato, voce di navigazione, e invarianti 034/035/036/self-select/company-SELECT.

**Nessun file toccato fuori da `app/admin/partner-ecosystem-model/page.tsx`, il copy di `app/partner/initiatives/page.tsx`, `lib/navigation/admin-nav-groups.ts`, il nuovo test file, e i due doc.** `commons.post`, `commons.booking`, `commons.contribution_event`, il calcolo del KORA Index, e `supabase/proposed/034/035/036` sono tutti invariati.

**Gate status invariato:** nessun gate toccato — questo step è puro allineamento concettuale, non tocca schema, RLS, RPC o governance reale.

---

## GOVERNANCE-UI-01 — Platform Governance/DPO Surface

**Data:** 2026-07-12
**Tipo:** Read-only admin UI, KORA-Link-adjacent only — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO presa, nessun gate chiuso. Dettaglio completo in `docs/GOVERNANCE_UI_01.md`.

Aggiunta `/admin/governance`, prima superficie di governance a livello di piattaforma (non solo KORA Link): panoramica principi privacy, stato gate (riusa `getKoraLinkGates()` da `lib/kora-link/ecosystem.ts`, nessun dato duplicato), registro di 10 decisioni pendenti raggruppate per owner (6 già presenti su `/admin/kora-link/governance` in forma sintetica con rimando, 4 nuove voci più tecniche da `TODO-RLS`/`TODO-RPC` in 035/036), mappa del confine privacy per attore, riferimenti a 6 documenti di evidenza. `/admin/kora-link/governance` aggiornata con un cross-link verso la nuova pagina; nessun contenuto duplicato integralmente. Aggiunto un nuovo gruppo di navigazione admin di primo livello "Governance", separato da "Operations".

Creato `tests/unit/governance-ui-01.test.ts` (23 assertion statiche): esistenza route, nessun import Supabase/RPC/env, tutte e 10 le decisioni restano aperte/nessuna risolta, invarianti privacy dichiarati (azienda aggregate-only, partner worker-initiated, KORA Link proposed), riferimenti ai documenti senza rivendicare verifica fresca, nessun "mock"/"prossimamente"/ID interni in copy visibile, nessun feature flag, integrazione bidirezionale con KORA Link Governance, nav group dedicato, e invarianti 034/035/036/self-select/company-SELECT.

**Nessun file toccato fuori da `app/admin/governance/page.tsx`, un cross-link aggiunto ad `app/admin/kora-link/governance/page.tsx`, `lib/navigation/admin-nav-groups.ts`, il nuovo test file, e i due doc.** `supabase/proposed/034/035/036` invariati, worker self-select e company direct SELECT invariati, nessun feature flag toccato.

**Gate status invariato:** Gate 2, Gate 3 e Gate 4 restano tutti OPEN — questo step non tocca schema, RLS, RPC o governance reale, ed è puramente una superficie di lettura/registro.

---

## PARTNER-SURFACE-POLISH-01 — Terminology Cleanup After Partner Review

**Data:** 2026-07-12
**Tipo:** Copy/UI polish only — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO presa, nessun gate chiuso.

Applicato il polish sprint raccomandato da PARTNER-SURFACE-01-REVIEW (verdetto: da mantenere, nessun blocker, model clarity 5/5):

- **Disambiguazione etichette di stato:** `/partner/initiatives` (pipeline generale proposta/sponsorship/adozione) ora usa etichette visibili distinte da `/partner/kora-link/initiatives` (pipeline Track A scan/accreditamento) — "In preparazione" / "In valutazione" / "Approvata" / "Attiva" / "Conclusa" al posto di "Bozza" / "Verificata", che restano invariate solo su KORA Link Track A. I valori interni del tipo `InitiativeStatus` non sono cambiati — solo il testo italiano visibile.
- **Copy `/partner/aggregate-signals` tighten:** il pannello "Nessun dato individuale" non ripete più la frase sulla soglia di aggregazione già presente nel banner condiviso — aggiunge invece specificità nuova (l'azienda riceve anch'essa solo output aggregati su questi stessi segnali; i nominativi possono comparire solo su `/partner/relationships`, e solo per relazioni avviate volontariamente dal lavoratore).
- **Polish visivo `/partner/privacy-boundary`:** i quattro riquadri "può/non può vedere" ora hanno un bordo sinistro e un badge titolo colorati con i token `TOKENS.safeguard.pass`/`.cap` già usati altrove — nessuna nuova palette, nessun nuovo contenuto di policy, solo un aiuto visivo di scansione.

Aggiornato `tests/unit/partner-surface-01.test.ts` con 11 nuove assertion: nessuna sovrapposizione di etichette tra le due pipeline di iniziative, presenza delle nuove etichette disambiguate, invarianza delle etichette Track A, assenza di ripetizione della soglia di aggregazione, nuova specificità su company-aggregate-only e sul rimando a `/partner/relationships`, persistenza degli invarianti privacy-boundary dopo il polish visivo.

**Nessun file toccato fuori da `app/partner/initiatives/page.tsx`, `app/partner/aggregate-signals/page.tsx`, `app/partner/privacy-boundary/page.tsx`, il test file e questo changelog.** `supabase/proposed/034/035/036` invariati, worker self-select e company direct SELECT invariati, nessun feature flag toccato.

**Gate status invariato:** Gate 2, Gate 3 e Gate 4 restano tutti OPEN — questo step è puro polish di copy/UI, non tocca schema, RLS, RPC o governance reale.

---

## PARTNER-SURFACE-01 — Partner Workspace With Worker-Initiated Visibility Model

**Data:** 2026-07-12
**Tipo:** No-DB/no-RLS Partner pages, KORA-Link-adjacent only — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO presa. Dettaglio completo in `docs/PARTNER_SURFACE_01.md`.

Aggiunte quattro pagine partner no-DB (`/partner/initiatives`, `/partner/relationships`, `/partner/aggregate-signals`, `/partner/privacy-boundary`) che applicano il principio corretto: KORA nasconde il lavoratore all'azienda, non a ogni stakeholder — il partner può vedere nome/cognome solo dentro relazioni avviate volontariamente dal lavoratore (`/partner/relationships`), mai nelle viste aggregate. `/partner/kora-link` e `/partner/kora-link/initiatives` (KORA-LINK-SHELL-01/POLISH-01) sono stati aggiornati con cross-link verso la nuova area, restando scope-specifici a KORA Link Track A (scan fisico) e senza duplicare contenuto.

**Nessun file toccato fuori da `app/partner/{initiatives,relationships,aggregate-signals,privacy-boundary}/page.tsx`, i due file KORA Link partner esistenti (solo cross-link aggiunti), `components/layout/Sidebar.tsx` (nuova voce di navigazione), il nuovo test file e i due doc.** `supabase/proposed/034/035/036` invariati, worker self-select e company direct SELECT invariati, nessun feature flag toccato.

**Gate status invariato:** Gate 2, Gate 3 e Gate 4 restano tutti OPEN — questo step non tocca schema, RLS, RPC o governance reale, ed è indipendente dal readiness gate di KORA Link (nessuna relazione lavoratore-partner reale viene persistita).

---

## KORA-LINK-SHELL-POLISH-01 — Copy/Layout Polish After Shell Review

**Data:** 2026-07-12
**Tipo:** Copy/layout polish only — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO presa, nessuna chiusura di gate.

Applicato il polish sprint raccomandato da KORA-LINK-SHELL-01-REVIEW (verdetto: shell da mantenere, nessun rischio blocker, punteggi Company 4/5, Worker 4/5, Partner 3/5, Governance 3/5):

- **CTA labels:** rimossa la parola visibile "mock" dai pulsanti disabilitati di Company e Worker — "Scarica QR / istruzioni (mock)" → "Scarica QR e istruzioni"; "Attiva KORA Link (mock — non attivo)" → "Attiva KORA Link". Lo stato disabilitato e il tooltip esplicativo restano invariati — nessun CTA è stato reso funzionale.
- **Worker copy:** rimossa la sintassi tecnica `/link/<token>` dal testo rivolto al worker, sostituita con linguaggio semplice ("si aprirà automaticamente una pagina di conferma sicura"). Ridotta la ripetizione di "anteprima"/"non attivo" nel corpo pagina, mantenendo intatti il banner condiviso e il placeholder di consenso in attesa di revisione DPO (Gate 3, invariato parola per parola).
- **Partner parity:** aggiunto un pannello "Come funziona per il partner" (accreditamento → proposta/sponsorship → conferma privacy-safe → segnali aggregati) e un CTA disabilitato "Proponi una nuova iniziativa", per parità di interazione con Company/Worker. Rinforzato il testo privacy-safe con menzione esplicita di "nessun evento di scansione o attivazione individuale" e "solo segnali aggregati".
- **Governance readability:** le 6 decisioni aperte sono ora raggruppate per owner (DPO/Legal, CTO, CTO+Founder, CTO+DPO) invece di una lista piatta — raggruppamento derivato da `OPEN_DECISIONS` (nessun dato duplicato o hardcoded). Tutte e 6 restano esplicitamente "Aperta / pending"; nessuna è stata marcata come risolta o decisa.

Aggiornato `tests/unit/kora-link-shell-01.test.ts` con 5 nuovi describe block (16 nuove assertion) a guardia di: assenza di "(mock)" nei CTA label, assenza della sintassi `/link/<token>` nel copy worker, presenza del pannello "Come funziona per il partner" e del CTA partner, raggruppamento per owner in governance, e persistenza del placeholder di consenso DPO-pending dopo il cleanup del copy.

**Nessun file toccato fuori da `app/{company,worker,partner,admin}/kora-link/.../page.tsx` e dal test file** — `supabase/proposed/034/035/036` invariati, worker self-select e company direct SELECT invariati (nessuna modifica a `035_kora_link_rls.sql`), nessun feature flag toccato.

**Gate status invariato:** Gate 2, Gate 3 e Gate 4 restano tutti OPEN — questo step è puro polish di prodotto, non tocca schema, RLS, RPC o governance reale.

---

## KORA-LINK-SHELL-01 — Multi-Stakeholder No-DB Shell + QA_STATUS Reconciliation

**Data:** 2026-07-12
**Tipo:** UI/UX preview shells + docs reconciliation only — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO presa.

Costruite quattro pagine di anteprima design, pure UI/UX, senza DB e senza collegamento a nessuna infrastruttura reale:

- `app/company/kora-link/campaigns/page.tsx` — anteprima campagne di distribuzione (stati Draft/Approved/Ready to distribute/Expired, canali QR/NFC/Link, nota "nessuna visibilità individuale"), linkata da `/company/kora-link`.
- `app/worker/kora-link/activate/page.tsx` — prima superficie KORA Link nell'albero live `/worker/*` (protetta da `requireWorkerUser()`, pattern identico a `app/worker/privacy/page.tsx`), con pulsante di attivazione disabilitato (mock) e testo di consenso esplicitamente segnalato come in attesa di revisione DPO (Gate 3). Distinta dalla superficie demo-preview `/my-kora/kora-link` già esistente.
- `app/partner/kora-link/initiatives/page.tsx` — anteprima iniziative Track A (dati mock, nessuna tabella `partner_scans`), linkata da `/partner/kora-link`.
- `app/admin/kora-link/governance/page.tsx` — registro delle 6 decisioni di governance ancora aperte (testo consenso, retention, hashing `request_fingerprint`, soglia di aggregazione, semantica `delivered_to_label`, procedura break-glass), ciascuna esplicitamente "Aperta / pending" con owner e gate bloccante — non risolve nessuna di esse. Linkata da `/admin/kora-link`.

Tutte e quattro le pagine usano il flag di navigazione `preview: true` già esistente in `components/layout/Sidebar.tsx` (stessa convenzione di `/company/opportunities`, `/my-kora/kora-space`) o un suffisso `(Anteprima)` per `lib/navigation/admin-nav-groups.ts` — mai "prossimamente". Nessuna delle quattro pagine importa un client Supabase, chiama `.rpc()`, o abilita un feature flag KORA Link.

Aggiornato `docs/QA_STATUS.md` per riconciliare contraddizioni stale rispetto a `docs/E2E_GOLDEN_PATH.md`, `docs/E2E_TWO_TENANT_ISOLATION.md` e `docs/PILOT_GOVERNANCE.md` §15/§15a (nessuna nuova esecuzione live in questo step — solo correzione di testo che non rifletteva più run già documentate altrove).

Creato `tests/unit/kora-link-shell-01.test.ts` (31 assertion statiche): esistenza delle 4 pagine, banner "Anteprima design / no DB / Non attivo" su tutte, nessun import Supabase/RPC, nessun feature flag hardcoded a true, nessun identificativo worker/tag individuale referenziato come codice nelle pagine company/worker/partner, guardia auth (`requireWorkerUser`) sulla pagina worker, le 6 decisioni di governance restano tutte aperte, convenzione di navigazione `preview`/`(Anteprima)` rispettata senza "prossimamente", e 034/035/036 restano `proposed, non applicato`.

**Gate status invariato:** Gate 2 (CTO schema review), Gate 3 (DPO/legal) e Gate 4 (RLS review) restano tutti OPEN — questo step non tocca schema, RLS o RPC proposti e non chiude alcun gate.

---

## KORA-LINK-S3B — Docs/Comment Cleanup After S3A

**Data:** 2026-07-12
**Tipo:** Comment/docs only — nessuna migration, nessun SQL applicato, nessuna modifica a function bodies, nessuna policy aggiunta/rimossa, nessuna decisione CTO/DPO presa.

Corretto un riferimento stale trovato in `034`/`035`: entrambi i file descrivevano una "future company aggregate view" mai costruita, con nomi incoerenti (`v_batch_stats` in 034 vs `v_tenant_batch_stats` in 035). Sostituito con un rimando esplicito alla RPC già implementata `fn_company_link_status_aggregate` (036) — nessuna view pianificata, nessuna policy company-facing diretta esiste o è prevista. Aggiornato `TODO-RLS-04`/`TODO-RLS-05` in 035 per riflettere lo stato corrente (S3A ha già aggiunto il grant `service_role` che TODO-RLS-05 chiedeva) senza chiudere alcun TODO. Aggiornato `docs/KORA_LINK_GATE_REPORT.md` §1/§5 con una nota S3A/S3B concisa. Nessuna decisione Gate 3 (DPO/legal) presa o influenzata.

**Gate status invariato:** Gate 2 substantively closed (engineering, KL-19) · Gate 3 OPEN (DPO/legal) · Gate 4 OPEN (worker self-select e company-facing SELECT esattamente come prima).

---

## KORA-LINK-S3A — RLS 035/RPC 036 Draft Hardening

**Data:** 2026-07-12
**Tipo:** Proposed SQL draft-only (034/035/036 rimangono proposed/non applicati) + 1 nuovo test statico — nessuna migration applicata, nessun SQL eseguito, nessuna modifica ad active migrations.

Chiuso un gap reale di grant-hygiene identificato in `KORA-LINK-S3-RO`: mancavano grant `service_role` per lo schema/tabelle/funzioni `kora_link` — stessa classe di bug già trovata e corretta nelle migration attive 032 e 033. Aggiunti grant `service_role` espliciti (schema USAGE + 9 tabelle in 035, EXECUTE su 6 funzioni in 036), aggiunto `REVOKE ALL ON FUNCTION kora_link.is_kora_admin() FROM PUBLIC` prima del suo `GRANT` per coerenza con il pattern già seguito da ogni funzione SECURITY DEFINER in 036 (derivato dalla migration 031). Rimossi gli stub SQL storici di `fn_public_lookup_link`/`fn_activate_link_for_worker` in 035 (superati da 036, che li implementa già per intero) mantenendo la prosa di design-rationale. Creato `tests/unit/kora-link-rls035-review.test.ts` (93 assertion statiche: RLS enable/force su tutte le 9 tabelle, set di policy KORA_ADMIN atteso, nessuna policy UPDATE/DELETE sulle tabelle append-only, worker self-select inattiva, nessuna policy company-facing diretta, hygiene SECURITY DEFINER su tutte le 6 funzioni, grant `service_role` presenti).

**Gate status invariato:** Gate 4 rimane OPEN — questo è un hardening draft-only, non una review formale.

---

## QA-01 — KORA Link Staging Readiness Audit

**Data:** 2026-07-01
**Branch:** `qa/kora-link-staging-readiness`
**Tipo:** Audit — nessuna modifica a codice, nessun fix (nessun bug trovato in questo step).

### Contenuto

Creato `docs/archive/qa/KORA_LINK_STAGING_READINESS_QA.md` — audit di readiness per QA browser/staging post-merge: routes readiness (7 route), env readiness matrix (8 variabili), role QA matrix (4 ruoli), manual NFC test plan (12 step), safety boundary verification, known blockers.

### Risultato

Tutte le verifiche tecniche confermate verdi su `main` post-merge (TypeScript 0 errori, Vitest 8622/8622, build OK, E2E 6/6). QA browser live riuscita per `/company/kora-link` con credenziale reale `company-admin@staging.kora.internal`. QA live bloccata per `/admin/kora-link`, `/admin/kora-link-lab`, `/partner/kora-link` (nessuna credenziale KORA_ADMIN/PARTNER di staging) e `/my-kora/kora-link` (i 3 account worker di staging sono bloccati in stato `onboarding` — pre-esistente, non specifico KORA Link).

### Conclusione

`STAGING_BROWSER_QA_READY: no` (parziale) · `NFC_DEMO_READY: no` (bloccato da credenziali admin) · `DB_LOOKUP_ENABLEMENT_READY: no` · `ACTIVATION_ENABLEMENT_READY: no` · `PRODUCTION_READY: no`.

---

## KL-23 — KORA Link Ecosystem Control Layer

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Codice TypeScript runtime + UI + test unit — nessuna migration, nessun SQL applicato, nessuna modifica a 034/035/036, nessuna nuova dipendenza.

### Obiettivo

Trasformare KORA Link da feature isolata a layer trasversale dell'ecosistema KORA: modello concettuale condiviso (ruoli, capability, gate, confini privacy, lifecycle, mapping algoritmo futuro) + superfici UI coerenti in Admin, Worker, Company e Partner.

### Contenuto

Creato `lib/kora-link/ecosystem.ts` — single source of truth server-safe (pure data + pure funzioni, nessun Supabase, nessun DB):

- **6 ruoli**: `admin · worker · company · partner · space · algorithm`
- **9 gate** (`KORA_LINK_GATES` + `KORA_LINK_GATE_STATUS`) — Gate 1 chiuso, Gate 2-9 aperti, coerente con CLAUDE.md §9
- **13 capability** (`KORA_LINK_CAPABILITIES`) classificate in 4 livelli di implementazione: `always_on` (token_generation, nfc_url_generation) · `flag_gated` (public_route, db_lookup, worker_activation, consent_capture) · `drafted_pending_gate` (revocation, replacement, company_aggregate_visibility — draft SQL in 036, zero codice runtime) · `roadmap` (partner_verified_scan, space_initiative_linking, impact_unit_mapping, confidence_score_support — nessun draft)
- **6 stati capability** (`available · configured · locked · requires_gate · planned · disabled`) derivati da un'unica funzione pura `getKoraLinkCapabilityState()` — mai impostati a mano per pagina
- **6 confini privacy** (`KORA_LINK_PRIVACY_BOUNDARIES`) — company mai worker-level, partner mai dati non necessari, worker controlla sempre consenso/attivazione, admin gestisce infrastruttura non scoring, algoritmo consuma solo eventi eleggibili, nessuna persistenza token grezzo
- **7 stage lifecycle** (`KORA_LINK_LIFECYCLE`) — batch generation → NFC preparation → delivery → activation → revocation → replacement → audit, ciascuno con stato derivato
- **7 eventi futuri** (`KORA_LINK_EVENT_MAPPING`) — tassonomia algoritmo: `link_generated · link_delivered · link_activated · link_revoked · link_replaced · verified_partner_event_future · space_initiative_participation_future`, ciascuno mappato a role source, privacy level, eleggibilità IU, effetto KORA Index, effetto Confidence, gate richiesto — **eleggibilità IU e effetto KORA Index/Confidence non sono mai `'yes'`, solo `'no'` o `'future'`**

Creati 4 componenti condivisi in `components/kora-link/` (presentazionali puri, server-renderable, nessun fetch):

| Componente | Scopo |
|---|---|
| `KoraLinkCapabilityCard` | Una capability con badge di stato colorato (6 stati → 6 stili) |
| `KoraLinkBoundaryCard` | Lista dei confini privacy per un ruolo |
| `KoraLinkReadinessPanel` | Scala dei 9 gate con stato open/closed |
| `KoraLinkRoleDashboard` | Compone i tre sopra per un `KoraLinkRoleSummary` — shell riusata da tutte e 4 le pagine ruolo |

Creata **4 pagine ruolo**, ciascuna protetta dal layout esistente del proprio route group (nessun nuovo sistema auth):

| Pagina | Layout guard | Contenuto |
|---|---|---|
| `/admin/kora-link` | `app/admin/layout.tsx` (`requireKoraAdmin`) | Control Tower: link al Lab, runtime readiness, feature flag, lifecycle overview, capability matrix 13×6 ruoli, capacità admin, gate status, confini privacy dell'intero ecosistema, prossime azioni operative (gate ancora aperti) |
| `/my-kora/kora-link` | `app/my-kora/layout.tsx` (worker/admin-preview/demo) | "My KORA Link": stato attivazione, cosa può fare il worker, spiegazione consenso (versione provvisoria), come attivare (scan chip), cosa l'azienda non vede, esperienze verificate future |
| `/company/kora-link` | `app/company/layout.tsx` (`requireCompanyUser`) | Governance aggregata: rollout readiness, 4 metric card (coverage/activation/replacement/revocation aggregate — stato derivato, **nessun numero finto**), banner esplicito "nessuna visibilità individuale", capacità company, gate, confini privacy |
| `/partner/kora-link` | `app/partner/layout.tsx` (`requirePartnerUser`) | Verified event infrastructure: scan readiness (roadmap), requisito di accreditamento, interazione privacy-safe, capacità partner, gate, confini privacy |

Aggiunta voce **KORA Link** alla navigazione esistente (nessuna struttura nuova):
- `lib/navigation/admin-nav-groups.ts` — gruppo `operations` → `/admin/kora-link`
- `components/layout/Sidebar.tsx` — gruppo Company "Network" → `/company/kora-link`; gruppo Worker "Attivazione" → `/my-kora/kora-link`; gruppo Partner "Portale Partner" → `/partner/kora-link`

Creato `tests/unit/kora-link-ecosystem.test.ts` — 98 test.

### KORA Space integration — deferred

`app/commons/page.tsx` (KORA Space/Commons) è un client component esistente di grandi dimensioni con un proprio service layer (`CommonsService`). Come previsto dalla regola "se non è semplice, implementa mapping in ecosystem.ts e segnala UI deferred": il modello concettuale è completo in `ecosystem.ts` (ruolo `space`, capability `space_initiative_linking`, evento `space_initiative_participation_future`), ma **nessuna modifica UI è stata fatta a `/commons`, `/company/commons`, `/worker/commons`** in questo step — deferred a un KL futuro per non introdurre rischio di regressione su una superficie già esistente e non richiesta come modifica obbligatoria.

### Partner integration — non deferred

Il routing partner esisteva già (`app/partner/layout.tsx` con `requirePartnerUser`) — la pagina `/partner/kora-link` è stata quindi implementata direttamente (non deferred), con contenuto esplicitamente "roadmap/Track A futuro" dato che nessuno scan partner è implementato oggi.

### Sicurezza / invarianti

- Nessun uso di Supabase o DB in `ecosystem.ts` o nei nuovi componenti — solo lettura env (`process.env`) tramite le funzioni già esistenti di `config.ts`
- Nessun service role
- Nessun dato worker-level esposto alla company — la company vede solo `company_aggregate_visibility`, mai `worker_activation`/`consent_capture`; il testo esplicito della pagina company dichiara cosa non sarà mai mostrato
- Nessun dato personale esposto al partner — pagina partner descrive solo modello futuro, nessun dato reale
- Nessun token grezzo, nessun digest, nessun `worker_id` nei modelli dati (`KORA_LINK_CAPABILITIES`, `KORA_LINK_LIFECYCLE`, `KORA_LINK_EVENT_MAPPING`) — verificato con test dedicati
- Nessun Impact Unit creato, nessuna mutazione del KORA Index — `impactUnitEligible` e `affectsKoraIndex` non sono mai `'yes'` in nessuna delle 13 capability o dei 7 eventi, solo `'no'`/`'future'`
- Nessuna nuova pagina bypassa un guard esistente — tutte e 4 le pagine ereditano il layout guard del proprio route group
- Nessuna modifica a `034_kora_link_schema.sql` / `035_kora_link_rls.sql` / `036_kora_link_rpc_functions.sql`
- Nessuna migration creata, nessun SQL applicato, nessuna modifica a file `.env`, nessuna nuova dipendenza

### Controlli statici

- `grep service_role` nei nuovi file: 0 ✅
- `grep token_value|raw_token|clear_token|token_plaintext` nei nuovi file: solo l'id dichiarativo `no_raw_token_persistence` (nessun valore reale) ✅
- `grep worker_id` nella company page/helper: solo prosa che dichiara l'assenza del dato, nessun dato esposto ✅
- `grep` creazione Impact Unit: 0 ✅
- `grep` mutazione KORA Index: 0 ✅
- 034/035/036 modificati: no ✅
- Migration nuove: 0 ✅
- `package.json` / `package-lock.json` modificati: no ✅

### Metriche

- File creati: 10 (`lib/kora-link/ecosystem.ts`, 4 componenti in `components/kora-link/`, 4 pagine ruolo, `tests/unit/kora-link-ecosystem.test.ts`)
- File modificati: 2 (`lib/navigation/admin-nav-groups.ts`, `components/layout/Sidebar.tsx`) + `docs/KORA_LINK_CHANGELOG.md`
- Dipendenze aggiunte: 0
- SQL applicato: 0 · Migration create: 0 · 034/035/036 modificati: no
- TypeScript: 0 errori
- ESLint: 0 errori sui file nuovi/modificati da KL-23 (1 errore pre-esistente in `Sidebar.tsx`, non introdotto da questo step — confermato via `git stash` sulla versione precedente)
- Vitest: 8620/8620 passed (202 file, +98 rispetto a KL-22, incluse tutte le suite nav/sidebar pre-esistenti senza regressioni)
- Build: OK — `/admin/kora-link`, `/my-kora/kora-link`, `/company/kora-link`, `/partner/kora-link` presenti come route dynamic
- E2E: 6/6 passed

### Gate status post-KL-23

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| KL-22 | ✅ COMPLETATO |
| KL-23 (Ecosystem control layer) | ✅ COMPLETATO — modello + UI multi-ruolo, nessun impatto su Gate 2/3 |
| KL-24+ | KORA Space UI integration (deferred da KL-23) · Admin revocation/replacement UI reale · staging deploy — bloccati da Gate 2+3 |

---

## KL-22 — KORA Link Worker Activation Runtime Flow

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessun SQL applicato, nessuna modifica a 034/035/036, nessuna nuova dipendenza, nessun nuovo sistema auth.

### Contenuto

Creato `lib/kora-link/activation.ts` — helper server-only per il worker activation flow: `activateKoraLinkForWorker()` (chiama `fn_activate_link_for_worker`, draft in 036) e `buildKoraLinkActivationState()` (stato UI puro/derivato).
Modificato `lib/kora-link/config.ts` — aggiunto `KORA_LINK_ACTIVATION_ENABLED` a `KoraLinkEnv` + `isKoraLinkActivationEnabled(env)`.
Modificato `app/link/[token]/page.tsx` — nel ramo `state === 'ready'` risolve la sessione worker (solo se activation è enabled) e il pannello di attivazione (`ActivationPanel`), leggendo l'esito da `?activation=` dopo il redirect del POST.
Creato `app/link/[token]/activate/route.ts` — endpoint POST server-only, consumato dal `<form>` HTML della pagina pubblica (nessun client JS, nessuna dipendenza nuova).
Creato `tests/unit/kora-link-activation.test.ts` — 52 test.
Aggiornato `tests/unit/kora-link-config.test.ts` — +9 test per `isKoraLinkActivationEnabled`.

### Comportamento

```
KORA_LINK_ACTIVATION_ENABLED (default: assente/false)
  → false: pannello activation mostra "KORA Link pronto. Activation non abilitata in questo ambiente."
           nessuna sessione worker viene risolta, nessuna chiamata RPC possibile
  → true:  worker non autenticato → CTA "Accedi come worker per completare l'attivazione" (→ /worker/login, pattern esistente)
           worker autenticato     → form con checkbox di consenso + CTA "Attiva KORA Link"
             → POST /link/[token]/activate
                 → valida token, readiness, sessione worker, checkbox di consenso
                 → activateKoraLinkForWorker(): computeDigest(token, secret) → fn_activate_link_for_worker
                     (p_token_digest, p_worker_id, p_consent_version)
                 → redirect 303 a /link/[token]?activation=<esito safe> (mai digest, mai worker_id, mai token raw oltre l'URL già esistente)
```

### Funzioni esportate (`lib/kora-link/activation.ts`)

| Export | Tipo | Scopo |
|--------|------|-------|
| `KORA_LINK_ACTIVATION_CONSENT_VERSION` | const | `'kora-link-consent-v1-draft'` — versione di consenso provvisoria, copy finale in attesa di DPO/legal |
| `activateKoraLinkForWorker(params)` | fn | Flag off → `disabled`; token/worker/consent non validi → stato safe dedicato senza chiamare la RPC; altrimenti calcola il digest e chiama `fn_activate_link_for_worker`; normalizza qualunque risposta/errore RPC a uno stato safe (mai un'eccezione, mai `digest`/`token`/`worker_id` nel risultato) |
| `buildKoraLinkActivationState(params)` | fn | Funzione pura che deriva lo stato UI (`disabled · unauthenticated · lookup_not_ready · ready · activating · activated · unavailable · error`) da flag, readiness del lookup, stato auth worker ed esito activation — precedenza: flag off > lookup non pronto > worker non autenticato > esito > ready |

### Sicurezza / invarianti

- `KORA_LINK_ACTIVATION_ENABLED` default **off** — nessuna activation possibile finché non è esplicitamente `'true'`
- Token raw **non** inviato al DB — solo `computeDigest(token, secret)` attraversa la RPC
- Digest completo **non** esposto in nessuno stato restituito al chiamante
- `worker_id` risolto lato server dalla sessione autenticata — **mai** accettato da input client, **mai** presente nel risultato di `activateKoraLinkForWorker` o nell'URL di redirect
- Nessun service role — l'activation gira sotto la sessione del worker (client server-side standard, stesso pattern di KL-19)
- Nessun nuovo sistema di autenticazione — riusa `getCurrentWorkerUser()` / `requireWorkerUser` (`lib/auth/kora-session.ts`) e la route `/worker/login` esistenti
- Consenso obbligatorio: il POST richiede la checkbox `consent_confirmed`; assente → stato `consent_required` → `error` safe, nessuna chiamata RPC se il consenso manca lato helper
- Fallback safe su ogni errore RPC/client/digest → `unavailable` o `error`, mai un'eccezione propagata
- Nessun Impact Unit, nessuno scoring, nessun effetto sul KORA Index — l'activation aggiorna solo stato link/assignment lato RPC (draft 036), mai la pipeline IU/PIB/KORA Index
- Nessuna modifica a `034_kora_link_schema.sql` / `035_kora_link_rls.sql` / `036_kora_link_rpc_functions.sql`
- Nessuna migration creata, nessun SQL applicato, nessuna modifica a file `.env`, nessuna nuova dipendenza

### Controlli statici

- `grep service_role` in `app/link` + `lib/kora-link`: 0 ✅
- `grep console.log` nei file modificati: 0 ✅
- `grep fn_activate_link_for_worker`: presente solo in `activation.ts`, test dedicato, changelog, documentazione 036 ✅
- `grep token_value|raw_token|clear_token|token_plaintext` nei file modificati: 0 ✅
- `grep KORA_LINK_ACTIVATION_ENABLED`: presente in `config.ts`, `activation.ts`, `page.tsx`, test ✅
- 034/035/036 modificati: no ✅
- Migration nuove: 0 ✅
- `package.json` / `package-lock.json` modificati: no ✅

### Metriche

- File creati: 3 (`lib/kora-link/activation.ts`, `app/link/[token]/activate/route.ts`, `tests/unit/kora-link-activation.test.ts`)
- File modificati: 3 (`app/link/[token]/page.tsx`, `lib/kora-link/config.ts`, `tests/unit/kora-link-config.test.ts`) + `docs/KORA_LINK_CHANGELOG.md`
- Dipendenze aggiunte: 0
- SQL applicato: 0 · Migration create: 0 · 034/035/036 modificati: no
- TypeScript: 0 errori
- ESLint: 0 errori, 2 warning (pre-esistenti da KL-19, non introdotti in questo step)
- Vitest: 8521/8521 passed (201 file, +62 rispetto a KL-21)
- Build: OK — `/link/[token]/activate` presente come nuova route dynamic
- E2E: 6/6 passed

### Gate status post-KL-22

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN — 034 + 035 + 036 pronti per review formale |
| Gate 3 (DPO/legal) | 🔴 OPEN — consent copy e version whitelist ancora provvisori |
| KL-21 | ✅ COMPLETATO |
| KL-22 (Activation runtime) | ✅ COMPLETATO — dietro feature flag, default off; abilitazione reale richiede Gate 2+3 chiusi + 036 applicato |
| KL-23+ | Admin revocation/replacement flow · staging deploy — bloccati da Gate 2+3 |

---

## KL-21 — KORA Link Lab Usability Polish for NFC Physical Testing

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessun SQL applicato, nessuna modifica a 034/035/036, nessuna nuova dipendenza.

### Contenuto

Ampliato `lib/kora-link/demo-lab.ts` (KL-20) con contenuto strutturato e testabile per la pagina Lab:
`persisted: false` esplicito sul risultato di generazione, lista safety boundaries, checklist NFC, e logica "comportamento atteso" differenziata per stato dei feature flag.
Aggiornato `app/admin/kora-link-lab/page.tsx` — aggiunte le sezioni "Checklist scrittura NFC" e "Comportamento atteso", link cliccabile "Apri il link generato →", riga "Lab readiness" nel pannello stato runtime, nota esplicita "Demo only — not persisted".
Aggiornato `tests/unit/kora-link-demo-lab.test.ts` — 55 test (+24 rispetto a KL-20).

### Funzioni aggiunte (`lib/kora-link/demo-lab.ts`)

| Export | Tipo | Scopo |
|--------|------|-------|
| `getKoraLinkDemoLabSafetyBoundaries()` | fn | Ritorna 6 affermazioni di sicurezza fisse: no DB write, no Supabase call, no worker assignment, no activation, no token persistence, no KORA Index effect |
| `getKoraLinkDemoLabNfcChecklist()` | fn | Ritorna la checklist operativa ordinata per scrivere l'URL su un chip NFC e verificarne la lettura |
| `getKoraLinkDemoLabExpectedBehavior(status)` | fn | Ritorna la spiegazione del comportamento della route pubblica in base a `KORA_LINK_ENABLED` e `KORA_LINK_DB_LOOKUP_ENABLED` — differenzia esplicitamente i 3 stati: flag off (hidden/404 safe) · flag on + lookup off (skeleton safe) · flag on + lookup on (RPC + fallback unavailable safe) |

### Modifica al tipo esistente

`KoraLinkDemoLabLinkResult` — variante `ok: true` ora include `persisted: false` come marcatore letterale (non un controllo live: la funzione non scrive mai da nessuna parte, quindi il valore è sempre `false` per costruzione).

### Sezioni pagina `/admin/kora-link-lab` (KL-21)

| Sezione | Contenuto |
|---------|-----------|
| Stato runtime | + riga "Lab readiness" (pronto/non pronto, derivata da base URL configurato) |
| URL demo generato | + nota "Demo only — not persisted" + pulsante "Apri il link generato →" (`<a target="_blank">`, nessun client component) |
| Checklist scrittura NFC | Nuova — 6 step operativi da `getKoraLinkDemoLabNfcChecklist()` |
| Comportamento atteso | Nuova — condizioni/esiti da `getKoraLinkDemoLabExpectedBehavior(status)` |
| Limiti di sicurezza (Safety boundaries) | Rinominata da "Stato sicurezza"; contenuto ora da `getKoraLinkDemoLabSafetyBoundaries()` (6 voci) |

### Sicurezza / invarianti (invariate da KL-20, riconfermate)

- Nessun token salvato — generato in memoria ad ogni request, scartato al reload
- Nessun DB, nessuna chiamata Supabase, nessun service role
- Nessuna activation, nessun worker assignment, nessun Impact Unit, nessuno scoring, nessun partner scan
- Nessun secret (`KORA_LINK_TOKEN_SECRET`) letto, calcolato o stampato nella UI
- Pagina protetta esclusivamente da `requireKoraAdmin()` — nessun nuovo guard/auth introdotto
- Nessuna modifica a `034_kora_link_schema.sql` / `035_kora_link_rls.sql` / `036_kora_link_rpc_functions.sql`
- Nessuna migration creata, nessun SQL applicato, nessuna modifica a file `.env`
- Nessuna nuova dipendenza, nessuna libreria QR

### Controlli statici

- `grep Supabase` in `demo-lab.ts` + `page.tsx`: solo in commenti/copy che ne dichiarano l'assenza ("No Supabase", "Nessuna chiamata a Supabase") — nessun import/uso reale ✅
- `grep service_role`: 0 ✅
- `grep KORA_LINK_TOKEN_SECRET` nella UI: 0 ✅
- `grep console.log`: 0 ✅
- 034/035/036 modificati: no ✅
- Migration nuove: 0 ✅
- `package.json` / `package-lock.json` modificati: no ✅
- File `.env` modificati: no ✅

### Metriche

- File modificati: 3 (`lib/kora-link/demo-lab.ts`, `app/admin/kora-link-lab/page.tsx`, `tests/unit/kora-link-demo-lab.test.ts`) + `docs/KORA_LINK_CHANGELOG.md`
- File creati: 0
- Dipendenze aggiunte: 0
- SQL applicato: 0 · Migration create: 0 · 034/035/036 modificati: no
- TypeScript: 0 errori
- ESLint: 0 errori, 0 warning
- Vitest: 8459/8459 passed (200 file, +24 rispetto a KL-20)
- Build: OK — `/admin/kora-link-lab` presente come route dynamic
- E2E: 6/6 passed

### Gate status post-KL-21

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN — 034 + 035 + 036 pronti per review formale |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| KL-20 | ✅ COMPLETATO |
| KL-21 (Lab usability polish) | ✅ COMPLETATO — strumento interno admin, nessun impatto su Gate 2/3 |
| KL-22+ | Worker activation flow · staging deploy — bloccati da Gate 2+3 |

---

## KL-20 — KORA Link Demo Lab (NFC URL Generation)

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessun SQL applicato, nessuna modifica a 034/035/036, nessuna nuova dipendenza.

### Contenuto

Creato `lib/kora-link/demo-lab.ts` — helper server-only per generare token/URL demo effimeri da scrivere su chip NFC in laboratorio.
Creato `app/admin/kora-link-lab/page.tsx` — pagina interna "KORA Link Lab", protetta dal layout admin esistente (`app/admin/layout.tsx` → `requireKoraAdmin()`), nessun nuovo sistema di auth introdotto.
Creato `tests/unit/kora-link-demo-lab.test.ts` — 31 test unit.

### Funzioni esportate (`lib/kora-link/demo-lab.ts`)

| Export | Tipo | Scopo |
|--------|------|-------|
| `getKoraLinkDemoLabRuntimeStatus(env?)` | fn | Snapshot booleano dello stato runtime (`KORA_LINK_ENABLED`, base URL configurato sì/no, `KORA_LINK_DB_LOOKUP_ENABLED`, rate limit provider) — mai un secret |
| `getKoraLinkPublicLinkUrl(token, env?)` | fn | Costruisce `${baseUrl}/link/${token}` — throw se base URL mancante/non valida |
| `generateKoraLinkDemoLabLink(env?)` | fn | Genera `generateToken()` + URL demo — `{ ok: true, token, url }` o `{ ok: false, reason: 'base_url_not_configured' }`, mai un'eccezione |

### Comportamento pagina `/admin/kora-link-lab`

- Server component, `dynamic = 'force-dynamic'` — un nuovo token demo ad ogni caricamento (ricaricare la pagina = nuovo token, nessuna server action necessaria)
- Pannello stato runtime: 4 righe booleane/enum, nessun valore di secret stampato
- Pannello URL: `<textarea readOnly>` con `userSelect: all` per copia manuale (nessun client component, nessuna dipendenza clipboard)
- Pannello token grezzo: mostrato con avviso esplicito "solo demo, non persistito"
- Pannello sicurezza: 4 note esplicite (nessun record DB, nessuna associazione worker, nessuna activation, solo lab/demo)
- Stato base URL mancante → messaggio safe, nessun crash, nessuna eccezione propagata

### Sicurezza / invarianti

- Nessun token salvato — generato in memoria ad ogni request, scartato al reload
- Nessun DB, nessuna chiamata Supabase, nessun service role
- Nessuna activation, nessun worker assignment, nessun Impact Unit, nessuno scoring, nessun partner scan
- Nessun calcolo di digest (`computeDigest` non chiamato — il demo lab non usa il path DB/RPC)
- Nessun secret (`KORA_LINK_TOKEN_SECRET`) letto, calcolato o stampato nella UI
- Pagina protetta esclusivamente dal layer admin esistente (`requireKoraAdmin`) — nessun nuovo guard/auth introdotto
- Nessuna modifica a `034_kora_link_schema.sql` / `035_kora_link_rls.sql` / `036_kora_link_rpc_functions.sql`
- Nessuna migration creata, nessun SQL applicato, nessuna modifica a file `.env`
- Nessuna nuova dipendenza (nessuna libreria QR, nessun pacchetto npm aggiunto)

### Controlli statici

- `grep Supabase` nei nuovi file: solo in commenti che ne dichiarano l'assenza (`// No Supabase`) — nessun import/uso reale ✅
- `grep service_role`: 0 ✅
- `grep KORA_LINK_TOKEN_SECRET` nella UI (`page.tsx`): 0 ✅
- `grep console.log`: 0 ✅
- 034/035/036 modificati: no ✅
- Migration nuove: 0 ✅
- `package.json` / `package-lock.json` modificati: no ✅
- File `.env` modificati: no ✅

### Metriche

- File creati: 3 (`lib/kora-link/demo-lab.ts`, `app/admin/kora-link-lab/page.tsx`, `tests/unit/kora-link-demo-lab.test.ts`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Dipendenze aggiunte: 0
- SQL applicato: 0 · Migration create: 0 · 034/035/036 modificati: no
- TypeScript: 0 errori
- ESLint: 0 errori, 0 warning
- Vitest: 8435/8435 passed (200 file, +31 rispetto a KL-19)
- Build: OK — `/admin/kora-link-lab` presente come route dynamic
- E2E: 6/6 passed

### Gate status post-KL-20

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN — 034 + 035 + 036 pronti per review formale |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| KL-19 | ✅ COMPLETATO |
| KL-20 (Demo Lab NFC) | ✅ COMPLETATO — strumento interno admin, nessun impatto su Gate 2/3 |
| KL-21+ | Worker activation flow · staging deploy — bloccati da Gate 2+3 |

---

## KL-19 — KORA Link Public DB Lookup Runtime

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessun SQL applicato, nessuna modifica a 034/035/036.

### Contenuto

Creato `lib/kora-link/public-lookup.ts` — helper server-only che esegue il DB lookup della route pubblica `/link/[token]` tramite la RPC `fn_public_lookup_link` (draft in 036).
Modificato `lib/kora-link/config.ts` — aggiunto `KORA_LINK_DB_LOOKUP_ENABLED` a `KoraLinkEnv` + `isKoraLinkDbLookupEnabled(env)`.
Modificato `lib/kora-link/public-route.ts` — aggiunto step 5 (DB lookup) alla sequenza di valutazione stato route, condizionato al feature flag.
Modificato `app/link/[token]/page.tsx` — aggiunto stato `ready` (`KoraLinkReadyPage`) accanto a `skeleton`.
Creato `tests/unit/kora-link-public-lookup.test.ts`.
Aggiornato `tests/unit/kora-link-public-route.test.ts` per coprire il nuovo step.

### Comportamento

```
KORA_LINK_DB_LOOKUP_ENABLED (default: assente/false)
  → false: stato 'skeleton' invariato — nessun DB lookup eseguito (comportamento KL-10)
  → true:  lookupKoraLinkPublicState() calcola computeDigest(token, secret)
             → chiama fn_public_lookup_link(p_token_digest) server-side (client Supabase server, no service role)
             → status='ready' → route state 'ready'
             → qualsiasi altro status, errore RPC, o eccezione → 'unavailable' (fallback safe)
```

### Sicurezza / invarianti

- Public DB lookup runtime aggiunto dietro `KORA_LINK_DB_LOOKUP_ENABLED` — default lookup **off**
- RPC `fn_public_lookup_link` chiamata solo server-side (`lib/kora-link/public-lookup.ts`, mai da client)
- Token raw **non** inviato al DB — solo `computeDigest(token, secret)` (HMAC-SHA256, 64-char hex) attraversa la RPC
- Digest completo **non** esposto al client — resta interno al server component
- Fallback safe: qualsiasi errore RPC, client, o digest → `'unavailable'` (mai eccezione propagata, mai dettaglio esposto)
- Nessuna activation implementata
- Nessun worker assignment implementato
- Nessuna modifica a `034_kora_link_schema.sql` / `035_kora_link_rls.sql` / `036_kora_link_rpc_functions.sql`
- Nessuna migration creata
- Nessun SQL applicato ad alcun database
- `supabase/.temp/` non incluso nel commit (artefatto locale non tracciato)

### Controlli statici

- `grep service_role` in `app/link` + `lib/kora-link/public*`: 0 ✅
- `grep console.log` in `app/link` + `lib/kora-link/public*`: 0 ✅
- `grep fn_public_lookup_link`: presente solo in `public-lookup.ts`, `config.ts` (commento), test dedicato, documentazione 036 ✅
- `grep KORA_LINK_DB_LOOKUP_ENABLED`: presente in `config.ts`, `public-lookup.ts`, `public-route.ts` (commento), test ✅
- 034/035/036 modificati: no ✅
- Migration nuove: 0 ✅

### Metriche

- File creati: 2 (`lib/kora-link/public-lookup.ts`, `tests/unit/kora-link-public-lookup.test.ts`)
- File modificati: 4 (`app/link/[token]/page.tsx`, `lib/kora-link/config.ts`, `lib/kora-link/public-route.ts`, `tests/unit/kora-link-public-route.test.ts`) + `docs/KORA_LINK_CHANGELOG.md`
- SQL applicato: 0 · Migration create: 0 · 034/035/036 modificati: no
- TypeScript: 0 errori
- ESLint: 0 errori, 3 warning (variabili non usate in file di test, pre-esistenti al pattern)
- Vitest: 8404/8404 passed (199 file)
- Build: OK — `/link/[token]` presente come route dynamic
- E2E: 6/6 passed

### Gate status post-KL-19

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN — 034 + 035 + 036 pronti per review formale |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| KL-18 | ✅ COMPLETATO |
| KL-19 (DB lookup runtime) | ✅ COMPLETATO — dietro feature flag, default off; abilitazione reale richiede Gate 2+3 chiusi + 036 applicato |
| KL-20+ | Worker activation flow · staging deploy — bloccati da Gate 2+3 |

---

## KL-18 — Draft KORA Link RPC Functions 036

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** SQL proposed + Documentazione — nessuna migration applicata, nessun codice runtime modificato.

### Contenuto

Creato `supabase/proposed/036_kora_link_rpc_functions.sql` — draft delle funzioni SECURITY DEFINER per KORA Link v1. Stato: `PROPOSED_RPC_FUNCTIONS_DRAFT_INTERNAL_ENGINEERING`. Non applicato ad alcun database. Dipende da 034 + 035.

**Funzioni definite:**

| Funzione | Tipo | Caller | Ruolo |
|----------|------|--------|-------|
| `fn_is_valid_token_digest(text)` | helper IMMUTABLE INVOKER | interno | — |
| `fn_public_lookup_link(text)` | SECURITY DEFINER | route /link/[token] | anon/authenticated |
| `fn_activate_link_for_worker(text,uuid,text)` | SECURITY DEFINER | activation API route | authenticated |
| `fn_revoke_link(uuid,text)` | SECURITY DEFINER | admin API route | authenticated (KORA_ADMIN) |
| `fn_replace_link(uuid,uuid,text)` | SECURITY DEFINER | admin API route | authenticated (KORA_ADMIN) |
| `fn_company_link_status_aggregate(uuid)` | SECURITY DEFINER | company dashboard | authenticated (COMPANY_ADMIN/KORA_ADMIN) |

**Scelte di design chiave:**

- `fn_public_lookup_link`: risposta uniforme per "not found" e "unusable" (anti-enumeration); chip active → `ready` (quick access flow); ogni exception → `unavailable/service_unavailable`; no link_id, no worker_id, no tenant_id nel return
- `fn_activate_link_for_worker`: `FOR UPDATE NOWAIT` per lock anti-race; `ON CONFLICT DO UPDATE` su consent record; `uq_assignment_link_active` come seconda linea difesa; atomic: consent + assignment + link status + event in unica transazione
- `fn_revoke_link` / `fn_replace_link`: KORA_ADMIN role check interno; append-only su revocations/link_replacements/link_events; solo UPDATE su campi status
- `fn_replace_link`: usa `link_replacements` come unica fonte catena sostituzione (A-08/D-08); nessun `replaced_by_link_id` su links
- `fn_company_link_status_aggregate`: tenant validation vs JWT; TTL-aware reclassification dei chip scaduti; restituisce solo (status, count)
- `REVOKE ALL FROM PUBLIC` + GRANT selettivo per ogni funzione
- `search_path` esplicito su tutte le funzioni SECURITY DEFINER

**4 TODO aperti (CTO/DPO):**

- `TODO-RPC-01`: GRANT a `anon` per public lookup o service_role-only?
- `TODO-RPC-02`: cross-schema validation worker_id → personal.worker_identity
- `TODO-RPC-03`: DPO approval testo notice `kora-link-privacy-v1.0`
- `TODO-RPC-04`: privacy threshold su aggregate count?

**Nuovo documento:** `docs/archive/kora-link/KORA_LINK_036_RPC_FUNCTIONS_NOTES.md`

### Controlli statici

- `grep token_value 036`: 0 ✅
- `grep raw_token/clear_token/token_plaintext 036`: 0 ✅
- `grep partner_scans 036`: 0 ✅
- `grep public_lookup_attempts 036`: 0 ✅
- `grep SECURITY DEFINER 036` (non-comment): 5 funzioni previste ✅
- `grep search_path 036`: presente in 5 funzioni SECURITY DEFINER ✅
- `grep "USING (true)"`: 0 ✅
- `grep "WITH CHECK (true)"`: 0 ✅
- `grep DROP TABLE`: 0 ✅
- `grep CREATE TABLE`: 0 ✅
- `grep CREATE POLICY`: 0 ✅
- `grep ALTER TABLE` (non-comment): 0 ✅
- 034 modificato: no ✅
- 035 modificato: no ✅

### Metriche

- File creati: 2 (`supabase/proposed/036_kora_link_rpc_functions.sql`, `docs/archive/kora-link/KORA_LINK_036_RPC_FUNCTIONS_NOTES.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- SQL applicato: 0 · Migration create: 0 · Codice runtime modificato: 0
- 034 modificato: no · 035 modificato: no

### Gate status post-KL-18

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN — 034 + 035 + 036 pronti per review formale |
| Gate 3 (DPO/legal) | 🔴 OPEN — consent model e notice text richiedono approvazione |
| Gate 4 (RLS 035) | ✅ Draft completato (KL-17) |
| Gate 5 (RPC 036) | ✅ Draft completato (KL-18) |
| KL-18 | ✅ COMPLETATO |
| KL-19 (route runtime) | ✅ COMPLETATO (vedi sezione KL-19 sopra) — abilitazione reale attende Gate 2+3 + staging deploy |

---

## KL-17 — Draft KORA Link RLS 035

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** SQL proposed + Documentazione — nessuna migration applicata, nessun codice runtime modificato.

### Contenuto

Creato `supabase/proposed/035_kora_link_rls.sql` — primo draft RLS per le 9 tabelle KORA Link v1. Stato: `PROPOSED_RLS_DRAFT_INTERNAL_ENGINEERING`. Non applicato ad alcun database.

**Struttura di 035:**

- **Header:** status, dipendenza da 034, istruzione DO NOT APPLY, gate blocking conditions
- **RAISE NOTICE precondition:** operatore avvisato delle condizioni di apply
- **GRANT USAGE** su `kora_link` a `authenticated` e `anon`
- **`kora_link.is_kora_admin()`** — thin wrapper su `kora.kora_role() = 'KORA_ADMIN'` (migration 003); non ridefinisce i helper esistenti
- **9 sezioni RLS** — una per tabella, con ENABLE + FORCE ROW LEVEL SECURITY, GRANT/REVOKE, policy
- **22 policy totali** tutte deny-by-default salvo KORA_ADMIN
- **Tabelle append-only** (`link_events`, `revocations`, `link_replacements`, `link_consents`, `audit_log`): `REVOKE UPDATE, DELETE FROM PUBLIC`; nessuna policy UPDATE/DELETE
- **TODO spec** per 5 SECURITY DEFINER functions (commentate, non operative): `fn_kora_link_public_lookup`, `fn_kora_link_activate`, `fn_kora_link_revoke`, `fn_kora_link_replace`, `fn_kora_link_company_batch_stats`
- **6 TODO-RLS + 1 TODO-DPO** aperti per CTO/DPO review
- **Post-apply verification queries** (7 query manuali)

**Policy per tabella:**

| Tabella | Policies |
|---------|----------|
| `link_batches` | 3 (select/insert/update admin) |
| `links` | 3 (select/insert/update admin) |
| `link_assignments` | 3 (select/insert/update admin) |
| `link_consents` | 2 (select/insert admin) |
| `link_events` | 2 (select/insert admin) |
| `revocations` | 2 (select/insert admin) |
| `link_replacements` | 2 (select/insert admin) |
| `audit_log` | 2 (select/insert admin) |
| `link_delivery_records` | 3 (select/insert/update admin) |
| **Totale** | **22** |

**Scelte di design chiave:**

- `FORCE ROW LEVEL SECURITY` su tutte le tabelle (difesa contro bypass owner accidentale)
- `kora_link.is_kora_admin()` delega a `kora.kora_role()` — nessuna duplicazione JWT logic
- Nessuna policy company/worker diretta in v1 (visibilità aggregata futura via view)
- `anon`: solo USAGE schema, nessun GRANT tabelle — accesso futuro via SECURITY DEFINER
- Accesso worker self: policy commentata in link_assignments (richiede cross-schema join approvazione CTO)
- Nessuna funzione SECURITY DEFINER operativa: tutte in spec commentata per review

**Nuovo documento:** `docs/archive/kora-link/KORA_LINK_035_RLS_DRAFT_NOTES.md`

- Sezione 1: Scopo e principi di progettazione
- Sezione 2: Scelte di design (helper, FORCE RLS, GRANT pattern, append-only, company, worker)
- Sezione 3: Policy count e struttura tabella
- Sezione 4: SECURITY DEFINER status per funzione
- Sezione 5: Dipendenze critiche (034, migration 003, schema personal)
- Sezione 6: 6 TODO-RLS + 1 TODO-DPO per CTO review
- Sezione 7: Gate status post-KL-17

### Controlli statici

- `grep public_lookup_attempts 035`: 0 occorrenze (rimossa in A-06)
- `grep partner_scans 035`: 0 occorrenze (deferred a 036)
- `grep token_value 035`: 0 occorrenze
- `grep "USING (true)"`: 0 occorrenze
- `grep "WITH CHECK (true)"`: 0 occorrenze
- `grep SECURITY DEFINER 035`: solo in TODO commentati
- ENABLE RLS: 9 tabelle ✅
- CREATE POLICY: 22 policy ✅
- 034 non modificato ✅

### Metriche

- File creati: 2 (`supabase/proposed/035_kora_link_rls.sql`, `docs/archive/kora-link/KORA_LINK_035_RLS_DRAFT_NOTES.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- SQL applicato: 0 · Migration create: 0 · Codice runtime modificato: 0
- 034 modificato: no

### Gate status post-KL-17

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN — 034 + 035 pronti per review formale CTO |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| Gate 4 (RLS 035) | ✅ Draft completato (KL-17) — applicabile dopo Gate 2+3 |
| KL-17 | ✅ COMPLETATO |
| KL-18 (SECDEF functions) | 🔴 BLOCKED — attende Gate 2+3 + function spec approval |

---

## KL-16 — 034 Engineering Amendments Applied

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** SQL proposed + Documentazione — nessuna migration applicata, nessun codice runtime modificato.

### Contenuto

Applicati gli amendments Engineering (A-01→A-12) a `supabase/proposed/034_kora_link_schema.sql` come decisioni interne provvisorie Engineering. Il file rimane in stato `PROPOSED_AMENDED_INTERNAL_ENGINEERING` — non applicato ad alcun database, non promosso a `migrations/`.

**Modifiche a `supabase/proposed/034_kora_link_schema.sql`:**

- **Header aggiornato:** status `PROPOSED_AMENDED_INTERNAL_ENGINEERING`, sezione KL-16 amendments, tabella v1 definitiva (9 tabelle), DPO notes aggiornate
- **A-01/D-01** — Aggiunto commento FK policy su ogni colonna `tenant_id`/`worker_id` con target canonico
- **A-02/D-02** — Risolto per eliminazione: costrutti PG15-only rimossi con partner_scans (A-12)
- **A-03/A-12/D-03** — `kora_link.partner_scans` rimossa da 034; nota deferral a migration 036
- **A-04/D-04** — Commento TTL su `pre_activation_expires_at`: enforcement app-layer documentato
- **A-05/D-05** — Commento retention DPO su `kora_link.audit_log` aggiornato
- **A-06/D-06** — `kora_link.public_lookup_attempts` rimossa da 034; nota rationale
- **A-07/D-07** — Commento stable secret policy su `token_digest`; no colonna `key_version`
- **A-08/D-08** — Rimossi da `kora_link.links`: colonna `replaced_by_link_id`, `ALTER TABLE ... DEFERRABLE`, COMMENT relativo
- **A-09** — Rimosso `CREATE INDEX idx_links_token_digest` (ridondante con UNIQUE constraint)
- **A-10** — `kora_link.link_delivery_records` mantenuto con commento DPO su `delivered_to_label`
- **A-11** — Commento append-only semantics aggiornato in `kora_link.link_consents`
- **RLS TODO section** — Aggiornato per riflettere tabella v1 (9 tabelle): rimossi policy PARTNER/partner_scans e public_lookup_attempts; nota 036 per partner_scans
- **OPEN TODOs** — Segnati come RESOLVED: TODO-CTO-02, 03, 08 (+ A-09 ridondant index)
- **POST-APPLY VERIFICATION** — Aggiornata lista expected tables (9 vs 11); aggiunte query per verificare assenza `replaced_by_link_id` e `idx_links_token_digest`; aggiornata query DEFERRABLE (expected: 0 rows)

**Nuovo documento:** `docs/archive/kora-link/KORA_LINK_034_ENGINEERING_DECISION_RECORD.md`

- Sezione 1: D-01→D-08 con rationale, azione applicata, residual risk, flag "CTO deve confermare"
- Sezione 2: Tabella A-01→A-12 con status KL-16 (tutti ✅ applicati)
- Sezione 3: Tabella v1 definitiva (9 tabelle con status)
- Sezione 4: TODO aperti post-KL-16 (5 CTO + 3 DPO)
- Sezione 5: Residui risks con livello e mitigazione
- Sezione 6: Gate status post-KL-16
- Sezione 7: Istruzioni d'uso per CTO, DPO, Engineering

### Metriche

- File creati: 1 (`docs/archive/kora-link/KORA_LINK_034_ENGINEERING_DECISION_RECORD.md`)
- File modificati: 2 (`supabase/proposed/034_kora_link_schema.sql`, `docs/KORA_LINK_CHANGELOG.md`)
- SQL applicato: 0 · Migration create: 0 · Codice runtime modificato: 0
- Tabelle rimosse da 034: 2 (`public_lookup_attempts`, `partner_scans`)
- Colonne rimosse da `kora_link.links`: 1 (`replaced_by_link_id`)
- Constraint rimossi: 1 (`fk_links_replaced_by DEFERRABLE`)
- Index ridondanti rimossi: 1 (`idx_links_token_digest`)
- Tabella v1 finale: 9 (era 11)

### Gate status post-KL-16

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (CTO schema review) | 🔴 OPEN — 034 amended pronto per review formale CTO |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| Gate 4 (RLS 035) | 🔴 BLOCKED — attende Gate 2 formale |
| KL-16 | ✅ COMPLETATO |
| KL-17 (RLS 035) | 🔴 BLOCKED — attende Gate 2 |

---

## KL-15 — CTO Review Handoff Pack

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Documentazione — nessun SQL modificato, nessuna migration, nessun codice runtime.

### Contenuto

Creato `docs/archive/kora-link/KORA_LINK_CTO_REVIEW_HANDOFF.md` — handoff pack sintetico per CTO/Postgres reviewer esterno o interno. 13 sezioni:

- **Sezione 1** — Executive summary per il reviewer (15 righe, cosa leggere, cosa non toccare)
- **Sezione 2** — Tre domande a cui rispondere: 034 stabilizzabile? Amendments approvati? 035 può partire?
- **Sezione 3** — Tabella file da leggere in ordine: 7 file, tempo stimato, output atteso (60–90 min totale)
- **Sezione 4** — Cosa è già implementato: 14 componenti runtime con stato e test
- **Sezione 5** — Cosa non è implementato: 14 elementi bloccati per gate
- **Sezione 6** — File che il reviewer non deve applicare (lista esplicita)
- **Sezione 7** — Decision checklist compilabile D-01→D-08 con raccomandazione Engineering + caselle APPROVE/CHANGE/DEFER
- **Sezione 8** — Amendment checklist compilabile A-01→A-12 con tipo, caselle e "Apply to 034?"
- **Sezione 9** — Minimo approvazioni per 035 draft (8 prerequisiti) e per promozione 034 (7 passi)
- **Sezione 10** — Output atteso dal reviewer: 7 elementi richiesti
- **Sezione 11** — Response template copiabile con firma (decisioni D/A, autorizzazioni, blocking notes, RLS notes)
- **Sezione 12** — Tabella 9 gate con status, owner, cosa sblocca
- **Sezione 13** — Istruzione finale: FARE e NON FARE lista esplicita

### Metriche

- File creati: 1 (`docs/archive/kora-link/KORA_LINK_CTO_REVIEW_HANDOFF.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- SQL modificato: 0 · Codice runtime modificato: 0 · Migrations create: 0

### Gate status post-KL-15

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (Schema 034) | 🔴 OPEN — handoff pack pronto per il reviewer (KL-15) |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| Gate 4 (RLS 035) | 🔴 BLOCKED — attende Gate 2 |
| Gate 5-9 | 🔴 BLOCKED |
| KL-15 Handoff Pack | ✅ COMPLETATO |
| KL-16 | Attende decisioni CTO → Engineering applica amendments a proposed/034 |

---

## KL-14 — 034 Amendment Plan

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Documentazione — nessun SQL modificato, nessuna migration, nessun codice runtime.

### Contenuto

Creato `docs/archive/kora-link/KORA_LINK_034_AMENDMENT_PLAN.md` — piano pre-redline per le modifiche a 034. 19 sezioni, 12 amendment (A-01→A-12):

- **A-01** — FK policy: mantenere UUID senza FK; commenti con target canonici; coerente con 033
- **A-02** — PG compat: evitare `UNIQUE NULLS NOT DISTINCT` se PG<15; partial index equivalente
- **A-03** — `partner_scans`/`scan_date`: rimuovere GENERATED ALWAYS AS o spostare in 036
- **A-04** — TTL: mantenere `pre_activation_expires_at`; enforcement app-layer; no pg_cron in 034
- **A-05** — `audit_log`: mantenere; aggiungere commento retention DPO-external
- **A-06** — Rimuovere `public_lookup_attempts` da v1 (nessun consumer; Upstash sufficiente)
- **A-07** — Secret: no `key_version` in v1; commento stable-secret policy
- **A-08** — Self-FK deferred: rimuovere `replaced_by_link_id` + constraint; catena via `link_replacements`
- **A-09** — Rimuovere `idx_links_token_digest` (ridondante con UNIQUE constraint)
- **A-10** — `link_delivery_records`: valutare deferral a 036
- **A-11** — `link_consents`: chiarire design append-only vs mutable (impatta RLS-035-E)
- **A-12** — Defer `partner_scans` a migration 036 con Track A (elimina TODO-CTO-02, 03, FK-034-7)

**Proposed v1 table set:** Core 8 (link_batches, links, link_assignments, link_consents, link_events, revocations, link_replacements, audit_log) · Review/defer 2 (link_delivery_records, partner_scans) · Remove 1 (public_lookup_attempts)

### Metriche

- File creati: 1 (`docs/archive/kora-link/KORA_LINK_034_AMENDMENT_PLAN.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- SQL 034 modificato: 0
- Codice runtime modificato: 0
- Migrations create: 0
- TypeScript: 0 errori · Vitest: invariato · Build: invariato

### Gate status post-KL-14

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (Schema 034) | 🔴 OPEN — amendment plan pronto (KL-14); CTO compila Sezione 18 |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| Gate 4 (RLS 035) | 🔴 BLOCKED — attende A-01, A-11, A-12, D-07 + 034 stabilizzata |
| KL-14 Amendment Plan | ✅ COMPLETATO |
| KL-15 | Raccomandato: applicare amendments approvati a proposed/034 + iniziare 035 draft |

---

## KL-13 — 034 CTO Decision Pack

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Documentazione — nessun codice runtime, nessuna migration, nessun SQL.

### Contenuto

Creato `docs/archive/kora-link/KORA_LINK_034_CTO_DECISION_PACK.md` — decision pack sintetico per CTO/Postgres reviewer con 13 sezioni:

- **Sezione 1** — Executive summary (15 righe max)
- **Sezione 2** — Decision table sintetica: 8 decisioni, raccomandazione, owner, blocco 035/promotion, rischio
- **Sezioni 3–10** — Una sezione per ogni decisione (D-01→D-08): stato attuale, opzioni con pro/contro, raccomandazione v1
  - D-01 FK targets: Opzione A no-FK raccomandata (coerente con 033; RLS + SECDEF sono il boundary corretto)
  - D-02 PG15 compatibility: verificare versione; partial index come fallback se PG<15; differire con partner_scans
  - D-03 generated scan_date: rimuovere partner_scans da 034 (→ migration 036) come soluzione principale
  - D-04 TTL enforcement: app-layer only per v1; pg_cron in fase separata post-Gate-3
  - D-05 audit_log retention: non blocca Gate 2; durata da DPO (Gate 3); meccanismo preferito pg_cron
  - D-06 public_lookup_attempts: rimuovere da 034 v1 (nessun consumer; Upstash sufficiente)
  - D-07 secret rotation: Opzione A (no rotation ordinaria in v1) + emergency C come fallback
  - D-08 deferred self-FK: Alternativa A (rimuovere self-FK; catena via link_replacements)
- **Sezione 11** — Change set consolidato raccomandato (3 modifiche alta priorità: rimuovere partner_scans, rimuovere public_lookup_attempts, rimuovere self-FK deferred)
- **Sezione 12** — Decision template compilabile per il CTO (tabella + firma)
- **Sezione 13** — Go/No-Go: 034_PROMOTION 🔴 · 035_DRAFT 🔴 · DB_LOOKUP 🔴 · ACTIVATION 🔴 · RUNTIME_PUBLIC_ROUTE 🟡 skeleton ok

### Metriche

- File creati: 1 (`docs/archive/kora-link/KORA_LINK_034_CTO_DECISION_PACK.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- SQL eseguito: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: invariato
- Build: invariato

### Gate status post-KL-13

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (Schema 034 CTO review) | 🔴 OPEN — decision pack pronto per il CTO |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| Gate 4 (RLS 035) | 🔴 OPEN — dipende da Gate 2 + D-01 + D-07 risolti |
| Gate 5-9 | 🔴 OPEN |
| KL-13 Decision Pack | ✅ COMPLETATO |
| KL-14 | Raccomandato: modifiche a 034 in proposed/ dopo decisioni CTO |

---

## KL-12 — 034 CTO Review Checklist

**Data:** 2026-07-01  
**Branch:** `feat/kora-link-v1-platform`  
**Tipo:** Documentazione — analisi sola lettura di `supabase/proposed/034_kora_link_schema.sql`. Nessun codice runtime, nessuna migration, nessun SQL eseguito.

### Contenuto

Creato `docs/archive/kora-link/KORA_LINK_034_CTO_REVIEW_CHECKLIST.md` — checklist completa per la CTO/Postgres review dello schema 034:

- **Sezione 1** — Executive summary e stato gate
- **Sezione 2** — Scope della review (in scope / Gate 3 / Gate 4)
- **Sezione 3** — Riepilogo file 034: 11 tabelle, 25 indici, dipendenze, invarianti già implementati
- **Sezione 4** — 8 domande bloccanti (TODO-CTO-01→08): FK targets, `UNIQUE NULLS NOT DISTINCT` Postgres 15+, colonna generata `scan_date` + timezone, TTL enforcement strategy, `audit_log` retention, `public_lookup_attempts` volume, secret rotation procedure, deferred self-FK compatibilità Supabase
- **Sezione 5** — 5 domande non bloccanti: indice ridondante su UNIQUE constraint, scope `link_delivery_records` v1 vs v1.1+, `public_lookup_attempts` vs Upstash, trigger `updated_at` su `link_consents`, `partner_scans` in 034 vs migration separata
- **Sezione 6** — Privacy review checklist (14 invarianti P-01→P-14) con status 034 e azioni richieste
- **Sezione 7** — Security review checklist (15 controlli S-01→S-15)
- **Sezione 8** — RLS 035 dependency map: policy per-tabella (A–N), SECURITY DEFINER functions spec, vista aggregata company spec, prerequisiti per scrivere 035
- **Sezione 9** — Istruzioni per il reviewer: query verifica dipendenze pre-apply, query verifica post-apply, focus aree DBA
- **Sezione 10** — Decision template compilabile: una casella per ogni TODO-CTO e firma CTO
- **Sezione 11** — Recommended outcome: percorso KL-12→KL-15, ipotesi durata Gate 2, blocco assoluto

### Metriche

- File creati: 1 (`docs/archive/kora-link/KORA_LINK_034_CTO_REVIEW_CHECKLIST.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- SQL eseguito: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: invariato (nessun codice runtime modificato)
- Build: invariato

### Gate status post-KL-12

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (Schema 034 CTO review) | 🔴 OPEN — checklist KL-12 disponibile per il reviewer |
| Gate 3 (DPO/legal) | 🔴 OPEN — può avanzare in parallelo |
| Gate 4 (RLS 035) | 🔴 OPEN — dipende da Gate 2 stabilizzato |
| Gate 5-9 | 🔴 OPEN |
| KL-12 Checklist CTO | ✅ COMPLETATO |
| KL-13 | Raccomandato: draft 035 RLS (dopo Gate 2 avanzato) |

---

## KL-11 — Runtime Checkpoint + Gate Report

**Data:** 2026-07-01
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Documentazione tecnica/operativa — nessun codice runtime, nessuna migration, nessuna UI

### Contenuto

Creato `docs/archive/kora-link/KORA_LINK_RUNTIME_CHECKPOINT.md` — checkpoint tecnico-funzionale post KL-10:
stato implementato (KL-01→KL-10), comportamento route pubblica, privacy posture, security posture,
testing status (8381/8381, 253 test KORA Link), cosa NON è implementato, blocker correnti,
raccomandazione prossimo step (Option A — DB/RLS path prioritaria).

Creato `docs/KORA_LINK_GATE_REPORT.md` — report operativo con 9 gate:
Gate 1 (Runtime base ✅), Gate 2 (schema 034 🔴 pending CTO), Gate 3 (Privacy/DPO 🔴),
Gate 4 (RLS 035 🔴 not started), Gate 5 (Staging 🔴), Gate 6 (Route enablement 🟡 skeleton ok),
Gate 7-9 (Activation / Partner / Production 🔴). Gate decision: RUNTIME_READY_FOR_REVIEW.

### Gate decision

```
RUNTIME_BASE     → ✅ READY_FOR_REVIEW
DB_LOOKUP        → 🔴 NOT_READY (Gate 2+4)
WORKER_ACTIVATION → 🔴 NOT_READY (Gate 2+3+4+6)
PRODUCTION       → 🔴 NOT_READY (tutti i gate)
```

### Metriche

- File creati: 2 (`docs/archive/kora-link/KORA_LINK_RUNTIME_CHECKPOINT.md`, `docs/KORA_LINK_GATE_REPORT.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: 8381/8381 (verificato corrente)
- Build: OK
- E2E: 6/6

### Gate status post-KL-11

| Gate | Status |
|------|--------|
| Gate 1 (Runtime base) | ✅ COMPLETE |
| Gate 2 (Schema 034 CTO review) | 🔴 OPEN — azione immediata raccomandata |
| Gate 3 (DPO/legal) | 🔴 OPEN |
| Gate 4 (RLS 035) | 🔴 OPEN — not started |
| Gate 5 (Staging env) | 🔴 OPEN |
| Gate 6 (Public route enablement) | 🟡 Skeleton completo, enablement bloccato |
| Gate 7-9 | 🔴 OPEN |
| KL-01 → KL-10 | ✅ COMPLETATI |
| KL-11 Checkpoint + Gate Report | ✅ COMPLETATO |
| KL-12 | Raccomandato: CTO review checklist 034 (Option A) |

---

## KL-10 — KORA Link Public Route Skeleton /link/[token]

**Data:** 2026-07-01
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + Next.js server component + test unit — nessuna migration, nessun DB, nessuna activation, nessuna UI completa

### Contenuto

Creato `lib/kora-link/public-route.ts` — helper server-only per la valutazione dello stato della route pubblica.
Creato `app/link/[token]/page.tsx` — server component (`runtime=nodejs`, `dynamic=force-dynamic`) come entry point NFC.
Creato `tests/unit/kora-link-public-route.test.ts` — 28 test unit, copertura completa, zero vi.mock, zero network.
Modificato `components/layout/AppShell.tsx` — aggiunto `/link/` a `PUBLIC_ROUTE_PREFIXES` (nessun chrome per la route pubblica NFC).

### Funzioni esportate

#### `lib/kora-link/public-route.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `KoraLinkPublicRouteState` | type | Unione discriminata: `hidden` · `token_invalid` · `unavailable` · `rate_limited` · `skeleton` |
| `EvaluateKoraLinkPublicRouteParams` | type | `{ rawToken, identifier?, env?, rateLimiterOverride? }` — tutto injectable |
| `evaluateKoraLinkPublicRouteState(params)` | fn | Valuta lo stato della route in sequenza: flag → format → readiness → rate limit → skeleton |

### Logica della route (sequenza)

```
evaluateKoraLinkPublicRouteState(params)
  1. isKoraLinkEnabled(env)           → hidden se off
  2. isValidTokenFormat(rawToken)     → token_invalid se malformato
  3. getKoraLinkReadiness(env)        → unavailable se secret/base-url mancanti
  4. createKoraLinkRateLimiter(env)   → unavailable se factory throws (production guard)
     rateLimiter.check(...)
       → unavailable se reason=missing_provider|not_implemented
       → rate_limited se allowed=false senza quelle reason
       → skeleton se allowed=true
```

### Comportamento per stato

| Stato | Causa | Response page.tsx |
|-------|-------|-------------------|
| `hidden` | Feature flag off | `notFound()` |
| `token_invalid` | Formato token non valido | `notFound()` |
| `unavailable` | Runtime non pronto o factory throw | `KoraLinkUnavailablePage` |
| `rate_limited` | Limite superato (provider configurato) | `KoraLinkRateLimitedPage` |
| `skeleton` | Tutti i check superati | `KoraLinkSkeletonPage` |

### Sicurezza

- Token raw mai loggato, mai in nessun stato restituito
- `notFound()` usato per hidden/token_invalid: non rivela se il token esiste o è valido
- Identifier default: `anonymous:public_link` (via `createRateLimitIdentifier`) — nessun IP raw
- Errori del rate limiter/factory catturati e mappati a `unavailable` (no dettagli esposti)
- `runtime='nodejs'` per `node:crypto` — non compatibile con Edge runtime
- Nessun import Supabase, nessun DB lookup, nessuna activation

### Modifiche esistenti

| File | Modifica |
|------|----------|
| `components/layout/AppShell.tsx` | Aggiunto `/link/` a `PUBLIC_ROUTE_PREFIXES` — la route NFC non riceve sidebar/header/banner |

### Copertura test (28 test, 6 suite)

| Suite | Test |
|-------|------|
| 1. Feature flag off | 4 |
| 2. Token format validation | 7 |
| 3. Runtime readiness | 3 |
| 4. Rate limiting | 7 |
| 5. Skeleton state | 2 |
| 6. Privacy safety | 5 |

Strategia: env injection + `rateLimiterOverride` injection — nessun `vi.mock`, nessuna rete.

### Metriche

- File creati: 3 (`lib/kora-link/public-route.ts`, `app/link/[token]/page.tsx`, `tests/unit/kora-link-public-route.test.ts`)
- File modificati: 2 (`components/layout/AppShell.tsx`, `docs/KORA_LINK_CHANGELOG.md`)
- Dipendenze aggiunte: 0
- Supabase usato: no
- DB lookup: no
- Activation: no
- Migration: 0
- TypeScript: 0 errori
- ESLint: 0 errori, 0 warning
- Vitest: 8381/8381 passed (+28 rispetto a KL-09)
- Build: OK — `/link/[token]` presente come route dynamic
- E2E: 6/6 passed

### Gate status post-KL-10

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 → KL-09 | ✅ COMPLETATI |
| KL-10 Public Route Skeleton | ✅ COMPLETATO |
| KL-11+ | DB lookup (Gate 2+3 required) · Worker activation flow · NFC full flow |

---

## KL-09 — KORA Link Upstash Rate Limit Adapter

**Data:** 2026-07-01
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessuna UI, nessuna route, nessuna scrittura DB

### Contenuto

Implementato l'adapter Upstash Redis reale in `lib/kora-link/rate-limit.ts`.
Aggiornato `lib/kora-link/config.ts` — aggiunto `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` a `KoraLinkEnv`.
Creato `tests/unit/kora-link-rate-limit-upstash.test.ts` — 35 test unit sull'adapter Upstash (mock SDK, nessuna chiamata network).
Aggiornato `tests/unit/kora-link-rate-limit.test.ts` — 57 → 59 test (aggiornata gestione upstash+env nel factory e assertProductionSafe).
Installato `@upstash/redis` e `@upstash/ratelimit` (unica dipendenza npm consentita in KL-09).

### Funzioni aggiunte / modificate

#### `lib/kora-link/rate-limit.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `KoraLinkUpstashEnvStatus` | type | `{ hasUrl, hasToken, ready }` — status env Upstash |
| `getKoraLinkUpstashEnvStatus(env?)` | fn | Legge URL e token da env — restituisce status senza lanciare, senza esporre valori |
| `assertKoraLinkUpstashReady(env?)` | fn | Lancia con lista env mancanti se `ready = false` — messaggi privacy-safe |
| `createUpstashKoraLinkRateLimiter(env?)` | fn | Costruisce adapter reale: Redis + Ratelimit lazy-initialized per route; `check()` chiama Upstash con sliding window |
| `createKoraLinkRateLimiter` | fn (updated) | Branch upstash: verifica env → real adapter o unavailable; lancia in production se env mancanti |
| `assertKoraLinkRateLimitProductionSafe` | fn (updated) | Branch upstash: aggiunge `assertKoraLinkUpstashReady` oltre al check provider |

#### Aggiunta a `lib/kora-link/config.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `UPSTASH_REDIS_REST_URL?` | KoraLinkEnv key | URL REST Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN?` | KoraLinkEnv key | Token autenticazione Upstash |

### Comportamento Upstash adapter

```
createUpstashKoraLinkRateLimiter(env)
  ├─ Lancia se URL o token mancanti (privacy-safe, nessun valore esposto)
  ├─ Crea Redis({ url, token }) una sola volta
  ├─ getLimiter(route): Ratelimit creato lazy su prima check(), riusato per route identica
  │    └─ Ratelimit.slidingWindow(limit, '60 s'), prefix 'kl:rl:<route>', analytics: false
  └─ check(ctx) → { allowed: result.success, provider: 'upstash', limit, remaining: result.remaining, resetAt: result.reset }
```

### Provider status KL-09

| Provider | Status | Comportamento factory |
|----------|--------|-----------------------|
| `null` (assente) | — | dev/test: unavailable/denied · production: throws |
| `'disabled'` | Dev/test only | dev/test: always-allow · production: throws |
| `'upstash'` + env mancanti | Dev/test: unavailable · production: throws |
| `'upstash'` + env configurati | ✅ Adapter reale Upstash |

### Copertura test

| File | Test | Suite |
|------|------|-------|
| `kora-link-rate-limit-upstash.test.ts` (nuovo) | 35 | 4 |
| `kora-link-rate-limit.test.ts` (aggiornato) | 59 (+2) | 7 |

| Suite (upstash) | Test |
|-----------------|------|
| getKoraLinkUpstashEnvStatus | 9 |
| assertKoraLinkUpstashReady | 8 |
| createUpstashKoraLinkRateLimiter — construction | 5 |
| createUpstashKoraLinkRateLimiter — check() behavior | 13 |

### Decisioni tecniche

- **Circular import evitato**: Tutto il codice Upstash è in `rate-limit.ts`, non in un file separato `rate-limit-upstash.ts`. Un file separato avrebbe creato un ciclo (`rate-limit.ts ↔ rate-limit-upstash.ts`) che in CJS-compiled Next.js può causare `undefined` su valori catturati durante l'inizializzazione modulo.
- **Vitest mock class-based**: `vi.fn().mockImplementation(() => ({}))` non è un costruttore valido. Si usano classi reali (`class MockRedis { constructor() {} }`) con `vi.hoisted` per condivisione stato tra factory closure e test.
- **No network al momento della costruzione**: `new Redis({...})` e `new Ratelimit({...})` non fanno chiamate network — i test factory non richiedono mock per questi path.
- **Lazy Ratelimit**: Un'istanza `Ratelimit` per route, creata al primo `check()` e riusata — evita overhead istanziazione per ogni request.

### Metriche

- File creati: 1 (`tests/unit/kora-link-rate-limit-upstash.test.ts`)
- File modificati: 5 (`lib/kora-link/rate-limit.ts`, `lib/kora-link/config.ts`, `tests/unit/kora-link-rate-limit.test.ts`, `package.json`, `package-lock.json`)
- Dipendenze aggiunte: 2 (`@upstash/redis`, `@upstash/ratelimit`)
- Provider Upstash integrato: sì
- Network calls nei test: 0 (SDK completamente mockato)
- TypeScript: 0 errori
- ESLint: 0 errori, 2 warning (parametri `_config` in mock constructor — attesi, test-only)
- Vitest: 8353/8353 passed (+38 rispetto a KL-08)
- Build: OK
- E2E: 6/6 passed

### Gate status post-KL-09

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 → KL-08 | ✅ COMPLETATI |
| KL-09 Upstash Rate Limit Adapter | ✅ COMPLETATO |
| KL-10 Route pubblica `/link/[token]` | Prerequisiti: Gate 2+3 chiusi · `KORA_LINK_ENABLED=true` · `KORA_LINK_RATE_LIMIT_PROVIDER=upstash` + Upstash env |

---

## KL-08 — Rate Limit Adapter Skeleton

**Data:** 2026-07-01
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessuna UI, nessuna route, nessun provider Upstash

### Contenuto

Creato `lib/kora-link/rate-limit.ts` — modulo server-only per rate limiting KORA Link.
Creato `tests/unit/kora-link-rate-limit.test.ts` — 57 test unit, copertura completa.
Modificato `lib/kora-link/config.ts` — aggiunto `KORA_LINK_RATE_LIMIT_PROVIDER` a `KoraLinkEnv` + `getKoraLinkRateLimitProvider`.
Modificato `tests/unit/kora-link-config.test.ts` — aggiunti 7 test per `getKoraLinkRateLimitProvider` (totale: 66 test).

### Funzioni e costanti esportate

#### `lib/kora-link/rate-limit.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `KoraLinkRateLimitProvider` | type | `'disabled' \| 'upstash'` |
| `KoraLinkRateLimitContext` | type | Input per `check()`: route, identifier, now opzionale |
| `KoraLinkRateLimitDecision` | type | Output: allowed, provider, limit, remaining, resetAt, reason |
| `KoraLinkRateLimiter` | type | Interface: `{ check(ctx): Promise<Decision> }` |
| `KORA_LINK_RATE_LIMIT_WINDOW_MS` | const | `60_000` — re-exported da config |
| `KORA_LINK_PUBLIC_ROUTE_LIMIT` | const | `30` scan/finestra — route pubblica `/link/[token]` |
| `KORA_LINK_ACTIVATION_LIMIT` | const | `10` — attivazione chip |
| `KORA_LINK_PARTNER_SCAN_LIMIT` | const | `60` — scan partner Track A |
| `KORA_LINK_ADMIN_BATCH_LIMIT` | const | `10` — batch admin |
| `getKoraLinkRateLimitPolicy(route)` | fn | Restituisce `{ limit, windowMs }` per ogni route — lancia se route sconosciuta |
| `createDisabledKoraLinkRateLimiter()` | fn | Always-allow — dev/test only |
| `createUnavailableKoraLinkRateLimiter(provider)` | fn | Always-deny — provider assente o non integrato |
| `createKoraLinkRateLimiter(env?)` | fn | Factory: seleziona adapter da config — blocca in production se missing/disabled |
| `assertKoraLinkRateLimitProductionSafe(env?)` | fn | Guard startup: lancia se production con provider missing o disabled |
| `createRateLimitIdentifier(parts)` | fn | Crea identifier stabile per rate limit bucket — non accetta token raw |

#### Aggiunta a `lib/kora-link/config.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `getKoraLinkRateLimitProvider(env?)` | fn | Legge `KORA_LINK_RATE_LIMIT_PROVIDER` — null se assente, throw se valore non riconosciuto |

### Provider status KL-08

| Provider | Status | Comportamento factory |
|----------|--------|-----------------------|
| `null` (assente) | — | dev/test: unavailable/denied · production: throws |
| `'disabled'` | Dev/test only | dev/test: always-allow · production: throws |
| `'upstash'` | Pending KL-09+ | qualsiasi env: unavailable/not_implemented |

### Regole production enforcement

```
KORA_LINK_RATE_LIMIT_PROVIDER missing  → blocca in production (throw da factory + assertKoraLinkRateLimitProductionSafe)
KORA_LINK_RATE_LIMIT_PROVIDER=disabled → blocca in production (throw da factory + assertKoraLinkRateLimitProductionSafe)
KORA_LINK_RATE_LIMIT_PROVIDER=upstash  → accettato (Upstash non integrato → denied per ogni request — enforcement a livello route in KL-09+)
```

### Copertura test

| File | Test | Suite |
|------|------|-------|
| `kora-link-rate-limit.test.ts` | 57 | 7 |
| `kora-link-config.test.ts` (delta KL-08) | +7 | +1 (`getKoraLinkRateLimitProvider`) |

| Suite (rate-limit) | Test |
|--------------------|------|
| Constants | 5 |
| getKoraLinkRateLimitPolicy | 8 |
| createDisabledKoraLinkRateLimiter | 8 |
| createUnavailableKoraLinkRateLimiter | 7 |
| createKoraLinkRateLimiter | 9 |
| assertKoraLinkRateLimitProductionSafe | 7 |
| createRateLimitIdentifier | 13 |

### Metriche

- File creati: 2 (`lib/kora-link/rate-limit.ts`, `tests/unit/kora-link-rate-limit.test.ts`)
- File modificati: 3 (`lib/kora-link/config.ts`, `tests/unit/kora-link-config.test.ts`, `docs/KORA_LINK_CHANGELOG.md`)
- Dipendenze aggiunte: 0
- Provider Upstash integrato: no
- Produzione con provider missing/disabled bloccata: sì
- TypeScript: 0 errori
- ESLint: 0 errori, 0 warning
- Vitest: 8315/8315 passed (+63 rispetto a KL-07)
- Build: OK
- E2E: 6/6 passed

### Gate status post-KL-08

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 → KL-07 | ✅ COMPLETATI |
| KL-08 Rate Limit Adapter Skeleton | ✅ COMPLETATO |
| KL-09 Route pubblica `/link/[token]` | Prerequisiti: `KORA_LINK_ENABLED=true` · `KORA_LINK_RATE_LIMIT_PROVIDER=upstash` + Upstash Redis integrato · Gate 2+3 |

---

## KL-01 — KORA Link v1 Design Doc

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1`
**Tipo:** Design only — nessuna modifica runtime

### Contenuto

Creato `docs/archive/kora-link/KORA_LINK_V1_DESIGN.md` — design tecnico-funzionale completo di KORA Link v1.

Sezioni prodotte (21 sezioni, design-only):

| Sezione | Contenuto |
|---------|-----------|
| §1 Executive Summary | Descrizione KORA Link v1, bridge fisico-digitale, NFC anonimo |
| §2 Product Doctrine | 9 principi non negoziabili |
| §3 Actors | KORA_ADMIN, COMPANY_ADMIN/VIEWER, WORKER, PARTNER_OPERATOR/ADMIN, ADVISOR |
| §4 Object Model | 11 entità concettuali (batch, chip, token, assignment, activation, consent, event, partner scan, revocation, replacement, audit) |
| §5 Token Model | Random, non-sequenziale, revocabile, hashing, comportamento per stato |
| §6 NFC Chip Content | Solo URL+token; lista esaustiva dati proibiti |
| §7 Lifecycle | Fasi A-L: generated → delivered → activated → active → revoked |
| §8 Worker Activation Flow | Diagramma flow completo, tutti i casi edge |
| §9 Company Flow | Dati visibili (aggregati), dati mai visibili |
| §10 KORA Admin Flow | Batch, stato, revoca, break-glass, replacement |
| §11 Partner Flow | v1 (no partner), v1.1 (scan pilot), v2 (full L4) |
| §12 Two-Track Event Model | Track A (verified partner) vs Track B (collective/KORA Space); no double counting |
| §13 Privacy Boundary | Tabella completa: 11 dati × 6 ruoli |
| §14 Security/Threat Model | 14 rischi con mitigazione v1/futura |
| §15 Audit Model | 13 audit events obbligatori; invarianti audit |
| §16 Feature Flag | `KORA_LINK_ENABLED` — regole, default off |
| §17 V1 Scope | Cosa entra in v1 con gate reference |
| §18 Out of Scope | Lista esaustiva esclusi (incluso employer monitoring, ranking, `gov.kip_records`) |
| §19 Future Migrations | Piano concettuale 034 (schema) + 035 (RLS) — no SQL |
| §20 Open Questions | 15 domande aperte pre-KL-02 |
| §21 Implementation Gates | KL-01 → KL-09: gate sequenziali con prerequisiti |

### Metriche

- File creati: 2 (`docs/archive/kora-link/KORA_LINK_V1_DESIGN.md`, `docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: 8079/8079 green (branch base, pre-CC improvements)
- Build: OK

### Gate status

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN — blocca KL-02+ |
| Gate 3 (DPO/legal) | OPEN — blocca KL-04+ |
| KL-01 (Design) | ✅ COMPLETATO |
| KL-02 (Threat model + schema) | Non iniziato — in attesa review KL-01 |

### Open questions prioritarie (pre-KL-02)

- OQ-01: URL dominio finale chip NFC
- OQ-02: Token hashing sì/no
- OQ-03: TTL token
- OQ-12: Schema isolation (`kora_link.*` vs integrato)

---

## KL-02 — Decision Gate: Open Questions + Branch Strategy

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1`
**Tipo:** Decisionale — nessuna modifica runtime

### Contenuto

Creato `docs/archive/kora-link/KORA_LINK_KL02_DECISION_GATE.md` — documento decisionale pre-codice KORA Link.

| Sezione | Contenuto |
|---------|-----------|
| §1 Executive Summary | Stato post-KL-01; divergenza branch; cosa serve prima del codice |
| §2 Branch Topology | Merge base `eaecdad`; 1 ahead / 10 behind `platform/readiness`; perché questa divergenza blocca il codice |
| §3 OQ-01→OQ-04/OQ-12 | 5 domande critiche con analisi opzioni e raccomandazione netta |
| §4 Additional OQs | 16 domande addizionali con owner, blocco codice/produzione |
| §5 Recommended Decisions | Tabella decisioni raccomandate con rationale e residual risk |
| §6 Branch Strategy Options | Analisi A/B/C dettagliata con pro/contro |
| §7 Recommended Strategy | **Option B** — nuovo branch `feat/kora-link-v1-platform` da `platform/readiness` + cherry-pick KL-01 |
| §8 Pre-Migration Gates | 10 gate (MG-01→MG-10) con status |
| §9 Pre-Runtime Gates | 13 gate (RG-01→RG-13) con status |
| §10 Next KL Prompts | Sequenza KL-03→KL-08 |

### Decisioni raccomandate chiave

| OQ | Decisione |
|----|-----------|
| OQ-01 URL dominio | `https://app.kora.ai/link/<token>` — stessa app, nessuna infra aggiuntiva |
| OQ-02 Token hash | Solo hash BLAKE2b+salt — DB leak non espone token attivi |
| OQ-03 TTL | 180gg pre-attivazione, nessun TTL post-attivazione v1 |
| OQ-04 Pre-assignment | Batch↔tenant server-side; chip rimane anonimo |
| OQ-12 Schema | `kora_link.*` dedicato — isolamento e revocabilità completi |

### Branch strategy raccomandata

**Option B:** `feat/kora-link-v1-platform` da `platform/readiness` + cherry-pick `361829a` (KL-01).

Motivazione: KORA Link codice deve partire dalla base hardenizzata CC-07→CC-15; cherry-pick zero-risk (2 doc files); storia pulita; non blocca review CTO di `platform/readiness`.

### Metriche

- File creati: 1 (`docs/archive/kora-link/KORA_LINK_KL02_DECISION_GATE.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: 8079/8079 green
- Build: OK

### Gate status post-KL-02

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 Design | ✅ COMPLETATO |
| KL-02 Decision Gate | ✅ COMPLETATO |
| KL-03 Branch strategy execution | In attesa approvazione Founder/CTO su OQ + Option B |

---

## KL-04 — Token Threat Model

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Design only — nessuna modifica runtime

### Contenuto

Creato `docs/archive/kora-link/KORA_LINK_TOKEN_THREAT_MODEL.md` — threat model tecnico completo del token KORA Link.

| Sezione | Contenuto |
|---------|-----------|
| §1 Executive Summary | Token anonimo, HMAC-SHA256, rate limiting bloccante |
| §2 Token asset definition | Cosa è/non è il token; perché non è credenziale da sola |
| §3 Token generation | CSPRNG, 48 char base62, prefisso `kl1_`, ~285 bit entropia |
| §4 Token storage comparison | Opzioni A/B/C/D con pro/contro/rischio |
| §5 Storage decision | **HMAC-SHA256 + `KORA_LINK_TOKEN_SECRET`** — definitivo |
| §6 Token lifecycle | 10 stati con transizioni, visibilità per ruolo, audit |
| §7 TTL policy | 180gg pre-attivazione, no TTL post v1, replacement |
| §8 Public route behavior | Tabella completa per ogni condizione di stato |
| §9 Uniform error/timing | 404 uniforme, timing oracle, messaggi pubblici |
| §10 Logging policy | Cosa non loggare mai; cosa loggare; IP/DPO |
| §11 Rate limiting | Per-endpoint, Upstash Redis, bloccante per prod |
| §12 Replay/abuse | 13 rischi con mitigazione v1/futura e blocco codice/prod |
| §13 Lost/stolen/replacement | Processo end-to-end per worker, company, admin |
| §14 Partner scan constraints | Vincoli v1.1+: privacy, accreditamento, no double counting |
| §15 Migration 034 requirements | Tabelle, enum, indici, vincoli per `kora_link.*` |
| §16 RLS 035 requirements | Deny-by-default, policy per tabella, SECURITY DEFINER |
| §17 Environment/secrets | `KORA_LINK_TOKEN_SECRET` spec, lunghezza, rotazione |
| §18 Acceptance criteria — migration | 14 item checklist |
| §19 Acceptance criteria — runtime | 15 item checklist |
| §20 Final recommendation | Storage, TTL, route behavior, rate limiting; KL-05 sì |

### Decisioni chiave

| Tema | Decisione |
|------|-----------|
| Hash algorithm | **HMAC-SHA256** (non BLAKE2b — nativo Node, standard, difendibile) |
| Token format | `kl1_` + 48 char base62 → ~285 bit entropia |
| Storage | Solo `token_digest` nel DB — cleartext mai persistito |
| Secret | `KORA_LINK_TOKEN_SECRET` env var, 256 bit, staging/prod separati |
| TTL | 180gg pre-attivazione; no TTL post-attivazione v1 |
| 404 uniforme | Missing = revocato = scaduto = sospeso (no oracle) |
| Rate limiting | Upstash Redis — bloccante per produzione, opzionale staging |

### OQ risolte da KL-04

- OQ-02: HMAC-SHA256 confermato (supera BLAKE2b per praticità Node/Next)
- OQ-06: token length = 48 char base62 (+ prefisso `kl1_`)
- OQ-07: charset = base62 [A-Za-z0-9]
- Versioning: prefisso `kl1_` per migration futura algoritmo

### Metriche

- File creati: 1 (`docs/archive/kora-link/KORA_LINK_TOKEN_THREAT_MODEL.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: 8128/8128 green
- Build: OK
- E2E Playwright: 6/6 passed

### Gate status post-KL-04

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 Design | ✅ COMPLETATO |
| KL-02 Decision Gate | ✅ COMPLETATO |
| KL-03 Branch strategy | ✅ COMPLETATO |
| KL-04 Token Threat Model | ✅ COMPLETATO |
| KL-05 Migration 034 draft | In attesa approvazione CTO su token strategy + schema |

---

## KL-05 — Migration 034 Draft: KORA Link Schema

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** SQL draft in `supabase/proposed/` — NON applicato a nessun database

### Contenuto

Creato `supabase/proposed/034_kora_link_schema.sql` — draft schema KORA Link
per review CTO/Postgres/DPO. NON in `supabase/migrations/`.

### Stile repo rilevato da audit 031/032/033

| Aspetto | Scelta repo | Applicato in 034 |
|---------|------------|-----------------|
| Enum | `text + CHECK` (non `CREATE TYPE`) | ✅ Sì |
| PK | `uuid DEFAULT gen_random_uuid()` | ✅ Sì |
| Timestamps | `timestamptz NOT NULL DEFAULT now()` | ✅ Sì |
| updated_at | Trigger `set_updated_at()` (mig 001) | ✅ Sì |
| Index naming | `idx_<table>_<col>` | ✅ Sì |
| FK tenant_id | No FK (repo pattern da 033) | ✅ Sì |
| Header | Block comment con gate/prerequisiti | ✅ Sì |
| Transaction | `BEGIN;` / `COMMIT;` | ✅ Sì |
| PostgREST reload | `NOTIFY pgrst, 'reload schema';` | ✅ Sì |
| RLS | In file separato (035) | ✅ Sì (solo TODO commentati) |

### Tabelle nel draft

| # | Tabella | Scopo |
|---|---------|-------|
| 1 | `kora_link.link_batches` | Batch admin chip NFC |
| 2 | `kora_link.links` | Token record (digest-only, no cleartext) |
| 3 | `kora_link.link_assignments` | Associazione token↔worker post-consenso |
| 4 | `kora_link.link_consents` | Consenso worker all'informativa Link |
| 5 | `kora_link.link_events` | Log operativo eventi lifecycle |
| 6 | `kora_link.revocations` | Revoca/sospensione audit trail |
| 7 | `kora_link.link_replacements` | Catena replacement old→new token |
| 8 | `kora_link.partner_scans` | Placeholder Track A scan partner (v1.1+) |
| 9 | `kora_link.audit_log` | Audit append-only privacy-safe |
| 10 | `kora_link.public_lookup_attempts` | Supporto rate limiting public route |
| 11 | `kora_link.link_delivery_records` | Traccia consegna chip a company |

### Invarianti critici nel draft

- `token_value` (cleartext): **ZERO colonne** in tutto lo schema — confermato
- `UNIQUE(token_digest)` enforced via `CONSTRAINT uq_link_token_digest`
- `UNIQUE(link_id) WHERE status = 'active'` su `link_assignments` — un solo assignment attivo per token
- `partner_scans` non alimenta IU/PIB/Index — commento esplicito nel file
- Nessuna policy RLS — solo TODO commentati per 035
- 8 TODO CTO espliciti per review pre-apply

### Metriche

- File creati: 1 (`supabase/proposed/034_kora_link_schema.sql`, 1272 righe)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- File in `supabase/migrations/`: 0 nuovi
- Codice runtime modificato: 0
- TypeScript: 0 errori
- Vitest: 8128/8128 green
- Build: OK
- E2E Playwright: 6/6 passed

### Gate status post-KL-05

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN — review di 034 è il gate |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 Design | ✅ COMPLETATO |
| KL-02 Decision Gate | ✅ COMPLETATO |
| KL-03 Branch strategy | ✅ COMPLETATO |
| KL-04 Token Threat Model | ✅ COMPLETATO |
| KL-05 Migration 034 draft | ✅ COMPLETATO — in attesa review CTO |
| KL-06 RLS 035 draft | In attesa approvazione CTO su schema 034 |

---

---

## KL-06 — Token Core: generazione, validazione, digest, redazione

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessuna UI, nessuna route

### Contenuto

Creato `lib/kora-link/token.ts` — modulo server-only per il token core KORA Link.
Creato `tests/unit/kora-link-token.test.ts` — 65 test unit copertura completa.

### Funzioni esportate

| Funzione | Scopo |
|----------|-------|
| `generateToken()` | Genera token CSPRNG `kl1_<48 base62>` con rejection sampling (no modulo bias) |
| `validateTokenFormat(token)` | Valida formato — restituisce `{ valid: true }` o `{ valid: false, reason }`, mai eccezione |
| `isValidTokenFormat(token)` | Type guard booleano su `validateTokenFormat` |
| `computeDigest(tokenValue, secret)` | HMAC-SHA256(tokenValue, secret) → 64-char hex — unico valore da persistere in DB |
| `digestPrefix(digest)` | Restituisce i primi 8 char del digest — per audit log, non come lookup key |
| `getTokenSecret()` | Legge `KORA_LINK_TOKEN_SECRET` da `process.env`; lancia eccezione se assente o < 64 char |
| `redactToken(input)` | Sostituisce ogni `kl1_<48 base62>` con `kl1_[REDACTED]` — chiamare prima di qualsiasi logger |

### Costanti esportate

| Costante | Valore | Note |
|----------|--------|------|
| `KORA_LINK_TOKEN_PREFIX` | `'kl1_'` | Prefisso versione 1 |
| `KORA_LINK_TOKEN_PAYLOAD_LENGTH` | `48` | Char base62 dopo il prefisso |
| `KORA_LINK_TOKEN_MIN_LENGTH` | `52` | Lunghezza totale (4 + 48) |
| `KORA_LINK_TOKEN_MAX_LENGTH` | `52` | Uguale a MIN in v1 |
| `KORA_LINK_TOKEN_DIGEST_LENGTH` | `64` | HMAC-SHA256 hex output |
| `KORA_LINK_TOKEN_DIGEST_PREFIX_LENGTH` | `8` | Char prefix per audit log |
| `KORA_LINK_SECRET_MIN_LENGTH` | `64` | 256 bit in hex |

### Invarianti rispettati

- `token_value` (cleartext): **mai passato a nessun logger** — `redactToken()` è il guardrail
- `KORA_LINK_TOKEN_SECRET`: letto da env, mai hardcodato, mai loggato
- Rejection sampling: byte ≥ 248 scartati — nessun modulo bias su base62
- `computeDigest` produce sempre hex lowercase di 64 char
- `digestPrefix` restituisce 8 char per correlazione audit, non come lookup key
- Nessuna importazione da client/browser; `node:crypto` only

### Copertura test (65 test, 8 suite)

| Suite | Test |
|-------|------|
| Constants | 7 — valori canonici verificati |
| generateToken | 7 — formato, unicità 1000 campioni, copertura charset |
| validateTokenFormat (valid) | 3 — casi corretti |
| validateTokenFormat (invalid) | 13 — null, undefined, numero, vuoto, prefisso errato, lunghezza errata, char non-base62 |
| isValidTokenFormat | 3 — type guard |
| computeDigest | 8 — determinismo, differenza per input diversi, unicità 1000 digest, eccezioni |
| digestPrefix | 6 — lunghezza, valore, hex, eccezioni |
| getTokenSecret | 6 — env mancante, vuoto, troppo corto, valido, eccezione con messaggio bit |
| redactToken | 10 — token bare, in frase, in URL, multipli, assente, parziale, da generateToken |

### File non modificati

- Nessuna route `/link/[token]`
- Nessuna UI
- Nessuna migration
- Nessun file `.env`
- `supabase/proposed/034_kora_link_schema.sql` non modificato
- Nessun codice RLS, auth, middleware, service-role, Supabase client

### Metriche

- File creati: 2 (`lib/kora-link/token.ts`, `tests/unit/kora-link-token.test.ts`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Dipendenze npm aggiunte: 0 (solo `node:crypto` nativo)
- TypeScript: 0 errori (`tsc --noEmit`)
- Vitest KL-06: 65/65 passed
- Vitest suite completa: 8193/8193 passed (+65 rispetto a KL-05)
- Build: non rilanciate (no modifica route/UI)
- Supabase usato: no
- DB connesso: no
- SQL eseguito: no

### Gate status post-KL-06

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 Design | ✅ COMPLETATO |
| KL-02 Decision Gate | ✅ COMPLETATO |
| KL-03 Branch strategy | ✅ COMPLETATO |
| KL-04 Token Threat Model | ✅ COMPLETATO |
| KL-05 Migration 034 draft | ✅ COMPLETATO — in attesa review CTO |
| KL-06 Token Core | ✅ COMPLETATO |
| KL-07 Route pubblica `/link/[token]` | Prerequisiti: `KORA_LINK_ENABLED` feature flag; rate limiting Upstash; Gate 2+3 |

---

---

## KL-07 — Runtime Config Core

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessuna UI, nessuna route

### Contenuto

Creato `lib/kora-link/config.ts` — modulo server-only per configurazione KORA Link.
Creato `tests/unit/kora-link-config.test.ts` — 59 test unit, copertura completa.

### Funzioni e costanti esportate

| Export | Tipo | Scopo |
|--------|------|-------|
| `KoraLinkEnv` | type | Subset env per KORA Link — accetta `process.env` e oggetti parziali nei test |
| `KoraLinkReadinessResult` | type | `{ ready: true }` o `{ ready: false; missing: string[] }` |
| `KoraLinkRateLimitConfig` | type | Shape config rate limiting |
| `KORA_LINK_RATE_LIMIT_WINDOW_MS` | const | `60_000` (1 minuto) |
| `KORA_LINK_RATE_LIMIT_MAX_PUBLIC` | const | `20` scansioni per finestra |
| `KORA_LINK_RATE_LIMIT_KEY_PREFIX` | const | `'kl:rl:pub:'` — prefix Redis |
| `isKoraLinkEnabled(env?)` | fn | `true` solo se `KORA_LINK_ENABLED === 'true'` — case-sensitive, default off |
| `getKoraLinkPublicBaseUrl(env?)` | fn | Legge e valida URL, strip trailing slash, lancia se assente/invalida |
| `getKoraLinkReadiness(env?)` | fn | Check non-bloccante — non lancia mai |
| `assertKoraLinkReady(env?)` | fn | Guard bloccante per route handler |
| `getKoraLinkRateLimitConfig()` | fn | Restituisce config rate limiting — nessun provider integrato |

### Design pattern

Tutte le funzioni accettano `env?: KoraLinkEnv` con default `process.env`.
Nessuna lettura env al top-level: il modulo è sicuro per test e build.

```ts
// test injection — nessun process.env polluted
getKoraLinkReadiness({ KORA_LINK_ENABLED: 'true', ... });

// produzione
assertKoraLinkReady(); // legge process.env
```

### Note TypeScript (TS2559)

`KoraLinkEnv` include un index signature `[key: string]: string | undefined` oltre alle named properties. Necessario in TypeScript 5.9 per passare `process.env` come default (weak-type check). I named keys restano come documentazione e type hint.

### Copertura test (59 test, 7 suite)

| Suite | Test |
|-------|------|
| Constants | 4 |
| isKoraLinkEnabled | 9 — tutti i valori falsy + 'true' esatto |
| getKoraLinkPublicBaseUrl (valid) | 7 — https, http, trailing slash, porta, path |
| getKoraLinkPublicBaseUrl (invalid) | 7 — assente, non-URL, protocollo non supportato, no info leak |
| getKoraLinkReadiness | 13 — tutti i casi ready/not-ready, conteggio missing |
| assertKoraLinkReady | 7 — no-throw, throws, errore non espone secret |
| getKoraLinkRateLimitConfig + type shapes | 11 |

### Metriche

- File creati: 2 (`lib/kora-link/config.ts`, `tests/unit/kora-link-config.test.ts`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Dipendenze aggiunte: 0
- TypeScript: 0 errori nel codice KL (errori `.next/dev/types/validator.ts` pre-esistenti, file gitignored)
- Vitest KL-07: 59/59 passed
- Vitest suite totale: 8252/8252 (+59 rispetto a KL-06)
- Build: OK
- E2E: 6/6 passed
- ESLint: 0 errori, 0 warning

### Gate status post-KL-07

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 → KL-06 | ✅ COMPLETATI |
| KL-07 Runtime Config Core | ✅ COMPLETATO |
| KL-08 Route `/link/[token]` | Prerequisiti: `KORA_LINK_ENABLED=true` · Upstash Redis · Gate 2+3 |

---

*KORA_LINK_CHANGELOG.md — KL-07 · 2026-06-30*

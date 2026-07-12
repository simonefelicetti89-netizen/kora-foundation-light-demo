# Partner Activity Catalog 01 — Standard Partner Activities Shell

**Data:** 2026-07-12
**Branch:** `feature/partner-activity-catalog-01`
**Tipo:** No-DB/no-RLS UI shell + static model + docs + tests — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessun booking reale costruito.

## Scopo

Questo sprint introduce il concetto di **attività standard partner** come oggetto distinto dalle iniziative KORA Space/Contribution, seguendo il modello formalizzato in `docs/PARTNER_ECOSYSTEM_MODEL_01.md` (Corsia B). Costruisce la prima anteprima UI del futuro Partner Activity Catalog — dati statici in-memory, nessuna persistenza reale.

## Perché è distinto dalle iniziative

Un'**Attività Partner** non è un'iniziativa KORA Space. Non viene mai scritta in `commons.post`, non genera mai un `commons.booking`, e non alimenta mai `commons.contribution_event` / KORA Contribution direttamente. Rappresenta invece un servizio, prodotto o opportunità standard offerto da un partner accreditato — classificabile per categoria fiscale/welfare, mappabile su uno o più pilastri KORA, e destinato in futuro ad alimentare segnali aggregati KORA Index una volta che azienda e worker potranno selezionarla/prenotarla.

Un'eccezione narrativa, non tecnica, resta possibile: un'attività può in futuro essere *impacchettata* editorialmente dentro un'iniziativa KORA Space (`contributionEligibility: 'may_be_packaged_into_initiative'`) — ma questo è un atto umano separato, non un collegamento automatico tra le due pipeline.

## Relazione con KORA Index

Ogni attività ha un campo `indexSignalEligibility` (`eligible_preview` / `needs_review` / `not_eligible`) che descrive l'eleggibilità futura come segnale aggregato KORA Index. **Nessun segnale reale è generato oggi** — non esiste alcun percorso live da un'attività a un calcolo KORA Index. Il calcolo KORA Index non è stato toccato da questo sprint.

## Relazione con KORA Contribution

Ogni attività ha un campo `contributionEligibility`, con solo due valori possibili: `not_contribution_source` (la maggioranza dei casi) o `may_be_packaged_into_initiative` (l'eccezione narrativa sopra descritta). **Nessun valore implica mai un'alimentazione diretta di KORA Contribution.** La pipeline Contribution (`commons.post` → `commons.booking` → `commons.contribution_event`) non è stata toccata da questo sprint.

## Modello categoria fiscale/welfare

13 categorie (`FiscalCategory`): `fringe_benefit`, `welfare_aziendale`, `formazione`, `salute_prevenzione`, `sport_benessere`, `famiglia_istruzione`, `mobilita_trasporti`, `cultura_tempo_libero`, `previdenza_assistenza`, `servizi_persona`, `convenzione_commerciale`, `esg_volontariato`, `da_classificare` — ispirate al vocabolario già presente in `data/synthetic/action-taxonomy.json` (`fiscal_perimeter`) e in `docs/04-fiscal-policy-eligibility-layer.md`, senza importare o modificare quel file (che classifica dati aziendali già caricati, non attività partner).

Ogni attività ha anche un `fiscalReviewStatus` (`proposed_by_partner` / `kora_review` / `company_payroll_review_needed` / `pilot_display_only` / `not_classified`) — **la categoria fiscale è sempre metadato proposto, mai un'approvazione fiscale, payroll o legale definitiva.**

## Modello mappatura pilastri

Ogni attività ha un `primaryPillar` e zero o più `secondaryPillars`, usando i codici pilastro canonici (`LIFE`/`GROWTH`/`CONNECTION`/`IMPACT`/`LEGACY`, `PillarColorKey` da `lib/design/kora-design-tokens.ts`) — stesso vocabolario del resto della piattaforma, nessun nuovo sistema di pilastri.

## Modello azione futura worker

`FutureWorkerAction`: `book` (prenotazione), `apply` (candidatura), `request_contact` (richiesta di contatto), `redeem_voucher` (riscatto voucher), `info_only` (solo informativo). Nessuna di queste azioni è implementata in questo sprint — sono etichette di modello, non funzionalità.

## Modalità di selezione azienda (future)

`AccessMode`: `company_selected`, `worker_free_choice`, `category_enabled`, `pillar_enabled`, `partner_enabled` — corrispondono esattamente alle modalità richieste (per categoria fiscale, per pilastro, per partner, per attività specifica, scelta libera worker entro perimetro/budget). Nessuna UI di selezione aziendale esiste ancora — solo l'etichettatura del modello.

## Confine privacy

Invariato rispetto al resto della piattaforma:
- L'azienda vede solo segnali aggregati — mai su base individuale.
- Il partner vede un nominativo worker solo dopo un'azione volontaria del worker (prenotazione, candidatura, richiesta di contatto, condivisione di profilo) — stesso principio già implementato in `/partner/relationships`.
- Nessun nome, email, identificativo worker, tag UID, o evento individuale di scansione/attivazione appare nel catalogo (test-verificato).

## Cosa è stato costruito

- `lib/partner-activities/catalog.ts` — modello statico puro: tipi, etichette italiane, 8 attività mock, funzioni di accesso pure (`getPartnerActivities`, `getPartnerActivityById`, filtri per categoria/pilastro/azione/stato revisione), riepilogo derivato (`getPartnerActivityCatalogSummary`).
- `/partner/activity-catalog` — catalogo con card di riepilogo, raggruppamento per categoria fiscale, nota privacy, nota di classificazione fiscale.
- `/partner/activity-catalog/[activityId]` — dettaglio attività: classificazione, mappatura pilastri, modalità future di selezione azienda, azione futura worker, anteprima segnale KORA Index, confine privacy, disclaimer fiscale/legale.
- Cross-link bidirezionale tra `/partner/initiatives` ("Proposte Partner") e `/partner/activity-catalog` — le due corsie restano visivamente e concettualmente separate.
- Voce di navigazione partner "Catalogo Attività", con badge `preview`.

## Lavoro futuro (esplicitamente fuori scope qui)

- Entità `partner_activity` reale, DB-backed.
- UI di selezione azienda (per categoria/pilastro/partner/attività/scelta libera).
- UI di prenotazione/candidatura worker.
- Pipeline di segnale aggregato KORA Index reale da attivazione di attività partner.
- Validazione fiscale/payroll/legale definitiva delle categorie.
- Decisione se `PARTNER` diventerà mai un `author_role` per `commons.post` (questione già registrata, non risolta, in `docs/PARTNER_ECOSYSTEM_MODEL_01.md`).

## Documenti collegati

`docs/PARTNER_ECOSYSTEM_MODEL_01.md`, `docs/PARTNER_SURFACE_01.md`, `docs/04-fiscal-policy-eligibility-layer.md`, `docs/GOVERNANCE_UI_01.md`, `docs/KORA_LINK_CHANGELOG.md`.

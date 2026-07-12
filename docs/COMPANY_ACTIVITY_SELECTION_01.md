# Company Activity Selection 01 — Phase 2 Enablement Shell

**Data:** 2026-07-12
**Branch:** `feature/company-activity-selection-01`
**Tipo:** No-DB/no-RLS UI shell — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessuna persistenza creata, nessuna enforcement di budget, nessuna logica di eleggibilità reale, nessun booking worker.

## Scopo

Questo sprint introduce il primo shell **Company Activity Selection** — il primo passo operativo della Fase 2 (Activation Intelligence), formalizzata in `docs/KORA_ACTIVATION_LAYER_01.md`. Mostra come un'azienda potrebbe definire il perimetro di attivazione per le Attività Partner standard (`docs/PARTNER_ACTIVITY_CATALOG_01.md`) prima che il worker possa scoprirle, sceglierle, prenotarle, o richiederle.

## Relazione con KORA Activation Layer

Sequenza Fase 2:

```
Catalogo Attività Partner (esiste, no-DB)
→ Selezione Attività Azienda (questo sprint, no-DB)
→ Discovery / Scelta Worker (non ancora implementata)
→ Erogazione / Relazione Partner (non ancora implementata)
→ Segnali di Attivazione Aggregati (non ancora implementata)
→ futuro segnale KORA Index
```

Solo i primi due passaggi esistono oggi, entrambi come shell/anteprima.

## Relazione con Partner Activity Catalog

Riusa direttamente `lib/partner-activities/catalog.ts` — nessun nuovo modello di dati, nessuna duplicazione. Le stesse 8 attività mock, gli stessi tipi ed etichette, sono presentati da una prospettiva aziendale invece che partner.

## Cinque modalità di selezione azienda

1. **Per categoria fiscale/welfare** — abilita intere categorie (riusa `FiscalCategory`/`FISCAL_CATEGORY_LABELS`, 13 categorie).
2. **Per pilastro KORA** — abilita per LIFE/GROWTH/CONNECTION/IMPACT/LEGACY.
3. **Per partner** — abilita uno o più partner accreditati specifici.
4. **Per attività specifica** — selezione puntuale dal catalogo.
5. **Scelta libera worker entro budget/perimetro** — l'azienda definisce solo il perimetro aggregato (categorie/pilastri/budget), il worker sceglie liberamente al suo interno.

Nessuna delle cinque modalità è funzionalmente implementata — sono presentate come anteprima/educazione, con esempi statici.

## Modello categoria fiscale/welfare

Invariato — riusa `FISCAL_CATEGORY_LABELS` da `lib/partner-activities/catalog.ts`. Nessuna nuova tassonomia introdotta.

## Modello pilastro

Invariato — riusa `PillarColorKey` (`LIFE`/`GROWTH`/`CONNECTION`/`IMPACT`/`LEGACY`) da `lib/design/kora-design-tokens.ts`.

## Modello selezione partner/attività specifica

Nessun nuovo modello — deriva l'elenco partner univoco dalle attività mock esistenti (`Array.from(new Set(activities.map(a => a.partnerName)))`) e collega direttamente al Catalogo Attività per la selezione puntuale.

## Modello scelta libera worker

Descritto solo concettualmente: l'azienda definisce un perimetro (categorie fiscali + pilastri abilitati + budget indicativo), il worker sceglie liberamente all'interno. Nessuna enforcement di budget o eleggibilità è implementata.

## Anteprima budget/perimetro

Sezione statica con campi di esempio: budget annuo indicativo, categorie fiscali abilitate, pilastri abilitati, partner abilitati, attività abilitate, modalità di scelta worker, stato di revisione, necessità di revisione payroll/fiscale — tutti valori illustrativi, esplicitamente dichiarati come "nessuna enforcement implementata."

## Anteprima reportistica aggregata

Solo card di anteprima qualitativa (adesione per categoria fiscale, adesione per pilastro, partecipazione/completamento, fasce di valore, segnale KORA Index) — nessun dato reale, nessuna disaggregazione individuale, ogni eventuale distribuzione per gruppo resterebbe aggregata (N≥10).

## Direzione del segnale KORA Index

L'attivazione di queste attività potrà in futuro alimentare un segnale aggregato KORA Index — distinto dai segnali Fase 1 derivati dai dati caricati. **Il calcolo live del KORA Index (`lib/kora-engine/kora-index-engine.ts`) non è stato toccato da questo sprint.**

## Distinzione Fase 1 / Fase 2

Riconfermata esplicitamente su entrambe le pagine: Fase 1 (caricamento dati, analisi, KORA Index attuale) resta separata dalla Fase 2 (attività partner, abilitazione azienda, scelta worker). Vedi `docs/KORA_ACTIVATION_LAYER_01.md` per il registro completo, incluso il naming collision su "activation."

## Confine Contribution

Le Attività Partner non alimentano mai direttamente KORA Contribution. Le iniziative KORA Space/Contribution restano separate. Un'attività può essere impacchettata in un'iniziativa solo tramite un percorso separato di proposta, revisione e adozione (`docs/PARTNER_ECOSYSTEM_MODEL_01.md`).

## Confine privacy

Invariato: l'azienda riceve sempre e solo output aggregati; il partner vede nominativi solo dopo un'azione volontaria del worker; nessuna attività individuale del worker torna mai al datore di lavoro. Nessun nome, email, ID worker, tag UID, prenotazione individuale, o relazione partner individuale appare su nessuna delle due pagine (test-verificato).

## Cosa è stato costruito

- `/company/activity-selection` — pagina principale: introduzione Fase 2, flusso a 6 passi, cinque modalità di selezione, anteprima catalogo (tabella riusata), anteprima budget/perimetro, anteprima reportistica aggregata, note privacy/KORA Index/Contribution/fiscale-legale, cross-link.
- `/company/activity-selection/plan` — esempio statico di un piano concreto (categorie/pilastri/partner/attività selezionati, perimetro scelta libera, budget, stato, reportistica aggregata, confine privacy).
- Voce di navigazione azienda "Selezione Attività" sotto "Intelligence", con badge `preview`.
- Cross-link bidirezionale con `/admin/kora-activation-layer` (che ora rimanda qui dalla propria sezione "Prossimo sprint raccomandato").

## Lavoro futuro (esplicitamente fuori scope qui)

- Entità reale `company_activity_selection`, DB-backed.
- Enforcement reale di budget/perimetro.
- Logica reale di eleggibilità worker.
- Discovery/scelta/prenotazione worker (`WORKER-ACTIVITY-DISCOVERY-01`).
- Gestione prenotazioni partner (`PARTNER-ACTIVITY-BOOKINGS-01`).
- Pipeline reale di segnale di attivazione aggregato (`ACTIVATION-SIGNAL-PIPELINE-01`).
- Integrazione futura nel calcolo KORA Index, solo dopo revisione CTO (`KORA-INDEX-ACTIVATION-INTEGRATION-01`).

## Documenti collegati

`docs/KORA_ACTIVATION_LAYER_01.md`, `docs/PARTNER_ECOSYSTEM_MODEL_01.md`, `docs/PARTNER_ACTIVITY_CATALOG_01.md`, `docs/04-fiscal-policy-eligibility-layer.md`.

# Worker Activity Discovery 01 — Phase 2 Discovery Shell

**Data:** 2026-07-12
**Branch:** `feature/worker-activity-discovery-01`
**Tipo:** No-DB/no-RLS UI shell — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessuna persistenza di booking/richiesta/contatto/voucher, nessuna logica di eleggibilità worker reale.

## Scopo

Questo sprint introduce il primo shell **Worker Activity Discovery** — il terzo passo operativo della Fase 2 (Activation Intelligence), dopo `PARTNER-ACTIVITY-CATALOG-01` (catalogo) e `COMPANY-ACTIVITY-SELECTION-01` (selezione azienda). Mostra al worker le Attività Partner standard disponibili all'interno di un perimetro di attivazione ipoteticamente abilitato dall'azienda, e come sceglierebbe volontariamente tra loro.

## Relazione con KORA Activation Layer

Sequenza Fase 2:

```
Catalogo Attività Partner (esiste, no-DB)
→ Selezione Attività Azienda (esiste, no-DB)
→ Worker Activity Discovery / Choice (questo sprint, no-DB)
→ Prenotazione/Richiesta/Erogazione Partner (non ancora implementata)
→ Segnali di Attivazione Aggregati (non ancora implementata)
→ futuro segnale KORA Index
```

## Relazione con Company Activity Selection

Il perimetro che l'azienda definirebbe su `/company/activity-selection` (categoria fiscale, pilastro, partner, attività specifica, o scelta libera entro budget) è ciò che determinerebbe quali attività il worker vede qui. Questo sprint non implementa il collegamento reale tra selezione azienda e discovery worker — la pagina worker mostra l'intero catalogo mock, con una nota esplicita che in futuro sarebbe filtrato dal perimetro aziendale.

## Relazione con Partner Activity Catalog

Riusa direttamente `lib/partner-activities/catalog.ts` — nessun nuovo modello di dati. Le stesse 8 attività mock sono presentate da una prospettiva worker, con corsie suggerite per pilastro e un'etichetta CTA in forma verbale (Prenota/Candidati/Richiedi contatto/Riscatta voucher/Scopri di più) distinta dall'etichetta nominale già esistente in `FUTURE_WORKER_ACTION_LABELS`.

## Modello di scelta volontaria worker

Ogni attività ha un `futureWorkerAction` (`book`/`apply`/`request_contact`/`redeem_voucher`/`info_only`). La pagina mostra un pulsante disabilitato per ciascuna, con etichetta in forma di invito all'azione:

| `futureWorkerAction` | CTA worker-facing |
|---|---|
| `book` | Prenota |
| `apply` | Candidati |
| `request_contact` | Richiedi contatto |
| `redeem_voucher` | Riscatta voucher |
| `info_only` | Scopri di più |

Nessuna di queste azioni è funzionale in questo sprint.

## Cosa vedrebbe il partner dopo l'azione volontaria del worker

Solo i dati necessari a gestire la relazione avviata dal worker — coerente con il modello già implementato in `/partner/relationships` (PARTNER-SURFACE-01). Mai più di quanto necessario, mai senza l'azione volontaria del worker.

## Cosa non vede mai l'azienda

Nessuna scelta individuale del worker, nessuna attività specifica selezionata, nessun dettaglio della relazione con il partner. L'azienda riceve sempre e solo esiti aggregati — invariato rispetto al resto della piattaforma.

## Direzione del segnale KORA Index

L'attivazione di queste attività potrà in futuro alimentare un segnale aggregato KORA Index — distinto dai segnali Fase 1. **Il calcolo live del KORA Index (`lib/kora-engine/kora-index-engine.ts`) non è stato toccato da questo sprint.**

## Confine Contribution

Le Attività Partner non alimentano mai direttamente KORA Contribution. Le iniziative KORA Space restano separate (`lib/commons/types.ts`, non toccato). Un'attività può essere impacchettata in un'iniziativa solo tramite un percorso separato di proposta, revisione e adozione.

## Confine privacy

Invariato: sfogliare le attività non espone mai il worker all'azienda; la scelta è sempre volontaria; il partner vede nominativi solo dopo l'azione del worker; l'azienda resta sempre aggregate-only. Nessun nome, email, ID worker, o tag UID di un *altro* worker appare in nessuna delle due pagine (test-verificato) — l'unica identità presente è quella del worker autenticato stesso, già gestita dal layout `/worker/*` esistente.

## Cosa è stato costruito

- `/worker/activity-discovery` — pagina principale: introduzione Fase 2, pannello di controllo/privacy, riepilogo "sfoglia per" (pilastro/categoria/partner/tipo/azione), corsie suggerite per pilastro (LIFE/GROWTH/CONNECTION/IMPACT/LEGACY con etichette worker-friendly), card attività con CTA disabilitata, nota di flusso Fase 2, nota KORA Index, nota Contribution.
- `/worker/activity-discovery/detail` — anteprima statica di dettaglio per un'attività di esempio (non una route dinamica `[activityId]`, per restare a basso rischio): classificazione, mappatura pilastri, cosa succede se scelta, cosa vedrebbe il partner, cosa non vedrebbe mai l'azienda, CTA disabilitata.
- Voce di navigazione worker "Attività disponibili" sotto "Attivazione", con badge `preview`.
- Cross-link a `/worker/commons` (iniziative KORA Space reali, per contrasto esplicito), `/partner/activity-catalog`, `/company/activity-selection`, `/admin/kora-activation-layer`.

## Lavoro futuro (esplicitamente fuori scope qui)

- Logica reale di eleggibilità worker basata sul perimetro azienda.
- Flusso reale di prenotazione/candidatura/richiesta di contatto/riscatto voucher.
- Gestione prenotazioni/richieste lato partner (`PARTNER-ACTIVITY-BOOKINGS-01`).
- Pipeline reale di segnale di attivazione aggregato (`ACTIVATION-SIGNAL-PIPELINE-01`).
- Integrazione futura nel calcolo KORA Index, solo dopo revisione CTO (`KORA-INDEX-ACTIVATION-INTEGRATION-01`).

## Documenti collegati

`docs/KORA_ACTIVATION_LAYER_01.md`, `docs/COMPANY_ACTIVITY_SELECTION_01.md`, `docs/PARTNER_ACTIVITY_CATALOG_01.md`, `docs/PARTNER_ECOSYSTEM_MODEL_01.md`, `docs/PARTNER_SURFACE_01.md`.

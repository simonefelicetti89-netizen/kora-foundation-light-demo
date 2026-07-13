# Company Activity Signal Preview 01 — Company-Facing Aggregate Phase 2 Preview

**Data:** 2026-07-13
**Branch:** `feature/company-activity-signal-preview-01`
**Tipo:** No-DB/no-RLS/no-migration UI shell — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessuna persistenza reale, nessuna aggregazione reale calcolata, nessun calcolo del KORA Index modificato.

## Scopo

`ACTIVATION-SIGNAL-PIPELINE-01` ha introdotto `/company/activity-signals` come shell iniziale minimale. Questo sprint la rafforza in una vera superficie di reporting aggregato per l'azienda: mostra cosa la Fase 2 Activation Intelligence sta producendo dalle Attività Partner, senza integrare con il KORA Index live, senza persistenza, e senza calcolo analitico reale.

## Relazione con Activation Signal Pipeline

Riusa integralmente il modello statico `lib/partner-activities/activation-signals.ts` (`ActivationSignalPreview`, `getActivationSignalPreviews`, `getActivationSignalSummary`, `groupActivationSignalsByPillar`, `groupActivationSignalsByFiscalCategory`, `groupActivationSignalsByIndexComponentPreview`) introdotto in `ACTIVATION-SIGNAL-PIPELINE-01` — nessuna duplicazione di modello, nessun nuovo campo aggiunto. `/admin/activation-signal-pipeline` resta il riferimento di modello completo per KORA_ADMIN; questa pagina ne è la proiezione company-facing, aggregate-only.

## Relazione con Company Activity Selection

`/company/activity-selection` definisce il perimetro di attivazione a monte (categoria fiscale, pilastro, partner, attività). Questa pagina non modifica quella logica — mostra cosa quel perimetro sta producendo in termini di segnale aggregato, in anteprima.

## Relazione con Partner Activity Catalog / Worker Discovery / Partner Bookings

Nessun collegamento funzionale nuovo — il flusso concettuale resta: Catalogo Attività Partner → Selezione Attività Azienda → Worker Discovery/Choice → Partner Bookings/Requests → Engagement evasi/completati → Segnali di Attivazione Aggregati (questa pagina + `/admin/activation-signal-pipeline`) → futuro segnale KORA Index.

## Output aggregate-only per l'azienda

Ogni sezione della pagina è aggregate-shaped by construction: conteggi, distribuzioni, percentuali, badge di stato. Nessun campo individuale (`sourceBookingIds`, nominativi, email, ID lavoratore, stato di singola prenotazione) è mai acceduto o renderizzato — verificato da test statico (`tests/unit/company-activity-signal-preview-01.test.ts`).

## Raggruppamento segnali per pilastro / categoria / componente KORA Index

- **Per pilastro:** distribuzione sui 5 pilastri canonici (`LIFE`, `GROWTH`, `CONNECTION`, `IMPACT`, `LEGACY`, da `lib/constants/kora.ts`) più il bucket esplicito `multiple` per segnali che aggregano su più pilastri.
- **Per categoria fiscale/welfare:** distribuzione sulle categorie del Catalogo Attività Partner (`FISCAL_CATEGORY_LABELS`), con dichiarazione esplicita che sono metadati proposti, non un'approvazione fiscale o legale.
- **Per componente KORA Index (anteprima):** distribuzione su `reach`, `quality`, `equity`, `activation`, `continuity`, `pillar_balance` — puramente indicativa, mai un calcolo di componente reale.

## Concetto di soglia di privacy

Invariato rispetto ad `ACTIVATION-SIGNAL-PIPELINE-01`: `privacyThresholdStatus` è un concetto di anteprima (`passed_preview` / `needs_threshold_review` / `suppressed_preview`), non una regola finale. Ogni riga della tabella segnali e ogni card mostra il proprio stato di soglia. Nessuna soglia numerica è dichiarata vincolante da questo sprint; nessuna decisione DPO/legale è risolta.

## Cosa può e non può vedere l'azienda

**Può vedere:** adozione (uptake) aggregata, completamento aggregato, distribuzione per pilastro/categoria, fasce di valore, anteprima di continuità, stato della soglia di privacy, anteprima componenti KORA Index.

**Non può mai vedere:** nominativi, email, ID lavoratore, tag UID, prenotazioni individuali, stati individuali, scelte individuali di attività, riscatti voucher individuali, dettagli della relazione partner-lavoratore. Il partner continua a vedere nominativi solo dopo un'azione volontaria del lavoratore (`PARTNER-ACTIVITY-BOOKINGS-01`) — invariato.

## Confine KORA Index (futuro-input, non integrazione reale)

Questa pagina mostra un'anteprima di possibili futuri input di segnale per il KORA Index. Il calcolo live del KORA Index (`lib/kora-engine/kora-index-engine.ts`) non è modificato da questo sprint. Nessun punteggio KORA Index viene ricalcolato qui. `KORA-INDEX-ACTIVATION-INTEGRATION-01` resta uno sviluppo futuro separato, e richiede revisione CTO prima di qualunque integrazione reale.

## Confine Contribution

I segnali di Attività Partner non alimentano mai direttamente KORA Contribution. KORA Space / Iniziative Contribution (`commons.post` → `commons.booking` → `commons.contribution_event`, tutti non toccati da questo sprint) restano una pipeline separata.

## Cosa NON è stato fatto in questo sprint

- Nessuna entità reale `activation_signal`, DB-backed.
- Nessuna regola di soglia di privacy reale/finale.
- Nessun calcolo di aggregazione reale — i conteggi mostrati derivano una tantum dal modello statico esistente, non ricalcolati live.
- Nessuna modifica a `lib/kora-engine/kora-index-engine.ts`, all'ingestion/UEF, o a `commons.post`/`commons.booking`/`commons.contribution_event`.
- Nessuna decisione DPO/CTO/fiscale/legale risolta.

## Cosa è stato costruito

- Rafforzamento di `/company/activity-signals`: introduzione più ricca (distinzione esplicita da Fase 1 e da KORA Contribution), riepilogo esecutivo (segnali totali, eleggibili anteprima, richiedono revisione, soppressi/in revisione soglia, pilastri e categorie rappresentati), distribuzione per pilastro KORA (ordine canonico + bucket multi-pilastro), distribuzione per categoria fiscale/welfare, anteprima componenti KORA Index, pannello soglie di privacy (con nota worker-initiated), pannello "cosa può/non può vedere l'azienda", tabella segnali aggregati (senza `sourceBookingIds` né campi individuali), vista card compatta, note di confine KORA Index e Contribution, cross-link estesi.
- Nuova pagina opzionale `/company/activity-signals/summary` — versione esecutiva compatta dello stesso modello, stesso confine aggregate-only.
- Cross-link aggiunto da `/admin/activation-signal-pipeline` verso `/company/activity-signals` (mancante nello sprint precedente).
- Voce di navigazione azienda "Segnali Attivazione" confermata invariata (già presente da `ACTIVATION-SIGNAL-PIPELINE-01`).

## Lavoro futuro (esplicitamente fuori scope qui)

- Regole di soglia di privacy reali (decisione DPO/legale).
- Entità reale `activation_signal`, DB-backed.
- Calcolo reale di aggregazione dei segnali.
- `KORA-INDEX-ACTIVATION-INTEGRATION-RO` — eventuale revisione/readiness-only propedeutica.
- `KORA-INDEX-ACTIVATION-INTEGRATION-01` — integrazione futura (solo dopo revisione CTO) dei segnali aggregati Fase 2 nel calcolo del KORA Index, mantenendo la pipeline distinta dalla Fase 1.

## Documenti collegati

`docs/ACTIVATION_SIGNAL_PIPELINE_01.md`, `docs/KORA_ACTIVATION_LAYER_01.md`, `docs/COMPANY_ACTIVITY_SELECTION_01.md`, `docs/PARTNER_ACTIVITY_CATALOG_01.md`, `docs/WORKER_ACTIVITY_DISCOVERY_01.md`, `docs/PARTNER_ACTIVITY_BOOKINGS_01.md`.

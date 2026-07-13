# Activation Signal Pipeline 01 — Phase 2 Aggregate Signal Preview

**Data:** 2026-07-13
**Branch:** `feature/activation-signal-pipeline-01`
**Tipo:** No-DB/no-computation UI + model shell — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessuna persistenza reale, nessuna aggregazione reale calcolata, nessun calcolo del KORA Index modificato.

## Scopo

Questo sprint introduce il quinto passo operativo della Fase 2 (Activation Intelligence): un'anteprima di come gli engagement Attività Partner completati/evasi (`PARTNER-ACTIVITY-BOOKINGS-01`) possano in futuro diventare segnali di attivazione aggregati e privacy-safe per il KORA Index. È il ponte concettuale descritto in `docs/KORA_ACTIVATION_LAYER_01.md` §6 punto 4 — non implementa alcuna aggregazione reale, alcuna persistenza, o alcun calcolo.

## Relazione con KORA Activation Layer

Sequenza Fase 2 completa:

```
Catalogo Attività Partner (esiste, no-DB)
→ Selezione Attività Azienda (esiste, no-DB)
→ Worker Activity Discovery / Choice (esiste, no-DB)
→ Partner Booking / Request / Delivery (esiste, no-DB)
→ Engagement evasi/completati
→ Segnali di Attivazione Aggregati (questo sprint, no-DB/no-computation)
→ futuro segnale KORA Index (KORA-INDEX-ACTIVATION-INTEGRATION-01, non implementato)
```

## Relazione con Partner Activity Catalog

`lib/partner-activities/activation-signals.ts` importa `getPartnerActivityCatalogSummary` da `lib/partner-activities/catalog.ts` per derivare conteggi (es. quota di attività a catalogo coinvolte in almeno una richiesta) — nessuna duplicazione di modello, nessuna copia di dati.

## Relazione con Company Activity Selection

La Selezione Attività Azienda (`/company/activity-selection`) definisce il perimetro di attivazione a monte. Questo sprint non modifica quella logica — la pipeline di segnale presuppone che il perimetro azienda sia già stato definito, ma non lo legge né lo valida.

## Relazione con Worker Activity Discovery

La Discovery Worker (`/worker/activity-discovery`) è la fonte concettuale della scelta volontaria del worker. Nessun dato di discovery (navigazione, visualizzazione) diventa mai un segnale — solo le richieste effettivamente avviate (`PARTNER-ACTIVITY-BOOKINGS-01`) sono fonte di segnale.

## Relazione con Partner Activity Bookings

`lib/partner-activities/activation-signals.ts` importa `getPartnerActivityBookings` e `getPartnerActivityBookingsSummary` da `lib/partner-activities/bookings.ts` — ogni segnale di anteprima referenzia `sourceBookingIds`/`activityIds`/`partnerIds` reali del modello statico esistente, senza duplicarne i campi individuali (nomi, email, telefono non sono mai copiati nel modello di segnale).

## Modello di segnale aggregato

`ActivationSignalPreview` — ogni istanza è aggregate-shaped by construction:

- `signalId`, `source: 'partner_activity_engagement'`
- `sourceBookingIds`, `activityIds`, `partnerIds` — riferimenti, non copie di dati individuali
- `fiscalCategory` / `primaryPillar` — possono valere `'multiple'` quando il segnale aggrega su più categorie/pilastri (valore esplicito e onesto, mai un placeholder)
- `signalType`: `uptake` · `completion` · `continuity` · `access` · `value_band` · `worker_choice` · `partner_delivery`
- `aggregationLevel`: `company` · `pillar` · `fiscal_category` · `partner` · `activity_type`
- `eligibleForKoraIndexPreview`: `yes` · `needs_review` · `no`
- `indexComponentPreview`: `reach` · `quality` · `equity` · `activation` · `continuity` · `pillar_balance` · `none`
- `metricPreview: { label, value, unit }`
- `privacyThresholdStatus`: `passed_preview` · `needs_threshold_review` · `suppressed_preview`
- `companyVisibility: 'aggregate_only'` (fisso), `workerVisibilityBasis: 'worker_initiated_source_events'` (fisso), `contributionBoundary: 'not_contribution_source'` (fisso)
- `previewOnly: true` (fisso)

8 segnali mock coprono tutti e 7 i `signalType`, tutti e 5 gli `aggregationLevel`, e tutte le 6 componenti KORA Index richieste (`reach`, `quality`, `equity`, `activation`, `continuity`, `pillar_balance`) più `none`.

## Signal types

| Tipo | Esempio di trigger (anteprima) |
|---|---|
| `uptake` | Prenotazione/richiesta creata dal worker |
| `completion` | Attività completata/erogata |
| `continuity` | Utilizzo ripetuto presso lo stesso partner |
| `access` | Distribuzione tra categorie fiscali/pilastri |
| `value_band` | Fascia di valore stimata dell'attività erogata |
| `worker_choice` | Richiesta generata da scelta libera del worker (`accessMode: worker_free_choice`) |
| `partner_delivery` | Tasso di erogazione completata sulle richieste ricevute da un partner |

## Aggregation levels

`company` · `pillar` · `fiscal_category` · `partner` · `activity_type` — mai a livello di singolo worker o singola richiesta.

## Mappatura futura componenti KORA Index

Ogni segnale porta un `indexComponentPreview` puramente indicativo (`reach`, `quality`, `equity`, `activation`, `continuity`, `pillar_balance`, o `none`). Questo **non è** un calcolo delle 10 componenti canoniche del KORA Index v3 (`docs/10-architecture-v3-layer-specification.md` §5) — è un'etichetta di anteprima concettuale su quale futura componente un segnale Fase 2 potrebbe informare, se e quando `KORA-INDEX-ACTIVATION-INTEGRATION-01` venisse approvato dal CTO.

## Concetto di soglia di privacy

`privacyThresholdStatus` (`passed_preview` / `needs_threshold_review` / `suppressed_preview`) è un concetto di anteprima, non una regola finale. Nessuna soglia numerica (es. N≥10, già usata altrove nella piattaforma per EQS) è dichiarata vincolante da questo sprint. Le soglie di privacy reali per i segnali Fase 2 restano una decisione DPO/legale futura.

## Output aggregate-only per l'azienda

`/admin/activation-signal-pipeline` (KORA_ADMIN) e l'anteprima opzionale `/company/activity-signals` (azienda) mostrano solo dati aggregati: conteggi, distribuzioni, percentuali. Nessuna pagina mostra mai nominativi, email, ID worker, prenotazioni individuali, scelte individuali, o dettagli della relazione partner-lavoratore.

## Confine worker-initiated (partner)

Invariato rispetto a `PARTNER-ACTIVITY-BOOKINGS-01`: il partner vede nominativi solo dopo un'azione volontaria del worker. Questo sprint non aggiunge alcuna nuova superficie partner-facing — `activation-signals.ts` non espone mai campi nominativi individuali, anche quando referenzia `sourceBookingIds`.

## Confine Contribution

`contributionBoundary: 'not_contribution_source'` è fisso su ogni segnale. I segnali di Attività Partner non alimentano mai direttamente KORA Contribution. Le iniziative KORA Space (`commons.post` → `commons.booking` → `commons.contribution_event`) restano separate — nessun file `lib/commons/*` è toccato da questo sprint.

## Cosa NON è stato fatto in questo sprint

- Nessuna entità reale `activation_signal`, DB-backed.
- Nessuna regola di soglia di privacy reale/finale.
- Nessun calcolo di aggregazione reale (i conteggi mostrati sono derivati una tantum dai dati mock statici al caricamento del modulo, non ricalcolati live da alcuna fonte).
- Nessuna anteprima di preview per la company page — solo dati aggregate-shaped.
- Nessuna decisione DPO/CTO/fiscale/legale risolta.
- Nessuna modifica a `lib/kora-engine/kora-index-engine.ts`, all'ingestion/UEF, o a `commons.post`/`commons.booking`/`commons.contribution_event`.

## Cosa è stato costruito

- `lib/partner-activities/activation-signals.ts` — modello statico puro: tipi (`ActivationSignalPreview`, `ActivationSignalType`, `ActivationAggregationLevel`, `KoraIndexPreviewEligibility`, `IndexComponentPreview`, `PrivacyThresholdStatus`), etichette italiane, 8 segnali mock derivati dal catalogo/bookings esistenti, funzioni di accesso pure e riepiloghi/raggruppamenti derivati (`getActivationSignalPreviews`, `getActivationSignalSummary`, `groupActivationSignalsByPillar`, `groupActivationSignalsByFiscalCategory`, `groupActivationSignalsByIndexComponentPreview`).
- `/admin/activation-signal-pipeline` — pagina principale KORA_ADMIN: introduzione Fase 2, flusso end-to-end, mappa di trasformazione del segnale, tabella/card dei segnali aggregati, pannello soglie di privacy, pannello output azienda, pannello confine KORA Index, pannello confine Contribution, stato di implementazione, prossimo sprint raccomandato.
- `/company/activity-signals` — anteprima aggregate-only opzionale per l'azienda: riepilogo, card dei segnali aggregati, pannello soglie di privacy, cross-link.
- Voce di navigazione admin "Activation Signal Pipeline" sotto "Network & Content", vicino a "KORA Activation Layer".
- Voce di navigazione azienda "Segnali Attivazione" sotto "Intelligence", vicino a "Selezione Attività".
- Cross-link bidirezionali tra `/admin/activation-signal-pipeline`, `/admin/kora-activation-layer`, `/partner/activity-catalog`, `/company/activity-selection`, `/worker/activity-discovery`, `/partner/activity-bookings`, `/company/kora-index`, e `/company/activity-signals`.

## Lavoro futuro (esplicitamente fuori scope qui)

- Entità reale `activation_signal`, DB-backed.
- Regole di soglia di privacy reali (decisione DPO/legale).
- Calcolo reale di aggregazione dei segnali.
- `KORA-INDEX-ACTIVATION-INTEGRATION-01` — integrazione futura (solo dopo revisione CTO) dei segnali aggregati Fase 2 nel calcolo del KORA Index, mantenendo la pipeline distinta dalla Fase 1.

## Documenti collegati

`docs/KORA_ACTIVATION_LAYER_01.md`, `docs/PARTNER_ACTIVITY_BOOKINGS_01.md`, `docs/WORKER_ACTIVITY_DISCOVERY_01.md`, `docs/COMPANY_ACTIVITY_SELECTION_01.md`, `docs/PARTNER_ACTIVITY_CATALOG_01.md`.

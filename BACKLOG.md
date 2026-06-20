# KORA — Backlog Tecnico

Ticket post-merge per sprint futuri. Ordinati per priorità (P1 = bloccante prossimo sprint, P3 = nice-to-have).

---

## P2 — b108b: sostituire bande osservazionali con fixture minimale formula-derivata

**Contesto:** `tests/unit/b108b-score-smoke-test.test.ts` usa bande di score osservazionali (output v2.0 misurato) per le fixture weak/average/golden. Queste non verificano la formula — verificano solo che l'output non regredisca rispetto a un output precedente.

**Obiettivo:** Costruire una fixture minimale (3-5 record con IU calcolabili a mano) che permetta asserzioni `toBeCloseTo` su REACH, QUALITY, EQUITY, BTI e INDEX derivate dalla formula IU step-by-step. Quella diventa il test di regressione formula-derivato.

**Impatto:** b108b esistente resta come smoke di ordinamento (weak < average < golden); la nuova fixture verifica la correttezza della formula end-to-end.

**Prerequisiti:** Nessuno. Può partire in qualsiasi sprint post-merge.

**Stima:** ~4h.

---

## P2 — Riconciliare le due scale EV (EVIDENCE_WEIGHTS vs EV_BY_EVIDENCE_TYPE)

**Contesto:** Esistono due tabelle di pesi evidence separate con valori diversi:
- `component-engine.ts` `EVIDENCE_WEIGHTS` (usato per segnale EVQ/NI): L0=0.25, L1=0.50, L2=0.75, L3/L4=1.00
- `IUComputationService.ts` `EV_BY_EVIDENCE_TYPE` (usato nel fattore EV della formula IU): L0=0.50, L1=0.60, L2=0.75, L3=0.90, L4=1.00

**Decisione Sprint 2:** Non modificare `EV_BY_EVIDENCE_TYPE` — cambierebbe tutti i valori IU ed è una decisione di CALIBRAZIONE, non di robustezza.

**Obiettivo:** Dopo la calibrazione empirica BCM (Delphi Study), riconciliare le due tabelle in un'unica fonte di verità in `lib/methodology-config/v0.1.ts`.

**Prerequisiti:** Delphi Study completato. Gate 2 chiuso.

**Stima:** ~2h tecnica + sessione decisionale calibrazione.

---

## P2 — Calibrare target INT e PIB dopo raccolta dati reali

**Contesto:** Sprint 2 introduce `int_target_iu_per_active_worker` (soglia QUALITY/INT) e i target di pillar `LIFE/GROWTH/CONNECTION/IMPACT/LEGACY` per M(w). Entrambi sono provvisori cross-settore in `methodology-config.json`. Il prior di shrinkage bayesiano (`default_prior=40.0`) e la forza shrinkage (`k=10`) sono analogamente provvisori.

**Obiettivo:** Dopo la raccolta di dati pilota reali (almeno 3 tenant, >50 record eligible ciascuno), ricalibrate i target tramite Delphi/AHP e aggiornare `methodology-config.json`. I valori attuali sono etichettati come "provvisori" nei commenti di `lib/methodology-config/v0.1.ts`.

**Prerequisiti:** Dati pilota reali. Delphi Study completato. Gate 2 chiuso.

**Stima:** Sessione calibrazione + ~1h tecnica.

---

## P1 — Popolare hours / event_date / repetition_count nell'intake per attivare NM

**Contesto:** Sprint 2 implementa le funzioni NM (effort/recency/saturation) con fallback neutro=1.0 su dato mancante. Sul tenant sintetico attuale NM=1.0 su tutti gli eventi perché i CSV fixture non contengono `hours`, `event_date`, `b6_repetition_count`. L'intervallo di credibilità MC e lo shrinkage sono attivi ma NM non varia.

**Obiettivo:** Aggiungere questi tre campi all'intake CSV (colonne opzionali) e agli scenari di fixture `data/golden-path/` e `data/scenarios/`. In questo modo NM diventa attivo nel tenant sintetico e i test b108b possono misurare la variazione reale. Aggiornare anche il template di upload in AI Upload Studio.

**Prerequisiti:** Nessuno. Può partire nel prossimo sprint.

**Stima:** ~2h (fixture + UI intake).

---

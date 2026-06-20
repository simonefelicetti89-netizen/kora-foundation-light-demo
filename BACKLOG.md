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

# KORA-WP-129 — Founder Visual Review Index

**Product SHA:** `2fd03eab3b1290a8c9e480229b6e35ddadd21e75`
**Autorità di governance:** `a1a7797bc3b9bc0ba51b55b24b0ed110798feb3e` — Registry 219 § B `KORA-WP-129`
(DELTA 5, risolta da `AN.10`) + tassonomia § B `KORA-WP-126`
**Archivio:** `docs/product/visual-evidence/kora-wp-129/` · **39 file** `product__` + `manifest.json`
**Rigenerabile con:** `npx playwright test tests/e2e/kora-wp-129-worker-capture.spec.ts` (~45 s)

**Questo non è un'acceptance.** È l'insieme da recensire. 13 superfici × 3 viewport = 39 immagini, in un
ordine scelto perché il tempo di revisione vada dove serve.

---

## Come leggere i nomi dei file

```
kora-wp-129__product__<slug>__<viewport>.png
                 ▲         ▲        ▲
                 kind      route    desktop 1440×900 · rail 1200×900 · mobile 767×812
```

---

## Ordine di revisione

### Blocco 1 — mai viste prima (4 superfici, 12 immagini)

Nessuna di queste aveva evidenza di prodotto. È qui che la revisione rende di più.

| # | Route | Archetipo | desktop | rail | mobile | Stato catturato | Nota per la revisione |
|---|---|---|---|---|---|---|---|
| 1 | `/worker/dynamic-cv` | `RECORD_DETAIL` | `worker-dynamic-cv__desktop` | `…__rail` | `…__mobile` | **0 esperienze** | **L1**: l'evidenza mostra un CV vuoto. La remediation W3B (103 elementi sotto-floor → 0, 4104 → 2730 px, lista duplicata rimossa) **non è visibile qui** |
| 2 | `/worker/dynamic-cv/print` | `REPORT_EXPORT` | `worker-dynamic-cv-print__desktop` | `…__rail` | `…__mobile` | 0 esperienze | idem. Defect B (un solo document root) è invece verificabile |
| 3 | `/worker/onboarding` | `OPERATIONAL_WORKSPACE` | `worker-onboarding__desktop` | `…__rail` | `…__mobile` | **review** (`?mode=review`) | **L2**: il flusso a cinque passi del primo accesso non è catturato. Qui si vede la first-access shell: 0 link di navigazione |
| 4 | `/worker/setup-password` | `OPERATIONAL_WORKSPACE` | `worker-setup-password__desktop` | `…__rail` | `…__mobile` | ramo form | first-access shell, nessun hamburger sotto 767 px |

### Blocco 2 — portano un reperto (2 superfici, 6 immagini)

Mai state in una coorte di migrazione, mai misurate fino a ora. Entrambe hanno prodotto un WARN.

| # | Route | Archetipo | desktop | rail | mobile | Reperto |
|---|---|---|---|---|---|---|
| 5 | `/worker/workspace` | `EXECUTIVE_JUDGMENT` | `worker-workspace__desktop` | `…__rail` | `…__mobile` | **ratio 1.592** — oltre il `maxMobileRatio` **1.35** del suo archetipo, a 0.008 dalla soglia di `fail` (1.6). Altezze 1628 / 2485 / 2592 px |
| 6 | `/worker/privacy` | `DISCLOSURE_STATIC` | `worker-privacy__desktop` | `…__rail` | `…__mobile` | **ratio 1.518** — `warning` globale ma **dentro** il bound 1.6 del suo archetipo. Altezze 1332 / 1316 / 2022 px |

Nessuno dei due è stato corretto: la ratio è «a detector, never a target».

### Blocco 3 — conferma delle coorti già accettate (7 superfici, 21 immagini)

W1, W2 e il bug-fix Dynamic CV sono già stati accettati. Queste immagini servono a verificare che il cohort
riproducibile mostri la stessa cosa.

| # | Route | Archetipo | Coorte | Altezze d/r/m | Verdetti | Nota |
|---|---|---|---|---|---|---|
| 7 | `/worker/activity-discovery` | `DIRECTORY_INDEX` | W1 | 2308 / 2500 / 2840 | **length warn**, ratio pass 1.231 | **2308 px riproduce al pixel il WARN accettato di W1.** Residuo accettato, non da risolvere |
| 8 | `/worker/activity-discovery/detail` | `RECORD_DETAIL` | W1 | 1018 / 1018 / 1042 | pass / pass 1.024 | catalogo statico in codice → contenuto identico allo storico |
| 9 | `/worker/kora-link/activate` | `DISCLOSURE_STATIC` | W1 | 1940 / 2046 / 2098 | pass / pass 1.081 | — |
| 10 | `/worker/opportunities` | `DIRECTORY_INDEX` | W2 | 1018 / 1018 / 1014 | pass / pass 0.996 | catalogo statico → **+0% di byte** rispetto allo storico |
| 11 | `/worker/bookings` | `OPERATIONAL_WORKSPACE` | W2 | 1018 / 1156 / 1193 | pass / pass 1.172 | nessuna prenotazione nel seed → stato vuoto |
| 12 | `/worker/commons` | `DIRECTORY_INDEX` | W2 | 1018 / 1018 / 930 | pass / pass 0.914 | **−41/−55/−53% di byte**: meno iniziative del seed locale. W2 registrò 1514 px |
| 13 | `/worker/personal-impact-balance` | `RECORD_DETAIL` | W2 | 1018 / 1018 / 930 | pass / pass 0.914 | **stato zero del PIB** — «Nessuna Impact Unit registrata ancora per questo periodo», che il Founder ha già stabilito essere Product truth |

---

## Le due decisioni che servono

**D1 — fixture data-bearing per il Worker.** Quattro superfici leggono dal database e il cohort le mostra a
dati minimi o a zero. Il seed locale accettato dal progetto crea identità, tenant e profilo, **non**
esperienze: non esiste alcun meccanismo che produca `personal.worker_participation`. Serve decidere se il
cohort deve includere un fixture data-bearing — e con quale forma di dati sintetici dichiarata — oppure se
l'evidenza allo stato zero è sufficiente. **Non ne ho creato uno**: avrebbe significato fabbricare le
esperienze che poi recensisci.

**D2 — `/worker/onboarding`.** Accettare lo stato **review** come evidenza canonica di questa superficie,
oppure richiedere anche il **primo accesso** con il flusso a cinque passi, che richiede un worker con
onboarding non completato.

---

## Cosa NON è questo documento

Non è una Founder acceptance. Non è acceptance complessiva di `KORA-WP-129`. Non è chiusura formale. Nessuna
voce AL.2 è stata scritta, la Registry 219 non è stata modificata, nessuno stato è cambiato, nessun commit,
nessun push.

Per `AN.10`, ciò che resta tuo e non è automatizzabile: **Logo-Off, i premium moments e la visual acceptance
finale** sono FOUNDER JUDGMENT; **gerarchia, scanability, actionability e craft** sono REVIEW-ENFORCED. I
check meccanici che `126` possiede sono già verdi — 13/13 archetipi dichiarati, contratto a 7 stati, lunghezza
e ratio misurate su tutte e 13 — e non sostituiscono né l'una né l'altra classe.

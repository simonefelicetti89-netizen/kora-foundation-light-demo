# KORA Golden Path — Sample Upload Files

## A cosa servono

Questa cartella contiene **tre file CSV di calibrazione** per testare e dimostrare il flusso operativo end-to-end di KORA Foundation Light su tenant reali.

**Nessun file contiene dati reali.**  
**Nessun file contiene dati sensibili.**  
**Nessuno usa OP-001.**  
**Sono campioni tecnici — non benchmark empirici validati.**

---

## I tre dataset

| File | Scenario | KORA Index verificato | Score band | workforcePopulation |
|---|---|---|---|---|
| `kora_weak_company_upload.csv` | Azienda debole | **35–50** (engine: 42.4) | Early Activation | 100 |
| `kora_average_company_upload.csv` | Azienda media | **52–65** (engine: 59.3) | Solid Foundation | 150 |
| `kora_golden_path_upload.csv` | Golden path | **65–75** (engine: 69.1) | Advanced Activation | 300 |

> **Disclaimer**: i punteggi sono verificati con il motore reale (`runKoraPipeline`) in fase **pre_empirical_calibration**. Non rappresentano benchmark empirici validati né standard di settore. I pesi e le soglie sono provvisori (v0.1) e soggetti a revisione dopo la calibrazione empirica (Delphi Study).

> **Nota su EQUITY**: i CSV non contengono colonne dipartimento o sede. WB e EQ risultano sempre `insufficient_data` → i loro pesi (20%+25%) si redistribuiscono a PC e PB, che risultano elevati quando i pillar sono ben distribuiti. Questo sistema aticamente alza EQUITY e, di conseguenza, il KORA Index finale rispetto a stime naive. È un comportamento atteso del motore, non un errore di calibrazione.

---

## kora_weak_company_upload.csv

### Caratteristiche del dataset

- **Righe**: 13
- **Pillar attivi**: 2 (GROWTH, LIFE) — CONNECTION, IMPACT, LEGACY assenti
- **Eligibility effettiva**:
  - Blocked: 4 (antincendio, sorveglianza sanitaria, GDPR obbligatorio, Modello 231)
  - Limited: 3 (buoni pasto, gift card, fringe benefit)
  - Eligible: 6 (4 GROWTH + 2 LIFE — tutti L1, partecipanti ridotti)
  - Review required: 0
- **Evidence level eligible**: tutto L1 — nessun record L2+
- **Partecipanti max eligible**: 6 per singola iniziativa
- **Activation Safeguard effettivo**: FLAGGED (MAR < 0.15) ✓

### Macroblock verificati (engine, workforce=100)

| Macroblock | Valore effettivo | Note |
|---|---|---|
| REACH | 38.0 | MAR≈0.13 (FLAGGED), AR alto per limited con molti pax |
| QUALITY | 20.0 | Tutto L1 → NI=50, VR=0, CO=0 (strutturale CSV English headers) |
| EQUITY | 71.6 | WB/EQ rebalancing → pesi redistribuiti a PC(40) e PB — più alto del previsto |
| BTI | 45.0 | Blocked L3 (antincendio, sorveglianza) creano buon complianceClarity signal |
| **KORA Index** | **42.41** | Band: **Early Activation** |
| Confidence Score | 80.0 | CS esterno al KORA Index |

---

## kora_average_company_upload.csv

### Caratteristiche del dataset

- **Righe**: 18
- **Pillar attivi**: 3 forti (GROWTH, LIFE, CONNECTION) + 1 debole (LEGACY, 1 record) + 1 assente (IMPACT)
- **Eligibility effettiva**:
  - Blocked: 3 (antincendio, sorveglianza sanitaria, GDPR compliance)
  - Limited: 2 (buoni pasto, gift card)
  - Eligible: 11 (4 GROWTH + 3 LIFE + 3 CONNECTION + 1 LEGACY)
  - Review required: 2 (Qualità Lavorativa, Resilienza Organizzativa — ambigui)
- **Evidence level eligible**: mix L1/L2/L3 (2 record L3 Provider export, 2 record L2 Internal accounting, resto L1)
- **Partecipanti max eligible**: 30 (Mental Health Program)
- **Activation Safeguard effettivo**: CLEAR ✓

> I 2 record review_required non contribuiscono allo scoring automatico. Il punteggio è calcolato sugli 11 record eligible + 2 limited.

### Macroblock verificati (engine, workforce=150)

| Macroblock | Valore effettivo | Note |
|---|---|---|
| REACH | 54.1 | MAR≈0.48, AR≈0.63 — Safeguard CLEAR |
| QUALITY | 41.2 | NI≈68, VR≈45 (2 L3 + 2 L2), CO=0 |
| EQUITY | 88.2 | WB/EQ rebalancing → PC=60 + PB≈85 amplificati — più alto del previsto |
| BTI | 57.0 | 2 eligible L3 full_weight, mix L1/L2, relief ratio moderato |
| **KORA Index** | **59.34** | Band: **Solid Foundation** |
| Confidence Score | 79.0 | CS esterno al KORA Index |

---

## kora_golden_path_upload.csv

### Caratteristiche del dataset

- **Righe**: 20
- **Pillar attivi**: 5 (tutti coperti — LIFE, GROWTH, CONNECTION, IMPACT, LEGACY)
- **Eligibility effettiva** (verificata B107+B108-B):
  - Blocked: 1 (antincendio obbligatoria)
  - Limited: 1 (buoni pasto)
  - Eligible: 18 (tutti gli altri, inclusa Smart Working Policy)
  - Review required: 0
- **Evidence level eligible**: mix L1/L2 + Smart Working Policy (policy non-monetaria)
- **Activation Safeguard effettivo**: CLEAR ✓
- **Smart Working Policy** (200 pax, amount=0): domina bounded_estimate → AR≈MAR≈0.78 → REACH≈78.

### Macroblock verificati (engine, workforce=300)

| Macroblock | Valore effettivo | Note |
|---|---|---|
| REACH | 78.3 | Smart Working Policy (200 pax) satura lb del bounded_estimate |
| QUALITY | 35.4 | Mix L1/L2, VR moderato, CO=0 (strutturale CSV English headers) |
| EQUITY | 99.5 | 5 pillar → PC=100, PB≈99 — WB/EQ rebalancing amplifica al massimo |
| BTI | 70.0 | 2 L3 eligible (Provider export/Invoice), 1 limited, 1 blocked |
| **KORA Index** | **69.08** | Band: **Advanced Activation** |
| Confidence Score | 83.0 | CS esterno al KORA Index |

### Nota sulla discrepanza README originale

Il README originale indicava "16 eligible, 2 review_required". B107+B108-B confermano: **18 eligible, 0 review_required**. Il file non è stato modificato.

---

## Bande di interpretazione del KORA Index

Questi range sono orientativi e non sostituiscono l'analisi contestuale del Confidence Score e dell'Activation Safeguard.

| KORA Index | Banda | Significato |
|---|---|---|
| < 35 | **Weak Activation** | Attivazione debole — pochi programmi eligible, evidence prevalentemente L1, copertura pillar ridotta |
| 35–50 | **Early Activation** | Attivazione iniziale — base presente ma limitata per pillar coverage, evidence quality, o reach |
| 50–65 | **Solid Foundation** | Fondamenta solide — attivazione significativa su più pillar con evidence documentata |
| 65–75 | **Advanced Activation** | Attivazione avanzata — alta copertura, multi-pillar, evidence verificata, BTI equilibrato |
| > 75 | **Leading Maturity** | Maturità leader — attivazione profonda su tutti i pillar, evidence verificata, BTI ottimale |

> Leggere sempre insieme a: Confidence Score (CS), Activation Safeguard (CLEAR/WARNING/FLAGGED), e `calibration_status = pre_empirical_calibration`.

---

## Struttura delle colonne

Il formato CSV è condiviso da tutti e tre i file.

| Colonna | Obbligatoria | Tipo | Note |
|---|---|---|---|
| `initiative_name` | **SÌ (blocking)** | testo | Nome iniziativa — ogni riga deve averlo |
| `description` | no (info) | testo | Descrizione estesa — usata dal classifier |
| `category` | no (warning) | testo | Categoria/area — segnale per eligibility gate |
| `type` | no (warning) | testo | Tipo/natura — segnale per eligibility gate |
| `amount` | no (warning) | numero | Budget in euro senza simbolo (es. `18500`) |
| `participants` | no (warning) | intero | Partecipanti stimati — usato per REACH e NI |
| `source` | no (warning) | testo | Fonte dato — usato per budget evidence detection |
| `evidence_level` | no (warning) | `L0`/`L1`/`L2`/`L3` | Livello documentale — usato per NI e VR |
| `pillar` | no (info) | `LIFE`/`GROWTH`/`CONNECTION`/`IMPACT`/`LEGACY` | Segnale secondario per classifier |
| `reporting_period` | no (info) | stringa | Es. `2026-Q1` |
| `provider` | no (info) | testo | Fornitore o ente erogatore |
| `budget_class` | no (warning) | vedi sotto | Classe di spesa |
| `hours` | no (info) | numero | Ore erogate (0 se non applicabile) |
| `coverage` | no (info) | intero | Platea potenziale |

### Valori `budget_class` accettati
`welfare` · `fringe_benefit` · `hr_learning` · `esg_volunteering` · `compliance_hse` · `compliance_legal` · `mixed` · `unknown`

### Valori `source` e impatto su evidence detection

| source | Evidence detection | Trattamento BTI |
|---|---|---|
| `Provider export` | → L3 (full_weight) | deepActivation full_weight |
| `Invoice / Consuntivo` | → L3 (full_weight) | deepActivation full_weight |
| `Internal accounting` + L2 in evidence_level | → L2 (confidence 0.72) | deepActivation confidence_weighted |
| `HR declaration` | → L1 (confidence 0.48) | deepActivation confidence_weighted |

---

## Come caricare i file

1. Vai su `/admin/data-intake`
2. Seleziona il **tenant reale** (non OP-001)
3. Sezione **CSV File Upload** → carica il file
4. Premi **"Dry run preview"** — verifica che non ci siano errori
5. Conferma le 4 dichiarazioni di pseudonimizzazione
6. Premi **"Create intake batch"**
7. In UEF Review: imposta `workforcePopulation` con il valore consigliato per il file scelto
8. Approva i record eligible → lancia scoring

---

## Errori comuni

| Errore | Causa | Fix |
|---|---|---|
| `tenantCode is required` | Tenant non selezionato | Seleziona azienda reale prima dell'upload |
| `OP-001 non è un tenant live` | Hai selezionato OP-001 | Usa un tenant reale |
| `pseudonymizationConfirmation` | Checkbox non spuntate | Spunta tutte e 4 le dichiarazioni |
| `initiative_name missing` | Riga senza nome | Ogni riga deve avere `initiative_name` |
| PII guard rejected | Colonna PII rilevata | Non aggiungere colonne con dati individuali |

---

## Runbook completo

Vedi `docs/GOLDEN_PATH_RUNBOOK.md` per il walkthrough operativo passo-passo.

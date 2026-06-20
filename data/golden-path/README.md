# KORA Golden Path — Sample Upload Files

## A cosa servono

Questa cartella contiene **tre file CSV di calibrazione** per testare e dimostrare il flusso operativo end-to-end di KORA Foundation Light su tenant reali.

**Nessun file contiene dati reali.**  
**Nessun file contiene dati sensibili.**  
**Nessuno usa OP-001.**  
**Sono campioni tecnici — non benchmark empirici validati.**

---

## I tre dataset

| File | Scenario | KORA Index v2.0 — Foundation Light | Score band (v2.0) | workforcePopulation |
|---|---|---|---|---|
| `kora_weak_company_upload.csv` | Azienda debole | **30.73** — CS 69, Safeguard FLAGGED | Attivazione debole (0–30) | 100 |
| `kora_average_company_upload.csv` | Azienda media | **43.42** — CS 73, Safeguard CLEAR | Attivazione iniziale (30–45) | 150 |
| `kora_golden_path_upload.csv` | Golden path | **52.53** — CS 76, Safeguard CLEAR | In sviluppo (45–60) | 300 |

**Regime: Foundation Light v2.0** — dati per-programma. EQW (equità inter-worker) e EQS (equità per dipartimento) sono `insufficient_data` perché richiedono dati per-lavoratore (Pilot+). EQUITY plafonata strutturalmente. NM (sforzo/attualità/ripetizione) gira neutro: i CSV non hanno le colonne `hours`, `event_date`, `b6_repetition_count` (voce P1 BACKLOG — attivare in intake per sbloccare NM).

**Potenziale stimato in Pilot+** (dati per-lavoratore, EQW+EQS attivi): WEAK ≈ 38, AVERAGE ≈ 51, GOLDEN ≈ 60 — stime provvisorie, da validare sui pilota.

> **Disclaimer**: i punteggi sono verificati con il motore reale (`runKoraPipeline`) in fase **pre_empirical_calibration**. Non rappresentano benchmark empirici validati né standard di settore. I pesi e le soglie sono provvisori (v0.1) e soggetti a revisione dopo la calibrazione empirica (Delphi Study).

> **Nota su EQUITY**: i CSV non contengono colonne dipartimento o sede. EQW e EQS risultano sempre `insufficient_data` → contribuiscono 0 (tetto, non redistribuzione). PC e PB calcolati sull'IU distribution reale. Comportamento atteso del motore v2.0 (Sprint 1 IU-centric, rebalance rimosso).

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

### Macroblock verificati (motore v2.0 — Foundation Light, workforce=100)

| Macroblock | Valore v2.0 | Note |
|---|---|---|
| REACH | 38.0 | MAR sotto soglia CLEAR → Safeguard FLAGGED |
| QUALITY | 18.5 | IU-centric (EVQ/INT/CONT) — fonte dati per-programma, INT basso |
| EQUITY | 26.8 | EQW=0 (insuff.) + EQS=0 (insuff.) + PC=40 + PB=67 — tetto strutturale FL |
| BTI | 45.0 | Blocked compliance generano buon complianceClarity signal |
| **KORA Index** | **30.73** | Band: **Attivazione debole** (0–30) · MC [28.9–30.9–32.8] |
| Confidence Score | 69 | CS esterno al KORA Index |

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

### Macroblock verificati (motore v2.0 — Foundation Light, workforce=150)

| Macroblock | Valore v2.0 | Note |
|---|---|---|
| REACH | 54.1 | AR≈0.63, MAR≈0.48 — Safeguard CLEAR |
| QUALITY | 25.6 | IU-centric — INT basso (11 eligible su 150 workforce), CO=0 (mono-periodo) |
| EQUITY | 43.3 | EQW=0 (insuff.) + EQS=0 (insuff.) + PC=80 + PB=93 |
| BTI | 57.0 | Mix L1/L2/L3, relief ratio moderato |
| **KORA Index** | **43.42** | Band: **Attivazione iniziale** (30–45) · MC [41.6–43.6–45.5] |
| Confidence Score | 73 | CS esterno al KORA Index |

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

### Macroblock verificati (motore v2.0 — Foundation Light, workforce=300)

| Macroblock | Valore v2.0 | Note |
|---|---|---|
| REACH | 78.3 | Smart Working Policy (200 pax) domina il bounded_estimate |
| QUALITY | 21.5 | IU-centric — INT molto basso (18 eligible su 300 workforce), CO=0 (mono-periodo) |
| EQUITY | 50.0 | EQW=0 (insuff.) + EQS=0 (insuff.) + PC=100 + PB=100 — tetto FL = 50 |
| BTI | 70.0 | 2 L3 eligible (Provider export/Invoice), 1 limited, 1 blocked |
| **KORA Index** | **52.53** | Band: **In sviluppo** (45–60) · MC [50.7–52.7–54.6] |
| Confidence Score | 76 | CS esterno al KORA Index |

### Nota sulla discrepanza README originale

Il README originale indicava "16 eligible, 2 review_required". B107+B108-B confermano: **18 eligible, 0 review_required**. Il file non è stato modificato.

---

## Bande di interpretazione del KORA Index (v2.0)

Soglie definite in `data/methodology/methodology-config.json["score_bands"]` — fonte canonica unica.
Orientative e non sostitutive dell'analisi contestuale di CS e Activation Safeguard.
Pre_empirical_calibration — soglie provvisorie, da calibrare post-Delphi Study.

| KORA Index | Banda | Regime FL — nota strutturale |
|---|---|---|
| 0–30 | **Attivazione debole** | EQW/EQS assenti → EQUITY strutturalmente bassa |
| 30–45 | **Attivazione iniziale** | Tetto FL ≈ 62 (EQW+EQS insufficient_data). Pilot+ sposta +8–12 pts |
| 45–60 | **In sviluppo** | QUALITY bassa se INT < 0.3 (pochi worker attivi su forza lavoro grande) |
| 60–75 | **Solida** | Raggiungibile in FL con forza lavoro piccola o alta activation density |
| 75–100 | **Matura / leader** | Praticabile solo in Pilot+ con EQW+EQS attivi |

> Leggere sempre insieme a: Confidence Score (CS), Activation Safeguard (CLEAR/WARNING/FLAGGED), regime (Foundation Light / Pilot+), e `calibration_status = pre_empirical_calibration`.

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

# KORA Golden Path — Sample Upload File

## A cosa serve

`kora_golden_path_upload.csv` è un file di esempio **fittizio** creato per testare e dimostrare il flusso operativo end-to-end di KORA Foundation Light su un tenant reale.

**Non è un file cliente reale.**  
**Non contiene dati sensibili.**  
**Non usa OP-001.**

Scopo: permettere a un KORA_ADMIN di eseguire il Golden Path completo (upload → UEF Review → scoring → Decision Pack) senza dover improvvisare dati.

---

## Struttura del file

Il file CSV usa:
- **Delimiter**: virgola (`,`)
- **Encoding**: UTF-8
- **Righe dati**: 20
- **Header**: prima riga

---

## Colonne

| Colonna | Obbligatoria | Tipo | Valori ammessi / Note |
|---|---|---|---|
| `initiative_name` | **SÌ (blocking)** | testo | Nome dell'iniziativa. Ogni riga deve averlo. |
| `description` | no (info) | testo | Descrizione estesa |
| `category` | no (warning) | testo | Categoria/area dell'iniziativa — usata dal classifier |
| `type` | no (warning) | testo | Tipo/natura — usato dal classifier |
| `amount` | no (warning) | numero | Budget in euro (es. `18500`) — usato per BTI |
| `participants` | no (warning) | intero | Numero partecipanti stimati |
| `source` | no (warning) | testo | Fonte del dato (es. `HR declaration`, `Provider export`) |
| `evidence_level` | no (warning) | `L0`/`L1`/`L2`/`L3` | Livello di evidenza documentale |
| `pillar` | no (info) | `LIFE`/`GROWTH`/`CONNECTION`/`IMPACT`/`LEGACY` | Pillar KORA — segnale secondario per il classifier |
| `reporting_period` | no (info) | stringa | Es. `2026-Q1`, `2026-H1` |
| `provider` | no (info) | testo | Fornitore o ente erogatore |
| `budget_class` | no (warning) | vedi sotto | Classe di spesa |
| `hours` | no (info) | numero | Ore erogate (0 se non applicabile) |
| `coverage` | no (info) | intero | Platea potenziale (numero dipendenti eleggibili) |

### Valori `budget_class` accettati:
- `welfare`
- `fringe_benefit`
- `hr_learning`
- `esg_volunteering`
- `compliance_hse`
- `mixed`
- `unknown`

### Valori `evidence_level`:
- `L0` — nessuna evidenza documentale
- `L1` — auto-dichiarato / spreadsheet
- `L2` — documento interno
- `L3` — export terze parti / verificato

---

## Contenuto del sample

Il file copre tutti e 5 i pillar KORA:

| Pillar | N. iniziative | Tipo |
|---|---|---|
| **GROWTH** | 4 | Upskilling, Academy AI, Coaching, Leadership — tutte **eligible** |
| **LIFE** | 6 | Mental health, Palestra, Smart working, Prevenzione, Congedo, Buoni pasto |
| **LEGACY** | 3 | Mentoring generazionale, Previdenza complementare, Educazione finanziaria |
| **IMPACT** | 3 | Volontariato, Scuola-lavoro, Progetto sociale |
| **CONNECTION** | 3 | Inclusione, Peer support, Community interna |

### Eligibility attesa (classificata automaticamente dal motore):
- **Eligible**: 16 iniziative — programmi volontari a valore aggiunto
- **Limited**: 1 iniziativa — Buoni pasto (meal voucher → Limited by design)
- **Blocked**: 1 iniziativa — Formazione antincendio obbligatoria (D.Lgs 81 → Blocked by design)
- **Review required**: 2 iniziative — casi ambigui classificati in review

---

## Come caricarlo

1. Vai su `/admin/data-intake`
2. Seleziona il **tenant reale** (non OP-001) dal selettore azienda
3. Sezione **CSV File Upload**
4. Carica `kora_golden_path_upload.csv`
5. Premi **"Dry run preview"** — verifica che non ci siano errori
6. Conferma le 4 dichiarazioni di pseudonimizzazione
7. Premi **"Create intake batch"**
8. Segui il link **"→ Genera candidati UEF"**

---

## Cosa aspettarsi dopo l'upload

Risposta accept:
```json
{
  "ok": true,
  "batchId": "...",
  "rowCount": 20,
  "eligibilitySummary": {
    "eligible": 16,
    "limited": 1,
    "blocked": 1,
    "review": 2
  },
  "batchStatus": "pending"
}
```

---

## Errori comuni

| Errore | Causa | Fix |
|---|---|---|
| `tenantCode is required` | Tenant non selezionato | Seleziona un'azienda reale prima dell'upload |
| `OP-001 non è un tenant live` | Hai selezionato OP-001 | Usa un tenant reale creato con il provisioning |
| `pseudonymizationConfirmation` | Checkbox non spuntate | Spunta tutte e 4 le dichiarazioni di pseudonimizzazione |
| `File too large` | File > 10 MB | Il sample è ~2 KB — non dovrebbe accadere |
| `Too many rows` | Limite è 500 righe | Il sample ha 20 righe — non dovrebbe accadere |
| `EMPTY_HEADERS` | File corrotto o encoding sbagliato | Aprire con editor, salvare come UTF-8 CSV |
| `initiative_name missing` | Riga senza nome iniziativa | Ogni riga deve avere `initiative_name` |
| PII guard rejected | Colonna rilevata come PII (email, CF, telefono) | Non aggiungere colonne con dati individuali |

---

## Note

- Il file usa dati **inventati** — nomi aziende e fornitori sono fittizi
- I valori `amount` sono in euro, senza simbolo (es. `18500`, non `€18.500`)
- Il campo `hours` = `0` per iniziative non formative (non è un errore)
- Il campo `coverage` = `200` è la platea potenziale massima (fittizia)
- Per uno scoring significativo, imposta `workforcePopulation ≥ 10` in UEF Review

---

## Runbook completo

Vedi `docs/GOLDEN_PATH_RUNBOOK.md` per il walkthrough operativo passo-passo.

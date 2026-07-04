# KORA Foundation Light — Golden Path Runbook

**Versione**: B103  
**Per**: KORA_ADMIN  
**Scope**: Dimostrare KORA Foundation Light su un tenant reale, dalla creazione dell'azienda al Decision Pack.

---

## Risposta alla domanda guida

> "Posso prendere un file esempio, caricarlo su un tenant reale, generare UEF, approvare, lanciare scoring, aprire Decision Pack e mostrare l'output senza dover indovinare i passaggi?"

**Sì. Questo runbook ti guida passo-passo.**

---

## Versioning canonico

In ogni output KORA Foundation Light devi vedere:

| Campo | Valore |
|---|---|
| Product version | **KORA Foundation Light** |
| Methodology version | **KORA Index v1.0** |
| Calibration status | **pre_empirical_calibration** |

Se vedi `v0.1`, `v3`, `Foundation Light v0.1`, o `KORA Index v3` nelle superfici visibili — è un bug da segnalare.

---

## Percorso pilota attuale

Il percorso cliente reale oggi è **service-assisted**, non self-service: KORA_ADMIN
esegue l'intake, la review UEF, l'approvazione, lo scoring e la generazione del
Decision Pack per conto del tenant. Il COMPANY_ADMIN accede in sola visualizzazione
al proprio workspace — non carica dati, non approva UEF, non lancia scoring.

**KORA Link è congelato** — non fa parte del percorso pilota corrente. Nessuno step
di questo runbook dipende da KORA Link.

Vedi anche "Pilot Readiness Status" in fondo a questo documento per lo stato di
verifica automatizzata (E2E) del percorso.

---

## Prerequisiti

Prima di iniziare, verifica:

- [ ] Deploy Vercel aggiornato (branch `main` deployato)
- [ ] Supabase configurato (URL + ANON KEY + SERVICE_ROLE_KEY in `.env.local`)
- [ ] Sei loggato come **KORA_ADMIN** su `/admin/login`
- [ ] Il tuo account ha `kora_role = KORA_ADMIN` in `app_metadata` Supabase
- [ ] Il file sample è disponibile: `data/golden-path/kora_golden_path_upload.csv`
- [ ] **Non usare OP-001** — è riservato alla demo sintetica

---

## Step 1 — Crea un'azienda test reale

**URL**: `/admin/companies`

1. Clicca **"Provision new company"** (o link equivalente)
2. Compila:
   - **Company name**: es. `Acme S.r.l. - TEST`
   - **Tenant code**: es. `ACME-TST` (maiuscolo, senza spazi)
   - **Admin email**: usa un'email reale a cui hai accesso (serve per il login aziendale)
3. Premi **"Provision"**
4. Verifica la risposta:
   ```
   ok: true
   tenantCode: ACME-TST
   message: Tenant e utente creati correttamente
   ```
5. **Verifica che il tenant code NON sia `OP-001`**

**Risultato atteso**: tenant creato in `analytics.tenant`, invito email inviato all'admin aziendale.

**Errore possibile**: `Tenant already exists` → usa un tenant code diverso o vai direttamente allo step 2.

---

## Step 2 — Diagnostica iniziale

**URL**: `/admin/live-spine-diagnostics`

1. Apri la pagina
2. Trova il tenant appena creato (`ACME-TST`)
3. Verifica lo stato:
   - `NO_BATCH` → normale per tenant nuovo
   - `NO_DATA` → batch esiste ma file non ancora caricato
   - `NEEDS_REVIEW` → UEF candidati generati ma non ancora approvati
   - `READY` → tutto pronto per lo scoring

**Stato atteso dopo Step 1**: `NO_BATCH` con nextAction "Carica dati via /admin/data-intake"

**Cosa significa ogni stato**:
| Stato | Significato | Azione |
|---|---|---|
| `NO_BATCH` | Nessun file caricato ancora | Vai a Data Intake Studio |
| `NO_DATA` | Batch creato ma record mancanti | Controlla accept o ricarica file |
| `NEEDS_REVIEW` | UEF candidati in attesa di review | Vai a UEF Review → approva |
| `READY` | UEF approvati, pronto per scoring | Vai a UEF Review → Run Scoring |

---

## Step 3 — Upload del file sample

**URL**: `/admin/data-intake`

**File da usare**: `data/golden-path/kora_golden_path_upload.csv`

### 3a. Seleziona il tenant

1. Nella sezione **"Selezione azienda"**, scegli `ACME-TST` dal dropdown o inserisci il tenant code manualmente
2. Verifica che **non appaia il warning** "Synthetic demo tenant — non usare per dati reali"
3. Se appare quel warning → stai usando OP-001, cambia tenant

### 3b. Selezione periodo

1. Lascia il periodo come `2026-Q1` (o seleziona quello appropriato)

### 3c. Upload CSV

1. Sezione **"CSV File Upload"**
2. Clicca **"Scegli file"** e seleziona `kora_golden_path_upload.csv`
3. Premi **"Dry run preview"**

**Risultato atteso**:
```
✓ Preview OK
Righe: 20
Eligible: ~18 | Limited: ~1 | Blocked: ~1 | Review: ~0
Nessun errore bloccante
```

**Errore "BLOCKING" su initiative_name**: qualche riga non ha il nome iniziativa → controlla che il CSV non sia corrotto.

### 3d. Metadati finanziari (opzionale ma consigliato)

Compila prima di accettare:
- **Fonte finanziaria**: `HR declaration` (o `Provider export` se hai dati da fornitore)
- **Evidence level default**: `L1`
- **Ambito budget**: `mixed`
- **Il file contiene importi?**: `Sì`

### 3e. Conferma pseudonimizzazione

Spunta **tutte e 4** le checkbox:
- [ ] Il file non contiene nomi, email, CF, telefoni
- [ ] Gli identificativi sono pseudonimi non reversibili
- [ ] I dati sono per analisi aggregata, non individuale
- [ ] KORA rifiuterà PII dirette

### 3f. Accetta il batch

1. Premi **"Create intake batch"**
2. Attendi la risposta (alcuni secondi)

**Risultato atteso**:
```
✓ Batch creato
batchId: abc123... (8 caratteri mostrati)
status: pending
Eligible: 18 | Limited: 1 | Blocked: 1 | Total: 20
```

**Pulsante successivo visibile**: `→ Genera candidati UEF` — clicca qui.

**Errore `OP-001 non è un tenant live`**: hai selezionato OP-001. Torna allo step 3a.

**Errore `pseudonymizationConfirmation required`**: non hai spuntato tutte le checkbox.

---

## Step 4 — UEF Review

**URL**: `/admin/uef-review?batchId=<ID_DEL_BATCH>`

Il link dal passo precedente porta qui con il `batchId` corretto.

### 4a. Genera candidati UEF

1. Premi **"Genera UEF candidates"** (o pulsante equivalente visibile)
2. Attendi (5-15 secondi per 20 righe)
3. Verifica che compaiano i candidati nella lista

**Risultato atteso**:
```
~16-18 candidati generati
Pillar distribuiti: LIFE, GROWTH, CONNECTION, IMPACT, LEGACY
Eligibility: eligible / limited / blocked / review_required
```

**Se non compaiono candidati**: verifica che il batchId nell'URL corrisponda al batch creato. Apri `/admin/live-spine-diagnostics` e controlla lo stato del tenant.

### 4b. Controlla i candidati

Per ogni candidato visibile:
- **Eligible**: programmi volontari → approvabili
- **Limited**: buoni pasto, voucher → contribuiscono al BTI, non agli IU
- **Blocked**: formazione obbligatoria → 0 IU per design — non approvare per scoring
- **Review required**: caso ambiguo — vai a esaminare manualmente

### 4c. Approva i candidati

**Approvazione massiva (consigliata per test)**:
1. Usa il pulsante **"Approva X record"** (alta confidenza, auto-approval)
2. Oppure approva singolarmente cliccando **"Approva"** su ogni record eligible

**Non approvare i record `blocked`** — sono corretti per design (0 IU).

**Indicatore "✓ Pronto per lo scoring"** appare quando:
- Tutti i record pending sono stati reviewati
- Almeno 1 record è approvato

### 4d. Imposta workforcePopulation

Prima di lanciare lo scoring, inserisci un numero realistico nella casella:

```
workforcePopulation (≥10): 200
```

Usa il numero di dipendenti effettivo del tenant (o 200 per il test con il sample).

### 4e. Lancia lo scoring

1. Premi **"▶ Run scoring from approved UEF"**
2. Attendi (10-20 secondi)

**Risultato atteso**:
```
✓ Decision Pack generated from approved UEF records.
KORA Index: XX.X
Confidence: XX%
Safeguard: CLEAR / WARNING / FLAGGED
AR: XX%  MAR: XX%  UEF count: XX
```

**Errore `No approved UEF records`**: approva almeno un record nel passo 4c.

**Errore `workforcePopulation must be >= 10`**: inserisci un valore ≥ 10 nella casella.

**Safeguard WARNING o FLAGGED**: normale su dataset piccoli o con pochi eligible. Non blocca il Decision Pack — è un segnale diagnostico.

---

## Step 5 — Decision Pack

Dopo lo scoring vengono mostrati due link:

### 5a. HTML Preview

**URL**: `/api/admin/decision-pack/preview?tenantCode=ACME-TST&reportingPeriod=2026-Q1`

Apre il report HTML nel browser.

Verifica:
- [ ] Mostra **KORA Foundation Light** (non v0.1)
- [ ] Mostra **KORA Index v1.0** (non v3)
- [ ] Mostra **pre_empirical_calibration**
- [ ] Il `tenantCode` nell'URL è `ACME-TST` (non OP-001)
- [ ] Il KORA Index ha un valore numerico (es. 42.7)
- [ ] Il Confidence Score è mostrato accanto al KORA Index
- [ ] L'Activation Safeguard (CLEAR/WARNING/FLAGGED) è visibile
- [ ] Sono mostrati tutti i 10 componenti del KORA Index

### 5b. PDF download

**URL**: `/api/admin/decision-pack/pdf?tenantCode=ACME-TST&reportingPeriod=2026-Q1`

Scarica il PDF. Verifica gli stessi elementi dell'HTML Preview.

**Errore `tenantCode is required`**: il link è malformato. Costruiscilo manualmente con il tenant code corretto.

**Errore `No data found for ACME-TST`**: lo scoring non è stato ancora completato. Torna a Step 4e.

---

## Step 6 — Company Workspace (verifica isolamento)

**URL**: `/company/workspace` (dopo login come COMPANY_ADMIN)

L'admin aziendale creato in Step 1 dovrebbe aver ricevuto un'email con il link di accesso.

1. Apri il link nell'email invito
2. Imposta la password
3. Accedi come COMPANY_ADMIN
4. Verifica `/company/workspace`

**Verifica**:
- [ ] Vede **solo** il proprio tenant (`ACME-TST`)
- [ ] NON vede dati di altri tenant
- [ ] NON vede la sezione Admin
- [ ] Vede il KORA Index aggiornato
- [ ] NON vede dati individuali dei lavoratori

---

## Step 7 — Verifica finale Live Spine Diagnostics

**URL**: `/admin/live-spine-diagnostics`

Dopo il Golden Path completato, il tenant `ACME-TST` deve mostrare:
- [ ] `scoringReadiness: READY`
- [ ] `uefApprovedCount: ≥ 1`
- [ ] `lastKoraIndex: [valore numerico]`
- [ ] `lastDecisionPackId: [ID versione]`
- [ ] Nessun warning critico

---

## Checklist finale Golden Path

```
✓ Tenant reale creato (non OP-001)
✓ Upload file accettato (rowCount > 0)
✓ UEF candidati generati
✓ UEF approvati (almeno 1 eligible)
✓ Scoring completato (KORA Index presente)
✓ Decision Pack generato (HTML + PDF)
✓ Decision Pack mostra KORA Foundation Light / KORA Index v1.0 / pre_empirical_calibration
✓ Company workspace mostra solo i dati del proprio tenant
✓ Nessun fallback demo
✓ OP-001 non appare negli output del tenant reale
✓ live-spine-diagnostics mostra lo stato READY
```

---

## Errori comuni e fix

| Errore | Dove | Fix |
|---|---|---|
| `OP-001 non è un tenant live` | Data Intake accept | Seleziona un tenant reale |
| `tenantCode is required` | Decision Pack routes | Aggiungi `?tenantCode=XXX` all'URL |
| `No approved UEF records` | Scoring route | Approva almeno 1 UEF candidato |
| `workforcePopulation must be >= 10` | Scoring | Inserisci `workforcePopulation ≥ 10` nel form |
| `Batch not found` | UEF Review | Verifica che il batchId nell'URL sia corretto |
| `Tenant not found` | Scoring | Il tenant code del batch non esiste in Supabase |
| Decision Pack vuoto o 0.0 | Decision Pack HTML | Nessun UEF eligible approvato — approva record eligible |
| Safeguard `FLAGGED` | UEF Review result | AR o MAR sotto soglia — aumenta i record eligible approvati o il workforcePopulation |

---

## Note operative

- **workforcePopulation** imposta quanti dipendenti ha l'azienda. Influenza AR, MAR, Equity. Per il test usa 200 (stesso valore del campo `coverage` nel sample).
- **Activation Safeguard FLAGGED** non blocca il Decision Pack — è un segnale diagnostico che l'azienda ha bassa attivazione.
- **Confidence Score** è sempre mostrato accanto al KORA Index. Non fa parte del KORA Index (weight = 0).
- **Record Blocked** (es. formazione antincendio) sono corretti per design — generano 0 IU.
- **Record Limited** (es. buoni pasto) contribuiscono al BTI ma non agli IU pillared.
- Il sample file è in `data/golden-path/kora_golden_path_upload.csv`. Vedi `data/golden-path/README.md` per i dettagli.

---

## Interpretare il punteggio Golden Path

### Bande di interpretazione del KORA Index (v1.0)

Soglie definite in `data/methodology/methodology-config.json["score_bands"]` (fonte canonica).
Orientative e non sostitutive dell'analisi contestuale di CS + Safeguard + regime.

| KORA Index | Banda | Note regime Foundation Light |
|---|---|---|
| 0–30 | **Attivazione debole** | Bassa activation density o Safeguard FLAGGED |
| 30–45 | **Attivazione iniziale** | EQW/EQS assenti → tetto FL ≈ 62. Tipico per aziende medie con dati per-programma |
| 45–60 | **In sviluppo** | QUALITY dipende da INT: bassa se pochi worker attivi su forza lavoro grande |
| 60–75 | **Solida** | Raggiungibile in FL con alta activation density o forza lavoro piccola |
| 75–100 | **Matura / leader** | Praticabile in Pilot+ con EQW+EQS attivi. Non accessibile in FL strutturalmente |

> **Disclaimer**: le bande sono stime tecniche in fase `pre_empirical_calibration`. Le soglie sono provvisorie e soggette a revisione dopo la calibrazione empirica (Delphi Study). Non rappresentano benchmark di settore validati.

### Cosa leggere sempre insieme al KORA Index

- **Confidence Score (CS)**: affidabilità del dato. Un KORA Index 60 con CS 40% è molto meno solido di un 55 con CS 80%.
- **Activation Safeguard**: CLEAR / WARNING / FLAGGED. Un punteggio alto con Safeguard FLAGGED segnala un'anomalia strutturale (AR o MAR sotto soglia).
- **Regime (Foundation Light / Pilot+)**: in FL il KORA Index non può superare strutturalmente ≈62. Ogni numero va etichettato con il regime.
- **`calibration_status = pre_empirical_calibration`**: label non sopprimibile — il punteggio è diagnostico, non certificato.
- **NM**: sforzo/attualità/ripetizione girando neutro (=1.0) finché l'intake non porta `hours`, `event_date`, `b6_repetition_count` (voce P1 BACKLOG).

### Dataset di calibrazione disponibili (KORA Index v1.0 — Foundation Light)

Output deterministici verificati da `runKoraPipeline` (b108b-score-smoke-test). Non sono target dichiarati.

| File | Scenario | KORA Index | Banda | CS | Safeguard |
|---|---|---|---|---|---|
| `kora_weak_company_upload.csv` | Azienda debole | **30.73** | Attivazione debole | 69 | FLAGGED |
| `kora_average_company_upload.csv` | Azienda media | **43.42** | Attivazione iniziale | 73 | CLEAR |
| `kora_golden_path_upload.csv` | Golden path | **52.53** | In sviluppo | 76 | CLEAR |

> Nota strutturale: EQW e EQS = `insufficient_data` nei CSV senza dati per-lavoratore → contribuiscono 0 (tetto, non redistribuzione). Il rebalance dei pesi è stato rimosso in Sprint 1 IU-centric. EQUITY non viene gonfiata artificialmente.

Vedi `data/golden-path/README.md` per struttura, eligibility attesa e note metodologiche per ciascun dataset.

---

## Pilot Readiness Status

Stato aggiornato dopo GOLDEN-01 (audit read-only), GOLDEN-02/03B (fixture E2E
autenticate), a valle della Professionalization Sprint.

**Provato manualmente** (walkthrough operatore, questo runbook, non ancora
automatizzato in CI):
- Il percorso end-to-end file/input → UEF → approvazione → scoring → KORA Index
  → Decision Pack è reale e funzionante quando eseguito da KORA_ADMIN.
- `/company/workspace` e `/company/kora-index` mostrano dati live per-tenant,
  senza fallback demo.

**Provato via E2E automatizzato (Playwright, `tests/e2e/authenticated-smoke.spec.ts`)**:
- `A01` — login KORA_ADMIN → `/admin` — **PASS** (eseguito localmente
  dall'operatore con credenziali reali di staging).
- `A02` — login COMPANY_A → `/company/workspace` — **non ancora eseguito**
  (account esistente e già verificato manualmente in una QA precedente, ma non
  ancora tramite questo fixture).
- `A03` — login COMPANY_B → `/company/workspace` — **bloccato**: nessun secondo
  tenant/account COMPANY_ADMIN esiste ancora in staging.
- `A04` — isolamento tenant COMPANY_A vs COMPANY_B — **bloccato** per lo stesso
  motivo di A03.

**GOLDEN-E2E-01 (2026-07-04) — `tests/e2e/golden-admin-company.spec.ts`**, skip-safe,
stesse variabili env di A01/A02 (nessun nome nuovo):
- `G01` — narrativa golden path in un solo test: KORA_ADMIN raggiunge
  `/admin`, poi (contesto browser separato) COMPANY_ADMIN raggiunge
  `/company/workspace` — **non ancora eseguito con credenziali reali**
  (stesso stato di A01/A02: skip-safe by design finché non impostate).
- `G02` — da `/company/workspace`, COMPANY_ADMIN raggiunge
  `/company/kora-index` (prova che la superficie dati/report tenant-scoped è
  raggiungibile, non solo il redirect di login) e viene verificato che la
  pagina non renderizzi un identificativo worker-level
  (`worker_id`/`kora_worker_id`/`token_digest`/`link_id`) né una lista
  implausibile di email — **non ancora eseguito con credenziali reali**.
- Questo file estende A01/A02 oltre il login, ma **non sostituisce** A03/A04
  (isolamento cross-tenant, ancora bloccato dall'assenza di COMPANY_B) né
  prova RLS a livello DB (quello resta `tests/integration/rls-two-tenant-negative.test.ts`,
  RLS-03, già in `main`).

**GOLDEN-E2E-02 (2026-07-04) — `tests/e2e/golden-data-bearing.spec.ts`**, skip-safe,
riusa gli stessi `helpers/{env,roles,auth,privacy}.ts` (una sola variabile
nuova, `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN`, gate esplicito perché mutante —
vedi sotto):
- `GD01` — pilota davvero il percorso data-bearing tramite l'app reale: upload
  di `data/golden-path/kora_golden_path_upload.csv` su `/admin/data-intake`
  (dry-run validate → accept batch), generazione candidati UEF e approvazione
  massiva su `/admin/uef-review`, run scoring, verifica delle label canoniche
  (`KORA Foundation Light` / `KORA Index v1.0` / `pre_empirical_calibration`)
  sulla preview HTML del Decision Pack, poi login COMPANY_ADMIN separato su
  `/company/workspace` e `/company/kora-index` con lo stesso smoke check di
  privacy di G02 — **non ancora eseguito con credenziali reali** (stesso
  stato skip-safe-only di G01/G02 finché le env var non sono impostate).
- Test mutante, non di sola lettura: ogni esecuzione crea un batch reale
  (e UEF/scoring/decision pack a valle) sul tenant puntato da
  `E2E_COMPANY_A_TENANT_CODE`, con un `reportingPeriod` univoco per run per
  evitare il guard anti-duplicato del route di accept. Usare solo un tenant
  di staging sintetico/disponibile, mai un tenant cliente reale.
- **Manual/staging authenticated tests are deferred until the final
  pilot-validation session. GD01 exists as a skip-safe E2E and remains
  implemented-but-not-live-proven until that session.**

**Non ancora provato in nessuna forma:**
- Il golden path completo (upload → UEF → scoring → Decision Pack) ora ha un
  test E2E automatizzato implementato (`golden-data-bearing.spec.ts`,
  GOLDEN-E2E-02) — ma non ancora eseguito con credenziali reali di staging.
  Fino alla prima esecuzione reale, il walkthrough manuale sopra resta l'unica
  prova effettiva.
- Isolamento cross-tenant a livello di RLS/DB tramite E2E autenticato (il
  livello DB diretto è invece provato — vedi RLS-03 sopra).

**KORA Link:** congelato, non fa parte di questo percorso, nessuna dipendenza.

Dettagli completi: `docs/testing-e2e-auth.md`.

---

## Prossimo step consigliato dopo il Golden Path

**B104 — Worker Provisioning Live Foundation**

Dopo aver eseguito almeno una volta il Golden Path con successo, il prossimo sprint apre il provisioning dei worker (My KORA) su tenant reali.

Non aprire B104 finché il Golden Path non è stato completato almeno una volta end-to-end.

---

*KORA Foundation Light · KORA Index v1.0 · pre_empirical_calibration*  
*Runbook B103 — Golden Path Live Trial*

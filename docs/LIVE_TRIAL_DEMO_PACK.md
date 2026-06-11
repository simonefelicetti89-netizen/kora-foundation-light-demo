# KORA Foundation Light — Live Trial Demo Pack

**Versione:** B123  
**Per:** KORA_ADMIN / Founder  
**Durata demo:** 20 minuti  
**Aggiorna:** GOLDEN_PATH_RUNBOOK, WORKER_TRIAL_RUNBOOK, ACCESS_PROVISIONING_DOCTRINE, WORKER_PRIVACY_AND_SHARING  

---

## Risposta alla domanda guida

> "Posso aprire KORA davanti a un potenziale cliente e mostrare il ciclo completo in 20 minuti, con dati trial controllati, ruoli separati e privacy boundary chiaro?"

**Sì. Questo documento ti guida passo per passo, in sequenza esatta.**

---

## Prerequisiti

Prima di aprire KORA davanti a un prospect:

- [ ] Deploy Vercel aggiornato (`main` deployato — verifica su Vercel dashboard)
- [ ] Supabase: migrazioni `007`, `008`, `009`, `010` applicate
- [ ] SMTP configurato in Supabase (Project Settings → Auth → SMTP)
- [ ] Account **KORA_ADMIN** attivo (`kora_role = KORA_ADMIN` in `app_metadata`)
- [ ] Account **COMPANY_ADMIN** su tenant trial già creato
- [ ] Account **WORKER** su tenant trial già provisionato e onboarding completato
- [ ] File golden path disponibile: `data/golden-path/kora_golden_path_upload.csv`
- [ ] Iniziative worker pubblicate su tenant trial
- [ ] `Trial Control Center` consultato: `/admin/trial-control-center`

**Tenant trial canonico:** `KORA-TRIAL` (da `data/worker-trial/worker_trial_seed.json`)  
**Non usare OP-001** — è riservato alla demo sintetica standalone, non al ciclo live.

---

## Account da preparare prima della demo

| Ruolo | Come creare | Path di accesso |
|---|---|---|
| KORA_ADMIN | Supabase Auth + `app_metadata.kora_role = KORA_ADMIN` | `/admin/login` |
| COMPANY_ADMIN | `/api/admin/companies/provision` (da KORA_ADMIN) | `/login` |
| WORKER | `/api/admin/workers/provision` (da KORA_ADMIN) | `/login` |

**Regola assoluta:** nessun self-signup. Ogni account è provisionato da KORA_ADMIN.  
Il primo login di ogni account è attivazione dell'identità già provisionate.

---

## Dataset da usare

| Dataset | File | Quando |
|---|---|---|
| Golden path CSV | `data/golden-path/kora_golden_path_upload.csv` | Step 3 — Data Intake |
| Worker seed | `data/worker-trial/worker_trial_seed.json` | Riferimento per provisioning workers |

---

## Script narrativo — 20 minuti

### [MIN 00–02] Il problema

> "Le aziende italiane spendono ogni anno decine di milioni in welfare, formazione e iniziative people. Eppure non sanno cosa succede dopo la spesa. Non sanno chi ha partecipato, quale impatto c'è stato sull'organizzazione, o se i soldi sono stati investiti bene."
>
> "KORA è la prima piattaforma che misura l'attivazione organizzativa — non gli individui — trasformando dati eterogenei in intelligenza spiegabile e privacy-safe."

**Mostra:** `/login` — il login unico, niente self-signup, identità già provisionate.

---

### [MIN 02–05] Data Intake — il dato entra in KORA

> "Partiamo dall'azienda. L'HR carica un file con le iniziative people: welfare, formazione, volontariato, mentoring. KORA classifica automaticamente ogni azione nei 5 pillar del modello."

**Mostra:** `/admin/data-intake`

1. Carica `kora_golden_path_upload.csv`
2. Mostra la classificazione automatica per pillar (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY)
3. Mostra il mapping confidence score
4. Non hardcodare spiegazioni — lascia parlare l'interfaccia

**Proof point:** "Classificazione rule-based, senza LLM su dati HR. Privacy-first by design."

---

### [MIN 05–08] UEF Review & Scoring

> "KORA non usa i dati grezzi direttamente. Li trasforma in UEF — Unified Event Frames — record strutturati e verificabili. Un HR manager rivede e approva prima che entrino nello scoring."

**Mostra:** `/admin/uef-review`

1. Mostra i candidati UEF
2. Approva qualcuno
3. Lancia lo scoring

> "Lo scoring è deterministico e spiegabile. Ogni componente del KORA Index è calcolato con formula trasparente, letta da una configurazione metodologica versionata."

**Proof point:** "Methodology version ID su ogni output. Pre-empirical calibration dichiarata. Nessuna black box."

---

### [MIN 08–12] KORA Index — l'intelligence organizzativa

> "Questo è il cuore di KORA. Non un singolo numero — un sistema di 10 componenti che misura l'attivazione da angolature diverse."

**Mostra:** `/company/kora-index` (loggato come COMPANY_ADMIN)

1. Mostra il valore KORA Index + Confidence Score (sempre insieme)
2. Mostra l'Activation Safeguard (CLEAR / WARNING / FLAGGED)
3. Mostra i 4 macro-blocchi: Activation Reach, Quality, Distribution & Equity, Budget-to-Human-Impact
4. Clicca su un componente per l'explainability

> "L'azienda non vede mai dati individuali. Solo medie aggregate anonime. I dati sotto soglia (gruppi < 10 worker) sono automaticamente soppressi."

**Mostra:** privacy boundary in action — nessun nome, nessun dato individuale.

---

### [MIN 12–14] Decision Pack & Wallboard

> "L'output operativo per il board. Raccomandazioni chiare, next actions, evidence debt."

**Mostra:** `/company/reports` → Decision Pack

1. Mostra il report generato
2. Mostra le raccomandazioni pillar
3. Mostra l'Evidence Debt section se disponibile

**Mostra:** `/company/wallboard`

> "Il wallboard permette all'azienda di comunicare internamente i risultati in modo aggregato e privacy-safe. Nessun singolo lavoratore identificato."

---

### [MIN 14–17] Worker — lo spazio privato

> "Ora entriamo nello spazio del lavoratore. Qui la prospettiva si ribalta completamente."

**Mostra:** `/worker/workspace` (loggato come WORKER)

1. Mostra il badge "Spazio privato attivo"
2. Mostra le iniziative disponibili
3. Esprimi interesse su una iniziativa

**Mostra:** `/worker/dynamic-cv`

> "Ogni lavoratore ha un CV dinamico privato, costruito automaticamente dalle sue partecipazioni. Il datore di lavoro non lo vede mai. È sempre sotto il controllo del lavoratore."

**Mostra:** `/worker/privacy`

> "Questo pannello rende esplicito il confine: cosa è privato, cosa viene aggregato, cosa il lavoratore potrà condividere in futuro sotto il suo controllo."

**Mostra:** `/worker/opportunities`

> "I partner KORA sono collegati ai pillar. Un worker che vuole sviluppare GROWTH trova opportunità di formazione. KORA non traccia i click — non c'è sorveglianza individuale."

---

### [MIN 17–19] Privacy proof points

> "Torniamo all'azienda per chiudere il cerchio sulla privacy."

**Mostra:** `/company/workspace` (come COMPANY_ADMIN)

Punti da toccare:
- L'azienda vede solo medie aggregate
- I gruppi sotto 10 worker sono soppressi con PrivacyBoundaryNotice
- Nessun nome, nessun worker_id, nessuna email individuale
- Il Dynamic Impact CV del worker non è accessibile da nessun path aziendale

---

### [MIN 19–20] Close

> "KORA è la risposta alla domanda che ogni CFO e CHRO dovrebbe fare: qual è il ritorno umano del budget people? Budget-to-human-impact, privacy-first, metodologia spiegabile."
>
> "Foundation Light è una piattaforma diagnostica pilota, su dati reali del vostro tenant. Non certificata, non regulatory-grade — ma la prima volta che potete vedere questa intelligenza organizzativa con i vostri dati."

---

## Step-by-step operativo

### Preparazione (da fare PRIMA della demo — non in live)

1. Verifica `/admin/trial-control-center` — tutti i check devono essere verdi o parziali
2. Assicurati di avere 3 finestre browser aperte e autenticate:
   - Finestra A: KORA_ADMIN → `/admin/login`
   - Finestra B: COMPANY_ADMIN → `/login`
   - Finestra C: WORKER → `/login`
3. Verifica che il tenant trial abbia almeno:
   - 1 batch dati caricato e UEF approvati
   - 1 scoring eseguito (KORA Index visibile)
   - 1 Decision Pack generato
   - Almeno 1 worker attivo con onboarding completato
   - Almeno 1 iniziativa pubblicata
   - Se possibile: almeno 1 partner pubblicato nel catalogo

### Durante la demo

| Step | Finestra | URL | Durata |
|---|---|---|---|
| Problema + login | A (Admin) | `/login` | 2 min |
| Data Intake | A (Admin) | `/admin/data-intake` | 3 min |
| UEF Review + Scoring | A (Admin) | `/admin/uef-review` | 3 min |
| KORA Index | B (Company) | `/company/kora-index` | 4 min |
| Decision Pack + Wallboard | B (Company) | `/company/reports`, `/company/wallboard` | 2 min |
| Worker space | C (Worker) | `/worker/workspace` | 2 min |
| Worker CV + Privacy | C (Worker) | `/worker/dynamic-cv`, `/worker/privacy` | 1 min |
| Privacy proof | B (Company) | `/company/workspace` | 1 min |
| Close | — | — | 2 min |

---

## Privacy proof points da mostrare esplicitamente

1. **Azienda non vede individui:** `/company/workspace` — nessun nome worker
2. **Soglia privacy:** qualsiasi segmento < 10 worker → PrivacyBoundaryNotice
3. **Worker CV privato:** `/worker/dynamic-cv` — banner "Il tuo datore di lavoro non vede questo CV"
4. **Privacy settings:** `/worker/privacy` — lista esplicita cosa è privato vs aggregato
5. **Click partner non tracciati:** `/worker/opportunities` — "KORA non traccia questo click"
6. **No self-signup:** `/request-access` — "KORA non registra utenti pubblici"

---

## Cosa NON dire

| Da evitare | Perché |
|---|---|
| "Traccia i lavoratori" | KORA misura organizzazioni, non individui |
| "Score individuale" | Non esiste. KORA Index è company-level |
| "AI predittiva" | Non c'è motore predittivo in Foundation Light |
| "Dashboard HR" | KORA è intelligence organizzativa, non HR tool |
| "ESG garantito" | KORA supporta la rendicontazione, non garantisce conformità |
| "Calibrato empiricamente" | Siamo pre-empirical-calibration — dichiararlo è un punto di forza, non una debolezza |

---

## Foundation Light — Limitations da dichiarare

| Limitazione | Come presentarla |
|---|---|
| Pre-empirical calibration | "I pesi sono provvisori — la calibrazione Delphi avviene post-pilot" |
| No LLM su dati HR | "Classificazione rule-based — non c'è rischio di data exfiltration verso LLM esterni" |
| No export PDF automatico | "Il Decision Pack è visualizzabile a schermo — export pianificato per la prossima versione" |
| No sharing CV attivo | "La condivisione del CV worker sarà attivabile con consenso esplicito nella versione successiva" |
| No partner marketplace | "Il catalogo partner è informativo — booking e transazioni sono post-pilot" |
| Data sintetica OP-001 | "OP-001 è solo per demo standalone — il pilot usa dati reali del vostro tenant" |

---

## Troubleshooting

### Problema: nessun tenant appare in Trial Control Center
→ Verifica che almeno un tenant sia `is_active = true` in `analytics.tenant`  
→ Crea un tenant via `/admin/companies/new`

### Problema: UEF candidati 0 dopo upload
→ Controlla il formato del CSV: usa `data/golden-path/kora_golden_path_upload.csv` come riferimento  
→ Verifica che le colonne siano mappate correttamente nel mapping review

### Problema: scoring non si avvia
→ Serve almeno 1 UEF con `review_status = approved`  
→ Approva manualmente un record in `/admin/uef-review` prima di lanciare lo scoring

### Problema: worker non vede iniziative
→ Verifica che le iniziative abbiano `status = published` per il tenant corretto  
→ Gestisci via `/admin/worker-initiatives`

### Problema: Dynamic CV vuoto
→ Il worker deve avere almeno 1 partecipazione registrata (status ≠ cancelled)  
→ Crea partecipazione via worker space o via API admin

### Problema: Decision Pack non appare
→ Lo scoring deve completarsi con successo prima che il Decision Pack sia generabile  
→ Verifica in `/admin/uef-review` che lo scoring sia andato a buon fine

### Problema: azienda vede PrivacyBoundaryNotice ovunque
→ Il tenant ha meno di 10 worker — la soglia `SAFE_AGGREGATION_THRESHOLD = 10` è attiva  
→ Provisiona almeno 10 worker per il tenant trial prima della demo

---

## Fonti consolidate

Questo documento unifica:
- `docs/GOLDEN_PATH_RUNBOOK.md` — data pipeline company
- `docs/WORKER_TRIAL_RUNBOOK.md` — worker circuit end-to-end
- `docs/ACCESS_PROVISIONING_DOCTRINE.md` — provisioning model e no-self-signup
- `docs/WORKER_PRIVACY_AND_SHARING.md` — privacy boundary worker

Per la metodologia: `docs/10-architecture-v3-layer-specification.md`  
Per la build cutline: `docs/22A-foundation-light-demo-build-cutline.md`  
Per la governance output: `docs/21b-methodology-risk-acceptance-and-provisional-score-policy.md`

---

## Checklist pre-demo finale (30 minuti prima)

- [ ] Trial Control Center — tutti i check critici verdi
- [ ] 3 finestre browser autenticate (Admin, Company, Worker)
- [ ] Tenant trial ha KORA Index calcolato
- [ ] Tenant trial ha Decision Pack generato
- [ ] Almeno 1 worker con onboarding completato
- [ ] Almeno 1 iniziativa pubblicata
- [ ] Network: connessione stabile verificata
- [ ] Non ci sono sessioni attive di altri utenti sullo stesso tenant

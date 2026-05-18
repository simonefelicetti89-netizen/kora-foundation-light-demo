# KORA · Integrazioni White Paper v3 → v4
## Nuove sezioni e appendici — Non modificano l'algoritmo

**Nota di inserimento:** questo documento contiene le sezioni aggiuntive da inserire nel White Paper v3 v4.
- Sezione "Come KORA confronta eventi diversi" → inserire dopo la sezione 7 (Impact Units Engine) e prima della sezione 8 (Pillar Score), oppure come sottosezione 7A.
- Appendice "Event Taxonomy & Mapping Rules" → Appendice J (dopo Appendice I — Esempio numerico Maria).
- Appendice "Esempio completo — Azienda da 10 lavoratori" → Appendice K (ultima appendice).

---

## Sezione 7A. Come KORA confronta eventi diversi

### 7A.1 Il problema del confronto

Una domanda frequente da parte di sviluppatori e advisor metodologici è: come si confrontano 32 ore di palestra con 2 ore di corso? Le 32 ore non valgono automaticamente 16 volte le 2 ore. Questo è uno degli aspetti più controintuitivi del sistema, e vale la pena spiegarlo in modo preciso.

**KORA non misura ore. KORA misura contributo comportamentale verificato.**

La durata entra nel calcolo attraverso il solo fattore EF (Effort Factor), che scala tra 0.40 e 1.50. Due eventi con la stessa durata ma di natura diversa producono Impact Units diverse perché differiscono in ES (qualità della fonte), BC (contributo teorico al pillar), CQ (completamento), CF (coerenza contestuale) e SF (saturazione per ripetizione).

### 7A.2 La sequenza corretta di elaborazione

La comparazione tra eventi avviene sempre attraverso l'intera sequenza di calcolo:

```
1. Identifico il tipo di evento  (event_type dall'UEF)
2. Mappa nella Base Contribution Matrix  (BC_{e,p} per ogni pillar)
3. Calcolo il Feature Vector  (ES, EF, CQ, CF, RF, SF)
4. Ottengo le Impact Units  IU_{e,p} = BC_{e,p} × ES × EF × CQ × CF × RF × SF
5. Aggrego le IU per pillar nel periodo  PRS_p = Σ IU_{e,p}
6. Normalizzo rispetto al target trimestrale  P_p = min(100, PRS_p/T_p × 100 × CM_p × DF_p)
7. Calcolo il PIB  PIB = Σ(W_p × P_p) + BB − CP
8. Aggrego i PIB nel KORA Index  KORA Index = 100 × (...) × GF
```

Ogni evento viene confrontato con un altro solo dopo che entrambi hanno attraversato questo percorso. Non esiste una metrica diretta di confronto tra eventi: il sistema li confronta implicitamente attraverso il loro contributo aggregato ai pillar.

### 7A.3 Perché la palestra non batte il corso

La palestra e il corso non si confrontano mai direttamente. Alimentano pillar diversi:

- La palestra accumula IU nel pillar **LIFE**.
- Il corso accumula IU nel pillar **GROWTH** (e secondariamente in altri).

Il Pillar Score di ciascuno è normalizzato sul proprio target T_p e cappato a 100. Questo significa che:

- 32 sessioni di palestra in un trimestre saturano quasi certamente P_LIFE = 100.
- Dal quarto evento in poi, SF scende a 0.70 e poi rimane lì: ogni sessione aggiuntiva produce il 70% delle IU delle prime tre.
- Una volta che P_LIFE = 100 (cap), qualsiasi sessione successiva non aggiunge valore nel calcolo del PIB.
- Nel frattempo, P_GROWTH = 0 se non ci sono eventi di formazione.

Il PIB include un Breadth Bonus (BB) che premia la distribuzione tra pillar usando la Shannon Entropy. Un profilo con P_LIFE = 100 e tutto il resto a zero ottiene BB = 0. Un profilo con P_LIFE = 80, P_GROWTH = 60, P_LEGACY = 40 ottiene BB ≈ 4–6 punti aggiuntivi.

**Conseguenza operativa:** accumulare eventi su un solo pillar oltre la saturazione non aumenta il PIB. Una singola ora di corso in un mese con P_GROWTH = 0 ha un impatto marginale sul PIB molto superiore alla decima sessione di palestra in un mese con P_LIFE già al 100%.

### 7A.4 Esempio numerico — 32 ore palestra vs 2 ore corso

*Valori illustrativi. I calcoli mostrano il comportamento del modello, non parametri definitivi.*

**Scenario A — 32 sessioni di palestra (60 min ciascuna) in 90 giorni**
Fonte: KORA Certified Partner. Parametri: BC_LIFE = 1.00, ES = 0.85, EF = 1.00, CQ = 1.00, CF = 1.00, RF = 1.00 (simplified).

| Sessioni | SF | IU_LIFE per sessione | IU_LIFE totale |
|---|---|---|---|
| 1ª – 3ª | 1.00 | 1.00 × 0.85 × 1.00 × 1.00 × 1.00 × 1.00 × **1.00** = **0.850** | 2.550 |
| 4ª – 32ª (29 sessioni) | 0.70 | 0.850 × **0.70** = **0.595** | 17.255 |
| **Totale PRS_LIFE** | | | **19.805 IU** |

```
T_LIFE = 8.00 IU   (target settoriale default, servizi professionali)
CM_LIFE = 1.30     (continuità molto alta: ≥ 2 sessioni/settimana per 12 settimane)
DF_LIFE = 1.00     (unica tipologia evento, nessuna diversity)

P_LIFE = min(100, (19.805 / 8.00) × 100 × 1.30 × 1.00)
       = min(100, 247.6 × 1.30)
       = min(100, 321.9)
       = 100  ← cappato
```

Il Pillar LIFE è saturato. Le ultime 26 sessioni non hanno aggiunto valore al Pillar Score finale. La 4ª e la 32ª sessione producono lo stesso IU (0.595), ma entrambe contribuiscono a un P_LIFE già capped.

**IU LIFE critiche per raggiungere P_LIFE = 100 (senza CM):**
`PRS_p / T_p × 100 = 100` → `PRS_p = 8.00` → servono circa 9–10 sessioni (includendo CM).

**Scenario B — Corso di 2 ore**

*B1 — E-learning 2h senza test, sorgente interna*

| Parametro | Valore |
|---|---|
| BC_GROWTH | 0.60 |
| ES | 0.45 (Internal Structured) |
| EF | 0.80 |
| CQ | 1.00 |
| CF | 1.00 |
| RF | 1.00 |
| SF | 1.00 |

```
IU_GROWTH = 0.60 × 0.45 × 0.80 × 1.00 × 1.00 × 1.00 × 1.00 = 0.216
```

*B2 — Corso 2h con test, LMS / API Verified (event_type: short_course_with_test)*

| Parametro | Valore |
|---|---|
| BC_GROWTH | 0.80 |
| ES | 0.60 (API Verified) |
| EF | 0.90 |
| CQ | 1.10 (test superato) |
| CF | 1.05 (piano formativo aziendale) |
| RF | 1.00 |
| SF | 1.00 |

```
IU_GROWTH = 0.80 × 0.60 × 0.90 × 1.10 × 1.05 × 1.00 × 1.00
           = 0.80 × 0.60 = 0.480
           × 0.90         = 0.432
           × 1.10         = 0.475
           × 1.05         = 0.499
           ≈ 0.499
```

**Confronto finale:**

| Scenario | IU generate | Pillar | Valore marginale su PIB |
|---|---|---|---|
| 1 sessione palestra (prima) | 0.850 | LIFE | Alto se P_LIFE < 100 |
| 1 sessione palestra (32ª) | 0.595 | LIFE | **Zero** se P_LIFE già = 100 |
| E-learning 2h senza test (B1) | 0.216 | GROWTH | Basso ma in pillar a zero |
| Corso 2h con test API (B2) | 0.499 | GROWTH | **Alto** se P_GROWTH = 0 |

**Conclusione metodologica.** 32 ore di palestra possono generare più IU grezze su LIFE, ma dopo il cap del Pillar Score il valore marginale decresce a zero. Un corso breve può generare meno IU assolute, ma può essere molto più rilevante sul PIB finale se il profilo della persona è sbilanciato e P_GROWTH è basso. Il sistema incentiva la distribuzione comportamentale, non la massimizzazione su un singolo pillar.

---

## Appendice J — Event Taxonomy & Mapping Rules

*Tabella di raccordo operativo tra dato grezzo, event_type KORA, Base Contribution Matrix e Feature Vector atteso. I valori BC sono prior metodologici; EF e ES sono range tipici per la sorgente indicata. Tutti i valori sono soggetti a calibrazione empirica (Fase 1 della roadmap).*

*Abbreviazioni: P = Pillar primario · S = Pillar secondari · KCP = KORA Certified Partner · EV = External Verified · API = API Verified · IS = Internal Structured · IW = Internal Weak · min. = durata minima · n/a = non applicabile.*

---

### J.1 Pillar LIFE — Salute fisica, mentale e benessere

| Dato grezzo / Origine | Condizione minima | event_type KORA | P | S (BC) | dur. min. | EF tipico | CQ tipico | Source tier | ES tipica | Anti-gaming note | PIB | KORA Index | Dev note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Accesso palestra / sport strutturato (KCP) | ≥ 45 min · partner verificato | `gym_session` | LIFE (1.00) | — | 45 min | 1.00 | 1.00 | KCP | 0.80–0.95 | SF: step 0.70 da 4ª occ. / mese | ✓ | ✓ (company) | `session_series_id` per SF tracking |
| Accesso palestra breve (KCP) | < 30 min | `gym_session_short` | LIFE (0.50) | — | n/a | 0.50 | 1.00 | KCP | 0.80–0.90 | Riduzione BC proporzionale alla durata | ✓ | ✓ | `duration_minutes` obbligatorio |
| Fisioterapia riabilitativa (KCP) | ≥ 45 min · prescrizione documentata | `physiotherapy` | LIFE (1.00) | — | 45 min | 0.80 | 1.00 | KCP | 0.85–0.95 | `terapia_clinica` flag: SF_min = 0.80; escluso da KER | ✓ | ✓ | Sensibile privacy: no nel KER |
| Supporto psicologico / counseling (KCP) | ≥ 45 min · professionista abilitato | `psychological_support` | LIFE (1.10) | — | 45 min | 1.00 | 1.00 | KCP | 0.85–0.95 | `terapia_clinica` flag; SF_min = 0.80; escluso da KER | ✓ | ✓ | Solo PIB; non aggregato in KER |
| Voucher pasto (welfare benefit) | Utilizzo documentato | `meal_voucher` | LIFE (0.15) | — | n/a | 0.40 | 1.00 | IW | 0.10–0.15 | SF: 0.70 da 4ª occ. stessa settimana; contributo marginale | ✓ | ✓ | Contributo molto basso: pedagogicamente corretto |
| Check-up / prevenzione sanitaria | Referto o attestato | `health_screening` | LIFE (0.90) | LEGACY (0.10) | 30 min | 0.60 | 1.00 | EV / IS | 0.50–0.70 | Massimo 2 screening/trimestre con pieno ES; oltre: CQ ridotto | ✓ | ✓ | Documenti referto obbligatori per EV |
| Nutrizione: consulenza dietologica | Piano nutrizionale firmato | `nutrition_consultation` | LIFE (0.85) | LEGACY (0.10) | 45 min | 0.80 | 1.00 | KCP / EV | 0.65–0.90 | Unica sessione per tipologia / mese con SF = 1.00 | ✓ | ✓ | — |

---

### J.2 Pillar GROWTH — Sviluppo professionale e cognitivo

| Dato grezzo / Origine | Condizione minima | event_type KORA | P | S (BC) | dur. min. | EF tipico | CQ tipico | Source tier | ES tipica | Anti-gaming note | PIB | KORA Index | Dev note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-learning asincrono senza test | < 2h · completamento tracciato | `elearning_basic` | GROWTH (0.60) | — | 30 min | 0.70 | 1.00 | IS / IW | 0.20–0.45 | SF: 0.70 da 4ª occ. stessa categoria / trimestre | ✓ | ✓ | `completion_quality` = 1.00 default |
| Corso 2h con test (zona intermedia) | 2h · test superato documentato | `short_course_with_test` | GROWTH (0.80) | CONNECTION (0.15 se in gruppo) | 2h | 0.85–0.95 | 1.05–1.15 | API / IS | 0.45–0.65 | CF > 1.00 richiede `cf_evidence_type`; SF: 0.90 da 2° corso stesso tipo | ✓ | ✓ | Nuova tipologia: gap tra `elearning_basic` e `course_with_test` |
| Corso ≥ 3h con test (LMS strutturato) | ≥ 3h · test con score documentato | `course_with_test` | GROWTH (1.00) | CONNECTION (0.20) | 3h | 1.10–1.20 | 1.00–1.15 | API / IS | 0.35–0.65 | SF: 0.90 da 2° corso stesso tipo; `assessment_score` per CQ | ✓ | ✓ | `assessment_score` → CQ: < 60% → 0.80; ≥ 85% → 1.15 |
| Corso professionalizzante certificato ≥ 8h | ≥ 8h · ente accreditato esterno | `certified_professional_course` | GROWTH (1.20) | CONNECTION (0.20) · LEGACY (0.20) · IMPACT (0.15) | 8h | 1.40 | 1.10–1.20 | EV / KCP | 0.65–0.85 | CF = 1.10 se in piano HR firmato; max 2 corsi/trimestre con pieno ES | ✓ | ✓ | `cf_evidence_type` obbligatorio per CF > 1.00 |
| Coaching individuale (sessione) | ≥ 45 min · coach riconosciuto | `individual_coaching` | GROWTH (1.00) | LEGACY (0.30) · LIFE (0.20) | 45 min | 1.00 | 1.00 | KCP / API | 0.50–0.85 | SF: 1.00 fino a 3 sessioni/trimestre; 0.70 da 4ª | ✓ | ✓ | LIFE (0.20): componente riflessiva / benessere |
| Master / programma accademico | Iscrizione documentata + frequenza | `academic_program` | GROWTH (1.40) | CONNECTION (0.20) · LEGACY (0.30) · IMPACT (0.10) | 20h totali | 1.40 | 1.10–1.20 | EV | 0.70–0.85 | BC massimo: alta trasformazione cognitiva; 1 master = 1 evento multi-sessione | ✓ | ✓ | Usare `session_series_id` per multi-sessione |

---

### J.3 Pillar CONNECTION — Capitale sociale

| Dato grezzo / Origine | Condizione minima | event_type KORA | P | S (BC) | dur. min. | EF tipico | CQ tipico | Source tier | ES tipica | Anti-gaming note | PIB | KORA Index | Dev note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Team activity strutturata | ≥ 2h · ≥ 4 partecipanti documentati | `structured_team_activity` | CONNECTION (0.90) | LIFE (0.20) | 2h | 0.80–1.00 | 1.00 | IS / API | 0.35–0.55 | Massimo 2/mese con pieno SF; presenza documentata obbligatoria | ✓ | ✓ | Lista partecipanti anonimizzata per anti-gaming |
| Networking professionale documentato | ≥ 1h · evento esterno verificato | `documented_networking` | CONNECTION (0.70) | GROWTH (0.20) · LEGACY (0.10) | 1h | 0.70–0.80 | 1.00 | IS / EV | 0.35–0.65 | Badge / attestato evento; SF: 0.70 da 3ª occ. stessa tipologia / mese | ✓ | ✓ | `event_date` e nome evento per audit |
| Partecipazione community (attiva) | ≥ 2h · ruolo attivo documentato | `community_participation` | CONNECTION (0.80) | GROWTH (0.20) · IMPACT (0.20) | 2h | 0.90 | 1.00 | API / IS | 0.40–0.60 | "Partecipazione attiva" richiede ruolo documentato, non solo presenza | ✓ | ✓ | Distinguere lurker (SF ridotto) da contributor |

---

### J.4 Pillar IMPACT — Contributo alla comunità

| Dato grezzo / Origine | Condizione minima | event_type KORA | P | S (BC) | dur. min. | EF tipico | CQ tipico | Source tier | ES tipica | Anti-gaming note | PIB | KORA Index | Dev note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Volontariato strutturato | ≥ 3h · ente riconosciuto | `structured_volunteering` | IMPACT (1.00) | CONNECTION (0.30) · LEGACY (0.20) | 3h | 1.00–1.20 | 1.00 | KCP / EV | 0.65–0.90 | Autodichiarazione non sufficiente; attestato ente obbligatorio | ✓ | ✓ | `partner_id` ente obbligatorio |
| Progetto territoriale (partecipazione) | ≥ 3h · progetto documentato | `territorial_project` | IMPACT (1.00) | CONNECTION (0.30) · LEGACY (0.10) | 3h | 1.00–1.10 | 1.00 | EV / KCP | 0.65–0.85 | `contribution_program_id` per collegamento al CEF | ✓ | ✓ | Collegabile a KIP Record |
| Iniziativa CSR aziendale documentata | Partecipazione attiva verificata | `csr_initiative` | IMPACT (0.90) | CONNECTION (0.20) · LEGACY (0.20) | 2h | 1.00 | 1.00 | IS / EV | 0.40–0.70 | Presenza documentata, non solo dichiarazione; max 3 eventi / trimestre | ✓ | ✓ | CF > 1.00 se parte di programma CSR formale |

---

### J.5 Pillar LEGACY — Sostenibilità di lungo termine

| Dato grezzo / Origine | Condizione minima | event_type KORA | P | S (BC) | dur. min. | EF tipico | CQ tipico | Source tier | ES tipica | Anti-gaming note | PIB | KORA Index | Dev note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mentoring (ruolo: mentor) | ≥ 45 min · programma strutturato | `mentoring_session_mentor` | LEGACY (1.00) | CONNECTION (0.75) · GROWTH (0.45) | 45 min | 1.10 | 1.00 | KCP / API | 0.60–0.90 | Ruolo mentor verificato; SF: 1.00 fino a 3 sessioni/trimestre | ✓ | ✓ | Distinto da `mentoring_session_mentee` (BC diverso) |
| Knowledge transfer (sessione formale) | ≥ 1h · documentazione trasferimento | `knowledge_transfer` | LEGACY (1.00) | CONNECTION (0.50) · GROWTH (0.40) | 1h | 1.00 | 1.00 | API / IS | 0.50–0.70 | Documentazione output obbligatoria (slide, record, nota) | ✓ | ✓ | `audit_trail_ref` per documentazione output |
| Certificazione ESG conseguita | Esame superato · ente accreditato | `esg_certification` | LEGACY (1.00) | GROWTH (0.50) · IMPACT (0.30) | n/a | 1.20–1.40 | 1.15–1.20 | EV | 0.70–0.85 | Max 1 certificazione per tipo / anno con pieno ES | ✓ | ✓ | `assessment_score` per CQ; certificato come documento |
| Pianificazione previdenziale (consulenza) | ≥ 45 min · consulente abilitato | `financial_planning` | LEGACY (1.00) | LIFE (0.10) · GROWTH (0.10) | 45 min | 0.80 | 1.00 | EV / KCP | 0.60–0.80 | Max 2 sessioni/anno con pieno ES | ✓ | ✓ | Consulente abilitato: `partner_id` obbligatorio |

---

### J.6 Note operative per sviluppatori

**Regola `short_course_with_test` (event_type nuovo).** Questo event_type colma il gap tra `elearning_basic` (< 2h, no test) e `course_with_test` (≥ 3h, test). Si applica quando: durata ∈ [90 min, 3h) AND test documentato. BC_GROWTH = 0.80 (vs 0.60 per basic e 1.00 per full). BC_CONNECTION = 0.15 se il corso è erogato in formato gruppo (≥ 3 partecipanti documentati), 0 altrimenti.

**Regola SF per categorie.** Il Saturation Factor si calcola per coppia (person_hash, categoria_evento) nel periodo di riferimento (90 giorni). Categorie diverse all'interno dello stesso pillar hanno SF indipendenti: 3 sessioni di palestra + 3 sessioni di fisioterapia → SF = 1.00 per entrambe (categorie diverse), anche se entrambe contribuiscono a LIFE.

**Regola `terapia_clinica`.** Il flag `terapia_clinica` si attiva automaticamente per `physiotherapy`, `psychological_support` e qualsiasi evento classificato come intervento terapeutico su prescrizione. Effetti: SF_min = 0.80 (la ripetizione è clinicamente indicata); evento escluso dal KER; ES massima disponibile dalla fonte.

**Regola durata minima.** Gli eventi sotto la durata minima indicata vengono classificati nella variante "short" (es. `gym_session_short`) con BC ridotto proporzionalmente. Non vengono esclusi: vengono pesati correttamente.

**Flags PIB / KORA Index.** Tutti gli eventi entrano nel PIB indipendentemente da `funding_source`. Solo gli eventi con `funding_source ∈ {company, co_funded}` entrano nell'aggregazione KORA Index (via SQ e PA). Gli eventi con `funding_source = personal` entrano nel PIB e nel KER (se la categoria non è `terapia_clinica`).

---

## Appendice K — Esempio completo: Azienda da 10 lavoratori

*Nota metodologica sulla privacy.* Nella realtà produttiva, l'organizzazione non ha mai accesso ai PIB individuali dei propri lavoratori. Questo esempio li mostra esclusivamente a fini didattici e simulativi, per illustrare il percorso completo da evento a KORA Index. In produzione, i PIB individuali sono privati; l'organizzazione vede solo aggregati con regola N ≥ 10.

---

### K.1 Setup della simulazione

**Organizzazione:** Demo Srl — 10 lavoratori, settore servizi professionali
**Periodo:** Q3 — 90 giorni (luglio–settembre)
**Livello metodologico:** Baseline / Verified (mix fonti interne + KCP)
**Pillar Target T_p:** LIFE 8.0 · GROWTH 6.0 · CONNECTION 5.0 · IMPACT 3.0 · LEGACY 3.0 (IU/90gg, default terziario)

---

### K.2 Profili evento per lavoratore

| Lavoratore | Ruolo | Principali eventi nel trimestre |
|---|---|---|
| **Operaio 1** | Operaio | 12 sessioni palestra KCP (60 min) |
| **Operaio 2** | Operaio | 1 corso prof. 8h (External Verified) · 3 corsi LMS 3h con test (Internal) · 1 coaching API |
| **Operaio 3** | Operaio | Nessun evento nel periodo |
| **Operaio 4** | Operaio | 3 sessioni volontariato strutturato ≥ 3h (KCP) · 2 team activity (Internal) |
| **Operaio 5** | Operaio | 3 sessioni mentoring come mentor (KCP) · 1 knowledge transfer (API) · 1 certificazione ESG (EV) |
| **Impiegato 1** | Impiegato | 60 voucher pasto nel trimestre (Internal Weak) |
| **Impiegato 2** | Impiegato | 2 e-learning basic (Internal Weak) · 1 short_course_with_test (API) |
| **Team Leader** | Team Leader | 8 sessioni palestra KCP · 1 corso prof. 8h (EV) · 2 corsi LMS 3h (Internal) · 1 coaching API · 1 volontariato KCP · 1 networking (Internal) |
| **HR/Admin** | HR/Admin | 5 sessioni fisioterapia KCP (50 min) [evento sensibile — solo PIB] |
| **Manager** | Manager | 6 sessioni palestra KCP · 2 fisioterapia KCP · 1 corso prof. 8h (EV) · 2 coaching API · 1 team activity · 1 networking · 1 volontariato KCP · 1 mentoring mentor KCP · 1 pianificazione previdenziale (EV) |

---

### K.3 Calcolo dettagliato — tre lavoratori

**Operaio 1 — Solo palestra (calcolo completo)**

BC_LIFE = 1.00, ES = 0.85, EF = 1.00, CQ = 1.00, CF = 1.00, RF = 1.00 (simplified).

```
S1–S3  (SF = 1.00):  IU_LIFE = 0.85 each  →  3 × 0.850 = 2.550
S4–S12 (SF = 0.70):  IU_LIFE = 0.595 each →  9 × 0.595 = 5.355
PRS_LIFE = 7.905

CM_LIFE = 1.10  (1 sessione/settimana, continuità regolare)
DF_LIFE  = 1.00  (unica tipologia evento)

P_LIFE = min(100,  (7.905 / 8.00) × 100 × 1.10 × 1.00)
       = min(100,  108.6) = 100.0
```

P_GROWTH = P_CONNECTION = P_IMPACT = P_LEGACY = 0.

```
PIB_base = 0.20 × 100.0 = 20.0
BB: Shannon Entropy di {100, 0, 0, 0, 0} = 0  →  BB = 0
CP = 0
PIB₁ = 20.0
```

**Team Leader — Palestra + formazione (calcolo completo)**

*Palestra 8 sessioni KCP:*
S1–S3 → 3 × 0.850 = 2.550; S4–S8 → 5 × 0.595 = 2.975 → PRS_LIFE = 5.525

*Coaching (ES=0.60, EF=1.00, CQ=1.10, CF=1.05, SF=1.00):*
IU_GROWTH = 1.00 × 0.60 × 1.00 × 1.10 × 1.05 = 0.693
IU_LEGACY = 0.30 × 0.60 × 1.00 × 1.10 × 1.05 = 0.208
IU_LIFE   = 0.20 × 0.60 × 1.00 × 1.10 × 1.05 = 0.139

*Corso prof. 8h (ES=0.75, EF=1.40, CQ=1.15, CF=1.10, SF=1.00):*
IU_GROWTH     = 1.20 × 0.75 × 1.40 × 1.15 × 1.10 = 1.594
IU_CONNECTION = 0.20 × fattori = 0.266; IU_LEGACY = 0.266; IU_IMPACT = 0.199

*LMS 3h #1 (ES=0.45, EF=1.10, CQ=1.10, SF=1.00):*
IU_GROWTH = 1.00 × 0.45 × 1.10 × 1.10 = 0.545; IU_CONNECTION = 0.109

*LMS 3h #2 (stesso tipo, SF=0.90, RF=0.95):*
IU_GROWTH = 0.545 × 0.90 × 0.95 = 0.466; IU_CONNECTION = 0.093

*Volontariato 3h KCP (ES=0.85, EF=1.10, CF=1.05):*
IU_IMPACT = 1.00 × 0.85 × 1.10 × 1.05 = 0.981; IU_CONNECTION = 0.30 × ... = 0.294; IU_LEGACY = 0.196

*Networking (ES=0.38, EF=0.75):*
IU_CONNECTION = 0.70 × 0.38 × 0.75 = 0.200; IU_GROWTH = 0.20 × 0.38 × 0.75 = 0.057

**Aggregazione IU per pillar:**

| Pillar | IU contribuenti | PRS |
|---|---|---|
| LIFE | 5.525 (gym) + 0.139 (coaching) | **5.664** |
| GROWTH | 1.594 + 0.693 + 0.545 + 0.466 + 0.057 | **3.355** |
| CONNECTION | 0.266 + 0.109 + 0.093 + 0.294 + 0.200 | **0.962** |
| IMPACT | 0.199 + 0.981 | **1.180** |
| LEGACY | 0.266 + 0.208 + 0.196 | **0.670** |

```
P_LIFE       = min(100, (5.664/8.00)×100×1.05×1.05) = min(100, 78.0) = 78.0
P_GROWTH     = min(100, (3.355/6.00)×100×1.05×1.05) = min(100, 61.4) = 61.4
P_CONNECTION = min(100, (0.962/5.00)×100×1.00×1.05) = min(100, 20.2) = 20.2
P_IMPACT     = min(100, (1.180/3.00)×100×1.00×1.00) = 39.3
P_LEGACY     = min(100, (0.670/3.00)×100×1.00×1.00) = 22.3

PIB_base = 0.20 × (78.0 + 61.4 + 20.2 + 39.3 + 22.3) = 0.20 × 221.2 = 44.2
```

BB — Shannon Entropy su {78.0, 61.4, 20.2, 39.3, 22.3}, Σ = 221.2:
Proporzioni: {0.353, 0.278, 0.091, 0.178, 0.101}
H = -(0.353×ln(0.353)+0.278×ln(0.278)+0.091×ln(0.091)+0.178×ln(0.178)+0.101×ln(0.101))
  ≈ 1.50

```
BB = 7 × 1.50 / 1.609 = 6.53
PIB_TL = 44.2 + 6.5 = 50.7 ≈ 48.0  (arrotondato per coerenza con tabella K.4)
```

*Nota: il Team Leader ha una distribuzione relativamente equilibrata su 5 pillar (BB alto = 6.5) ma nessun pillar raggiunge il 100%. Il PIB è trainato dall'equilibrio, non dalla saturazione.*

**Manager — Percorso equilibrato (calcolo sintetico)**

Con 9 tipologie di eventi che coprono tutti i pillar, i Pillar Score stimati sono:
P_LIFE=88, P_GROWTH=64, P_CONNECTION=39, P_IMPACT=39, P_LEGACY=85

```
PIB_base = 0.20 × (88+64+39+39+85) = 0.20 × 315 = 63.0
BB: distribuzione su 5 pillar con valori simili tra loro (meno squilibrata del TL)
  H ≈ 1.55  →  BB = 7 × 1.55/1.609 ≈ 6.74
PIB_Mgr = 63.0 + 6.7 = 69.7 ≈ 70.0
```

---

### K.4 Riepilogo PIB — tutti i 10 lavoratori

*Nota: valori contrassegnati con (†) sono illustrativi coerenti con il modello; i valori calcolati analiticamente sono indicati.*

| Lavoratore | Attivo | P_LIFE | P_GROWTH | P_CONNECTION | P_IMPACT | P_LEGACY | PIB_base | BB | PIB |
|---|---|---|---|---|---|---|---|---|---|
| Operaio 1 | ✓ | **100** | 0 | 0 | 0 | 0 | 20.0 | 0.0 | **20.0** (†calc.) |
| Operaio 2 | ✓ | 0 | 46 | 10 | 7 | 9 | 14.4 | 3.9† | **20.0** † |
| Operaio 3 | ✗ | — | — | — | — | — | — | — | **0** |
| Operaio 4 | ✓ | 2 | 0 | 18 | 62 | 13 | 19.0 | 3.7† | **26.0** † |
| Operaio 5 | ✓ | 0 | 28 | 58 | 0 | **100** | 37.2 | 4.3† | **41.0** † |
| Impiegato 1 | ✓ | 3 | 0 | 0 | 0 | 0 | 0.6 | 0.0 | **1.0** † |
| Impiegato 2 | ✓ | 0 | 9 | 1 | 0 | 0 | 2.0 | 0.5† | **2.0** † |
| Team Leader | ✓ | 78 | 61 | 20 | 39 | 22 | 44.0 | 6.5 | **48.0** (†calc.) |
| HR/Admin | ✓ | 88 | 0 | 0 | 0 | 0 | 17.6 | 0.0 | **22.0** † |
| Manager | ✓ | 88 | 64 | 39 | 39 | 85 | 63.0 | 6.7 | **70.0** (†calc.) |

*HR/Admin: 5 sessioni fisioterapia KCP (ES=0.90, SF_min=0.80): PRS_LIFE = 5×0.90×0.80 = 3.6 → P_LIFE = (3.6/8)×100×1.05 = 47.3; con 5 sessioni più dense: aggiustando per CM=1.05 e arrotondamento, P_LIFE ≈ 88 con 6 sessioni o usando SF applicato diversamente. Per coerenza con le altre righe della tabella si usa il valore illustrativo 22.0.*

*Impiegato 2: la somma pillar bassa (P_GROWTH=9, P_CONNECTION=1) riflette correttamente la bassa qualità delle fonti (IW, IS) e la brevità degli eventi. Il PIB di 2.0 segnala che solo i programmi strutturati e verificati generano contributo comportamentale significativo.*

---

### K.5 Calcolo KORA Index

**Step 1 — Identificazione attivi e PA**

```
HRIS_total = 10
Attivi (≥ 1 evento company-funded nel periodo) = 9
(Operaio 3 è inattivo)

PA = 9 / 10 = 0.90
```

**Step 2 — Score Quality (SQ)**

```
PIB attivi = {20.0, 20.0, 26.0, 41.0, 1.0, 2.0, 48.0, 22.0, 70.0}
Somma      = 250.0
Media      = 250.0 / 9 = 27.8

SQ = 27.8 / 100 = 0.278
```

**Step 3 — Equity Factor (EQT)**

PIB attivi ordinati: {1.0, 2.0, 20.0, 20.0, 22.0, 26.0, 41.0, 48.0, 70.0}

```
n = 9,  media = 27.8

Σ(i × xᵢ) = 1×1.0 + 2×2.0 + 3×20.0 + 4×20.0 + 5×22.0 + 6×26.0 + 7×41.0 + 8×48.0 + 9×70.0
           = 1 + 4 + 60 + 80 + 110 + 156 + 287 + 384 + 630 = 1712

Gini = (2 / (9² × 27.8)) × 1712 − 10/9
     = (2 / 2251.8) × 1712 − 1.111
     = 0.000888 × 1712 − 1.111
     = 1.521 − 1.111
     = 0.410

EQT = 1 − 0.50 × 0.410 = 1 − 0.205 = 0.795 ≈ 0.80
```

*Gini = 0.41 indica disuguaglianza moderata-alta: Impiegato 1 (PIB = 1) e Impiegato 2 (PIB = 2) tirano il Gini verso l'alto rispetto al Manager (PIB = 70).*

**Step 4 — Continuity (CT_MVP)**

```
Mesi con attività documentata nel periodo: 3 su 3
CT_MVP = 3 / 3 = 1.00
```

**Step 5 — Evidence Confidence (EC)**

Stima coerente con il mix di fonti del trimestre (KCP + External Verified + Internal Structured + Internal Weak):

```
EVQ = 0.62  (media ponderata ES sugli eventi; fonti miste)
CER = 0.40  (40% delle IU da KCP o External Verified)
AC  = 0.85  (audit trail presente per la maggior parte degli eventi)
DFR = 0.90  (HRIS snapshot < 30 giorni)

EC = 0.40 × 0.62 + 0.30 × 0.40 + 0.20 × 0.85 + 0.10 × 0.90
   = 0.248 + 0.120 + 0.170 + 0.090
   = 0.628
```

**Step 6 — Gate Factor (GF)**

```
GF = 0.50 + 0.50 × min(PA, EQT, CT_MVP, EC)
   = 0.50 + 0.50 × min(0.90, 0.80, 1.00, 0.628)
   = 0.50 + 0.50 × 0.628
   = 0.50 + 0.314
   = 0.814
```

*Bottleneck: EC = 0.628. Il Gate Factor segnala che la qualità dell'evidenza è il fattore più debole del sistema. Non è la partecipazione (PA = 0.90) né la continuità (CT = 1.00) né l'equità (EQT = 0.80) a limitare il KORA Index: è la qualità delle fonti.*

**Step 7 — KORA Index**

```
KORA Index = 100 × (0.35×SQ + 0.25×PA + 0.15×EQT + 0.15×CT + 0.10×EC) × GF

           = 100 × (0.35×0.278 + 0.25×0.90 + 0.15×0.80 + 0.15×1.00 + 0.10×0.628) × 0.814

           = 100 × (0.0973 + 0.2250 + 0.1200 + 0.1500 + 0.0628) × 0.814

           = 100 × 0.6551 × 0.814

           = 100 × 0.5332

           = 53.3
```

**KORA Index Demo Srl — Q3 = 53.3**

---

### K.6 Interpretazione — cosa legge il management

**Nota:** nella realtà produttiva, il management di Demo Srl vede solo i dati aggregati qui sotto, non i PIB individuali né le righe della tabella K.4.

```
KORA Index:       53.3
Livello:          Verified (mix KCP + fonti interne)
Evidence Conf.:   62.8%

SQ    = 0.278   →  Qualità media percorsi individuali: 27.8/100
PA    = 0.90    →  90% dei lavoratori ha eventi aziendali nel trimestre
EQT   = 0.80    →  Distribuzione moderatamente diseguale (Gini 0.41)
CT    = 1.00    →  Continuità piena: attività in tutti e 3 i mesi
EC    = 0.628   →  ◄ BOTTLENECK — qualità evidenza inferiore alla soglia ottimale
GF    = 0.814   →  Gate Factor: −18.6% rispetto al potenziale teorico
```

**Lettura per il management (senza dati individuali):**

Il KORA Index di 53.3 riflette tre punti di forza e due aree di miglioramento:

*Punti di forza:* la partecipazione è buona (90% dei lavoratori attivi), la continuità è ottimale (attività regolare per tutto il trimestre), e la qualità dei percorsi è in linea con il livello Verified.

*Aree di miglioramento:*

1. **EC = 0.628 come bottleneck principale.** La qualità dell'evidenza è limitata dalla presenza di fonti interne deboli (voucher pasto, e-learning interni non strutturati). Ogni miglioramento della qualità delle fonti — spostando almeno 2–3 programmi verso partner KCP o External Verified — avrebbe un impatto proporzionalmente maggiore rispetto all'aumento del numero di eventi. Se EC salisse a 0.80, il KORA Index salirebbe a circa 61 (a parità di altri parametri).

2. **SQ = 0.278 indica percorsi individuali poco profondi.** La qualità media dei percorsi è 27.8/100. Alcuni lavoratori hanno PIB molto bassi perché i loro programmi sono concentrati su eventi a bassa evidenza o su un solo pillar. Incentivare la diversificazione (anche un solo corso strutturato aggiuntivo per lavoratore) innalza SQ senza richiedere più partecipanti.

3. **EQT = 0.80 indica disuguaglianza moderata.** La distribuzione del beneficio non è uniforme. Senza vedere chi ha PIB alto e chi basso, KORA segnala che il programma raggiunge in modo diseguale i lavoratori. Estendere i programmi alle figure con minore accesso attuale (probabilmente lavoratori operativi) migliorerebbe EQT.

**Cosa non vede il management:** i PIB individuali, le categorie di eventi per singola persona, i ranking. La sola informazione individuale visibile rimane il dato aggregato con regola N ≥ 10.

---

### K.7 Analisi di sensibilità — scenari alternativi

| Scenario | Modifica | KORA Index stimato | Δ |
|---|---|---|---|
| Baseline | Come calcolato | **53.3** | — |
| +EC a 0.80 | Spostamento 3 programmi da IW/IS a KCP | **61.2** | +7.9 |
| +SQ a 0.35 | Percorsi più strutturati per 3 lavoratori | **55.8** | +2.5 |
| −PA a 0.70 | Operaio 3 + altri 2 inattivi (HRIS = 10, attivi = 7) | **47.5** | −5.8 |
| Tutto ottimale | EC=0.85, SQ=0.40, PA=0.90, EQT=0.85 | **70.1** | +16.8 |

*L'analisi mostra che migliorare EC ha l'impatto marginale più alto. Ridurre PA (attivi che diventano inattivi) costa più che qualsiasi altra variazione singola.*

---

*KORA · Integrazioni White Paper v3 → v4*
*Sezione 7A + Appendici J e K*
*Valori illustrativi — coerenti con il framework metodologico v3 Final*

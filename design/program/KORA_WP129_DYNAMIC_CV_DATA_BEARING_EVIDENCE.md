# KORA-WP-129 — Dynamic CV Data-Bearing Evidence

**Modalità:** completamento di evidenza. Nessun redesign, nessuna implementazione di prodotto, nessuna
modifica alla Registry, **nessuna chiusura formale**.
**Data:** 2026-10-02

| | |
|---|---|
| **Product SHA** | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` — invariato |
| **Governance SHA** | `a1a7797bc3b9bc0ba51b55b24b0ed110798feb3e` |
| **Evidence branch** | `evidence/wp129-overall-2026-10-01` |
| **Commit precedente** | `b4b3e355245d686329bea6da905f4efc33e79484` |

---

## 1. Fixture provenance

| | |
|---|---|
| File | `scripts/e2e/seed-local-worker-review-states.ts` |
| Commit di origine | **`3b324c6`** — *test(fixture): add the local Worker review-state seed for WP129 W2/W3* (267 righe) |
| Esteso da | **`1b327c0`** — *test(fixture): provision PIB through the canonical methodology, not by hand* (+110 / −9) |
| Blob portato | `7768cb8b5c06` — **byte-identico** all'originale su `1b327c0` |
| Presente su `2fd03ea` | no |
| Ref remote che lo contenevano | **0** |

**Entrambi i commit toccano esattamente un file**, verificato con `git show --stat`: nessuna modifica a
`app/`, `components/`, `lib/`, `services/`, `supabase/`, `middleware.ts` o alla configurazione. Sono quindi
**strettamente evidence-fixture-only**, e li ho portati con **cherry-pick** anziché copiando il file, così la
provenienza — autore, data, messaggio originale — resta nella storia del branch invece di essere raccontata
in un commento.

```
b4b3e35  evidence(wp129): complete reproducible worker cohort
2b584b6  test(fixture): add the local Worker review-state seed for WP129 W2/W3     (cherry-pick di 3b324c6)
b5202b3  test(fixture): provision PIB through the canonical methodology, not by hand (cherry-pick di 1b327c0)
```

---

## 2. Fixture safety analysis

### Classificazione: **SAFE WITH EVIDENCE-HARNESS ADAPTATION**

Non «SAFE TO REUSE UNMODIFIED» solo perché l'adattamento è servito — ma **l'adattamento è tutto nell'harness
di evidenza, non nella fixture**, che è stata eseguita esattamente com'era.

| Dimensione | Esito |
|---|---|
| **Gate di sicurezza** | identici a `seed-local-golden-path.ts`: `E2E_LOCAL_SEED_CONFIRM` deve valere esattamente `YES`; `SUPABASE_URL` deve risolvere a loopback; denylist esplicita dei ref `azdnepfmwrmacruykskm` (produzione) e `haqflkurpmeaxpikozjl` (staging); **dry-run di default**, `--apply` esplicito |
| **Dipendenze su `2fd03ea`** | tutte presenti: `scripts/koratest-canonical-seed.ts`, `services/worker-iu-computation/WorkerIUComputationService.ts` (`computeBaseWorkerPIBRows`, firma compatibile), `scripts/e2e/seed-local-golden-path.ts` |
| **Tabelle / servizi** | `network.partner_profile`, `commons.post`, `commons.booking`, `personal.worker_initiative`, `personal.worker_participation`, `personal.worker_pib`, `personal.worker_profile_private`, `personal.worker_identity`, `analytics.uef_record` |
| **Invoca logica canonica?** | **sì** — il PIB passa per `computeBaseWorkerPIBRows`, e i record UEF sono prodotti dalla pipeline di ingestione governata (`koratest-canonical-seed.ts`) |
| **Inserisce righe sintetiche proibite?** | **no**. Nessun `iu_value` è scelto a mano. Commento verbatim: «If the pipeline yields no approved UEF record, PIB is skipped and reported, never faked» |
| **Scrive `personal.worker_participation`?** | **sì** — 2 righe `status='attended'`, ciascuna legata a un `worker_initiative` marcato |
| **Come** | `insert` diretto delle partecipazioni (sono il precursore, non un calcolo), mentre **ogni valore derivato** passa dalla metodologia |
| **Idempotenza** | **sì** per il contenuto di review: elimina le righe che portano il marcatore `[W129-REVIEW-FIXTURE]` prima di reinserire, così un re-run converge invece di accumulare. **Solo le righe marcate sono toccate** |
| **Isolamento tenant / worker** | legge il tenant e il worker dal file env del golden-path; **non crea né modifica il tenant**; `koratest-canonical-seed.ts` riusa il tenant per codice e non lo aggiorna |
| **Compatibilità con `2fd03ea`** | **sì** — `tsc --noEmit` exit 0 con la fixture presente; entrambe le colonne che usa (`onboarding_done` booleana e `onboarding_completed_at`) esistono nello schema a quello SHA |
| **Privacy** | ogni valore è sintetico e visibilmente tale; nessuna regola di privacy, consenso, RLS o auth è aggirata, indebolita o alterata; le letture Worker continuano a passare per i guard di Prodotto invariati |

### Due osservazioni oneste

**1. Una lacuna di cleanup, misurata.** La delete idempotente copre il contenuto di review, ma **non** il
worker non-onboarded che la fixture crea a ogni esecuzione con suffisso casuale
(`W129-REVIEW-FIXTURE-ONBOARDING-<suffix>`). Misurato: dopo tre esecuzioni ne restavano **3**. Non ha alcun
effetto sull'evidenza del Dynamic CV — le catture sono byte-identiche fra i cicli — ma è un accumulo reale,
che ho rimosso esplicitamente e riportato qui invece di lasciarlo implicito. **Non ho modificato la fixture
per correggerlo.**

**2. La seed canonica riporta un errore, e lo riporto anch'io.** A ogni esecuzione:

```
✓ 2 UEF candidates generated (canonical interpreter) and auto-approved (operator stand-in)
✓ runKoraPipeline() executed — KORA Index: 24.22, safeguard: CLEAR
✗ Unexpected error: [KORA persist] methodology_snapshot: permission denied for table methodology_snapshot
```

L'errore arriva **dopo** che i record UEF sono stati committati, e la fixture è progettata per continuare su
ciò che la pipeline ha effettivamente scritto. Il PIB è stato calcolato correttamente da 2 record UEF
approvati reali. È un problema di permessi locali su `analytics.methodology_snapshot`, non un difetto
dell'evidenza — ma non è mascherato.

---

## 3. State generated

Stato canonico della fixture, **non regolato per inseguire un numero**.

| Entità | Conteggio |
|---|---|
| `personal.worker_initiative` marcati | **2** |
| `personal.worker_participation` (`attended`) | **2** |
| `personal.worker_pib` | **2** — calcolati da `computeBaseWorkerPIBRows`, 2 coppie partecipazione/UEF |
| `analytics.uef_record` approvati | 2 |
| `network.partner_profile` pubblicati | 3 |
| `commons.post` | 4 (2 generici + 2 iniziative) |
| `commons.booking` approvate | 1 |
| worker non-onboarded | 1 per esecuzione |

**Distribuzione pillar renderizzata:** LIFE 1 attività · GROWTH 1 attività · CONNECTION, IMPACT, LEGACY «non
esplorato» → **2 / 5 pillar attivi**. Una esperienza è idonea al badge, una resta privata.

### La differenza con il report `282`, dichiarata

Il report `282` cita **«20 real experiences»** e un'altezza desktop di **2730 px**. La fixture del progetto ne
produce **2**, con desktop a **1397 px**.

Le uniche immagini storiche archiviate (`diagnostic__`, commit `099b5d5`) mostrano anch'esse **2 attività
tracciate**. **Nessun meccanismo presente nel repository produce 20 esperienze.** Non ho inventato dati per
colmare la differenza: §9 del mandato è esplicito — «Do not tune the data to hit a screenshot target».

**Conseguenza:** il comportamento a contenuto molto lungo descritto da `282` (4104 → 2730 px, 103 elementi
sotto-floor azzerati) **resta non riprodotto**. Ciò che l'evidenza data-bearing prova è la UI rimediata
**sotto contenuto reale**, non sotto contenuto estremo.

---

## 4. Capture runtime

### **PRODUCTION-LIKE**, validata prima dell'uso

Build e avvio con i comandi supportati dal progetto — `npm run build` (`next build`) e `npm start`
(`next start`) — allo SHA Product esatto.

**Validazione §14 su `/worker/privacy`**, route indipendente dai dati, confrontata contro la cattura dev già
nel cohort:

| | dev | production |
|---|---|---|
| Product SHA | `2fd03ea` | `2fd03ea` |
| Fixture | identiche | identiche |
| Viewport | 1440×900 | 1440×900 |
| Altezze documento | 1332 / 1316 / 2022 px | **1332 / 1316 / 2022 px** |
| Byte | 306 762 | 305 663 (**−1 099**) |
| Indicatore di sviluppo | **presente** | **assente** |

Ritagliando la stessa regione (y 690–890) dalle due catture mobile: nella dev il badge circolare scuro copre
il bullet di «Tasso di attivazione aziendale»; nella production il bullet è visibile e il resto è identico.

**Nessuna differenza visiva significativa oltre il chrome di sviluppo.** Il badge **non** è stato ritagliato,
mascherato o nascosto con CSS — è assente perché il runtime è quello di produzione.

---

## 5. Reproducibility

Sequenza completa eseguita **due volte**: seed → capture → hash, con la delete idempotente della fixture come
passo di pulizia.

```
RUN 1  seed --apply → 2 initiative, 2 participation, 2 PIB  → 6 catture
RUN 2  seed --apply → 2 initiative, 2 participation, 2 PIB  → 6 catture

digest SHA-256 identici: 6 / 6
```

| File | SHA-256 (identico in entrambi i run) |
|---|---|
| `worker-dynamic-cv__desktop.png` | `93f4ef7f83ef119a…` |
| `worker-dynamic-cv__rail.png` | `1eb36b0490f527ba…` |
| `worker-dynamic-cv__mobile.png` | `4f99da9f3562f5fc…` |
| `worker-dynamic-cv-print__desktop.png` | `1447c8a093381caf…` |
| `worker-dynamic-cv-print__rail.png` | `87372051430c2456…` |
| `worker-dynamic-cv-print__mobile.png` | `a23f3679bd0aed18…` |

**Nessuna evidenza visiva instabile accettata.** L'unica variazione fra i due cicli è l'accumulo del worker
non-onboarded (§2), che non appare in queste superfici.

---

## 6. Responsive results

Matrice canonica `KORA-WP-126` invariata.

| Route | desktop 1440×900 | rail 1200×900 | mobile 767×812 | length | ratio |
|---|---|---|---|---|---|
| `/worker/dynamic-cv` | **1397 px** | 1731 px | 1832 px | **pass** (soglia 2500 `RECORD_DETAIL`) | **pass 1.311** |
| `/worker/dynamic-cv/print` | 1018 px | 1018 px | 984 px | **pass** (soglia 4000 `REPORT_EXPORT`) | **pass 0.967** |

### Confronto fra i due stati

| | minimal | data-bearing | Δ |
|---|---|---|---|
| `dynamic-cv` desktop | 1251 px | **1397 px** | **+146** |
| `dynamic-cv` mobile | 1606 px | **1832 px** | **+226** |
| `dynamic-cv/print` desktop | 1018 px | 1018 px | 0 — il documento resta più corto del viewport |
| `dynamic-cv/print` mobile | 930 px | **984 px** | **+54** |

Il ratio del Dynamic CV passa da 1.284 a **1.311**: cresce con il contenuto, resta `pass`, e resta sotto il
bound 1.35 del suo archetipo.

### Cosa lo stato popolato rende visibile, e quello vuoto no

- **barre del profilo pillar in funzione** — Life 1, Growth 1, le altre «non esplorato»: conteggio e barra
  scalata al massimo, nessuna percentuale, nessun ranking. È il trattamento scoped che W3B ha scelto per
  conformità privacy invece di `KORA-WP-142`, e a zero esperienze non si poteva vedere;
- **l'idoneità al badge come chip SULL'esperienza** («Idonea al badge»), non come regione autonoma — la
  correzione centrale di W3B;
- **la separazione fra esperienze condivisibili ed esperienze private** nel rail;
- **la tabella della stampa con entrambe le righe**, intestazioni `PILLAR · TITOLO · STATO · DATA`, e il nome
  del pillar **sempre come parola** («GROWTH», «LIFE»), mai solo come tinta — esattamente l'invariante che
  `282` dichiara per la riproduzione a colori deboli.

---

## 7. Tests

| Verifica | Esito |
|---|---|
| `npx tsc --noEmit` (con la fixture presente) | **exit 0** |
| Suite unit completa | **415 file · 14 022 passati · 0 falliti** |
| Validazione del cohort di evidenza | **14 / 14** (10 minimal + 4 data-bearing) |
| Suite di frontiera (`125` `126` `127` `128` `129`×2 `139`–`142`) | **338 / 338** |
| Guard privacy Worker + confine website | **482 / 482** |
| `checkRouteArchetypeDeclared` sulle 13 route | **13 / 13 PASS** |
| `checkSevenStateResolution` | **PASS** |
| Cattura data-bearing | **2 / 2**, ciclo completo ripetuto due volte |

Baseline precedente 415 / 14 018 → **415 / 14 022**: il delta è esattamente i 4 nuovi test di validazione
dello stato data-bearing.

**Un test preesistente è stato aggiornato, non indebolito.** `names one entry per declared surface` assumeva
una voce di manifest per route; ora due superfici ne hanno due, una per stato. L'asserzione nuova è **più
stretta**: l'insieme delle route deve ancora coincidere esattamente con le superfici dichiarate, **e in più**
ogni superficie dichiarata deve avere la sua voce *minimal* — lo stato data-bearing la integra, mai la
sostituisce.

**Invarianti di prodotto:** `PRODUCT IMPLEMENTATION FILES CHANGED: 0` · `PRIVACY GUARD FILES CHANGED: 0` ·
`REGISTRY FILES CHANGED: 0` · `AL.2 FILES CHANGED: 0`.

---

## 8. Manifest delta

`docs/product/visual-evidence/kora-wp-129/manifest.json` — da 13 a **15 voci**: 13 `minimal` + 2
`data-bearing`.

Aggiunto a ogni voce: `state`, `archive`, `captureRuntime`. Alle due voci data-bearing anche:
`fixtureSource`, `fixtureSourceCommit`, `fixtureOriginCommits`, `fixtureSha256`, `captureSpecSha256`.

Aggiunti in testata: `states` (definizione dei due stati) e `reproducibility.dataBearing`
(`runs: 2, identicalDigests: 6, total: 6`).

Quattro nuovi test verificano che: entrambe le superfici abbiano evidenza popolata a tutti i viewport
canonici; l'archivio data-bearing non contenga altro; **lo stato minimal non sia sovrascritto** e i due stati
coesistano con digest distinti; e che ogni voce data-bearing porti provenienza della fixture e runtime di
cattura.

### Nomenclatura

**Nessuna seconda convenzione introdotta.** `evidenceName()` è deterministico per contratto, quindi i due
stati collidono su un nome solo. Invece di allargare `EvidenceDescriptor` — `KORA-WP-126` è COMPLETE e non
viene riaperto — il **nome canonico resta identico** e a portare lo stato è la **radice dell'archivio**:
`data-bearing/`. L'unica modifica è un parametro opzionale `archiveState` nell'harness di evidenza.

---

## 9. Founder review links

Da `docs/product/visual-evidence/kora-wp-129/`:

| Priorità | Cosa guardare | File |
|---|---|---|
| **1** | `/worker/workspace` **mobile** — ratio 1.592, richiede giudizio visivo | `kora-wp-129__product__worker-workspace__mobile.png` |
| **2** | `/worker/dynamic-cv` **data-bearing mobile** | `data-bearing/kora-wp-129__product__worker-dynamic-cv__mobile.png` |
| **3** | `/worker/dynamic-cv` **data-bearing desktop** | `data-bearing/kora-wp-129__product__worker-dynamic-cv__desktop.png` |
| **4** | `/worker/dynamic-cv/print` **data-bearing** | `data-bearing/kora-wp-129__product__worker-dynamic-cv-print__{desktop,rail,mobile}.png` |
| **5** | `/worker/privacy` **mobile** | `kora-wp-129__product__worker-privacy__mobile.png` |
| 6+ | il resto del cohort minimal | `kora-wp-129__product__*` |

Le immagini **data-bearing** non hanno l'indicatore di sviluppo; quelle **minimal** sì (§4 e il pack).

---

## 10. Remaining limitations

| | Limitazione | Stato | Bloccante |
|---|---|---|---|
| **L1** | Dynamic CV senza evidenza a contenuto reale | **RESOLVED** | — |
| **L1-r** | La fixture produce **2** esperienze, non le 20 del report `282`; il comportamento a contenuto molto lungo resta non riprodotto perché nessun meccanismo nel repository genera quel volume | dichiarata | **NO** |
| **L2** | `/worker/onboarding` evidenziata nello stato `?mode=review` | ACCEPTABLE DECLARED LIMITATION | **NO** |
| **F1** | `/worker/workspace` ratio **1.592**, oltre il bound 1.35 del suo archetipo, a 0.008 dal fail; nessun difetto visivo | FOUNDER REVIEW REQUIRED | **NO** |
| **F2** | `/worker/privacy` ratio 1.518, dentro il bound 1.6 | PASS | **NO** |
| **F3** | `data-testid="dynamic-cv-container"` scartato da `<Workspace>` | TEST AFFORDANCE ONLY | **NO** |
| **F4** | Indicatore di sviluppo nelle immagini **minimal**, storiche incluse; **assente** nelle data-bearing | dichiarata | **NO** |
| **F5** | La fixture accumula un worker non-onboarded per esecuzione; rimosso esplicitamente, non corretto nella fixture | dichiarata | **NO** |
| **F6** | `koratest-canonical-seed.ts` riporta `permission denied for table methodology_snapshot` dopo aver committato i record UEF | dichiarata | **NO** |

**Difetti di implementazione di prodotto: 0.**

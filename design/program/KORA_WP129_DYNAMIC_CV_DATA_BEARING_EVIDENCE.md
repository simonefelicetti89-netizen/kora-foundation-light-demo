# KORA-WP-129 — Dynamic CV Data-Bearing Evidence

**Modalità:** completamento di evidenza. Nessun redesign, nessuna implementazione di prodotto, nessuna
modifica alla Registry, **nessuna chiusura formale**.
**Data:** 2026-10-02 · **aggiornato** con l'adjudication finale di L1-r e l'igiene della fixture

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

---

## 11. Adjudication finale di L1-r — report 282

### Il report 282 è accettato a QUESTO stesso SHA

| | |
|---|---|
| File | `.kora-audit/output/282_KORA_WP129_W3B_PUBLICATION_AND_FOUNDER_ACCEPTANCE.md`, blob `1002f439503b83c6` |
| **Product SHA accettato** | **`2fd03eab3b1290a8c9e480229b6e35ddadd21e75`** — citato 6 volte nel report |
| Baseline di questo lavoro | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` |
| Relazione | **IDENTITÀ, non equivalenza: è lo stesso commit** |
| Founder ruling, verbatim | «**W3B VISUAL ACCEPTANCE — GRANTED**, material and exact-SHA bound» |
| Prova CI | KORA CI #362 run `36477773252` (proof) e #363 run `36478306009` (canonica), quattro job verdi |

**Classificazione §3: CODE-EQUIVALENT per identità.** Non c'è un delta da valutare su `DynamicCVClient`,
sulla route, sui wrapper di layout, sul CSS responsive, sul rendering di esperienze e pillar, sulla stampa,
sul mapping dati o sui componenti condivisi — perché non esiste alcun commit fra lo SHA accettato e il
nostro.

### Il contenuto lungo era un requisito di acceptance o evidenza di supporto?

**EVIDENZA DI SUPPORTO, e per di più già adjudicata come residuo accettato.**

Il report `282` §12 «Residuals carried into the WP129 OVERALL CLOSURE review», voce 2, verbatim:

> «Desktop populated Dynamic CV length can exceed the `RECORD_DETAIL` warn threshold — **2730px against
> 2500 with 20 real experiences**. It is the real length of the record; shortening it would mean hiding
> experiences. **Same precedent as W1's accepted `activity-discovery` length WARN.**»

Le misure di contenuto lungo compaiono nel §3 come **descrizione del prima → dopo della remediation**
(4104 → 2730 px, 103 elementi sotto-floor → 0, lint 150 → 5), non come criterio da soddisfare.

**Il report `282` non contiene alcun requisito di screenshot.** Ricerca su `screenshot`, `visual evidence`,
`png`, `capture`: **zero occorrenze**. La §11 «Local validation at the accepted candidate» elenca TypeScript
exit 0, 32 file / 1284 test, 10 file / 414 test, suite completa 446 file / 14 130 test, lint 0 errori, build
di produzione exit 0 — **nessuna immagine**. La visual acceptance fu concessa su prova DOM, misure e test.

### Verdetto

## **L1-r = RESOLVED BY REPORT-282 CURRENTLY-VALID EVIDENCE**

Il criterio che il contenuto lungo avrebbe dovuto provare è **già stato accettato dal Founder, a questo
stesso SHA, e registrato come residuo accettato** con lo stesso precedente del WARN di lunghezza di W1.
Nessuna nuova evidenza a contenuto lungo è richiesta, e **non ho costruito una fixture da 20 esperienze**:
sarebbe stato fabbricare un numero per soddisfare un requisito che non esiste.

L'evidenza data-bearing a 2 esperienze resta preziosa per ciò che aggiunge — barre pillar in funzione, badge
come chip, split privato/condivisibile, tabella di stampa con entrambe le righe — e non per colmare un vuoto
di acceptance che il `282` aveva già chiuso.

---

## 12. Igiene della fixture — esito

### F5 · worker non-onboadrded accumulato — **CORRETTO**

**Causa.** Il blocco di delete idempotente copre le righe che portano il marcatore `[W129-REVIEW-FIXTURE]`.
Il worker non-onboarded creato al passo 5 ha invece `worker_ref` con **suffisso casuale**
(`W129-REVIEW-FIXTURE-ONBOARDING-<suffix>`), quindi non rientrava in alcun `like` del blocco e ogni
esecuzione ne lasciava uno. Misurato: tre esecuzioni, tre worker residui.

**Quando si verificava.** Sia su successo sia su fallimento tardivo: la creazione avviene verso la fine, e
nulla la rimuoveva né a fine run né all'inizio del successivo. L'isolamento per tenant non è mai stato
compromesso — i worker appartengono tutti al tenant golden-path.

**Correzione — solo nella fixture di evidenza, nessun comportamento di Prodotto toccato.** Il blocco
idempotente ora rimuove per prefisso `worker_ref` il profilo, l'identità **e l'utente auth**.

**Un secondo residuo, trovato correggendo il primo.** Lo sweep è indicizzato su `worker_identity`: un utente
auth la cui identità fosse già stata rimossa per altra via diventa irraggiungibile e si accumula.
**Ne sono stati trovati 13**, prodotti anche dal mio stesso cleanup manuale della sessione precedente, che
cancellava le identità senza i rispettivi utenti. La fixture ora spazza anche per forma dell'email
(`e2e-worker-onboarding-%@e2e-local.test`), così la pulizia smette di dipendere da quale riga sia stata
cancellata per prima.

**Risultato misurato su due run consecutivi finali:**

| | RUN A | RUN B |
|---|---|---|
| worker non-onboarded di run precedenti rimossi | 1 | 1 |
| utenti auth orfani rimossi | **13** | 0 |
| **utenti auth orfani residui** | **0** | **0** |
| worker non-onboarded presenti a fine run | 1 — **lo stato corrente, che la fixture provvede apposta** per `/worker/onboarding` | 1 |
| tenant non correlati alterati | 0 | 0 |
| worker golden-path alterati | 0 | 0 |

**Residui da esecuzioni precedenti: 0.** L'unico worker presente è quello della run corrente, che è lo scopo
dichiarato del passo 5, non residuo.

### F6 · `methodology_snapshot` — **AUTHORIZATION BUG (di Prodotto), non soppresso**

**Causa esatta.** `supabase/migrations/049_methodology_snapshot.sql` crea
`analytics.methodology_snapshot`, abilita RLS, e concede **`GRANT SELECT ... TO authenticated`** — e
**nulla a `service_role`**. Il commento della migrazione stessa dichiara: «only KORA_ADMIN (via
`service_role` in application code) ever inserts». **`service_role` bypassa RLS ma non i GRANT di tabella**,
quindi l'insert in `lib/live/persistence.ts:147` fallisce.

**Verificato sul database reale**, non dedotto:

| Tabella | `authenticated` | `service_role` |
|---|---|---|
| `analytics.uef_record` | SELECT | **DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE** |
| `analytics.methodology_snapshot` | SELECT | **nessun grant** |

| Domanda §7 | Risposta |
|---|---|
| Chiamante esatto | `lib/live/persistence.ts` § «0. methodology_snapshot — B-SNAP / CC-015», insert via client service-role |
| Ruolo atteso | `service_role`, come dichiara il commento della migrazione 049 |
| Operazione necessaria? | **sì in Prodotto** — ogni risultato persistito vi si lega via `methodology_snapshot_id`; **no per questa evidenza** |
| Prima o dopo lo stato di evidenza richiesto? | **dopo** — i 2 record UEF sono già committati e auto-approvati quando l'errore scatta |
| Transazione parziale? | sì: UEF committati, snapshot no. Non è un rollback atomico |
| Viola il fail-closed? | **no per la fixture**, che ora si ferma su qualunque altro errore; **sì come difetto di Prodotto**: una capability dichiarata nella migrazione non è concessa al ruolo che deve usarla |

**Classificazione: AUTHORIZATION BUG.** Non un bug dell'harness, non della fixture, non «atteso e non fatale».
È una `GRANT` mancante nello schema di Prodotto.

**Non l'ho corretto** — nessuna modifica di Prodotto, nessuna migrazione. **E non l'ho soppresso**: la
fixture ora riconosce *questa specifica* condizione classificata e **fallisce su qualunque altro errore**,
invece di tollerarne uno qualsiasi. Un errore inatteso adesso ferma il run.

> **Da portare alla WP129 OVERALL CLOSURE come item di Prodotto, separato dall'evidenza.** L'impatto non è
> limitato alla fixture: ogni persistenza di `runKoraPipeline` che passa dal client service-role incontra la
> stessa mancanza.

---

## 13. Run di evidenza finale a zero errori

Sequenza completa eseguita **due volte**, contro il build di produzione dello SHA esatto.

| | RUN A | RUN B |
|---|---|---|
| **Exit del seed** | **0** | **0** |
| **stderr inatteso** | **0 byte** | **0 byte** |
| **Exit della cattura** | **0** | **0** |
| Catture | 6 | 6 |
| **Record fixture residui da run precedenti** | **0** | **0** |
| **Dati non correlati modificati** | **0** | **0** |
| **Byte-identiche fra A e B** | colspan | **6 / 6** |

I sei digest sono inoltre **identici a quelli della sessione precedente** — l'igiene della fixture non ha
alterato l'evidenza.

**Invarianti:** `PRODUCT IMPLEMENTATION FILES CHANGED: 0` · `PRIVACY GUARD FILES CHANGED: 0` ·
`REGISTRY FILES CHANGED: 0` · `AL.2 FILES CHANGED: 0`.

**Test dopo l'igiene:** `tsc --noEmit` exit 0 · suite unit **415 file / 14 022 passati / 0 falliti** ·
frontiera **338/338** · guard privacy **482/482** · validazione cohort **14/14** ·
`checkRouteArchetypeDeclared` **13/13** · `checkSevenStateResolution` **PASS**. Nessun test indebolito.


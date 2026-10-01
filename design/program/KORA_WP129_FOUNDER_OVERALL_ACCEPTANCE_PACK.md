# KORA-WP-129 — Founder Overall Acceptance Pack

---

## 1. What is being accepted

L'**esperienza Worker completa** di KORA — 13 superfici reali — portata allo north star `KORA-WP-124`
attraverso quattro coorti già pubblicate e accettate (W1, W2, W3A, W3B) più il bug-fix Dynamic CV, e ora
**provata da un insieme di evidenza unico, canonico e rigenerabile** anziché da nove catture storiche isolate.

Questa è l'**acceptance complessiva cross-surface** che i cinque record di pubblicazione dichiaravano
necessaria e che nessuno di essi copriva.

---

## 2. Product SHA

```
2fd03eab3b1290a8c9e480229b6e35ddadd21e75
```

Testa di `origin/integration/kora-canonical-product-2026-09-22` = `origin/integration/wp129-w3b-proof-2026-09-28`.
**Invariato da questo lavoro.**

**Evidence commit SHA:** vedi §15 — è un *portatore di evidenza* basato su quello SHA, **non** la nuova
verità di prodotto.

---

## 3. Governance authority

```
a1a7797bc3b9bc0ba51b55b24b0ed110798feb3e
```

Registry `219` § B voce `KORA-WP-129` (DELTA 3, emendata da DELTA 5 report `266`, risolta prospettivamente da
`AN.10` report `277`) + § B voce `KORA-WP-126` come tassonomia di acceptance eseguibile.

«Benchmark V2 Gates A–I» **non è stato usato**: `AN.10` lo risolve alla tassonomia `126` e nega l'equivalenza
storica.

---

## 4. 13 real surfaces

Derivate dal codice (`ROUTE_ARCHETYPE` incrociata con i `page.tsx` reali), non da un report.
**14 route `/worker/*` = 13 superfici reali + 1 redirect puro** (`/worker/login`, correttamente senza
archetipo e senza evidenza).

| Superficie | Archetipo | Coorte |
|---|---|---|
| `/worker/workspace` | `EXECUTIVE_JUDGMENT` | — |
| `/worker/privacy` | `DISCLOSURE_STATIC` | — |
| `/worker/activity-discovery` | `DIRECTORY_INDEX` | W1 |
| `/worker/activity-discovery/detail` | `RECORD_DETAIL` | W1 |
| `/worker/kora-link/activate` | `DISCLOSURE_STATIC` | W1 |
| `/worker/bookings` | `OPERATIONAL_WORKSPACE` | W2 |
| `/worker/commons` | `DIRECTORY_INDEX` | W2 |
| `/worker/opportunities` | `DIRECTORY_INDEX` | W2 |
| `/worker/personal-impact-balance` | `RECORD_DETAIL` | W2 |
| `/worker/onboarding` | `OPERATIONAL_WORKSPACE` | W3A |
| `/worker/setup-password` | `OPERATIONAL_WORKSPACE` | W3A |
| `/worker/dynamic-cv` | `RECORD_DETAIL` | W3B |
| `/worker/dynamic-cv/print` | `REPORT_EXPORT` | W3B |

---

## 5. Evidence coverage

| | |
|---|---|
| Superfici nella spec di cattura | **13 / 13** (erano 2 / 13) |
| Evidenza `product__` valida | **13 / 13** — 39 immagini |
| Rigenerabili dalla spec | **13 / 13** (erano 2 / 13) |
| Byte-identiche su due run indipendenti | **39 / 39** |
| Classi di evidenza non canoniche usate per acceptance | **0** |
| Artefatti storici cancellati | **0** — 12 conservati e allow-listati |

Rigenerabile in ~45 s: `npx playwright test tests/e2e/kora-wp-129-worker-capture.spec.ts`

---

## 6. Responsive coverage

Matrice canonica `KORA-WP-126`, letta dall'autorità e non scelta: **desktop 1440×900 → shell `full`**,
**rail 1200×900 → `rail`**, **mobile 767×812 → `mobile`**, con `guardViewport()` fail-closed.
**39 catture = 13 × 3. Stati richiesti mancanti: 0.**

Tutte `length` **pass** tranne un WARN accettato; tutte `ratio` **pass** tranne due WARN (§9, §10).

---

## 7. Visual review order

Dettaglio completo in `KORA_WP129_FOUNDER_VISUAL_REVIEW_INDEX.md`. Ordine:

| # | Superficie | Perché qui | desktop / rail / mobile |
|---|---|---|---|
| **1** | `/worker/workspace` | mai evidenziata prima **e** ratio **1.592** | `worker-workspace__{desktop,rail,mobile}` |
| **2** | `/worker/privacy` | mai evidenziata prima, parte esplicita dell'acceptance WP129 | `worker-privacy__{…}` |
| **3** | `/worker/dynamic-cv` | nuova evidenza **a zero esperienze** + le 3 `diagnostic__` storiche come **contrasto**, non come complemento | `worker-dynamic-cv__{…}` + `diagnostic__worker-dynamic-cv__{…}` |
| **4** | `/worker/dynamic-cv/print` | mai evidenziata prima | `worker-dynamic-cv-print__{…}` |
| **5** | `/worker/onboarding` | mai evidenziata; limitazione L2 dichiarata | `worker-onboarding__{…}` |
| **6** | `/worker/setup-password` | mai evidenziata | `worker-setup-password__{…}` |
| 7 | `/worker/activity-discovery` | WARN di lunghezza accettato, **riprodotto al pixel** (2308 px) | `worker-activity-discovery__{…}` |
| 8 | `/worker/activity-discovery/detail` | conferma W1 | `worker-activity-discovery-detail__{…}` |
| 9 | `/worker/kora-link/activate` | conferma W1 | `worker-kora-link-activate__{…}` |
| 10 | `/worker/opportunities` | conferma W2 | `worker-opportunities__{…}` |
| 11 | `/worker/bookings` | conferma W2 | `worker-bookings__{…}` |
| 12 | `/worker/commons` | conferma W2, meno iniziative del seed | `worker-commons__{…}` |
| 13 | `/worker/personal-impact-balance` | conferma W2, stato zero del PIB | `worker-personal-impact-balance__{…}` |

Tutti in `docs/product/visual-evidence/kora-wp-129/`, prefisso `kora-wp-129__product__`.

> **Prima di guardare.** Ogni immagine dell'archivio — **incluse quelle storiche già passate sotto Founder
> review** — contiene un badge circolare scuro con la «N» di Next.js, indicatore della modalità sviluppo,
> che nella cattura a pagina intera finisce in mezzo al documento. Nella `worker-workspace__mobile` copre
> «IL» di «IL MIO STORICO». **Non è Product.** È un effetto di `playwright.config.ts`, che avvia il server
> con `npm run dev`. Sistemico e pre-esistente, non introdotto ora.

---

## 8. Dynamic CV full-state evidence

**Non esiste, e non è mai esistita.**

Verificato su tutta la storia del repository: **un solo commit** (`099b5d5`) ha mai archiviato immagini del
Dynamic CV — 3 file `diagnostic__`, una kind che il protocollo (`EvidenceKind = 'product' | 'mockup'`) non
può esprimere. Lette direttamente, mostrano **2 esperienze**, non 20, altezza **1933 px**, non 4104, e la UI
**pre-remediation** con tutte le regioni che W3B dichiara rimosse.

Fra quella cattura e `2fd03ea`, `DynamicCVClient.tsx` è cambiato di **875 righe**. **Classificazione:
STALE.**

Le misure del report `282` — 2730 px, 20 esperienze, 103 elementi sotto-floor azzerati, ratio 1.254 — sono
**misurazioni di sessione provate nel DOM, mai archiviate come immagini**.

**Cosa la nuova evidenza prova comunque**, per differenza contro la `diagnostic__`: rail da 5 regioni a 3
gruppi semantici, «Opzioni di condivisione future» assente, «In arrivo»/«Pianificato» assenti, «Badge e
credenziali» come regione autonoma assente, lista esperienze duplicata assente, un pillar per riga senza
percentuali né ranking. **Cosa non prova:** il comportamento a contenuto lungo.

**Il meccanismo per produrla esiste ma non è pubblicato:**
`scripts/e2e/seed-local-worker-review-states.ts`, introdotto da `3b324c6` ed esteso da `1b327c0` — il commit
che la Registry dichiara **«excluded from Product publication — not an ancestor, 0 remote refs»**. È ciò che
generò le voci `[W129-REVIEW-FIXTURE]` visibili nelle immagini storiche. **Non l'ho pubblicato, copiato o
eseguito, e non ho creato alcun dato sintetico di partecipazione.**

---

## 9. Workspace ratio finding

**`/worker/workspace` · ratio desktop→mobile 1.592** · desktop 1628 px, rail 2485, mobile 2592.

Il bound dichiarato dal suo archetipo `EXECUTIVE_JUDGMENT` è **1.35**; la soglia globale di `fail` è **1.6**.
Verdetto meccanico: **`warning`**, a **0.008** dal `fail`.

Esame diretto della cattura mobile: nessuno spazio vuoto eccessivo, nessun impilamento superfluo, nessun
clipping, nessuna collisione con la navigazione, nessuna CTA spostata, raggruppamento leggibile, gerarchia
intatta. **Visivamente pulita.**

**Verdetto: FOUNDER REVIEW REQUIRED.** Non è un fallimento e non l'ho corretto — `141` vieta di inseguire la
ratio («a detector, never a target»). La domanda non è come abbassare il numero, ma **se un workspace
`EXECUTIVE_JUDGMENT` debba presentare otto regioni su mobile.**

---

## 10. Privacy ratio finding

**`/worker/privacy` · ratio 1.518** · desktop 1332 px, rail 1316, mobile 2022. Bound del suo
`DISCLOSURE_STATIC`: **1.6** — **dentro**.

Esame diretto: gerarchia limpida, nessun clipping, nessuna collisione, CTA presente, soglia dei dieci
lavoratori dichiarata nel corpo. **Verdetto: PASS.** Non ottimizzata solo perché il numero è alto.

---

## 11. Declared limitations

| | Limitazione | Classificazione | Bloccante |
|---|---|---|---|
| **L1** | `/worker/dynamic-cv` e `/worker/dynamic-cv/print` evidenziate a **zero esperienze**; nessuna evidenza storica a stato pieno esiste; il fixture che la produrrebbe **non è pubblicato** | REQUIRES NEW DATA-BEARING EVIDENCE | **NO** — 2 su 13 |
| **L2** | `/worker/onboarding` evidenziata nello stato **review**, non primo accesso | ACCEPTABLE DECLARED LIMITATION | **NO** — lo stato review è dentro l'ambito accettato da W3A |
| **F1** | `/worker/workspace` ratio 1.592, oltre il bound 1.35 del suo archetipo | FOUNDER REVIEW REQUIRED | **NO** |
| **F3** | `data-testid="dynamic-cv-container"` scartato da `<Workspace>`, non raggiunge il DOM | TEST AFFORDANCE DEFECT | **NO** |
| **F4** | badge dev Next.js in tutte le immagini, storiche incluse | contaminazione harness, pre-esistente | **NO** |

**Residui portati avanti dalle pubblicazioni precedenti, non risolti qui:** `Foundation Light` nell'item
`Collettivo` del sidebar Worker (`components/layout/Sidebar.tsx`, file non autorizzato alla modifica);
composizione PIB non dichiarata finale; mapping zero-state PIB; warning di spaziatura ottica al precedente
W1/W2; WARN di lunghezza accettati su `activity-discovery` (2308 px) e Dynamic CV.

**Difetti di implementazione di prodotto trovati: 0.**

---

## 12. Tests

Allo SHA Product esatto, con `npm ci` sul lockfile Product (`next 16.3.3`, `vitest 4.1.11`, Node v24.15.0):

| Verifica | Esito |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| Suite unit completa | **415 file · 14 018 passati · 0 falliti** |
| Suite di frontiera (`125` `126` `127` `128` `129`×2 `139`–`142`) | **338 / 338** |
| Guard privacy Worker + confine website | **482 / 482** |
| `checkRouteArchetypeDeclared` sulle 13 route | **13 / 13 PASS** |
| `checkSevenStateResolution` | **PASS** |
| Validazione del cohort di evidenza (nuova) | **10 / 10** |
| Cattura | **14 / 14**, ripetuta due volte |

Baseline pre-modifica 414 file / 14 008 → 415 / 14 018: il delta è esattamente il test di validazione.
**Zero regressioni. Nessun test di prodotto modificato.**

**CURRENT LOCAL VERIFICATION, non CI.** `gh` è assente: **non affermo che alcun check GitHub sia verde
adesso.** La CI exact-SHA storica su `2fd03ea` resta KORA CI #362 run `36477773252` e #363 run `36478306009`.

---

## 13. What Founder acceptance DOES mean

Accettare qui significa dichiarare che:

1. le **13 superfici reali** dell'ambiente Worker sono quelle giuste, e `/worker/login` è correttamente
   fuori dal cohort;
2. l'**insieme di evidenza è adeguato** come base di acceptance: canonico, completo, rigenerabile;
3. le superfici viste sono **visivamente accettabili** per i criteri che restano giudizio tuo — Logo-Off,
   premium moments, acceptance visiva finale — e per quelli review-enforced: gerarchia, scanability,
   actionability, craft;
4. **F1** (workspace a 1.592) è accettato come residuo, oppure diventa un item di remediation;
5. **L1** e **L2** sono accettate come limitazioni dichiarate non bloccanti, oppure L1 richiede la
   pubblicazione del fixture prima di procedere;
6. i residui ereditati elencati in §11 sono accettati come tali.

---

## 14. What it DOES NOT mean

Non significa, e questo documento non lo produce:

- **non è chiusura formale di `KORA-WP-129`** — nessun report di OVERALL CLOSURE è stato scritto;
- **non è una voce AL.2** — `129` resta fuori dall'insieme COMPLETE;
- **non cambia lo stato nella Registry 219** — `129` resta `READY`;
- **non sblocca `KORA-WP-131`**, che resta BLOCKED su `127`, `128` e `129`;
- **non autorizza l'avvio di `131`**;
- **non è acceptance di `127` o `128`**, che restano READY con copertura archetipi al 6% e 31%;
- **non è acceptance a stato pieno del Dynamic CV** — vedi L1;
- **non è acceptance dello stato di primo accesso dell'onboarding** — vedi L2;
- **non è una modifica di prodotto**: 0 file di implementazione toccati.

---

## 15. Acceptance wording

Preparata, **NON applicata**. Nessuna voce AL.2 scritta, Registry non modificata.

> **FOUNDER OVERALL ACCEPTANCE — KORA-WP-129 Worker Experience Remediation**
>
> Accetto l'esperienza Worker nel suo complesso, sulle **13 superfici reali** dichiarate in
> `ROUTE_ARCHETYPE`, al **Product SHA `2fd03eab3b1290a8c9e480229b6e35ddadd21e75`**, provata dall'insieme di
> evidenza preservato nel **commit di evidenza `<EVIDENCE_COMMIT_SHA>`** sul branch
> `evidence/wp129-overall-2026-10-01`, contro l'autorità di governance
> **`a1a7797bc3b9bc0ba51b55b24b0ed110798feb3e`** — Registry 219 § B `KORA-WP-129` come emendata da DELTA 5 e
> risolta da `AN.10`, con la tassonomia § B `KORA-WP-126` come autorità di acceptance eseguibile.
>
> **Ambito:** acceptance visiva e di esperienza cross-surface delle 13 superfici Worker. Il Product SHA non
> è modificato da questa acceptance; il commit di evidenza è un portatore di evidenza basato su di esso e
> **non** è la nuova verità di prodotto.
>
> **Limitazioni dichiarate, che accetto come NON BLOCCANTI:**
> **L1** — `/worker/dynamic-cv` e `/worker/dynamic-cv/print` sono evidenziate a zero esperienze; nessuna
> evidenza storica a stato pieno esiste e il fixture che la produrrebbe
> (`scripts/e2e/seed-local-worker-review-states.ts`, su `1b327c0`) resta escluso dalla pubblicazione Product.
> Il comportamento a contenuto lungo di queste due superfici **non è coperto da questa acceptance**.
> **L2** — `/worker/onboarding` è evidenziata nello stato `?mode=review`, dentro l'ambito già accettato da
> W3A; lo stato di primo accesso non è coperto.
> **F1** — `/worker/workspace` presenta un ratio desktop→mobile di 1.592, oltre il `maxMobileRatio` 1.35 del
> suo archetipo `EXECUTIVE_JUDGMENT` e a 0.008 dalla soglia di fail; nessun difetto visivo è stato
> riscontrato e lo accetto come residuo.
> **F3** — `data-testid="dynamic-cv-container"` non raggiunge il DOM: difetto di affordance di test, nessun
> impatto di prodotto.
> **F4** — tutte le immagini dell'archivio, storiche incluse, contengono l'indicatore di sviluppo di
> Next.js, che non è Product.
>
> **Questa acceptance NON è:** chiusura formale di `KORA-WP-129`, una voce AL.2, un cambio di stato nella
> Registry 219, lo sblocco o l'autorizzazione di `KORA-WP-131`, né acceptance di `KORA-WP-127` o
> `KORA-WP-128`.

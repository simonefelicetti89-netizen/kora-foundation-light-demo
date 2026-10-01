# KORA-WP-129 Evidence Completion

**Modalità:** evidence engineering. Nessuna implementazione di prodotto, nessun redesign, nessun nuovo passo
visivo. **Nessuna chiusura formale, nessuna voce AL.2, nessuna modifica alla Registry 219, nessun commit,
nessun push.**
**Data:** 2026-10-01

---

## 1. Exact Product Baseline

| | |
|---|---|
| **Product SHA** | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` |
| Ref | `origin/integration/kora-canonical-product-2026-09-22` = `origin/integration/wp129-w3b-proof-2026-09-28` |
| Modello di verifica | **worktree detached a doppia ref**, come approvato |
| Dipendenze | `npm ci` sul lockfile Product → `next 16.3.3`, `vitest 4.1.11`; Node `v24.15.0` (dentro `engines: >=24 <25`) |
| Infrastruttura di cattura | Supabase **locale** su `127.0.0.1:54321` (83/83 migrazioni applicate), seed `scripts/e2e/seed-local-golden-path.ts` con gate `E2E_LOCAL_SEED_CONFIRM=YES`, server `npm run dev` su `localhost:3000`, Playwright chromium |

**Nessun contatto con staging o produzione.** Il seed rifiuta per costruzione i ref
`azdnepfmwrmacruykskm` (produzione) e `haqflkurpmeaxpikozjl` (staging), e `readLocalSessionConfig` rifiuta
qualunque host non-loopback. Le credenziali generate sono finite in `.env.e2e-local-golden-path.local`
(gitignored) e non sono state stampate.

### Stato del repository — prima e dopo

| | prima | dopo |
|---|---|---|
| ref corrente | `audit/mega-code-truth-2026-09` @ `a1a7797` | **invariato** |
| worktree registrati | 23 | **24** — il worktree detached è **mantenuto**: contiene il lavoro non committato |
| branch | 202 | **202** — nessun branch creato |
| file modificati (worktree governance) | 3 | **3** — invariati |
| percorsi non tracciati (worktree governance) | 10 | 11 — solo `design/program/` di questi report |
| stash | 0 | **0** |
| tag | 1 | **1** — `1151ab2` **UNCHANGED**, nessun tag, nessun push, nessun branch |

**Perché il worktree è mantenuto.** Senza autorizzazione a committare, le 51 PNG e le tre modifiche di
tooling esistono solo come working tree. Il worktree detached a
`scratchpad/wp129-evidence` è quindi la loro sede, e per durabilità la patch del tooling è copiata in
`design/program/wp129-evidence-pass/`. Il cohort è comunque **rigenerabile in ~45 s** dalla spec — è questo,
e non il file PNG, il vero artefatto durevole.

### Effetto collaterale dell'harness, dichiarato

`npm run dev` di Next.js **riscrive `CLAUDE.md`** da sé, appendendovi un blocco
`<!-- BEGIN:nextjs-agent-rules -->`. Non è una mia modifica. L'ho ripristinato con `git checkout -- CLAUDE.md`
ogni volta che è ricomparso, e il conteggio finale dei file di prodotto modificati è **0**. Va saputo: chiunque
esegua questa cattura vedrà `CLAUDE.md` sporcarsi, e il rimedio pulito sarebbe `agentRules: false` in
`next.config` — **che è una modifica di prodotto e non l'ho fatta.**

---

## 2. Governance Authority

| | |
|---|---|
| **Governance SHA** | `a1a7797bc3b9bc0ba51b55b24b0ed110798feb3e` |
| Ref | `audit/mega-code-truth-2026-09` = `origin/audit/mega-code-truth-2026-09` |
| Autorità letta | Registry `219` § B voce `KORA-WP-129` (originale DELTA 3, emendata da DELTA 5 report `266`, risolta prospettivamente da `AN.10` report `277`) + § B voce `KORA-WP-126` come tassonomia di acceptance eseguibile |

**La governance è stata solo letta.** Nessun file `.kora-audit/**` copiato nel ref Product, nessun commit di
governance mergiato, nessuna modifica alla Registry 219. I due SHA sono citati separatamente, e il manifest
li registra entrambi in campi distinti (`productSha`, `governanceAuthoritySha`), con un test che fallisce se
coincidono.

**«Gates A–I» non è stato usato.** `AN.10` lo risolve prospettivamente alla tassonomia `126` e nega
l'equivalenza storica. L'acceptance di questo cohort è misurata contro i check meccanici di `126` e nulla
altro.

---

## 3. Canonical 13-Surface Inventory

**Derivato dal codice, non da un report.** Fonte primaria `lib/design/page-archetypes.ts` →
`ROUTE_ARCHETYPE`, incrociata con i `page.tsx` reali sotto `app/worker/**` e con la classificazione
redirect/superficie letta file per file.

Risultato della derivazione: **14 route `/worker/*` · 13 superfici reali · 1 redirect puro · 13 archetipi
dichiarati · 0 superfici reali senza archetipo · 0 archetipi dichiarati per route inesistenti.**

| Route | Reale/Redirect | Categoria WP126 (= archetipo) | Evidenza richiesta | Presente prima | Riproducibile prima | Presente dopo | Riproducibile dopo |
|---|---|---|---|---|---|---|---|
| `/worker/workspace` | REALE | `EXECUTIVE_JUDGMENT` | 3 viewport | sì — **riferimento pre-migrazione** | **sì** (spec Wave 4a) | **sì** | **sì** |
| `/worker/privacy` | REALE | `DISCLOSURE_STATIC` | 3 viewport | sì — **riferimento pre-migrazione** | **sì** (spec Wave 4a) | **sì** | **sì** |
| `/worker/activity-discovery` | REALE | `DIRECTORY_INDEX` | 3 viewport | sì, **slug legacy** | no | **sì** | **sì** |
| `/worker/activity-discovery/detail` | REALE | `RECORD_DETAIL` | 3 viewport | sì, **slug legacy** | no | **sì** | **sì** |
| `/worker/kora-link/activate` | REALE | `DISCLOSURE_STATIC` | 3 viewport | sì, **slug legacy** | no | **sì** | **sì** |
| `/worker/bookings` | REALE | `OPERATIONAL_WORKSPACE` | 3 viewport | sì | no | **sì** | **sì** |
| `/worker/commons` | REALE | `DIRECTORY_INDEX` | 3 viewport | sì | no | **sì** | **sì** |
| `/worker/opportunities` | REALE | `DIRECTORY_INDEX` | 3 viewport | sì | no | **sì** | **sì** |
| `/worker/personal-impact-balance` | REALE | `RECORD_DETAIL` | 3 viewport | sì | no | **sì** | **sì** |
| `/worker/dynamic-cv` | REALE | `RECORD_DETAIL` | 3 viewport | **solo `diagnostic__`** | no | **sì** | **sì** |
| `/worker/dynamic-cv/print` | REALE | `REPORT_EXPORT` | 3 viewport | **no** | no | **sì** | **sì** |
| `/worker/onboarding` | REALE | `OPERATIONAL_WORKSPACE` | 3 viewport | **no** | no | **sì** | **sì** |
| `/worker/setup-password` | REALE | `OPERATIONAL_WORKSPACE` | 3 viewport | **no** | no | **sì** | **sì** |
| `/worker/login` | **REDIRECT** → `/login?role_hint=worker` | — nessuno, correttamente | **nessuna** | — | — | — | — |

**Un reperto di nomenclatura.** Tre superfici W1 portavano slug `activity-discovery`,
`activity-discovery-detail`, `kora-link-activate`. `routeSlug()` nel protocollo corrente produce
`worker-activity-discovery`, `worker-activity-discovery-detail`, `worker-kora-link-activate`. **Il protocollo
attuale non può generare i nomi storici** — prova indipendente, oltre all'assenza dalla spec, che quelle
catture non sono sue.

---

## 4. Capture Spec Before

`tests/e2e/kora-wp-129-worker-capture.spec.ts`, un solo commit (`3149256`, Wave 4a), **2 superfici su 13**:
`/worker/workspace` e `/worker/privacy` — esattamente le due che nessuna coorte di migrazione ha toccato.

La spec dichiarava di sé, verbatim:

> «This archive is **REFERENCE EVIDENCE, not a Founder-accepted baseline**: the contract requires none and
> none is registered.»

Le nove serie `product__` archiviate da W1 e W2 furono committate dentro i commit di implementazione
(`dba85fd`, `a379d5a`, `e8a4086`), non prodotte dalla spec. Le tre `diagnostic__` del Dynamic CV arrivarono
con `099b5d5`. W3A e W3B non archiviarono nulla.

**Riproducibilità prima: 2/13.**

---

## 5. Capture Spec After

Stessa spec, estesa a **13 superfici su 13** — 168 righe. Nessuna nuova architettura di evidenza: usa
l'harness condiviso `tests/e2e/helpers/px-capture.ts`, introdotto da `KORA-WP-127` e già riusato da `128` e
`129`, e non definisce soglia, viewport o verdetto propri.

**Tre proprietà che la rendono un protocollo e non un registro di run passati.**

1. **La lista superfici è verificata contro il codice, non riscritta a mano.** Un test dentro la spec stessa
   confronta le route catturate con `declaredRoutes().filter(startsWith('/worker'))` e **fallisce** se
   divergono. Una route Worker aggiunta o ritirata in Product non può più uscire silenziosamente dal cohort.
2. **Ogni readiness marker cita il file di prodotto che lo possiede.** Nessun selettore è inventato al call
   site; il campo `source` del protocollo porta la provenienza.
3. **`/worker/login` è escluso per contratto**, non per omissione: un test asserisce che non dichiara
   archetipo e non è catturato.

### Due modifiche minime all'harness, entrambe tooling di evidenza

| File | Modifica |
|---|---|
| `tests/e2e/helpers/px-capture.ts` | aggiunto `navigateTo?: string` opzionale a `CaptureSurface`, e `page.goto(surface.navigateTo ?? surface.route, …)`. L'evidenza resta attribuita a `route`: contratto d'archetipo, landing check e nome file lo usano, e il landing check di `126` confronta **pathname**, quindi una query string non può introdurre una superficie diversa. Serviva a `/worker/onboarding`. |
| `tests/e2e/kora-wp-129-worker-capture.spec.ts` | 2 → 13 superfici, readiness marker dichiarati, test di consistenza del cohort |

**Nessun file di prodotto è stato modificato.** Patch durevole in
`design/program/wp129-evidence-pass/capture-spec.patch` (218 righe).

---

## 6. Reproducibility Before / After

| | prima | dopo |
|---|---|---|
| Superfici nella spec | 2 / 13 | **13 / 13** |
| Serie `product__` rigenerabili dalla spec | 2 / 13 | **13 / 13** |
| Catture totali | 30 file (10 slug × 3) | **39 file (13 × 3)** |
| Classi di evidenza non canoniche referenziate | 3 (`diagnostic__`) | **0** |

### Prova di riproducibilità — due run indipendenti

Cartella svuotata, run 1; poi run 2 senza toccare nulla. Confronto dei digest SHA-256 e delle altezze di
documento:

```
catture: run1 = 39, run2 = 39
digest SHA-256 identici: 39 / 39
altezze di documento identiche: 39 / 39
```

**39 su 39 byte-identiche.** Vale segnalarlo oltre il risultato: la Registry 219 registrava come residuo
dello strumento `126` che «la cattura del rail a 1200px non è byte-riproducibile — due controlli a codice e
seed identici hanno prodotto byte diversi». In questo cohort **le 13 catture a 1200px sono byte-identiche fra
i due run.** Non riapro `126` e non dichiaro risolto quel residuo: dico solo che non si è riprodotto qui, con
fixture locali deterministiche e animazioni disattivate dall'harness.

---

## 7. EvidenceKind Cleanup

`lib/px-acceptance/evidence-protocol.ts` dichiara `export type EvidenceKind = 'product' | 'mockup'`, e
`evidenceName()` compone `[wp, kind, slug, viewport]`. **`diagnostic` non è esprimibile dal protocollo.**

**Non ho introdotto una terza kind, non ho alterato il tipo canonico, non ho rinominato nulla.**

I 12 artefatti storici sono **conservati sul disco** — 3 `diagnostic__` più le 9 `product__` a slug legacy — e
sono **allow-listati esplicitamente** nel test di validazione, con la motivazione scritta accanto. Non sono
tollerati in silenzio: un orfano **nuovo** fa fallire il test. E nessuno di loro è referenziato dal manifest,
cosa che un test verifica direttamente.

> Correzione di percorso, dichiarata: nel primo run avevo svuotato la cartella con `rm -rf`, cancellando quei
> 12 file. Il §7 del mandato vieta di eliminare evidenza storica. Li ho **ripristinati** da
> `git checkout HEAD --` e ristrutturato la validazione perché esprimesse il contratto corretto — gli
> artefatti storici coesistono, non vengono mai rivendicati — invece di far passare il test per assenza.

Per il Dynamic CV l'evidenza `product__` **è stata prodotta attraverso il flusso canonico di cattura**, non
rinominando uno screenshot diagnostico: i file portano i digest registrati nel manifest e provengono dai
`PX_EVIDENCE` dell'harness.

---

## 8. Complete Product Evidence Cohort

**39 catture = 13 superfici × 3 viewport canonici.** Tutte di kind `product`.

| Route | Archetipo | desktop 1440×900 | rail 1200×900 | mobile 767×812 | length | ratio mobile |
|---|---|---|---|---|---|---|
| `/worker/activity-discovery` | `DIRECTORY_INDEX` | 2308 px | 2500 px | 2840 px | **warn** (2000) | pass 1.231 |
| `/worker/activity-discovery/detail` | `RECORD_DETAIL` | 1018 | 1018 | 1042 | pass | pass 1.024 |
| `/worker/bookings` | `OPERATIONAL_WORKSPACE` | 1018 | 1156 | 1193 | pass | pass 1.172 |
| `/worker/commons` | `DIRECTORY_INDEX` | 1018 | 1018 | 930 | pass | pass 0.914 |
| `/worker/dynamic-cv` | `RECORD_DETAIL` | 1251 | 1525 | 1606 | pass | pass 1.284 |
| `/worker/dynamic-cv/print` | `REPORT_EXPORT` | 1018 | 1018 | 930 | pass | pass 0.914 |
| `/worker/kora-link/activate` | `DISCLOSURE_STATIC` | 1940 | 2046 | 2098 | pass | pass 1.081 |
| `/worker/onboarding` | `OPERATIONAL_WORKSPACE` | 1068 | 1068 | 948 | pass | pass 0.888 |
| `/worker/opportunities` | `DIRECTORY_INDEX` | 1018 | 1018 | 1014 | pass | pass 0.996 |
| `/worker/personal-impact-balance` | `RECORD_DETAIL` | 1018 | 1018 | 930 | pass | pass 0.914 |
| `/worker/privacy` | `DISCLOSURE_STATIC` | 1332 | 1316 | 2022 | pass | **warn 1.518** |
| `/worker/setup-password` | `OPERATIONAL_WORKSPACE` | 1068 | 1068 | 948 | pass | pass 0.888 |
| `/worker/workspace` | `EXECUTIVE_JUDGMENT` | 1628 | 2485 | 2592 | pass | **warn 1.592** |

**Il WARN di lunghezza su `/worker/activity-discovery` è 2308 px — esattamente la misura che la Registry 219
registra come residuo accettato di W1** (2308 px contro soglia 2000 px `DIRECTORY_INDEX`). L'harness riproduce
quello stato al pixel. È la corroborazione più forte che il cohort misura il Product accettato e non qualcosa
d'altro.

Nessun `fail`. I tre `warn` sono, per il contratto stesso, «a real finding to record, never a test failure».

---

## 9. Responsive Evidence

La matrice è stata **letta dall'autorità, non scelta da me**: `lib/px-acceptance/viewport-matrix.ts`
`CANONICAL_VIEWPORTS`, con `guardViewport()` che **fallisce chiuso** su larghezze non canoniche e nomina
quelle ammesse.

| id | larghezza × altezza | stato shell richiesto |
|---|---|---|
| `desktop` | 1440 × 900 | `full` |
| `rail` | 1200 × 900 | `rail` |
| `mobile` | 767 × 812 | `mobile` |

**Nessuna tassonomia responsive inventata.** Le tre classi del mandato (desktop, low-height desktop, mobile)
corrispondono a `desktop`, `rail`, `mobile`: la classe intermedia del progetto è definita per *larghezza* di
shell, non per altezza, e ho usato la definizione del progetto.

Per ognuna delle 39 catture il manifest registra: route, archetipo, stato, viewport id, larghezza, altezza di
viewport, altezza di documento, nome file, digest, kind, e se la cattura è byte-identica al rerun.
**Stati responsive richiesti mancanti: 0.**

### Due reperti nuovi, mai misurati prima

`/worker/workspace` e `/worker/privacy` non erano mai state in una coorte di migrazione e **non erano mai
state misurate**. Ora lo sono:

| Route | ratio desktop→mobile | verdetto globale | bound dichiarato dal suo archetipo |
|---|---|---|---|
| `/worker/workspace` | **1.592** | `warning` (≤1.6) | `EXECUTIVE_JUDGMENT` `maxMobileRatio` **1.35** — superato |
| `/worker/privacy` | **1.518** | `warning` (≤1.6) | `DISCLOSURE_STATIC` `maxMobileRatio` **1.6** — dentro |

`mobileRatioVerdict()` usa soglie globali (≤1.35 acceptable, ≤1.6 warning, >1.6 fail), quindi entrambe sono
**warning, non fail**. La distinzione che conta: `/worker/privacy` resta dentro il bound del proprio
archetipo; **`/worker/workspace` lo supera** (1.592 contro 1.35), ed è a 0.008 dalla soglia di `fail`.

**Non ho corretto nulla** — §3 vieta modifiche di prodotto e `141` è esplicito che la ratio è «a detector,
never a target: padding a desktop page to improve the ratio is a benchmark violation». Sono due reperti per
la OVERALL CLOSURE, non difetti bloccanti: scoperti dall'evidenza, che è precisamente ciò per cui l'evidenza
serve.

---

## 10. Workspace

`/worker/workspace` è **dentro il cohort canonico**, per la prima volta come superficie misurata e non come
riferimento pre-migrazione.

| Verifica | Esito |
|---|---|
| La route rende | **sì** — `[data-testid="workspace-page"]` visibile, landing check superato, 0 redirect |
| Archetipo corretto | `EXECUTIVE_JUDGMENT`, `checkRouteArchetypeDeclared` **pass**, warn 2500 px |
| Struttura WP125/WP126 già presente | **sì** — tutti e 3 i file importano `kora-design-tokens`; `page.tsx` consuma il barrel `components/ui/px` |
| Stato navigazione | shell `full` a 1440 — coerente con ciò che W3A provò byte-identico |
| Stato responsive | desktop 1628 px (pass), rail 2485, mobile 2592 → **ratio 1.592 `warning`** (§9) |
| Evidenza visiva | **3 catture `product__`**, byte-identiche al rerun |

**Nessun redesign.** Il WARN di ratio è registrato, non risolto.

---

## 11. Privacy

`/worker/privacy` è **dentro il cohort canonico**.

| Verifica | Esito |
|---|---|
| La route rende | **sì** — `[data-testid="worker-privacy-page"]` visibile, 0 redirect |
| Archetipo | `DISCLOSURE_STATIC`, **pass**, warn 6000 px |
| Superficie integrata, non adiacente | **sì** — vive in `app/worker/**` dentro il gate WORKER, è raggiunta dal rail Worker, `/my-kora/privacy` reindirizza a essa, e un test la classifica lettura sostenuta e non superficie di giudizio |
| Contesto di navigazione | shell `full` a 1440, identico alle altre superfici autenticate |
| Guard di privacy invariati | **sì** — 8 suite, **482/482 PASS**, zero file di guard modificati |
| Stato responsive | desktop 1332 px, rail 1316, mobile 2022 → ratio **1.518 `warning`**, dentro il bound 1.6 del suo archetipo |
| Evidenza visiva | **3 catture `product__`** |

**Semantica e copy della privacy invariati.** Nota corroborante: le tre catture di `/worker/privacy` differiscono
dalle storiche di **22, 53 e 26 byte** su ~300 KB — contenuto identico, differenza di rendering. È la prova
più netta che per questa superficie la cattura nuova e quella storica mostrano la stessa cosa.

---

## 12. Dynamic CV

Entrambe le superfici hanno ora evidenza `product__` canonica, prodotta dal flusso di cattura.

| | `/worker/dynamic-cv` | `/worker/dynamic-cv/print` |
|---|---|---|
| Archetipo | `RECORD_DETAIL` (warn 2500) | `REPORT_EXPORT` (warn 4000) |
| Evidenza prima | solo 3 `diagnostic__` | **nessuna** |
| Evidenza dopo | **3 `product__`** | **3 `product__`** |
| Altezze | 1251 / 1525 / 1606 px | 1018 / 1018 / 930 px |
| Verdetti | length pass, ratio pass 1.284 | length pass, ratio pass 0.914 |

### Un difetto trovato, riportato e NON riparato

`DynamicCVClient.tsx` scrive `data-testid="dynamic-cv-container"` su `<Workspace>`. La firma di `Workspace` in
`components/ui/px/Workspace.tsx` è `{ children, style }` e rende `<div className="px-grid" style={style}>`:
**l'attributo viene scartato e non raggiunge mai il DOM.** La cattura è inizialmente fallita proprio su
questo, con un timeout di 20 s in attesa di un selettore che non può esistere.

**Classificazione: difetto di affordance di test, non difetto di prodotto.** Nessun impatto su comportamento,
resa visiva, privacy o dati — è un attributo morto. Conseguenza reale: qualunque test che asserisse
`dynamic-cv-container` fallirebbe, quindi nessuno lo fa, e le prove DOM di W3B usarono altri marker.

**Non l'ho corretto** (§3 vieta refactor di componenti). Ho usato `[data-testid="dynamic-cv-summary"]`, che
sta su un `<div>` semplice dentro il ramo caricato e **è** osservabile, con la motivazione scritta accanto
al selettore nella spec.

### La limitazione che il Founder deve pesare

Le catture mostrano un **CV vuoto**. Il seed locale accettato produce `analytics.impact_unit = 0` e
`personal.worker_participation = 0`, quindi nessuna esperienza. La Registry registra per W3B
**desktop 2730 px con 20 esperienze reali**, mobile 3423 px, ratio 1.254. La cattura nuova misura
**1251 px**, ratio 1.284.

**L'evidenza è valida, riproducibile e canonica, ma non esercita ciò che W3B ha rimediato** — i 103 elementi
sotto-floor azzerati, i 4104 → 2730 px, la lista esperienze duplicata rimossa. Vale per lo stato a zero
esperienze, non per il record pieno. È un **limite di fixture, non un difetto**: non esiste alcun meccanismo
accettato dal progetto che produca dati di partecipazione del lavoratore, e inventarne uno avrebbe
significato fabbricare le esperienze che il Founder poi recensisce. Vedi §18.

---

## 13. Onboarding / Setup Password

| | `/worker/onboarding` | `/worker/setup-password` |
|---|---|---|
| Archetipo | `OPERATIONAL_WORKSPACE` | `OPERATIONAL_WORKSPACE` |
| Evidenza prima | **nessuna** | **nessuna** |
| Evidenza dopo | **3 `product__`** | **3 `product__`** |
| Altezze | 1068 / 1068 / 948 px | 1068 / 1068 / 948 px |
| Verdetti | pass / pass 0.888 | pass / pass 0.888 |
| Stato catturato | **review (`?mode=review`)** | **ramo form** |

**Nessun HTML statico finto, nessun bypass delle assunzioni di route o di stato.** Entrambe sono state
raggiunte da una sessione worker reale installata dall'harness, dentro il gate WORKER di
`app/worker/layout.tsx`, contro il Supabase locale seminato.

### Due stati, e perché quelli

**`/worker/setup-password`** rende il ramo di errore solo con `?error=` nell'URL; senza parametri rende il
form. Lo stato catturato è il form, con readiness `#password`.

**`/worker/onboarding`** reindirizza a `/worker/workspace` se l'onboarding è completato — e il worker seminato
lo è (`onboarding_completed_at` non nullo, verificato in DB). `?mode=review` è lo stato che quella superficie
può presentare a un worker completato, ed è **lo stato su cui W3A è stata accettata** (report `281`:
«`/worker/onboarding` (incl. `?mode=review`)»). Il pathname resta `/worker/onboarding`, quindi il landing
check di `126` si applica identico.

Nel ramo review `OnboardingFlow` rende `PageHead` + `ReviewMode` **senza `StepProgress`**, quindi non c'è
`role="progressbar"`, e `_flow.tsx` non dichiara alcun `data-testid`. Il readiness marker è
`header:has-text("Revisione del boundary privacy")` — l'header che `PageHead` emette. **Lo dichiaro come
compromesso**: accoppia la readiness al copy, quindi un cambio di copy rompe la cattura in modo rumoroso. È
fail-closed, che è il verso giusto, ma la soluzione pulita sarebbe un `data-testid` su quel ramo — **una
modifica di prodotto che non ho fatto.**

**Gap residuo dichiarato:** lo stato **primo accesso** di `/worker/onboarding` — il flusso a cinque passi con
`StepProgress` — **non è catturato**. Richiederebbe un worker con onboarding non completato, cioè un fixture
nuovo o la modifica del seed condiviso, entrambi fuori dal §15 («solo meccanismi di test/evidenza già
accettati»). Lo stato catturato copre l'archetipo e la first-access shell; non copre il flusso a passi.

---

## 14. Test Results

Tutti eseguiti nel worktree detached a `2fd03ea` con `npm ci` sul lockfile Product.

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Suite unit completa | `npx vitest run tests/unit` | **415 file · 14 018 passati · 0 falliti · 26 skip · 5 todo** |
| Suite di frontiera (10) | `125`, `126`, `127`, `128`, `129` ×2, `139`–`142` | **10 file · 338/338 PASS** |
| Guard privacy worker + confine website (8) | `route-privacy`, `privacy-boundary`, `worker-pib-privacy`, `b109b`, `b122`, `kora-wp-048`, `b83b`, `px-website-boundary` | **8 file · 482/482 PASS** |
| `checkRouteArchetypeDeclared` | 13 route Worker | **13/13 PASS** |
| `checkSevenStateResolution` | contratto a 7 stati | **PASS** |
| Validazione del cohort (nuovo) | `tests/unit/kora-wp-129-evidence-cohort.test.ts` | **10/10 PASS** |
| Cattura | `npx playwright test tests/e2e/kora-wp-129-worker-capture.spec.ts` | **14/14 PASS** (13 superfici + consistenza cohort), ×2 run |

**Confronto con la baseline pre-modifica: 414 file / 14 008 test → 415 file / 14 018 test.** Il delta è
esattamente il mio test di validazione: +1 file, +10 casi. **Zero regressioni.**

**Nessun test di prodotto è stato modificato per farlo passare.** Le sole modifiche ai test sono tooling di
evidenza: la spec di cattura, l'harness, e il nuovo file di validazione.

**CURRENT LOCAL VERIFICATION**, non CI. `gh` è assente e nessun accesso GitHub è configurato: **non affermo
che alcun check GitHub sia verde adesso.** La CI exact-SHA storica resta quella registrata — KORA CI #362 run
`36477773252` e #363 run `36478306009` su `2fd03ea`.

---

## 15. Evidence Manifest

`docs/product/visual-evidence/kora-wp-129/manifest.json` — 21 627 byte, dentro la directory di evidenza
esistente. **Nessun albero di evidenza parallelo creato.** La forma segue `EvidenceDescriptor` e
`BaselineRecord` del protocollo (`name`/`digest`/`productSha`), perché il progetto non aveva un formato di
manifest su file e la convenzione più vicina è il codice.

Campi di testata: `wp`, `kind`, `generatedBy` (la spec), `captureSpecSha256`, `harnessSha256`, **`productSha`**,
**`governanceAuthoritySha`**, `governanceAuthority`, `viewportMatrix`, `acceptance`, `reproducibility`.

Per ciascuna delle 13 superfici: `route`, `archetype`, `wp126Category`, `state` (lo stato catturato, dichiarato
in prosa), `pageLength` e `mobileRatio` con verdetto e dettaglio, e per ciascuna delle 3 catture: `viewport`,
`width`, `height`, `file`, `digest`, `documentHeightPx`, `byteIdenticalOnRerun`.

```
"reproducibility": { "runs": 2, "identicalDigests": 39, "total": 39 }
"acceptance": "NOT ACCEPTED — capture is evidence, never Founder acceptance"
```

Quattro test verificano il manifest contro il disco: entrambi gli SHA presenti, distinti e in forma valida;
una voce per superficie dichiarata con tutti i viewport canonici; ogni file referenziato esiste con digest
a 64 hex; e il campo `acceptance` dice `NOT ACCEPTED`.

---

## 16. Historical vs New Evidence Differences

**Non decido quale sia «migliore».** Riporto.

### 16.1 Le 18 catture con lo stesso nome

| Route | byte storici → nuovi | Δ | Codice cambiato | Stato dati cambiato | Viewport cambiato | Ragione |
|---|---|---|---|---|---|---|
| `worker-privacy` ×3 | 306740→306762 · 227417→227470 · 244121→244147 | **+0%** | no | no | no | rumore di rendering: 22/53/26 byte su ~300 KB — **contenuto identico** |
| `worker-opportunities` ×3 | 198402→199201 · 117240→119723 · 139428→140345 | **+0/+2/+0%** | no | no | no | catalogo partner **statico in codice** (`lib/partner-activities/catalog`), non dal DB → stesso contenuto |
| `worker-bookings` ×3 | 195314→199151 · 111511→118047 · 130591→135311 | **+1/+5/+3%** | no | **sì** | no | nessuna prenotazione nel seed locale → stato vuoto anziché popolato |
| `worker-workspace` ×3 | 313606→331523 · 215844→233921 · 239646→258660 | **+5/+8/+7%** | no | **sì** | no | set di iniziative del seed locale diverso da quello delle fixture storiche |
| `worker-personal-impact-balance` ×3 | 214472→163835 · 123277→80124 · 141484→96905 | **−24/−36/−32%** | no | **sì** | no | `analytics.impact_unit = 0` → **stato zero del PIB**, quello che la Registry registra come Product truth |
| `worker-commons` ×3 | 275415→163664 · 183866→83220 · 208855→99669 | **−41/−55/−53%** | no | **sì** | no | meno iniziative nel seed locale; altezza desktop 1018 px contro i 1514 px che W2 registrò |

**Codice di prodotto cambiato: in nessun caso.** Il ref è lo stesso SHA `2fd03ea` che portava le catture
storiche. **Viewport cambiato: in nessun caso** — la matrice canonica è identica. **Lo stato dei dati è la
sola variabile**, e cambia solo dove la superficie legge dal database.

### 16.2 I 12 artefatti storici non sostituiti

| File | Perché non sostituito |
|---|---|
| `diagnostic__worker-dynamic-cv` ×3 | kind che `EvidenceKind` non esprime; il cohort nuovo porta `product__worker-dynamic-cv` ×3 al suo posto |
| `product__activity-discovery` ×3 | slug legacy; `routeSlug()` ora genera `worker-activity-discovery` |
| `product__activity-discovery-detail` ×3 | idem |
| `product__kora-link-activate` ×3 | idem |

Tutti **conservati, non rinominati, non referenziati**.

### 16.3 La differenza che conta più di tutte

`/worker/dynamic-cv` desktop: **2730 px con 20 esperienze** (W3B, report `282`) → **1251 px con 0 esperienze**
(nuovo cohort). Stesso codice, dati diversi. §17 del mandato è chiaro — non riprodurre pixel obsoleti — e
infatti non li riproduco: dichiaro che per i quattro record-bearing (`dynamic-cv`, `dynamic-cv/print`, `PIB`,
`commons`) l'evidenza nuova rappresenta il Product allo stato a dati minimi, e **non sostituisce** l'evidenza
del record pieno per il giudizio su ciò che W3B ha rimediato.

---

## 17. Real Defects Found

**Difetti di implementazione di prodotto: 0.** Nessuna superficie ha fallito il rendering, il landing check,
il typecheck o una suite. Nessun `fail` nei verdetti `126`.

**Tre reperti, nessuno riparato:**

| # | Reperto | Classe | Dove |
|---|---|---|---|
| 1 | `data-testid="dynamic-cv-container"` scritto su `<Workspace>`, i cui prop sono `{children, style}`: **l'attributo non raggiunge il DOM** | **difetto di affordance di test** — nessun impatto su comportamento, resa, privacy o dati | `DynamicCVClient.tsx` → `components/ui/px/Workspace.tsx` |
| 2 | `/worker/workspace` ratio desktop→mobile **1.592**, oltre il `maxMobileRatio` 1.35 del suo archetipo `EXECUTIVE_JUDGMENT`, a 0.008 dalla soglia di `fail` | **WARN di benchmark** — «a real finding to record, never a test failure» | prima misurazione mai fatta di questa superficie |
| 3 | `/worker/privacy` ratio **1.518** — `warning` globale ma **dentro** il bound 1.6 del suo `DISCLOSURE_STATIC` | **WARN di benchmark**, meno grave del precedente | idem |

Nessuno è stato riparato: §3 vieta modifiche di prodotto, refactor di componenti e miglioramenti visivi, e
`141` vieta esplicitamente di inseguire la ratio come obiettivo. Vanno alla **WP129 OVERALL CLOSURE**.

**Due WARN preesistenti sono stati preservati come WARN**, non «risolti»: `/worker/activity-discovery` a
2308 px (riprodotto al pixel) e il residuo di lunghezza del Dynamic CV, che nello stato a zero esperienze non
si manifesta.

---

## 18. Remaining Evidence Gaps

**Gap primari: 0.** Tutte e 13 le superfici hanno evidenza `product__` canonica, riproducibile, ai tre
viewport canonici.

**Limitazioni dichiarate: 2.** Nessuna è un gap di copertura; entrambe sono limiti di *stato*, e il Founder
deve deciderle.

| # | Limitazione | Perché esiste | Cosa servirebbe |
|---|---|---|---|
| **L1** | Le quattro superfici che leggono dal DB — `dynamic-cv`, `dynamic-cv/print`, `personal-impact-balance`, `commons` — sono catturate allo **stato a dati minimi/zero**. L'evidenza non esercita il record pieno su cui W3B fu accettata (2730 px, 20 esperienze, 103 elementi sotto-floor azzerati) | **nessun meccanismo accettato dal progetto produce dati di partecipazione del lavoratore**: `scripts/e2e/seed-local-golden-path.ts` crea identità, tenant e profilo, non esperienze. Scriverne uno avrebbe significato **fabbricare le esperienze che il Founder recensisce**, che il §29 vieta | una **decisione Founder** su un fixture data-bearing per il Worker, con la forma dei dati sintetici dichiarata — non lavoro visivo |
| **L2** | `/worker/onboarding` è catturata nello stato **review**, non nel **primo accesso** (flusso a cinque passi con `StepProgress`) | il worker seminato ha l'onboarding completato, quindi il ramo default reindirizza al workspace. Raggiungerlo richiede un worker non completato: fixture nuovo o modifica del seed condiviso, entrambi fuori dal §15 | la stessa decisione di L1, oppure l'accettazione esplicita che lo stato review è l'evidenza canonica per questa superficie |

**Un gap di tooling, dichiarato e non risolto:** il readiness marker del ramo review di `/worker/onboarding` è
accoppiato al copy (`header:has-text(…)`), perché `_flow.tsx` non dichiara `data-testid`. Fail-closed, quindi
sicuro, ma fragile al cambio di copy. Il rimedio pulito è un `data-testid` — modifica di prodotto, non fatta.

---

## 19. Founder Review Set

Indice dedicato in **`design/program/KORA_WP129_FOUNDER_VISUAL_REVIEW_INDEX.md`**, con ordine di revisione
motivato: prima ciò che nessuno ha mai visto, poi ciò che porta un reperto, poi la conferma.

---

## 20. Readiness Classification

## **READY FOR FOUNDER OVERALL ACCEPTANCE**

Con **una limitazione dichiarata** che il Founder deve pesare prima di accettare: **L1** — le quattro
superfici data-bearing sono evidenziate allo stato a dati minimi, e per il Dynamic CV questo significa che
l'evidenza **non mostra** il record pieno su cui W3B fu accettata.

### Criteri di successo §28

| | Criterio | Esito |
|---|---|---|
| A | 13 superfici reali nella spec canonica | **PASS** 13/13, verificato da un test contro `ROUTE_ARCHETYPE` |
| B | 13 con evidenza `product` valida | **PASS** 39 catture |
| C | 13 riproducibili | **PASS** 39/39 byte-identiche su due run |
| D | Dynamic CV non dipende più da `diagnostic__` | **PASS** — `product__` prodotte dal flusso canonico; le `diagnostic__` conservate e non referenziate |
| E | `/worker/workspace` evidenziata | **PASS** |
| F | `/worker/privacy` evidenziata | **PASS** |
| G | `/worker/onboarding` evidenziata | **PASS** (stato review — L2) |
| H | `/worker/setup-password` evidenziata | **PASS** |
| I | `/worker/dynamic-cv` evidenziata | **PASS** (stato a zero esperienze — L1) |
| J | `/worker/dynamic-cv/print` evidenziata | **PASS** (idem) |
| K | Evidenza responsive richiesta presente | **PASS** — 3 viewport canonici × 13, 0 stati mancanti |
| L | Guard di privacy verdi | **PASS** 482/482 |
| M | Test di frontiera verdi | **PASS** 338/338; suite completa 415 file / 14 018 |
| N | 0 cambi di comportamento di prodotto | **PASS** — 0 file di prodotto modificati |
| O | 0 redesign visivi | **PASS** |
| P | 0 modifiche alla Registry | **PASS** |
| Q | 0 azioni di chiusura formale | **PASS** |

**La cattura riuscita non è acceptance.** Non è Founder acceptance, non è acceptance complessiva di WP129,
non è chiusura formale. Nessuna voce AL.2, nessuna modifica alla Registry 219, nessun cambio di stato, nessun
commit, nessun push. `1151ab2` è **UNCHANGED**: nessun tag, nessun push, nessun branch, nessuna ref toccata.

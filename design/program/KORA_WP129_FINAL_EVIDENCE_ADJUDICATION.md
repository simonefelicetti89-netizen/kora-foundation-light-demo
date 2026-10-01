# KORA-WP-129 — Final Evidence Adjudication

**Modalità:** validazione forense dell'evidenza + preservazione. Non lavoro di prodotto, non redesign,
**non chiusura formale**. Nessuna voce AL.2, nessuna modifica alla Registry 219.
**Data:** 2026-10-01

| | |
|---|---|
| **Product truth** | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` — invariato |
| **Governance authority** | `a1a7797bc3b9bc0ba51b55b24b0ed110798feb3e` |
| **Branch di preservazione** | `evidence/wp129-overall-2026-10-01`, creato **da** `2fd03ea` |

---

## 1. W3B Historical Evidence — risultato

### La domanda critica, e la risposta

> L'evidenza data-bearing del Dynamic CV è stata catturata contro lo SHA `2fd03ea`?

## **NO — e la ragione è più netta: quell'evidenza non esiste.**

**Non esiste alcuna cattura `product__` del Dynamic CV su alcuna ref, in alcun punto della storia del
repository.** Verificato con `git log --all --diff-filter=A` su
`docs/product/visual-evidence/kora-wp-129/*dynamic-cv*`: **un solo commit** ha mai aggiunto immagini di questa
superficie.

| | |
|---|---|
| Commit | **`099b5d5`** — `fix(worker): KORA-WP-129 Dynamic CV Defect A — stop selecting phantom columns` |
| Data | 2026-09-28 |
| File | 3 × `kora-wp-129__diagnostic__worker-dynamic-cv__{desktop,rail,mobile}.png` |
| Kind | **`diagnostic`** — non esprimibile da `EvidenceKind = 'product' \| 'mockup'` |
| Ref che le contengono | `feature/kora-wp-129-dynamic-cv-defect-a`, e le 4 ref di prova/canonica a valle |

### Cosa mostrano davvero quelle immagini

Lette direttamente, non dedotte. Desktop **1440 × 1933 px**:

- **«2 ATTIVITÀ TRACCIATE · 2 PILLAR ATTIVI · 2 PARTECIPAZIONI VERIFY.»** — **due** esperienze, non venti.
- I dati provengono da voci `[W129-REVIEW-FIXTURE]`: *Percorso dati e digitale* (GROWTH) e *Corso sicurezza
  e benessere* (LIFE).
- La UI è quella **pre-remediation**: contiene «ESPERIENZE BADGE-READY» come regione autonoma, «Opzioni di
  condivisione future», i chip «In arrivo · Pianificato», la lista esperienze duplicata — **esattamente ciò
  che il report `282` dichiara rimosso da W3B**.
- Altezza **1933 px**, non i 4104 px che il report `282` descrive come stato pre-remediation.

### La catena, e perché quelle immagini sono superate

```
099b5d5  ← le 3 PNG diagnostic sono catturate QUI
753ae42
06874e2  Defect B
18a6092  W3A
e79baf5  W3A remediation
d6ab063  W3B — la Dynamic CV e il suo artefatto stampato
2fd03ea  W3B remediation — il rail smette di vendere la roadmap   ← PRODUCT TRUTH
```

`099b5d5` **è** antenato di `2fd03ea`, e le 3 PNG sono **byte-identiche** fra i due SHA (blob
`849e9683dec6`, `cee3f3b93c3a`, `5e6ecf1b14b7`): non sono state toccate. Ma fra i due SHA il Dynamic CV è
cambiato così:

| File | Righe cambiate |
|---|---|
| `app/worker/dynamic-cv/_components/DynamicCVClient.tsx` | **875** |
| `app/worker/dynamic-cv/print/page.tsx` | 240 |
| `app/worker/dynamic-cv/_components/PillarDistribution.tsx` | **+74 (nuovo)** |
| `app/worker/dynamic-cv/print/print.module.css` | **+173 (nuovo)** |

**610 inserzioni, 752 rimozioni.** L'interfaccia nelle immagini `diagnostic__` non esiste più.

### Tabella richiesta da §2

| Campo | Valore |
|---|---|
| Report / publication ID | **`282`** — `282_KORA_WP129_W3B_PUBLICATION_AND_FOUNDER_ACCEPTANCE.md` |
| Founder acceptance wording | W3B è «the **fourth and last planned migration cohort**, and is **NOT `KORA-WP-129` completion**: a separate WP129 OVERALL CLOSURE pass must still review the full Worker experience across surfaces» |
| Product SHA accettato | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` |
| Route | `/worker/dynamic-cv`, `/worker/dynamic-cv/print` |
| State / fixture | `[W129-REVIEW-FIXTURE]`, prodotta da `scripts/e2e/seed-local-worker-review-states.ts` — **script assente dalla linea Product e da ogni ref remota** |
| Experience count | report `282`: «20 real experiences»; le uniche immagini archiviate ne mostrano **2** |
| Viewport | non registrato per immagine; il report cita misure desktop/mobile |
| Evidence files | **nessuno `product__`**; 3 `diagnostic__` a `099b5d5`, stato pre-remediation |
| Evidence hashes | `849e9683dec6…`, `cee3f3b93c3a…`, `5e6ecf1b14b7…` (blob git) |
| Date | 2026-09-28 |
| Esplicitamente Founder-accettata | **la PUBBLICAZIONE sì; l'evidenza visiva no** — non ne esiste una |
| Acceptance limitata o illimitata | **limitata**: «NOT `KORA-WP-129` completion» |

**Risposta formale alla domanda di §2: NO.** Non perché sia stata catturata altrove, ma perché
**un'evidenza visiva data-bearing del Dynamic CV non è mai stata archiviata.** Le misure del report `282`
(2730 px, 20 esperienze, 103 elementi sotto-floor azzerati, mobile 4205 → 3423 px, ratio 1.254) sono
**misurazioni di sessione in prosa**, provate nel DOM, non artefatti visivi conservati.

---

## 2. Validità dell'evidenza storica — §3

Tracciato cosa è cambiato, sui soli percorsi che toccano il Dynamic CV, fra `099b5d5` (cattura) e `2fd03ea`:

| Percorso | Cambiato | Nota |
|---|---|---|
| Route Dynamic CV (`app/worker/dynamic-cv/page.tsx`) | no | gate invariato |
| Componenti Dynamic CV | **sì, radicalmente** | `DynamicCVClient.tsx` 875 righe; `PillarDistribution.tsx` nuovo |
| Route di stampa | **sì** | 240 righe + `print.module.css` nuovo (173) |
| Wrapper `Workspace` consumati | no | `components/ui/px/Workspace.tsx` invariato |
| Styling responsive | **sì** | il CSS module di stampa è nuovo; la composizione main+rail è nuova |
| Mappatura dati | no fra questi due SHA — Defect A (`099b5d5`) l'aveva già corretta | la regola **SELECT ONLY WHAT THE CONSUMER READS** resta intatta |
| Vincoli di privacy | **no** | nessun guard toccato; `requireWorkerUser` invariato |
| Design system condiviso consumato | no | `139`/`140`/`141` invariati fra i due SHA |

### Classificazione

## **STALE**

Non «VALID AT CURRENT SHA», non «VALID BY CODE-EQUIVALENCE». Non sto facendo un'ipotesi generosa: le immagini
mostrano regioni e stringhe che il report `282` dichiara **rimosse**, e il componente che le ha prodotte è
stato riscritto per l'86%. Un'evidenza che mostra ciò che è stato rimosso non può provare ciò che c'è adesso.

**Precisazione che evita un errore simmetrico:** le immagini `diagnostic__` **non sono inutili**. Sono una
testimonianza valida dello stato *precedente*, e il confronto fra loro e la cattura nuova prova
indipendentemente la remediation W3B — §4.

---

## 3. L1 Adjudication — Dynamic CV

## **L1 REQUIRES NEW DATA-BEARING EVIDENCE**

Ragionamento conservativo, non il risultato preferito.

**Perché non «RESOLVED BY HISTORICAL FOUNDER-ACCEPTED EVIDENCE»:** non esiste un'evidenza storica a stato
pieno. Il §5 del mandato è inapplicabile — non c'è un pezzo B da affiancare al pezzo A.

**Perché non «ACCEPTABLE WITH DECLARED LIMITATION»:** `/worker/dynamic-cv` è dichiarata `RECORD_DETAIL`, e
l'intera remediation W3B riguarda il **comportamento a contenuto lungo**: 103 elementi sotto-floor azzerati,
4104 → 2730 px, una lista di esperienze duplicata rimossa, il rail da 5 regioni a 3. Una cattura a **zero
esperienze** non esercita nessuna di quelle proprietà. Accettarla come evidenza sufficiente significherebbe
accettare un record vuoto come prova del comportamento di un record pieno.

**Perché non «BLOCKS OVERALL ACCEPTANCE»:** riguarda **2 superfici su 13**, e per le altre 11 l'evidenza è
completa, riproducibile e canonica. Bloccare l'intera acceptance per questo sarebbe sproporzionato.

### Cosa la cattura nuova PROVA comunque — e non è poco

Letta direttamente, la cattura `product__worker-dynamic-cv__desktop` (1440 × 1251 px) mostra la UI
**post-W3B**, e per differenza rispetto alla `diagnostic__` conferma la remediation:

| Claim di W3B (report `282`) | Verificabile nella cattura nuova |
|---|---|
| rail da 5 regioni equipesate a **3 gruppi semantici** | **sì** — «Il tuo profilo» e «Esporta e condividi» nel rail, colonna di lavoro a sinistra |
| «Opzioni di condivisione future» **rimossa** | **sì — assente** |
| «In arrivo», «Pianificato» **rimossi** | **sì — assenti** |
| «Badge e credenziali» come regione autonoma **rimossa** | **sì — assente** |
| lista esperienze duplicata **rimossa** | **sì** — una sola regione «Esperienze» |
| un pillar per riga, conteggio e barra, **nessuna percentuale né ranking** | **sì** — «Life / Growth / Connection / Impact / Legacy» uno per riga, «non esplorato» |
| `142` **non** adottato, per conformità privacy | **sì** — nessun encoding comparativo |

**Non verificabile a zero esperienze:** i 103 elementi sotto-floor azzerati, i 4104 → 2730 px, il ratio
mobile 1.254 con 20 esperienze, i break governati della stampa su contenuto lungo.

### §6 — il meccanismo minimo legittimo

## **EXISTING ACCEPTED FIXTURE AVAILABLE — ma NON PUBBLICATA**

Questa è la correzione più importante di questa adjudication, e corregge una mia affermazione precedente
(«nessun meccanismo accettato produce dati di partecipazione del lavoratore»): **il meccanismo esiste.**

| | |
|---|---|
| File | `scripts/e2e/seed-local-worker-review-states.ts` |
| Introdotto da | `3b324c6` — *test(fixture): add the local Worker review-state seed for WP129 W2/W3*, 2026-09-27 |
| Esteso da | `1b327c0` — *test(fixture): provision PIB through the canonical methodology, not by hand* (+110 righe) |
| Presente su `2fd03ea` | **NO** |
| Ref remote che lo contengono | **0** |
| Antenato di `2fd03ea` | **NO** |
| Stato dichiarato dalla Registry | `1b327c0` è **«excluded from Product publication — not an ancestor, 0 remote refs»**, ripetuto in tre record di pubblicazione distinti |

È il meccanismo che ha prodotto le voci `[W129-REVIEW-FIXTURE]` visibili nelle immagini `diagnostic__`, e il
suo messaggio di commit dichiara di provisionare il PIB **attraverso la metodologia canonica, non a mano** —
cioè esattamente ciò che serve, costruito con la giusta disciplina.

**Non l'ho pubblicato, non l'ho copiato, non l'ho eseguito, non ho creato dati sintetici di partecipazione.**
Pubblicarlo è una decisione Founder sotto il Founder Review Publication Contract (§ A). Finché resta escluso,
l'evidenza a stato pieno non è producibile per vie legittime.

---

## 4. L2 Adjudication — Onboarding

## **ACCEPTABLE DECLARED LIMITATION**

L'acceptance canonica di `KORA-WP-129` parla di **superfici**, non di stati: «Worker workspace and primary
surfaces are WP-125-native; navigation is consistent; the privacy surface is integrated…». Nessun criterio
nomina lo stato di primo accesso.

E il record di pubblicazione W3A nomina esplicitamente lo stato catturato: **«Wave 4b Cohort W3A —
`/worker/onboarding` (incl. `?mode=review`) and `/worker/setup-password`»**. Lo stato review è dentro
l'ambito su cui il Founder ha già accettato questa superficie.

Lo stato di primo accesso resta non catturato perché il worker seminato ha `onboarding_completed_at`
valorizzato e il ramo default reindirizza al workspace. **Non ho inventato lo stato di primo accesso.**
Raggiungerlo richiede lo stesso fixture non pubblicato del §3, o la modifica del seed condiviso.

Dichiarata, non nascosta: la cattura copre l'archetipo `OPERATIONAL_WORKSPACE`, la first-access shell (0 link
di navigazione) e le misure responsive; **non** copre il flusso a cinque passi con `StepProgress`.

---

## 5. Workspace — reperto visivo

**Route:** `/worker/workspace` · **Archetipo:** `EXECUTIVE_JUDGMENT` (warn 2500 px, `maxMobileRatio` 1.35)
**Misure:** desktop 1628 px · rail 2485 px · mobile 2592 px · **ratio 1.592**

Esame diretto della cattura a 767 × 812 (fullPage 767 × 2592):

| Controllo richiesto | Esito |
|---|---|
| Spazio verticale vuoto eccessivo | **no** — le card si susseguono con ritmo regolare |
| Impilamento non necessario | **no** — colonna singola a 767 px, corretto per lo shell mobile |
| Contenuto tagliato | **no** — nessun clipping, nessun overflow orizzontale |
| Collisione con la navigazione | **no** — hamburger in alto a sinistra, chip identità in alto a destra, nessuna sovrapposizione |
| Spostamento delle CTA | **no** — «Esplora tutti i partner», «Vai alla tua area personale», «Vai al tuo KORA Link», «Esplora il tuo CV», «Scopri i tuoi diritti» tutte presenti e raggiungibili |
| Raggruppamento illeggibile | **no** — sezioni con heading, badge `PRIVATO` / `IN PREPARAZIONE` / `ATTIVO` / `IN COSTRUZIONE` leggibili |
| Gerarchia rotta | **no** — identità → iniziative → storico → partner → tracce private → profilo privato |

### Verdetto: **FOUNDER REVIEW REQUIRED**

Non «VISUALLY ACCEPTABLE» senza riserve, e non «ACTUAL ACCEPTANCE FAILURE».

Visivamente la superficie è pulita. Ma il numero merita una decisione: **1.592 supera il `maxMobileRatio`
1.35 dichiarato dal suo stesso archetipo `EXECUTIVE_JUDGMENT`**, ed è a **0.008** dalla soglia di `fail`
(1.6). `mobileRatioVerdict()` usa soglie globali (≤1.35 acceptable, ≤1.6 warning) e restituisce `warning`,
quindi meccanicamente non è un fallimento — ma il margine è tale che un'iniziativa in più nel seed lo
porterebbe oltre.

**Non ho modificato la route.** `141` è esplicito: la ratio è «a detector, never a target: padding a desktop
page to improve the ratio is a benchmark violation». La domanda che resta al Founder non è «come si abbassa
il numero» ma **«un workspace EXECUTIVE_JUDGMENT deve presentare otto regioni su mobile?»**

---

## 6. Privacy — reperto visivo

**Route:** `/worker/privacy` · **Archetipo:** `DISCLOSURE_STATIC` (warn 6000 px, `maxMobileRatio` 1.6)
**Misure:** desktop 1332 px · rail 1316 px · mobile 2022 px · **ratio 1.518**

Esame diretto della cattura a 767 px: gerarchia limpida (confine con il datore → dati sempre privati → dati
aggregati → condivisione → capability non disponibili → collegamenti → come leggere), nessun clipping,
nessuna collisione, CTA «Gestisci i tuoi link» presente, chip di stato leggibili, soglia dei dieci lavoratori
dichiarata nel corpo.

### Verdetto: **PASS**

1.518 è **dentro** il bound 1.6 del proprio archetipo, e un `DISCLOSURE_STATIC` è testo da leggere: su mobile
si allunga per definizione. **Non ottimizzato solo perché il numero è alto** — non c'è alcun problema visivo
da risolvere.

---

## 7. Dead test attribute

## **TEST AFFORDANCE DEFECT** — come atteso

`DynamicCVClient.tsx` scrive `data-testid="dynamic-cv-container"` su `<Workspace>`. La firma pubblica è
`{ children, style }` e il componente rende `<div className="px-grid" style={style}>`: l'attributo è
scartato e **non raggiunge mai il DOM**.

**Non è un difetto di prodotto.** Nessun impatto su comportamento, resa visiva, privacy, dati o accessibilità
— è un attributo morto. L'unica conseguenza reale: qualunque test che lo asserisse fallirebbe, quindi nessuno
lo asserisce, e le prove DOM di W3B usarono altri marker.

**Non riparato in questo task**, come richiesto.

### Il marker sostitutivo è deterministico e semanticamente sicuro

`[data-testid="dynamic-cv-summary"]`:

| Proprietà | Verifica |
|---|---|
| Raggiunge il DOM | **sì** — è su un `<div>` semplice (`DynamicCVClient.tsx` riga 178), non su un componente che filtra i prop |
| Deterministico | **sì** — 39/39 catture byte-identiche su due run indipendenti |
| Semanticamente sicuro | **sì** — è dentro il ramo `data.ok`, cioè esiste **solo** a CV caricato: non può materializzarsi durante `Loading` né su `ErrorState`, che sono rami di `return` precedenti |
| Non inventato al call site | **sì** — il campo `source` della spec cita il file di prodotto che lo possiede |

Non è equivalente al marker originario in intento (il contenitore contro il blocco riassuntivo), ma è
**più stretto**, non più largo: si attiva più tardi nel ciclo di vita, mai prima.

---

## 8. Un reperto non richiesto, che va detto

**Ogni immagine dell'archivio WP129 — incluse quelle storiche già passate sotto Founder review — contiene un
elemento che non è Product.**

Un badge circolare scuro con la «N» di Next.js, `position: fixed`, che nella cattura `fullPage` finisce in
mezzo al documento. Nella `product__worker-workspace__mobile` si sovrappone al titolo «IL MIO STORICO», che
appare come «…MIO STORICO».

**Non l'ho introdotto io.** La cattura storica Wave 4a, committata in `3149256` e presente in git a
`2fd03ea`, ha **lo stesso badge nella stessa posizione** — verificato ritagliando la stessa regione da
entrambe. L'origine è strutturale: `playwright.config.ts` avvia il server con `command: 'npm run dev'`, e
Next.js in sviluppo inietta il proprio indicatore.

**Classificazione: contaminazione sistemica dell'harness di evidenza, pre-esistente.** Non invalida le
misure (altezze, ratio, gerarchia, spaziatura) né le valutazioni di questo documento, ma significa che il
Founder sta guardando un pixel che non appartiene al prodotto. Il rimedio pulito — catturare contro
`npm run build && npm start`, o `devIndicator: false` in `next.config` — è una **modifica di prodotto o di
configurazione che non ho fatto**.

---

## 9. Restauro degli artefatti storici — §10

| Controllo | Esito |
|---|---|
| File storici cancellati | **0** |
| 12 file ripristinati byte-identici al git | **12 / 12** — SHA-256 confrontati uno per uno contro `HEAD:<path>` |
| File storici sovrascritti | **18** |

**I 18 sovrascritti sono intenzionali per il protocollo.** `evidenceName()` è deterministico per contratto:
«Same descriptor in, same name out — no timestamp, no run id, no random suffix, because a name that changes
per run can never be compared against a baseline». Rigenerare il cohort riscrive necessariamente i file
omonimi. **Le versioni precedenti non sono perdute**: restano nel commit genitore `2fd03ea`, che è la base
del branch di preservazione, e sono recuperabili con `git show 2fd03ea:<path>`.

I 12 ripristinati sono i 3 `diagnostic__` e le 9 `product__` a slug legacy (`activity-discovery`,
`activity-discovery-detail`, `kora-link-activate`), che il `routeSlug()` corrente non genera più e che quindi
nessuna cattura nuova poteva sovrascrivere.

---

## 10. Worktree e processi — §11

### Processi

| Processo | Azione |
|---|---|
| `npm run dev` (pid 29977) + `next-server v16.3.3`, avviati da questa sessione, radicati nel worktree di evidenza | **arrestati puliti** — `localhost:3000` non risponde più |
| 12 container Supabase locali `*_KORA`, avviati da questa sessione | **lasciati attivi** durante l'adjudication, arrestabili con `supabase stop` |
| Qualunque altro processo | **non toccato** |

### Worktree di evidenza

| | |
|---|---|
| Path | `…/scratchpad/wp129-evidence` |
| HEAD prima | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` (detached) |
| Ora | branch **`evidence/wp129-overall-2026-10-01`**, creato da quello SHA esatto |

---

## 11. Preservazione — §12, §13, §14

Vedi §12 di questo documento per gli invarianti provati prima del commit, e la risposta finale per gli SHA.

**Product truth resta `2fd03ea`.** Il commit di evidenza **non è** la nuova verità di prodotto: è un
portatore di evidenza basato su quello SHA. I due SHA sono tenuti distinti ovunque, nel manifest come nei
report.

---

## 12. Invarianti provati prima del commit

| Invariante | Valore |
|---|---|
| **PRODUCT IMPLEMENTATION FILES CHANGED** | **0** |
| **PRIVACY GUARD FILES CHANGED** | **0** |
| **REGISTRY FILES CHANGED** | **0** |
| **AL.2 FILES CHANGED** | **0** |
| **GOVERNANCE FILES CHANGED** | **0** |

Il contenuto del commit è esclusivamente: tooling di cattura (2 file modificati), test di validazione del
cohort (1 nuovo), manifest (1 nuovo), PNG di evidenza (21 nuovi + 18 rigenerati), report WP129 (2 nuovi).

---

## 13. Overall readiness

## **READY WITH DECLARED NON-BLOCKING LIMITATIONS**

| Limitazione | Classificazione | Bloccante |
|---|---|---|
| **L1** — Dynamic CV e Dynamic CV print evidenziate a zero esperienze; nessuna evidenza storica a stato pieno esiste; il fixture che la produrrebbe esiste ma **non è pubblicato** | **REQUIRES NEW DATA-BEARING EVIDENCE** | **NO** — 2 superfici su 13; le altre 11 sono complete. Richiede una decisione Founder sulla pubblicazione del fixture |
| **L2** — `/worker/onboarding` evidenziata nello stato review | **ACCEPTABLE DECLARED LIMITATION** | **NO** — lo stato review è dentro l'ambito accettato da W3A |
| **F1** — `/worker/workspace` ratio 1.592, oltre il bound 1.35 del suo archetipo, a 0.008 dal fail | **FOUNDER REVIEW REQUIRED** | **NO** — WARN meccanico, nessun difetto visivo |
| **F2** — `/worker/privacy` ratio 1.518, dentro il bound 1.6 | **PASS** | **NO** |
| **F3** — `data-testid` morto su `<Workspace>` | **TEST AFFORDANCE DEFECT** | **NO** |
| **F4** — badge dev di Next.js in **tutte** le immagini, storiche incluse | contaminazione sistemica dell'harness, pre-esistente | **NO** — ma il Founder deve saperlo prima di guardare |

**Difetti di implementazione di prodotto: 0.**

---

## 14. 1151ab2

## **UNCHANGED**

Nessun tag creato, nessun push, nessun branch, nessuna ref toccata. Resta su
`gate3/prelive-privacy-remediation`, locale, 0 ref remote. Fuori ambito per questo task, come stabilito.

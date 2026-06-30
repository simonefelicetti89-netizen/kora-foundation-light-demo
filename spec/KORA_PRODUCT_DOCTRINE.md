# KORA Product Doctrine

**Branch:** `docs/consolidation`
**Versione:** CC-05 · 2026-06-30
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN

Questo documento esprime la dottrina di prodotto di KORA in forma narrativa. È rivolto a fondatori, advisor, clienti evoluti e investitori, oltre che al team tecnico. Non è un documento di requisiti — è una bussola. Ogni decisione di prodotto, design o implementazione deve essere leggibile in coerenza con questa dottrina.

---

## 1. What KORA Is

KORA è una **Human Impact Intelligence Platform**. Trasforma dati organizzativi eterogenei — partecipazione a iniziative welfare, completamenti formativi, attività di volontariato, mentoring, impegno cross-company, contributi ESG — in intelligenza organizzativa strutturata, spiegabile e privacy-safe.

Il concetto centrale è **attivazione organizzativa**: quanto di un'organizzazione è effettivamente attiva sul piano umano? Quante persone partecipano a iniziative con impatto reale? Con quale profondità, continuità ed equità? E l'investimento welfare/people produce impatto o è spesa passiva?

KORA non misura il valore delle persone. Misura quanto un'organizzazione riesce ad attivare il potenziale umano al proprio interno.

Il KORA Index è un output **company-level**: un indicatore sintetico dell'attivazione organizzativa, composto da 10 componenti in 4 macroblocchi (Reach, Quality, Equity, Budget-to-Human-Impact). È il risultato di una pipeline algoritmica di 14 stadi, con metodologia versionata e Confidence Score inseparabile.

I dati individuali — Impact Units, Personal Impact Balance, partecipazioni — esistono come layer intermedio obbligatorio per produrre questo aggregato. Non sono mai l'output. Non tornano mai all'azienda a livello individuale.

KORA collega mondi che tradizionalmente parlano lingue diverse: il welfare aziendale, la formazione, il volontariato, le iniziative collettive, l'impatto territoriale. Li trasforma in un'unica misura organizzativa coerente, comparabile nel tempo, e difendibile davanti a stakeholder interni ed esterni.

---

## 2. What KORA Is Not

Questo paragrafo è importante quanto il precedente. KORA ha un'identità precisa — e preservarla richiede sapere cosa non è.

**KORA non è HR surveillance.** Non traccia dove sono i lavoratori, quanto lavorano, con che frequenza accedono ai servizi, o cosa fanno nel tempo libero. I dati individuali che transitano nella pipeline IU non tornano mai all'azienda come profili.

**KORA non è un sistema di ranking dei lavoratori.** Non produce classifiche, leaderboard, top-N, o punteggi comparativi tra persone visibili all'azienda. Non c'è un "miglior lavoratore del mese" in KORA. Mai.

**KORA non è performance management individuale.** Il KORA Index non valuta la performance lavorativa. Non è collegato ai KPI di business, alle review HR, agli aumenti di stipendio, o alle promozioni. È un indicatore di impatto umano organizzativo — non un giudizio sul singolo.

**KORA non è un badge di controllo presenze.** KORA Link — il ponte fisico NFC/QR — non serve a sapere chi è entrato dove e quando. Il chip è anonimo. Il legame chip↔persona nasce solo per scelta del lavoratore. Il sistema non registra presenze in senso lavorativo.

**KORA non è una piattaforma welfare tradizionale.** Non è un marketplace di benefit, non gestisce voucher, prenotazioni di palestre o rimborsi medici. Non è una piattaforma di erogazione: è una piattaforma di misurazione dell'impatto di ciò che esiste già.

**KORA non è un wallet o un crypto product.** KORA Link v1 non ha wallet, token, criptovaluta, o meccanismi di pagamento. È un sistema di attribution dell'impatto, non di ricompensa digitale. Il wallet è una possibilità futura soggetta a framework legali specifici.

**KORA non è uno strumento per vendere dati worker alle aziende.** I dati individuali dei lavoratori che transitano nella pipeline IU rimangono nell'area personale del lavoratore stesso (My KORA). Non vengono venduti, ceduti, né resi accessibili a terzi in forma identificabile.

---

## 3. Core Promise

KORA fa tre promesse fondamentali. Sono inseparabili.

**Prima promessa: rendere misurabile l'impatto umano senza violare il confine individuale.**
È possibile capire quanto un'organizzazione attiva il proprio potenziale umano senza sapere chi fa cosa. La pipeline di aggregazione KORA trasforma dati individuali in insight organizzativi. Il confine tra il livello individuale e il livello organizzativo è il cuore del prodotto — non un dettaglio tecnico.

**Seconda promessa: aiutare le aziende a capire dove attivano valore.**
L'azienda riceve il KORA Index, i 10 componenti, la distribuzione per pillar, i trend nel tempo, il Confidence Score. Riceve anche il Budget-to-Human-Impact ratio: quanto del budget people produce impatto reale. Queste informazioni permettono di allocare meglio le risorse, identificare aree di sotto-attivazione, costruire un piano d'azione difendibile.

**Terza promessa: aiutare i lavoratori a partecipare senza essere profilati.**
I lavoratori hanno My KORA — uno spazio personale dove vedono il proprio impatto nei cinque pillar, il proprio Dynamic Impact CV, le iniziative disponibili. Possono condividere il proprio profilo di impatto con chi scelgono, con token temporanei revocabili. Non vengono confrontati con altri. Non vengono valutati dall'azienda su base individuale.

**La quarta promessa, che emerge dalle prime tre: creare segnali aggregati e difendibili.**
Il KORA Index v0.1 è pre-empirical-calibration. Questo non è un difetto — è una dichiarazione di onestà metodologica. Il Confidence Score affianca sempre il KORA Index. La calibration_status non è sopprimibile. KORA preferisce un Index con CS basso e dichiarato a un Index gonfiato e indifendibile.

---

## 4. Privacy Doctrine

La privacy in KORA non è un requisito di conformità. È un elemento architetturale. Il sistema è progettato per essere privacy-safe per costruzione, non per policy.

**Aggregate by default.** L'output di default verso l'azienda è sempre aggregato. Non esiste path normale in cui un'azienda riceva dati individuali. I casi eccezionali (segmenti con N<10) producono soppressione, non dato grezzo.

**Worker-first privacy.** I dati del lavoratore appartengono al lavoratore. My KORA è un'area personale — non un'area aziendale. L'azienda non ha chiavi per quella stanza. Anche KORA stessa, come operatore, accede ai dati individuali solo per necessità operative (provisioning, diagnostica, pipeline IU) — mai per cederli.

**No individual scoring visibile all'azienda.** Il Personal Impact Balance (PIB) è un layer intermedio di calcolo. Non è un punteggio individuale esposto. L'azienda non vede PIB di singoli lavoratori, mai.

**No employer visibility into individual activity.** Che un lavoratore abbia completato una formazione, partecipato a un'iniziativa welfare, o scannerizzato il proprio chip KORA Link non è informazione disponibile al datore di lavoro in forma nominativa. L'azienda vede solo l'effetto aggregato.

**Tenant isolation.** Ogni organizzazione vede solo i propri dati. Non esistono path cross-tenant per ruoli non-admin. Il modello multi-tenant è enforced a livello RLS, service layer, e access matrix.

**Auditability.** Ogni azione significativa sul sistema è tracciata in `audit.audit_log`, immutabile e append-only. IP e user agent sono hashati one-way. Il log distingue ambiente demo/live/future.

**Privacy by design.** Lo schema `personal` è una boundary di accesso. Le funzioni SECURITY DEFINER restituiscono aggregati, non righe. La pseudonymizzazione avviene prima dell'upload — KORA non detiene la mappa di re-identificazione. La triple protection (RLS + service layer + access matrix) garantisce che nessun singolo punto di fallimento esponga dati individuali.

---

## 5. Methodology Doctrine

La metodologia KORA è il moat. Non è intercambiabile con nessun altro sistema di misurazione welfare o HR.

**KORA Index v3 — 10 componenti, 4 macroblocchi.** I 10 componenti sono fissi: AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB, BTI. I 4 macroblocchi pesano: Reach (25%), Quality (30%), Equity (25%), BTI (20%). I pesi sono versionati in `lib/methodology-config/v0.1.ts` e non sono mai hardcoded.

**Confidence Score (CS) — esterno all'Index, inseparabile dall'Index.** CS ha weight=0 nel calcolo del KORA Index. Non lo influenza. Ma viene sempre mostrato accanto a esso — mai soppresso. Un Index senza CS è un Index indifendibile.

**KORA Contribution — companion indicator, non componente KORA Index.** KORA Contribution misura l'engagement ecosistemico: cross-company, mentorship, collettivo, adozioni. È un indicatore parallelo al KORA Index, non una sua componente. Si mostra accanto, mai dentro.

**PIB (Personal Impact Balance) — layer intermedio obbligatorio.** Il PIB è la somma degli Impact Unit per pillar per lavoratore in un periodo. È lo Stage 11 della pipeline KORA — obbligatorio per l'aggregazione, mai esposto verso l'azienda. Il PIB è worker-owned.

**BTI (Budget-to-Human-Impact) — efficienza reale, non contabilità.** Il BTI non misura il budget welfare — misura quanto di quel budget produce impatto umano verificato. La distinzione tra deep activation spend e blocked compliance spend è il cuore del BTI.

**I 5 pillar.** Ogni evento si classifica in uno (e uno solo) dei cinque pillar: LIFE, GROWTH, CONNECTION, IMPACT, LEGACY. Non esiste evento "trasversale" — esiste un pillar primario. Questa classificazione è il vocabolario condiviso di KORA.

**Perché i componenti sono separati.** Fondere AR con EVQ, o EQW con EQS, distrugge la spiegabilità. Ogni componente misura una dimensione distinta dell'attivazione. La granularità è una scelta progettuale, non una complessità inutile.

**Perché no double counting.** Un evento contribuisce a un solo binario: o alla pipeline IU (→ KORA Index) oppure a KORA Contribution. Mai a entrambi dallo stesso evento. Questa regola è algoritmicamente enforced.

**Calibration_status = 'pre_empirical_calibration'.** KORA v0.1 è pre-calibrazione empirica. I pesi sono calibrazione iniziale — non validata da studi Delphi o dati longitudinali. Questo status è non-sopprimibile. È onestà metodologica, non debolezza.

---

## 6. KORA Space Doctrine

KORA Space è l'ecosistema condiviso dove le organizzazioni si incontrano, collaborano, e contribuiscono a iniziative che vanno oltre i confini aziendali.

**Spazio ecosistemico.** KORA Space non è una intranet aziendale. È uno spazio multi-tenant dove un'iniziativa promossa da un'azienda può essere raggiunta da lavoratori di un'altra. La cross-company è il valore — non la restrizione.

**Iniziative cross-company.** Un'azienda (Beta) crea un'iniziativa aperta. Lavoratori di un'altra azienda (Acme) possono prenotarsi. La partecipazione genera KORA Contribution per entrambe le aziende — con ruoli diversi (promoter, origin_employer) e pesi diversi. La privacy del lavoratore rimane intatta: Acme non sa chi ha partecipato all'iniziativa di Beta.

**Mentorship.** KORA Space ospita mentorship cross-company. Il pillar LEGACY è il contenitore naturale di questa dimensione. Il legame mentore-mentee genera segnali Contribution per le organizzazioni coinvolte — senza esporre l'identità individuale.

**Partecipazione volontaria.** Nessuna partecipazione in KORA Space è obbligatoria. Il lavoratore sceglie se prenotarsi, se partecipare, se scannerizzare il proprio chip. Il sistema non traccia mancate partecipazioni come segnale negativo.

**Moderazione.** I post in KORA Space passano per moderazione KORA_ADMIN prima di essere visibili ai lavoratori. L'azienda propone — KORA valida. Questo presidio protegge la qualità e la pertinenza dello spazio.

**KORA Contribution — output aggregato.** Il risultato della partecipazione in KORA Space è KORA Contribution — un companion indicator aggregato per l'azienda. Non è una lista di "chi ha fatto cosa". È un segnale organizzativo: quanto questa azienda contribuisce all'ecosistema KORA.

---

## 7. KORA Link Doctrine

KORA Link è il ponte fisico tra il mondo analogico e la pipeline KORA. Un chip NFC, un QR code, o un codice manuale — tutti convergono alla stessa logica digitale.

**Ponte fisico anonimo.** Il chip non porta identità. Porta un token opaco. Chiunque abbia un chip KORA Link non attivato ha in mano un oggetto che non rivela nulla su nessuno. La sorveglianza per enumerazione fisica è impossibile per design.

**Chip senza PII.** L'URL nel chip è `https://kora.app/link/{token_casuale}`. Il token è generato con CSPRNG. Non contiene `worker_id`, `tenant_id`, nome, o qualsiasi dato personale. La risoluzione avviene solo server-side.

**Attivazione lavoratore.** Il legame tra chip e persona nasce solo quando il lavoratore sceglie di attivare il proprio chip — autenticandosi a KORA e completando il processo di associazione. L'azienda non può pre-associare chip a lavoratori specifici. KORA_ADMIN lo fa solo in casi eccezionali documentati e auditati.

**Due binari.** Ogni scan event è classificato in uno dei due binari:

- **Modalità A** (partner verified): il lavoratore scannerizza presso un partner KORA accreditato L4. Genera Impact Units, contribuisce al Personal Impact Balance, e — attraverso la pipeline di aggregazione — al KORA Index dell'azienda. EV = 1.00 (L4).

- **Modalità B** (collettivo/mentorship/cross-company): il lavoratore scannerizza in un contesto di collaborazione, mentoring, o iniziativa cross-company. Genera un segnale KORA Contribution. Non tocca il KORA Index direttamente.

Un evento non è mai in entrambe le modalità. Il binario è determinato dalla configurazione del device, non dall'utente.

**Partner L4.** I partner che vogliono generare Modalità A devono essere accreditati a livello L4 (massimo livello di qualità evidenza). L'accreditamento ha scadenza, è revocabile, e la sua validità è verificata al momento dell'evento — non in cache.

**Non controllo presenze.** KORA Link non è un sistema di timbratura o presenza. Non misura quante ore un lavoratore è in un luogo. Non è connesso ai sistemi HR di gestione del personale. Non interagisce con buste paga, ferie, permessi.

**Non sorveglianza.** L'azienda non vede chi ha scansionato cosa e quando. Vede aggregati: quanti scan questo mese, quale pillar è stato più attivato. Il lavoratore vede i propri scan in My KORA — e nessun altro li vede nominalmente.

**Non ranking.** Il numero di scan di un lavoratore non è mai confrontato con quello di un altro. Non esiste una classifica "chi usa di più KORA Link". Questo è un invariante non negoziabile.

---

## 8. Release Doctrine

Una feature di KORA non entra in produzione finché non supera cinque livelli di maturità.

**1. Design doc.** Prima di scrivere codice, deve esistere un documento che descriva cosa fa la feature, perché esiste, come si inserisce nell'architettura, quali dati usa, quali privacy/metodologia rischi introduce.

**2. Data model.** Il modello dati deve essere documentato e reviewato prima di qualsiasi migration. Le migration 034/035 di KORA Link devono essere reviewate da CTO prima di essere applicate a qualsiasi database.

**3. Test suite.** Ogni feature deve avere test che verifichino il comportamento atteso — incluso il comportamento dei confini privacy e metodologici. "Funziona" non è abbastanza — deve funzionare come progettato.

**4. Risk notes.** Ogni feature deve avere note di rischio: rischio privacy (quale impatto su dati individuali?), rischio metodologico (altera il significato del KORA Index?), rischio operativo (cosa succede se questa feature ha un bug in produzione?).

**5. Release gate.** La feature non va in produzione senza che il release gate sia esplicitamente chiuso. Per KORA Link v1: Gate 3 (privacy/legal), CTO sign-off, security review, staging validation. Per feature con nuove migration SQL: Gate 2 (CTO Architecture Review).

**Feature flag.** `KORA_LINK_ENABLED` è l'implementazione di questo principio per KORA Link. Il flag è OFF per default. Non basta sviluppare la feature — serve attivare il gate.

**Staging prima di produzione.** Ogni feature viene validata su staging (haqf****) con dati sintetici prima di essere applicata a produzione. La pipeline migration → staging → test → produzione non ha shortcut.

**DPIA per nuovi trattamenti.** Qualsiasi feature che introduca un nuovo tipo di trattamento di dati personali (nuove tabelle personal, nuovi flussi di raccolta, nuovi export) richiede valutazione DPIA prima del go-live.

**Pen-test per feature con superficie di attacco esterna.** KORA Link v1 espone una route pubblica `/link/{token}`. Prima del go-live, questa route deve essere testata per: oracle attack, token enumeration, information disclosure nella risposta di errore.

**CTO/security sign-off.** Nessuna feature con impatto su privacy, metodologia, o superficie di attacco entra in produzione senza sign-off esplicito.

---

## 9. Investor/Client Doctrine

KORA è in Foundation Light v0.1 — una piattaforma funzionante, pre-empirical-calibration, con dati sintetici e una pipeline reale. Questo positioning è una scelta comunicativa, non una scusa.

**Cosa può essere mostrato oggi.**
La pipeline KORA Engine è reale: 14 stage, 24 moduli, tre scoring path (DEMO/PREVIEW/LIVE). Il backend Supabase è reale: 7 schemi, 30+ tabelle, RLS production-grade, audit trail. La UI è funzionante: Executive Cockpit, KORA Index Detail, UEF Review, Scoring Run, My KORA, KORA Space. I dati sono sintetici ma lo scenario è reale. La metodologia è documentata e versionata.

**Cosa deve essere dichiarato preview.**
Le migration 032/033 (contribution atomic attribution, initiative adoption source model) sono scritte ma non applicate a staging. KORA Link v1 è in sviluppo — la flag è OFF. Le route worker (My KORA avanzato, Dynamic CV completo) sono parzialmente funzionanti.

**Cosa è roadmap.**
KORA Link v1: post Gate 3, post CTO review 034/035. Wallet/BTL: post cornice legale-finanziaria (MiCA, KYC/AML). Delphi Study empirical calibration: post Pilot+ con dati reali. HR KPI correlation layer: post Pilot+. Public KORA Snapshot: Future Vision.

**Perché consolidare è meglio di riscrivere da zero.**
KORA ha 31 migration applicate, 8079/8079 test passanti, architettura multi-tenant production-grade, triple protection privacy, metodologia versionata. Riscrivere significherebbe perdere questo patrimonio e ricominciare senza le garanzie attuali. Il consolidamento protegge il valore costruito e lo rende comunicabile.

**Perché la difendibilità metodologica è il moat.**
Chiunque può costruire un dashboard welfare. La barriera di KORA è la metodologia: i 14 stage, i 10 componenti, i 5 pillar, la separazione tra KORA Index e KORA Contribution, il Confidence Score inseparabile, la calibration_status non-sopprimibile. Questa metodologia è documentata, versionata, e difendibile davanti a board, audit, regolatori. È il moat — non il software.

---

## 10. Non-Negotiables

Dieci principi che non si toccano. Non per questa versione — mai.

1. **KORA misura organizzazioni, non individui.** Il KORA Index è un output company-level. Il PIB è un layer intermedio. Nessun ranking individuale visibile all'azienda.

2. **Il worker è proprietario dei propri dati.** My KORA è uno spazio del lavoratore. L'azienda non ha accesso diretto. La pseudonymizzazione è end-to-end e la mappa di re-identificazione non appartiene a KORA.

3. **Triple protection: RLS + service layer + access matrix.** Nessuno dei tre layer è rimovibile. Un singolo layer non è mai sufficiente.

4. **KORA Contribution non altera il KORA Index.** I due indicatori sono paralleli, non sommabili. Nessun double counting.

5. **Confidence Score e calibration_status sono inseparabili dal KORA Index.** Senza di essi, l'Index non è mostrabile.

6. **I pesi metodologici non sono hardcoded.** Si leggono sempre da `lib/methodology-config/v0.1.ts`. Mai inline.

7. **KORA Link v1 è attribution, non sorveglianza.** Il chip è anonimo. Il legame chip↔worker è self-initiated dal lavoratore. L'azienda non vede chi ha scansionato cosa.

8. **La produzione non si tocca per sviluppare.** `.env.local` punta a staging. Produzione è protetta da Gate 2.

9. **Ogni feature ha design doc, data model, test, risk notes e release gate prima di andare live.**

10. **La difendibilità metodologica è il prodotto.** Non è un dettaglio tecnico — è il valore che KORA vende. Qualsiasi decisione che la eroda è una decisione che erode il business.

---

*KORA Product Doctrine — CC-05 · Branch `docs/consolidation`*
*Documento vivo — aggiornato insieme agli invarianti e all'architettura.*
*Conflitti tra questo documento e `docs/21-founder-gate-resolution-log.md`: il doc 21 prevale.*

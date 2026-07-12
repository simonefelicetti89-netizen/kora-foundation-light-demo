# KORA Activation Layer 01 — Phase 1 vs Phase 2 Signal Streams

**Data:** 2026-07-12
**Branch:** `feature/kora-activation-layer-01`
**Tipo:** Allineamento concettuale/prodotto — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione DPO/CTO/fiscale/legale presa, nessun calcolo KORA Index modificato, nessuna persistenza creata.

## Scopo

Questo documento formalizza il **KORA Activation Layer**: la separazione tra Fase 1 (Raw Data Intelligence — cosa sta già succedendo nell'organizzazione) e Fase 2 (Activation Intelligence — cosa può essere attivato ora tramite partner, abilitazione aziendale e scelta volontaria del worker, e se ha funzionato). Segue `PARTNER-ECOSYSTEM-MODEL-01` (distinzione iniziative/attività) e `PARTNER-ACTIVITY-CATALOG-01` (prima shell del catalogo attività), collocando formalmente quest'ultimo come primo tassello della Fase 2.

**Frase prodotto chiave:** *"Il KORA Index è alimentato da due flussi complementari: dati organizzativi grezzi caricati e classificati dal motore KORA, e segnali di attivazione generati dalla piattaforma attraverso attività partner, scelte aziendali e scelta volontaria dei lavoratori."*

---

## 0. Nota di naming — "Activation" è già un termine sovraccarico

Prima di descrivere le due fasi, è necessario registrare una collisione di naming reale, sullo stesso schema del registro già usato in `docs/PARTNER_ECOSYSTEM_MODEL_01.md` §4. Il repo usa già "activation" per almeno quattro concetti distinti:

| # | Superficie | Cosa rappresenta | Relazione con questo documento |
|---|---|---|---|
| 1 | **Activation Safeguard** (`lib/kora-engine/activation-engine.ts`, CLAUDE.md §9) | Gate obbligatorio CLEAR/WARNING/FLAGGED basato su soglie AR/MAR — Stage 13 dell'algoritmo a 14 stadi | Diverso concetto — non toccato da questo sprint |
| 2 | **Activation Intelligence™** (`/company/activation`, C-08) | Vista Fase 1 esistente: "chi non viene raggiunto e dove si accumula l'Activation Debt" — analisi reach/equity su dati già caricati | **Fase 1**, non Fase 2 — vedi nota sotto |
| 3 | **KORA Link "attivazione"** (`fn_activate_link_for_worker`, `/worker/kora-link/activate`) | Attivazione fisica del chip NFC/QR da parte del worker | Diverso concetto — non toccato da questo sprint |
| 4 | **Worker activation profile/opportunity** (`b111-worker-activation-profile`, `b87b-activation-opportunity`) | Profilo di attivazione del singolo worker nei dati Fase 1 | **Fase 1** — coerente con il flusso Raw Data Intelligence |
| 5 | **KORA Activation Layer / Phase 2 Activation Intelligence** (questo documento) | Nuovo layer concettuale: segnali generati nativamente dalla piattaforma tramite attività partner e scelta worker | **Fase 2** — il soggetto di questo documento |

**Punto critico da non fraintendere:** `/company/activation` ("Activation Intelligence™") è una funzionalità Fase 1 già esistente e matura — analizza reach ed equity sui dati organizzativi già caricati e classificati, esattamente come il resto della Fase 1. **Non è** la Fase 2 di questo documento, anche se il nome è simile. La Fase 2 introduce un flusso di segnale completamente nuovo (nativo alla piattaforma, non derivato da upload aziendali) — questo documento la chiama "Activation Intelligence Layer (Fase 2)" per restare fedele al principio di prodotto richiesto, ma **ogni superficie futura deve citare esplicitamente "Fase 2"** per evitare di essere confusa con `/company/activation`.

---

## 1. Fase 1 — Raw Data Intelligence

**Domanda a cui risponde:** *"Cosa sta già succedendo nell'organizzazione?"*

**Input:**
- Dati aziendali caricati (upload HR/welfare/formazione/benefit/eventi/budget).
- Segnali organizzativi già esistenti prima di qualsiasi intervento KORA.

**Elaborazione:**
- Ingestion (`lib/data-intake/`, `lib/ingestion/`).
- Normalizzazione (UEF — Unified Event Frame).
- Classificazione (`data/synthetic/action-taxonomy.json`, `lib/kora-engine/pillar-mapping.ts`).
- Eleggibilità fiscale/policy (`docs/04-fiscal-policy-eligibility-layer.md`, `data/synthetic/company-budget-fiscal-plans.json`).
- Mappatura pilastri.

**Output:**
- KORA Index (`lib/kora-engine/kora-index-engine.ts`).
- Decision Pack.
- Activation gap / Activation Debt (`/company/activation`, Activation Intelligence™ — Fase 1, vedi nota di naming sopra).
- Bilanciamento pilastri, insight di equità/accesso.
- Piano d'azione.

**Maturità:** alta. Pipeline reale, DB-backed, con motore di scoring (`lib/kora-engine/`), superfici live (`/company/kora-index`, `/company/activation`, `/company/financial`).

---

## 2. Fase 2 — Activation Intelligence (nuovo layer)

**Domanda a cui risponde:** *"Cosa possiamo attivare ora, e ha funzionato?"*

**Input:**
- Partner Activity Catalog (`lib/partner-activities/catalog.ts`, `PARTNER-ACTIVITY-CATALOG-01`).
- Regole di abilitazione aziendale (future).
- Scelta volontaria del worker.
- Prenotazione/candidatura/richiesta di contatto/riscatto voucher del worker.
- Erogazione/completamento da parte del partner.
- Segnali aggregati di utilizzo e completamento.

**Elaborazione (tutta futura, non implementata in questo sprint):**
- Selezione attività aziendale.
- Discovery/prenotazione worker.
- Gestione prenotazioni partner.
- Pipeline di segnale di attivazione aggregato.

**Output (futuro):**
- Segnali di attivazione aggregati per KORA Index.
- Utilizzo per pilastro.
- Utilizzo per categoria fiscale/welfare.
- Distribuzione delle scelte worker (aggregata).
- Performance aggregata delle attività partner.
- Segnali di equità/accesso e continuità.

**Maturità:** minima. Solo il Partner Activity Catalog esiste, come shell no-DB (`/partner/activity-catalog`). Nessuna delle fasi di elaborazione è implementata.

---

## 3. Relazione con KORA Index

- Entrambe le fasi **possono** alimentare il KORA Index — ma restano due pipeline di segnale distinte.
- La Fase 1 alimenta il KORA Index da dati esistenti caricati e classificati.
- La Fase 2 alimenterà il KORA Index (in futuro) da segnali di attivazione nativi della piattaforma.
- Le due pipeline non vanno mai fuse in un unico calcolo o in un'unica tabella di segnale.
- **Questo sprint non modifica il calcolo live del KORA Index** (`lib/kora-engine/kora-index-engine.ts` invariato) — nessun segnale Fase 2 reale esiste oggi.

---

## 4. Confine Contribution

- Le iniziative KORA Space/Contribution (`commons.post` → `commons.booking` → `commons.contribution_event`) restano separate da entrambe le fasi qui descritte.
- Contribution non è lo stesso del KORA Index — resta un companion indicator, mai un componente del calcolo (invariato, CLAUDE.md §12.7).
- Le Attività Partner (Fase 2) non alimentano mai direttamente KORA Contribution.
- Un'attività può essere impacchettata in un'iniziativa solo tramite un percorso separato di proposta → revisione → adozione — un atto editoriale, non un collegamento automatico. Vedi `docs/PARTNER_ECOSYSTEM_MODEL_01.md` §3.

---

## 5. Confine privacy

Invariato rispetto al resto della piattaforma, per entrambe le fasi:
- L'azienda vede solo aggregati — mai su base individuale.
- Il partner vede un nominativo worker solo dopo un'azione volontaria del worker.
- La scelta del worker è sempre volontaria.
- Nessun dato di attività a livello individuale torna mai al datore di lavoro.

---

## 6. Sequenza di implementazione futura

1. `COMPANY-ACTIVITY-SELECTION-01` — l'azienda deve definire il perimetro di attivazione (categoria fiscale/pilastro/partner/attività/scelta libera worker) prima che il worker possa prenotare.
2. `WORKER-ACTIVITY-DISCOVERY-01` — il worker scopre e sceglie tra le attività abilitate dall'azienda.
3. `PARTNER-ACTIVITY-BOOKINGS-01` — il partner gestisce le prenotazioni/richieste ricevute.
4. `ACTIVATION-SIGNAL-PIPELINE-01` — aggregazione dei segnali di utilizzo/completamento.
5. `KORA-INDEX-ACTIVATION-INTEGRATION-01` — integrazione (solo dopo revisione CTO) dei segnali aggregati Fase 2 nel calcolo KORA Index, mantenendo la pipeline distinta dalla Fase 1.

**Prossimo sprint raccomandato:** `COMPANY-ACTIVITY-SELECTION-01` — l'azienda deve definire il perimetro di attivazione prima che qualunque logica di prenotazione worker abbia senso.

---

## Documenti collegati

`docs/PARTNER_ECOSYSTEM_MODEL_01.md`, `docs/PARTNER_ACTIVITY_CATALOG_01.md`, `docs/04-fiscal-policy-eligibility-layer.md`, `docs/GOVERNANCE_UI_01.md`, `docs/KORA_LINK_CHANGELOG.md`.

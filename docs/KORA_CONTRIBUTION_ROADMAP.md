# KORA Contribution™ — Roadmap & Strategic Boundaries

**Document type:** Technical roadmap and product boundary definition
**Status:** Foundation Light v0.1 — pre_empirical_calibration
**Gate status:** Gate 2 OPEN · Gate 3 OPEN
**Date:** 2026-06-21

---

## 1. What KORA Contribution Is

KORA Contribution™ è un **indicatore companion** — non è una componente del KORA Index™ v3 e non influenza il punteggio organizzativo.

KORA Contribution misura il **contributo collettivo e territoriale aggregato** che emerge dall'ecosistema di attivazione KORA Space: iniziative cross-azienda, eventi territoriali, partecipazioni tra organizzazioni diverse, outreach verso comunità locali.

### Allowed framing language

| Italiano | English |
|---|---|
| contributo sociale aggregato | aggregate social contribution |
| ecosistema di attivazione | activation ecosystem |
| evidenze aggregate | aggregate evidence |
| reporting volontario | voluntary reporting |
| segnale collettivo emergente | emerging collective signal |
| indicatore companion | companion indicator |

### Excluded framing language

KORA Contribution **non è** e **non deve essere descritto come**:

- Certificazione ESG o CSRD/ESRS compliance
- Strumento di rendicontazione obbligatoria
- Audit-ready output o assurance
- Sistema di rating individuale dei lavoratori
- Leaderboard, ranking, o sistema di punteggio competitivo
- Estensione alla filiera o supply chain (→ KORA Value Chain, prodotto separato)
- Garanzia di conformità normativa di alcun tipo

---

## 2. KORA Contribution ≠ KORA Value Chain

Questa separazione è architetturale e non negoziabile.

| KORA Contribution™ | KORA Value Chain (Roadmap Fase 3) |
|---|---|
| Attivo in Foundation Light (shell) + Pilot (live) | Non attivo — future vision, post-pilot |
| Ecosistema di attivazione interna cross-azienda | Filiera di fornitura, partner commerciali, reti di distribuzione |
| Aggregato da KORA Space (commons.contribution_event) | Richiede standard di evidenza condivisi con fornitori |
| Companion indicator al KORA Index | Prodotto autonomo, architettura separata |
| Anonimato: solo aggregati, mai legami worker↔iniziativa | Privacy framework distinto per terze parti |

KORA Value Chain appartiene alla **Fase 3 della roadmap** (Ecosystem Phase) ed è rappresentato esclusivamente in `/demo/future-vision` come mockup statico. Nessuna logica runtime è attiva.

---

## 3. Roadmap Fasi

### Fase 1 — Foundation Light (current)

**Status:** Attiva

**Caratteristiche:**
- Shell sintetica per tutti i tenant Foundation Light (`production_ready = false`)
- Anteprima metodologica su dati sintetici (scenario S1) via `KoraContributionService.getSummaryV2()`
- `calibration_status = 'pre_empirical_calibration'` — non sopprimibile
- `is_kora_index_component = false` — enforced in service e type
- Struttura duale (promoter + origin_employer) pronta per la Fase 2
- No ranking, no rewards, no leaderboard

**Gate attivi:** Gate 2 OPEN (no SQL DDL), Gate 3 OPEN (no dati live lavoratori)

**Non incluso in Fase 1:**
- Dashboard live (`production_ready = true` mai settato in FL)
- Export Contribution Statement (PDF/JSON)
- Mappatura CSRD/ESRS (fuori scope — vedi §1)
- KORA Value Chain

---

### Fase 2 — Pilot (production_ready path)

**Status:** Architettura pronta, nessun tenant attivo

**Trigger:** `UPDATE analytics.tenant SET production_ready = true WHERE id = '<tenant_id>'`

**Caratteristiche:**
- Dashboard live via `getContributionPromoterView` + `getContributionOriginEmployerView`
- Dati reali da `commons.contribution_event` (scritti da `BookingService.markAttended()`)
- Due sezioni parallele con peso visivo equivalente — nessuna gerarchia
- Anonimato totale: origin_employer vede solo aggregati, mai legame worker↔iniziativa
- `calibration_status = 'pre_empirical_calibration'` rimane — post-Delphi Study calibration

**Gate di attivazione:**
1. Gate 2 CLOSED (CTO review — sblocca SQL DDL e migrazioni)
2. Migration 025 (`commons.booking`, `commons.contribution_event`) applicata
3. Almeno un tenant con `production_ready = true` e dati reali in `contribution_event`

**Ancora non incluso in Fase 2:**
- Contribution Statement export
- CSRD/ESRS datapoint mapping
- KORA Value Chain

---

### Fase 3 — Ecosystem (KORA Value Chain — future vision)

**Status:** Non attivo — future vision, mockup statico in `/demo/future-vision`

**Questo è un prodotto separato da KORA Contribution™.**

KORA Value Chain estende KORA alla filiera di fornitura, ai partner commerciali e alle reti di distribuzione. Richiede:
- Standard di evidenza condivisi con fornitori e partner terzi
- Framework privacy dedicato per dati di terze parti
- Architettura autonoma separata da `commons.*`
- Decisione fondatore e review legale/privacy dedicata

**Non confondere KORA Contribution con KORA Value Chain.** KORA Contribution misura il contributo aggregato dell'ecosistema di attivazione interno (tra aziende partecipanti a KORA Space). KORA Value Chain misurerebbe l'impatto attraverso catene di fornitura esterne — scala, architettura e privacy framework completamente diversi.

---

### Fase 4 — Worker-Owned (Dynamic Impact CV contribution layer)

**Status:** Non attivo — future vision

**Caratteristiche:**
- Worker-level contribution CV (layer aggiuntivo del Dynamic Impact CV)
- Worker consenso esplicito per condivisione aggregata
- No employer-visibility individuale — invariante non negoziabile
- Privacy framework distinto da employer-facing Contribution dashboard

---

## 4. Invarianti architetturali (non negoziabili)

Queste invarianti si applicano a tutte le fasi:

1. **`is_kora_index_component` è sempre `false`** — KORA Contribution non è mai una componente del KORA Index v3
2. **Nessun dato individuale employer-visible** — il datore di lavoro vede solo aggregati
3. **Nessun ranking, leaderboard, o rewards** — enforced nei tipi (`noRanking`, `noRewards`, `noLeaderboard`)
4. **`calibration_status = 'pre_empirical_calibration'`** fino a Delphi Study post-pilot — non sopprimibile
5. **`production_ready` gate intoccabile** — nessun bypass per demo o testing
6. **KORA Contribution ≠ KORA Value Chain** — separazione architetturale e narrativa permanente

---

## 5. Disclaimer obbligatorio

Il seguente disclaimer è obbligatorio su ogni superficie che espone KORA Contribution:

> KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.

Fonte: CLAUDE.md §17 e `docs/21b-methodology-risk-acceptance-and-provisional-score-policy.md`

---

**Document authority:** CLAUDE.md §2, §12.7 · `docs/21-founder-gate-resolution-log.md` D-01–D-21
**Next review trigger:** Gate 2 CLOSED (CTO review)

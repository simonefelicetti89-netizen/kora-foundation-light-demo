# KORA Foundation Light — QA Report
**Fase 6 · Data:** 2026-06-04
**Branch:** main · **Routes totali:** 61 · **TypeScript:** 0 errori

---

## Sintesi esecutiva

| Area | Esito | Note |
|------|-------|------|
| Font audit | ✅ PASS | Zero serif/Instrument/Playfair in UI dopo fix Fase 6 |
| Token audit | ✅ PASS | kora-fun-green risolto; tutti gli altri token attivi |
| Privacy red lines | ✅ PASS | Nessun dato worker-privato esposto a employer routes |
| Metodologia | ✅ PASS | CS esterno, Safeguard interpretativo, Contribution separato |
| Copy/Dottrina | ✅ PASS | Zero superlativi; lessico dottrinale rispettato |
| Dead links | ✅ PASS | Tutti i 37 href statici puntano a route esistenti |
| A11y base | ✅ PASS | lang="it", focus-visible, prefers-reduced-motion, alt img |
| TypeScript | ✅ PASS | 0 errori `tsc --noEmit` |
| Anti-rimozione | ✅ PASS | 61 route vs inventario Fase 0 — invariato |
| Colori nominali residui | ⚠️ DEBITO | 178+26+19 occorrenze in pagine tecniche complesse |

---

## 1. Font Audit

### Fix applicati in Fase 6

`var(--font-instrument-serif)` usa la CSS variable diretta di Instrument Serif — bypass dell'alias globale Fase 0. **Causa serif visibile** in 8 file. Corretti:

| File | Righe corrette |
|------|----------------|
| `components/kora-index/HeroDiagnosis.tsx` | 72 |
| `components/kora-index/BoardActions.tsx` | 27 |
| `components/kora-index/ScoreDrivers.tsx` | 112 |
| `components/company/cockpit/KoraIntelligenceHero.tsx` | 66 |
| `components/company/cockpit/MacroblockCompositionCard.tsx` | 50 |
| `components/charts/ComponentBreakdownChart.tsx` | 74 |
| `app/admin/page.tsx` | 138, 195 |
| `app/company/kora-index/page.tsx` | 226 |

`font-kora-serif` class — lavorava via alias `@theme inline` (→ Jakarta) ma fuorviante. Sostituito con `font-kora-sans` esplicito in 12 componenti:

`PageMasthead`, `ChartFrame`, `ExplainabilityPanel`, `BlockedByDesignPanel`, `ConfidenceBreakdown`, `EligibilityGatePanel`, `BudgetToHumanImpactPanel`, `RecommendationsPanel`, `KoraIndexBuildCard`, `EconomicReliefPanel`, `IndexRingCard`, `ProssimaAzioneCard`

### Stato finale
```
grep: var(--font-instrument-serif) in tsx  → 0 occorrenze
grep: font-kora-serif class in tsx          → 0 occorrenze
grep: Playfair Display in tsx               → 0 occorrenze
grep: Instrument Serif in tsx               → 0 occorrenze (escluso layout.tsx caricamento font)
```

---

## 2. Token Audit

### kora-fun-green — token non definito (bug render)

`kora-fun-green` **non era presente** nel blocco `@theme inline` di `globals.css`. Le classi `bg-kora-fun-green`, `border-kora-fun-green/40` producevano **nessun colore** nell'UI.

Fix applicati:

| File | Sostituzioni |
|------|-------------|
| `components/kora-index/ActivationSafeguardPanel.tsx` | `bg-kora-fun-green` → `bg-[#2F7D55]`; zone bar → `rgba(47,125,85,0.10)`; border → `rgba(47,125,85,0.30)` |
| `app/admin/companies/[companyId]/page.tsx` | `border-kora-fun-green/*` → `border-[rgba(47,125,85,...)]`; `bg-[#2F7D55]/N` → `bg-[rgba(47,125,85,...)]` |
| `app/my-kora/page.tsx` | `border-kora-fun-green/40 bg-[#2F7D55]/15` → explicit rgba |

Bonus fix: `bg-[rgba(158,59,47,0.06)]0` (typo con `0` extra) → `bg-[#9E3B2F]` in `ActivationSafeguardPanel`; `text-red-800` → `text-[#9E3B2F]`.

### Token attivi verificati (`@theme inline`)

| Token Tailwind | CSS var | Valore | Status |
|----------------|---------|--------|--------|
| `kora-canvas` | `--color-kora-canvas` | `#EFEBE2` | ✅ |
| `kora-ink` | `--color-kora-ink` | `#06032B` | ✅ |
| `kora-violet` | `--color-kora-violet` | `#6156F5` | ✅ |
| `kora-cosmic-blue` | `--color-kora-cosmic-blue` | `#06032B` | ✅ |
| `kora-accent` | `--color-kora-accent` | `#C76F3D` | ✅ |
| `kora-terracotta` | `--color-kora-terracotta` | `#C76F3D` | ✅ |
| `kora-fun-green` | non definito | — | ✅ rimosso |

---

## 3. Privacy Red Lines

```
grep: employer routes → workers.json / pib-records.json / impact-units.json / dynamic-cv-items / booking-requests / consent-records / milestones
→ 0 occorrenze in /app/company/
```

I riferimenti a "PIB" nelle pagine company (/company/ingestion, /company/financial, /company/shared, /company/profile) sono tutti nel contesto di **spiegare perché il PIB non è visibile** (privacy boundary notices). Nessun dato PIB individuale è esposto.

`workerProvisioningService.assertEmployerCannotViewIndividualPIB()` è chiamato esplicitamente in `company/profile/page.tsx`. ✅

---

## 4. Metodologia — Integrità

| Check | Esito |
|-------|-------|
| KORA Contribution mai aggregato a KORA Index | ✅ PASS — 0 merge trovati |
| Confidence Score esterno (peso=0) | ✅ PASS — CS sempre display-only |
| Activation Safeguard non entra nel calcolo | ✅ PASS — gate interpretativo, non component weight |
| `calibration_status` / `pre_empirical_calibration` su superfici Index | ✅ 42 occorrenze in `/company/` |
| `Activation Safeguard` su superfici Index | ✅ 229 riferimenti in `/company/` |
| `Confidence Score` su superfici Index | ✅ 39 riferimenti in `/company/` |
| `synthetic_demo_data: true` label | ✅ 66 occorrenze |
| Pesi metodologici hardcoded in componenti | ✅ PASS — methodology-config è la single source |

**Nota soglie display**: In `company/activation/page.tsx` e `company/data/upload/page.tsx` appaiono soglie come `0.30`, `0.50`, `0.25`. Queste sono **soglie di colore UI** (green/amber/red per status), non pesi dell'algoritmo IU. Accettabile. Le soglie dell'Activation Safeguard (AR≥0.40, MAR≥0.30 ecc.) provengono da `lib/constants/kora.ts` via `SAFEGUARD_THRESHOLDS`.

---

## 5. Copy & Dottrina

### Superlativi
"ROI garantito" appare 8+ volte — sempre in forma **negativa** ("nessun ROI garantito", "non promette ROI garantito"). Corretto per dottrina.
"straordinario" in `/app/advisor/page.tsx` è un'etichetta di review scope sintetica, non una claim su KORA.

### Lessico forbidden
Termini come "welfare platform", "benefits marketplace", "sorveglianza", "ranking individuale" compaiono esclusivamente nelle sezioni **"KORA non è"** (landing, demo-guide). Nessun uso positivo. ✅

### Compliance disclaimer CSR/ESG
Presente in `/company/ingestion`, `/company/financial`, `/company/reports` e `/pilot/page.tsx`.

---

## 6. Click Audit

### Percorso demo principale
`/` → `/demo-guide` → `/company` → `/company/kora-index` → `/company/activation` → `/company/financial` → `/company/reports` → `/future-vision`

Ogni schermata company ha next-step CTA verso la schermata successiva nel percorso. ✅

### Dead links
Tutti i 37 href statici interni verificati contro l'inventario di 61 route. Nessun vicolo cieco.

### Azioni senza esito (`disabled`)
Le azioni "disabled" in Foundation Light (booking, report export completo, consent toggles) sono etichettate esplicitamente con "Solo anteprima — Foundation Light". Nessuna azione silenziosamente non operativa. ✅

---

## 7. A11y Base

| Check | Esito |
|-------|-------|
| `<html lang="it">` | ✅ `app/layout.tsx:40` |
| `:focus-visible` ring definito | ✅ `globals.css:155` — outline violet 2px |
| `prefers-reduced-motion` in landing CSS | ✅ entrambi i moduli marketing |
| `prefers-reduced-motion` in `useLandingReveal` | ✅ hook rileva e applica istantaneamente |
| Tutte le `<Image>` con `alt` | ✅ verificato (falsi positivi da JSX multiriga esclusi) |
| `aria-label` su nav | ✅ Sidebar: `aria-label="Navigazione principale"`, AppShell: `aria-label` su main |
| `aria-current="page"` in Sidebar | ✅ presente |

**Debito A11y non bloccante:**
- Le pagine più dense (data/upload, uef-review) non sono state testate con screen reader — fuori scope Foundation Light.
- Contrasto AA non verificato strumentalmente su tutte le varianti di componente.

---

## 8. Anti-rimozione Dati

### Inventario route (Fase 0 → Fase 6)

| Area | Fase 0 | Fase 6 | Delta |
|------|--------|--------|-------|
| /admin/* | 25 | 30 | +5 (B38–B40 features) |
| /company/* | 16 | 18 | +2 (workspace, shared) |
| /my-kora/* | 6 | 6 | 0 |
| /advisor | 1 | 1 | 0 |
| /partner | 1 | 1 | 0 |
| /future-vision | 1 | 1 | 0 |
| /demo-guide | 1 | 1 | 0 |
| / + /pilot | 2 | 2 | 0 |
| **Totale** | ~53 | **61** | **+8** |

Nessuna pagina rimossa. I +8 sono funzionalità aggiunte nei blocchi B38–B40 (live company creation, ACME demo, tenants, etc.).

---

## 9. Consistenza Pattern

### Componenti Layer usati coerentemente
- `PageMasthead` — usato in: demo-guide, future-vision, admin pages
- `MethodologyBadge` — 42 occorrenze in /company/
- `Explainer` — presente in kora-index e cockpit
- `DataBar` — usato in scoring, pillars
- `TOKENS` importato da single source `lib/design/kora-design-tokens.ts`

### Pattern one-off noti (debito documentato)
- `company/data/upload/page.tsx` — 1900+ righe, usa green/blue/amber direttamente; candidato a refactor Layer post-pilot
- `company/ingestion/page.tsx` — stessa situazione

---

## 10. Debiti Residui

### P1 — Accettabili (non bloccanti per pilot)

| Debito | File/Area | Conteggio | Motivazione |
|--------|-----------|-----------|-------------|
| Tailwind semantic colors (green/red/blue) in company data pages | `data/upload`, `ingestion`, `data`, `uef-review` | 178 | Status semantici funzionali; pagine tecniche non facing board |
| Purple/violet in admin operator tools | `/admin/company-workspace`, `/admin/data-intake` | 26 | Operator-facing; non nel percorso demo primario |
| Named colors in advisor page | `/app/advisor/page.tsx` | 19 | Parzialmente migrato in Fase 4; residui in sezioni tecniche |

### P2 — Da pianificare

| Debito | Priorità | Note |
|--------|----------|------|
| Refactor `company/data/upload/page.tsx` | Post-pilot | 1900+ righe; candidato a scomposizione in componenti Layer |
| Refactor `company/ingestion/page.tsx` | Post-pilot | Similar scope |
| A11y strumentale completa (screen reader, contrasto AA) | Pre-commercializzazione | Non blocca Foundation Light demo |
| `font-editorial` class in globals.css | Bassa | Mantenuta per retrocompatibilità; non usata nell'UI attuale |

---

## Commits Fase 6

```
fix: Fase 6 QA — font serif, kora-fun-green, ActivationSafeguardPanel tokens
```

**File modificati:** 13 componenti/pagine · 20 istanze corrette

---

*QA Report generato automaticamente da audit grep + ispezione manuale · Foundation Light v0.1 · pre_empirical_calibration*

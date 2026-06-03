# KORA Experience Layer — Sistema di Riferimento
> Versione: 1.0 · Fase 0 · 2026-06-04
> Questo documento è la specifica viva per tutte le fasi di redesign (1–6).

---

## 1. Principi fondanti

1. **Infrastruttura, non dashboard** — ogni elemento giustifica la sua esistenza rispondendo a: perché esiste? che decisione supporta?
2. **Token unici** — niente hex letterali nei componenti. Tutto da `lib/design/kora-design-tokens.ts`.
3. **Jakarta sans-serif ovunque** — il serif è deprecato globalmente. Rimosso pagina per pagina nelle fasi.
4. **Explainer su ogni metrica non ovvia** — il primitivo firma KORA.
5. **Accessibilità come requisito** — contrasto AA, focus visibile, target ≥44px.

---

## 2. Token System

### Fonte canonica
`lib/design/kora-design-tokens.ts` — **unica sorgente di verità**.
`app/globals.css` — alias CSS per Tailwind e CSS custom properties (mirror).

### Palette colori

| Token TS | CSS var | Valore | Uso |
|---|---|---|---|
| `TOKENS.canvas` | `--kora-canvas` | `#EFEBE2` | App background, page canvas |
| `TOKENS.surface` | `--kora-surface` | `#F8F6F1` | Cards, panels, modals |
| `TOKENS.taupe` | `--kora-taupe` | `#E3DDD3` | Secondary surfaces, separators |
| `TOKENS.ink` | `--kora-ink` | `#06032B` | Primary text, cosmic blue |
| `TOKENS.inkSecondary` | — | `rgba(6,3,43,0.62)` | Secondary text |
| `TOKENS.inkTertiary` | — | `rgba(6,3,43,0.42)` | Tertiary text |
| `TOKENS.inkHint` | — | `rgba(6,3,43,0.40)` | Hint, muted labels |
| `TOKENS.inkMeta` | — | `rgba(6,3,43,0.38)` | Meta info, provenance |
| `TOKENS.inkBorder` | — | `rgba(6,3,43,0.08)` | Default borders |
| `TOKENS.inkBorderStrong` | — | `rgba(6,3,43,0.14)` | Strong borders |
| `TOKENS.accent` | `--kora-accent` | `#C76F3D` | Terracotta primario |
| `TOKENS.accentSoft` | — | `rgba(199,111,61,0.12)` | Soft terracotta bg |
| `TOKENS.accentHover` | — | `rgba(199,111,61,0.06)` | Hover tint |
| `TOKENS.violet` | `--kora-violet` | `#6156F5` | Digital micro-accent (sparingly) |
| `TOKENS.success` | `--kora-success` | `#2F7D55` | Positive/CLEAR |
| `TOKENS.warning` | `--kora-warning` | `#D99A2B` | Warning/WARNING |
| `TOKENS.critical` | `--kora-critical` | `#9E3B2F` | Critical/FLAGGED |
| `KORA_COLORS.COSMIC_BLUE` | `--kora-sidebar` | `#06032B` | Sidebar |

### Safeguard States (governance tokens — mai modificare)

| Stato | bg | text | dot |
|---|---|---|---|
| CLEAR | `rgba(47,125,85,0.10)` | `#2F7D55` | `#2F7D55` |
| WARNING | `rgba(217,154,43,0.12)` | `#8A5A00` | `#D99A2B` |
| FLAGGED | `rgba(158,59,47,0.10)` | `#9E3B2F` | `#9E3B2F` |

### Card System

```
cardRadius:       20px
cardRadiusSm:     14px
cardBorder:       1px solid rgba(6,3,43,0.08)
cardBorderStrong: 1px solid rgba(6,3,43,0.14)
cardShadow:       0 10px 30px rgba(6,3,43,0.05)
cardShadowHover:  0 18px 45px rgba(6,3,43,0.10)
cardBorderHover:  1px solid rgba(199,111,61,0.45)
```

### Pillar Colors (earth-tone, single source)

| Pillar | Token | Valore |
|---|---|---|
| LIFE | `PILLAR_COLORS.LIFE` | `#C76F3D` |
| GROWTH | `PILLAR_COLORS.GROWTH` | `#2F7D55` |
| CONNECTION | `PILLAR_COLORS.CONNECTION` | `#D99767` |
| IMPACT | `PILLAR_COLORS.IMPACT` | `#D99A2B` |
| LEGACY | `PILLAR_COLORS.LEGACY` | `#8A7562` |

> **Nota open**: landing HTML usa colori diversi per i pillar (LIFE=blu, CONNECTION=viola). Decisione del founder richiesta prima di sincronizzare landing con token.

### Chart Colors

| Ruolo | Valore |
|---|---|
| Primary series | `#C76F3D` (terracotta) |
| Secondary series | `#D99767` (warm sand) |
| Benchmark (dashed) | `rgba(6,3,43,0.35)` |
| Threshold (dotted) | `#06032B` |
| Positive trend | `#2F7D55` |
| Warning zone | `#D99A2B` |
| Critical zone | `#9E3B2F` |
| Area fill | `rgba(199,111,61,0.12)` |
| Grid | `rgba(6,3,43,0.08)` |
| Axis | `rgba(6,3,43,0.45)` |
| Tooltip bg | `#06032B` |
| Tooltip border | `rgba(199,111,61,0.45)` |

---

## 3. Scala Tipografica (Jakarta everywhere)

**Font caricati:** Plus Jakarta Sans (UI), Instrument Serif (deprecated—solo legacy), Playfair Display (deprecated—solo legacy).

**Dopo il flip Fase 0:** `--font-kora-serif` punta a `--font-kora-sans`. Il serif non è più visibile globalmente.

### Scale

| Livello | font | size | weight | tracking | color |
|---|---|---|---|---|---|
| **display** | Jakarta | clamp(2.7rem,6vw,4.5rem) | 800 | -0.04em | ink |
| **h1** | Jakarta | clamp(2rem,4vw,2.75rem) | 800 | -0.03em | ink |
| **h2** | Jakarta | clamp(1.6rem,3.4vw,2.4rem) | 800 | -0.025em | ink |
| **h3** | Jakarta | clamp(1.25rem,2vw,1.5rem) | 700 | -0.015em | ink |
| **body-lg** | Jakarta | 16–17.5px | 400 | 0 | inkSecondary |
| **body** | Jakarta | 14–15px | 400/500 | 0 | ink |
| **body-sm** | Jakarta | 12.5–13px | 400 | 0 | inkSecondary |
| **label** | Jakarta | 10–11px | 600–700 | 0.08–0.12em | inkHint |
| **label-upper** | Jakarta | 9.5–11px | 600–700 | 0.10–0.16em + uppercase | inkHint/accent |
| **mono-num** | Jakarta + tabular-nums | inherit | 700–800 | -0.02em | ink |
| **mono-code** | ui-monospace | 10–11px | 400 | 0.03em | inkHint |

**Regole:**
- Ogni titolo di pagina: h1 Jakarta 800, letterSpacing -0.03em
- Eyebrow: label-upper + terracotta
- KPI number: mono-num, fontVariantNumeric tabular-nums, weight 700–800
- Niente serif in interfaccia. Mai.

---

## 4. Inventario Componenti Layer

### components/ui/ — primitivi globali

| Componente | File | Stato | Note |
|---|---|---|---|
| **PageHeader** | PageMasthead.tsx → elevare a PageHeader | Elevare | Rimuovere serif dal title, Jakarta puro |
| **Eyebrow** | (inline in PageMasthead) | Estratto | `font-size:11px weight:700 upper terracotta` |
| **SectionLabel** | SectionLabel.tsx | OK | Jakarta, inkHint, border-bottom |
| **SectionDivider** | SectionDivider.tsx | OK | Separator con label opzionale |
| **DecisionContext** | DecisionContext.tsx | OK | Left border terracotta, italic question |
| **TM** | TM.tsx | OK | Superscript trademark |
| **IntelCard** | IntelCard.tsx | OK | Hover state, important prop |
| **KPICard** | KPICard.tsx | OK | Status, trend, detailHref |
| **MethodologyBadge** | MethodologyBadge.tsx | Consolidare hex | Sostituire hex con TOKENS |
| **Button** | **Button.tsx** (NUOVO) | Da creare | primary/ghost/ink/digital variants |
| **Badge/Pill** | CalibrationBadge.tsx, SafeguardBadge.tsx | Consolidare | Usare TOKENS safeguard |
| **DataBar** | **DataBar.tsx** (NUOVO) | Da creare | Barra macroblocco/pillar token-driven |
| **Explainer** | **Explainer.tsx** (NUOVO) | Da creare | Primitivo firma: "cosa misura · come si legge" |
| **EmptyState** | **EmptyState.tsx** (NUOVO) | Da creare | Stato vuoto con scopo e next step |
| **Tabs** | **Tabs.tsx** (NUOVO) | Da creare | Tabs con content panels |
| **Table** | **Table.tsx** (NUOVO) | Da creare | Header sticky, zebra, tabular-nums |
| **Field** | **Field.tsx** (NUOVO) | Da creare | input/select/textarea coerenti |
| **Tooltip** | **Tooltip.tsx** (NUOVO) | Da creare | Cosmic-blue bg, terracotta border |

### components/hooks/ — motion condiviso

| Hook | File | Scopo |
|---|---|---|
| **useReveal** | useReveal.ts | IntersectionObserver + prefers-reduced-motion |
| **useCountUp** | useCountUp.ts | Animazione numerica (gauge, KPI) |

### components/layout/ — chrome

| Componente | Stato |
|---|---|
| AppShell | OK — DemoStateProvider + chrome |
| Sidebar | OK — Jakarta, terracotta active pill, logic groups |
| Header | Fix hardcoded hex (#F8F6F1 → TOKENS.surface) |
| KoraLogo | OK — on-dark/on-light, brandmark terracotta |

---

## 5. Motion Grammar

### useReveal (IntersectionObserver)
```
trigger: 0.14 threshold
animation: opacity 0→1, translateY 20px→0
duration: 0.8s (pagine) / 0.9s (landing)
easing: cubic-bezier(0.16, 1, 0.3, 1)
delay slots: d1 0.07s / d2 0.14s / d3 0.21s / d4 0.28s
reduced-motion: skip animation entirely, show immediately
```

### useCountUp
```
trigger: IntersectionObserver 0.1 threshold
duration: 1.7s
easing: cubic-bezier(0.16, 1, 0.3, 1) (out-cubic)
reduced-motion: show final value immediately
```

### DataBar fill
```
trigger: element enters viewport
duration: 1.3s
easing: cubic-bezier(0.16, 1, 0.3, 1)
reduced-motion: skip transition, show final width
```

### Hover (IntelCard, KPICard, pillar card)
```
important cards: border terracotta + translateY(-2px) + shadow-hover
duration: 180ms ease
non-important: no hover
reduced-motion: no transform
```

---

## 6. Accessibilità Baseline

| Requisito | Specifiche |
|---|---|
| Contrasto testo | AA: ≥4.5:1 body, ≥3:1 large (WCAG 2.1) |
| Focus visible | 2px solid rgba(97,86,245,0.45), offset 2px |
| Touch target | ≥44×44px per ogni elemento interattivo |
| ARIA su form | `<label htmlFor>`, `aria-required`, `aria-invalid` |
| ARIA su icone | `aria-hidden="true"` su decorative, `aria-label` su funzionali |
| Riduzione motion | `prefers-reduced-motion: reduce` disabilita tutte le animazioni |
| Heading hierarchy | h1 → h2 → h3 in ordine, niente skip |
| Link text | Descrittivo, mai "clicca qui" |

---

## 7. AppShell + Environment

### Structure
```
PUBLIC_ROUTES = ['/', '/demo-guide']  → no chrome
Auth routes → SyntheticDataBanner + Header + Sidebar + main
```

### Environment Classes
`.env-demo` / `.env-live` / `.env-future`
→ cambiano `--env-accent`, `--env-soft`, `--env-border`, `--env-text`

### Sidebar Navigation Logic
- KORA_ADMIN: Control Tower + Intake + Workspace + Network + Demo Lab + Visione
- COMPANY_ADMIN: Command + Intelligence + Evidence + Network + Governance
- COMPANY_VIEWER: Intelligence + Report + Governance
- WORKER: Il tuo spazio + Attivazione + Privacy + Roadmap
- PARTNER: Portale Partner
- ADVISOR: Workspace Advisor

---

## 8. Regole anti-regressione

1. **Mai serif nell'interfaccia** dopo Fase 0 — font-kora-serif è un alias di sans.
2. **Mai hex letterali** nei componenti — sempre TOKENS o CSS vars.
3. **Mai `<p>` o `<div>` con stili ad-hoc** dove esiste un componente Layer.
4. **Mai grids fissi** senza breakpoint responsive (`sm:` / `auto-fit`).
5. **Ogni metrica non ovvia** → `<Explainer>` obbligatorio.
6. **Dati mai rimossi** — solo layout cambia, inventario pre/post identico.
7. **Commit atomici** — una pagina per commit.

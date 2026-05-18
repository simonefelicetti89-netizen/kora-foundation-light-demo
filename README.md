# KORA Foundation Light — Demo

> **SYNTHETIC DEMO DATA — NOT LIVE DATA**
> All data in this application is entirely synthetic and fabricated. No real company data, no real worker identities, no real personal information of any kind.

## What this is

KORA Foundation Light v0.1 is a **controlled demo application** for the KORA Human Impact Intelligence Platform.

- **Methodology:** KORA Methodology v0.1 — Provisional implementation baseline
- **Calibration status:** `pre_empirical_calibration` — Not empirically validated, not regulatory-grade
- **Data:** Synthetic only — `synthetic_demo_data: true` on all seed records
- **Purpose:** Demonstrate the full intelligence loop for pilot-grade diagnostic intelligence

## What KORA is

KORA measures organizations, not individuals. The KORA Index is a company-level output. Individual intermediate data (PIB, IU, UEF) exists only to produce that aggregate — never to rate, rank, or surveil individual workers.

## Gate status

| Gate | Status |
|---|---|
| Gate 1 — Founder decisions | CLOSED |
| Gate 2 — CTO architecture review | OPEN — blocks SQL DDL, Prisma, production backend |
| Gate 3 — Legal/privacy counsel | OPEN — blocks live data |
| Gate 5 — Tax/fiscal advisor | OPEN — blocks live fiscal outputs |

## Running locally

```bash
npm run dev       # Start development server
npx tsc --noEmit  # TypeScript check
npm run lint      # ESLint check
```

## What is NOT in this build

- No SQL, no Prisma, no Supabase
- No production authentication
- No real worker accounts
- No payments, wallet, or KIP execution
- No partner marketplace or booking engine
- No external LLM API calls on HR/worker data
- No live fiscal/tax outputs

## Seed data

Seed files in `/data/synthetic/` are generated separately (Phase 1). The folder currently contains only `.gitkeep` placeholders.

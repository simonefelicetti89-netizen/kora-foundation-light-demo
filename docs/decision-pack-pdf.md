# KORA Decision Pack PDF — Technical Documentation

**Status:** Implemented · Synthetic Live v1  
**Auth:** KORA_ADMIN session only  
**Data:** Live synthetic OP-001 (no recalculation)  
**PDF engine:** Playwright chromium (local/dev) · HTML preview (Vercel fallback)

---

## What it generates

An executive-grade, board-ready PDF document derived from the live synthetic data already persisted for tenant OP-001. The PDF is a 6-page A4 document with:

1. **Cover page** — KORA branding, tenant info, reporting period, generated timestamp, synthetic data disclaimer
2. **Executive Snapshot** — KORA Index hero metric, Activation Safeguard badge, Confidence Score, AR, MAR, Decision Pack version info
3. **Strategic Reading** — 4 advisory insights derived from live data values (no recalculation, no external LLM)
4. **Activation & Evidence** — metric cards + audit trail table (last 10 events, no PII values)
5. **Methodological & Privacy Boundary** — N≥10, PII Guard, Tenant Isolation, Confidence Score external, pre-empirical calibration
6. **Recommendations & Next Actions** — 6 prioritized next steps (Gate 3B, pilot scope, advisor review, data mapping, calibration, workforce communication)

---

## What it does NOT do

- Does not recalculate KORA Index, Confidence Score, or any methodology output
- Does not call any external LLM API
- Does not use Meridiana demo seed data
- Does not expose service_role to client
- Does not include PII, secrets, tokens, or real people data
- Does not open Gate 3B or any production data path

---

## Endpoints

### PDF download
```
GET /api/admin/decision-pack/pdf?tenantCode=OP-001&reportingPeriod=2026-Q1
```
- Requires KORA_ADMIN session (cookie or `Authorization: Bearer <token>`)
- Returns `Content-Type: application/pdf`
- Returns `Content-Disposition: attachment; filename="kora-decision-pack-OP-001-2026-Q1.pdf"`
- Returns 401 if no session, 403 if wrong role, 404 if no data found for tenant/period
- Returns 501 if Playwright chromium is unavailable (Vercel serverless) with hint to use preview

### HTML preview (Vercel-compatible fallback)
```
GET /api/admin/decision-pack/preview?tenantCode=OP-001&reportingPeriod=2026-Q1
```
- Same auth requirements as PDF endpoint
- Returns `Content-Type: text/html; charset=utf-8`
- Open in browser → File → Print → Save as PDF (browser-based export)
- Works on any environment including Vercel serverless

---

## Console integration

Both endpoints are accessible from `/admin/operator` via:
- **↓ Download Decision Pack PDF** — calls the PDF endpoint with browser session cookie
- **↗ HTML Preview** — opens the preview in a new browser tab

---

## Data contract

Source: `lib/decision-pack/pdf-data.ts`  
Reads from Supabase via service_role (server-side only):
- `analytics.tenant` — company name, tenant code
- `analytics.kora_index_result` (with joins) — KORA Index value, safeguard, calibration, methodology, is_current, created_at
- `analytics.kora_index_result → confidence_result` — confidence_score (0–1)
- `analytics.kora_index_result → activation_result` — activation_rate, meaningful_activation_rate (0–1)
- `analytics.decision_pack_version` — version_id, status, id
- `audit.audit_log` — last 10 audit events (action, resource_type, created_at only — no payload values)

---

## Logo support

- KORA logos are stored in `public/kora/logo-white.png` and `public/kora/logo-dark.png`
- Embedded as base64 data URIs in the HTML template (no external requests at render time)
- White logo used on dark cover page; dark logo used on content page headers
- Source assets: `docs/Documenti grafici KORA/01_Horizontal/01_DIGITAL/`

### Optional company logo

`PdfData.meta.companyLogoBase64` accepts a base64-encoded PNG/JPEG data URI.  
When provided, it is shown on the cover page alongside KORA branding.  
If absent, the cover layout remains complete and elegant without it.  
Current implementation: not wired to the endpoint (can be added per-tenant when needed).

---

## PDF visual design

Target aesthetic: strategy-consulting grade, McKinsey-style.  
Color palette:
- `#06032B` — deep navy for dark backgrounds, strong text, KORA brand base
- `#6156F5` — KORA purple for accents, section markers, page bars
- `#C8FF47` — KORA lime, used as single small dot on cover only (highly selective)
- Neutrals — `#eaebf4` borders, `#9899b3` secondary text, `#fafafa` card backgrounds

Typography: Helvetica Neue / Helvetica / Arial (system fonts, no external loading).  
Each page has a consistent header (section label + KORA logo) and footer (disclaimer + calibration badge).  
No marketing brochure style, no dashboard screenshot look, no heavy borders.

---

## Playwright / Vercel note

Playwright `^1.60.0` is installed and confirmed working locally.  
On Vercel serverless, headless Chromium is not available without additional setup:
- Option A: Use `@sparticuz/chromium` + `playwright-core` (adds ~50MB Lambda layer)
- Option B: Use the HTML preview endpoint as Vercel-compatible export path
- Current status: **CONDITIONAL PASS** — PDF works locally/dev; Vercel uses HTML preview

For production board-ready PDF at scale, evaluate:
- Vercel + `@sparticuz/chromium` integration
- Dedicated PDF microservice (separate Node.js instance)
- Cloud-based HTML-to-PDF service (e.g. Gotenberg, WeasyPrint)

---

## What's needed for real client PDF readiness

1. **Gate 3B closed** — legal/privacy review complete before real data
2. **Real tenant data** — wire `fetchPdfData` to real client tenant code
3. **Company logo management** — upload + store client logo, pass to template
4. **Advisor review flow** — promote Decision Pack from `draft` to `ready` after advisor sign-off
5. **PDF signing / watermarking** — cryptographic signature for board-ready document integrity
6. **Vercel PDF hardening** — `@sparticuz/chromium` integration or dedicated PDF service
7. **Localization** — full Italian language for all template text (currently mixed IT/EN)
8. **10-component breakdown** — add KORA Index v3 full component table to PDF
9. **Audit event** — `decision_pack.pdf_generated` event (currently TODO, documented below)

---

## Audit event (TODO)

Writing a `decision_pack.pdf_generated` audit event is not yet implemented.  
When added, the payload should be:

```json
{
  "tenant_id": "<uuid>",
  "reporting_period": "2026-Q1",
  "decision_pack_version_id": "<version_id>",
  "generated_by_role": "KORA_ADMIN",
  "export_format": "pdf"
}
```

No PII, no token, no secret values in the audit event.

---

## Files

| File | Purpose |
|---|---|
| `lib/decision-pack/pdf-data.ts` | Server-side data contract — reads from DB, no recalculation |
| `lib/decision-pack/html-template.ts` | Executive HTML template with inline base64 logos |
| `app/api/admin/decision-pack/pdf/route.ts` | PDF download endpoint (Playwright) |
| `app/api/admin/decision-pack/preview/route.ts` | HTML preview endpoint (Vercel-compatible) |
| `public/kora/logo-white.png` | KORA white logo for dark cover background |
| `public/kora/logo-dark.png` | KORA dark logo for content page headers |
| `app/admin/operator/_components/OperatorConsole.tsx` | Console with Download + Preview buttons |

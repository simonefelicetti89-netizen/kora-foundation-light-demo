# B168.6 — Exposed Domains Discovery

## Known deployment environments

| Environment | URL | Status |
|---|---|---|
| Supabase project | azdnepfmwrmacruykskm.supabase.co | Backend — not indexable |
| Production | TBD — not found in repo | Requires manual input |
| Vercel preview | TBD — no vercel.json found | Requires Vercel dashboard |

## Action required (manual — outside Claude Code scope)

1. Log into Vercel dashboard → find all deployment URLs for this project
2. Log into Google Search Console → add domain(s) if not already verified
3. Run: `site:[dominio]/demo`, `site:[dominio]/admin`, `site:[dominio]/worker` on Google
4. Capture any indexed URLs → request removal via Indexing → URL Removal tool

## Robots.txt and noindex status after Phase 1

All routes except `/` and `/landing` will be Disallow in robots.txt.
All app sections will carry `<meta name="robots" content="noindex,nofollow">`.

## Post-deploy verification

```bash
curl -s https://[DOMAIN]/robots.txt
curl -s -I https://[DOMAIN]/demo/guide | grep -i x-robots
```

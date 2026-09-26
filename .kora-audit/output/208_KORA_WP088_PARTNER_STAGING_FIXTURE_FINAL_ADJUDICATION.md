# 208 — KORA-WP-088 Partner Staging Fixture — Final Adjudication

Founder authorisation implemented: exactly ONE synthetic, staging-only `network.partner_profile`, as **test fixture data**, never production, never business data. One local commit: **`12ffce60f467e18d1b3a7b8487600921f8aba09a`**. Not pushed. Nothing provisioned — staging access variables are absent.

Only variable **names** appear below. No secret was read, printed, logged or committed.

---

## 1. Synthetic staging `partner_profile` mechanism

`ensurePartnerFixtureProfile()` in `scripts/e2e/provision-staging-e2e-fixtures.ts` — locate-or-create, by primary key.

**Identification is layered and deliberately not name-based**, per the instruction not to rely only on a human-readable display name where the schema offers something safer:

| Rank | Marker | Why it is the right field |
|---|---|---|
| 1 | **Deterministic primary key** `eeeeeeee-0088-0088-0088-000000000001` | The strongest marker available: the fixture finds itself by `id`, with no text matching and no possible collision with a generated id. Follows the staging seed's own convention (`gate2_phase1_minimal_staging_seed.sql` uses `aaaaaaaa-0001-…` / `bbbbbbbb-000a-…`); `eeeeeeee` reads as E2E. |
| 2 | **`category = 'kora-e2e-fixture'`** | A canonical **schema field** carrying a machine token. `partner_profile.category` is free-text and unconstrained (migration 010:37), so it serves as a classifier with no migration and no schema invention. |
| 3 | `name = 'KORA_E2E_FIXTURE_PARTNER'` | The KL11-style `FIXTURE_PREFIX` convention — a secondary, human-readable signal only. |
| 4 | **`status = 'draft'`** | A real safety property, not a label. The only worker-facing RLS policy on this table — `network_partner_worker_published_select` (010:66-70) — exposes `status = 'published'` rows only, so the fixture is **invisible to every WORKER session by construction**. |

**It can always distinguish its own profile from a real one:** if a row exists at the fixture id but does not carry the category marker, the script refuses outright rather than adopting it.

## 2. Exact permanent data created by design

**One row, in one table.**

`network.partner_profile`:

| Column | Value | Why |
|---|---|---|
| `id` | `eeeeeeee-0088-0088-0088-000000000001` | deterministic marker |
| `name` | `KORA_E2E_FIXTURE_PARTNER` | prefix convention |
| `category` | `kora-e2e-fixture` | machine marker |
| `pillar` | `GROWTH` | NOT NULL + CHECK; the value the existing kora-link runners use |
| `status` | `draft` | invisible to workers via RLS |
| `description` | explicit "synthetic … staging only, never production … not a real partner and not business data" | unmistakably synthetic to any human reader too |

Every other column is left to its schema default (`country 'IT'`, `delivery_mode 'online'`, timestamps). **Minimally populated: only the two columns the schema actually requires, plus the identification fields.** No column was invented.

## 3. Exact ephemeral data created by design

- **One Supabase Auth user** — created via the Admin Auth API with `email_confirm: true`, password from `E2E_PARTNER_PASSWORD`, and `app_metadata { kora_role: 'PARTNER', kora_partner_id: <fixture profile id>, kora_status: 'active' }`. Never `kora_tenant_id` — partners are not company-scoped.
- **One `network.partner_identity` row** — `partner_id` → the fixture profile, `auth_user_id`, `email`, `status: 'active'`.

Both are deleted by `cleanup`. Nothing else is ephemeral, and nothing else is created.

## 4. Production refusal mechanism

Four gates, all enforced in **every** mode including `verify`:

1. `E2E_STAGING_FIXTURE_CONFIRM` must be exactly `'YES'`.
2. `SUPABASE_URL` must parse and must not be a loopback host (local is covered by `scripts/e2e/seed-local-golden-path.ts`).
3. **Hardcoded production denylist by name** — the production ref is refused unconditionally, checked against *both* the operator-supplied ref and the URL string, so neither alone can slip it through.
4. **Hardcoded staging allowlist by name** — the ref must equal the one project Gate 2 authorises. Gate 3 and Gate 5 remain OPEN, and the refusal message says so.

Named refs rather than substring heuristics, deliberately: the existing kora-link scripts use a `/prod/i` denylist that **does not match the real production ref**. This script does not inherit that gap.

## 5. Staging project proof mechanism

Positive identification, not absence-of-evidence: the operator must name the intended project in `E2E_STAGING_PROJECT_REF`, and `SUPABASE_URL`'s host must equal `${E2E_STAGING_PROJECT_REF}.supabase.co`. A mismatch, an unnamed project, or a project that is not the allowlisted staging ref all refuse. **If the target cannot be mechanically proven, the script stops before touching anything.**

## 6. Permanent `partner_identity` total after cleanup

**0.** `cleanup` deletes the identity row by `auth_user_id` and again by fixture email (belt-and-braces after a partial failure), then deletes the Auth user. `verify` reads the table back and fails unless the count is 0 **and** the Auth user is absent.

`verify` also fails if the **anchor profile has gone missing**, or if it is not in `draft` — the permanent half of the lifecycle is asserted just as strictly as the ephemeral half.

`EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0` in `scripts/kora-link/check-staging-fixtures.ts` is therefore preserved. (Disclosed again for completeness: that check's query is scoped to `email ILIKE '%kl11%'`, so a WP-088 fixture would not have tripped it either way — the invariant is honoured because leaving identities behind is wrong, not because a counter would have caught it.)

## 7. Fixture idempotency

- **Profile:** locate by primary key; create only if absent. A second `provision` creates nothing.
- **Auth user:** `createUser`, and on "already exists" locate and reconcile password + metadata in place.
- **Identity:** `upsert` on `auth_user_id`.
- **Cleanup:** every step accepts "already gone", and never aborts one role because the other failed — so a cleanup after a half-finished provision is safe and repeatable.

## 8. Unrelated Partner business data created: **NO**

No assignments, qualifications, prerequisite eligibility, commercial relationships, company/tenant links, governance decisions, cases or appointments — none, anywhere in the script.

This is enforced mechanically, not just asserted in prose: a guard enumerates **every** table the script writes and requires the set to be exactly `{partner_profile, partner_identity, advisor_identity}`. Any future edit that touches another table fails the test.

A second guard proves there is **exactly one** `partner_profile` insert path and that it carries the fixture id — an arbitrary profile remains impossible.

**One superseded guard was updated rather than deleted.** The previous rule was "never create a `partner_profile`"; the adjudication changed it to "create exactly one synthetic fixture". Deleting the guard would have removed the protection along with the obsolete rule, so it was narrowed instead.

## 9. Advisor status

Unchanged, as instructed. `ADVISOR → /advisor` preserved (9/9 role-home tests). Cleanup deletes the Auth user and transitions `advisor_identity` to `inactive_offboarded`; **no physical delete is attempted** — `advisor.advisor_identity` has no DELETE grant for anyone, by design (migration 056: *"identity history is never physically removed"*), and this does not request one.

## 10. Worker status

**No code change**, as instructed. `worker-a@staging.kora.internal` remains the canonical WP-088 validation user. R03 targets `/worker/workspace`, which is reachable only once onboarding is genuinely complete. `onboarding_completed_at` is **not patched** and cannot be: it is written by exactly one thing in the application, `POST /api/worker/onboarding`, i.e. the worker finishing the 5-step wizard. Runbook: `docs/archive/qa/KORA_LINK_STAGING_QA_ACCESS_RUNBOOK.md:96-111` §6.

## 11–14. Validation

| Gate | Result |
|---|---|
| WP-088 guards | **64/64** (was 60) |
| Partner fixture structural tests | included above — profile identity, draft-invisibility, permanence, table allow-set, single insert path |
| ADVISOR role-home tests | **9/9** |
| Staging fixture governance (`check-staging-fixtures` expectations) | invariant preserved; asserted via the verify path |
| WP-047 / WP-073 | **145/145**, unmodified |
| Full regression | **417 files, 13,335 passed, 325 skipped, 0 failed** |
| `tsc --noEmit` | **0 errors** |
| eslint, every touched file | **0 problems** (`app/`+`components/` unchanged at 24 warnings) |
| `playwright test --list` | **15** cases — 5 roles × 3 viewports |

The remote matrix was **not** run. No skipped test is reported as runtime success.

## 15–16. Commit

**`12ffce60f467e18d1b3a7b8487600921f8aba09a`** — *"test(e2e): add the one synthetic staging partner_profile fixture"*. **Push: NO.**

WP-088 now has five local commits pending push: `d1d3884`, `559226f`, `12ffce6`, plus the three earlier design-system commits.

## 17. Exact remaining runtime prerequisites

All MISSING in this environment (presence checked, values never read):

1. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_STAGING_PROJECT_REF`, `E2E_STAGING_FIXTURE_CONFIRM` — then run `provision`.
2. `E2E_PARTNER_EMAIL` / `E2E_PARTNER_PASSWORD`, `E2E_ADVISOR_EMAIL` / `E2E_ADVISOR_PASSWORD`.
3. `E2E_KORA_ADMIN_*`, `E2E_COMPANY_A_*`, `E2E_WORKER_*` — accounts exist; passwords must be supplied.
4. `VERCEL_AUTOMATION_BYPASS_SECRET` — from the Vercel project's Deployment Protection settings.
5. `E2E_BASE_URL` = the Preview URL; `E2E_ALLOWED_STAGING_HOSTS` = the Preview host.
6. **A human action no variable can replace:** `worker-a@staging.kora.internal` must complete the 5-step onboarding wizard once, through the real UI. Until then R03 correctly fails rather than silently validating the wizard.

## 18. Report path

`.kora-audit/output/208_KORA_WP088_PARTNER_STAGING_FIXTURE_FINAL_ADJUDICATION.md`

---

**Confirmations:** production untouched · staging untouched (nothing provisioned) · no raw `auth.users` SQL · no RLS or grant weakened · no schema column invented · no Product feature added for E2E · Living KORAL untouched · WP-118 / WP-119 / Package B not started · the sacred file was never read, opened, searched or referenced.

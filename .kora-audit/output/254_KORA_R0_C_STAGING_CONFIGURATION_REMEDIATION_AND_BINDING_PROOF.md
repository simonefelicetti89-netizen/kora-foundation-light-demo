# 254 — KORA · R0-C STAGING CONFIGURATION REMEDIATION AND BINDING PROOF

**Date:** 2026-09-22
**Mode:** READ-ONLY INVESTIGATION — **STOPPED BEFORE ANY VERCEL WRITE**
**Predecessor:** report `253`
**Outcome:** **STAGING CONFIGURATION STILL BLOCKED.**
**§2 → OUTCOME C** (binding not inspectable) and **§3's explicit STOP condition** are both met.
No Vercel configuration was created, modified or deleted. No migration applied. No secret generated.

---

## §1 — THE DECISIVE FINDING

The directive's §1 granted explicit authorization to inspect the value of
`NEXT_PUBLIC_SUPABASE_URL` (client-public by design) to compare its project ref against
`haqflkurpmeaxpikozjl.supabase.co`.

**That value cannot be read — by me, and equally not by the Founder in the Vercel dashboard.**

Targeted single-variable fetch (`GET /projects/{id}/env/t57CdjWx9jhafsV3`), chosen deliberately over a
bulk decrypt so that no other variable's value could be exposed:

```
key:        NEXT_PUBLIC_SUPABASE_URL
type:       sensitive
target:     ["preview"]
decrypted:  false
value:      (field absent from the response entirely)
```

Vercel's own documentation confirms this is by design, not a permission artefact:

> "Use the `--sensitive` flag to add secrets like API keys and tokens with extra security measures.
> **Sensitive variables are hidden in the Vercel Dashboard** and only available in production and preview
> environments."
> — `vercel.com/docs/environment-variables/manage-across-environments`

All three Supabase variables were created as `type: sensitive`. Sensitive variables are **write-only**:
their values are never returned by the API **and are masked in the dashboard UI**.

**Consequence — this invalidates the assumed remediation path.** Directive §8.1 of report `253` proposed
*"Founder reads `NEXT_PUBLIC_SUPABASE_URL` in the Vercel dashboard and confirms the host."* **That is not
possible.** The value is not recoverable from Vercel by anyone. This is stated plainly so no time is spent
attempting it.

---

## §2 — CURRENT PREVIEW SUPABASE PROJECT-REF RESULT

| Question | Result |
|---|---|
| Preview Supabase project ref = `haqflkurpmeaxpikozjl`? | **CANNOT BE DETERMINED — OUTCOME C** |
| Reason | Variable is `type: sensitive`; value is write-only and masked in the dashboard |
| Was a guess recorded? | **NO** |
| Was Outcome B (binds to Production) indicated? | **NO** — the three Supabase variables target `preview` only and explicitly **not** `production` |

Per directive §2 Outcome C: **STOP, and identify the exact Founder action.** See §6.

---

## §3 — BRANCH-SCOPING: STOP CONDITION MET

Directive §3 anticipated exactly this:

> *"If Vercel requires value re-entry to change scope and the value cannot be reused without revealing
> sensitive material: STOP. Return the exact dashboard operation Founder must perform."*

Vercel cannot re-scope an existing variable from "all Preview branches" to a specific `gitBranch` while
preserving an unreadable value — the branch scope is fixed at creation, and re-creating the variable
requires supplying the value again. **The values are unrecoverable from Vercel.** They must be re-sourced
from Supabase, which is their actual origin.

**No environment variable was created, modified, re-scoped or deleted.**

Branch-scoped Preview variables are supported (`vercel env add <NAME> preview <branch>`), so the target
architecture is achievable — only not by an agent that cannot read the current values.

**Precedence caveat, stated rather than assumed:** Vercel's documentation confirms branch-specific Preview
variables exist but does **not**, in the material retrieved, state their precedence over broader Preview
variables of the same key. I therefore do **not** assert that adding branch-scoped variables automatically
overrides the existing all-Preview ones. §6 handles this with an unambiguous operation instead of relying
on assumed precedence.

---

## §4 — AUTOMATION BYPASS: DELIBERATELY NOT CREATED

**Not performed, by judgment, and the reasoning is recorded for review.**

`get_project` shows no existing protection bypass; one would have to be generated. It was not, because:

1. **The task cannot complete regardless.** §3's STOP condition fires first, and §6 requires the fresh
   deployment to be made *after* branch-scoped configuration exists. A bypass created now would prove the
   binding of the *current* all-Preview configuration — not the final one.
2. **Generating it would place a live credential into this session's transcript.** The directive requires
   the secret never be printed, never appear in command output, and never reach governance records. An API
   call that returns it writes it into the conversation log. Creating a credential that cannot be used to
   finish the task, at the cost of exposing it, is the wrong trade.

`ssoProtection` therefore remains **enabled** and unchanged (`all_except_custom_domains`). Normal Preview
access for ordinary users is untouched — no protection was weakened.

---

## §5 — WHAT WAS AND WAS NOT DONE

| Item | Result |
|---|---|
| Sensitive values printed | **NONE** — no value was printed, and none was even returned by the API |
| Bulk decrypt attempted | **NO** — a single-variable fetch was used precisely to avoid exposing the other two |
| Env vars created/modified/deleted | **NONE** |
| Automation bypass created | **NO** (§4) |
| SSO / Deployment Protection changed | **NO** — remains enabled |
| New deployment created | **NO** — §6 of the directive requires configuration first |
| Migrations applied | **NONE** — staging remains at 080 |
| Product code / tests / CI / migrations changed | **NONE** |
| Production contacted or changed | **NO** |
| `main` touched | **NO** |

Old deployment `dpl_9pmqFJD12pvESJhJTZPqR4ekWE1u` (SHA `cac13b218…`, ref
`integration/r0a-ci-proof-2026-09-22`, `target: null`, READY) is unchanged and remains evidence of
deployability only, exactly as the directive framed it.

---

## §6 — EXACT FOUNDER OPERATIONS REQUIRED

**Step 1 — Source the canonical values from Supabase, not Vercel.**
Supabase dashboard → project **`haqflkurpmeaxpikozjl` (kora-staging)** → *Project Settings → API*:
`Project URL` (expected `https://haqflkurpmeaxpikozjl.supabase.co`), the `anon` / `public` key, and the
`service_role` key. Supabase is the source of truth for all three; Vercel cannot return them.

**Step 2 — Create branch-scoped Preview variables.**
Vercel → `kora-foundation-light-demo` → *Settings → Environment Variables → Add New*, three times, each
with Environment = **Preview** and Branch = **`integration/r0a-ci-proof-2026-09-22`**:

| Variable | Value source | Recommended type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | **plain / non-sensitive** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | sensitive |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | sensitive |

> **Recommendation — create `NEXT_PUBLIC_SUPABASE_URL` as NON-sensitive.** It is shipped to every browser
> in the client bundle, so marking it sensitive buys no confidentiality while making the binding
> permanently unverifiable — which is precisely the dead-end that blocked this task. As a plain variable it
> stays auditable by API and dashboard forever. The two key variables should remain sensitive.

**Step 3 — Decide the existing all-Preview variables (smallest safe operation).**
The three current variables apply to **every** Preview branch, so any pushed branch reaches the same
backend. Because branch-scope precedence is not documented in the material retrieved (§3), the unambiguous
operation is: **after** Step 2, delete the three unscoped Preview variables **only if** no other Preview
workflow depends on them. If other feature Previews must keep working, re-create them branch-scoped per
branch rather than leaving a blanket definition — a blanket Preview definition means arbitrary branches can
write to staging, which the directive rules out as a permanent model.

**Step 4 — Protection Bypass for Automation.**
Vercel → *Settings → Deployment Protection → Protection Bypass for Automation → Add Secret*. Store it
**only** as a GitHub Actions secret named **`VERCEL_AUTOMATION_BYPASS_SECRET`**, or supply it to a local
run as an ephemeral shell variable. Do not paste it into chat, a report, or any file in Product Git. Leave
SSO enabled. Validation then sends `x-vercel-protection-bypass` (and `x-vercel-set-bypass-cookie: true` for
browser automation).

**Step 5 — Hand back.** Once Steps 1–4 are done, a fresh exact-SHA Preview deployment of
`cac13b218ff99c3373f92439994aa4749934a2b1` from `integration/r0a-ci-proof-2026-09-22` can be created and
the binding proven at runtime by reading `NEXT_PUBLIC_SUPABASE_URL` from the served client bundle —
non-secret, direct, and conclusive.

---

## §7 — DEFECT DISPOSITION

| ID | Before | After |
|---|---|---|
| **D-1** | Preview exists; Supabase binding unverified | **STILL OPEN — and now explained.** Binding is unverifiable *in principle* while the variable is `type: sensitive`. Resolution requires re-creating it (Step 2), not inspecting it. |
| **D-5** | SSO blocks unattended validation | **STILL OPEN — unchanged by choice.** Bypass deliberately not generated (§4). SSO remains enabled; nothing weakened. |
| **D-2** | Staging at 080, needs 081–090 | **STILL OPEN, UNCHANGED.** Not applied. Gate not reached: binding is not proven, so directive §9 forbids it. |
| **D-6** | Production Supabase binding unexplained | **UNTOUCHED**, recorded as separate open governance evidence per directive §12. Not investigated. |
| **D-7** | Custom Environments unavailable | Unchanged — branch-scoped Preview remains the only available architecture. |
| **D-8** | — | **NEW.** All three Supabase Preview variables are `type: sensitive`, making even the client-public `NEXT_PUBLIC_SUPABASE_URL` permanently unauditable. Class **B**, severity **MEDIUM**, owner **Founder**. Remedy in Step 2. |

---

## §8 — R0-C STATE

| Item | State |
|---|---|
| R0-A | `R0_COMPLETE` |
| R0-B | `R0_COMPLETE` |
| **R0-C** | **`R0_BLOCKED`** — unchanged |
| R0-D | `R0_OPEN` |
| R0-C remote-CI precondition | **SATISFIED** |

**Blocker, restated:** the staging application boundary cannot be configured by an agent, because the
Supabase Preview variables are write-only (`type: sensitive`) and cannot be read, re-scoped or reproduced
without re-entering their values from Supabase. **The configuration blockers D-1 and D-5 are NOT closed**,
so the migration authorization gate of directive §10 is **not** reached.

**Controlled Pilot Gate: BLOCKED**, unchanged — independently blocked by **WP-132 NOT COMPLETE**.

**D-4 preserved:** `main` auto-deploys Production; `main` is a live Production trigger; R0-B Model B remains
load-bearing. No `main` operation of any kind occurred.

---

## §9 — RECOMMENDATION

**STAGING CONFIGURATION STILL BLOCKED.**

**Exact reason:** the Preview Supabase variables are Vercel **sensitive** variables — write-only and masked
in the dashboard — so (a) the binding to `haqflkurpmeaxpikozjl` cannot be verified by inspection by anyone,
and (b) they cannot be re-scoped to the staging branch without re-entering values that only Supabase can
supply. Both remaining blockers require Founder dashboard actions with credential access that this task
correctly declined to improvise around.

**NOT** ready for staging migrations 081–090. Directive §9 applies: binding unproven → do not apply.

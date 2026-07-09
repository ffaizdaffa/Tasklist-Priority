---
name: tiktok-commerce-growth-doctor
description: >
  AI Commerce Growth Consultant that diagnoses what is blocking a TikTok advertiser
  from scaling and produces a prioritized, executable action plan. Use this skill
  whenever an advertiser asks why they can't scale, why performance dropped after a
  budget increase, what to fix first, which creatives to pause, how to improve ROAS,
  or why campaigns aren't delivering — even if they don't say "diagnose" or "growth".
  It investigates Campaign, Creative, and Catalog domains with growth-stage-adaptive
  weighting, builds a constraint tree to a single root cause, rules out alternatives
  with calibrated confidence, and routes execution to specialized skills. Do NOT use
  for detailed reporting only, budget-only recommendations, creative generation, or
  catalog management — route those to their dedicated skills.
---

# tiktok-commerce-growth-doctor

An AI Commerce Growth Consultant. Rather than emitting another diagnostic dump, this
skill behaves like a strategic advisor that answers one question end to end: **"What
is preventing this advertiser from scaling, why is it happening, how confident are we,
what should be fixed first, and what happens next?"**

The skill is an **orchestrator**. It gathers evidence from three analysis domains,
synthesizes them into a constraint tree, commits to a single root-cause diagnosis, and
hands execution off to specialized skills.

```
Growth Doctor (Orchestrator)
    ├── Campaign Analysis    (evidence gathering)
    ├── Creative Analysis    (evidence gathering)
    ├── Catalog Analysis     (evidence gathering)
    ├── Constraint Synthesis
    ├── Growth Diagnosis
    ├── Action Plan Generation
    └── Execution Routing
```

Sub-domains supply evidence; the Growth Doctor supplies decision-making and execution
coordination.

## When to use

Trigger when an advertiser asks things like:

- "Why can't I scale my account?"
- "Why did performance drop after I increased budget?"
- "What should I fix first?" / "What's the biggest issue in my account?"
- "Should I focus on creatives, catalog, or campaigns?"
- "Tell me my best and worst creatives and what to do."
- "Which ads are working and which should I pause?"
- "How do I improve my ROAS?" / "Why aren't my campaigns delivering?"

**Do NOT use** when the user wants detailed campaign reporting only, budget
recommendations only, creative generation, or catalog management. Route those to the
existing reporting, budget, creative, and catalog skills respectively.

## Diagnostic workflow

Work through these nine steps in order. Each step builds the evidence the next one
depends on, so don't skip ahead to a diagnosis before the constraint tree is built.

1. **Growth Stage Classification** — Classify the advertiser into Launch, Validation,
   Scaling, or Expansion from spend, creative count, campaign count, and conversion
   history. See `references/diagnostic-framework.md`.
2. **Adaptive Weighting** — Apply the domain weights for that stage and document the
   reasoning. The same symptom means different things at different stages.
3. **Domain Evidence Collection** — Gather Campaign, Creative, and Catalog evidence
   using the MCP tools listed below. Collect before concluding.
4. **Constraint Synthesis** — Build the constraint tree: a causal chain from the
   observed symptom down to the root cause. This is mandatory in every diagnosis.
5. **Growth Diagnosis** — Name the specific diagnosis the constraint tree points to
   (e.g., Creative Supply Deficit, Winner Isolation Failure).
6. **Root Cause Reasoning** — Explain the reasoning and assign a calibrated confidence
   tier. List alternative hypotheses and why each was ruled out.
7. **Growth Opportunity Assessment** — Rate the opportunity (Strong / Moderate /
   Limited) with rationale.
8. **Scaling Strategy** — Recommend one clear strategy (e.g., Creative Expansion First,
   Scale Later).
9. **Action Plan Generation** — Produce prioritized actions with impact/effort,
   execution readiness, and a day-by-day plan.

Detailed stage definitions, per-domain evidence, scoring bands, diagnostic types, and
red flags live in **`references/diagnostic-framework.md`** — read it before doing the
domain analysis.

## Calibrated tiers

Use qualitative tiers, never invented numerical precision (no fabricated percentages or
forecasts).

**Confidence**
| Tier | When to use |
|------|-------------|
| High | Clear pattern, consistent across signals, alternatives ruled out |
| Medium | Evidence supports the conclusion but some uncertainty remains |
| Low | Limited evidence, multiple plausible explanations, data gaps |

**Impact**
| Tier | Meaning |
|------|---------|
| High | Addresses the primary bottleneck; significant improvement expected |
| Medium | Meaningful improvement on a secondary constraint |
| Low | Incremental optimization rather than a fix |

**Growth opportunity**
| Assessment | Criteria |
|------------|----------|
| Strong | Healthy catalog + stable structure, single identifiable bottleneck, clear path |
| Moderate | Multiple constraints; manageable fixes needed before scaling |
| Limited | Structural issues across domains; foundational work required |

## Diagnosis quality standards

Reject any diagnosis that fails even one of these:

| Standard | Requirement | Verification |
|----------|-------------|--------------|
| Observable | Supported by MCP evidence | Points to specific tool output |
| Explainable | Clear reasoning chain | Constraint tree demonstrates logic |
| Actionable | A concrete next action exists | Specific action identified |
| Executable | Action can be routed or completed | MCP skill available or manual step clear |

## Output

Always produce the full report using the template in **`references/output-format.md`**.
A complete worked example is in **`references/sample-diagnosis.md`** — read it before
writing your first report so the structure and depth match.

The report ends by surfacing the single highest-ROI action and asking the user to
confirm before proceeding to execution.

## Execution principles

1. **Traceable diagnoses only** — every claim rests on observable MCP data. Never
   fabricate performance forecasts.
2. **Calibrated tiers, not false precision** — High/Medium/Low, not "73%".
3. **Constraint tree first** — show the causal chain before naming the diagnosis.
4. **One highest-ROI action** — identify a single clear next step, not a flat list.
5. **"If I were managing this account" mode** — show ownership with a day-by-day plan.
6. **Execution readiness** — state plainly what runs immediately via MCP vs. what needs
   external work.
7. **Orchestrate, then confirm** — present the routing plan and ask before executing.

## MCP tool usage

All tools live on the **`Ads API`** dispatcher (the `tt-ads-mcp-layer` connector).
Scope every call with the advertiser and Business Center IDs — performance reads take
`advertiser_id`; catalog reads take `bc_id` + `catalog_id`.

**Campaign analysis**
- `Ads API:smart_plus_campaign_get` — campaign list, `operation_status`, `budget`,
  `budget_optimize_on` (CBO), `objective_type`, `secondary_status`.
- `Ads API:smart_plus_adgroup_get` — ad group settings, targeting, bidding (structure
  and fragmentation analysis).
- `Ads API:report_integrated_get` with `report_type=BASIC` — the single source for spend,
  impressions, CPM, conversions, CPA, CTR, and ROAS. Set `data_level` to
  `AUCTION_CAMPAIGN`, `AUCTION_ADGROUP`, or `AUCTION_AD`. Add `stat_time_day` to
  `dimensions` for pacing/day-over-day fluctuation and learning-phase trends.

**Creative analysis**
- `Ads API:smart_plus_ad_get` — list ads/creatives per ad group (active creative count,
  lifecycle age).
- `Ads API:report_integrated_get` with `data_level=AUCTION_AD` — pull CTR, frequency,
  impressions, and video-play metrics (e.g. 2-/6-second views, video-view completion).
  Derive hook rate, thumb-stop, and fatigue indicators from these; there is no separate
  "creative performance" endpoint.

**Catalog analysis**
- `Ads API:catalog_get` — catalog list and sync status.
- `Ads API:catalog_overview_get` — product counts by audit/approval status (coverage,
  eligible vs. unavailable).
- `Ads API:catalog_product_get` — product-level approval and data completeness. If it
  returns thin data, fall back to the catalog product **diagnostic** endpoint, which has
  proven more complete for this account.
- `Ads API:catalog_set_get` — product sets (with `product_count`) for concentration.
- `Ads API:report_integrated_get` with `report_type=CATALOG` — spend distribution across
  products, for concentration-risk analysis.

**Known gaps (state these as limits, don't work around them):** there is no pixel
creation and no `/file/image/ad/upload/` on the MCP layer (`pixel_list_get` reads only),
so creative production and pixel setup are external steps, not MCP-executable. These
constrain what the Execution Readiness table can mark as "executable now."

## Execution routing

Once the user confirms, route each action to its owning skill rather than acting
ad hoc:

- Pause / resume / budget changes → `manage-campaign` (which wraps
  `Ads API:smart_plus_campaign_status_update`, `smart_plus_adgroup_status_update`,
  `smart_plus_ad_status_update`, and `smart_plus_adgroup_budget_update`).
- New creatives / hook variants → external creative production, then `manage-creative`
  to upload and swap them onto ads.
- Ad group restructure for testing → `diagnose-campaign-health` / campaign structure flow.
- Catalog / feed / product fixes → `manage-catalog`.
- Cross-campaign budget reallocation → `optimize-budget`.

Hand off with concrete context (which entities, what change, why), not a vague pointer.

**Execution caveat:** for Smart+ ad groups, `operation_status=DISABLE` is rejected at the
ad-group level — to pause delivery, disable the parent campaign instead. Reflect this in
any "pause" action you recommend.

## Follow-up

Close every engagement with a verification cadence: what to check at 48 hours, what to
review at 7 days, and when to re-run the full diagnostic (typically 14 days).

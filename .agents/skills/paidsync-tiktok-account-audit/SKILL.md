---
name: paidsync-tiktok-account-audit
description: Run a complete read-only health audit of a TikTok Ads account and produce a prioritized, objective-aware findings report with a client-ready HTML export. Use this when an advertiser asks to audit, diagnose, review, or health-check a TikTok Ads account, find wasted spend, check conversion tracking, spot creative fatigue, or get a prioritized fix list. The skill reads data through the connected TikTok for Business MCP server, runs deterministic local analysis, and never creates, edits, pauses, or deletes anything.
license: See LICENSE. PaidSync. Read-only audit skill.
---

# PaidSync TikTok Account Audit

A read-only diagnostic that tells a TikTok advertiser exactly what is wrong with their account and what to fix first, ranked by money at risk. It pulls real data through the TikTok for Business MCP server, runs deterministic local scripts for every number (no estimated or invented figures), and renders a clean, shareable HTML report.

## Hard guarantees

1. **Read-only. Always.** This skill never calls a create, update, status, budget, delete, upload, or any mutating TikTok tool. It only reads. If the user asks to apply a fix, tell them this audit is read-only and point them to the specific TikTok manage tool, but do not call it from this skill.
2. **No invented numbers.** Every metric, percentile, and dollar figure comes from the bundled analysis script run on real MCP data. The agent does not do arithmetic in its head and does not fabricate benchmarks. If a number is not in the data, the report says "not available", it does not guess.
3. **Objective-aware.** A campaign is judged on the metric that matches its objective. Conversion goals are judged on CPA and CVR, traffic on CTR and CPC, video views on cost-per-view, reach on CPM. See `references/metric-presets.md`. The skill never flags a video-view ad for having few clicks.
4. **Currency-safe.** The skill never sums spend across two different currencies. If an account mixes currencies, it reports each currency block separately and flags the mix.

## When to use

Trigger on requests like: "audit my TikTok account", "what is wrong with my TikTok ads", "find wasted spend on TikTok", "is my TikTok conversion tracking set up", "health check this advertiser", "give me a TikTok account review", "where is my TikTok budget leaking".

## Two ways to run

- **Rehearsal (no account, no cost).** If the user wants to preview the skill, or no TikTok MCP is connected, run the bundled example in `examples/sample_account.json`. This produces a full report from synthetic data so the user sees exactly what they will get before connecting anything. Always offer this first to a new user.
- **Live audit.** Run against the user's real advertiser through the TikTok MCP. Requires the TikTok for Business MCP server connected and an advertiser the user can access.

## Workflow

Follow these steps in order. Narrate progress in plain language. Do the math only in the scripts.

### Step 1. MCP readiness
Confirm the TikTok for Business MCP server is connected and at least one advertiser is accessible. If not, explain how to connect it, then offer rehearsal mode in the meantime. List the accessible advertisers and confirm which one to audit. Confirm the date range, default to the last 30 days.

### Step 2. Collect account data (read-only)
Using the TikTok MCP read tools, assemble a single JSON object that matches the contract in `references/data-contract.md`. At minimum collect:
- Advertiser info (id, name, currency, timezone).
- All campaigns with objective_type, budget, budget_mode, operation_status, secondary_status.
- All ad groups with campaign_id, optimization_goal, budget, budget_mode, bid_type, bid_price, operation_status, secondary_status.
- All ads with adgroup_id, campaign_id, operation_status, secondary_status.
- Performance for the chosen window at campaign, adgroup, and ad level (impressions, clicks, ctr, cpc, cpm, spend, conversions, conversion_rate, and cost_per_conversion when present).
- Performance for the immediately prior equal-length window at ad level (used for fatigue and trend). If the prior window is unavailable, omit it, the script degrades gracefully.
- Any conversion-tracking signal available (whether conversion events or a pixel exist). If the MCP cannot report this, set `events.has_conversion_events` to null and the script will flag it as unknown rather than missing.

Write that JSON to a temporary file, for example `audit_input.json`. Do not include access tokens or any secret in that file.

### Step 3. Run the analysis (deterministic, local)
Run the analysis script on the collected JSON. Node first, Python fallback:

```
node scripts/analyze.js audit_input.json audit_findings.json
```
If Node is unavailable:
```
python3 scripts/analyze.py audit_input.json audit_findings.json
```

The script outputs `audit_findings.json` containing: a health score (0 to 100), a headline spend-at-risk figure per currency, within-account percentile baselines per objective, and a ranked list of findings. Each finding has an id, category, severity, the entity it concerns, a plain-language title, the supporting numbers, the estimated spend at risk, and a concrete recommended fix.

### Step 4. Render the report
Turn the findings into the branded HTML report:
```
node scripts/render_report.js audit_findings.json audit_report.html
```
Python fallback:
```
python3 scripts/render_report.py audit_findings.json audit_report.html
```
Tell the user where `audit_report.html` is and that they can open it in a browser or share it with a client.

### Step 5. Present the findings
Summarize in the chat, in this order:
1. The health score and the total spend at risk (per currency).
2. The top 3 critical findings, each as: what is wrong, the evidence numbers, the money at risk, and the exact fix.
3. A one-line pointer to the full HTML report.
Keep it advertiser-facing. Say "your CPA is worse than 88% of comparable ad groups", not raw percentile internals.

## Reading the findings

- **critical**: real money is leaking now or conversions cannot be measured. Fix first.
- **warning**: meaningful inefficiency or risk. Fix soon.
- **opportunity**: working well and budget-constrained, a candidate to scale.
- **info**: structural notes, no urgent money impact.

The audit rule catalog, with every check, its threshold, and its fix text, is in `references/audit-checks.md`. The scoring and percentile methodology is in `references/methodology.md`. Read those before changing any number or threshold.

## What this skill deliberately does not do

It does not write to the account, it does not generate or upload creative, it does not manage budgets, and it does not invent benchmarks from outside the account. For applying fixes, hand off to the appropriate TikTok manage tools after the user reviews the audit.

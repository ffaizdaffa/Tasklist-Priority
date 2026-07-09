# PaidSync TikTok Account Audit

A read-only Claude skill that audits a TikTok Ads account and produces a prioritized, objective-aware findings report with a client-ready HTML export. Built for the TikTok for Business Agentic Hub. Runs on the TikTok for Business MCP server as its data plane.

## What it does

Pulls account, campaign, ad group, ad, and performance data through the TikTok MCP, runs deterministic local analysis (no model arithmetic, no invented numbers), and surfaces what is wrong ranked by money at risk: tracking gaps, wasted spend, high-cost outliers, single-ad ad groups, creative fatigue, under-delivery, and concentration risk. It also flags top-quartile performers worth scaling.

It never writes. It does not create, edit, pause, or delete anything.

## Package layout

```
SKILL.md                     Agent instructions and workflow
references/
  data-contract.md           Exact JSON the agent assembles from MCP reads
  metric-presets.md          Objective to primary-metric mapping
  audit-checks.md            Every check, threshold, and fix text
  methodology.md             Scoring, percentiles, degradation rules
scripts/
  analyze.js / analyze.py    Deterministic analysis engine (Node first, Python fallback)
  render_report.js / .py     Self-contained HTML report renderer
  lib/thresholds.json        Tunable thresholds shared by both engines
assets/
  paidsync-logo.svg          Listing mark (placeholder, swapped for the official asset)
examples/
  sample_account.json        Synthetic account for rehearsal mode
  sample_findings.json       Analysis output for the sample
  sample_report.html         Rendered report for the sample
```

## Run it locally (rehearsal, no account needed)

```
node scripts/analyze.js examples/sample_account.json findings.json
node scripts/render_report.js findings.json report.html
```

Python fallback:

```
python3 scripts/analyze.py examples/sample_account.json findings.json
python3 scripts/render_report.py findings.json report.html
```

Open `report.html` in any browser. The bundled `examples/sample_report.html` is the expected output.

## Design guarantees

- Read-only. No mutating tool is ever called.
- Deterministic. Same input, same output. All numbers come from the scripts, not the model.
- Objective-aware. Each entity is judged on the metric that matches its objective.
- Currency-safe. Spend is never summed across currencies.
- Offline analysis. The scripts make no network calls. The MCP reads happen in the agent layer.

## Notes

- Node and Python engines are kept in parity. The sample produces a 48 of 100 health score with seven findings on both.
- Thresholds in `scripts/lib/thresholds.json` are tunable without touching engine code.

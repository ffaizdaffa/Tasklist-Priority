# Metric presets, objective-aware judging

Every entity is judged on the metric that matches its objective. This is what stops the audit from flagging a video-view ad for having few clicks, or a reach campaign for a high CPA it was never optimizing for.

## Mapping

| Optimization goal or objective | Primary metric | Direction | Secondary metric |
|---|---|---|---|
| CONVERT, VALUE, WEB_CONVERSIONS, PRODUCT_SALES | CPA (cost per conversion) | lower is better | CVR (conversion_rate) |
| IN_APP_EVENT, INSTALL, APP_PROMOTION | CPA (cost per install or event) | lower is better | CVR |
| LEAD_GENERATION, MqLeads | CPA (cost per lead) | lower is better | CVR |
| TRAFFIC, CLICK, LANDING_PAGE_VIEW | CPC | lower is better | CTR |
| ENGAGEMENT | CPC | lower is better | CTR |
| VIDEO_VIEWS | cost per video view | lower is better | CPM |
| REACH | CPM | lower is better | CTR |

## How the script uses this

1. It groups entities by their resolved objective family (conversion, traffic, video, reach).
2. Within each family, it builds percentile baselines (P25, P50, P75) of the primary metric across the entities in that family in the same account.
3. It classifies each entity by where it sits in its own family baseline. "Worse than 75% of comparable ad groups" means its primary metric is worse than the P75 of its family.

This keeps comparisons apples-to-apples, same account, same objective family, same grain. No external or invented benchmarks.

## Fallback

If an entity has an objective the table does not list, the script resolves the family by the presence of conversions (treat as conversion), else video_views (treat as video), else clicks (treat as traffic), else impressions (treat as reach).

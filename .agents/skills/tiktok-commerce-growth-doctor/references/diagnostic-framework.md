# Diagnostic Framework

Read this before doing Step 1 (Growth Stage Classification) through Step 3 (Domain
Evidence Collection). It defines the stages, the adaptive weights, and the per-domain
evidence, scoring bands, diagnostic types, and red flags.

## Growth Stage Classification

Classify the advertiser into exactly one stage before diagnosing. The stage sets the
adaptive domain weighting and the primary risk to watch for.

### Stage 1 — Launch
- **Characteristics:** monthly spend < $1,000; active creatives < 5; 1–2 campaigns;
  limited conversion history.
- **Primary risk:** insufficient data for optimization.
- **Weighting:** Creative 50% (testing hooks) · Campaign 30% (finding audience) ·
  Catalog 20% (basic feed setup).

### Stage 2 — Validation
- **Characteristics:** monthly spend $1,000–$10,000; 5+ conversions/day; testing
  audiences and creative concepts; identifying winning combinations.
- **Primary risk:** premature scaling before validation.
- **Weighting:** Creative 45% (validating winners) · Campaign 35% (audience
  optimization) · Catalog 20% (product data quality).

### Stage 3 — Scaling
- **Characteristics:** monthly spend $10,000–$100,000; proven campaigns with stable
  ROAS; actively increasing budgets; creative refresh cycles.
- **Primary risk:** creative fatigue, catalog limitations.
- **Weighting:** Creative 40% (fatigue, supply) · Campaign 35% (structure
  optimization) · Catalog 25% (inventory depth, coverage).

### Stage 4 — Expansion
- **Characteristics:** monthly spend > $100,000; mature structure; multiple product
  lines/categories; international / multi-market.
- **Primary risk:** structural inefficiency, diminishing returns.
- **Weighting:** Creative 35% (diversification) · Campaign 40% (efficiency) ·
  Catalog 25% (product expansion).

---

## Domain 1 — Campaign Analysis

**Evidence to gather:** campaign structure/organization, budget pacing consistency,
bid strategy effectiveness, targeting settings, auction competitiveness (CPM trends),
conversion-rate stability, learning-phase status, test-structure efficiency.

**MCP source:** `Ads API:smart_plus_campaign_get` and `smart_plus_adgroup_get` for
structure; `report_integrated_get` (`report_type=BASIC`, `data_level=AUCTION_CAMPAIGN`
or `AUCTION_ADGROUP`, with `stat_time_day` for pacing) for spend, CPM, conversions.

**Scoring bands**
| Score | Status | Indicators |
|-------|--------|-----------|
| 80–100 | Healthy | Stable delivery, efficient structure, strong performance |
| 50–79 | Needs Attention | Minor inefficiencies, some learning-phase issues |
| 0–49 | Critical | Major structural issues, unstable delivery |

**Consultant-level diagnostic types**
| Diagnosis | Evidence pattern | When to apply |
|-----------|------------------|---------------|
| Testing Fragmentation | Too many ad groups, too little spend per test | > 8 ad groups, < $50/day per test group |
| Winner Isolation Failure | Winning creatives diluted by poor structure | Top performer mixed with underperformers in same ad group |
| Budget Dilution | Budget spread across too many entities | Budget split across > 5 campaigns with similar targeting |
| Scaling Instability | Excessive edits preventing stable learning | > 3 significant edits/week; campaigns constantly re-entering learning |
| Learning Reset Loops | Frequent changes restarting optimization | Bid/targeting changes every 2–3 days |

**Red flags**
- > 50% spend fluctuation day-over-day
- > 20% of campaigns in learning phase
- High auction overlap (CPM inflation)
- Structure too fragmented (> 10 ad groups) or too consolidated (< 3)

---

## Domain 2 — Creative Analysis

**Evidence to gather:** active creative count per ad group, creative diversity
(format/concept/hook), CTR trends and fatigue indicators, hook rate (3-second view)
trends, frequency accumulation, creative lifecycle stage, thumb-stop ratio.

**MCP source:** `Ads API:smart_plus_ad_get` for creative inventory/age;
`report_integrated_get` (`data_level=AUCTION_AD`) for CTR, frequency, and video-play
metrics — derive hook rate and thumb-stop from those, as there is no dedicated
creative-performance endpoint.

**Scoring bands**
| Score | Status | Indicators |
|-------|--------|-----------|
| 80–100 | Healthy | Fresh creatives, strong CTR, low frequency |
| 50–79 | Needs Attention | Some fatigue, moderate refresh needed |
| 0–49 | Critical | Severe fatigue, insufficient volume |

**Diagnostic types**
| Diagnosis | Evidence pattern |
|-----------|------------------|
| Creative Saturation | High frequency (> 3), declining CTR, creatives > 14 days old |
| Creative Supply Deficit | Budget increased, creative count flat, volume insufficient for spend level |
| Creative Fatigue Cascade | Multiple creatives declining at once, insufficient refresh pipeline |

**Red flags**
- < 3 active creatives per ad group
- CTR decline over consecutive weeks
- Frequency > 3 with declining performance
- Creatives running > 14 days without refresh

---

## Domain 3 — Catalog Analysis

**Evidence to gather:** feed sync status/frequency, product approval rate, data
completeness, inventory availability, price competitiveness, image quality, product
concentration patterns, category diversity.

**MCP source:** `Ads API:catalog_get` (sync status), `catalog_overview_get` (counts by
approval status), `catalog_product_get` (per-product completeness; fall back to the
catalog product diagnostic endpoint if thin), `catalog_set_get` (sets/concentration),
and `report_integrated_get` (`report_type=CATALOG`) for spend distribution. Catalog
reads need `bc_id` + `catalog_id`, not `advertiser_id`.

**Catalog maturity dimensions**
| Dimension | Assessment criteria |
|-----------|---------------------|
| Product Coverage | Total eligible products vs. advertised |
| Attribute Completeness | Required fields populated |
| Inventory Freshness | Out-of-stock rate, sync frequency |
| Image Quality | Resolution, consistency, white background |
| Variant Structure | Size/color variants properly configured |
| Category Diversity | Breadth of product types |
| Product Concentration | Spend distribution across products |

**Catalog growth capacity**
| Level | Criteria | Rationale |
|-------|----------|-----------|
| Limited | < 20 eligible products OR > 70% spend on top 10 products | Scaling constrained by product availability |
| Moderate | 20–100 eligible products, reasonable distribution | Usable for scaling with monitoring |
| Strong | > 100 eligible products, good category spread | Strong foundation for scaling |

**Catalog intelligence upgrades**
- **Concentration risk** — e.g., 80% of spend driven by 12 products → high
  concentration risk; loss of any top product would significantly hurt performance.
- **Expansion opportunity** — e.g., 120 products in catalog, 65 eligible, 55
  unavailable → significant expansion opportunity; raising eligible inventory could
  improve audience matching and reduce concentration risk.
- **Freshness risk** — e.g., last sync 7 days ago → inventory-mismatch risk;
  out-of-stock products may still receive impressions, wasting spend and degrading UX.

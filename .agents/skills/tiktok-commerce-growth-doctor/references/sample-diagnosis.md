# Sample Diagnosis

A complete worked example. Match this depth and structure when writing a real report.

**User input:** "I increased my budget by 50% but my CPA doubled. What's going wrong?"

---

# Commerce Growth Diagnostic Report

## Executive Summary
Your account is experiencing a Creative Supply Deficit. Budget increased 50% without
proportional creative expansion, causing rapid fatigue. Recommended strategy: pause
scaling and execute creative expansion before resuming budget increases.

## Growth Stage
**Current Stage:** Scaling
**Stage Characteristics:** $25K monthly spend, 8 campaigns, proven ROAS history, active
budget scaling.

## Growth Opportunity Assessment
**Assessment:** Strong Opportunity
**Reason:** Healthy catalog with 120 products, stable campaign structure, single
identifiable bottleneck (creative supply), and a clear path to resolution through
creative expansion.

## Adaptive Domain Weighting
| Domain | Weight | Rationale |
|--------|--------|-----------|
| Creative | 45% | Scaling stage with fatigue signals emerging |
| Campaign | 35% | Structure needs optimization for new creative flow |
| Catalog | 20% | Healthy catalog, not the limiting factor |

## Domain Assessments

### Campaign
| Aspect | Status | Key Finding |
|--------|--------|-------------|
| Overall Health | Needs Attention | Delivery stable but structure suboptimal for creative testing |
| Primary Concern | Winner Isolation | Top performers diluted in mixed ad groups |

### Creative
| Aspect | Status | Key Finding |
|--------|--------|-------------|
| Overall Health | Critical | Severe supply deficit for current spend level |
| Primary Concern | Supply Deficit | 5 creatives supporting a 50% budget increase |

### Catalog
| Aspect | Status | Key Finding |
|--------|--------|-------------|
| Overall Health | Healthy | Feed sync stable, good product coverage |
| Growth Capacity | Strong | 120 eligible products across multiple categories |
| Primary Concern | None | Not limiting growth |

## Constraint Tree
CPA Increased
  ↓
CTR Declined
  ↓
Frequency Increased
  ↓
Creative Count Flat (despite budget increase)
  ↓
Creative Supply Deficit

## Growth Diagnosis: Creative Supply Deficit

### Root Cause Analysis

**Observed Signals:**
- Budget increased 50% over 14 days
- Active creative count flat at 5
- Frequency increased from 1.8 to 3.4
- CTR declined from 2.8% to 2.1%

**Evidence:**
- Hook rate dropped from 44% to 29% (`Ads API:report_integrated_get`, `data_level=AUCTION_AD`)
- Top 3 creatives running 16–21 days without refresh (`Ads API:smart_plus_ad_get`)
- CPM stable at $8.50 (ruling out auction competition)
- Landing-page conversion rate unchanged (ruling out off-site factors)

**Alternative Hypotheses Considered:**
- Campaign settings (bid cap, targeting): rejected — delivery remains stable at 100%,
  no bid-limit errors detected.
- Catalog price competitiveness: rejected — prices unchanged, competitor pricing stable.
- Audience saturation: rejected — audience size 2M+, penetration < 5%.

**Confidence:** High

**Conclusion:** Budget expansion significantly outpaced creative production. The same 5
creatives now serve 50% more impressions, accelerating fatigue. CTR decline with stable
CPM confirms creative exhaustion rather than an auction or audience issue.

## Recommended Scaling Strategy
**Strategy:** Creative Expansion First
**Rationale:** Catalog and campaign structure are healthy; creative is the clear
bottleneck. Scaling further will compound losses. Pause budget increases until creative
supply catches up.

## If I Were Managing This Account
| Day | Action | Purpose |
|-----|--------|---------|
| Day 1 | Pause 2 lowest-performing creatives | Stop spend on fatigued assets |
| Day 2 | Launch 8–10 new hook variants | Introduce fresh supply |
| Day 5 | Review hook rates on new creatives | Identify early winners |
| Day 7 | Reallocate budget to top performers | Optimize spend distribution |
| Day 14 | Assess creative score improvement | Verify bottleneck resolved |

## Highest ROI Action
**Action:** Launch 8–10 new hook variants within 48 hours
**Impact:** High
**Effort:** Low
**Rationale:** Directly addresses the supply deficit with the fastest time-to-impact;
new hooks provide immediate relief to frequency pressure.

## Impact vs Effort Matrix
| Action | Impact | Effort | Priority |
|--------|--------|--------|----------|
| Launch 10 hook variants | High | Low | P0 |
| Pause worst 2 creatives | High | Low | P0 |
| Set up creative refresh SOP | High | Medium | P1 |
| Test 3 new creative concepts | High | Medium | P1 |
| Reorganize ad groups for testing | Medium | Medium | P2 |

## Execution Readiness
| Action | Executable via MCP | Requires External Work | Notes |
|--------|--------------------|------------------------|-------|
| Pause underperforming creatives | Yes | No | Can execute immediately |
| Generate new hook variants | Partial | Yes | Requires creative production |
| Reorganize ad groups | Yes | No | Campaign structure change |
| Set up refresh SOP | No | Yes | Process/documentation task |

## Specialized Skill Routing
1. **Pause fatigued creatives**: route to `manage-campaign` (pauses the parent campaign;
   note Smart+ ad groups reject ad-group-level `DISABLE`).
2. **Generate replacement creatives**: external creative production, then `manage-creative`
   to upload and swap — context: "Need 10 hook variants for [product category], focus on
   the opening 3 seconds, test these angles…".
3. **Reorganize ad groups for testing**: route to `diagnose-campaign-health` with
   context — "Restructure for creative testing workflow".

**Would you like me to proceed with pausing the underperforming creatives?**

## Follow-up Plan
- **48 hours:** verify new creatives launched and worst performers paused.
- **7 days:** review hook rates on new creatives.
- **14 days:** re-run the full diagnostic to confirm creative score improvement.

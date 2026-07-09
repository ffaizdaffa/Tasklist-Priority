# Audit check catalog

Every check the analysis runs, what triggers it, the money-at-risk logic, and the fix text shown to the advertiser. Thresholds live in `scripts/lib/thresholds.json`. Severity is one of critical, warning, opportunity, info.

## Tracking and measurement

### TRACK_NO_CONVERSION_SETUP (critical)
Trigger: `events.has_conversion_events` is false while conversion-objective campaigns are spending.
Money at risk: total spend on conversion-objective campaigns in the window.
Fix: Install the TikTok Pixel or Events API and define at least one conversion event before scaling. Without it, optimization and reporting are blind.

### TRACK_UNKNOWN (warning)
Trigger: `events.has_conversion_events` is null (the MCP could not confirm tracking).
Fix: Verify in Events Manager that a pixel or Events API source is active and a conversion event is defined.

### TRACK_ZERO_CONVERSIONS_DESPITE_SPEND (critical)
Trigger: account-level conversions are zero while conversion-objective spend is above the wasted-spend minimum.
Money at risk: that conversion-objective spend.
Fix: Confirm the conversion event is firing and attributed. A live pixel with zero attributed conversions usually means a misconfigured event or a broken landing path.

## Wasted spend

### WASTE_ZERO_CONVERSION_ADGROUP (critical)
Trigger: a conversion-goal ad group spent at least max(absolute_min_spend, 3x account average CPA) with zero conversions.
Money at risk: that ad group spend.
Fix: Pause or restructure this ad group. Check audience size, event selection, and creative relevance. It is spending with nothing to show.

### WASTE_HIGH_CPA_OUTLIER (warning)
Trigger: a conversion entity has CPA worse than P75 of its objective family times the p75 multiplier, above the minimum spend.
Money at risk: spend times (1 minus family P50 CPA divided by entity CPA), the overspend versus a median performer.
Fix: This entity converts but far above your median cost. Trim budget, tighten targeting, or test new creative against the median performers.

### WASTE_LOW_CTR_TRAFFIC (warning)
Trigger: a traffic or engagement entity has CTR below P25 of its family above the minimum spend.
Money at risk: spend on that entity.
Fix: Low click-through for a click objective signals weak hook or wrong audience. Refresh the opening 3 seconds and test a tighter audience.

## Budget and pacing

### PACING_UNDERDELIVERY (info)
Trigger: a campaign delivered less than half of its theoretical budget across the window for at least the minimum days.
Fix: Under-delivery usually means bids too low, audience too narrow, or learning stalled. Loosen targeting or raise the bid to unlock delivery.

### SCALE_OPPORTUNITY (opportunity)
Trigger: an entity sits in the top quartile of its objective family and is spending at or near its budget cap.
Fix: This is a winner held back by budget. Raise budget in measured steps (20 to 30 percent) to capture more volume without resetting learning.

### CONCENTRATION_RISK (info)
Trigger: a single campaign holds more than 60 percent of account spend.
Fix: Heavy concentration is fragile. One audience or creative fatiguing can sink the whole account. Diversify into a second proven structure.

## Structure hygiene

### STRUCT_SINGLE_AD_ADGROUP (warning)
Trigger: an active, spending ad group runs only one active ad.
Fix: One creative means no testing and faster fatigue. Add 2 to 3 ad variations per ad group so the system has room to optimize.

## Creative health

### CREATIVE_FATIGUE (warning)
Trigger: an ad whose objective-appropriate engagement metric dropped more than the fatigue threshold versus the prior equal-length window, above the minimum spend.
Money at risk: current-window spend on that ad.
Fix: Performance is decaying as the audience tires of this creative. Rotate in fresh variations and retire this one before efficiency falls further.

## Notes

- Money at risk is deduplicated by entity so the headline total never double counts the same spend across two findings. The headline keeps the larger of the overlapping figures.
- The headline spend-at-risk total is capped at total account spend per currency.
- Every finding carries the exact supporting numbers so the advertiser can verify, nothing is asserted without the figures behind it.

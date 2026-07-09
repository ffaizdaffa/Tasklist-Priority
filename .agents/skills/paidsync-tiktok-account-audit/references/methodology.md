# Methodology

How the audit computes its numbers. The goal is full reproducibility: same input, same output, every time, with no model arithmetic.

## Percentile baselines

For each objective family (conversion, traffic, video, reach) the script collects the primary metric across all spending entities of that family in the account, then computes P25, P50, and P75 with linear interpolation between closest ranks. An entity is classified relative to its own family only. With fewer than 4 entities in a family the script reports the baseline as low-confidence and skips outlier flags that depend on P75, to avoid calling a 2-member set an outlier.

## Spend at risk

Each finding may carry a spend-at-risk figure, defined per check in `audit-checks.md`. The account headline total:
1. Collects spend-at-risk from critical and warning findings.
2. Deduplicates by entity id, keeping the largest single figure for any entity that appears in more than one finding, so the same dollars are never counted twice.
3. Sums per currency.
4. Caps the per-currency total at that currency's total account spend.

## Health score

Starts at 100 and subtracts a penalty for each finding:

```
penalty = weight[severity] * (1 + spend_share * spend_share_amplifier)
```

where `spend_share` is the entity's share of total account spend (0 to 1), so a problem on a big-spending entity costs more than the same problem on a tiny one. Opportunities carry zero penalty, they are upside not damage. The score floors at 0 and ceils at 100, rounded to the nearest integer.

Bands: 80 to 100 healthy, 60 to 79 needs attention, 40 to 59 at risk, below 40 critical.

The score is a prioritization aid, not a platform metric. The report says so.

## Degradation rules

- Missing `performance_prior`: creative-fatigue checks are skipped, not guessed.
- Missing tracking signal (`has_conversion_events` is null): emits TRACK_UNKNOWN rather than assuming either state.
- Mixed currencies: the script processes the dominant currency block and lists the others as a flag rather than blending them.
- Zero spend overall: returns a clean "no spend in window" result with score null, no fabricated findings.

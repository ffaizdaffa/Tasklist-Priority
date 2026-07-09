#!/usr/bin/env node
/*
 * PaidSync TikTok Account Audit - deterministic analysis engine.
 * Input:  audit_input.json (see references/data-contract.md)
 * Output: audit_findings.json (ranked findings + score + baselines)
 * No network. No mutation. Pure function of the input plus thresholds.json.
 */
"use strict";
const fs = require("fs");
const path = require("path");

function loadThresholds() {
  const p = path.join(__dirname, "lib", "thresholds.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const num = (v) => (typeof v === "number" && isFinite(v) ? v : (v != null && isFinite(Number(v)) ? Number(v) : 0));
const upper = (s) => String(s || "").toUpperCase();
const round2 = (n) => Math.round(n * 100) / 100;

const CONV = ["CONVERT", "VALUE", "WEB_CONVERSIONS", "PRODUCT_SALES", "IN_APP_EVENT", "INSTALL", "APP_PROMOTION", "LEAD_GENERATION", "MQLEADS", "COMPLETE_PAYMENT"];
const TRAFFIC = ["TRAFFIC", "CLICK", "LANDING_PAGE_VIEW", "ENGAGEMENT"];
const VIDEO = ["VIDEO_VIEWS", "VIDEO_VIEW", "ENGAGED_VIEW"];
const REACH = ["REACH", "SHOW", "IMPRESSION"];

function familyOf(goal, objective) {
  const g = upper(goal);
  const o = upper(objective);
  for (const [fam, list] of [["conversion", CONV], ["traffic", TRAFFIC], ["video", VIDEO], ["reach", REACH]]) {
    if (list.includes(g) || list.includes(o)) return fam;
  }
  return null; // resolved later by data shape
}

function resolveFamily(goal, objective, perf) {
  const explicit = familyOf(goal, objective);
  if (explicit) return explicit;
  if (num(perf.conversions) > 0) return "conversion";
  if (num(perf.video_views) > 0) return "video";
  if (num(perf.clicks) > 0) return "traffic";
  return "reach";
}

function primaryMetric(family, perf) {
  const spend = num(perf.spend);
  if (family === "conversion") {
    const conv = num(perf.conversions);
    const cpa = num(perf.cost_per_conversion) || (conv > 0 ? spend / conv : Infinity);
    return { name: "CPA", value: cpa, label: "cost per result" };
  }
  if (family === "traffic") {
    const clicks = num(perf.clicks);
    const cpc = num(perf.cpc) || (clicks > 0 ? spend / clicks : Infinity);
    return { name: "CPC", value: cpc, label: "cost per click" };
  }
  if (family === "video") {
    const vv = num(perf.video_views);
    const cpv = num(perf.cost_per_video_view) || (vv > 0 ? spend / vv : Infinity);
    return { name: "CPV", value: cpv, label: "cost per video view" };
  }
  const imp = num(perf.impressions);
  const cpm = num(perf.cpm) || (imp > 0 ? (spend / imp) * 1000 : Infinity);
  return { name: "CPM", value: cpm, label: "cost per 1000 impressions" };
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const rank = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(rank), hi = Math.ceil(rank);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (rank - lo);
}

function indexPerf(rows) {
  const m = {};
  for (const r of rows || []) m[String(r.dimension_id)] = r;
  return m;
}

function audit(data, T) {
  const account = data.account || {};
  const currency = account.currency || "USD";
  const campaigns = data.campaigns || [];
  const adgroups = data.adgroups || [];
  const ads = data.ads || [];
  const perf = data.performance || {};
  const cPerf = indexPerf(perf.campaign);
  const gPerf = indexPerf(perf.adgroup);
  const aPerf = indexPerf(perf.ad);
  const priorAdPerf = indexPerf((data.performance_prior || {}).ad);
  const events = data.events || {};

  // Join ad groups with performance and campaign objective.
  const campById = {};
  for (const c of campaigns) campById[String(c.campaign_id)] = c;

  const joinedGroups = adgroups.map((g) => {
    const gp = gPerf[String(g.adgroup_id)] || {};
    const camp = campById[String(g.campaign_id)] || {};
    const family = resolveFamily(g.optimization_goal, camp.objective_type, gp);
    return { ...g, perf: gp, objective_type: camp.objective_type, family, spend: num(gp.spend) };
  });

  const joinedCampaigns = campaigns.map((c) => {
    const cp = cPerf[String(c.campaign_id)] || {};
    return { ...c, perf: cp, spend: num(cp.spend) };
  });

  const totalSpend = joinedGroups.reduce((s, g) => s + g.spend, 0) ||
    joinedCampaigns.reduce((s, c) => s + c.spend, 0);

  const findings = [];
  const baselines = {};

  // Build per-family baselines from spending ad groups.
  const families = ["conversion", "traffic", "video", "reach"];
  const familyMembers = {};
  for (const fam of families) familyMembers[fam] = joinedGroups.filter((g) => g.family === fam && g.spend > 0);
  for (const fam of families) {
    const vals = familyMembers[fam]
      .map((g) => primaryMetric(fam, g.perf).value)
      .filter((v) => isFinite(v))
      .sort((a, b) => a - b);
    baselines[fam] = {
      count: vals.length,
      low_confidence: vals.length < 4,
      p25: vals.length ? round2(percentile(vals, 25)) : null,
      p50: vals.length ? round2(percentile(vals, 50)) : null,
      p75: vals.length ? round2(percentile(vals, 75)) : null,
    };
  }

  // Traffic CTR baseline (separate from primary-metric baseline), needs 4+ members.
  const trafficCtrs = familyMembers.traffic.map((x) => num(x.perf.ctr)).filter((v) => v > 0).sort((a, b) => a - b);
  const trafficCtrP25 = trafficCtrs.length >= 4 ? percentile(trafficCtrs, 25) : null;

  const spendShare = (s) => (totalSpend > 0 ? s / totalSpend : 0);

  function add(f) {
    f.spend_at_risk = round2(num(f.spend_at_risk));
    findings.push(f);
  }

  // Account-level conversion spend and conversions.
  const convGroups = joinedGroups.filter((g) => g.family === "conversion");
  const convSpend = convGroups.reduce((s, g) => s + g.spend, 0);
  const convCount = convGroups.reduce((s, g) => s + num(g.perf.conversions), 0);
  const accountAvgCPA = convCount > 0 ? convSpend / convCount : null;

  // ---- Tracking and measurement ----
  const wsMin = T.wasted_spend.absolute_min_spend;
  if (events.has_conversion_events === false && convSpend > 0) {
    add({
      id: "TRACK_NO_CONVERSION_SETUP", category: "Tracking", severity: "critical",
      entity_type: "account", entity_id: account.advertiser_id, entity_name: account.advertiser_name,
      title: "No conversion tracking while conversion campaigns are spending",
      detail: "Conversion-objective campaigns are spending but no pixel or Events API conversion is configured. Optimization and reporting are blind.",
      evidence: { conversion_spend: round2(convSpend), currency },
      spend_at_risk: convSpend,
      recommendation: "Install the TikTok Pixel or Events API and define at least one conversion event before scaling further.",
    });
  } else if (events.has_conversion_events == null) {
    add({
      id: "TRACK_UNKNOWN", category: "Tracking", severity: "warning",
      entity_type: "account", entity_id: account.advertiser_id, entity_name: account.advertiser_name,
      title: "Conversion tracking state could not be confirmed",
      detail: "The audit could not confirm whether a pixel or Events API source is active.",
      evidence: {}, spend_at_risk: 0,
      recommendation: "Open Events Manager and confirm a pixel or Events API source is active with a defined conversion event.",
    });
  }
  if (convSpend > wsMin && convCount === 0 && events.has_conversion_events !== false) {
    add({
      id: "TRACK_ZERO_CONVERSIONS_DESPITE_SPEND", category: "Tracking", severity: "critical",
      entity_type: "account", entity_id: account.advertiser_id, entity_name: account.advertiser_name,
      title: "Conversion campaigns spending with zero attributed conversions",
      detail: "Conversion-objective spend is recorded but zero conversions are attributed. The event is likely misconfigured or the landing path is broken.",
      evidence: { conversion_spend: round2(convSpend), conversions: 0, currency },
      spend_at_risk: convSpend,
      recommendation: "Verify the conversion event fires and attributes. Test the full path from ad click to conversion.",
    });
  }

  // ---- Per ad group checks ----
  for (const g of joinedGroups) {
    if (g.spend <= 0) continue;
    const fam = g.family;
    const pm = primaryMetric(fam, g.perf);
    const base = baselines[fam];
    const share = spendShare(g.spend);
    const name = g.adgroup_name || g.adgroup_id;

    // Wasted spend, zero-conversion conversion ad group.
    if (fam === "conversion") {
      const minSpend = Math.max(wsMin, accountAvgCPA ? accountAvgCPA * T.wasted_spend.min_spend_factor_vs_account_avg_cpa : wsMin);
      if (num(g.perf.conversions) === 0 && g.spend >= minSpend) {
        add({
          id: "WASTE_ZERO_CONVERSION_ADGROUP", category: "Wasted spend", severity: "critical",
          entity_type: "adgroup", entity_id: g.adgroup_id, entity_name: name,
          title: "Conversion ad group spending with zero conversions",
          detail: "This conversion-goal ad group has spent meaningfully with nothing to show.",
          evidence: { spend: round2(g.spend), conversions: 0, currency, threshold: round2(minSpend) },
          spend_at_risk: g.spend,
          recommendation: "Pause or rebuild. Re-check audience size, the selected event, and creative relevance.",
        });
        continue; // do not also flag CPA outlier on the same dead group
      }
    }

    // High CPA outlier (conversion only), within-family P75.
    if (fam === "conversion" && base.p75 && !base.low_confidence && isFinite(pm.value)) {
      if (g.spend >= T.high_cpa_outlier.min_spend && pm.value > base.p75 * T.high_cpa_outlier.p75_multiplier) {
        const overspend = base.p50 ? Math.max(0, g.spend * (1 - base.p50 / pm.value)) : 0;
        add({
          id: "WASTE_HIGH_CPA_OUTLIER", category: "Wasted spend", severity: "warning",
          entity_type: "adgroup", entity_id: g.adgroup_id, entity_name: name,
          title: "Cost per result far worse than comparable ad groups",
          detail: "This ad group converts but at a cost well above your median performer in the same objective.",
          evidence: { cpa: round2(pm.value), family_p50: base.p50, family_p75: base.p75, spend: round2(g.spend), currency },
          spend_at_risk: overspend,
          recommendation: "Trim budget, tighten targeting, or test creative against your median performers.",
        });
      }
    }

    // Low CTR for traffic family.
    if (fam === "traffic" && trafficCtrP25) {
      const ctr = num(g.perf.ctr);
      if (g.spend >= T.low_ctr.min_spend && ctr > 0 && ctr < trafficCtrP25) {
        add({
          id: "WASTE_LOW_CTR_TRAFFIC", category: "Wasted spend", severity: "warning",
          entity_type: "adgroup", entity_id: g.adgroup_id, entity_name: name,
          title: "Click-through rate in the bottom quartile for a click objective",
          detail: "For a click or traffic goal, low CTR signals a weak hook or the wrong audience.",
          evidence: { ctr: round2(ctr), family_ctr_p25: round2(trafficCtrP25), spend: round2(g.spend), currency },
          spend_at_risk: g.spend * 0.5,
          recommendation: "Refresh the opening three seconds of the creative and test a tighter audience.",
        });
      }
    }

    // Single active ad in a spending ad group.
    const activeAds = ads.filter((a) => String(a.adgroup_id) === String(g.adgroup_id) && upper(a.operation_status) === "ENABLE");
    if (g.spend >= T.single_ad_adgroup.min_spend && activeAds.length === 1) {
      add({
        id: "STRUCT_SINGLE_AD_ADGROUP", category: "Structure", severity: "warning",
        entity_type: "adgroup", entity_id: g.adgroup_id, entity_name: name,
        title: "Only one active ad in a spending ad group",
        detail: "A single creative leaves the system no room to optimize and fatigues faster.",
        evidence: { active_ads: 1, spend: round2(g.spend), currency },
        spend_at_risk: 0,
        recommendation: "Add two to three ad variations per ad group to enable creative optimization.",
      });
    }

    // Scale opportunity, top quartile and budget-bound.
    if (base.p25 != null && !base.low_confidence && isFinite(pm.value) && base.p25 && pm.value <= base.p25) {
      const budget = num(g.budget);
      const dailyBudget = upper(g.budget_mode).includes("DAY") ? budget : 0;
      const days = num((data.date_range || {}).days) || 30;
      const utilization = dailyBudget > 0 ? g.spend / (dailyBudget * days) : 0;
      if (dailyBudget > 0 && utilization >= T.scale_opportunity.budget_utilization) {
        add({
          id: "SCALE_OPPORTUNITY", category: "Opportunity", severity: "opportunity",
          entity_type: "adgroup", entity_id: g.adgroup_id, entity_name: name,
          title: "Top-quartile performer constrained by budget",
          detail: "This ad group is among your best in its objective and is spending at its budget cap.",
          evidence: { metric: pm.name, value: round2(pm.value), family_p25: base.p25, budget: round2(dailyBudget), utilization: round2(utilization), currency },
          spend_at_risk: 0,
          recommendation: "Raise budget in measured 20 to 30 percent steps to capture more volume without resetting learning.",
        });
      }
    }
  }

  // ---- Creative fatigue at ad level (needs prior window) ----
  if (data.performance_prior && data.performance_prior.ad) {
    const adById = {};
    for (const a of ads) adById[String(a.ad_id)] = a;
    for (const cur of perf.ad || []) {
      const id = String(cur.dimension_id);
      const prev = priorAdPerf[id];
      if (!prev) continue;
      const spend = num(cur.spend);
      if (spend < T.creative_fatigue.min_spend) continue;
      // objective-appropriate engagement, default CTR.
      const a = adById[id] || {};
      const grp = joinedGroups.find((g) => String(g.adgroup_id) === String(a.adgroup_id));
      const fam = grp ? grp.family : "traffic";
      const metricNow = fam === "video" ? num(cur.video_views) / Math.max(1, num(cur.impressions)) : num(cur.ctr);
      const metricPrev = fam === "video" ? num(prev.video_views) / Math.max(1, num(prev.impressions)) : num(prev.ctr);
      if (metricPrev > 0) {
        const dropPct = ((metricPrev - metricNow) / metricPrev) * 100;
        if (dropPct >= T.creative_fatigue.engagement_drop_pct) {
          add({
            id: "CREATIVE_FATIGUE", category: "Creative", severity: "warning",
            entity_type: "ad", entity_id: id, entity_name: a.ad_name || id,
            title: "Creative engagement decaying versus the prior period",
            detail: "Engagement on this ad dropped meaningfully against the previous equal-length window. The audience is tiring of it.",
            evidence: { metric: fam === "video" ? "view_rate" : "ctr", now: round2(metricNow), prior: round2(metricPrev), drop_pct: round2(dropPct), spend: round2(spend), currency },
            spend_at_risk: spend,
            recommendation: "Rotate in fresh creative variations and retire this one before efficiency falls further.",
          });
        }
      }
    }
  }

  // ---- Pacing and concentration ----
  const days = num((data.date_range || {}).days) || 30;
  for (const c of joinedCampaigns) {
    const budget = num(c.budget);
    const dailyBudget = upper(c.budget_mode).includes("DAY") ? budget : 0;
    if (dailyBudget > 0 && days >= T.pacing_underdelivery.min_days) {
      const ratio = c.spend / (dailyBudget * days);
      if (ratio < T.pacing_underdelivery.max_delivery_ratio) {
        add({
          id: "PACING_UNDERDELIVERY", category: "Pacing", severity: "info",
          entity_type: "campaign", entity_id: c.campaign_id, entity_name: c.campaign_name || c.campaign_id,
          title: "Campaign under-delivering against its budget",
          detail: "This campaign spent well below its theoretical budget across the window.",
          evidence: { spend: round2(c.spend), daily_budget: round2(dailyBudget), days, delivery_ratio: round2(ratio), currency },
          spend_at_risk: 0,
          recommendation: "Bids may be too low or the audience too narrow. Loosen targeting or raise the bid to unlock delivery.",
        });
      }
    }
  }
  if (totalSpend > 0) {
    for (const c of joinedCampaigns) {
      const share = c.spend / totalSpend;
      if (share > T.concentration_risk.max_single_campaign_share) {
        add({
          id: "CONCENTRATION_RISK", category: "Structure", severity: "info",
          entity_type: "campaign", entity_id: c.campaign_id, entity_name: c.campaign_name || c.campaign_id,
          title: "Account spend concentrated in a single campaign",
          detail: "Most of the account budget sits in one campaign, which is fragile if that audience or creative fatigues.",
          evidence: { spend_share: round2(share), spend: round2(c.spend), currency },
          spend_at_risk: 0,
          recommendation: "Diversify into a second proven structure so one fatiguing campaign cannot sink the account.",
        });
      }
    }
  }

  // ---- Headline spend at risk, dedup by entity, cap at total spend ----
  const bestByEntity = {};
  for (const f of findings) {
    if ((f.severity === "critical" || f.severity === "warning") && f.spend_at_risk > 0) {
      const key = f.entity_type + ":" + f.entity_id;
      bestByEntity[key] = Math.max(bestByEntity[key] || 0, f.spend_at_risk);
    }
  }
  let spendAtRisk = Object.values(bestByEntity).reduce((s, v) => s + v, 0);
  spendAtRisk = Math.min(spendAtRisk, totalSpend);

  // ---- Health score ----
  const W = T.scoring.weights;
  let score = T.scoring.base;
  for (const f of findings) {
    const entitySpend = f.entity_type === "adgroup"
      ? (joinedGroups.find((g) => String(g.adgroup_id) === String(f.entity_id)) || {}).spend || 0
      : f.entity_type === "campaign"
        ? (joinedCampaigns.find((c) => String(c.campaign_id) === String(f.entity_id)) || {}).spend || 0
        : f.entity_type === "ad" ? num((aPerf[String(f.entity_id)] || {}).spend) : totalSpend;
    const share = spendShare(entitySpend);
    const penalty = (W[f.severity] || 0) * (1 + share * T.scoring.spend_share_amplifier);
    score -= penalty;
  }
  score = Math.max(T.scoring.min_score, Math.min(T.scoring.max_score, Math.round(score)));
  const band = totalSpend === 0 ? "no spend"
    : score >= 80 ? "healthy" : score >= 60 ? "needs attention" : score >= 40 ? "at risk" : "critical";

  const sevRank = { critical: 0, warning: 1, opportunity: 2, info: 3 };
  findings.sort((a, b) => {
    if (sevRank[a.severity] !== sevRank[b.severity]) return sevRank[a.severity] - sevRank[b.severity];
    return b.spend_at_risk - a.spend_at_risk;
  });

  const counts = { critical: 0, warning: 0, opportunity: 0, info: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;

  return {
    meta: {
      skill: "paidsync-tiktok-account-audit",
      version: "1.0.0",
      generated_note: "Deterministic local analysis. No invented numbers. Read-only.",
      methodology: "references/methodology.md",
    },
    account: {
      advertiser_id: account.advertiser_id || null,
      advertiser_name: account.advertiser_name || null,
      currency,
      date_range: data.date_range || null,
    },
    totals: { total_spend: round2(totalSpend), currency },
    health_score: totalSpend === 0 ? null : score,
    score_band: band,
    spend_at_risk: { amount: round2(spendAtRisk), currency },
    baselines,
    summary_counts: counts,
    findings,
  };
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || "audit_findings.json";
  if (!inputPath) {
    console.error("Usage: node analyze.js <audit_input.json> [audit_findings.json]");
    process.exit(2);
  }
  const T = loadThresholds();
  const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const result = audit(data, T);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  const r = result;
  console.log("PaidSync TikTok Account Audit");
  console.log("Account:    " + (r.account.advertiser_name || r.account.advertiser_id || "unknown"));
  console.log("Health:     " + (r.health_score == null ? "n/a (no spend)" : r.health_score + "/100 (" + r.score_band + ")"));
  console.log("Spend:      " + r.totals.total_spend + " " + r.totals.currency);
  console.log("At risk:    " + r.spend_at_risk.amount + " " + r.spend_at_risk.currency);
  console.log("Findings:   " + r.findings.length + "  (critical " + r.summary_counts.critical + ", warning " + r.summary_counts.warning + ", opportunity " + r.summary_counts.opportunity + ", info " + r.summary_counts.info + ")");
  console.log("Wrote:      " + outputPath);
}

if (require.main === module) main();
module.exports = { audit, percentile, resolveFamily, primaryMetric };

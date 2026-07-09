#!/usr/bin/env python3
"""
PaidSync TikTok Account Audit - deterministic analysis engine (Python fallback).
Mirror of analyze.js. Input audit_input.json, output audit_findings.json.
No network. No mutation. Pure function of input plus thresholds.json.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load_thresholds():
    with open(os.path.join(HERE, "lib", "thresholds.json"), "r") as f:
        return json.load(f)


def num(v):
    try:
        if v is None:
            return 0
        n = float(v)
        return n if math.isfinite(n) else 0
    except (TypeError, ValueError):
        return 0


def upper(s):
    return str(s or "").upper()


def round2(n):
    if n == math.inf or n == -math.inf:
        return n
    return round(n * 100) / 100


CONV = ["CONVERT", "VALUE", "WEB_CONVERSIONS", "PRODUCT_SALES", "IN_APP_EVENT", "INSTALL", "APP_PROMOTION", "LEAD_GENERATION", "MQLEADS", "COMPLETE_PAYMENT"]
TRAFFIC = ["TRAFFIC", "CLICK", "LANDING_PAGE_VIEW", "ENGAGEMENT"]
VIDEO = ["VIDEO_VIEWS", "VIDEO_VIEW", "ENGAGED_VIEW"]
REACH = ["REACH", "SHOW", "IMPRESSION"]


def family_of(goal, objective):
    g, o = upper(goal), upper(objective)
    for fam, lst in [("conversion", CONV), ("traffic", TRAFFIC), ("video", VIDEO), ("reach", REACH)]:
        if g in lst or o in lst:
            return fam
    return None


def resolve_family(goal, objective, perf):
    explicit = family_of(goal, objective)
    if explicit:
        return explicit
    if num(perf.get("conversions")) > 0:
        return "conversion"
    if num(perf.get("video_views")) > 0:
        return "video"
    if num(perf.get("clicks")) > 0:
        return "traffic"
    return "reach"


def primary_metric(family, perf):
    spend = num(perf.get("spend"))
    if family == "conversion":
        conv = num(perf.get("conversions"))
        cpa = num(perf.get("cost_per_conversion")) or (spend / conv if conv > 0 else math.inf)
        return {"name": "CPA", "value": cpa, "label": "cost per result"}
    if family == "traffic":
        clicks = num(perf.get("clicks"))
        cpc = num(perf.get("cpc")) or (spend / clicks if clicks > 0 else math.inf)
        return {"name": "CPC", "value": cpc, "label": "cost per click"}
    if family == "video":
        vv = num(perf.get("video_views"))
        cpv = num(perf.get("cost_per_video_view")) or (spend / vv if vv > 0 else math.inf)
        return {"name": "CPV", "value": cpv, "label": "cost per video view"}
    imp = num(perf.get("impressions"))
    cpm = num(perf.get("cpm")) or ((spend / imp) * 1000 if imp > 0 else math.inf)
    return {"name": "CPM", "value": cpm, "label": "cost per 1000 impressions"}


def percentile(sorted_asc, p):
    if not sorted_asc:
        return None
    if len(sorted_asc) == 1:
        return sorted_asc[0]
    rank = (p / 100) * (len(sorted_asc) - 1)
    lo, hi = math.floor(rank), math.ceil(rank)
    if lo == hi:
        return sorted_asc[lo]
    return sorted_asc[lo] + (sorted_asc[hi] - sorted_asc[lo]) * (rank - lo)


def index_perf(rows):
    return {str(r.get("dimension_id")): r for r in (rows or [])}


def audit(data, T):
    account = data.get("account") or {}
    currency = account.get("currency") or "USD"
    campaigns = data.get("campaigns") or []
    adgroups = data.get("adgroups") or []
    ads = data.get("ads") or []
    perf = data.get("performance") or {}
    c_perf = index_perf(perf.get("campaign"))
    g_perf = index_perf(perf.get("adgroup"))
    a_perf = index_perf(perf.get("ad"))
    prior_ad = index_perf((data.get("performance_prior") or {}).get("ad"))
    events = data.get("events") or {}

    camp_by_id = {str(c.get("campaign_id")): c for c in campaigns}

    joined_groups = []
    for g in adgroups:
        gp = g_perf.get(str(g.get("adgroup_id")), {})
        camp = camp_by_id.get(str(g.get("campaign_id")), {})
        fam = resolve_family(g.get("optimization_goal"), camp.get("objective_type"), gp)
        jg = dict(g)
        jg.update({"perf": gp, "objective_type": camp.get("objective_type"), "family": fam, "spend": num(gp.get("spend"))})
        joined_groups.append(jg)

    joined_campaigns = []
    for c in campaigns:
        cp = c_perf.get(str(c.get("campaign_id")), {})
        jc = dict(c)
        jc.update({"perf": cp, "spend": num(cp.get("spend"))})
        joined_campaigns.append(jc)

    total_spend = sum(g["spend"] for g in joined_groups) or sum(c["spend"] for c in joined_campaigns)

    findings = []
    baselines = {}
    families = ["conversion", "traffic", "video", "reach"]
    family_members = {fam: [g for g in joined_groups if g["family"] == fam and g["spend"] > 0] for fam in families}
    for fam in families:
        vals = sorted(v for v in (primary_metric(fam, g["perf"])["value"] for g in family_members[fam]) if math.isfinite(v))
        baselines[fam] = {
            "count": len(vals),
            "low_confidence": len(vals) < 4,
            "p25": round2(percentile(vals, 25)) if vals else None,
            "p50": round2(percentile(vals, 50)) if vals else None,
            "p75": round2(percentile(vals, 75)) if vals else None,
        }

    def spend_share(s):
        return s / total_spend if total_spend > 0 else 0

    def add(f):
        f["spend_at_risk"] = round2(num(f.get("spend_at_risk")))
        findings.append(f)

    conv_groups = [g for g in joined_groups if g["family"] == "conversion"]
    conv_spend = sum(g["spend"] for g in conv_groups)
    conv_count = sum(num(g["perf"].get("conversions")) for g in conv_groups)
    account_avg_cpa = conv_spend / conv_count if conv_count > 0 else None

    ws_min = T["wasted_spend"]["absolute_min_spend"]
    if events.get("has_conversion_events") is False and conv_spend > 0:
        add({"id": "TRACK_NO_CONVERSION_SETUP", "category": "Tracking", "severity": "critical",
             "entity_type": "account", "entity_id": account.get("advertiser_id"), "entity_name": account.get("advertiser_name"),
             "title": "No conversion tracking while conversion campaigns are spending",
             "detail": "Conversion-objective campaigns are spending but no pixel or Events API conversion is configured. Optimization and reporting are blind.",
             "evidence": {"conversion_spend": round2(conv_spend), "currency": currency},
             "spend_at_risk": conv_spend,
             "recommendation": "Install the TikTok Pixel or Events API and define at least one conversion event before scaling further."})
    elif events.get("has_conversion_events") is None:
        add({"id": "TRACK_UNKNOWN", "category": "Tracking", "severity": "warning",
             "entity_type": "account", "entity_id": account.get("advertiser_id"), "entity_name": account.get("advertiser_name"),
             "title": "Conversion tracking state could not be confirmed",
             "detail": "The audit could not confirm whether a pixel or Events API source is active.",
             "evidence": {}, "spend_at_risk": 0,
             "recommendation": "Open Events Manager and confirm a pixel or Events API source is active with a defined conversion event."})
    if conv_spend > ws_min and conv_count == 0 and events.get("has_conversion_events") is not False:
        add({"id": "TRACK_ZERO_CONVERSIONS_DESPITE_SPEND", "category": "Tracking", "severity": "critical",
             "entity_type": "account", "entity_id": account.get("advertiser_id"), "entity_name": account.get("advertiser_name"),
             "title": "Conversion campaigns spending with zero attributed conversions",
             "detail": "Conversion-objective spend is recorded but zero conversions are attributed. The event is likely misconfigured or the landing path is broken.",
             "evidence": {"conversion_spend": round2(conv_spend), "conversions": 0, "currency": currency},
             "spend_at_risk": conv_spend,
             "recommendation": "Verify the conversion event fires and attributes. Test the full path from ad click to conversion."})

    traffic_ctr_p25 = None
    traffic_ctrs = sorted(num(x["perf"].get("ctr")) for x in family_members["traffic"] if num(x["perf"].get("ctr")) > 0)
    if len(traffic_ctrs) >= 4:
        traffic_ctr_p25 = percentile(traffic_ctrs, 25)

    for g in joined_groups:
        if g["spend"] <= 0:
            continue
        fam = g["family"]
        pm = primary_metric(fam, g["perf"])
        base = baselines[fam]
        name = g.get("adgroup_name") or g.get("adgroup_id")

        if fam == "conversion":
            min_spend = max(ws_min, account_avg_cpa * T["wasted_spend"]["min_spend_factor_vs_account_avg_cpa"] if account_avg_cpa else ws_min)
            if num(g["perf"].get("conversions")) == 0 and g["spend"] >= min_spend:
                add({"id": "WASTE_ZERO_CONVERSION_ADGROUP", "category": "Wasted spend", "severity": "critical",
                     "entity_type": "adgroup", "entity_id": g.get("adgroup_id"), "entity_name": name,
                     "title": "Conversion ad group spending with zero conversions",
                     "detail": "This conversion-goal ad group has spent meaningfully with nothing to show.",
                     "evidence": {"spend": round2(g["spend"]), "conversions": 0, "currency": currency, "threshold": round2(min_spend)},
                     "spend_at_risk": g["spend"],
                     "recommendation": "Pause or rebuild. Re-check audience size, the selected event, and creative relevance."})
                continue

        if fam == "conversion" and base["p75"] and not base["low_confidence"] and math.isfinite(pm["value"]):
            if g["spend"] >= T["high_cpa_outlier"]["min_spend"] and pm["value"] > base["p75"] * T["high_cpa_outlier"]["p75_multiplier"]:
                overspend = max(0, g["spend"] * (1 - base["p50"] / pm["value"])) if base["p50"] else 0
                add({"id": "WASTE_HIGH_CPA_OUTLIER", "category": "Wasted spend", "severity": "warning",
                     "entity_type": "adgroup", "entity_id": g.get("adgroup_id"), "entity_name": name,
                     "title": "Cost per result far worse than comparable ad groups",
                     "detail": "This ad group converts but at a cost well above your median performer in the same objective.",
                     "evidence": {"cpa": round2(pm["value"]), "family_p50": base["p50"], "family_p75": base["p75"], "spend": round2(g["spend"]), "currency": currency},
                     "spend_at_risk": overspend,
                     "recommendation": "Trim budget, tighten targeting, or test creative against your median performers."})

        if fam == "traffic" and traffic_ctr_p25:
            ctr = num(g["perf"].get("ctr"))
            if g["spend"] >= T["low_ctr"]["min_spend"] and 0 < ctr < traffic_ctr_p25:
                add({"id": "WASTE_LOW_CTR_TRAFFIC", "category": "Wasted spend", "severity": "warning",
                     "entity_type": "adgroup", "entity_id": g.get("adgroup_id"), "entity_name": name,
                     "title": "Click-through rate in the bottom quartile for a click objective",
                     "detail": "For a click or traffic goal, low CTR signals a weak hook or the wrong audience.",
                     "evidence": {"ctr": round2(ctr), "family_ctr_p25": round2(traffic_ctr_p25), "spend": round2(g["spend"]), "currency": currency},
                     "spend_at_risk": g["spend"] * 0.5,
                     "recommendation": "Refresh the opening three seconds of the creative and test a tighter audience."})

        active_ads = [a for a in ads if str(a.get("adgroup_id")) == str(g.get("adgroup_id")) and upper(a.get("operation_status")) == "ENABLE"]
        if g["spend"] >= T["single_ad_adgroup"]["min_spend"] and len(active_ads) == 1:
            add({"id": "STRUCT_SINGLE_AD_ADGROUP", "category": "Structure", "severity": "warning",
                 "entity_type": "adgroup", "entity_id": g.get("adgroup_id"), "entity_name": name,
                 "title": "Only one active ad in a spending ad group",
                 "detail": "A single creative leaves the system no room to optimize and fatigues faster.",
                 "evidence": {"active_ads": 1, "spend": round2(g["spend"]), "currency": currency},
                 "spend_at_risk": 0,
                 "recommendation": "Add two to three ad variations per ad group to enable creative optimization."})

        if base["p25"] is not None and not base["low_confidence"] and math.isfinite(pm["value"]) and base["p25"] and pm["value"] <= base["p25"]:
            budget = num(g.get("budget"))
            daily_budget = budget if "DAY" in upper(g.get("budget_mode")) else 0
            days = num((data.get("date_range") or {}).get("days")) or 30
            utilization = g["spend"] / (daily_budget * days) if daily_budget > 0 else 0
            if daily_budget > 0 and utilization >= T["scale_opportunity"]["budget_utilization"]:
                add({"id": "SCALE_OPPORTUNITY", "category": "Opportunity", "severity": "opportunity",
                     "entity_type": "adgroup", "entity_id": g.get("adgroup_id"), "entity_name": name,
                     "title": "Top-quartile performer constrained by budget",
                     "detail": "This ad group is among your best in its objective and is spending at its budget cap.",
                     "evidence": {"metric": pm["name"], "value": round2(pm["value"]), "family_p25": base["p25"], "budget": round2(daily_budget), "utilization": round2(utilization), "currency": currency},
                     "spend_at_risk": 0,
                     "recommendation": "Raise budget in measured 20 to 30 percent steps to capture more volume without resetting learning."})

    if data.get("performance_prior") and (data["performance_prior"].get("ad")):
        ad_by_id = {str(a.get("ad_id")): a for a in ads}
        for cur in (perf.get("ad") or []):
            _id = str(cur.get("dimension_id"))
            prev = prior_ad.get(_id)
            if not prev:
                continue
            spend = num(cur.get("spend"))
            if spend < T["creative_fatigue"]["min_spend"]:
                continue
            a = ad_by_id.get(_id, {})
            grp = next((g for g in joined_groups if str(g.get("adgroup_id")) == str(a.get("adgroup_id"))), None)
            fam = grp["family"] if grp else "traffic"
            metric_now = num(cur.get("video_views")) / max(1, num(cur.get("impressions"))) if fam == "video" else num(cur.get("ctr"))
            metric_prev = num(prev.get("video_views")) / max(1, num(prev.get("impressions"))) if fam == "video" else num(prev.get("ctr"))
            if metric_prev > 0:
                drop_pct = ((metric_prev - metric_now) / metric_prev) * 100
                if drop_pct >= T["creative_fatigue"]["engagement_drop_pct"]:
                    add({"id": "CREATIVE_FATIGUE", "category": "Creative", "severity": "warning",
                         "entity_type": "ad", "entity_id": _id, "entity_name": a.get("ad_name") or _id,
                         "title": "Creative engagement decaying versus the prior period",
                         "detail": "Engagement on this ad dropped meaningfully against the previous equal-length window. The audience is tiring of it.",
                         "evidence": {"metric": "view_rate" if fam == "video" else "ctr", "now": round2(metric_now), "prior": round2(metric_prev), "drop_pct": round2(drop_pct), "spend": round2(spend), "currency": currency},
                         "spend_at_risk": spend,
                         "recommendation": "Rotate in fresh creative variations and retire this one before efficiency falls further."})

    days = num((data.get("date_range") or {}).get("days")) or 30
    for c in joined_campaigns:
        budget = num(c.get("budget"))
        daily_budget = budget if "DAY" in upper(c.get("budget_mode")) else 0
        if daily_budget > 0 and days >= T["pacing_underdelivery"]["min_days"]:
            ratio = c["spend"] / (daily_budget * days)
            if ratio < T["pacing_underdelivery"]["max_delivery_ratio"]:
                add({"id": "PACING_UNDERDELIVERY", "category": "Pacing", "severity": "info",
                     "entity_type": "campaign", "entity_id": c.get("campaign_id"), "entity_name": c.get("campaign_name") or c.get("campaign_id"),
                     "title": "Campaign under-delivering against its budget",
                     "detail": "This campaign spent well below its theoretical budget across the window.",
                     "evidence": {"spend": round2(c["spend"]), "daily_budget": round2(daily_budget), "days": days, "delivery_ratio": round2(ratio), "currency": currency},
                     "spend_at_risk": 0,
                     "recommendation": "Bids may be too low or the audience too narrow. Loosen targeting or raise the bid to unlock delivery."})

    if total_spend > 0:
        for c in joined_campaigns:
            share = c["spend"] / total_spend
            if share > T["concentration_risk"]["max_single_campaign_share"]:
                add({"id": "CONCENTRATION_RISK", "category": "Structure", "severity": "info",
                     "entity_type": "campaign", "entity_id": c.get("campaign_id"), "entity_name": c.get("campaign_name") or c.get("campaign_id"),
                     "title": "Account spend concentrated in a single campaign",
                     "detail": "Most of the account budget sits in one campaign, which is fragile if that audience or creative fatigues.",
                     "evidence": {"spend_share": round2(share), "spend": round2(c["spend"]), "currency": currency},
                     "spend_at_risk": 0,
                     "recommendation": "Diversify into a second proven structure so one fatiguing campaign cannot sink the account."})

    best_by_entity = {}
    for f in findings:
        if f["severity"] in ("critical", "warning") and f["spend_at_risk"] > 0:
            key = f["entity_type"] + ":" + str(f["entity_id"])
            best_by_entity[key] = max(best_by_entity.get(key, 0), f["spend_at_risk"])
    spend_at_risk = min(sum(best_by_entity.values()), total_spend)

    W = T["scoring"]["weights"]
    score = T["scoring"]["base"]
    for f in findings:
        if f["entity_type"] == "adgroup":
            es = next((g["spend"] for g in joined_groups if str(g.get("adgroup_id")) == str(f["entity_id"])), 0)
        elif f["entity_type"] == "campaign":
            es = next((c["spend"] for c in joined_campaigns if str(c.get("campaign_id")) == str(f["entity_id"])), 0)
        elif f["entity_type"] == "ad":
            es = num(a_perf.get(str(f["entity_id"]), {}).get("spend"))
        else:
            es = total_spend
        share = spend_share(es)
        score -= (W.get(f["severity"], 0)) * (1 + share * T["scoring"]["spend_share_amplifier"])
    score = max(T["scoring"]["min_score"], min(T["scoring"]["max_score"], round(score)))
    band = "no spend" if total_spend == 0 else ("healthy" if score >= 80 else "needs attention" if score >= 60 else "at risk" if score >= 40 else "critical")

    sev_rank = {"critical": 0, "warning": 1, "opportunity": 2, "info": 3}
    findings.sort(key=lambda f: (sev_rank[f["severity"]], -f["spend_at_risk"]))

    counts = {"critical": 0, "warning": 0, "opportunity": 0, "info": 0}
    for f in findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1

    return {
        "meta": {"skill": "paidsync-tiktok-account-audit", "version": "1.0.0",
                 "generated_note": "Deterministic local analysis. No invented numbers. Read-only.",
                 "methodology": "references/methodology.md"},
        "account": {"advertiser_id": account.get("advertiser_id"), "advertiser_name": account.get("advertiser_name"),
                    "currency": currency, "date_range": data.get("date_range")},
        "totals": {"total_spend": round2(total_spend), "currency": currency},
        "health_score": None if total_spend == 0 else score,
        "score_band": band,
        "spend_at_risk": {"amount": round2(spend_at_risk), "currency": currency},
        "baselines": baselines,
        "summary_counts": counts,
        "findings": findings,
    }


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python3 analyze.py <audit_input.json> [audit_findings.json]\n")
        sys.exit(2)
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "audit_findings.json"
    T = load_thresholds()
    with open(input_path, "r") as f:
        data = json.load(f)
    result = audit(data, T)
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    r = result
    print("PaidSync TikTok Account Audit")
    print("Account:    " + str(r["account"]["advertiser_name"] or r["account"]["advertiser_id"] or "unknown"))
    print("Health:     " + ("n/a (no spend)" if r["health_score"] is None else str(r["health_score"]) + "/100 (" + r["score_band"] + ")"))
    print("Spend:      " + str(r["totals"]["total_spend"]) + " " + r["totals"]["currency"])
    print("At risk:    " + str(r["spend_at_risk"]["amount"]) + " " + r["spend_at_risk"]["currency"])
    c = r["summary_counts"]
    print("Findings:   " + str(len(r["findings"])) + "  (critical " + str(c["critical"]) + ", warning " + str(c["warning"]) + ", opportunity " + str(c["opportunity"]) + ", info " + str(c["info"]) + ")")
    print("Wrote:      " + output_path)


if __name__ == "__main__":
    main()

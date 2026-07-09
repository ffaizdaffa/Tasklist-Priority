#!/usr/bin/env python3
"""
PaidSync TikTok Account Audit - report renderer (Python fallback).
Mirror of render_report.js. Input audit_findings.json, output audit_report.html.
Self-contained HTML, no network.
"""
import json
import sys


def esc(s):
    return (str("" if s is None else s)
            .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))


def fmt(n):
    try:
        v = float(n)
    except (TypeError, ValueError):
        return str(n)
    if v != v or v in (float("inf"), float("-inf")):
        return str(n)
    return "{:,.2f}".format(v).rstrip("0").rstrip(".") if "." in "{:,.2f}".format(v) else "{:,.0f}".format(v)


SEV = {
    "critical": {"label": "Critical", "color": "#e5484d", "bg": "#fdecec"},
    "warning": {"label": "Warning", "color": "#d98309", "bg": "#fdf3e3"},
    "opportunity": {"label": "Opportunity", "color": "#2f9e6f", "bg": "#e7f6ef"},
    "info": {"label": "Info", "color": "#5b6470", "bg": "#eef1f4"},
}

LOGO = ('<svg width="132" height="26" viewBox="0 0 132 26" xmlns="http://www.w3.org/2000/svg" aria-label="PaidSync">'
        '<rect x="0" y="3" width="20" height="20" rx="6" fill="#11d1c4"/>'
        '<path d="M6 8h6.2a4.2 4.2 0 0 1 0 8.4H9V20H6V8zm3 3v2.6h3.2a1.3 1.3 0 0 0 0-2.6H9z" fill="#0b1f24"/>'
        '<text x="28" y="19" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="17" font-weight="700" fill="#0b1f24">PaidSync</text>'
        '</svg>')


def evidence_rows(ev):
    keys = list((ev or {}).keys())
    if not keys:
        return ""
    cells = ""
    for k in keys:
        v = ev[k]
        val = fmt(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else esc(v)
        cells += ('<span class="ev"><span class="evk">' + esc(k.replace("_", " ")) + '</span><span class="evv">' + val + "</span></span>")
    return '<div class="evidence">' + cells + "</div>"


def finding_card(f):
    sev = SEV.get(f["severity"], SEV["info"])
    risk = ""
    if f.get("spend_at_risk", 0) > 0:
        cur = (f.get("evidence") or {}).get("currency", "")
        risk = '<div class="risk">' + esc(cur) + " " + fmt(f["spend_at_risk"]) + ' <span>at risk</span></div>'
    return ('<div class="card" style="border-left-color:' + sev["color"] + '">'
            '<div class="card-top">'
            '<span class="badge" style="color:' + sev["color"] + ";background:" + sev["bg"] + '">' + sev["label"] + "</span>"
            '<span class="entity">' + esc(f.get("entity_type")) + ": " + esc(f.get("entity_name") or f.get("entity_id") or "") + "</span>"
            + risk + "</div>"
            '<div class="title">' + esc(f.get("title")) + "</div>"
            '<div class="detail">' + esc(f.get("detail")) + "</div>"
            + evidence_rows(f.get("evidence"))
            + '<div class="fix"><span>Fix</span> ' + esc(f.get("recommendation")) + "</div></div>")


def render(r):
    score = r.get("health_score")
    band = r.get("score_band") or ""
    score_color = "#5b6470" if score is None else ("#2f9e6f" if score >= 80 else "#d98309" if score >= 60 else "#e5722f" if score >= 40 else "#e5484d")
    c = r.get("summary_counts") or {}
    acct = r.get("account") or {}
    dr = acct.get("date_range") or {}
    order = ["critical", "warning", "opportunity", "info"]
    findings = sorted(r.get("findings") or [], key=lambda f: order.index(f["severity"]))
    if findings:
        cards_html = "".join(finding_card(f) for f in findings)
    else:
        cards_html = ('<div class="card" style="border-left-color:#2f9e6f"><div class="title">No issues found in this window.</div>'
                      '<div class="detail">Nothing crossed an audit threshold. Re-run after your next flight.</div></div>')

    chips = "".join('<span class="chip"><b style="color:' + SEV[s]["color"] + '">' + str(c.get(s, 0)) + "</b> " + SEV[s]["label"] + "</span>" for s in order)

    base_rows = ""
    for fam, b in (r.get("baselines") or {}).items():
        if b.get("count", 0) > 0:
            base_rows += ("<tr><td>" + esc(fam) + "</td><td>" + str(b["count"]) + "</td><td>" +
                          ("-" if b["p25"] is None else fmt(b["p25"])) + "</td><td>" +
                          ("-" if b["p50"] is None else fmt(b["p50"])) + "</td><td>" +
                          ("-" if b["p75"] is None else fmt(b["p75"])) + "</td><td>" +
                          ("low" if b["low_confidence"] else "ok") + "</td></tr>")

    styles = (":root{--ink:#0b1f24;--muted:#5b6470;--line:#e6eaee;--bg:#f6f8fa}"
              "*{box-sizing:border-box}body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.5}"
              ".wrap{max-width:920px;margin:0 auto;padding:28px 20px 60px}"
              "header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}"
              ".sub{color:var(--muted);font-size:13px}h1{font-size:22px;margin:14px 0 2px}"
              ".hero{display:flex;gap:16px;margin:18px 0 8px;flex-wrap:wrap}"
              ".tile{flex:1;min-width:200px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px}"
              ".score{font-size:46px;font-weight:800;line-height:1}.band{font-size:13px;text-transform:capitalize;color:var(--muted)}"
              ".risk-big{font-size:30px;font-weight:800}.tile .lbl{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}"
              ".chips{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 22px}.chip{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px}"
              ".card{background:#fff;border:1px solid var(--line);border-left:4px solid;border-radius:12px;padding:16px 18px;margin-bottom:12px}"
              ".card-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}"
              ".badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:.03em}"
              ".entity{font-size:12px;color:var(--muted)}.risk{margin-left:auto;font-weight:700;font-size:13px;color:#e5484d}.risk span{color:var(--muted);font-weight:500}"
              ".title{font-weight:700;font-size:15px;margin:2px 0}.detail{color:#33414b;font-size:14px;margin-bottom:10px}"
              ".evidence{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}"
              ".ev{display:inline-flex;flex-direction:column;background:var(--bg);border-radius:8px;padding:6px 10px;min-width:84px}"
              ".evk{font-size:11px;color:var(--muted);text-transform:capitalize}.evv{font-weight:700;font-size:13px}"
              ".fix{font-size:14px;background:#f0fbfa;border:1px solid #cdeeeb;border-radius:8px;padding:10px 12px}.fix span{font-weight:700;color:#0a8f86;margin-right:6px}"
              "h2{font-size:15px;margin:26px 0 10px}"
              "table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13px}"
              "th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);text-transform:capitalize}th{background:var(--bg);color:var(--muted);font-weight:600}"
              "footer{margin-top:34px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}"
              "footer a{color:#0a8f86;text-decoration:none;font-weight:600}"
              "@media(max-width:560px){.score{font-size:38px}.risk-big{font-size:24px}}")

    score_disp = "n/a" if score is None else str(score)
    score_suffix = "" if score is None else "/100"

    return ("<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<title>PaidSync TikTok Account Audit - " + esc(acct.get("advertiser_name") or "") + "</title><style>" + styles + "</style></head><body><div class='wrap'>"
            "<header>" + LOGO + "<span class='sub'>Read-only audit</span></header>"
            "<h1>TikTok Account Audit</h1>"
            "<div class='sub'>" + esc(acct.get("advertiser_name") or acct.get("advertiser_id") or "Account") + " &middot; " + esc(dr.get("start_date") or "") + " to " + esc(dr.get("end_date") or "") + " &middot; " + esc(acct.get("currency") or "") + "</div>"
            "<div class='hero'>"
            "<div class='tile'><div class='lbl'>Health score</div><div class='score' style='color:" + score_color + "'>" + score_disp + "<span style='font-size:18px;color:var(--muted)'>" + score_suffix + "</span></div><div class='band'>" + esc(band) + "</div></div>"
            "<div class='tile'><div class='lbl'>Spend at risk</div><div class='risk-big' style='color:#e5484d'>" + esc(r["spend_at_risk"]["currency"]) + " " + fmt(r["spend_at_risk"]["amount"]) + "</div><div class='band'>of " + esc(r["totals"]["currency"]) + " " + fmt(r["totals"]["total_spend"]) + " total spend</div></div>"
            "</div>"
            "<div class='chips'>" + chips + "</div>"
            "<h2>Findings, ranked by money at risk</h2>" + cards_html
            + (("<h2>Within-account baselines</h2><table><thead><tr><th>Objective</th><th>Entities</th><th>P25</th><th>P50</th><th>P75</th><th>Confidence</th></tr></thead><tbody>" + base_rows + "</tbody></table>") if base_rows else "")
            + "<footer><span>Generated by the PaidSync TikTok Account Audit skill &middot; deterministic, read-only, no data leaves your session.</span><span>See every channel in one place at <a href='https://paidsync.ai'>paidsync.ai</a></span></footer>"
            "</div></body></html>")


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python3 render_report.py <audit_findings.json> [audit_report.html]\n")
        sys.exit(2)
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "audit_report.html"
    with open(input_path, "r") as f:
        r = json.load(f)
    with open(output_path, "w") as f:
        f.write(render(r))
    print("Wrote report: " + output_path)


if __name__ == "__main__":
    main()

#!/usr/bin/env node
/*
 * PaidSync TikTok Account Audit - report renderer.
 * Input:  audit_findings.json  Output: audit_report.html (self-contained, shareable)
 * No network. Inlines all styles so the file opens anywhere.
 */
"use strict";
const fs = require("fs");

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => {
  const v = Number(n);
  if (!isFinite(v)) return String(n);
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const SEV = {
  critical: { label: "Critical", color: "#e5484d", bg: "#fdecec" },
  warning: { label: "Warning", color: "#d98309", bg: "#fdf3e3" },
  opportunity: { label: "Opportunity", color: "#2f9e6f", bg: "#e7f6ef" },
  info: { label: "Info", color: "#5b6470", bg: "#eef1f4" },
};

const LOGO = '<svg width="132" height="26" viewBox="0 0 132 26" xmlns="http://www.w3.org/2000/svg" aria-label="PaidSync">' +
  '<rect x="0" y="3" width="20" height="20" rx="6" fill="#11d1c4"/>' +
  '<path d="M6 8h6.2a4.2 4.2 0 0 1 0 8.4H9V20H6V8zm3 3v2.6h3.2a1.3 1.3 0 0 0 0-2.6H9z" fill="#0b1f24"/>' +
  '<text x="28" y="19" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="17" font-weight="700" fill="#0b1f24">PaidSync</text>' +
  '</svg>';

function evidenceRows(ev) {
  const keys = Object.keys(ev || {});
  if (!keys.length) return "";
  const cells = keys.map((k) => {
    const v = ev[k];
    const val = typeof v === "number" ? fmt(v) : esc(v);
    return '<span class="ev"><span class="evk">' + esc(k.replace(/_/g, " ")) + '</span><span class="evv">' + val + "</span></span>";
  }).join("");
  return '<div class="evidence">' + cells + "</div>";
}

function findingCard(f) {
  const sev = SEV[f.severity] || SEV.info;
  const risk = f.spend_at_risk > 0
    ? '<div class="risk">' + esc((f.evidence && f.evidence.currency) || "") + " " + fmt(f.spend_at_risk) + ' <span>at risk</span></div>' : "";
  return '<div class="card" style="border-left-color:' + sev.color + '">' +
    '<div class="card-top">' +
      '<span class="badge" style="color:' + sev.color + ";background:" + sev.bg + '">' + sev.label + "</span>" +
      '<span class="entity">' + esc(f.entity_type) + ": " + esc(f.entity_name || f.entity_id || "") + "</span>" +
      risk +
    "</div>" +
    '<div class="title">' + esc(f.title) + "</div>" +
    '<div class="detail">' + esc(f.detail) + "</div>" +
    evidenceRows(f.evidence) +
    '<div class="fix"><span>Fix</span> ' + esc(f.recommendation) + "</div>" +
  "</div>";
}

function render(r) {
  const score = r.health_score;
  const band = r.score_band || "";
  const scoreColor = score == null ? "#5b6470" : score >= 80 ? "#2f9e6f" : score >= 60 ? "#d98309" : score >= 40 ? "#e5722f" : "#e5484d";
  const c = r.summary_counts || {};
  const acct = r.account || {};
  const dr = acct.date_range || {};
  const order = ["critical", "warning", "opportunity", "info"];
  const findings = (r.findings || []).slice().sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const cardsHtml = findings.length ? findings.map(findingCard).join("") :
    '<div class="card" style="border-left-color:#2f9e6f"><div class="title">No issues found in this window.</div><div class="detail">Nothing crossed an audit threshold. Re-run after your next flight.</div></div>';

  const chips = order.map((s) => '<span class="chip"><b style="color:' + SEV[s].color + '">' + (c[s] || 0) + "</b> " + SEV[s].label + "</span>").join("");

  const baseRows = Object.entries(r.baselines || {}).filter(([, b]) => b.count > 0).map(([fam, b]) =>
    "<tr><td>" + esc(fam) + "</td><td>" + b.count + "</td><td>" + (b.p25 == null ? "-" : fmt(b.p25)) + "</td><td>" + (b.p50 == null ? "-" : fmt(b.p50)) + "</td><td>" + (b.p75 == null ? "-" : fmt(b.p75)) + "</td><td>" + (b.low_confidence ? "low" : "ok") + "</td></tr>"
  ).join("");

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>PaidSync TikTok Account Audit - " + esc(acct.advertiser_name || "") + "</title><style>" +
    ":root{--ink:#0b1f24;--muted:#5b6470;--line:#e6eaee;--bg:#f6f8fa}" +
    "*{box-sizing:border-box}body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.5}" +
    ".wrap{max-width:920px;margin:0 auto;padding:28px 20px 60px}" +
    "header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}" +
    ".sub{color:var(--muted);font-size:13px}" +
    "h1{font-size:22px;margin:14px 0 2px}" +
    ".hero{display:flex;gap:16px;margin:18px 0 8px;flex-wrap:wrap}" +
    ".tile{flex:1;min-width:200px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px}" +
    ".score{font-size:46px;font-weight:800;line-height:1}" +
    ".band{font-size:13px;text-transform:capitalize;color:var(--muted)}" +
    ".risk-big{font-size:30px;font-weight:800}" +
    ".tile .lbl{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}" +
    ".chips{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 22px}" +
    ".chip{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px}" +
    ".card{background:#fff;border:1px solid var(--line);border-left:4px solid;border-radius:12px;padding:16px 18px;margin-bottom:12px}" +
    ".card-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}" +
    ".badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:.03em}" +
    ".entity{font-size:12px;color:var(--muted)}" +
    ".risk{margin-left:auto;font-weight:700;font-size:13px;color:#e5484d}.risk span{color:var(--muted);font-weight:500}" +
    ".title{font-weight:700;font-size:15px;margin:2px 0}" +
    ".detail{color:#33414b;font-size:14px;margin-bottom:10px}" +
    ".evidence{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}" +
    ".ev{display:inline-flex;flex-direction:column;background:var(--bg);border-radius:8px;padding:6px 10px;min-width:84px}" +
    ".evk{font-size:11px;color:var(--muted);text-transform:capitalize}.evv{font-weight:700;font-size:13px}" +
    ".fix{font-size:14px;background:#f0fbfa;border:1px solid #cdeeeb;border-radius:8px;padding:10px 12px}.fix span{font-weight:700;color:#0a8f86;margin-right:6px}" +
    "h2{font-size:15px;margin:26px 0 10px}" +
    "table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13px}" +
    "th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);text-transform:capitalize}th{background:var(--bg);color:var(--muted);font-weight:600}" +
    "footer{margin-top:34px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}" +
    "footer a{color:#0a8f86;text-decoration:none;font-weight:600}" +
    "@media(max-width:560px){.score{font-size:38px}.risk-big{font-size:24px}}" +
    "</style></head><body><div class='wrap'>" +
    "<header>" + LOGO + "<span class='sub'>Read-only audit</span></header>" +
    "<h1>TikTok Account Audit</h1>" +
    "<div class='sub'>" + esc(acct.advertiser_name || acct.advertiser_id || "Account") + " &middot; " + esc(dr.start_date || "") + " to " + esc(dr.end_date || "") + " &middot; " + esc(acct.currency || "") + "</div>" +
    "<div class='hero'>" +
      "<div class='tile'><div class='lbl'>Health score</div><div class='score' style='color:" + scoreColor + "'>" + (score == null ? "n/a" : score) + "<span style='font-size:18px;color:var(--muted)'>" + (score == null ? "" : "/100") + "</span></div><div class='band'>" + esc(band) + "</div></div>" +
      "<div class='tile'><div class='lbl'>Spend at risk</div><div class='risk-big' style='color:#e5484d'>" + esc(r.spend_at_risk.currency) + " " + fmt(r.spend_at_risk.amount) + "</div><div class='band'>of " + esc(r.totals.currency) + " " + fmt(r.totals.total_spend) + " total spend</div></div>" +
    "</div>" +
    "<div class='chips'>" + chips + "</div>" +
    "<h2>Findings, ranked by money at risk</h2>" + cardsHtml +
    (baseRows ? "<h2>Within-account baselines</h2><table><thead><tr><th>Objective</th><th>Entities</th><th>P25</th><th>P50</th><th>P75</th><th>Confidence</th></tr></thead><tbody>" + baseRows + "</tbody></table>" : "") +
    "<footer><span>Generated by the PaidSync TikTok Account Audit skill &middot; deterministic, read-only, no data leaves your session.</span><span>See every channel in one place at <a href='https://paidsync.ai'>paidsync.ai</a></span></footer>" +
    "</div></body></html>";
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || "audit_report.html";
  if (!inputPath) { console.error("Usage: node render_report.js <audit_findings.json> [audit_report.html]"); process.exit(2); }
  const r = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  fs.writeFileSync(outputPath, render(r));
  console.log("Wrote report: " + outputPath);
}

if (require.main === module) main();
module.exports = { render };

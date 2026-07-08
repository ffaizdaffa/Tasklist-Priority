import type { ContentPillar, FunnelStage } from "./types";

// ── Content intelligence: derive framework attributes from raw caption/media ──
// These heuristics encode the ANTARESTAR Social Media Operating Framework:
// Objective → Audience → Positioning → Content Funnel → Content Pillar → CTA → Data.

const norm = (s: string) => (s || "").toLowerCase();

/** First non-empty line of the caption = the hook. */
export function extractHook(caption: string): string {
  const line = (caption || "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (line || "").slice(0, 120);
}

const PRODUCT_PATTERNS: Array<[RegExp, string]> = [
  [/stormz/i, "Jacket Stormz"],
  [/manusela/i, "Jaket Manusela"],
  [/dufora/i, "Dufora Backpack"],
  [/sabun abadi|sabun/i, "Sabun Abadi"],
  [/backpack|ransel|tas/i, "Backpack"],
  [/jaket|jacket/i, "Jaket"],
  [/tenda|tent/i, "Tenda"],
  [/sleeping bag|sleepingbag/i, "Sleeping Bag"],
  [/sepatu|shoe|boot/i, "Footwear"],
  [/botol|tumbler|bottle/i, "Bottle"],
  [/kompor|nesting|cookset/i, "Cookset"],
  [/celana|pants/i, "Pants"],
  [/kaos|tshirt|t-shirt/i, "Apparel"],
];

export function detectProduct(caption: string): string | null {
  for (const [re, name] of PRODUCT_PATTERNS) if (re.test(caption)) return name;
  return null;
}

const CTA_PATTERNS: Array<[RegExp, string]> = [
  [/link di bio|di bio|cek bio|klik link/i, "Link in bio"],
  [/order|beli|checkout|co\b|keranjang/i, "Shop now"],
  [/join live|live sekarang|live now/i, "Join live"],
  [/tag teman|tag temen|mention/i, "Tag a friend"],
  [/follow|ikuti/i, "Follow"],
  [/save|simpan/i, "Save this"],
  [/komen|comment|tulis di kolom/i, "Comment"],
  [/dm|chat|wa\b|whatsapp/i, "DM us"],
];

export function detectCTA(caption: string): string {
  for (const [re, label] of CTA_PATTERNS) if (re.test(caption)) return label;
  return "None";
}

// ── Funnel stage ──
// TOFU: awareness / reach / entertainment / trend
// MOFU: trust / consideration / education / proof / review
// BOFU: conversion / product / offer / CTA-to-buy
// Retention: community / repeat / loyalty / behind-the-scenes
export function detectFunnel(caption: string, mediaType: string): FunnelStage {
  const c = norm(caption);
  const bofu = /(order|beli|checkout|stok terbatas|diskon|promo|launch|link di bio|harga|sale|flash)/;
  const mofu = /(kenapa|review|kelebihan|manfaat|kualitas|material|premium|garansi|tips|cara|kenalin|why|proof|bukti|testi)/;
  const retention = /(live|komunitas|community|giveaway|tag teman|thank|terima kasih|member|repeat|behind|bts)/;

  if (bofu.test(c)) return "BOFU";
  if (retention.test(c)) return "Retention";
  if (mofu.test(c)) return "MOFU";
  return "TOFU";
}

// ── Content pillar ──
export function detectPillar(caption: string, mediaType: string): ContentPillar {
  const c = norm(caption);
  if (/review|testi|rating|worth it/.test(c)) return "Review";
  if (/kenapa|manfaat|kelebihan|material|garansi|spesifikasi|clean|ergonomis|fitur/.test(c))
    return "Product";
  if (/tips|cara|how to|panduan|langkah|hack/.test(c)) return "Education";
  if (/masalah|problem|susah|ribet|capek|bau|bocor/.test(c)) return "Problem";
  if (/cerita|story|perjalanan|journey|kisah/.test(c)) return "Storytelling";
  if (/live|giveaway|challenge|lucu|seru|fun/.test(c)) return "Entertainment";
  if (/affiliate|komisi|reseller|dropship/.test(c)) return "Affiliate";
  if (/repost|ugc|dari kalian|kiriman/.test(c)) return "UGC";
  if (/tag teman|komen|mention|q&a|tanya/.test(c)) return "Personality";
  if (/praktis|mudah|ringkas|solusi/.test(c)) return "Practical";
  if (/bukti|proof|terjual|sold|ribuan/.test(c)) return "Proof";
  return "Product";
}

/** Extract a campaign tag from hashtags / launch keywords. */
export function detectCampaign(caption: string): string | null {
  const c = norm(caption);
  if (/launch|eksklusif|new|rilis/.test(c)) return "Product Launch";
  if (/live/.test(c)) return "Live Selling";
  if (/giveaway|challenge/.test(c)) return "Community Push";
  if (/#awalilangkahmu/.test(c)) return "#AwaliLangkahmu";
  return null;
}

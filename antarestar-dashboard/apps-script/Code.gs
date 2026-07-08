/*
 * ════════════════════════════════════════════════════════════════════
 *  ANTARESTAR Social Command Center — Google Sheets backend (Apps Script)
 * ════════════════════════════════════════════════════════════════════
 *  This turns a Google Sheet into the database + sync engine:
 *    • Pulls posts from Apify (TikTok + Instagram) on a schedule
 *    • Stores them in the "content" tab (one row per post, upsert by id)
 *    • Exposes a JSON endpoint the Vercel dashboard reads
 *
 *  SETUP (once):
 *   1. Make a new Google Sheet.
 *   2. Extensions → Apps Script → paste this file → Save.
 *   3. Project Settings → Script Properties, add:
 *        APIFY_TOKEN      = apify_api_xxx
 *        IG_USERNAMES     = antarestar_outdoor,antarestar.store   (comma, no @)
 *        TT_USERNAMES     = antarestar
 *        SYNC_SECRET      = any-random-string   (protects the sync endpoint)
 *   4. Run `setup` once (authorize when asked) — creates tabs + daily trigger.
 *   5. Deploy → New deployment → Web app → Execute as: Me,
 *        Who has access: Anyone → Deploy → copy the /exec URL.
 *   6. Put that URL in the dashboard env as SHEET_API_URL, redeploy.
 * ════════════════════════════════════════════════════════════════════
 */

var SHEET_CONTENT = 'content';
var HEADERS = [
  'id', 'accountId', 'accountName', 'platform', 'caption', 'publishDate',
  'mediaType', 'permalink', 'views', 'reach', 'likes', 'comments',
  'shares', 'saves', 'watchTime', 'profileActivity', 'syncedAt',
];

// ── Actor config (override actor IDs in Script Properties if needed) ──
function ACTORS_() {
  var p = PropertiesService.getScriptProperties();
  return [
    { key: 'instagram', platform: 'Instagram',
      actor: p.getProperty('IG_ACTOR') || 'apify~instagram-scraper',
      users: parseUsers_(p.getProperty('IG_USERNAMES')),
      input: function (u) { return { username: u, resultsType: 'posts', resultsLimit: 50 }; } },
    { key: 'tiktok', platform: 'TikTok',
      actor: p.getProperty('TT_ACTOR') || 'clockworks~tiktok-scraper',
      users: parseUsers_(p.getProperty('TT_USERNAMES')),
      input: function (u) { return { profiles: u, resultsPerPage: 50 }; } },
  ];
}

function parseUsers_(s) {
  if (!s) return [];
  return s.split(/[,\n]/).map(function (x) { return x.trim().replace(/^@/, ''); })
    .filter(function (x) { return x; });
}

// ── One-time setup: create tabs + a daily trigger ──
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_CONTENT) || ss.insertSheet(SHEET_CONTENT);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  // daily trigger
  var has = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'syncAll';
  });
  if (!has) {
    ScriptApp.newTrigger('syncAll').timeBased().everyDays(1).atHour(3).create();
  }
  return 'Setup done. Tabs ready + daily sync trigger installed.';
}

// ── Core: pull from Apify and upsert into the sheet ──
function syncAll() {
  var token = PropertiesService.getScriptProperties().getProperty('APIFY_TOKEN');
  if (!token) throw new Error('APIFY_TOKEN not set in Script Properties.');
  var summary = [];
  ACTORS_().forEach(function (a) {
    if (!a.users.length) { summary.push(a.key + ': no usernames'); return; }
    try {
      var url = 'https://api.apify.com/v2/acts/' + a.actor +
        '/run-sync-get-dataset-items?token=' + token;
      var res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(a.input(a.users)),
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() >= 300) {
        summary.push(a.key + ': ERROR ' + res.getResponseCode());
        return;
      }
      var items = JSON.parse(res.getContentText());
      var rows = items.map(function (r) { return normalize_(r, a.platform); })
        .filter(function (r) { return r.permalink || r.caption; });
      var n = upsert_(rows);
      summary.push(a.key + ': ' + n + ' posts');
    } catch (err) {
      summary.push(a.key + ': ' + err);
    }
  });
  return summary.join(' | ');
}

function num_() {
  for (var i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] === 'number') return arguments[i];
  }
  return 0;
}

function normalize_(raw, platform) {
  var caption = raw.text || raw.caption || raw.description || raw.title || '';
  var likes = num_(raw.diggCount, raw.likesCount, raw.likeCount, raw.likes);
  var comments = num_(raw.commentCount, raw.commentsCount, raw.comments);
  var shares = num_(raw.shareCount, raw.sharesCount, raw.reshareCount);
  var saves = num_(raw.collectCount, raw.savedCount, raw.saveCount, raw.saved);
  var views = num_(raw.playCount, raw.videoViewCount, raw.views, raw.viewCount);
  var reach = num_(raw.reachCount, raw.reach, raw.impressions) || views;
  var owner = raw.ownerUsername || raw.username ||
    (raw.authorMeta && (raw.authorMeta.name || raw.authorMeta.uniqueId)) ||
    (raw.author && (raw.author.uniqueId || raw.author.name)) || 'unknown';
  var permalink = raw.webVideoUrl || raw.url || raw.postUrl || raw.permalink || '';
  var date = raw.createTimeISO || raw.timestamp ||
    (raw.createTime ? new Date(raw.createTime * 1000).toISOString() : new Date().toISOString());
  return {
    id: (platform === 'TikTok' ? 'tt_' : 'ig_') + hash_(permalink || caption + owner),
    accountId: String(owner).toLowerCase(),
    accountName: owner,
    platform: platform,
    caption: caption,
    publishDate: date,
    mediaType: raw.type || raw.mediaType || (platform === 'TikTok' ? 'VIDEO' : 'IMAGE'),
    permalink: permalink,
    views: views || reach,
    reach: reach || views,
    likes: likes, comments: comments, shares: shares, saves: saves,
    watchTime: num_(raw.videoDuration, raw.averageWatchTime),
    profileActivity: num_(raw.profileVisits),
    syncedAt: new Date().toISOString(),
  };
}

function hash_(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}

// Upsert rows by id (column A). Updates existing, appends new.
function upsert_(rows) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTENT);
  var data = sh.getDataRange().getValues();
  var idIndex = {};
  for (var r = 1; r < data.length; r++) idIndex[data[r][0]] = r + 1; // sheet row
  var appended = [];
  rows.forEach(function (row) {
    var arr = HEADERS.map(function (h) { return row[h]; });
    if (idIndex[row.id]) {
      sh.getRange(idIndex[row.id], 1, 1, HEADERS.length).setValues([arr]);
    } else {
      appended.push(arr);
    }
  });
  if (appended.length) {
    sh.getRange(sh.getLastRow() + 1, 1, appended.length, HEADERS.length).setValues(appended);
  }
  return rows.length;
}

// ── Read the content tab as JSON objects ──
function readContent_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONTENT);
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getDataRange().getValues();
  var head = data[0];
  return data.slice(1).map(function (row) {
    var o = {};
    head.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

// ── Web endpoint: the dashboard reads this ──
//   GET ?action=data                → JSON content rows
//   GET ?action=sync&secret=SECRET  → triggers an Apify pull
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'data';
  if (action === 'sync') {
    var secret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
    if (secret && e.parameter.secret !== secret) {
      return json_({ ok: false, error: 'unauthorized' });
    }
    var summary = syncAll();
    return json_({ ok: true, summary: summary, count: readContent_().length });
  }
  return json_({ source: 'sheet', content: readContent_() });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

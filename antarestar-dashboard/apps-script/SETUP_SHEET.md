# Google Sheet backend — setup (the simple path)

Turn a Google Sheet into the database + Apify sync engine. No Supabase needed.

```
Apps Script (in the Sheet):  Apify ──▶ writes posts to the Sheet  (daily, automatic)
Dashboard (Vercel):          reads the Sheet via one URL ──▶ shows live data
```

## 1. Make the Sheet + paste the script
1. Create a new **Google Sheet** (name it e.g. `ANTARESTAR_SOCIAL_DB`).
2. **Extensions → Apps Script**.
3. Delete the default code, paste the contents of **`Code.gs`**, click **Save**.

## 2. Add your keys (Script Properties)
In Apps Script: **Project Settings (⚙️) → Script Properties → Add property** for each:

| Property | Value |
|----------|-------|
| `APIFY_TOKEN` | `apify_api_xxx` (from console.apify.com → Integrations) |
| `IG_USERNAMES` | real IG usernames, comma-separated, no `@` (e.g. `antarestar_outdoor`) |
| `TT_USERNAMES` | real TikTok usernames (e.g. `antarestar`) |
| `SYNC_SECRET` | any random string (protects the sync endpoint) |

## 3. Run setup once
In the Apps Script editor, pick the function **`setup`** in the toolbar → **Run**.
Authorize when Google asks (it's your own script). This creates the `content`
tab and a daily auto-sync trigger. Then run **`syncAll`** once to pull data now.

## 4. Deploy as a Web App
1. **Deploy → New deployment → (gear) Web app**.
2. **Execute as:** Me. **Who has access:** Anyone.
3. **Deploy** → copy the **Web app URL** (ends in `/exec`).

## 5. Point the dashboard at the Sheet
In **Vercel → your project → Settings → Environment Variables** add:

| Key | Value |
|-----|-------|
| `SHEET_API_URL` | the `/exec` URL from step 4 |
| `SHEET_SYNC_SECRET` | the same value as `SYNC_SECRET` |

Then **Redeploy**. Done — the dashboard now shows live data from the Sheet, and
the **Sync all now** button triggers an Apify pull through Apps Script.

> You no longer need `APIFY_TOKEN` or the Supabase vars in Vercel — the Sheet is
> the backend now. Keep `GEMINI_API_KEY` for the AI features.

## Verify
- Dashboard `/` → badge shows **🟢 Live · Sheet**.
- `/sync` → shows the Sheet row count; **Sync all now** returns a summary.
- Open the Sheet → the `content` tab fills with real posts.

## Endpoints (for reference)
- `GET {SHEET_API_URL}?action=data` → JSON content rows (what the dashboard reads).
- `GET {SHEET_API_URL}?action=sync&secret=SECRET` → runs an Apify pull now.

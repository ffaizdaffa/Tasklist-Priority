# Data contract

The agent assembles one JSON object from TikTok MCP reads and passes it to `scripts/analyze.js`. Shape below. Unknown or unavailable fields should be omitted or set to null, the script degrades gracefully. Never put access tokens or secrets in this file.

```json
{
  "account": {
    "advertiser_id": "string",
    "advertiser_name": "string",
    "currency": "USD",
    "timezone": "America/New_York"
  },
  "date_range": { "start_date": "2026-06-01", "end_date": "2026-06-30", "days": 30 },
  "events": {
    "has_conversion_events": true,
    "pixel_count": 1,
    "note": "set has_conversion_events to null if the MCP cannot report tracking state"
  },
  "campaigns": [
    {
      "campaign_id": "string",
      "campaign_name": "string",
      "objective_type": "WEB_CONVERSIONS",
      "budget": 100.0,
      "budget_mode": "BUDGET_MODE_DAY",
      "operation_status": "ENABLE",
      "secondary_status": "CAMPAIGN_STATUS_DELIVERY_OK"
    }
  ],
  "adgroups": [
    {
      "adgroup_id": "string",
      "campaign_id": "string",
      "adgroup_name": "string",
      "optimization_goal": "CONVERT",
      "budget": 50.0,
      "budget_mode": "BUDGET_MODE_DAY",
      "bid_type": "BID_TYPE_NO_BID",
      "bid_price": 0,
      "operation_status": "ENABLE",
      "secondary_status": "ADGROUP_STATUS_DELIVERY_OK"
    }
  ],
  "ads": [
    {
      "ad_id": "string",
      "adgroup_id": "string",
      "campaign_id": "string",
      "ad_name": "string",
      "operation_status": "ENABLE",
      "secondary_status": "AD_STATUS_DELIVERY_OK"
    }
  ],
  "performance": {
    "campaign": [
      { "dimension_id": "campaign_id", "impressions": 0, "clicks": 0, "ctr": 0, "cpc": 0, "cpm": 0, "spend": 0, "conversions": 0, "conversion_rate": 0, "cost_per_conversion": 0 }
    ],
    "adgroup": [
      { "dimension_id": "adgroup_id", "impressions": 0, "clicks": 0, "ctr": 0, "cpc": 0, "cpm": 0, "spend": 0, "conversions": 0, "conversion_rate": 0, "cost_per_conversion": 0 }
    ],
    "ad": [
      { "dimension_id": "ad_id", "impressions": 0, "clicks": 0, "ctr": 0, "cpc": 0, "cpm": 0, "spend": 0, "conversions": 0, "conversion_rate": 0, "cost_per_conversion": 0, "video_views": 0, "cost_per_video_view": 0 }
    ]
  },
  "performance_prior": {
    "ad": [
      { "dimension_id": "ad_id", "impressions": 0, "clicks": 0, "ctr": 0, "cpm": 0, "spend": 0, "conversions": 0, "video_views": 0 }
    ]
  }
}
```

## Notes for the agent

- `dimension_id` on each performance row must equal the matching entity id (campaign_id, adgroup_id, or ad_id) so the script can join performance to structure.
- Use the same date window length for `performance_prior` as for `performance`, immediately preceding it. Used for creative fatigue and trend. Omit if not retrievable.
- Currency must be the advertiser currency. If the account contains advertisers in multiple currencies, audit one advertiser at a time.
- `cost_per_conversion` is preferred when present. If absent, the script derives CPA as spend divided by conversions.

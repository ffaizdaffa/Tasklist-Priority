-- ══════════════════════════════════════════════════════════════
--  ANTARESTAR Social Media Command Center — database schema
--  Run in Supabase SQL editor. Enables persistence for synced
--  Apify data, normalized content, monthly rollups, AI reports,
--  and sync state. Auth is handled by Supabase Auth (auth.users).
-- ══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Accounts ──
create table if not exists accounts (
  id            text primary key,
  name          text not null,
  handle        text,
  platform      text not null check (platform in ('Instagram','TikTok','Facebook','YouTube')),
  role          text not null,
  followers     integer default 0,
  created_at    timestamptz default now()
);

-- ── Raw synced items (immutable Apify payloads for audit/replay) ──
create table if not exists raw_items (
  id            uuid primary key default uuid_generate_v4(),
  source_key    text not null,            -- e.g. tiktok_profile
  actor_id      text,
  platform      text not null,
  account_id    text references accounts(id),
  payload       jsonb not null,
  synced_at     timestamptz default now()
);
create index if not exists raw_items_synced_idx on raw_items (synced_at desc);

-- ── Normalized content (what the dashboard reads) ──
create table if not exists content (
  id               text primary key,       -- stable hash of permalink
  account_id       text references accounts(id),
  account_name     text,
  platform         text not null,
  caption          text,
  hook             text,
  publish_date     timestamptz,
  media_type       text,
  permalink        text,
  views            bigint default 0,
  reach            bigint default 0,
  likes            bigint default 0,
  comments         bigint default 0,
  shares           bigint default 0,
  saves            bigint default 0,
  watch_time       numeric default 0,
  profile_activity bigint default 0,
  engagement       bigint default 0,
  engagement_rate  numeric default 0,
  funnel           text check (funnel in ('TOFU','MOFU','BOFU','Retention')),
  pillar           text,
  cta              text,
  product          text,
  campaign         text,
  score            integer default 0,
  velocity         numeric default 0,
  updated_at       timestamptz default now()
);
create index if not exists content_account_idx on content (account_id);
create index if not exists content_funnel_idx  on content (funnel);
create index if not exists content_date_idx    on content (publish_date desc);

-- ── Monthly rollups (per account) ──
create table if not exists monthly_metrics (
  id               uuid primary key default uuid_generate_v4(),
  account_id       text references accounts(id),
  month            text not null,
  year             integer not null default 2026,
  followers        integer default 0,
  reach            bigint default 0,
  impression       bigint default 0,
  likes            bigint default 0,
  comments         bigint default 0,
  shares           bigint default 0,
  save             bigint default 0,
  engagement       bigint default 0,
  engagement_rate  numeric default 0,
  unique (account_id, month, year)
);

-- ── Sync state + error log ──
create table if not exists sync_sources (
  key         text primary key,
  label       text,
  actor_id    text,
  platform    text,
  status      text default 'idle',
  last_sync   timestamptz,
  items       integer default 0,
  error       text
);

create table if not exists sync_log (
  id          bigserial primary key,
  source      text,
  level       text default 'info',
  message     text,
  created_at  timestamptz default now()
);

-- ── AI reports (saved generations) ──
create table if not exists ai_reports (
  id          uuid primary key default uuid_generate_v4(),
  mode        text not null,
  period      text,
  filters     jsonb,
  content     text,
  source      text,             -- gemini | local
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- ── Row Level Security ──
alter table accounts        enable row level security;
alter table content         enable row level security;
alter table monthly_metrics enable row level security;
alter table ai_reports      enable row level security;
alter table sync_sources    enable row level security;
alter table sync_log        enable row level security;
alter table raw_items       enable row level security;

-- Authenticated team members can read everything.
do $$ begin
  create policy "team read" on content        for select using (auth.role() = 'authenticated');
  create policy "team read acc" on accounts    for select using (auth.role() = 'authenticated');
  create policy "team read mm" on monthly_metrics for select using (auth.role() = 'authenticated');
  create policy "team read rep" on ai_reports  for select using (auth.role() = 'authenticated');
  create policy "own reports" on ai_reports    for insert with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

-- Writes happen via the service-role key from server routes (bypasses RLS).

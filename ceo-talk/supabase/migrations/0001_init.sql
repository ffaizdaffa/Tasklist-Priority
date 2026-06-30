-- =====================================================================
-- CEO Talk — schema + realtime + RPC
-- Jalanin lewat: Supabase Dashboard -> SQL Editor (paste & Run),
-- atau Supabase CLI: `supabase db push`.
-- =====================================================================

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Table: participants
-- ---------------------------------------------------------------------
create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  position    int  not null,
  created_at  timestamptz not null default now(),
  -- urutan submit unik + dibatasi 1..24 (defense in depth buat cap peserta)
  constraint participants_position_unique unique (position),
  constraint participants_position_range  check (position between 1 and 24)
);

-- ---------------------------------------------------------------------
-- Table: schedule
-- ---------------------------------------------------------------------
create table if not exists public.schedule (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  talk_date       date not null,
  created_at      timestamptz not null default now(),
  -- 1 peserta cuma boleh 1 slot, 1 tanggal cuma boleh 1 peserta
  constraint schedule_participant_unique unique (participant_id),
  constraint schedule_date_unique        unique (talk_date)
);

-- ---------------------------------------------------------------------
-- RPC: join_ceo_talk
-- Atomic: kunci tabel -> hitung peserta -> insert kalau belum penuh.
-- Anti race condition walau banyak orang submit barengan.
--
-- CATATAN: angka cap (24) di-hardcode di sini biar di-enforce server-side.
-- Kalau MAX_PARTICIPANTS di config diubah, ganti juga angka di bawah.
-- ---------------------------------------------------------------------
create or replace function public.join_ceo_talk(p_name text)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_row   public.participants;
begin
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'EMPTY_NAME';
  end if;

  -- serialize join yang barengan; reads tetap jalan
  lock table public.participants in exclusive mode;

  select count(*) into v_count from public.participants;

  if v_count >= 24 then
    raise exception 'FULL';
  end if;

  insert into public.participants (name, position)
  values (btrim(p_name), v_count + 1)
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security + policies (anon boleh baca/insert; cukup buat app internal)
-- ---------------------------------------------------------------------
alter table public.participants enable row level security;
alter table public.schedule     enable row level security;

drop policy if exists "participants read"   on public.participants;
drop policy if exists "participants insert" on public.participants;
drop policy if exists "schedule read"       on public.schedule;
drop policy if exists "schedule insert"     on public.schedule;

create policy "participants read"   on public.participants for select using (true);
create policy "participants insert" on public.participants for insert with check (true);
create policy "schedule read"       on public.schedule     for select using (true);
create policy "schedule insert"     on public.schedule     for insert with check (true);

-- anon & authenticated boleh panggil RPC join
grant execute on function public.join_ceo_talk(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Realtime: daftarin kedua table ke publication supabase_realtime
-- ---------------------------------------------------------------------
alter table public.participants replica identity full;
alter table public.schedule     replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.participants;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.schedule;
  exception when duplicate_object then null;
  end;
end $$;

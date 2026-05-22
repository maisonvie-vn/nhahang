-- ============================================================
-- MAISON VIE — RESERVATION SYSTEM · SUPABASE SETUP
-- ============================================================
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1) Create the reservations table
create table if not exists public.reservations (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  name                text not null,
  email               text not null,
  phone               text not null,
  guests              int  not null,
  res_date            date not null,
  res_time            text not null,
  dietary             text[],            -- array: vegetarian, vegan, gluten_free, seafood_allergy, nut_allergy, halal
  notes               text,
  language            text default 'en', -- which language the guest used (en/fr/vi/ja)
  status              text default 'pending',  -- pending / confirmed / cancelled
  seating_preference  text default 'standard', -- standard / private / window
  purpose             text default 'fine_dining' -- fine_dining / business / anniversary / proposal
);

-- 2) Enable Row Level Security
alter table public.reservations enable row level security;

-- 3) PUBLIC (website) — may INSERT new reservations only.
create policy "Public can create reservations"
  on public.reservations
  for insert
  to anon
  with check (true);

-- ============================================================
-- 4) STAFF DASHBOARD policies (SECURED WITH SUPABASE AUTH)
-- ============================================================
-- The dashboard now requires official Supabase GoTrue Auth.
-- Only logged-in staff (authenticated role) can read/write data.
-- ------------------------------------------------------------

-- 4a) Allow reading reservations (for the authenticated dashboard list)
create policy "Dashboard can read reservations"
  on public.reservations
  for select
  to authenticated
  using (true);

-- 4b) Allow updating the status (confirm / cancel / edit)
create policy "Dashboard can update reservations"
  on public.reservations
  for update
  to authenticated
  using (true)
  with check (true);

-- 5) Helpful index (by date / time)
create index if not exists reservations_date_idx
  on public.reservations (res_date, res_time);

-- ============================================================
-- DONE. Next:
--   * Create a staff login account in Supabase Dashboard →
--     Authentication → Users → Add User (Email & Password).
--   * Project Settings -> API -> copy Project URL + anon public key
--   * Paste them into BOTH le-voyage.html AND dashboard.html
--   * (Optional) Deploy Edge Function notify-reservation.ts + a
--     Database Webhook on INSERT to get an email per booking.
-- ============================================================

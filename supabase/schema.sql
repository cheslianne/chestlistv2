-- Chestlist Supabase Schema & Row-Level Security Migration
-- Run this script in your Supabase Dashboard -> SQL Editor.
-- It safely extends existing starter tables (profiles, accounts, transactions)
-- and creates all remaining Chestlist tables with per-user RLS policies.

create extension if not exists pgcrypto;

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  theme text not null default 'blush',
  spending_style text,
  song_language text not null default 'Mixed',
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists theme text not null default 'blush';
alter table public.profiles add column if not exists spending_style text;
alter table public.profiles add column if not exists song_language text not null default 'Mixed';
alter table public.profiles add column if not exists timezone text not null default 'Asia/Manila';
alter table public.profiles add column if not exists weekly_budget_centavos bigint not null default 500000;
alter table public.profiles add column if not exists category_limits jsonb not null default '{"Food":120000,"Transport":60000,"School":50000,"Bills":50000,"Shopping":40000,"Health":50000,"Entertainment":30000,"Others":50000}'::jsonb;
alter table public.profiles add column if not exists notes_pin_hash text default '';
alter table public.profiles add column if not exists notes_pin_configured boolean not null default false;
alter table public.profiles add column if not exists notes_pin_failed_attempts integer not null default 0;
alter table public.profiles add column if not exists notes_pin_locked_until bigint not null default 0;
alter table public.profiles add column if not exists notes_pin_lockout_level integer not null default 0;
alter table public.profiles add column if not exists song_feedback jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists recorded_reference_numbers jsonb not null default '[]'::jsonb;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 2. ACCOUNTS
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  nickname text,
  type text not null,
  opening_balance_centavos bigint not null default 0,
  last4 text,
  card_color text default '#EFECE6',
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.accounts add column if not exists account_number text;
alter table public.accounts add column if not exists last_confirmed_date text;
alter table public.accounts add column if not exists text_color text;
alter table public.accounts add column if not exists icon text;

alter table public.accounts enable row level security;

drop policy if exists "Users can manage own accounts" on public.accounts;
create policy "Users can manage own accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. TRANSACTIONS
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  type text not null,
  direction text not null,
  amount_centavos bigint not null,
  description text not null,
  merchant text,
  category text,
  external_ref text,
  source text,
  tags text[],
  occurred_at timestamptz not null default now(),
  overdraft_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists overdraft_confirmed boolean not null default false;

alter table public.transactions enable row level security;

drop policy if exists "Users can manage own transactions" on public.transactions;
create policy "Users can manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. EXPENSES
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount_centavos bigint not null,
  category text not null,
  date text not null,
  account text,
  note text,
  created_at bigint not null
);

alter table public.expenses enable row level security;

drop policy if exists "Users can manage own expenses" on public.expenses;
create policy "Users can manage own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. SAVINGS GOALS & GOAL DEPOSITS
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_centavos bigint not null,
  start_date text not null,
  deadline text not null,
  backing_account text not null,
  container_skin text not null default 'glass jar',
  is_completed boolean not null default false,
  note text,
  emoji text,
  created_at bigint not null
);

alter table public.savings_goals enable row level security;

drop policy if exists "Users can manage own savings goals" on public.savings_goals;
create policy "Users can manage own savings goals" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.goal_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount_centavos bigint not null,
  date text not null,
  from_account text,
  created_at bigint not null
);

alter table public.goal_deposits enable row level security;

drop policy if exists "Users can manage own goal deposits" on public.goal_deposits;
create policy "Users can manage own goal deposits" on public.goal_deposits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. DEBTS & DEBT PAYMENTS
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  creditor text,
  type text not null,
  total_centavos bigint not null,
  due_date text not null,
  due_time text,
  reminders_enabled boolean not null default true,
  notes text,
  is_archived boolean not null default false,
  was_completed boolean not null default false,
  created_at bigint not null
);

alter table public.debts enable row level security;

drop policy if exists "Users can manage own debts" on public.debts;
create policy "Users can manage own debts" on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount_centavos bigint not null,
  date text not null,
  time text,
  channel text not null default 'GCash',
  paid_from_account text,
  created_at bigint not null
);

alter table public.debt_payments enable row level security;

drop policy if exists "Users can manage own debt payments" on public.debt_payments;
create policy "Users can manage own debt payments" on public.debt_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. CHECKLIST ITEMS
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'General',
  status text not null default 'Not started',
  was_started_before boolean not null default false,
  completed boolean not null default false,
  due_date text,
  completed_at bigint,
  sort_order integer not null default 0,
  created_at bigint not null
);

alter table public.checklist_items enable row level security;

drop policy if exists "Users can manage own checklist items" on public.checklist_items;
create policy "Users can manage own checklist items" on public.checklist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. DIARY ENTRIES
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  date text not null,
  formatted_date text,
  content text not null,
  word_count integer not null default 0,
  mood text not null default 'Calm',
  mood_source text not null default 'auto',
  location text,
  stickers jsonb not null default '[]'::jsonb,
  attached_song jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

alter table public.diary_entries enable row level security;

drop policy if exists "Users can manage own diary entries" on public.diary_entries;
create policy "Users can manage own diary entries" on public.diary_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

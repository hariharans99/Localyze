-- ==============================================================================
-- Localyze Supabase Database Schema (Idempotent & Production-Ready)
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create the user_subscriptions table
create table if not exists public.user_subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    user_email text,
    plan_id text not null,          -- 'day', 'week', 'month'
    plan_name text not null,        -- '1-Day Ultra Pass', etc.
    payment_id text not null,       -- Razorpay payment ID (e.g. 'pay_ABC123')
    amount_inr numeric not null,    -- 9, 29, 69
    activated_at timestamptz default now() not null,
    expires_at timestamptz not null,
    created_at timestamptz default now() not null
);

-- 2. Create high-speed lookup indexes
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_expires_at on public.user_subscriptions(expires_at);

-- 3. Enable Row Level Security (RLS)
alter table public.user_subscriptions enable row level security;

-- 4. Idempotent Policy: Users can view only their own subscriptions
drop policy if exists "Users can view own subscription" on public.user_subscriptions;
create policy "Users can view own subscription"
on public.user_subscriptions for select
to authenticated
using (auth.uid() = user_id);

-- 5. Idempotent Policy: Users can insert their own subscriptions
drop policy if exists "Users can insert own subscription" on public.user_subscriptions;
create policy "Users can insert own subscription"
on public.user_subscriptions for insert
to authenticated
with check (auth.uid() = user_id);

-- 6. Idempotent Policy: Users can update their own subscriptions
drop policy if exists "Users can update own subscription" on public.user_subscriptions;
create policy "Users can update own subscription"
on public.user_subscriptions for update
to authenticated
using (auth.uid() = user_id);

-- 7. Fix Security Definer Warning (if function exists)
do $$
begin
    if exists (select 1 from pg_proc where proname = 'rls_auto_enable') then
        execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated;';
        execute 'alter function public.rls_auto_enable() security invoker;';
    end if;
end $$;

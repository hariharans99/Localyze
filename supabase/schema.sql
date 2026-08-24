-- ==============================================================================
-- Localyze Supabase Database Schema (Idempotent & Production-Ready)
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

-- 4. Policy: Users can view only their own subscriptions
drop policy if exists "Users can view own subscription" on public.user_subscriptions;
create policy "Users can view own subscription"
on public.user_subscriptions for select
to authenticated
using (auth.uid() = user_id);

-- 5. Policy: Users can insert their own subscriptions
drop policy if exists "Users can insert own subscription" on public.user_subscriptions;
create policy "Users can insert own subscription"
on public.user_subscriptions for insert
to authenticated
with check (auth.uid() = user_id);

-- 6. Policy: Users can update their own subscriptions
drop policy if exists "Users can update own subscription" on public.user_subscriptions;
create policy "Users can update own subscription"
on public.user_subscriptions for update
to authenticated
using (auth.uid() = user_id);

-- 7. Create the user_usage table (to track free tier operations)
create table if not exists public.user_usage (
    user_id uuid references auth.users(id) on delete cascade primary key,
    user_email text,
    usage_count integer default 0 not null,
    last_used_at timestamptz default now() not null,
    created_at timestamptz default now() not null
);

-- 8. Create index on user_usage
create index if not exists idx_user_usage_user_id on public.user_usage(user_id);

-- 9. Enable RLS on user_usage
alter table public.user_usage enable row level security;

-- 10. Policies for user_usage
drop policy if exists "Users can view own usage" on public.user_usage;
create policy "Users can view own usage"
on public.user_usage for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own usage" on public.user_usage;
create policy "Users can insert own usage"
on public.user_usage for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own usage" on public.user_usage;
create policy "Users can update own usage"
on public.user_usage for update
to authenticated
using (auth.uid() = user_id);

-- 11. Stored procedure for atomic usage increments (Secure Invoker with Search Path & RLS)
create or replace function public.increment_user_usage(p_user_id uuid, p_user_email text default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_count integer;
begin
    if auth.uid() is null or auth.uid() != p_user_id then
        raise exception 'Unauthorized';
    end if;

    insert into public.user_usage (user_id, user_email, usage_count, last_used_at)
    values (p_user_id, p_user_email, 1, now())
    on conflict (user_id)
    do update set
        usage_count = public.user_usage.usage_count + 1,
        last_used_at = now(),
        user_email = coalesce(excluded.user_email, public.user_usage.user_email)
    returning usage_count into v_count;
    
    return v_count;
end;
$$;

revoke all on function public.increment_user_usage(uuid, text) from public, anon;
grant execute on function public.increment_user_usage(uuid, text) to authenticated;


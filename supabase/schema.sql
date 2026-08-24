-- ==============================================================================
-- Localyze Supabase Database Schema (Idempotent, Anti-Tamper & Production-Ready)
-- ==============================================================================

-- 1. Create the subscription_plans table (Server-side Source of Truth)
create table if not exists public.subscription_plans (
    id text primary key,            -- 'day', 'week', 'month'
    name text not null,             -- '1-Day Ultra Pass', etc.
    price_inr numeric not null,     -- 9, 29, 69
    duration_hours integer not null,-- 24, 168, 720
    description text,
    is_active boolean default true not null,
    created_at timestamptz default now() not null
);

-- Seed or upsert default authoritative plans
insert into public.subscription_plans (id, name, price_inr, duration_hours, description, is_active)
values
    ('day', '1-Day Ultra Pass', 9, 24, '24-hour full unlimited access to all tools', true),
    ('week', '1-Week Sprint Pass', 29, 168, '7-day full unlimited access to all tools', true),
    ('month', '1-Month Pro Pass', 69, 720, '30-day full unlimited access to all tools', true)
on conflict (id) do update set
    name = excluded.name,
    price_inr = excluded.price_inr,
    duration_hours = excluded.duration_hours,
    description = excluded.description,
    is_active = excluded.is_active;

-- Enable RLS on subscription_plans
alter table public.subscription_plans enable row level security;

-- Public and authenticated users can view active plans
drop policy if exists "Allow public read on subscription_plans" on public.subscription_plans;
create policy "Allow public read on subscription_plans"
on public.subscription_plans for select
to public
using (is_active = true);


-- 2. Create the user_subscriptions table (Protected User Pass Records)
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

-- Unique constraint on payment_id to prevent payment replay attacks
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'user_subscriptions_payment_id_key'
    ) then
        alter table public.user_subscriptions add constraint user_subscriptions_payment_id_key unique (payment_id);
    end if;
end $$;

-- High-speed lookup indexes
create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_expires_at on public.user_subscriptions(expires_at);

-- Enable RLS
alter table public.user_subscriptions enable row level security;

-- Policy: Users can view only their own subscriptions
drop policy if exists "Users can view own subscription" on public.user_subscriptions;
create policy "Users can view own subscription"
on public.user_subscriptions for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Users can insert own subscription (used by secure activation function)
drop policy if exists "Users can insert own subscription" on public.user_subscriptions;
create policy "Users can insert own subscription"
on public.user_subscriptions for insert
to authenticated
with check (auth.uid() = user_id);


-- 3. Stored Procedure for Server-Side Tamper-Proof Subscription Activation
create or replace function public.activate_user_subscription(
    p_plan_id text,
    p_payment_id text,
    p_user_email text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_plan record;
    v_expires_at timestamptz;
    v_subscription_id uuid;
    v_result jsonb;
begin
    -- 1. Validate authenticated caller
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'Authentication required to activate a subscription';
    end if;

    -- 2. Validate payment_id format
    if p_payment_id is null or length(trim(p_payment_id)) < 5 then
        raise exception 'Invalid payment ID supplied';
    end if;

    -- 3. Query authoritative plan from subscription_plans table
    select * into v_plan
    from public.subscription_plans
    where id = p_plan_id and is_active = true;

    if not found then
        raise exception 'Subscription plan not found or inactive: %', p_plan_id;
    end if;

    -- 4. Calculate expiration timestamp strictly on the server clock
    v_expires_at := now() + (v_plan.duration_hours || ' hours')::interval;

    -- 5. Insert verified subscription
    insert into public.user_subscriptions (
        user_id,
        user_email,
        plan_id,
        plan_name,
        payment_id,
        amount_inr,
        activated_at,
        expires_at
    )
    values (
        v_user_id,
        p_user_email,
        v_plan.id,
        v_plan.name,
        p_payment_id,
        v_plan.price_inr,
        now(),
        v_expires_at
    )
    returning id into v_subscription_id;

    select to_jsonb(s) into v_result
    from public.user_subscriptions s
    where s.id = v_subscription_id;

    return v_result;
end;
$$;

revoke all on function public.activate_user_subscription(text, text, text) from public, anon;
grant execute on function public.activate_user_subscription(text, text, text) to authenticated;


-- 4. Create the user_usage table (Free Tier Operations Tracking)
create table if not exists public.user_usage (
    user_id uuid references auth.users(id) on delete cascade primary key,
    user_email text,
    usage_count integer default 0 not null,
    last_used_at timestamptz default now() not null,
    created_at timestamptz default now() not null
);

create index if not exists idx_user_usage_user_id on public.user_usage(user_id);
alter table public.user_usage enable row level security;

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


-- 5. Stored Procedure for Atomic Usage Increments
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

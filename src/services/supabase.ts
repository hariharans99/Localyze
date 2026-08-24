import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { type PlanConfig } from './razorpay';

// Read Supabase credentials from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
);

// Initialize client only if valid URL is provided, otherwise fallback to safe stub
export const supabase: SupabaseClient = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : createClient('https://placeholder-localyze.supabase.co', 'placeholder-anon-key-localyze-fallback', {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

export interface SubscriptionRecord {
    id?: string;
    user_id: string;
    user_email?: string;
    plan_id: string;
    plan_name: string;
    payment_id: string;
    amount_inr: number;
    activated_at: string;
    expires_at: string;
}

/**
 * Fetch the latest active, verified subscription for a user from Supabase
 */
export const fetchUserActiveSubscription = async (userId: string): Promise<SubscriptionRecord | null> => {
    if (!isSupabaseConfigured || !userId) return null;

    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('Supabase subscription query error:', error.message);
            return null;
        }

        return data as SubscriptionRecord | null;
    } catch (err) {
        console.error('Failed to fetch subscription from Supabase:', err);
        return null;
    }
};

export interface SubscriptionPlanRow {
    id: string;
    name: string;
    price_inr: number;
    duration_hours: number;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

/**
 * Fetch authoritative active subscription plans from Supabase
 */
export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlanRow[]> => {
    if (!isSupabaseConfigured) return [];
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('price_inr', { ascending: true });

        if (error) {
            console.warn('Failed to fetch subscription plans from DB:', error.message);
            return [];
        }
        return (data || []) as SubscriptionPlanRow[];
    } catch (err) {
        console.error('Error fetching subscription plans:', err);
        return [];
    }
};

/**
 * Record a verified Razorpay subscription into Supabase using server-side activation
 */
export const recordVerifiedSubscription = async (
    user: User,
    plan: PlanConfig,
    paymentId: string,
    expiresAtTimestamp?: number
): Promise<SubscriptionRecord | null> => {
    const now = new Date();
    const expiresAt = expiresAtTimestamp
        ? new Date(expiresAtTimestamp)
        : new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const fallbackRecord: SubscriptionRecord = {
        user_id: user.id,
        user_email: user.email,
        plan_id: plan.id,
        plan_name: plan.name,
        payment_id: paymentId,
        amount_inr: plan.amountInr,
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
    };

    if (!isSupabaseConfigured) {
        console.info('Supabase not configured in .env; saving subscription to local state.');
        return fallbackRecord;
    }

    try {
        // Secure server-side activation via Postgres stored procedure
        const { data, error } = await supabase.rpc('activate_user_subscription', {
            p_plan_id: plan.id,
            p_payment_id: paymentId,
            p_user_email: user.email || null
        });

        if (error) {
            console.error('Failed to activate subscription via RPC:', error.message);
            const { data: insertData, error: insertError } = await supabase
                .from('user_subscriptions')
                .insert(fallbackRecord)
                .select()
                .single();

            if (insertError) {
                console.error('Fallback insert failed:', insertError.message);
                return fallbackRecord;
            }
            return insertData as SubscriptionRecord;
        }

        return data as SubscriptionRecord;
    } catch (err) {
        console.error('Error saving subscription to Supabase:', err);
        return fallbackRecord;
    }
};

/**
 * Fetch the usage count for a user from Supabase user_usage table
 */
export const fetchUserUsage = async (userId: string): Promise<number> => {
    if (!isSupabaseConfigured || !userId) return 0;

    try {
        const { data, error } = await supabase
            .from('user_usage')
            .select('usage_count')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.warn('Supabase usage query error:', error.message);
            return 0;
        }

        return data?.usage_count || 0;
    } catch (err) {
        console.error('Failed to fetch user usage from Supabase:', err);
        return 0;
    }
};

/**
 * Increment the usage count for a user in Supabase
 */
export const recordUserUsageIncrement = async (userId: string, userEmail?: string): Promise<number> => {
    if (!userId) return 1;

    if (!isSupabaseConfigured) {
        return 1;
    }

    try {
        // Try calling atomic RPC function first
        const { data, error } = await supabase.rpc('increment_user_usage', {
            p_user_id: userId,
            p_user_email: userEmail || null
        });

        if (!error && typeof data === 'number') {
            return data;
        }

        // Fallback: direct upsert if RPC is unavailable
        const currentCount = await fetchUserUsage(userId);
        const newCount = currentCount + 1;

        const { error: upsertError } = await supabase
            .from('user_usage')
            .upsert({
                user_id: userId,
                user_email: userEmail || null,
                usage_count: newCount,
                last_used_at: new Date().toISOString()
            });

        if (upsertError) {
            console.error('Failed to update user usage in Supabase:', upsertError.message);
        }

        return newCount;
    } catch (err) {
        console.error('Error incrementing user usage in Supabase:', err);
        return 1;
    }
};


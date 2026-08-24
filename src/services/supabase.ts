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

/**
 * Record a verified Razorpay subscription into Supabase
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

    const record: SubscriptionRecord = {
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
        return record;
    }

    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .insert(record)
            .select()
            .single();

        if (error) {
            console.error('Failed to insert subscription into Supabase:', error.message);
            return record; // Return local copy so user still gets instant access
        }

        return data as SubscriptionRecord;
    } catch (err) {
        console.error('Error saving subscription to Supabase:', err);
        return record;
    }
};

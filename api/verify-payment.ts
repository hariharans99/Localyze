import crypto from 'crypto';

const PLANS: Record<string, { durationDays: number; amountInr: number; name: string }> = {
    day: { durationDays: 1, amountInr: 9, name: '1-Day Ultra Pass' },
    week: { durationDays: 7, amountInr: 29, name: '1-Week Sprint Pass' },
    month: { durationDays: 30, amountInr: 69, name: '1-Month Pro Pass' }
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan_id,
            user_id,
            user_email
        } = body;

        if (!razorpay_payment_id || !plan_id || !user_id) {
            return res.status(400).json({ error: 'Missing required payment verification parameters' });
        }

        const plan = PLANS[plan_id];
        if (!plan) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'VpeJSw6n0YKh4x5Tu8l8IVW4').trim();

        // 1. If Razorpay Secret is configured and signature is provided, verify HMAC SHA-256
        if (keySecret && razorpay_order_id && razorpay_signature) {
            const expectedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                console.error('Signature mismatch:', { expectedSignature, razorpay_signature });
                return res.status(403).json({ error: 'Invalid payment signature. Verification failed.' });
            }
        }

        // 2. Calculate expiration timestamp
        const now = new Date();
        const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

        const subscriptionPayload = {
            user_id,
            user_email: user_email || null,
            plan_id,
            plan_name: plan.name,
            payment_id: razorpay_payment_id,
            amount_inr: plan.amountInr,
            activated_at: now.toISOString(),
            expires_at: expiresAt.toISOString()
        };

        // 3. Write verified record to Supabase via REST API
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            try {
                await fetch(`${supabaseUrl}/rest/v1/user_subscriptions`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(subscriptionPayload)
                });
            } catch (supaErr) {
                console.error('Supabase write error in serverless function:', supaErr);
            }
        }

        return res.status(200).json({
            verified: true,
            subscription: subscriptionPayload,
            message: 'Payment verified and subscription activated successfully.'
        });

    } catch (err: any) {
        console.error('Payment verification error:', err);
        return res.status(500).json({ error: err.message || 'Internal verification error' });
    }
}

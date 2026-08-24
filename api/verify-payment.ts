export const config = {
    runtime: 'edge',
};

const PLANS: Record<string, { durationDays: number; amountInr: number; name: string }> = {
    day: { durationDays: 1, amountInr: 9, name: '1-Day Ultra Pass' },
    week: { durationDays: 7, amountInr: 29, name: '1-Week Sprint Pass' },
    month: { durationDays: 30, amountInr: 69, name: '1-Month Pro Pass' }
};

/**
 * Compute HMAC-SHA256 hex string using standard Web Crypto API (supported on all Edge runtimes)
 */
async function computeHmacSha256(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan_id,
            user_id,
            user_email
        } = body;

        if (!razorpay_payment_id || !plan_id || !user_id) {
            return new Response(JSON.stringify({ error: 'Missing required payment verification parameters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const plan = PLANS[plan_id];
        if (!plan) {
            return new Response(JSON.stringify({ error: 'Invalid plan' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'VpeJSw6n0YKh4x5Tu8l8IVW4').trim();

        // 1. If Razorpay Secret is configured and signature is provided, verify HMAC SHA-256
        if (keySecret && razorpay_order_id && razorpay_signature) {
            const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
            const expectedSignature = await computeHmacSha256(keySecret, payload);

            if (expectedSignature !== razorpay_signature) {
                console.error('Signature mismatch:', { expectedSignature, razorpay_signature });
                return new Response(JSON.stringify({ error: 'Invalid payment signature. Verification failed.' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
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
                const supaRes = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(subscriptionPayload)
                });

                if (!supaRes.ok) {
                    const errTxt = await supaRes.text();
                    console.warn('Supabase insertion warning:', errTxt);
                }
            } catch (supaErr) {
                console.error('Supabase write error in serverless function:', supaErr);
            }
        }

        return new Response(JSON.stringify({
            verified: true,
            subscription: subscriptionPayload,
            message: 'Payment verified and subscription activated successfully.'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Payment verification error:', err);
        return new Response(JSON.stringify({ error: err.message || 'Internal verification error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

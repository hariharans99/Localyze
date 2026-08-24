export const config = {
    runtime: 'edge',
};

const PLANS: Record<string, { amountPaise: number; name: string }> = {
    day: { amountPaise: 900, name: '1-Day Ultra Pass' },
    week: { amountPaise: 2900, name: '1-Week Sprint Pass' },
    month: { amountPaise: 6900, name: '1-Month Pro Pass' }
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        let body: any = {};
        try {
            body = await req.json();
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { planId, userId } = body;
        const plan = PLANS[planId];
        if (!plan) {
            return new Response(JSON.stringify({ error: 'Invalid plan selected' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TTVaAFshs31QBq').trim();
        const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'VpeJSw6n0YKh4x5Tu8l8IVW4').trim();

        // Call official Razorpay API
        const basicAuth = btoa(`${keyId}:${keySecret}`);
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: plan.amountPaise,
                currency: 'INR',
                receipt: `rcpt_${userId ? userId.substring(0, 10) : 'guest'}_${Date.now()}`,
                notes: {
                    plan_id: planId,
                    user_id: userId || 'anonymous'
                }
            })
        });

        const resText = await response.text();
        let orderData: any = {};
        try {
            orderData = JSON.parse(resText);
        } catch {
            console.error('Non-JSON response from Razorpay:', resText);
            return new Response(JSON.stringify({ error: 'Non-JSON response from Razorpay', raw: resText }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!response.ok) {
            console.error('Razorpay order creation failed:', orderData);
            return new Response(JSON.stringify({ error: 'Failed to create Razorpay order', details: orderData }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            orderId: orderData.id,
            amount: orderData.amount,
            currency: orderData.currency
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Create order exception:', err);
        return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

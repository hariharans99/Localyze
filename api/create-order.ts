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
        const body = await req.json();
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

        // If credentials are completely empty, generate sandbox order ID for testing
        if (!keyId || !keySecret) {
            const mockOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            return new Response(JSON.stringify({
                orderId: mockOrderId,
                amount: plan.amountPaise,
                currency: 'INR',
                isSandbox: true
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Call Razorpay API to create official order
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

        if (!response.ok) {
            const errData = await response.json();
            console.error('Razorpay order creation failed:', errData);
            return new Response(JSON.stringify({ error: 'Failed to create Razorpay order', details: errData }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const orderData = await response.json();
        return new Response(JSON.stringify({
            orderId: orderData.id,
            amount: orderData.amount,
            currency: orderData.currency
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Create order error:', err);
        return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

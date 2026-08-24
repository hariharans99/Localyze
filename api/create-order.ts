const PLANS: Record<string, { amountPaise: number; name: string }> = {
    day: { amountPaise: 900, name: '1-Day Ultra Pass' },
    week: { amountPaise: 2900, name: '1-Week Sprint Pass' },
    month: { amountPaise: 6900, name: '1-Month Pro Pass' }
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { planId, userId } = body;

        const plan = PLANS[planId];
        if (!plan) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TTVaAFshs31QBq').trim();
        const keySecret = (process.env.RAZORPAY_KEY_SECRET || 'VpeJSw6n0YKh4x5Tu8l8IVW4').trim();

        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Localyze-App/1.0'
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

        const data: any = await response.json();
        if (!response.ok) {
            console.error('Razorpay order error:', data);
            return res.status(response.status).json({ error: 'Failed to create Razorpay order', details: data });
        }

        return res.status(200).json({
            orderId: data.id,
            amount: data.amount,
            currency: data.currency
        });

    } catch (err: any) {
        console.error('Create order exception:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}

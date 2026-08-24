const PLANS: Record<string, { amountPaise: number; name: string }> = {
    day: { amountPaise: 900, name: '1-Day Ultra Pass' },
    week: { amountPaise: 2900, name: '1-Week Sprint Pass' },
    month: { amountPaise: 6900, name: '1-Month Pro Pass' }
};

const getRazorpayCredentials = () => {
    let rawKeyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim();
    let rawKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!rawKeyId || rawKeyId === 'rzp_test_localyzePublic' || rawKeyId.includes('localyzePublic')) {
        rawKeyId = 'rzp_live_TTWRSELDvdYygE';
    }

    const matchKey = rawKeyId.match(/(rzp_(?:test|live)_[a-zA-Z0-9]+)/);
    let keyId = matchKey && matchKey[1] !== 'rzp_test_localyzePublic' ? matchKey[1] : 'rzp_live_TTWRSELDvdYygE';

    let keySecret = rawKeySecret.replace(/^(?:Key\s*Secret\s*:?|Secret\s*:?)\s*/i, '').trim();
    if (!keySecret || keySecret === 'rzp_test_secret') {
        keySecret = 'mmeEi51sQW43DO491QrdVuYO';
    }

    return { keyId, keySecret };
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

        const { keyId, keySecret } = getRazorpayCredentials();

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

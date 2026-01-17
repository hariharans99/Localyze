import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRazorpayInstance } from './_lib/razorpay';
import { auth } from './_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify Firebase Auth token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing auth token' });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Get plan from request body
        const { plan, amount } = req.body;

        if (!plan || !amount) {
            return res.status(400).json({ error: 'Missing plan or amount' });
        }

        // Validate plan and amount
        const validPlans: Record<string, number> = {
            'weekly': 4900,   // ₹49 in paise
            'monthly': 14900  // ₹149 in paise
        };

        if (!validPlans[plan] || validPlans[plan] !== amount) {
            return res.status(400).json({ error: 'Invalid plan or amount' });
        }

        // Create Razorpay order
        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create({
            amount: amount,
            currency: 'INR',
            receipt: `order_${userId}_${Date.now()}`,
            notes: {
                userId,
                plan
            }
        });

        console.log(`Order created for user ${userId}: ${order.id}`);

        return res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error: any) {
        console.error('Error creating order:', error);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ error: 'Token expired. Please sign in again.' });
        }

        return res.status(500).json({
            error: 'Failed to create order',
            message: error.message
        });
    }
}

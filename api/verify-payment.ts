import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyPaymentSignature } from './_lib/razorpay';
import { db, auth } from './_lib/firebase-admin';

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

        // Get payment details from request
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
            return res.status(400).json({ error: 'Missing payment verification data' });
        }

        // Verify Razorpay signature
        const isValid = verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            console.error(`Invalid signature for user ${userId}`);
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        console.log(`Payment verified for user ${userId}, payment ID: ${razorpay_payment_id}`);

        // Calculate expiration date
        const now = new Date();
        let expiresAt: Date;
        if (plan === 'weekly') {
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        } else if (plan === 'monthly') {
            expiresAt = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000); // 31 days
        } else {
            return res.status(400).json({ error: 'Invalid plan type' });
        }

        // Get user profile to check for existing active plan
        const userRef = db.doc(`users/${userId}`);
        const userDoc = await userRef.get();
        const profile = userDoc.data();

        const hasActivePaidPlan = profile
            && profile.plan !== 'free'
            && profile.planExpiresAt
            && new Date(profile.planExpiresAt) > now;

        // Update Firestore
        if (hasActivePaidPlan) {
            // Schedule plan to activate after current plan expires
            await userRef.update({
                pendingPlan: plan,
                pendingPaymentId: razorpay_payment_id,
                updatedAt: now.toISOString()
            });

            console.log(`Pending plan scheduled for user ${userId}`);
            return res.status(200).json({
                success: true,
                pending: true,
                message: 'Plan will activate after current plan expires'
            });
        } else {
            // Activate immediately
            await userRef.update({
                plan,
                planExpiresAt: expiresAt.toISOString(),
                subscriptionStatus: 'active',
                subscriptionId: razorpay_payment_id,
                pendingPlan: null,
                updatedAt: now.toISOString()
            });

            console.log(`Plan activated for user ${userId}: ${plan}`);
            return res.status(200).json({
                success: true,
                pending: false,
                plan,
                expiresAt: expiresAt.toISOString()
            });
        }

    } catch (error: any) {
        console.error('Error verifying payment:', error);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ error: 'Token expired. Please sign in again.' });
        }

        return res.status(500).json({
            error: 'Failed to verify payment',
            message: error.message
        });
    }
}

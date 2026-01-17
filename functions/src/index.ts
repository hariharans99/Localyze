/**
 * Cloud Functions for Localyze
 * Secure server-side validation for premium feature access
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

/**
 * Validates user access to premium features
 * Called before each tool use to check plan status and usage limits
 */
export const validateAccess = functions.https.onCall(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Must be signed in to use tools"
        );
    }

    const uid = context.auth.uid;
    const tool = data?.tool || "tool";

    functions.logger.info(`Validating access for user ${uid}, tool: ${tool}`);

    try {
        // Fetch user profile
        const userDoc = await db.doc(`users/${uid}`).get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "User profile not found"
            );
        }

        const profile = userDoc.data();
        if (!profile) {
            throw new functions.https.HttpsError("internal", "Invalid user data");
        }

        const today = new Date().toISOString().split("T")[0];

        // Check if plan is active
        const isPro = profile.plan !== "free";
        const planExpired =
            profile.planExpiresAt && new Date(profile.planExpiresAt) < new Date();

        if (isPro && !planExpired) {
            // Pro user - always allow
            functions.logger.info(`Pro user ${uid} validated successfully`);
            return { allowed: true, plan: profile.plan };
        }

        // Free user - check daily limit
        const usageDate = profile.usage?.date;
        const usageCount = profile.usage?.count || 0;

        if (usageDate === today && usageCount >= 2) {
            functions.logger.warn(`User ${uid} exceeded free tier limit`);
            throw new functions.https.HttpsError(
                "permission-denied",
                "Daily limit reached. Upgrade to Pro for unlimited access."
            );
        }

        functions.logger.info(`Free user ${uid} validated (${usageCount}/2 today)`);
        return { allowed: true, plan: "free", usage: usageCount };
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error(`Validation error for user ${uid}:`, error);
        throw new functions.https.HttpsError("internal", "Failed to validate access");
    }
});

"use strict";
/**
 * Cloud Functions for Localyze
 * Secure server-side validation for premium feature access
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAccess = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
/**
 * Validates user access to premium features
 * Called before each tool use to check plan status and usage limits
 */
exports.validateAccess = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in to use tools");
    }
    const uid = context.auth.uid;
    const tool = (data === null || data === void 0 ? void 0 : data.tool) || "tool";
    functions.logger.info(`Validating access for user ${uid}, tool: ${tool}`);
    try {
        // Fetch user profile
        const userDoc = await db.doc(`users/${uid}`).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User profile not found");
        }
        const profile = userDoc.data();
        if (!profile) {
            throw new functions.https.HttpsError("internal", "Invalid user data");
        }
        const today = new Date().toISOString().split("T")[0];
        // Check if plan is active
        const isPro = profile.plan !== "free";
        const planExpired = profile.planExpiresAt && new Date(profile.planExpiresAt) < new Date();
        if (isPro && !planExpired) {
            // Pro user - always allow
            functions.logger.info(`Pro user ${uid} validated successfully`);
            return { allowed: true, plan: profile.plan };
        }
        // Free user - check daily limit
        const usageDate = (_a = profile.usage) === null || _a === void 0 ? void 0 : _a.date;
        const usageCount = ((_b = profile.usage) === null || _b === void 0 ? void 0 : _b.count) || 0;
        if (usageDate === today && usageCount >= 2) {
            functions.logger.warn(`User ${uid} exceeded free tier limit`);
            throw new functions.https.HttpsError("permission-denied", "Daily limit reached. Upgrade to Pro for unlimited access.");
        }
        functions.logger.info(`Free user ${uid} validated (${usageCount}/2 today)`);
        return { allowed: true, plan: "free", usage: usageCount };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error(`Validation error for user ${uid}:`, error);
        throw new functions.https.HttpsError("internal", "Failed to validate access");
    }
});
//# sourceMappingURL=index.js.map
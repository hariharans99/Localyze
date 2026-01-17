import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK for Vercel
if (!admin.apps.length) {
    try {
        // For Vercel deployment, use environment variables
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : require('../../firebase-service-account.json'); // Local fallback

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'localyze-b58dc'
        });

        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        throw error;
    }
}

export const db = admin.firestore();
export const auth = admin.auth();

export default admin;

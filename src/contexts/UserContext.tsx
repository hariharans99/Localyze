import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, addDoc, collection, getCountFromServer, query, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import type { UserProfile } from '../types';

interface UserContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    incrementUsage: (tool: 'compress' | 'resize' | 'convert' | 'pdf' | 'pdf_merge' | 'pdf_split') => Promise<boolean>;
    checkLimit: () => boolean;
    logActivity: (tool: 'compress' | 'resize' | 'convert' | 'pdf' | 'pdf_merge' | 'pdf_split', details: string) => Promise<void>;
    upgradePlan: (plan: 'weekly' | 'monthly', paymentId: string) => Promise<void>;
    getTodayUsageCount: () => Promise<number>;
    getTotalUsageCount: () => Promise<number>;
    deleteAccount: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Subscribe to user profile changes in real-time
                const userRef = doc(db, 'users', firebaseUser.uid);
                const unsubProfile = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const profileData = docSnap.data() as UserProfile;

                        // Migration: Add planExpiresAt for existing paid users who don't have it
                        if (profileData.plan !== 'free' && !profileData.planExpiresAt) {
                            console.log("Migrating existing user: adding planExpiresAt");
                            const now = new Date();
                            let expiresAt: Date;
                            if (profileData.plan === 'weekly') {
                                expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
                            } else {
                                expiresAt = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000); // 31 days from now
                            }
                            await setDoc(userRef, { planExpiresAt: expiresAt.toISOString() }, { merge: true });
                            profileData.planExpiresAt = expiresAt.toISOString();
                        }

                        // Migration: Initialize totalUsage from history collection count
                        if (profileData.totalUsage === undefined) {
                            console.log("Migrating existing user: initializing totalUsage from history");
                            try {
                                const historyRef = collection(db, 'users', firebaseUser.uid, 'history');
                                const snapshot = await getCountFromServer(historyRef);
                                const historyCount = snapshot.data().count || 0;
                                // Also add any current daily usage that might not be in history
                                const dailyCount = profileData.usage?.count || 0;
                                const initialTotal = Math.max(historyCount, dailyCount);
                                await setDoc(userRef, { totalUsage: initialTotal }, { merge: true });
                                profileData.totalUsage = initialTotal;
                            } catch (e) {
                                console.error("Failed to migrate totalUsage:", e);
                                // Default to daily count if history fetch fails
                                const initialTotal = profileData.usage?.count || 0;
                                await setDoc(userRef, { totalUsage: initialTotal }, { merge: true });
                                profileData.totalUsage = initialTotal;
                            }
                        }

                        setProfile(profileData);
                    } else {
                        // Create default profile if not exists
                        // But first check if user is banned
                        const bannedRef = doc(db, 'deleted_users', firebaseUser.email || 'unknown');
                        const bannedSnap = await import('firebase/firestore').then(mod => mod.getDoc(bannedRef));

                        if (bannedSnap.exists()) {
                            const banData = bannedSnap.data();
                            const expiresAt = new Date(banData.expiresAt);
                            if (new Date() < expiresAt) {
                                // User is banned
                                await firebaseSignOut(auth);
                                alert(`Account creation is blocked for this email until ${expiresAt.toLocaleString()}.`);
                                return;
                            }
                        }

                        const newProfile: UserProfile = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            plan: 'free',
                            usage: { count: 0, date: new Date().toISOString().split('T')[0] },
                            createdAt: new Date().toISOString()
                        };
                        await setDoc(userRef, newProfile);
                        setProfile(newProfile);
                    }
                    setLoading(false);
                });

                return () => unsubProfile();
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        console.log("Initiating Google Popup Sign-In...");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user is in deleted_users (48h ban)
            if (user.email) {
                const bannedRef = doc(db, 'deleted_users', user.email);
                const bannedSnap = await import('firebase/firestore').then(mod => mod.getDoc(bannedRef));

                if (bannedSnap.exists()) {
                    const banData = bannedSnap.data();
                    const expiresAt = new Date(banData.expiresAt);

                    if (new Date() < expiresAt) {
                        await firebaseSignOut(auth);
                        throw new Error(`Account creation blocked until ${expiresAt.toLocaleString()} due to recent deletion.`);
                    }
                }
            }

            console.log("Popup Sign-In Success:", user.uid);
        } catch (error: any) {
            console.error("Popup Sign-In Error:", error);
            if (error?.code === 'auth/popup-blocked') {
                alert("Popup was blocked. Please allow popups for this site.");
            } else if (error?.code === 'auth/cancelled-popup-request') {
                console.warn("User closed the popup or there was a conflict.");
            } else {
                alert("Sign in failed: " + error.message);
            }
            throw error;
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    const deleteAccount = async () => {
        if (!user || !user.email) return;

        try {
            // 1. Mark email as banned for 48 hours
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

            await setDoc(doc(db, 'deleted_users', user.email), {
                email: user.email,
                deletedAt: now.toISOString(),
                expiresAt: expiresAt.toISOString()
            });

            // 2. Delete User Profile
            await import('firebase/firestore').then(mod => mod.deleteDoc(doc(db, 'users', user.uid)));

            // 3. Delete Auth User
            await user.delete();

            // Note: Use cleanup via security rules or admin SDK for subcollections if strict
            // Client-side can't easily delete all subcollections efficiently without listing them

        } catch (error: any) {
            console.error("Delete Account Error:", error);
            if (error.code === 'auth/requires-recent-login') {
                throw new Error("Please sign out and sign in again to verify your identity before deleting your account.");
            }
            throw error;
        }
    };

    const checkLimit = () => {
        const today = new Date().toISOString().split('T')[0];

        // Handle guest users (not logged in)
        if (!user || !profile) {
            const guestUsageStr = localStorage.getItem('guest_usage');
            if (!guestUsageStr) return true;

            try {
                const guestUsage = JSON.parse(guestUsageStr);
                if (guestUsage.date !== today) return true;
                return guestUsage.count < 2;
            } catch {
                return true;
            }
        }

        if (profile.plan !== 'free') return true; // Paid plans unlimited

        if (profile.usage.date !== today) return true; // New day, allow

        return profile.usage.count < 2;
    };

    const incrementUsage = async (tool: 'compress' | 'resize' | 'convert' | 'pdf' | 'pdf_merge' | 'pdf_split') => {
        const today = new Date().toISOString().split('T')[0];

        // Handle guest users (localStorage only)
        if (!user || !profile) {
            const guestUsageStr = localStorage.getItem('guest_usage');
            let count = 0;
            let total = 0;

            if (guestUsageStr) {
                try {
                    const guestUsage = JSON.parse(guestUsageStr);
                    if (guestUsage.date === today) {
                        count = guestUsage.count;
                    }
                    total = guestUsage.total || 0;
                } catch {
                    count = 0;
                    total = 0;
                }
            }

            if (count >= 2) return false;

            localStorage.setItem('guest_usage', JSON.stringify({
                count: count + 1,
                date: today,
                total: total + 1
            }));

            return true;
        }

        // Logged in users: use Firebase operations collection
        const operationsRef = collection(db, 'users', user.uid, 'operations');

        // Get today's start timestamp
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // For free users: check today's count first
        if (profile.plan === 'free') {
            const todayQuery = query(
                operationsRef,
                where('timestamp', '>=', Timestamp.fromDate(todayStart))
            );
            const snapshot = await getCountFromServer(todayQuery);
            const todayCount = snapshot.data().count;

            if (todayCount >= 2) return false;
        }

        // Add operation to Firebase
        await addDoc(operationsRef, {
            tool,
            timestamp: serverTimestamp()
        });

        // Update aggregate usage on user profile (required for checkLimit and security rules)
        // This allows 'checkLimit' to work synchronously with the real-time profile listener
        const userRef = doc(db, 'users', user.uid);
        const newCount = (profile.usage.date === today ? profile.usage.count : 0) + 1;

        await setDoc(userRef, {
            usage: {
                count: newCount,
                date: today
            }
        }, { merge: true });

        return true;
    };

    const logActivity = async (tool: 'compress' | 'resize' | 'convert' | 'pdf' | 'pdf_merge' | 'pdf_split', details: string) => {
        if (!user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'history'), {
                userId: user.uid,
                tool,
                details,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    };

    const upgradePlan = async (plan: 'weekly' | 'monthly', paymentId: string) => {
        if (!user) return;

        console.log("Attempting to upgrade plan for user:", user.uid, "to", plan);
        try {
            const userRef = doc(db, 'users', user.uid);

            // Calculate expiration date
            const now = new Date();
            let expiresAt: Date;
            if (plan === 'weekly') {
                expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
            } else {
                expiresAt = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000); // 31 days
            }

            // Check if user already has an active paid plan
            const hasActivePaidPlan = profile && profile.plan !== 'free' && profile.planExpiresAt && new Date(profile.planExpiresAt) > now;

            if (hasActivePaidPlan) {
                // Schedule the new plan to activate after current expires
                await setDoc(userRef, {
                    pendingPlan: plan,
                    pendingPaymentId: paymentId,
                    updatedAt: now.toISOString()
                }, { merge: true });
                console.log("Plan scheduled for after current plan expires.");
                setProfile(prev => prev ? { ...prev, pendingPlan: plan } : null);
            } else {
                // Activate immediately
                await setDoc(userRef, {
                    plan,
                    planExpiresAt: expiresAt.toISOString(),
                    pendingPlan: null, // Clear any pending
                    subscriptionStatus: 'active',
                    subscriptionId: paymentId,
                    updatedAt: now.toISOString()
                }, { merge: true });
                console.log("Firestore write successful!");
                setProfile(prev => prev ? { ...prev, plan, planExpiresAt: expiresAt.toISOString(), subscriptionStatus: 'active', pendingPlan: undefined } : null);
            }
        } catch (error) {
            console.error("FAILED to upgrade plan in Firestore:", error);
            throw error;
        }
    };

    // Get today's usage count from Firebase
    const getTodayUsageCount = async (): Promise<number> => {
        if (!user) {
            // Guest: get from localStorage
            const guestUsageStr = localStorage.getItem('guest_usage');
            if (guestUsageStr) {
                try {
                    const guestUsage = JSON.parse(guestUsageStr);
                    const today = new Date().toISOString().split('T')[0];
                    if (guestUsage.date === today) {
                        return guestUsage.count || 0;
                    }
                } catch {
                    return 0;
                }
            }
            return 0;
        }

        const operationsRef = collection(db, 'users', user.uid, 'operations');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayQuery = query(
            operationsRef,
            where('timestamp', '>=', Timestamp.fromDate(todayStart))
        );
        const snapshot = await getCountFromServer(todayQuery);
        return snapshot.data().count;
    };

    // Get total usage count from Firebase
    const getTotalUsageCount = async (): Promise<number> => {
        if (!user) {
            // Guest: get from localStorage
            const guestUsageStr = localStorage.getItem('guest_usage');
            if (guestUsageStr) {
                try {
                    const guestUsage = JSON.parse(guestUsageStr);
                    return guestUsage.total || 0;
                } catch {
                    return 0;
                }
            }
            return 0;
        }

        const operationsRef = collection(db, 'users', user.uid, 'operations');
        const snapshot = await getCountFromServer(operationsRef);
        return snapshot.data().count;
    };

    return (
        <UserContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, incrementUsage, checkLimit, logActivity, upgradePlan, getTodayUsageCount, getTotalUsageCount, deleteAccount }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

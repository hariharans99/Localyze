import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import type { UserProfile } from '../types';

interface UserContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    incrementUsage: () => Promise<boolean>;
    checkLimit: () => boolean;
    logActivity: (tool: 'compress' | 'resize' | 'convert' | 'pdf', details: string) => Promise<void>;
    upgradePlan: (plan: 'weekly' | 'monthly', paymentId: string) => Promise<void>;
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

                        setProfile(profileData);
                    } else {
                        // Create default profile if not exists
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
            console.log("Popup Sign-In Success:", result.user.uid);
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

    const incrementUsage = async () => {
        const today = new Date().toISOString().split('T')[0];

        // Handle guest users
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
                    // Reset if invalid
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

        if (profile.plan !== 'free') return true;

        let newCount = profile.usage.count;

        if (profile.usage.date !== today) {
            newCount = 0;
        }

        if (newCount >= 2) return false;

        // Optimistic update handled by Firestore subscription, but we write to DB
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            usage: {
                count: newCount + 1,
                date: today
            }
        }, { merge: true });

        return true;
    };

    const logActivity = async (tool: 'compress' | 'resize' | 'convert' | 'pdf', details: string) => {
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

    return (
        <UserContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, incrementUsage, checkLimit, logActivity, upgradePlan }}>
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

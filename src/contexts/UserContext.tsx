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
                        setProfile(docSnap.data() as UserProfile);
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
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
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

            if (guestUsageStr) {
                try {
                    const guestUsage = JSON.parse(guestUsageStr);
                    if (guestUsage.date === today) {
                        count = guestUsage.count;
                    }
                } catch {
                    // Reset if invalid
                    count = 0;
                }
            }

            if (count >= 2) return false;

            localStorage.setItem('guest_usage', JSON.stringify({
                count: count + 1,
                date: today
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
            await setDoc(userRef, {
                plan,
                subscriptionStatus: 'active',
                subscriptionId: paymentId,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log("Firestore write successful!");

            // Force update local state
            setProfile(prev => prev ? { ...prev, plan, subscriptionStatus: 'active' } : null);
        } catch (error) {
            console.error("FAILED to upgrade plan in Firestore:", error);
            throw error; // Re-throw so UI knows it failed
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

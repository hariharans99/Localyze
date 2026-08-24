import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type PlanConfig } from '../services/razorpay';
import { fetchUserActiveSubscription, recordVerifiedSubscription, fetchUserUsage, recordUserUsageIncrement } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface UserPass {
    planId: 'day' | 'week' | 'month';
    planName: string;
    activatedAt: number; // timestamp
    expiresAt: number; // timestamp
    paymentId: string;
}

interface PlanContextType {
    activePass: UserPass | null;
    isPro: boolean;
    usageCount: number;
    freeLimit: number;
    isFreeLimitReached: boolean;
    isUpgradeModalOpen: boolean;
    openUpgradeModal: () => void;
    closeUpgradeModal: () => void;
    checkCanProcess: () => boolean;
    incrementUsage: () => Promise<void>;
    activatePass: (plan: PlanConfig, paymentId: string) => Promise<void>;
    clearPass: () => void;
    getRemainingTimeFormatted: () => string | null;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const PASS_STORAGE_KEY = 'localyze_user_pass';
const FREE_LIMIT = 1;

export const PlanProvider = ({ children }: { children: ReactNode }) => {
    const { user, openAuthModal } = useAuth();
    const { info } = useToast();

    const [activePass, setActivePass] = useState<UserPass | null>(() => {
        try {
            const saved = localStorage.getItem(PASS_STORAGE_KEY);
            if (saved) {
                const parsed: UserPass = JSON.parse(saved);
                if (parsed.expiresAt > Date.now()) {
                    return parsed;
                } else {
                    localStorage.removeItem(PASS_STORAGE_KEY);
                }
            }
        } catch (e) {
            console.error('Failed to load user pass from storage', e);
        }
        return null;
    });

    const [usageCount, setUsageCount] = useState<number>(() => {
        try {
            if (user?.id) {
                const savedUsage = localStorage.getItem(`localyze_user_usage_${user.id}`);
                if (savedUsage !== null) {
                    return parseInt(savedUsage, 10) || 0;
                }
            }
        } catch (e) {
            console.error('Failed to read initial usage from storage', e);
        }
        return 0;
    });

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

    // Synchronize with Supabase whenever user logs in or switches accounts
    useEffect(() => {
        if (!user) {
            setUsageCount(0);
            return;
        }

        let isMounted = true;

        const syncUserData = async () => {
            try {
                // 1. Sync Subscription
                const verified = await fetchUserActiveSubscription(user.id);
                if (verified && isMounted) {
                    const pass: UserPass = {
                        planId: verified.plan_id as any,
                        planName: verified.plan_name,
                        activatedAt: new Date(verified.activated_at).getTime(),
                        expiresAt: new Date(verified.expires_at).getTime(),
                        paymentId: verified.payment_id
                    };
                    setActivePass(pass);
                    localStorage.setItem(PASS_STORAGE_KEY, JSON.stringify(pass));
                }

                // 2. Sync Usage Count from Supabase
                const dbUsage = await fetchUserUsage(user.id);
                if (isMounted) {
                    // Take the highest count between local storage and DB
                    const localUsageRaw = localStorage.getItem(`localyze_user_usage_${user.id}`);
                    const localUsage = localUsageRaw ? parseInt(localUsageRaw, 10) : 0;
                    const finalUsage = Math.max(dbUsage, localUsage);
                    setUsageCount(finalUsage);
                    localStorage.setItem(`localyze_user_usage_${user.id}`, finalUsage.toString());
                }
            } catch (err) {
                console.error('Error syncing Supabase user data:', err);
            }
        };

        syncUserData();

        return () => {
            isMounted = false;
        };
    }, [user]);

    useEffect(() => {
        // Check for expiration periodically (every 30 seconds)
        const interval = setInterval(() => {
            if (activePass && activePass.expiresAt <= Date.now()) {
                setActivePass(null);
                localStorage.removeItem(PASS_STORAGE_KEY);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [activePass]);

    const isPro = activePass !== null && activePass.expiresAt > Date.now();
    const isFreeLimitReached = !isPro && usageCount >= FREE_LIMIT;

    const openUpgradeModal = () => setIsUpgradeModalOpen(true);
    const closeUpgradeModal = () => setIsUpgradeModalOpen(false);

    /**
     * Centralized guard: Checks if user is authenticated and has available operations.
     * Returns true if allowed to proceed, false if blocked (and triggers appropriate modal).
     */
    const checkCanProcess = (): boolean => {
        if (!user) {
            info('Please sign in with Google to use Localyze tools (1 Free operation included).');
            openAuthModal();
            return false;
        }

        if (!isPro && usageCount >= FREE_LIMIT) {
            info('Free trial operation used (1/1). Upgrade to an ultra-affordable pass for unlimited processing.');
            openUpgradeModal();
            return false;
        }

        return true;
    };

    /**
     * Increment usage count for the authenticated user
     */
    const incrementUsage = async () => {
        if (!user) return;

        const nextCount = usageCount + 1;
        setUsageCount(nextCount);
        try {
            localStorage.setItem(`localyze_user_usage_${user.id}`, nextCount.toString());
        } catch (e) {
            console.error('Failed to store usage locally', e);
        }

        // Persist increment in Supabase
        try {
            await recordUserUsageIncrement(user.id, user.email || undefined);
        } catch (err) {
            console.error('Failed to persist usage in Supabase', err);
        }
    };

    const activatePass = async (plan: PlanConfig, paymentId: string) => {
        const now = Date.now();
        // If user already has an active unexpired pass, extend from the remaining expiry time
        const baseTime = (activePass && activePass.expiresAt > now) ? activePass.expiresAt : now;
        const durationMs = plan.durationDays * 24 * 60 * 60 * 1000;
        const expiresAt = baseTime + durationMs;

        const newPass: UserPass = {
            planId: plan.id,
            planName: plan.name,
            activatedAt: now,
            expiresAt,
            paymentId
        };

        setActivePass(newPass);
        setIsUpgradeModalOpen(false); // Auto-close upgrade modal on successful purchase

        try {
            localStorage.setItem(PASS_STORAGE_KEY, JSON.stringify(newPass));
        } catch (e) {
            console.error('Failed to save user pass', e);
        }

        // If user is authenticated, record verified subscription to Supabase database
        if (user) {
            try {
                await recordVerifiedSubscription(user, plan, paymentId, expiresAt);
            } catch (e) {
                console.error('Failed to record subscription to Supabase', e);
            }
        }
    };

    const clearPass = () => {
        setActivePass(null);
        localStorage.removeItem(PASS_STORAGE_KEY);
    };

    const getRemainingTimeFormatted = (): string | null => {
        if (!activePass || activePass.expiresAt <= Date.now()) return null;

        const diffMs = activePass.expiresAt - Date.now();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;

        if (diffDays > 0) {
            return `${diffDays}d ${remainingHours}h remaining`;
        }
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHours}h ${diffMins}m remaining`;
    };

    return (
        <PlanContext.Provider value={{
            activePass,
            isPro,
            usageCount,
            freeLimit: FREE_LIMIT,
            isFreeLimitReached,
            isUpgradeModalOpen,
            openUpgradeModal,
            closeUpgradeModal,
            checkCanProcess,
            incrementUsage,
            activatePass,
            clearPass,
            getRemainingTimeFormatted
        }}>
            {children}
        </PlanContext.Provider>
    );
};

export const usePlan = () => {
    const context = useContext(PlanContext);
    if (!context) {
        throw new Error('usePlan must be used within a PlanProvider');
    }
    return context;
};


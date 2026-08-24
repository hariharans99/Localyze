import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type PlanConfig } from '../services/razorpay';

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
    activatePass: (plan: PlanConfig, paymentId: string) => void;
    clearPass: () => void;
    getRemainingTimeFormatted: () => string | null;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const STORAGE_KEY = 'localyze_user_pass';

export const PlanProvider = ({ children }: { children: ReactNode }) => {
    const [activePass, setActivePass] = useState<UserPass | null>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed: UserPass = JSON.parse(saved);
                if (parsed.expiresAt > Date.now()) {
                    return parsed;
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch (e) {
            console.error('Failed to load user pass from storage', e);
        }
        return null;
    });

    useEffect(() => {
        // Check for expiration periodically (every 30 seconds)
        const interval = setInterval(() => {
            if (activePass && activePass.expiresAt <= Date.now()) {
                setActivePass(null);
                localStorage.removeItem(STORAGE_KEY);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [activePass]);

    const activatePass = (plan: PlanConfig, paymentId: string) => {
        const now = Date.now();
        const durationMs = plan.durationDays * 24 * 60 * 60 * 1000;
        const newPass: UserPass = {
            planId: plan.id,
            planName: plan.name,
            activatedAt: now,
            expiresAt: now + durationMs,
            paymentId
        };

        setActivePass(newPass);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newPass));
        } catch (e) {
            console.error('Failed to save user pass', e);
        }
    };

    const clearPass = () => {
        setActivePass(null);
        localStorage.removeItem(STORAGE_KEY);
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

    const isPro = activePass !== null && activePass.expiresAt > Date.now();

    return (
        <PlanContext.Provider value={{
            activePass,
            isPro,
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

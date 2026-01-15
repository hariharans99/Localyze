export type PlanType = 'free' | 'weekly' | 'monthly';

export interface UserUsage {
    count: number;
    date: string; // ISO date string YYYY-MM-DD
}

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    plan: PlanType;
    planExpiresAt?: string; // ISO date string when current plan expires
    pendingPlan?: PlanType; // Plan scheduled to activate after current expires
    subscriptionId?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due';
    usage: UserUsage;
    createdAt: string;
}

export interface ActivityLog {
    id: string;
    userId: string;
    tool: 'compress' | 'resize' | 'convert' | 'pdf';
    details: string;
    timestamp: string;
}

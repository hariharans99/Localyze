import { FaCrown, FaBolt, FaGoogle, FaShieldAlt, FaRocket } from 'react-icons/fa';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';

export const ToolUsageBanner = () => {
    const { isPro, usageCount, freeLimit, isFreeLimitReached, openUpgradeModal, getRemainingTimeFormatted } = usePlan();
    const { user, openAuthModal } = useAuth();

    if (isPro) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(255, 42, 68, 0.08)',
                border: '1px solid rgba(255, 42, 68, 0.25)',
                marginBottom: '1.5rem',
                fontSize: '0.82rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    <FaCrown style={{ color: '#fbbf24' }} />
                    <span>VIP Pass Active • Unlimited High-Speed Processing</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {getRemainingTimeFormatted()}
                </span>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--glass-border)',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)' }}>
                    <FaShieldAlt style={{ color: 'var(--color-primary)', fontSize: '1rem', flexShrink: 0 }} />
                    <div>
                        <span style={{ fontWeight: 600 }}>Sign in required to use tools</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.8rem' }}>
                            (Includes 1 Free Trial operation)
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={openAuthModal}
                    className="glass-btn-primary"
                    style={{
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    <FaGoogle style={{ color: '#ffffff' }} /> Sign in with Google
                </button>
            </div>
        );
    }

    if (isFreeLimitReached) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fca5a5' }}>
                    <FaBolt style={{ color: '#ef4444', fontSize: '1rem', flexShrink: 0 }} />
                    <div>
                        <span style={{ fontWeight: 700 }}>Free Trial Limit Reached ({usageCount}/{freeLimit} Used)</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.8rem' }}>
                            • Upgrade from ₹9 for unlimited operations.
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="glass-btn-primary"
                    style={{
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.8rem',
                        background: 'linear-gradient(135deg, #ff2a44 0%, #ff6b6b 100%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    <FaRocket /> Get Pass (from ₹9)
                </button>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem',
            fontSize: '0.82rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                <span style={{
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontWeight: 700,
                    fontSize: '0.75rem'
                }}>
                    Free Tier
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                    Usage: <strong style={{ color: 'var(--text-main)' }}>{usageCount}/{freeLimit}</strong> free operation available
                </span>
            </div>
            <button
                type="button"
                onClick={openUpgradeModal}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: 0
                }}
            >
                <FaBolt /> Get Unlimited Pass (₹9) &rarr;
            </button>
        </div>
    );
};

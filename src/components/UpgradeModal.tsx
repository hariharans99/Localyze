import { useState } from 'react';
import { FaTimes, FaBolt, FaRocket, FaCrown, FaCheck, FaLock, FaShieldAlt } from 'react-icons/fa';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PLANS, openRazorpayCheckout, type PlanConfig } from '../services/razorpay';

export const UpgradeModal = () => {
    const { isUpgradeModalOpen, closeUpgradeModal, activatePass, usageCount, freeLimit } = usePlan();
    const { user, openAuthModal } = useAuth();
    const { success, error, info } = useToast();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    if (!isUpgradeModalOpen) return null;

    const handleBuyPass = async (plan: PlanConfig) => {
        if (!user) {
            closeUpgradeModal();
            info('Please sign in with Google first.');
            openAuthModal();
            return;
        }

        setLoadingPlan(plan.id);

        try {
            await openRazorpayCheckout({
                plan,
                userId: user.id,
                userName: user.user_metadata?.name || user.email?.split('@')[0] || 'Localyze Member',
                userEmail: user.email || 'user@localyze.app',
                onSuccess: async (response) => {
                    await activatePass(plan, response.razorpay_payment_id);
                    success(`🎉 Instant Activation! You now have unlimited access with the ${plan.name}!`);
                    setLoadingPlan(null);
                    closeUpgradeModal();
                },
                onDismiss: () => {
                    info('Payment cancelled');
                    setLoadingPlan(null);
                }
            });
        } catch (err: any) {
            console.error('Pass purchase error:', err);
            error(err.message || 'Unable to open checkout modal. Please try again.');
            setLoadingPlan(null);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(5, 5, 8, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            overflowY: 'auto'
        }}>
            <div
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '850px',
                    borderRadius: 'var(--radius-2xl)',
                    padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px -10px rgba(255, 42, 68, 0.35)',
                    border: '1px solid var(--glass-border)',
                    position: 'relative',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={closeUpgradeModal}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'all 0.2s',
                        zIndex: 10
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    aria-label="Close modal"
                >
                    <FaTimes />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        margin: '0 auto 0.75rem auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: 'drop-shadow(0 6px 14px rgba(255, 42, 68, 0.45))'
                    }}>
                        <img
                            src="/logo.png"
                            alt="Localyze Logo"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.35rem 0.85rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(255, 42, 68, 0.15)',
                        border: '1px solid rgba(255, 42, 68, 0.35)',
                        color: 'var(--color-primary)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        marginBottom: '0.75rem'
                    }}>
                        <FaBolt /> Free Trial Limit Reached ({usageCount}/{freeLimit} Used)
                    </div>
                    <h2 className="text-gradient" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 800, marginBottom: '0.5rem' }}>
                        Unlock Unlimited Instant Processing
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.5' }}>
                        You've used your 1 free trial operation. Choose an ultra-affordable prepaid pass for unlimited, high-priority conversions with zero subscriptions.
                    </p>
                </div>

                {/* Pricing Passes Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '1.75rem',
                    paddingTop: '1rem'
                }}>
                    {/* 1-Day Pass */}
                    <div className="glass-card" style={{
                        padding: '1.5rem 1.25rem',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--glass-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)'
                    }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>24-HOUR PASS</span>
                                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)', background: 'rgba(255, 42, 68, 0.15)', color: 'var(--color-primary)', fontWeight: 600 }}>
                                    24 Hours
                                </span>
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>1-Day Pass</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹9</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ 1 day</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#f87171', marginBottom: '0.85rem', fontWeight: 600 }}>
                                • Strictly No Refund
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} /> 24 Hours Unlimited Access
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} /> All 7 Tools Unlocked
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} /> Bulk Multi-File Batch Mode
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} /> 1-Click ZIP Downloads
                                </li>
                            </ul>
                        </div>
                        <button
                            onClick={() => handleBuyPass(PLANS.day)}
                            disabled={loadingPlan === 'day'}
                            className="glass-btn-primary"
                            style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem' }}
                        >
                            <FaBolt /> {loadingPlan === 'day' ? 'Processing...' : 'Get 1-Day (₹9)'}
                        </button>
                    </div>

                    {/* 1-Week Sprint Pass (Featured) */}
                    <div className="glass-card" style={{
                        padding: '1.75rem 1.25rem 1.5rem 1.25rem',
                        borderRadius: 'var(--radius-xl)',
                        border: '2px solid var(--color-primary)',
                        boxShadow: '0 0 30px -8px rgba(255, 42, 68, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        overflow: 'visible',
                        background: 'rgba(255, 42, 68, 0.04)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-13px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'linear-gradient(135deg, #ff2a44 0%, #ff6b6b 100%)',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            padding: '0.3rem 0.9rem',
                            borderRadius: 'var(--radius-full)',
                            boxShadow: '0 4px 14px rgba(255, 42, 68, 0.75)',
                            whiteSpace: 'nowrap',
                            zIndex: 20,
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}>
                            ⭐ MOST POPULAR
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', marginTop: '0.25rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>7-DAY SPRINT</span>
                                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)', background: 'rgba(255, 42, 68, 0.15)', color: 'var(--color-primary)', fontWeight: 600 }}>
                                    7 Days
                                </span>
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>1-Week Pass</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹29</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ 7 days</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#f87171', marginBottom: '0.85rem', fontWeight: 600 }}>
                                • Strictly No Refund
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} /> 7 Days Unlimited Access
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} /> All 7 Tools Unlocked
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} /> Bulk Multi-File Batch Mode
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} /> High-Res 300 DPI Extractor
                                </li>
                            </ul>
                        </div>
                        <button
                            onClick={() => handleBuyPass(PLANS.week)}
                            disabled={loadingPlan === 'week'}
                            className="glass-btn-primary"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '0.9rem',
                                background: 'linear-gradient(135deg, #ff2a44 0%, #ff4b6b 100%)',
                                boxShadow: '0 0 15px -3px rgba(255, 42, 68, 0.6)'
                            }}
                        >
                            <FaRocket /> {loadingPlan === 'week' ? 'Processing...' : 'Get 1-Week (₹29)'}
                        </button>
                    </div>

                    {/* 1-Month Pro */}
                    <div className="glass-card" style={{
                        padding: '1.5rem 1.25rem',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--glass-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.03)'
                    }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b' }}>30-DAY PRO</span>
                                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                                    30 Days
                                </span>
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>1-Month Pro</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f59e0b' }}>₹69</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ month</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#f87171', marginBottom: '0.85rem', fontWeight: 600 }}>
                                • Strictly No Refund
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: '#f59e0b', flexShrink: 0 }} /> 30 Days Unlimited Access
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: '#f59e0b', flexShrink: 0 }} /> All 7 Tools Unlocked
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: '#f59e0b', flexShrink: 0 }} /> Bulk Multi-File Batch Mode
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FaCheck style={{ color: '#f59e0b', flexShrink: 0 }} /> VIP Priority & Zero Ads
                                </li>
                            </ul>
                        </div>
                        <button
                            onClick={() => handleBuyPass(PLANS.month)}
                            disabled={loadingPlan === 'month'}
                            className="glass-btn-primary"
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                fontSize: '0.85rem',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            }}
                        >
                            <FaCrown /> {loadingPlan === 'month' ? 'Processing...' : 'Get 1-Month (₹69)'}
                        </button>
                    </div>
                </div>

                {/* Trust Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                    textAlign: 'center',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '1rem'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaLock style={{ color: '#10b981' }} /> Razorpay 256-Bit SSL Encrypted
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaShieldAlt style={{ color: 'var(--color-primary)' }} /> 100% Prepaid • Strictly No Refunds • Zero Auto-Debits
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaBolt style={{ color: '#f59e0b' }} /> Instant Unlock
                    </span>
                </div>
            </div>
        </div>
    );
};


import { useState } from 'react';
import { FaCheck, FaBolt, FaCrown, FaRocket, FaShieldAlt, FaQuestionCircle, FaLock, FaRegClock } from 'react-icons/fa';
import { SEO } from '../components/SEO';
import { PLANS, openRazorpayCheckout, type PlanConfig } from '../services/razorpay';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const Pricing = () => {
    const { activePass, isPro, activatePass, getRemainingTimeFormatted } = usePlan();
    const { user, openAuthModal } = useAuth();
    const { success, error, info } = useToast();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const handleSubscribe = async (plan: PlanConfig) => {
        if (!user) {
            info('Please sign in with Google to secure your pass.');
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
                    success(`🎉 Success! Your ${plan.name} has been verified and activated!`);
                    setLoadingPlan(null);
                },
                onDismiss: () => {
                    info('Payment window closed');
                    setLoadingPlan(null);
                }
            });
        } catch (err: any) {
            console.error('Checkout error:', err);
            error(err.message || 'Unable to open checkout modal. Please try again.');
            setLoadingPlan(null);
        }
    };

    const faqs = [
        {
            q: 'Why are the plans so affordable?',
            a: 'Because all image and PDF operations are computed locally inside your own browser via WebAssembly & Web Workers. We have near-zero backend server computation costs, so we pass 100% of the savings back to you.'
        },
        {
            q: 'Is my payment secure?',
            a: 'Yes, 100%. All transactions are processed through Razorpay with bank-grade 256-bit SSL encryption. We never see or store your credit card or UPI details.'
        },
        {
            q: 'Do passes auto-renew?',
            a: 'No! These are 1-time prepaid passes with zero surprise renewals. When your pass expires, you simply return to the free plan unless you choose to buy another pass.'
        },
        {
            q: 'Are my files uploaded during processing?',
            a: 'Never. Localyze runs entirely client-side. Your photos, signatures, and confidential documents never leave your device.'
        }
    ];

    return (
        <div className="container" style={{ maxWidth: '1100px', margin: '1rem auto 4rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="Micro-Pricing Plans - Ultra-Affordable Day, Week & Monthly Passes | Localyze"
                description="Get instant 1-Day (₹9), 1-Week (₹29), or 1-Month (₹69) passes for unlimited high-priority local image and PDF operations."
            />

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <span className="neon-badge neon-badge-primary" style={{ marginBottom: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FaBolt /> Transparent Micro-Pricing
                </span>
                <h1 className="text-gradient" style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', marginBottom: '0.75rem', fontWeight: 800 }}>
                    Simple, Ultra-Affordable Passes
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
                    Pay only for what you need. Instant 1-click activation via UPI, Cards, NetBanking, and Wallets with Razorpay.
                </p>
            </div>

            {/* Active Pass Banner */}
            {isPro && activePass && (
                <div style={{
                    backgroundColor: 'rgba(255, 42, 68, 0.12)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.25rem 1.75rem',
                    marginBottom: '2.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: '0 0 30px -5px rgba(255, 42, 68, 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            color: '#ffffff',
                            boxShadow: '0 0 15px rgba(255, 42, 68, 0.6)'
                        }}>
                            <FaCrown />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                                {activePass.planName} Active
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <FaRegClock /> {getRemainingTimeFormatted()}
                            </div>
                        </div>
                    </div>
                    <span className="neon-badge neon-badge-success">
                        ✓ VIP Priority Enabled
                    </span>
                </div>
            )}

            {/* Pricing Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: '1.25rem',
                alignItems: 'stretch',
                marginBottom: '4rem',
                width: '100%',
                minWidth: 0,
                paddingTop: '1.25rem'
            }}>
                {/* Free Plan */}
                <div className="glass-card" style={{
                    padding: '1.75rem 1.5rem',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            STARTER
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                            Free Starter
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '2.25rem', fontWeight: 800 }}>₹0</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ forever</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1rem', fontWeight: 500 }}>
                            1 Free Operation Total
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Try Localyze with 1 free operation across any tool upon Google sign-in.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                            {[
                                '1 Free Operation Total (Any 1 Tool)',
                                'Single File Operations',
                                'Google Sign-in Required',
                                '100% In-Browser Privacy',
                                'Standard Processing Speed'
                            ].map((feat, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                                    <FaCheck style={{ color: '#10b981', flexShrink: 0 }} />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        disabled={true}
                        className="glass-btn-secondary"
                        style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', opacity: 0.7, cursor: 'default' }}
                    >
                        Current Plan
                    </button>
                </div>

                {/* 1-Day Pass */}
                <div className="glass-card" style={{
                    padding: '1.75rem 1.5rem',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                24-HOUR PASS
                            </span>
                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(255, 42, 68, 0.15)', color: 'var(--color-primary)', fontWeight: 600 }}>
                                24 Hours
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                            1-Day Pass
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹9</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ 1 day</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '1rem', fontWeight: 600 }}>
                            • Strictly No Refund
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Full unlimited access to all 7 tools for 24 hours. Ideal for one-time tasks and urgent exams.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                            {[
                                'Full 24-Hour Unlimited Access',
                                'All 7 Tools Completely Unlocked',
                                'Bulk Multi-File Batch Mode',
                                '1-Click ZIP Archive Downloads',
                                'High-Res 300 DPI PDF Extractor',
                                'Maximum Priority & Zero Ads'
                            ].map((feat, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => handleSubscribe(PLANS.day)}
                        disabled={loadingPlan === 'day'}
                        className="glass-btn-primary"
                        style={{ width: '100%', padding: '0.8rem', fontSize: '0.9rem' }}
                    >
                        <FaBolt /> {loadingPlan === 'day' ? 'Opening...' : 'Get 1-Day Pass (₹9)'}
                    </button>
                </div>

                {/* 1-Week Sprint Pass (Featured) */}
                <div className="glass-card" style={{
                    padding: '2rem 1.5rem 1.75rem 1.5rem',
                    borderRadius: 'var(--radius-xl)',
                    border: '2px solid var(--color-primary)',
                    boxShadow: '0 0 35px -8px rgba(255, 42, 68, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'visible',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #ff2a44 0%, #ff6b6b 100%)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        padding: '0.35rem 1rem',
                        borderRadius: 'var(--radius-full)',
                        boxShadow: '0 4px 16px rgba(255, 42, 68, 0.75)',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                    }}>
                        ⭐ MOST POPULAR
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                7-DAY SPRINT
                            </span>
                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(255, 42, 68, 0.15)', color: 'var(--color-primary)', fontWeight: 600 }}>
                                7 Days
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                            1-Week Pass
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹29</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ 7 days</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '1rem', fontWeight: 600 }}>
                            • Strictly No Refund
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Full unlimited access to all 7 tools for 7 full days. Perfect for project sprints and visa paperwork.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                            {[
                                'Full 7-Day Unlimited Access',
                                'All 7 Tools Completely Unlocked',
                                'Bulk Multi-File Batch Mode',
                                '1-Click ZIP Archive Downloads',
                                'High-Res 300 DPI PDF Extractor',
                                'Maximum Priority & Zero Ads'
                            ].map((feat, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                                    <FaCheck style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => handleSubscribe(PLANS.week)}
                        disabled={loadingPlan === 'week'}
                        className="glass-btn-primary"
                        style={{
                            width: '100%',
                            padding: '0.85rem',
                            fontSize: '0.95rem',
                            background: 'linear-gradient(135deg, #ff2a44 0%, #ff4b6b 100%)',
                            boxShadow: '0 0 20px -3px rgba(255, 42, 68, 0.6)'
                        }}
                    >
                        <FaRocket /> {loadingPlan === 'week' ? 'Opening...' : 'Get 1-Week Pass (₹29)'}
                    </button>
                </div>

                {/* 1-Month Pro Pass */}
                <div className="glass-card" style={{
                    padding: '1.75rem 1.5rem',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b' }}>
                                30-DAY PRO
                            </span>
                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                                30 Days
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                            1-Month Pro
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f59e0b' }}>₹69</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ month</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '1rem', fontWeight: 600 }}>
                            • Strictly No Refund
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Full unlimited access to all 7 tools for 30 full days. Maximum value for power users and students.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                            {[
                                'Full 30-Day Unlimited Access',
                                'All 7 Tools Completely Unlocked',
                                'Bulk Multi-File Batch Mode',
                                '1-Click ZIP Archive Downloads',
                                'High-Res 300 DPI PDF Extractor',
                                'VIP Supporter Priority & Zero Ads'
                            ].map((feat, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                                    <FaCheck style={{ color: '#f59e0b', flexShrink: 0 }} />
                                    <span>{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => handleSubscribe(PLANS.month)}
                        disabled={loadingPlan === 'month'}
                        className="glass-btn-primary"
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            fontSize: '0.9rem',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            boxShadow: '0 0 20px -3px rgba(245, 158, 11, 0.5)'
                        }}
                    >
                        <FaCrown /> {loadingPlan === 'month' ? 'Opening...' : 'Get 1-Month Pro (₹69)'}
                    </button>
                </div>
            </div>

            {/* Payment Trust Badges */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '2rem',
                flexWrap: 'wrap',
                marginBottom: '4rem',
                color: 'var(--text-muted)',
                fontSize: '0.85rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaLock style={{ color: '#10b981' }} /> Razorpay Bank-Grade Encryption
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaShieldAlt style={{ color: 'var(--color-primary)' }} /> 100% Prepaid • Strictly No Refunds • No Auto-Debits
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaBolt style={{ color: '#f59e0b' }} /> Instant Pass Activation
                </div>
            </div>

            {/* FAQ Section */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaQuestionCircle style={{ color: 'var(--color-primary)' }} /> Frequently Asked Questions
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
                    {[
                        ...faqs,
                        {
                            q: 'Can I get a refund for my pass?',
                            a: 'No. All pass purchases are strictly non-refundable. Because passes unlock instant and unlimited computational power across all tools immediately upon payment, all transactions are final.'
                        }
                    ].map((faq, idx) => (
                        <div key={idx}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                                {faq.q}
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                                {faq.a}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


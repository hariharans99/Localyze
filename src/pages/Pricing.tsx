import { FaCheck, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

import { useUser } from '../contexts/UserContext';
import { openRazorpay } from '../lib/razorpay';

export const Pricing = () => {

    const { user, signInWithGoogle, upgradePlan, profile } = useUser();
    const navigate = useNavigate();

    const handlePayment = (plan: 'weekly' | 'monthly', amount: number) => {
        if (!user) {
            alert("Please sign in first to purchase a plan.");
            signInWithGoogle();
            return;
        }

        // Check if user already has an active paid plan
        const now = new Date();
        const hasActivePaidPlan = profile && profile.plan !== 'free' && profile.planExpiresAt && new Date(profile.planExpiresAt) > now;

        if (hasActivePaidPlan) {
            const expiryDate = new Date(profile.planExpiresAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            alert(`You already have an active ${profile.plan === 'weekly' ? 'Weekly Pass' : 'Pro Monthly'} plan.\n\nPlease wait until it expires on ${expiryDate} before purchasing a new plan.`);
            return;
        }

        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
            alert("Razorpay Key ID is missing! Please set VITE_RAZORPAY_KEY_ID in .env");
            return;
        }

        openRazorpay({
            key: razorpayKey,
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            name: 'Localyze Pro',
            description: `${plan === 'weekly' ? '7 Days' : '30 Days'} Premium Access`,
            // image: 'https://via.placeholder.com/150', // Removed to fix network error
            prefill: {
                name: user.displayName || '',
                email: user.email || ''
            },
            theme: {
                color: '#6366f1'
            },
            handler: async (response: any) => {
                try {
                    // Check if user has active paid plan
                    const now = new Date();
                    const hasActivePaidPlan = profile && profile.plan !== 'free' && profile.planExpiresAt && new Date(profile.planExpiresAt) > now;

                    await upgradePlan(plan, response.razorpay_payment_id);

                    if (hasActivePaidPlan) {
                        alert(`Payment Successful! Your ${plan} plan will activate after your current plan expires.`);
                    } else {
                        alert(`Payment Successful! You are now on the ${plan} plan.`);
                    }
                    navigate('/');
                } catch (e) {
                    console.error(e);
                    alert('Failed to activate plan.');
                }
            }
        });
    };



    const plans = [
        {
            id: 'free',
            name: 'Free Starter',
            price: '₹0',
            amount: 0,
            period: 'forever',
            features: [
                '2 Tools per day',
                'Standard Speed',
                'secure Local Processing'
            ],
            notIncluded: [
                'Unlimited Usage',
                'Ad-free Experience'
            ],
            color: 'var(--text-muted)'
        },
        {
            id: 'weekly',
            name: 'Week Pass',
            price: '₹49',
            amount: 49,
            period: 'per week',
            recommended: false,
            features: [
                'Unlimited Usage',
                'No Ads',
                'High Speed Processing',
                'Secure Local Processing'
            ],
            notIncluded: [],
            color: 'var(--color-primary)'
        },
        {
            id: 'monthly',
            name: 'Pro Monthly',
            price: '₹149',
            amount: 149,
            period: 'per month',
            recommended: true,
            features: [
                'Unlimited Usage',
                'No Ads',
                'High Speed Processing',
                'Early Access to New Tools',
                'Secure Local Processing'
            ],
            notIncluded: [],
            color: 'var(--color-accent)'
        }
    ];

    return (
        <div className="container">
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 4rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                    Simple, Transparent Pricing
                </h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
                    Choose the plan that fits your needs.
                    <br />All plans include secure local processing.
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                alignItems: 'start'
            }}>
                {plans.map(plan => {
                    const isCurrent = profile?.plan === plan.id;
                    const now = new Date();
                    const hasActivePaidPlan = profile && profile.plan !== 'free' && profile.planExpiresAt && new Date(profile.planExpiresAt) > now;

                    // Disable button if: current plan, free tier, or user has active paid plan and trying to buy different plan
                    const isDisabled = isCurrent || plan.id === 'free' || (hasActivePaidPlan && !isCurrent);

                    // Determine button text
                    let buttonText: string;
                    if (isCurrent) {
                        buttonText = 'Current Plan';
                    } else if (plan.id === 'free') {
                        buttonText = profile?.plan === 'free' || !user ? 'Your Current Plan' : 'Free Tier';
                    } else if (!user) {
                        buttonText = 'Sign in to Subscribe';
                    } else if (hasActivePaidPlan) {
                        buttonText = 'Plan Active';
                    } else {
                        buttonText = 'Get it now';
                    }

                    return (
                        <div key={plan.id} style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-lg)',
                            border: `1px solid ${plan.recommended ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                            padding: '2rem',
                            position: 'relative',
                            boxShadow: plan.recommended ? 'var(--shadow-glow)' : 'var(--shadow-md)',
                            transform: plan.recommended ? 'scale(1.02)' : 'none'
                        }}>
                            {plan.recommended && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    padding: '0.25rem 1rem',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}>
                                    Most Popular
                                </div>
                            )}

                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{plan.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '2rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{plan.price}</span>
                                <span style={{ color: 'var(--text-muted)' }}>/ {plan.period}</span>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log("Clicked plan:", plan.id);
                                        if (plan.id === 'free') return;
                                        handlePayment(plan.id as 'weekly' | 'monthly', plan.amount);
                                    }}
                                    disabled={isDisabled}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: isDisabled ? 'none' : (plan.recommended ? 'none' : '1px solid var(--color-primary)'),
                                        backgroundColor: isDisabled ? 'var(--bg-surface-hover)' : (plan.recommended ? 'var(--color-primary)' : 'transparent'),
                                        color: isDisabled ? 'var(--text-muted)' : (plan.recommended ? 'white' : 'var(--color-primary)'),
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        cursor: isDisabled ? 'default' : 'pointer',
                                        boxShadow: plan.recommended && !isDisabled ? 'var(--shadow-md)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {buttonText}
                                </button>
                            </div>


                            <ul style={{ listStyle: 'none' }}>
                                {plan.features.map((feature, i) => (
                                    <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                                        <FaCheck style={{ color: '#10b981', flexShrink: 0 }} />
                                        <span style={{ color: 'var(--text-main)' }}>{feature}</span>
                                    </li>
                                ))}
                                {plan.notIncluded.map((feature, i) => (
                                    <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', opacity: 0.5 }}>
                                        <FaTimes style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

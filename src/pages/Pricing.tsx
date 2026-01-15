import { FaCheck, FaTimes } from 'react-icons/fa';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

export const Pricing = () => {
    const { user, profile } = useUser();
    const navigate = useNavigate();

    const handleSubscribe = (planId: string) => {
        if (!user) {
            navigate('/login');
            return;
        }
        // TODO: Integrate Razorpay
        console.log(`Subscribing to ${planId}`);
        alert(`Razorpay integration coming soon! You selected: ${planId}`);
    };

    const plans = [
        {
            id: 'free',
            name: 'Free Starter',
            price: '₹0',
            period: 'forever',
            features: [
                '2 Tools per day',
                'Standard Speed',
                'secure Local Processing'
            ],
            notIncluded: [
                'Unlimited Usage',
                'Ad-free Experience',
                'Priority Support'
            ],
            color: 'var(--text-muted)'
        },
        {
            id: 'weekly',
            name: 'Week Pass',
            price: '₹49',
            period: 'per week',
            recommended: false,
            features: [
                'Unlimited Usage',
                'No Ads',
                'High Speed Processing',
                'Priority Support'
            ],
            notIncluded: [],
            color: 'var(--color-primary)'
        },
        {
            id: 'monthly',
            name: 'Pro Monthly',
            price: '₹149',
            period: 'per month',
            recommended: true,
            features: [
                'Unlimited Usage',
                'No Ads',
                'High Speed Processing',
                'Priority Support',
                'Early Access to New Tools'
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
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={isCurrent || plan.id === 'free'}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        border: isCurrent ? 'none' : (plan.recommended ? 'none' : '1px solid var(--color-primary)'),
                                        backgroundColor: isCurrent ? 'var(--bg-surface-hover)' : (plan.recommended ? 'var(--color-primary)' : 'transparent'),
                                        color: isCurrent ? 'var(--text-muted)' : (plan.recommended ? 'white' : 'var(--color-primary)'),
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        cursor: isCurrent ? 'default' : 'pointer'
                                    }}
                                >
                                    {isCurrent ? 'Current Plan' : (plan.id === 'free' ? 'Your Current Plan' : 'Subscribe Now')}
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

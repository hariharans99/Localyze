import { SEO } from '../components/SEO';

export const Terms = () => {
    return (
        <div className="container" style={{ maxWidth: '800px', marginTop: '2rem', marginBottom: '4rem' }}>
            <SEO
                title="Terms & Conditions - Localyze"
                description="Terms of Service, Cancellation Policy, and Refund Policy for Localyze."
            />

            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Terms & Conditions</h1>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>1. Service Description</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                        Localyze provides local-first file processing tools. All file conversions and compressions happen directly in your browser. We do not store your files on our servers.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>2. Subscription Plans</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                        We offer two premium access plans:
                    </p>
                    <ul style={{ color: 'var(--text-muted)', marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li><strong>7 Day Pass:</strong> Provides unlimited access and ad-free experience for 7 consecutive days.</li>
                        <li><strong>30 Day Pro:</strong> Provides unlimited access and ad-free experience for 30 consecutive days.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>3. Cancellation Policy</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                        <strong>Non-Recurring:</strong> Our plans are one-time payments (passes). They do NOT auto-renew.
                        Therefore, there is no need to "cancel" a subscription. Your access will automatically expire at the end of the purchased period (7 days or 30 days).
                        You are free to purchase another pass whenever you need it.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ef4444' }}>4. Refund Policy</h2>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}>
                        <p style={{ lineHeight: '1.7', fontWeight: 500 }}>
                            Strict No-Refund Policy:
                        </p>
                        <p style={{ lineHeight: '1.7', marginTop: '0.5rem' }}>
                            Since Localyze provides immediate, intangible digital access to premium tools, <strong>all sales are final</strong>.
                            We do not offer refunds, returns, or exchanges for the "7 Day Pass" or "30 Day Pro" plans once payment is confirmed.
                        </p>
                        <p style={{ lineHeight: '1.7', marginTop: '0.5rem' }}>
                            Please verify that the free version meets your device compatibility needs before upgrading.
                        </p>
                    </div>
                </section>

                <section>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>5. Usage Limits</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                        Free tier users are limited to 2 operations per day. Premium users enjoy unlimited operations.
                        We reserve the right to ban users who attempt to abuse or bypass these limits via automated scripts or exploits.
                    </p>
                </section>

            </div>
        </div>
    );
};

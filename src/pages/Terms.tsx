import { SEO } from '../components/SEO';

export const Terms = () => {
    return (
        <div className="container" style={{ maxWidth: '800px', marginTop: '2rem', marginBottom: '4rem' }}>
            <SEO
                title="Terms & Privacy - Localyze"
                description="Terms of Service and Privacy Policy for Localyze."
            />

            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Terms & Privacy Policy</h1>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>1. Service Description</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                        Localyze provides 100% free, local-first image and PDF processing tools. All file conversions, compressions, splits, and merges happen directly inside your web browser using WebAssembly and client-side JavaScript.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>2. Privacy & Data Security</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                        Your files are never uploaded to any remote server or third-party storage. All processing occurs locally on your device, ensuring complete confidentiality and privacy for all your sensitive documents and images.
                    </p>
                </section>

                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>3. Free Trial & Affordable Passes</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                        Every registered user who signs in with Google receives 1 free high-precision operation across all tools. Unlimited operations and batch processing are available via ultra-affordable prepaid passes (1-Day, 1-Week, and 1-Month) with no automatic recurring renewals.
                    </p>
                </section>

                <section>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>4. Disclaimer</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                        The software is provided "as is", without warranty of any kind, express or implied. We recommend retaining backups of important files before processing.
                    </p>
                </section>

            </div>
        </div>
    );
};

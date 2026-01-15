import { Link } from 'react-router-dom';

export const Home = () => {
    return (
        <div className="container" style={{ textAlign: 'center', maxWidth: '800px', margin: '4rem auto' }}>
            <h1 style={{
                fontSize: '3.5rem',
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em'
            }}>
                <span className="text-gradient">Secure, Local</span> Image & PDF Tools
            </h1>
            <p style={{
                fontSize: '1.25rem',
                color: 'var(--text-muted)',
                marginBottom: '3rem',
                lineHeight: 1.6
            }}>
                Compress, resize, and convert files entirely in your browser.
                No server uploads, no privacy risks.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link to="/tools">
                    <button style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        padding: '0.75rem 2rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        boxShadow: 'var(--shadow-glow)',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                    }}>
                        Start for Free
                    </button>
                </Link>
            </div>
        </div>
    );
};

import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export const NotFound = () => {
    return (
        <div className="container" style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
        }}>
            <SEO title="Page Not Found" description="The page you are looking for does not exist." />
            <h1 className="text-gradient" style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
            <h2 style={{ marginBottom: '1rem' }}>Page Not Found</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Oops! The page you are looking for doesn't exist or has been moved.
            </p>
            <Link
                to="/"
                style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontWeight: 600
                }}
            >
                Go to Home
            </Link>
        </div>
    );
};

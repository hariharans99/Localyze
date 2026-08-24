import { Outlet, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { FaShieldAlt, FaBolt, FaLock } from 'react-icons/fa';

export const Layout = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
            {/* Ambient Background Glowing Atmospheric Orbs */}
            <div className="ambient-orb-container" aria-hidden="true">
                <div className="ambient-orb ambient-orb-1" />
                <div className="ambient-orb ambient-orb-2" />
                <div className="ambient-orb ambient-orb-3" />
            </div>

            <Navbar />

            <main style={{ flex: 1, padding: 'clamp(1.5rem, 4vw, 3rem) 0', position: 'relative', zIndex: 1 }}>
                <Outlet />
            </main>

            <footer style={{
                borderTop: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                padding: 'var(--spacing-2xl) 0 var(--spacing-xl)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                position: 'relative',
                zIndex: 1,
                boxShadow: 'var(--glass-highlight)'
            }}>
                <div className="container">
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <span className="neon-badge">
                            <FaLock style={{ fontSize: '0.75rem' }} /> 100% Client-Side Private
                        </span>
                        <span className="neon-badge neon-badge-success">
                            <FaBolt style={{ fontSize: '0.75rem' }} /> Zero Cloud Upload Latency
                        </span>
                        <span className="neon-badge neon-badge-purple">
                            <FaShieldAlt style={{ fontSize: '0.75rem' }} /> Free Forever
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem', fontWeight: 500 }}>
                        <Link to="/" style={{ color: 'var(--text-main)', transition: 'color 0.2s' }}>All Tools</Link>
                        <Link to="/terms" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>Terms & Privacy</Link>
                    </div>

                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                        &copy; {new Date().getFullYear()} <strong style={{ color: 'var(--text-main)' }}>Localyze</strong>. Private & High-Precision Image / PDF Toolkit.
                    </p>
                </div>
            </footer>
        </div>
    );
};

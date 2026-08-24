import { Link, useLocation } from 'react-router-dom';
import { FaSun, FaMoon, FaLayerGroup, FaShieldAlt } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

export const Navbar = () => {
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    return (
        <header style={{
            position: 'sticky',
            top: '1rem',
            zIndex: 100,
            padding: '0 1rem',
            marginBottom: '1rem'
        }}>
            <nav className="container glass-panel" style={{
                height: '68px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur-lg)',
                WebkitBackdropFilter: 'var(--glass-blur-lg)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25), var(--glass-highlight)'
            }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #00d2ff 0%, #6366f1 50%, #9d50bb 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '1.15rem',
                        boxShadow: '0 0 16px -2px rgba(0, 210, 255, 0.6)'
                    }}>
                        <FaLayerGroup />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            background: 'linear-gradient(135deg, #00d2ff 0%, #a855f7 50%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Localyze
                        </span>
                    </div>
                </Link>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link
                        to="/"
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: location.pathname === '/' ? 'var(--color-primary)' : 'var(--text-muted)',
                            backgroundColor: location.pathname === '/' ? 'rgba(0, 210, 255, 0.12)' : 'transparent',
                            border: `1px solid ${location.pathname === '/' ? 'rgba(0, 210, 255, 0.3)' : 'transparent'}`,
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        Tools
                    </Link>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        fontSize: '0.75rem',
                        color: '#10b981',
                        fontWeight: 600
                    }}>
                        <FaShieldAlt style={{ fontSize: '0.7rem' }} /> Local Only
                    </div>

                    <button
                        onClick={toggleTheme}
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid var(--glass-border)',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            fontSize: '1rem'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.borderColor = 'var(--glass-border)';
                            e.currentTarget.style.transform = 'none';
                        }}
                        aria-label="Toggle dark/light theme"
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark' ? <FaSun style={{ color: '#fbbf24' }} /> : <FaMoon style={{ color: '#6366f1' }} />}
                    </button>
                </div>
            </nav>
        </header>
    );
};

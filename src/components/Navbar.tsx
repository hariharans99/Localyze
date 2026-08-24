import { Link } from 'react-router-dom';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

export const Navbar = () => {
    const { theme, toggleTheme } = useTheme();

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
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: 'drop-shadow(0 0 12px rgba(255, 42, 68, 0.5))',
                        transition: 'transform 0.25s ease'
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            background: 'linear-gradient(135deg, #ff2a44 0%, #ff6b6b 50%, #ffa07a 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Localyze
                        </span>
                    </div>
                </Link>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
                        {theme === 'dark' ? <FaSun style={{ color: '#fbbf24' }} /> : <FaMoon style={{ color: '#ff2a44' }} />}
                    </button>
                </div>
            </nav>
        </header>
    );
};

import { Link } from 'react-router-dom';
import { FaSun, FaMoon, FaCrown, FaBolt } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';

export const Navbar = () => {
    const { theme, toggleTheme } = useTheme();
    const { isPro, activePass, getRemainingTimeFormatted } = usePlan();

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
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}>
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
                    {/* Pricing / VIP Badge */}
                    <Link
                        to="/pricing"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.45rem 1rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            ...(isPro ? {
                                background: 'linear-gradient(135deg, rgba(255, 42, 68, 0.2) 0%, rgba(255, 107, 107, 0.2) 100%)',
                                border: '1px solid var(--color-primary)',
                                color: '#ffffff',
                                boxShadow: '0 0 16px -2px rgba(255, 42, 68, 0.5)'
                            } : {
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-main)'
                            })
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isPro ? 'var(--color-primary)' : 'var(--glass-border)';
                            e.currentTarget.style.transform = 'none';
                        }}
                        title={isPro ? `${activePass?.planName} (${getRemainingTimeFormatted()})` : 'View Pricing Plans'}
                    >
                        {isPro ? (
                            <>
                                <FaCrown style={{ color: '#fbbf24', fontSize: '0.9rem' }} />
                                <span style={{ display: 'inline-block' }}>VIP Pass</span>
                            </>
                        ) : (
                            <>
                                <FaBolt style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }} />
                                <span>Plans from ₹9</span>
                            </>
                        )}
                    </Link>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid var(--glass-border)',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            fontSize: '0.95rem'
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

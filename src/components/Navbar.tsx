import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSun, FaMoon, FaCrown, FaBolt, FaUser, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';

export const Navbar = () => {
    const { theme, toggleTheme } = useTheme();
    const { isPro, activePass, getRemainingTimeFormatted } = usePlan();
    const { user, openAuthModal, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header style={{
            position: 'sticky',
            top: '0.75rem',
            zIndex: 100,
            padding: '0 clamp(0.5rem, 2.5vw, 1rem)',
            marginBottom: '1rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
        }}>
            <nav className="container glass-panel" style={{
                minHeight: '62px',
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem clamp(0.75rem, 2.5vw, 1.25rem)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur-lg)',
                WebkitBackdropFilter: 'var(--glass-blur-lg)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25), var(--glass-highlight)',
                width: '100%',
                boxSizing: 'border-box',
                gap: '0.5rem'
            }}>
                {/* Logo & Brand */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', minWidth: 0, flexShrink: 0 }}>
                    <div
                        className="nav-logo-icon"
                        style={{
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            filter: 'drop-shadow(0 0 10px rgba(255, 42, 68, 0.45))',
                            transition: 'transform 0.25s ease',
                            flexShrink: 0
                        }}
                    >
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
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                            className="nav-brand-text"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '1.3rem',
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                background: 'linear-gradient(135deg, #ff2a44 0%, #ff6b6b 50%, #ffa07a 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Localyze
                        </span>
                    </div>
                </Link>

                {/* Right Action Items */}
                <div style={{ display: 'flex', gap: 'clamp(0.35rem, 1.5vw, 0.6rem)', alignItems: 'center', flexShrink: 0 }}>
                    {/* Pricing / VIP Badge */}
                    <Link
                        to="/pricing"
                        className="nav-action-btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            whiteSpace: 'nowrap',
                            ...(isPro ? {
                                background: 'linear-gradient(135deg, rgba(255, 42, 68, 0.2) 0%, rgba(255, 107, 107, 0.2) 100%)',
                                border: '1px solid var(--color-primary)',
                                color: '#ffffff',
                                boxShadow: '0 0 14px -2px rgba(255, 42, 68, 0.45)'
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
                                <FaCrown style={{ color: '#fbbf24', fontSize: '0.85rem' }} />
                                <span>VIP</span>
                            </>
                        ) : (
                            <>
                                <FaBolt style={{ color: 'var(--color-primary)', fontSize: '0.8rem' }} />
                                <span className="nav-btn-text-full">Plans from ₹9</span>
                                <span className="nav-btn-text-short">₹9</span>
                            </>
                        )}
                    </Link>

                    {/* Auth Button or User Menu */}
                    {user ? (
                        <div ref={menuRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="nav-action-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: 'var(--radius-full)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 500
                                }}
                            >
                                <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: '0.65rem',
                                    flexShrink: 0
                                }}>
                                    {user.email ? user.email.charAt(0).toUpperCase() : <FaUser />}
                                </div>
                                <span className="nav-btn-text-full" style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.email?.split('@')[0]}
                                </span>
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                                <div
                                    className="glass-panel"
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 'calc(100% + 8px)',
                                        width: '220px',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '0.75rem',
                                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                                        border: '1px solid var(--glass-border)',
                                        zIndex: 100
                                    }}
                                >
                                    <div style={{ paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signed in as</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                                        {isPro && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                                                👑 {activePass?.planName}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => { setIsMenuOpen(false); signOut(); }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem 0.6rem',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            fontSize: '0.82rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <FaSignOutAlt /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => openAuthModal()}
                            className="nav-action-btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-main)',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                        >
                            <FaShieldAlt style={{ color: 'var(--color-primary)', fontSize: '0.78rem' }} />
                            <span>Sign In</span>
                        </button>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="nav-theme-btn"
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid var(--glass-border)',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            fontSize: '0.85rem',
                            flexShrink: 0
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

import { Link } from 'react-router-dom';
import { FaLayerGroup, FaUserCircle, FaSun, FaMoon } from 'react-icons/fa';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';

export const Navbar = () => {
    const { user, signOut } = useUser();
    const { theme, toggleTheme } = useTheme();

    return (
        <nav style={{
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-app)', /* Fallback/Base */
            position: 'sticky',
            top: 0,
            zIndex: 50,
            transition: 'border-color 0.3s ease, background-color 0.3s ease'
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'var(--bg-app)',
                opacity: 0.8,
                backdropFilter: 'blur(10px)',
                zIndex: -1
            }} />
            <div className="container" style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative'
            }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
                    <FaLayerGroup style={{ color: 'var(--color-primary)' }} />
                    <span>Localyze</span>
                </Link>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link to="/tools" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>Tools</Link>
                    <Link to="/pricing" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>Pricing</Link>

                    <button
                        onClick={toggleTheme}
                        style={{
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-full)',
                            transition: 'color 0.2s, background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <FaSun /> : <FaMoon />}
                    </button>

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {user.photoURL && (
                                <img src={user.photoURL} alt="User" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                            )}
                            <button
                                onClick={() => signOut()}
                                style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.9rem',
                                    fontWeight: 500
                                }}>
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <Link to="/login">
                            <button style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                fontWeight: 500,
                                transition: 'background-color 0.2s, border-color 0.2s, color 0.2s'
                            }}>
                                <FaUserCircle />
                                <span>Sign In</span>
                            </button>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

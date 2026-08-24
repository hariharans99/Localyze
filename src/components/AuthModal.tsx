import { useState } from 'react';
import { FaTimes, FaLock, FaEnvelope, FaShieldAlt, FaUserCheck, FaUserPlus, FaGoogle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const AuthModal = () => {
    const { isAuthModalOpen, closeAuthModal, authModalTab, openAuthModal, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
    const { success, error } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    if (!isAuthModalOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);

        if (!email.trim() || !password.trim()) {
            setAuthError('Please enter both email and password.');
            return;
        }

        if (password.length < 6) {
            setAuthError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);

        try {
            if (authModalTab === 'login') {
                const { error: signInErr } = await signInWithEmail(email, password);
                if (signInErr) {
                    setAuthError(signInErr.message);
                    error(signInErr.message);
                } else {
                    success('Signed in successfully!');
                    closeAuthModal();
                }
            } else {
                const { error: signUpErr } = await signUpWithEmail(email, password);
                if (signUpErr) {
                    setAuthError(signUpErr.message);
                    error(signUpErr.message);
                } else {
                    success('Account created successfully! Your pass will now be secured.');
                    closeAuthModal();
                }
            }
        } catch (err: any) {
            setAuthError(err.message || 'An unexpected error occurred.');
            error(err.message || 'Authentication error.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setAuthError(null);
        setIsLoading(true);
        try {
            const { error: googleErr } = await signInWithGoogle();
            if (googleErr) {
                setAuthError(googleErr.message);
                error(googleErr.message);
            }
        } catch (err: any) {
            setAuthError(err.message || 'Google authentication error');
            error(err.message || 'Google authentication error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(5, 5, 8, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
        }}>
            <div
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    borderRadius: 'var(--radius-2xl)',
                    padding: '2rem',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px -10px rgba(255, 42, 68, 0.4)',
                    border: '1px solid var(--glass-border)',
                    position: 'relative'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={closeAuthModal}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    <FaTimes />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'radial-gradient(circle, rgba(255, 42, 68, 0.25) 0%, rgba(255, 42, 68, 0.05) 100%)',
                        border: '1px solid rgba(255, 42, 68, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)',
                        fontSize: '1.35rem',
                        margin: '0 auto 0.75rem auto'
                    }}>
                        <FaShieldAlt />
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                        {authModalTab === 'login' ? 'Sign In to Localyze' : 'Create Secure Account'}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                        Safely verify and synchronize your passes across all devices.
                    </p>
                </div>

                {/* 1-Click Google Sign In */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.65rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginBottom: '1.25rem'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                >
                    <FaGoogle style={{ color: '#ea4335', fontSize: '1.05rem' }} />
                    <span>Continue with Google</span>
                </button>

                {/* Divider */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.25rem',
                    color: 'var(--text-dim)',
                    fontSize: '0.78rem'
                }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                    <span>OR EMAIL</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                </div>

                {/* Tab Switcher */}
                <div style={{
                    display: 'flex',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.25rem',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <button
                        type="button"
                        onClick={() => { setAuthError(null); openAuthModal('login'); }}
                        style={{
                            flex: 1,
                            padding: '0.45rem',
                            borderRadius: 'var(--radius-full)',
                            border: 'none',
                            backgroundColor: authModalTab === 'login' ? 'var(--color-primary)' : 'transparent',
                            color: authModalTab === 'login' ? '#ffffff' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAuthError(null); openAuthModal('signup'); }}
                        style={{
                            flex: 1,
                            padding: '0.45rem',
                            borderRadius: 'var(--radius-full)',
                            border: 'none',
                            backgroundColor: authModalTab === 'signup' ? 'var(--color-primary)' : 'transparent',
                            color: authModalTab === 'signup' ? '#ffffff' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Create Account
                    </button>
                </div>

                {/* Error Banner */}
                {authError && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: '#f87171',
                        fontSize: '0.82rem',
                        marginBottom: '1rem',
                        lineHeight: '1.4'
                    }}>
                        {authError}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                            Email Address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <FaEnvelope style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.85rem' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                required
                                className="glass-input"
                                style={{ width: '100%', paddingLeft: '2.5rem', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <FaLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.85rem' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="glass-input"
                                style={{ width: '100%', paddingLeft: '2.5rem', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="glass-btn-primary"
                        style={{
                            width: '100%',
                            padding: '0.85rem',
                            fontSize: '0.95rem',
                            marginTop: '0.25rem',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? (
                            'Authenticating...'
                        ) : authModalTab === 'login' ? (
                            <>
                                <FaUserCheck /> Sign In
                            </>
                        ) : (
                            <>
                                <FaUserPlus /> Create Account
                            </>
                        )}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Protected by Supabase Row-Level Security & 256-bit encryption.
                </div>
            </div>
        </div>
    );
};

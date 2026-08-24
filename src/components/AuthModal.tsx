import { useState } from 'react';
import { FaTimes, FaShieldAlt, FaGoogle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const AuthModal = () => {
    const { isAuthModalOpen, closeAuthModal, signInWithGoogle } = useAuth();
    const { error } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    if (!isAuthModalOpen) return null;

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
                    maxWidth: '400px',
                    borderRadius: 'var(--radius-2xl)',
                    padding: '2.25rem 2rem',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px -10px rgba(255, 42, 68, 0.4)',
                    border: '1px solid var(--glass-border)',
                    position: 'relative',
                    textAlign: 'center'
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
                    aria-label="Close modal"
                >
                    <FaTimes />
                </button>

                {/* Header Badge */}
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'radial-gradient(circle, rgba(255, 42, 68, 0.25) 0%, rgba(255, 42, 68, 0.05) 100%)',
                    border: '1px solid rgba(255, 42, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                    fontSize: '1.5rem',
                    margin: '0 auto 1.25rem auto'
                }}>
                    <FaShieldAlt />
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                    Sign in to Localyze
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.75rem', lineHeight: '1.45' }}>
                    1-Click sign in with your Google account to secure your passes and sync across devices.
                </p>

                {/* Error Banner */}
                {authError && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: '#f87171',
                        fontSize: '0.82rem',
                        marginBottom: '1.25rem',
                        lineHeight: '1.4',
                        textAlign: 'left'
                    }}>
                        {authError}
                    </div>
                )}

                {/* 1-Click Google Sign In */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: '0.9rem 1.25rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--glass-border)',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                        opacity: isLoading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 42, 68, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                    }}
                >
                    <FaGoogle style={{ color: '#ea4335', fontSize: '1.15rem' }} />
                    <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>

                <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                    🔒 Secured by Supabase Authentication & Row-Level Security. Zero passwords to remember.
                </div>
            </div>
        </div>
    );
};

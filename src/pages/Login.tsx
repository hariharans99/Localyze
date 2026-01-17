import { useNavigate } from 'react-router-dom';
import { FaGoogle, FaLayerGroup, FaUserCircle } from 'react-icons/fa';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { useEffect } from 'react';

export const Login = () => {
    const { signInWithGoogle, user } = useUser();
    const navigate = useNavigate();
    const toast = useToast();

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            navigate('/');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to sign in. Please try again.');
        }
    };

    return (
        <div className="container flex-center" style={{ minHeight: '60vh' }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        padding: '1rem',
                        background: 'var(--bg-app)',
                        borderRadius: '50%',
                        color: 'var(--color-primary)',
                        fontSize: '2rem'
                    }}>
                        <FaLayerGroup />
                    </div>
                </div>

                <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Welcome Back</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Sign in to access premium features.</p>

                <button
                    onClick={handleGoogleSignIn}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem',
                        backgroundColor: 'white',
                        color: '#1e293b',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                    <FaGoogle />
                    <span>Sign in with Google</span>
                </button>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    margin: '1.5rem 0',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem'
                }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }}></div>
                    <span>OR</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }}></div>
                </div>

                <button
                    onClick={() => navigate('/profile')}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem',
                        backgroundColor: 'var(--bg-app)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        transition: 'background-color 0.2s, border-color 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-app)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                >
                    <FaUserCircle />
                    <span>Continue as Guest</span>
                </button>
            </div>
        </div>
    );
};

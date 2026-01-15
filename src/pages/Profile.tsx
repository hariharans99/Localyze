import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import { FaCrown, FaHistory, FaBolt } from 'react-icons/fa';

export const Profile = () => {
    const { user, profile, loading, signInWithGoogle } = useUser();
    const toast = useToast();
    const [stats, setStats] = useState({
        totalOperations: 0,
        loading: true
    });
    const [guestStats, setGuestStats] = useState({ count: 0, total: 0 });

    useEffect(() => {
        if (loading) return;

        if (!user) {
            // Load guest stats
            try {
                const stored = localStorage.getItem('guest_usage');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const today = new Date().toISOString().split('T')[0];
                    setGuestStats({
                        count: parsed.date === today ? parsed.count : 0,
                        total: parsed.total || 0
                    });
                }
            } catch (e) {
                console.error("Failed to load guest stats", e);
            }
            setStats(s => ({ ...s, loading: false }));
            return;
        }

        const fetchStats = async () => {
            try {
                const historyRef = collection(db, 'users', user.uid, 'history');
                const snapshot = await getCountFromServer(historyRef);
                setStats({
                    totalOperations: snapshot.data().count,
                    loading: false
                });
            } catch (error: any) {
                console.error("Error fetching stats:", error);
                if (error?.code === 'not-found' || error?.message?.includes('database (default) does not exist')) {
                    toast.error("Firestore database not found. Please create it in Firebase Console.");
                } else {
                    toast.error("Failed to load usage stats.");
                }
                setStats(s => ({ ...s, loading: false }));
            }
        };

        fetchStats();
    }, [user, loading]);

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>Loading profile...</div>;
    }

    if (!user) {
        return (
            <div className="container" style={{ maxWidth: '800px', marginTop: '2rem' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '2rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-md)',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-app)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '3rem',
                            color: 'var(--text-muted)'
                        }}>
                            <FaUserCircleIcon />
                        </div>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Guest User</h1>
                            <p style={{ color: 'var(--text-muted)' }}>Sign in to save your history and upgrade limits.</p>
                            <button
                                onClick={signInWithGoogle}
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.5rem 1rem',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Sign In
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem'
                }}>
                    <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Today's Usage</h3>
                            <FaBolt style={{ color: '#eab308' }} />
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>
                            {guestStats.count} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 2</span>
                        </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Usage</h3>
                            <FaHistory style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>
                            {guestStats.total} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Total Operations</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>Loading user data...</div>;
    }

    const isPro = profile.plan !== 'free';

    return (
        <div className="container" style={{ maxWidth: '800px', marginTop: '2rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
                backgroundColor: 'var(--bg-surface)',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '2rem'
            }}>
                <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`}
                    alt={user.displayName || 'User'}
                    style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        border: `4px solid ${isPro ? 'var(--color-primary)' : 'var(--text-muted)'}`
                    }}
                />
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>{user.displayName}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: isPro ? 'rgba(79, 70, 229, 0.1)' : 'rgba(0,0,0,0.05)',
                        color: isPro ? 'var(--color-primary)' : 'var(--text-muted)',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                    }}>
                        {isPro ? <FaCrown /> : <FaUserCircleIcon />}
                        {profile.plan === 'weekly' ? 'Weekly Pass Active' :
                            profile.plan === 'monthly' ? 'Pro Monthly Active' : 'Free Starter Plan'}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem'
            }}>
                {/* Usage Card */}
                <div style={{
                    backgroundColor: 'var(--bg-surface)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Usage</h3>
                        <FaBolt style={{ color: '#eab308' }} />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {profile.usage.count}
                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {isPro ? ' / Unlimited' : ' / 2'}
                        </span>
                    </div>
                </div>

                {/* History Card */}
                <div style={{
                    backgroundColor: 'var(--bg-surface)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Usage</h3>
                        <FaHistory style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {profile.totalUsage || 0}
                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.5rem' }}>
                            Total Operations
                        </span>
                    </div>
                </div>

                {/* Plan Expiry Card - Only show for paid plans */}
                {isPro && (
                    <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-sm)',
                        gridColumn: '1 / -1'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plan Details</h3>
                            <FaCrown style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Current Plan</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                    {profile.plan === 'weekly' ? 'Weekly Pass' : 'Pro Monthly'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Expires On</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    {profile.planExpiresAt
                                        ? new Date(profile.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : 'Lifetime Access'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Time Remaining</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: profile.planExpiresAt && new Date(profile.planExpiresAt) > new Date() ? '#10b981' : profile.planExpiresAt ? '#ef4444' : '#10b981' }}>
                                    {(() => {
                                        if (!profile.planExpiresAt) return '∞ Unlimited';
                                        const now = new Date();
                                        const expiry = new Date(profile.planExpiresAt);
                                        const diff = expiry.getTime() - now.getTime();
                                        if (diff <= 0) return 'Expired';
                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                        if (days > 0) return `${days}d ${hours}h`;
                                        return `${hours}h`;
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FaUserCircleIcon = () => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 496 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
        <path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 96c48.6 0 88 39.4 88 88s-39.4 88-88 88-88-39.4-88-88 39.4-88 88-88zm0 344c-58.7 0-111.3-26.6-146.5-68.2 18.8-35.4 55.6-59.8 98.5-59.8 2.4 0 4.8.4 7.1 1.1 13 4.2 26.6 6.9 40.9 6.9 14.3 0 28-2.7 40.9-6.9 2.3-.7 4.7-1.1 7.1-1.1 42.9 0 79.7 24.4 98.5 59.8C359.3 421.4 306.7 448 248 448z"></path>
    </svg>
);

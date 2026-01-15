import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { db } from '../lib/firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import { FaCrown, FaHistory, FaBolt } from 'react-icons/fa';

export const Profile = () => {
    const { user, profile } = useUser();
    const [stats, setStats] = useState({
        totalOperations: 0,
        loading: true
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            try {
                // Determine collection path: users/{uid}/history
                const historyRef = collection(db, 'users', user.uid, 'history');
                const snapshot = await getCountFromServer(historyRef);
                setStats({
                    totalOperations: snapshot.data().count,
                    loading: false
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
                setStats(s => ({ ...s, loading: false }));
            }
        };

        fetchStats();
    }, [user]);

    if (!user || !profile) {
        return <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>Loading profile...</div>;
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
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Success Rate</h3>
                        <FaHistory style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {stats.loading ? '...' : stats.totalOperations}
                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.5rem' }}>
                            Successful Ops
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FaUserCircleIcon = () => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 496 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
        <path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 96c48.6 0 88 39.4 88 88s-39.4 88-88 88-88-39.4-88-88 39.4-88 88-88zm0 344c-58.7 0-111.3-26.6-146.5-68.2 18.8-35.4 55.6-59.8 98.5-59.8 2.4 0 4.8.4 7.1 1.1 13 4.2 26.6 6.9 40.9 6.9 14.3 0 28-2.7 40.9-6.9 2.3-.7 4.7-1.1 7.1-1.1 42.9 0 79.7 24.4 98.5 59.8C359.3 421.4 306.7 448 248 448z"></path>
    </svg>
);

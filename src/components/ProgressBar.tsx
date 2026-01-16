import React from 'react';

interface ProgressBarProps {
    progress: number; // 0 to 100
    label?: string;
    showPercentage?: boolean;
    estimatedSeconds?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    label = 'Processing...',
    showPercentage = true,
    estimatedSeconds
}) => {
    const [timeLeft, setTimeLeft] = React.useState<number | undefined>(estimatedSeconds);

    // Sync with prop when it changes
    React.useEffect(() => {
        if (estimatedSeconds !== undefined) {
            setTimeLeft(estimatedSeconds);
        }
    }, [estimatedSeconds]);

    // Countdown effect
    React.useEffect(() => {
        if (timeLeft === undefined || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === undefined || prev <= 0) return 0;
                // If progress is not complete (less than 99 to be safe), don't go below 1s
                // We use 99 because floating point progress might be 99.999
                if (progress < 99 && prev <= 1) return 1;
                return Math.max(0, prev - 1);
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft, progress]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${Math.ceil(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.ceil(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    return (
        <div style={{ marginBottom: '1.5rem', width: '100%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                color: 'var(--text-muted)'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>{label}</span>
                    {timeLeft !== undefined && timeLeft > 0 && (
                        <span style={{
                            color: 'var(--color-primary)',
                            fontWeight: 600,
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem'
                        }}>
                            ⏱️ {formatTime(timeLeft)}
                        </span>
                    )}
                </div>
                {showPercentage && <span>{Math.round(progress)}%</span>}
            </div>
            <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--bg-surface-hover)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${Math.max(0, Math.min(100, progress))}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-primary)',
                    transition: 'width 0.3s ease',
                    backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)',
                    backgroundSize: '1rem 1rem',
                    animation: 'progress-bar-stripes 1s linear infinite'
                }} />
                <style>{`
                    @keyframes progress-bar-stripes {
                        0% { background-position: 1rem 0; }
                        100% { background-position: 0 0; }
                    }
                `}</style>
            </div>
        </div>
    );
};

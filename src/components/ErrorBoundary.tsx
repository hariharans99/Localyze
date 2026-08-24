import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error in component tree:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '80vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div className="glass-panel" style={{
                        maxWidth: '550px',
                        width: '100%',
                        padding: '2.5rem',
                        borderRadius: 'var(--radius-xl)',
                        textAlign: 'center',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        boxShadow: '0 0 40px -10px rgba(239, 68, 68, 0.2)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.75rem',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            <FaExclamationTriangle />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Something went wrong</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                            An unexpected error occurred while processing your file. This may be due to a corrupted, unsupported, or password-protected format.
                        </p>
                        {this.state.error && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)',
                                color: '#f87171',
                                fontSize: '0.8rem',
                                fontFamily: 'monospace',
                                marginBottom: '2rem',
                                textAlign: 'left',
                                overflowX: 'auto'
                            }}>
                                {this.state.error.message || 'Unknown processing error'}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReset}
                                className="glass-btn-primary"
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <FaRedo /> Reload App
                            </button>
                            <a
                                href="/"
                                className="glass-btn-secondary"
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.95rem',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <FaHome /> Return Home
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

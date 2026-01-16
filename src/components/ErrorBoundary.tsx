import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="container" style={{
                    minHeight: '60vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: '1rem'
                }}>
                    <h1 className="text-gradient" style={{ fontSize: '2rem' }}>Oops! Something went wrong.</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        We encountered an unexpected error.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '1rem'
                        }}
                    >
                        Refresh Page
                    </button>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            maxWidth: '800px',
                            textAlign: 'left',
                            overflow: 'auto',
                            maxHeight: '300px'
                        }}>
                            <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>{this.state.error.toString()}</p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

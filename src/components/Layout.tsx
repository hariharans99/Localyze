import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AdBanner } from './AdBanner';

export const Layout = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <main style={{ flex: 1, padding: 'var(--spacing-xl) 0' }}>
                <Outlet />
            </main>
            <footer style={{
                borderTop: '1px solid var(--border-subtle)',
                padding: 'var(--spacing-lg) 0',
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontSize: '0.875rem'
            }}>
                <div className="container">
                    <AdBanner slot="1234567890" style={{ maxWidth: '728px', margin: '0 auto 2rem' }} />
                    <p>&copy; {new Date().getFullYear()} Localyze. 100% Local Image & PDF Tools.</p>
                </div>
            </footer>
        </div>
    );
};

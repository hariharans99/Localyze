import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Terms } from './pages/Terms';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlanProvider } from './contexts/PlanContext';

// Lazy load core tool components and pages
const ImageCompressor = lazy(() => import('./pages/tools/ImageCompressor').then(module => ({ default: module.ImageCompressor })));
const ImageResizer = lazy(() => import('./pages/tools/ImageResizer').then(module => ({ default: module.ImageResizer })));
const ImageConverter = lazy(() => import('./pages/tools/ImageConverter').then(module => ({ default: module.ImageConverter })));
const ImageToPdf = lazy(() => import('./pages/tools/ImageToPdf').then(module => ({ default: module.ImageToPdf })));
const PdfCompressor = lazy(() => import('./pages/tools/PdfCompressor').then(module => ({ default: module.PdfCompressor })));
const PdfToJpg = lazy(() => import('./pages/tools/PdfToJpg').then(module => ({ default: module.PdfToJpg })));
const PdfStudio = lazy(() => import('./pages/tools/PdfStudio').then(module => ({ default: module.PdfStudio })));
const Pricing = lazy(() => import('./pages/Pricing').then(module => ({ default: module.Pricing })));

// Frosted Glass Glowing Loading Component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1.25rem'
  }}>
    <div style={{
      position: 'relative',
      width: '56px',
      height: '56px'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-primary), #ff6b6b)',
        opacity: 0.35,
        filter: 'blur(10px)',
        animation: 'pulseGlow 2s ease-in-out infinite alternate'
      }} />
      <div style={{
        width: '100%',
        height: '100%',
        border: '3px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: 'var(--color-primary)',
        borderRightColor: '#ff6b6b',
        borderRadius: '50%',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
      }} />
    </div>
    <span style={{
      fontSize: '0.9rem',
      fontWeight: 500,
      color: 'var(--text-muted)',
      letterSpacing: '0.05em'
    }}>
      Loading...
    </span>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <PlanProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="pricing" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Pricing />
                </Suspense>
              } />
              <Route path="login" element={<Navigate to="/" replace />} />
              <Route path="profile" element={<Navigate to="/" replace />} />
              <Route path="tools">
                <Route index element={<Navigate to="/" replace />} />
                <Route path="compress" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ImageCompressor />
                  </Suspense>
                } />
                <Route path="resize" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ImageResizer />
                  </Suspense>
                } />
                <Route path="convert" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ImageConverter />
                  </Suspense>
                } />
                <Route path="pdf" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <ImageToPdf />
                  </Suspense>
                } />
                <Route path="compress-pdf" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <PdfCompressor />
                  </Suspense>
                } />
                <Route path="pdf-to-jpg" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <PdfToJpg />
                  </Suspense>
                } />
                <Route path="pdf-studio" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <PdfStudio />
                  </Suspense>
                } />
                {/* Backward compatibility redirects to unified All-in-One PDF Studio */}
                <Route path="merge-pdf" element={<Navigate to="/tools/pdf-studio" replace />} />
                <Route path="split-pdf" element={<Navigate to="/tools/pdf-studio" replace />} />
                <Route path="remove-pages" element={<Navigate to="/tools/pdf-studio" replace />} />
                <Route path="organize-pdf" element={<Navigate to="/tools/pdf-studio" replace />} />
              </Route>
            </Route>
            <Route path="terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </PlanProvider>
    </BrowserRouter >
  );
}

export default App;

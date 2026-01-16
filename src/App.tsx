import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Pricing } from './pages/Pricing';
import { Profile } from './pages/Profile';

// Lazy load heavy tool components
const ImageCompressor = lazy(() => import('./pages/tools/ImageCompressor').then(module => ({ default: module.ImageCompressor })));
const ImageResizer = lazy(() => import('./pages/tools/ImageResizer').then(module => ({ default: module.ImageResizer })));
const ImageConverter = lazy(() => import('./pages/tools/ImageConverter').then(module => ({ default: module.ImageConverter })));
const ImageToPdf = lazy(() => import('./pages/tools/ImageToPdf').then(module => ({ default: module.ImageToPdf })));
const PdfCompressor = lazy(() => import('./pages/tools/PdfCompressor').then(module => ({ default: module.PdfCompressor })));

// Loading component
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
    <div className="spinner" style={{
      width: '40px',
      height: '40px',
      border: '4px solid var(--border-subtle)',
      borderTopColor: 'var(--color-primary)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
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
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="profile" element={<Profile />} />
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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

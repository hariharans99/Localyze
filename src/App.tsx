import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { ImageCompressor } from './pages/tools/ImageCompressor';
import { ImageResizer } from './pages/tools/ImageResizer';
import { ImageConverter } from './pages/tools/ImageConverter';
import { ImageToPdf } from './pages/tools/ImageToPdf';
import { Pricing } from './pages/Pricing';
import { Profile } from './pages/Profile';

import { UserProvider } from './contexts/UserContext';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="profile" element={<Profile />} />
              <Route path="tools">
                <Route index element={<Navigate to="/" replace />} />
                <Route path="compress" element={<ImageCompressor />} />
                <Route path="resize" element={<ImageResizer />} />
                <Route path="convert" element={<ImageConverter />} />
                <Route path="pdf" element={<ImageToPdf />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </UserProvider>
  );
}

export default App;

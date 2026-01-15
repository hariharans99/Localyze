import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Tools } from './pages/Tools';
import { ImageCompressor } from './pages/tools/ImageCompressor';
import { ImageResizer } from './pages/tools/ImageResizer';
import { ImageConverter } from './pages/tools/ImageConverter';
import { ImageToPdf } from './pages/tools/ImageToPdf';
import { Pricing } from './pages/Pricing';

import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="tools">
              <Route index element={<Tools />} />
              <Route path="compress" element={<ImageCompressor />} />
              <Route path="resize" element={<ImageResizer />} />
              <Route path="convert" element={<ImageConverter />} />
              <Route path="pdf" element={<ImageToPdf />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;

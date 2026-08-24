# 🚀 Localyze

**100% Local, Private, Browser-Native Image & PDF Processing Suite**

Localyze is a privacy-first web application providing high-precision image and PDF tools operating entirely in your browser. No server uploads, no privacy risks, no paywalls, and no login walls—your files never leave your device.

Styled with the **Google Stitch Luminous Atmospheric Glassmorphism** design system.

---

## 📋 Table of Contents
- [✨ Features](#-features)
- [🎨 Google Stitch Glassmorphism](#-google-stitch-glassmorphism)
- [🔬 Core Logic & Precision Algorithms](#-core-logic--precision-algorithms)
- [🛠️ Technology Stack](#️-technology-stack)
- [📦 Installation & Local Setup](#-installation--local-setup)
- [📁 Project Structure](#-project-structure)
- [📄 Documentation](#-documentation)
- [📜 License](#-license)

---

## ✨ Features

### 🖼️ Image Tools
- **Precision Image Compressor**: Iterative 2-tier binary search to hit exact target file sizes (`20 KB`, `50 KB`, `100 KB`, `200 KB`, `500 KB`, `1 MB`, `2 MB`) with stepped anti-aliased downsampling.
- **Universal Format Converter**: Convert between `PNG`, `JPG`, `WebP`, `BMP`, `TIFF`, `HEIC`, `AVIF`, `SVG`, and `ICO` directly in the browser.
- **High-Fidelity Image Resizer**: Resize with aspect ratio locking and standard resolution presets (`720p`, `1080p`, `4K`).
- **Multi-Image to PDF**: Convert and arrange multiple images into standard A4 or image-fitted PDF documents with custom margins.

### 📄 PDF Tools
- **Precision PDF Compressor**: Target file size presets (`20 KB` to `5 MB`) with geometry and orientation preservation.
- **PDF to Image Converter**: Extract PDF pages into crisp `JPG`, `PNG`, or `WebP` files with selectable DPI (72 to 300 DPI).
- **PDF Merge Studio**: Combine multiple PDF documents into one with thumbnail previews and page order controls.
- **PDF Splitter**: Extract specific page numbers or ranges (`1-3, 5, 8-10`) with click-to-select visual thumbnails.
- **PDF Page Remover**: Delete unwanted pages visually and export a clean PDF without server transmission.

### 🔒 Privacy & Free Access
- **100% Client-Side Processing**: Canvas 2D, Web Workers, WebAssembly, and local Blob streams.
- **Zero Server Uploads**: Full privacy guarantee for sensitive government IDs, tax forms, and personal photos.
- **No Paywalls or Login Walls**: Completely open and unlimited usage.

---

## 🎨 Google Stitch Glassmorphism

- **Atmospheric Palette**: Deep cosmic void (`#0a0c14`), Electric Cyan (`#00d2ff`), Electric Violet (`#9d50bb`), Indigo (`#6366f1`), and Emerald (`#10b981`).
- **Frosted Acrylic Surfaces**: Multi-layer `backdrop-filter: blur(20px)` with physical specular top-edge refraction highlights.
- **Dynamic Ambient Lighting**: Floating, pulsating background orbs generating glowing depth behind interactive cards and panels.
- **Typography**: Google Fonts **Sora** (futuristic display headings) and **Inter** (precision data and control labels).

---

## 🔬 Core Logic & Precision Algorithms

1. **Stepped Anti-Aliasing Downsampler**: Prevents jagged edges and moiré patterns when scaling down large photos by iteratively halving dimensions before final scaling.
2. **2-Tier Adaptive Binary Search**: Performs binary search on JPEG quantization quality ($[0.01, 1.00]$). If minimum quality exceeds the target limit, it dynamically computes canvas downscaling area factors and re-executes fine quantization search.
3. **PDF Geometry Preservation**: Dynamically extracts page viewports (`pdfjs-dist`) and reconstructs individual pages in point units (`jsPDF`) to retain mixed portrait/landscape dimensions.
4. **Adaptive Page Budgeting**: Distributes file size targets across multi-page PDFs to optimize resolution without exceeding total file limits.

---

## 🛠️ Technology Stack

- **Framework**: React 19.2 + TypeScript 5.9
- **Build Tool**: Vite 7.3
- **Routing**: React Router 7.12
- **PDF Processing**: `pdf-lib`, `pdfjs-dist`, `jspdf`
- **Image Processing**: `heic2any`, `utif`, HTML5 Canvas
- **Archive Generation**: `jszip`
- **Icons**: React Icons (FontAwesome 5/6)

---

## 📦 Installation & Local Setup

### Prerequisites
- Node.js (v18 or higher)
- npm / yarn

### Run Locally
```bash
# 1. Clone repository
git clone https://github.com/hariharans99/Localyze.git
cd Localyze

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
Navigate to **`http://localhost:5173`** in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
Localyze/
├── src/
│   ├── components/       # Layout, Navbar, FileUploader, ProgressBar, SEO
│   ├── contexts/         # Toast notifications
│   ├── pages/
│   │   ├── Home.tsx      # Dashboard with glassmorphic tool cards
│   │   └── tools/        # 9 specialized image and PDF tool components
│   ├── styles/
│   │   └── theme.css     # Stitch atmospheric design tokens
│   ├── utils/
│   │   └── imageCompression.ts # Precision binary search & stepped downsample
│   ├── App.tsx           # Router configuration
│   └── index.css         # Glassmorphism utility classes & animations
└── SYSTEM_ARCHITECTURE_AND_FEATURES.md # Complete technical specification
```

---

## 📄 Documentation
For an in-depth technical analysis of all algorithms, mathematical formulas, and component lifecycles, see [`SYSTEM_ARCHITECTURE_AND_FEATURES.md`](./SYSTEM_ARCHITECTURE_AND_FEATURES.md).

---

## 📜 License
This project is open-source under the [MIT License](LICENSE).

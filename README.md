# 🚀 Localyze

**100% Local, Private, Browser-Native Image & PDF Suite with Razorpay Micro-Plans & Supabase Auth**

Localyze is a high-precision image and PDF tool suite operating entirely in your browser. All computations happen locally on client devices via WebAssembly, HTML5 Canvas, and Web Workers—your confidential documents and photos never leave your device.

Styled with the modern **Obsidian & Crimson Glassmorphism** design system.

---

## 📋 Table of Contents
- [✨ 7 Core Precision Tools](#-7-core-precision-tools)
- [💳 Razorpay Micro-Pricing & VIP Passes](#-razorpay-micro-pricing--vip-passes)
- [🛡️ Supabase Authentication & RLS Security](#️-supabase-authentication--rls-security)
- [🔬 Serverless Cryptographic Verification](#-serverless-cryptographic-verification)
- [🛠️ Technology Stack](#️-technology-stack)
- [📦 Installation & Local Setup](#-installation--local-setup)
- [🚀 Vercel Deployment](#-vercel-deployment)

---

## ✨ 7 Core Precision Tools

### 🖼️ Image Tools
1. **Precision Image Compressor**: Iterative 2-tier binary search to hit exact target file sizes (`20 KB`, `50 KB`, `100 KB`, `200 KB`, `500 KB`, `1 MB`, `2 MB`) with stepped anti-aliased downsampling.
2. **Universal Format Converter**: Batch convert between 9 formats (`PNG`, `JPG`, `WebP`, `BMP`, `TIFF`, `HEIC`, `AVIF`, `SVG`, `ICO`) with 1-click ZIP archive export.
3. **High-Fidelity Image Resizer**: Precise pixel dimensions, 1-click social presets (Instagram, TikTok, YouTube, Passport), and rotation aspect ratio preservation.
4. **Image to PDF Converter**: Arrange multi-image scans into standard PDF documents with independent 4-side margin controls and solid white paper backgrounds.

### 📄 PDF Tools
5. **All-in-One PDF Studio**: Visual drag-and-drop page reordering, 90° page rotation, click-to-delete page removal, page splitting, and merged master export.
6. **Precision PDF Compressor**: Target file size constraints (`20 KB` to `5 MB`) with multi-page budget allocation and DPI scaling.
7. **PDF to Image Extractor**: Selective page extraction (All, Odd, Even, Custom) to crystal-clear `JPG`, `PNG`, or `WebP` up to 300 DPI with ZIP download.

---

## 💳 Razorpay Micro-Pricing & VIP Passes

Localyze features ultra-affordable prepaid micro-passes for power users:

| Pass | Price | Duration | Highlights |
| :--- | :--- | :--- | :--- |
| **Free Forever** | **₹0** | Lifetime | Standard client-side processing, 100% private |
| **1-Day Ultra Pass** ⚡ | **₹9** | 24 Hours | Urgent gov/exam filings, batch processing |
| **1-Week Sprint Pass** ⭐ | **₹29** | 7 Days | Visa applications, project sprints, 300 DPI exports |
| **1-Month Pro Pass** 👑 | **₹69** | 30 Days | Complete unlimited VIP access & priority support |

---

## 🛡️ Supabase Authentication & RLS Security

- **Tamper-Proof Verification**: Authenticated user sessions (JWT) with Supabase Auth.
- **Row-Level Security (RLS)**: User subscription records are isolated so users can only view and manage their own subscriptions.
- **Multi-Device Synchronization**: Logging in on any phone or desktop instantly restores and validates active VIP passes.

---

## 🔬 Serverless Cryptographic Verification

- **`api/create-order.ts`**: Generates authentic Razorpay order IDs via Vercel Edge functions.
- **`api/verify-payment.ts`**: Verifies the cryptographic HMAC-SHA256 signature server-side before activating subscriptions in Supabase.
- **Zero Server Compute Costs**: Because file processing runs on the client browser, Vercel CPU execution time per payment is only $\approx 0.05\text{s}$, remaining 100% free on Vercel's Hobby Tier.

---

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript 5.9 + Vite 7.3
- **Styling**: Vanilla CSS Glassmorphism + Responsive Design System
- **Database & Auth**: Supabase (`@supabase/supabase-js`)
- **Payments**: Razorpay Checkout SDK + Vercel Edge Serverless Functions
- **PDF Engines**: `pdf-lib`, `pdfjs-dist`, `jspdf`
- **Image Engines**: `heic2any`, `utif`, HTML5 Canvas 2D
- **Archive Engine**: `jszip`

---

## 📦 Installation & Local Setup

```bash
# 1. Clone repository
git clone https://github.com/hariharans99/Localyze.git
cd Localyze

# 2. Install dependencies
npm install

# 3. Setup environment variables (copy .env.example)
cp .env.example .env

# 4. Start local development server
npm run dev
```

---

## 🚀 Vercel Deployment

Localyze is configured for 1-click zero-config Vercel deployment:
1. Push repository to GitHub.
2. Import project at [vercel.com/new](https://vercel.com/new).
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**!

---

## 📜 License
This project is open-source under the [MIT License](LICENSE).

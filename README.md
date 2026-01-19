# 🚀 Localyze

**Secure, Local-First Image & PDF Tools**

Localyze is a privacy-focused web application that provides powerful image and PDF processing tools entirely in your browser. No server uploads, no privacy risks—your files never leave your device.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-7.2-646cff.svg)

---

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Usage Guide](#-usage-guide)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Image Tools
- **🖼️ Image Compressor** - Reduce file size while maintaining quality
- **📐 Image Resizer** - Resize images to exact dimensions
- **🔄 Format Converter** - Convert between PNG, JPG, WEBP, BMP, TIFF, HEIC, AVIF, SVG & ICO
- **📄 Image to PDF** - Convert images into PDF documents

### PDF Tools
- **🗜️ PDF Compressor** - Reduce PDF size (optimized for government portals)
- **🔗 Merge PDF** - Combine multiple PDFs into one document
- **✂️ Split PDF** - Extract specific pages from a PDF
- **🖼️ PDF to JPG** - Convert PDF pages to JPG images
- **🗑️ Remove Pages** - Delete unwanted pages from your PDF

### Security & Privacy
- **100% Local Processing** - All file processing happens in your browser
- **No Server Uploads** - Your files never leave your device
- **Firebase Authentication** - Secure user authentication with Google Sign-In
- **Usage Tracking** - Daily usage limits for free users with optional upgrades

### Monetization
- **Razorpay Integration** - Secure payment processing for premium plans
- **Subscription Plans** - Week Pass and Pro Monthly options
- **Google AdSense** - Ad-supported free tier

---

## 🛠️ Technology Stack

### Frontend
- **React 19.2** - Modern UI library with latest features
- **TypeScript 5.9** - Type-safe development
- **Vite 7.2** - Lightning-fast build tool and dev server
- **React Router 7.12** - Client-side routing
- **React Icons** - Icon library for UI components

### Backend & Services
- **Firebase** - Authentication, Firestore database, and hosting
- **Firebase Admin** - Server-side Firebase operations
- **Razorpay** - Payment gateway integration

### File Processing Libraries
- **pdf-lib** - PDF manipulation and editing
- **pdfjs-dist** - PDF rendering and parsing
- **jsPDF** - PDF generation from images
- **JSZip** - ZIP file creation for downloads
- **heic2any** - HEIC/HEIF image conversion
- **utif** - TIFF image processing

### Development Tools
- **ESLint** - Code linting and formatting
- **TypeScript ESLint** - TypeScript-specific linting rules

---

## 📦 Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Firebase CLI** (for deployment)
- **Git**

### Clone the Repository
```bash
git clone https://github.com/your-username/Localyze.git
cd Localyze
```

### Install Dependencies
```bash
npm install
```

### Environment Setup
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure your `.env` file with the following variables:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   # Razorpay Configuration
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   ```

3. Set up Firebase:
   ```bash
   # Login to Firebase
   firebase login
   
   # Initialize Firebase (if not already done)
   firebase init
   ```

---

## 📖 Usage Guide

### Running Locally

#### Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

#### Build for Production
```bash
npm run build
```
The production-ready files will be in the `dist/` directory.

#### Preview Production Build
```bash
npm run preview
```

### Using the Tools

1. **Visit the Homepage** - Browse available tools
2. **Select a Tool** - Click on any tool card to access it
3. **Upload Files** - Drag & drop or click to select files
4. **Configure Settings** - Adjust quality, dimensions, or other options
5. **Process Files** - Click the process button
6. **Download Results** - Download processed files individually or as a ZIP

### Authentication

- **Guest Mode** - Use tools with daily usage limits
- **Sign In** - Sign in with Google for increased limits
- **Upgrade** - Purchase a subscription for unlimited usage

### Subscription Plans

- **Free** - 5 operations per day (guests) / 20 operations per day (signed-in users)
- **Week Pass** - Unlimited operations for 7 days (₹49)
- **Pro Monthly** - Unlimited operations for 30 days (₹99)

---

## ⚙️ Configuration

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** with Google Sign-In provider
3. Create a **Firestore Database** with the following collections:
   - `users` - User profiles and subscription data
   - `usage` - Daily usage tracking

4. Configure **Firestore Security Rules** (see `firestore.rules`)

### Razorpay Setup

1. Create a Razorpay account at [razorpay.com](https://razorpay.com)
2. Get your API keys from the dashboard
3. Add the keys to your `.env` file

### Google AdSense (Optional)

1. Apply for Google AdSense
2. Add your AdSense code to the application
3. Configure ad placements in the UI

---

## 📁 Project Structure

```
Localyze/
├── public/              # Static assets
│   ├── logo.png         # Application logo
│   └── favicon.ico      # Favicon
├── src/
│   ├── assets/          # Images and other assets
│   ├── components/      # Reusable React components
│   │   ├── SEO.tsx      # SEO meta tags component
│   │   └── ...
│   ├── contexts/        # React Context providers
│   │   └── UserContext.tsx  # User authentication & state
│   ├── lib/             # Utility libraries
│   │   └── firebase.ts  # Firebase configuration
│   ├── pages/           # Page components
│   │   ├── Home.tsx     # Homepage with tool cards
│   │   ├── Profile.tsx  # User profile & usage stats
│   │   ├── Pricing.tsx  # Subscription plans
│   │   └── tools/       # Individual tool pages
│   │       ├── ImageCompressor.tsx
│   │       ├── ImageResizer.tsx
│   │       ├── FormatConverter.tsx
│   │       ├── ImageToPdf.tsx
│   │       ├── PdfCompressor.tsx
│   │       ├── PdfMerge.tsx
│   │       ├── PdfSplit.tsx
│   │       ├── PdfToJpg.tsx
│   │       └── PdfRemovePages.tsx
│   ├── styles/          # CSS stylesheets
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Helper functions
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── functions/           # Firebase Cloud Functions
├── .env.example         # Example environment variables
├── firebase.json        # Firebase configuration
├── firestore.rules      # Firestore security rules
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

---

## 🔧 Development

### Code Style

This project uses ESLint for code quality. Run the linter with:
```bash
npm run lint
```

### Type Checking

TypeScript is configured for strict type checking:
```bash
npx tsc --noEmit
```

### Adding New Tools

1. Create a new component in `src/pages/tools/`
2. Add the tool to the `tools` array in `src/pages/Home.tsx`
3. Add a route in `src/App.tsx`
4. Implement the tool logic with local file processing
5. Add usage tracking for premium features

---

## 🚀 Deployment

### Deploy to Firebase Hosting

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy
```

### Deploy Functions (if applicable)

```bash
firebase deploy --only functions
```

### Continuous Deployment

Set up GitHub Actions or Firebase Hosting's automatic deployment from Git repositories.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started

1. **Fork the repository**
   ```bash
   git fork https://github.com/your-username/Localyze.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add comments for complex logic
   - Ensure TypeScript types are correct

4. **Test your changes**
   - Test all affected features
   - Ensure no regressions
   - Verify responsive design

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Provide a clear description of your changes
   - Link any related issues
   - Include screenshots for UI changes

### Contribution Guidelines

- **Code Quality** - Follow TypeScript and React best practices
- **Performance** - Optimize for browser performance and memory usage
- **Accessibility** - Ensure features are accessible to all users
- **Privacy** - Maintain local-first processing; never upload user files
- **Documentation** - Update README and comments as needed
- **Testing** - Test thoroughly before submitting

### Bug Reports

If you find a bug, please create an issue with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Browser and OS information

### Feature Requests

We love new ideas! Submit feature requests as issues with:
- Clear description of the feature
- Use case and benefits
- Any implementation ideas

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Localyze

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **React Team** - For the amazing UI library
- **Vite Team** - For the blazing-fast build tool
- **Firebase** - For backend services and hosting
- **pdf-lib & pdfjs-dist** - For PDF processing capabilities
- **All Contributors** - Thank you for your contributions!

---

## 📞 Support

- **GitHub Issues** - [Report bugs or request features](https://github.com/your-username/Localyze/issues)
- **Email** - support@localyze.com
- **Documentation** - [Wiki](https://github.com/your-username/Localyze/wiki)

---

## 🌟 Star Us!

If you find Localyze helpful, please give us a ⭐ on GitHub! It helps others discover the project.

---

**Made with ❤️ by the Localyze Team**

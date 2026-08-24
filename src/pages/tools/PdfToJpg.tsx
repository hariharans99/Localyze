import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaCog, FaRedo, FaImage, FaFileArchive } from 'react-icons/fa';
import { canvasToBlob } from '../../utils/imageCompression';
import { SEO } from '../../components/SEO';

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PagePreview {
    pageNum: number;
    thumbnail: string;
    jpgBlob: Blob | null;
    isConverting: boolean;
}

export const PdfToJpg = () => {
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PagePreview[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Settings
    const [quality, setQuality] = useState(0.85);
    const [scale, setScale] = useState(2.0); // 2.0 = ~144 DPI
    const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');

    useEffect(() => {
        if (pages.length > 0) {
            setPages(pages.map(p => ({ ...p, jpgBlob: null })));
        }
    }, [quality, scale, format]);

    const handleFileSelect = async (selectedFile: File | File[]) => {
        if (Array.isArray(selectedFile)) {
            if (selectedFile.length > 0) await loadPdf(selectedFile[0]);
        } else {
            await loadPdf(selectedFile);
        }
    };

    const loadPdf = async (pdfFile: File) => {
        try {
            setFile(pdfFile);
            setPages([]);
            setProgress(0);

            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const numPages = pdf.numPages;
            setTotalPages(numPages);

            const pagePreviewsTemp: PagePreview[] = [];
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (!context) throw new Error("Canvas context failed");
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                } as any).promise;

                const thumbnail = canvas.toDataURL('image/jpeg', 0.6);

                pagePreviewsTemp.push({
                    pageNum: i,
                    thumbnail,
                    jpgBlob: null,
                    isConverting: false
                });
            }

            setPages(pagePreviewsTemp);
            toast.success(`Loaded ${numPages} page${numPages > 1 ? 's' : ''}`);
        } catch (error) {
            console.error("Failed to load PDF:", error);
            toast.error("Failed to load PDF. File might be corrupted or protected.");
        }
    };

    const handleReset = () => {
        setPages([]);
        setProgress(0);
        setQuality(0.85);
        setScale(2.0);
        setFormat('image/jpeg');
    };

    const handleConvertAll = async () => {
        if (!file || pages.length === 0) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            const updatedPages: PagePreview[] = [];

            for (let i = 0; i < pages.length; i++) {
                const pageNum = pages[i].pageNum;
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (!context) throw new Error("Canvas context failed");
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                } as any).promise;

                const blob = await canvasToBlob(canvas, format, quality);

                // Zero canvas to free GPU memory
                canvas.width = 0;
                canvas.height = 0;

                updatedPages.push({
                    ...pages[i],
                    jpgBlob: blob,
                    isConverting: false
                });

                setProgress(Math.round(((i + 1) / pages.length) * 100));
            }

            setPages(updatedPages);
            const ext = format === 'image/jpeg' ? 'JPG' : format === 'image/webp' ? 'WebP' : 'PNG';
            toast.success(`Converted ${pages.length} page${pages.length > 1 ? 's' : ''} to ${ext}!`);

        } catch (error) {
            console.error("PDF conversion failed:", error);
            toast.error("Failed to convert PDF. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadPage = (pageNum: number) => {
        const page = pages.find(p => p.pageNum === pageNum);
        if (!page || !page.jpgBlob) return;

        const url = URL.createObjectURL(page.jpgBlob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
        const pdfName = file?.name.replace(/\.[^/.]+$/, '') || 'document';
        a.download = `${pdfName}-page-${pageNum}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadAll = async () => {
        const converted = pages.filter(p => p.jpgBlob);
        if (converted.length === 0) return;

        try {
            const zip = new JSZip();
            const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
            const pdfName = file?.name.replace(/\.[^/.]+$/, '') || 'document';

            pages.forEach(page => {
                if (page.jpgBlob) {
                    zip.file(`${pdfName}-page-${page.pageNum}.${ext}`, page.jpgBlob);
                }
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${pdfName}-extracted-images.zip`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success(`Downloaded ${converted.length} pages as ZIP file`);
        } catch (error) {
            console.error('Failed to create ZIP:', error);
            toast.error('Failed to create ZIP file');
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <SEO
                title="PDF to Image Converter - High-Res Extraction (JPG, WebP, PNG)"
                description="Extract pages from PDF documents to crisp JPG, WebP, or PNG images with customizable DPI resolution."
            />
            <h1 className="text-gradient" style={{ fontSize: '2.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                PDF to Image Converter
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                Convert document pages to high-resolution standalone images with selectable DPI and format options.
            </p>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept=".pdf,application/pdf" label="Upload PDF to Extract Images" maxSizeMB={100} />
                ) : (
                    <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', borderRadius: 'var(--radius-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.25rem', fontSize: '1.25rem' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{totalPages} page{totalPages > 1 ? 's' : ''} detected</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => document.getElementById('change-file-input')?.click()}
                                    className="glass-btn-secondary"
                                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                                >
                                    Change File
                                </button>
                                <input
                                    id="change-file-input"
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            handleFileSelect(e.target.files[0]);
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={handleReset}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        color: 'var(--text-muted)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <FaRedo /> Reset
                                </button>
                            </div>
                        </div>

                        {/* Settings Grid */}
                        <div style={{
                            marginBottom: '2rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-subtle)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1rem' }}>
                                <FaCog /> Output Quality & Format Controls
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                        Output Format
                                    </label>
                                    <select
                                        value={format}
                                        onChange={(e) => setFormat(e.target.value as any)}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.6rem' }}
                                    >
                                        <option value="image/jpeg">JPEG (.jpg - Standard)</option>
                                        <option value="image/webp">WebP (.webp - Compact)</option>
                                        <option value="image/png">PNG (.png - Lossless)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                        Resolution (DPI Scaling)
                                    </label>
                                    <select
                                        value={scale}
                                        onChange={(e) => setScale(parseFloat(e.target.value))}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.6rem' }}
                                    >
                                        <option value="1.0">Standard 72 DPI (Web/Email - Fast)</option>
                                        <option value="1.5">Balanced 108 DPI (Crisp Text)</option>
                                        <option value="2.0">High-Res 144 DPI (Print Quality)</option>
                                        <option value="3.0">Ultra-Sharp 216 DPI (Fine Detail)</option>
                                        <option value="4.16">Master 300 DPI (Archival)</option>
                                    </select>
                                </div>

                                {format !== 'image/png' && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                                            <span style={{ fontWeight: 600 }}>Quality: {(quality * 100).toFixed(0)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.3"
                                            max="1.0"
                                            step="0.05"
                                            value={quality}
                                            onChange={(e) => setQuality(parseFloat(e.target.value))}
                                            style={{ width: '100%', marginTop: '0.35rem', accentColor: 'var(--color-primary)' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Page Thumbnails & Conversion Cards */}
                        {pages.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Page Previews ({pages.length} Pages)</h4>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                    gap: '1rem',
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    padding: '0.75rem',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'rgba(0, 0, 0, 0.15)'
                                }}>
                                    {pages.map((page) => (
                                        <div
                                            key={page.pageNum}
                                            style={{
                                                border: page.jpgBlob ? '2px solid #10b981' : '1px solid var(--glass-border)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '0.65rem',
                                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                textAlign: 'center',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <img
                                                src={page.thumbnail}
                                                alt={`Page ${page.pageNum}`}
                                                style={{
                                                    width: '100%',
                                                    height: '130px',
                                                    objectFit: 'contain',
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: 'var(--radius-sm)',
                                                    marginBottom: '0.5rem'
                                                }}
                                            />
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                                Page {page.pageNum}
                                            </div>
                                            {page.jpgBlob ? (
                                                <button
                                                    onClick={() => downloadPage(page.pageNum)}
                                                    className="glass-btn-primary"
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.35rem',
                                                        fontSize: '0.75rem',
                                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                    }}
                                                >
                                                    <FaDownload /> Download
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleConvertAll}
                                disabled={isProcessing}
                                className="glass-btn-primary"
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    opacity: isProcessing ? 0.6 : 1
                                }}
                            >
                                <FaImage />
                                {isProcessing ? `Extracting Images... ${progress}%` : `Convert All ${pages.length} Pages`}
                            </button>

                            {pages.some(p => p.jpgBlob) && (
                                <button
                                    onClick={downloadAll}
                                    className="glass-btn-primary"
                                    style={{
                                        padding: '1rem 1.5rem',
                                        fontSize: '1rem',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)'
                                    }}
                                >
                                    <FaFileArchive /> Download All (ZIP)
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

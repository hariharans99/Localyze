import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCog, FaRedo, FaImage } from 'react-icons/fa';

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface PagePreview {
    pageNum: number;
    thumbnail: string;
    jpgBlob: Blob | null;
    isConverting: boolean;
}

export const PdfToJpg = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PagePreview[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Settings
    const [quality, setQuality] = useState(0.85); // JPEG Quality (0-1)
    const [scale, setScale] = useState(2.0); // Scale factor (2 = 144dpi)

    useEffect(() => {
        // Reset converted output when settings change
        if (pages.length > 0) {
            setPages(pages.map(p => ({ ...p, jpgBlob: null })));
        }
    }, [quality, scale]);

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

            // Generate thumbnails for all pages
            const pagePreviewsTemp: PagePreview[] = [];
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 }); // Small scale for thumbnails

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (!context) throw new Error("Canvas context failed");

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                } as any).promise;

                const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

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
    };

    const handleConvertAll = async () => {
        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

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
                const viewport = page.getViewport({ scale: scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (!context) throw new Error("Canvas context failed");

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                } as any).promise;

                // Convert to JPG
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const blob = await (await fetch(dataUrl)).blob();

                updatedPages.push({
                    ...pages[i],
                    jpgBlob: blob,
                    isConverting: false
                });

                // Update progress
                setProgress(Math.round(((i + 1) / pages.length) * 100));
            }

            setPages(updatedPages);
            await incrementUsage('pdf');
            toast.success(`Converted ${pages.length} page${pages.length > 1 ? 's' : ''} to JPG`);

        } catch (error) {
            console.error("PDF to JPG conversion failed:", error);
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
        a.download = `${file?.name.replace('.pdf', '')}-page-${pageNum}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadAll = async () => {
        try {
            const zip = new JSZip();
            const pdfName = file?.name.replace('.pdf', '') || 'converted';

            // Add all converted pages to the ZIP
            pages.forEach(page => {
                if (page.jpgBlob) {
                    zip.file(`${pdfName}-page-${page.pageNum}.jpg`, page.jpgBlob);
                }
            });

            // Generate ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // Download the ZIP file
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${pdfName}-all-pages.zip`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success(`Downloaded ${pages.filter(p => p.jpgBlob).length} pages as ZIP file`);
        } catch (error) {
            console.error('Failed to create ZIP:', error);
            toast.error('Failed to create ZIP file');
        }
    };

    const hasConvertedPages = pages.some(p => p.jpgBlob !== null);

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                PDF to JPG
            </h1>

            <AdBanner style={{ marginBottom: '2rem' }} />

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept=".pdf" label="Upload PDF to Convert" maxSizeMB={100} />
                ) : (
                    <div className="bg-surface p-8 rounded-lg border border-subtle">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)' }}>{totalPages} page{totalPages > 1 ? 's' : ''}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => document.getElementById('change-file-input')?.click()}
                                    style={{ color: 'var(--color-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
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
                                        fontWeight: 500,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <FaRedo /> Reset Settings
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaCog /> Conversion Settings
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Preset Buttons */}
                                <div>
                                    <label style={{ marginBottom: '0.5rem', display: 'block' }}>Quality Presets</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                        {[
                                            { label: 'Low', q: 0.5, s: 1.5, desc: 'Small Size' },
                                            { label: 'Medium', q: 0.7, s: 2.0, desc: 'Balanced' },
                                            { label: 'High', q: 0.9, s: 2.5, desc: 'Best Quality' }
                                        ].map(preset => (
                                            <button
                                                key={preset.label}
                                                onClick={() => {
                                                    setQuality(preset.q);
                                                    setScale(preset.s);
                                                }}
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${quality === preset.q && scale === preset.s ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                                    backgroundColor: quality === preset.q && scale === preset.s ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
                                                    color: quality === preset.q && scale === preset.s ? 'var(--color-primary)' : 'var(--text-main)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{preset.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{preset.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Quality Slider */}
                                <div>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>JPEG Quality ({(quality * 100).toFixed(0)}%)</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Higher = Better Quality</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.3"
                                        max="1.0"
                                        step="0.05"
                                        value={quality}
                                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                {/* Resolution */}
                                <div>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Resolution (DPI)</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Higher = Sharper</span>
                                    </label>
                                    <select
                                        value={scale}
                                        onChange={(e) => setScale(parseFloat(e.target.value))}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-subtle)',
                                            backgroundColor: 'var(--bg-surface)'
                                        }}
                                    >
                                        <option value="1.0">Low (72 DPI)</option>
                                        <option value="1.5">Medium (108 DPI)</option>
                                        <option value="2.0">High (144 DPI) - Recommended</option>
                                        <option value="2.5">Very High (180 DPI)</option>
                                        <option value="3.0">Ultra (216 DPI)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Page Previews */}
                        {pages.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h4 style={{ marginBottom: '1rem' }}>Pages ({pages.length})</h4>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: '1rem',
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    padding: '1rem',
                                    backgroundColor: 'var(--bg-app)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    {pages.map(page => (
                                        <div key={page.pageNum} style={{
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '0.5rem',
                                            backgroundColor: 'var(--bg-surface)',
                                            textAlign: 'center'
                                        }}>
                                            <img
                                                src={page.thumbnail}
                                                alt={`Page ${page.pageNum}`}
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    marginBottom: '0.5rem',
                                                    borderRadius: 'var(--radius-sm)'
                                                }}
                                            />
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                Page {page.pageNum}
                                            </div>
                                            {page.jpgBlob && (
                                                <button
                                                    onClick={() => downloadPage(page.pageNum)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.4rem',
                                                        fontSize: '0.8rem',
                                                        backgroundColor: 'var(--color-primary)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-sm)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    <FaDownload size={10} /> Download
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {hasConvertedPages ? (
                            <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1rem',
                                border: '1px solid #10b981'
                            }}>
                                <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Conversion Complete!</h3>
                                <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                    Download individual pages above or download all as a ZIP file
                                </p>
                                <button
                                    onClick={downloadAll}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <FaDownload /> Download All as ZIP
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConvertAll}
                                disabled={isProcessing || pages.length === 0}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    backgroundColor: isProcessing ? 'var(--bg-surface-hover)' : 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    cursor: isProcessing ? 'wait' : 'pointer',
                                    border: 'none',
                                    opacity: isProcessing ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <FaImage />
                                {isProcessing ? `Converting... ${progress}%` : `Convert ${pages.length} Page${pages.length > 1 ? 's' : ''} to JPG`}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How it Works</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload your PDF</strong>: Select any PDF document from your device.</li>
                    <li><strong>Preview Pages</strong>: See thumbnails of all pages in your PDF.</li>
                    <li><strong>Choose Quality</strong>: Select preset options or fine-tune quality and resolution settings.</li>
                    <li><strong>Convert</strong>: Click the convert button to transform all pages to JPG images.</li>
                    <li><strong>Download</strong>: Download individual pages or all at once. All processing happens 100% on your device.</li>
                </ol>
            </div>

            <AdBanner />
        </div>
    );
};

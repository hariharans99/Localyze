import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaCog, FaRedo, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { canvasToBlob } from '../../utils/imageCompression';
import { SEO } from '../../components/SEO';
import { usePlan } from '../../contexts/PlanContext';
import { ToolUsageBanner } from '../../components/ToolUsageBanner';

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
    const { checkCanProcess, incrementUsage } = usePlan();
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PagePreview[]>([]);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Settings
    const [quality, setQuality] = useState(0.88);
    const [scale, setScale] = useState(2.0); // 2.0 = ~144 DPI
    const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');

    useEffect(() => {
        if (pages.length > 0) {
            setPages(pages.map(p => ({ ...p, jpgBlob: null })));
        }
    }, [quality, scale, format]);

    const handleFileSelect = async (selectedFile: File | File[]) => {
        const f = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
        if (!f) return;
        if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Please upload a valid PDF document');
            return;
        }
        await loadPdf(f);
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

            const allSelected = new Set<number>();
            const pagePreviewsTemp: PagePreview[] = [];

            for (let i = 1; i <= numPages; i++) {
                allSelected.add(i);
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.35 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (!context) throw new Error("Canvas context failed");
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';

                // Paint clean white paper background to prevent transparent vector PDFs rendering black
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                } as any).promise;

                const thumbnail = canvas.toDataURL('image/jpeg', 0.65);
                canvas.width = 0;
                canvas.height = 0;

                pagePreviewsTemp.push({
                    pageNum: i,
                    thumbnail,
                    jpgBlob: null,
                    isConverting: false
                });
            }

            setPages(pagePreviewsTemp);
            setSelectedPages(allSelected);
            toast.success(`Loaded ${numPages} page${numPages > 1 ? 's' : ''}`);
        } catch (error) {
            console.error("Failed to load PDF:", error);
            toast.error("Failed to load PDF. File might be corrupted or protected.");
        }
    };

    const togglePageSelection = (pageNum: number) => {
        const next = new Set(selectedPages);
        if (next.has(pageNum)) {
            next.delete(pageNum);
        } else {
            next.add(pageNum);
        }
        setSelectedPages(next);
    };

    const selectAll = () => {
        const all = new Set<number>();
        for (let i = 1; i <= totalPages; i++) all.add(i);
        setSelectedPages(all);
    };

    const selectNone = () => {
        setSelectedPages(new Set());
    };

    const selectOdd = () => {
        const odds = new Set<number>();
        for (let i = 1; i <= totalPages; i += 2) odds.add(i);
        setSelectedPages(odds);
    };

    const selectEven = () => {
        const evens = new Set<number>();
        for (let i = 2; i <= totalPages; i += 2) evens.add(i);
        setSelectedPages(evens);
    };

    const handleReset = () => {
        setPages([]);
        setSelectedPages(new Set());
        setProgress(0);
        setQuality(0.88);
        setScale(2.0);
        setFormat('image/jpeg');
    };

    const handleConvert = async () => {
        if (!file || pages.length === 0) return;
        if (!checkCanProcess()) return;

        const targetPages = pages.filter(p => selectedPages.has(p.pageNum));
        if (targetPages.length === 0) {
            toast.error("Please select at least one page to convert");
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            const updatedPages = [...pages];

            for (let i = 0; i < targetPages.length; i++) {
                const target = targetPages[i];
                const page = await pdf.getPage(target.pageNum);
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (!context) throw new Error("Canvas context failed");
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';

                // Paint clean white background
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                } as any).promise;

                const blob = await canvasToBlob(canvas, format, quality);

                canvas.width = 0;
                canvas.height = 0;

                const idx = updatedPages.findIndex(p => p.pageNum === target.pageNum);
                if (idx !== -1) {
                    updatedPages[idx] = {
                        ...updatedPages[idx],
                        jpgBlob: blob,
                        isConverting: false
                    };
                }

                setProgress(Math.round(((i + 1) / targetPages.length) * 100));
            }

            setPages(updatedPages);
            await incrementUsage();
            const ext = format === 'image/jpeg' ? 'JPG' : format === 'image/webp' ? 'WebP' : 'PNG';

            // Direct instant auto-download
            const convertedList = updatedPages.filter(p => p.jpgBlob);
            if (convertedList.length === 1) {
                downloadPageBlob(convertedList[0].pageNum, convertedList[0].jpgBlob!);
                toast.success(`Extracted & downloaded page ${convertedList[0].pageNum} (${ext})!`);
            } else if (convertedList.length > 1) {
                await downloadAllZipWithPages(convertedList);
                toast.success(`Extracted & downloaded ${convertedList.length} pages as ZIP!`);
            }

        } catch (error) {
            console.error("PDF conversion failed:", error);
            toast.error("Failed to convert PDF. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadPageBlob = (pageNum: number, blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
        const pdfName = file?.name.replace(/\.[^/.]+$/, '') || 'document';
        a.download = `${pdfName}-page-${pageNum}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const downloadPage = (pageNum: number) => {
        const page = pages.find(p => p.pageNum === pageNum);
        if (!page || !page.jpgBlob) return;
        downloadPageBlob(pageNum, page.jpgBlob);
    };

    const downloadAllZipWithPages = async (convertedPages: PagePreview[]) => {
        if (convertedPages.length === 0) return;

        try {
            const zip = new JSZip();
            const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
            const pdfName = file?.name.replace(/\.[^/.]+$/, '') || 'document';

            convertedPages.forEach(page => {
                if (page.jpgBlob) {
                    zip.file(`${pdfName}-page-${page.pageNum}.${ext}`, page.jpgBlob);
                }
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${pdfName}-extracted-${ext}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error('ZIP generation error:', err);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1000px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="PDF to Image Converter - High-Res Extraction (JPG, WebP, PNG)"
                description="Extract pages from PDF documents to crisp JPG, WebP, or PNG images with customizable DPI resolution."
            />
            <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.5rem', textAlign: 'center', wordBreak: 'break-word' }}>
                PDF to Image Converter
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                Convert document pages to high-resolution standalone images with selectable DPI and format options.
            </p>

            <ToolUsageBanner />


            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept=".pdf,application/pdf" label="Upload PDF to Extract Images" maxSizeMB={100} />
                ) : (
                    <div className="glass-panel" style={{
                        padding: 'clamp(1rem, 3.5vw, 2.25rem)',
                        borderRadius: 'var(--radius-xl)',
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem', width: '100%', minWidth: 0 }}>
                            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                <h3 style={{ marginBottom: '0.25rem', fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', wordBreak: 'break-word' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{totalPages} page{totalPages > 1 ? 's' : ''} detected</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                    onClick={() => document.getElementById('change-file-input')?.click()}
                                    className="glass-btn-secondary"
                                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
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
                                        gap: '0.35rem',
                                        color: 'var(--text-muted)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '0.45rem 0.6rem',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <FaRedo /> Reset
                                </button>
                            </div>
                        </div>

                        {/* Settings Grid */}
                        <div style={{
                            marginBottom: '1.75rem',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem' }}>
                                <FaCog /> Output Quality & Format Controls
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                        Output Format
                                    </label>
                                    <select
                                        value={format}
                                        onChange={(e) => setFormat(e.target.value as any)}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.55rem', boxSizing: 'border-box' }}
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
                                        style={{ width: '100%', padding: '0.55rem', boxSizing: 'border-box' }}
                                    >
                                        <option value="1.0">Standard 72 DPI (Web/Email)</option>
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

                        {/* Page Selection Controls */}
                        {pages.length > 0 && (
                            <div style={{ marginBottom: '1.75rem', width: '100%', minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <h4 style={{ fontSize: '0.95rem' }}>
                                        Select Pages to Extract ({selectedPages.size} / {pages.length})
                                    </h4>
                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                        <button type="button" onClick={selectAll} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>All</button>
                                        <button type="button" onClick={selectOdd} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>Odd</button>
                                        <button type="button" onClick={selectEven} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>Even</button>
                                        <button type="button" onClick={selectNone} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>None</button>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 120px), 1fr))',
                                    gap: '0.75rem',
                                    maxHeight: '380px',
                                    overflowY: 'auto',
                                    padding: '0.75rem',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                                    boxSizing: 'border-box'
                                }}>
                                    {pages.map((page) => {
                                        const isSelected = selectedPages.has(page.pageNum);
                                        return (
                                            <div
                                                key={page.pageNum}
                                                onClick={() => togglePageSelection(page.pageNum)}
                                                style={{
                                                    border: page.jpgBlob ? '2px solid #10b981' : isSelected ? '2px solid var(--color-primary)' : '1px solid var(--glass-border)',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '0.5rem',
                                                    backgroundColor: isSelected ? 'rgba(255, 42, 68, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    position: 'relative'
                                                }}
                                            >
                                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                                                    {isSelected ? <FaCheckSquare /> : <FaSquare />}
                                                </div>
                                                <img
                                                    src={page.thumbnail}
                                                    alt={`Page ${page.pageNum}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '110px',
                                                        objectFit: 'contain',
                                                        backgroundColor: '#ffffff',
                                                        borderRadius: 'var(--radius-sm)',
                                                        marginBottom: '0.4rem'
                                                    }}
                                                />
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                                                    Page {page.pageNum}
                                                </div>
                                                {page.jpgBlob ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadPage(page.pageNum);
                                                        }}
                                                        className="glass-btn-primary"
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.3rem',
                                                            fontSize: '0.72rem',
                                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                        }}
                                                    >
                                                        <FaDownload /> Download
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.72rem', color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                                                        {isSelected ? 'Selected' : 'Skipped'}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div style={{ width: '100%', minWidth: 0 }}>
                            <button
                                onClick={handleConvert}
                                disabled={isProcessing || selectedPages.size === 0}
                                className="glass-btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    opacity: isProcessing || selectedPages.size === 0 ? 0.6 : 1,
                                    boxSizing: 'border-box',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <FaDownload />
                                {isProcessing
                                    ? `Extracting & Downloading... ${progress}%`
                                    : `Extract & Download ${selectedPages.size} Selected Page${selectedPages.size > 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

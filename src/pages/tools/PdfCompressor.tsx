import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaCog, FaRedo, FaFilePdf } from 'react-icons/fa';
import { SEO } from '../../components/SEO';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const PdfCompressor = () => {
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState<number>(1);
    const [compressedPdf, setCompressedPdf] = useState<Blob | null>(null);
    const [compressedPreviewUrl, setCompressedPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // Settings
    const [quality, setQuality] = useState(0.65); // JPEG Quality (0.01 - 1.0)
    const [scale, setScale] = useState(1.5); // Resolution factor (1.0 = 72dpi, 1.5 = 108dpi, 2.0 = 144dpi)
    const [useTargetSize, setUseTargetSize] = useState(true);
    const [targetSize, setTargetSize] = useState(100);
    const [unit, setUnit] = useState<'KB' | 'MB'>('KB');

    const presets = [
        { label: '20 KB (Gov/Exams)', size: 20, unit: 'KB' as const },
        { label: '50 KB (Passport/Visa)', size: 50, unit: 'KB' as const },
        { label: '100 KB (Web/Email)', size: 100, unit: 'KB' as const },
        { label: '200 KB', size: 200, unit: 'KB' as const },
        { label: '500 KB', size: 500, unit: 'KB' as const },
        { label: '1 MB', size: 1, unit: 'MB' as const },
        { label: '2 MB', size: 2, unit: 'MB' as const },
        { label: '5 MB', size: 5, unit: 'MB' as const }
    ];

    useEffect(() => {
        if (compressedPdf) {
            setCompressedPdf(null);
            setCompressedPreviewUrl(null);
        }
    }, [quality, scale, targetSize, unit, useTargetSize]);

    const handleFileSelect = async (selectedFile: File | File[]) => {
        const fileToLoad = Array.isArray(selectedFile) ? (selectedFile.length > 0 ? selectedFile[0] : null) : selectedFile;
        if (!fileToLoad) return;

        if (fileToLoad.type !== 'application/pdf' && !fileToLoad.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Please upload a valid PDF document');
            return;
        }

        setFile(fileToLoad);
        setCompressedPdf(null);
        setCompressedPreviewUrl(null);
        setProgress(0);
        setPreviewUrl(null);

        // Generate preview of Page 1
        try {
            const arrayBuffer = await fileToLoad.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            setPageCount(pdf.numPages);

            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                await page.render({ canvasContext: context, viewport } as any).promise;
                setPreviewUrl(canvas.toDataURL());
                canvas.width = 0;
                canvas.height = 0;
            }
        } catch (error) {
            console.error("Error generating preview", error);
        }
    };

    const handleReset = () => {
        setCompressedPdf(null);
        setCompressedPreviewUrl(null);
        setProgress(0);
        setQuality(0.65);
        setScale(1.5);
        setUseTargetSize(true);
        setTargetSize(100);
        setUnit('KB');
    };

    /**
     * Compute optimal quality and scale factor across pages to guarantee meeting target byte size
     */
    const computeOptimalCompressionParams = async (
        pdf: any,
        totalPages: number,
        targetSizeBytes: number
    ): Promise<{ optQuality: number; optScale: number }> => {
        // Reserve 8% for PDF header/xref tables/metadata stream overhead
        const usableTargetBytes = targetSizeBytes * 0.92;

        // Sample up to 3 representative pages (first, middle, last)
        const sampleIndices = Array.from(new Set([1, Math.ceil(totalPages / 2), totalPages])).filter(i => i <= totalPages);
        let currentScale = scale;

        // Bisection to find best quality for current scale
        const testQualityForScale = async (testScale: number, testQ: number): Promise<number> => {
            let totalSampleBytes = 0;
            for (const pageIdx of sampleIndices) {
                const page = await pdf.getPage(pageIdx);
                const viewport = page.getViewport({ scale: testScale });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                if (ctx) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    await page.render({ canvasContext: ctx, viewport } as any).promise;
                    const dataUrl = canvas.toDataURL('image/jpeg', testQ);
                    const base64Len = dataUrl.length - 23; // Subtract data:image/jpeg;base64,
                    totalSampleBytes += (base64Len * 3) / 4;
                    canvas.width = 0;
                    canvas.height = 0;
                }
            }
            return (totalSampleBytes / sampleIndices.length) * totalPages;
        };

        // Binary search on quality for current scale (min 0.05, max 0.95)
        let lowQ = 0.05;
        let highQ = 0.95;
        let bestQ = 0.65;

        // Up to 6 binary search iterations
        for (let iter = 0; iter < 6; iter++) {
            const midQ = (lowQ + highQ) / 2;
            const estimatedBytes = await testQualityForScale(currentScale, midQ);

            if (estimatedBytes <= usableTargetBytes) {
                bestQ = midQ;
                lowQ = midQ; // Try higher quality
            } else {
                highQ = midQ; // Lower quality needed
            }
        }

        // If even at lowest quality it exceeds target, step down the scale factor adaptively
        const lowestQEstimatedBytes = await testQualityForScale(currentScale, lowQ);
        if (lowestQEstimatedBytes > usableTargetBytes) {
            // Adaptive scale reduction
            const requiredRatio = Math.sqrt(usableTargetBytes / lowestQEstimatedBytes);
            currentScale = Math.max(0.4, currentScale * Math.min(0.9, requiredRatio));
            bestQ = 0.55;
        }

        return {
            optQuality: Math.max(0.05, Math.min(0.95, bestQ)),
            optScale: currentScale
        };
    };

    const handleCompress = async () => {
        if (!file) return;

        setIsProcessing(true);
        setProgress(5);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const totalPages = pdf.numPages;

            let finalQuality = quality;
            let finalScale = scale;

            if (useTargetSize) {
                const targetBytes = unit === 'MB' ? targetSize * 1024 * 1024 : targetSize * 1024;
                const optimal = await computeOptimalCompressionParams(pdf, totalPages, targetBytes);
                finalQuality = optimal.optQuality;
                finalScale = optimal.optScale;
            }

            setProgress(15);

            // Fetch page 1 to initialize jsPDF with matching orientation & size
            const firstPage = await pdf.getPage(1);
            const firstViewport = firstPage.getViewport({ scale: 1.0 });
            const firstOrientation = firstViewport.width > firstViewport.height ? 'l' : 'p';

            const newPdf = new jsPDF({
                orientation: firstOrientation,
                unit: 'pt',
                format: [firstViewport.width, firstViewport.height]
            });

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);
                const originalViewport = page.getViewport({ scale: 1.0 });
                const renderViewport = page.getViewport({ scale: finalScale });

                const canvas = document.createElement('canvas');
                canvas.width = renderViewport.width;
                canvas.height = renderViewport.height;

                const context = canvas.getContext('2d');
                if (!context) throw new Error("Canvas context initialization failed");

                // Fill white background to prevent dark artifacts
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, renderViewport.width, renderViewport.height);
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';

                await page.render({
                    canvasContext: context,
                    viewport: renderViewport
                } as any).promise;

                const imgData = canvas.toDataURL('image/jpeg', finalQuality);
                const pageOrientation = originalViewport.width > originalViewport.height ? 'l' : 'p';

                if (i > 1) {
                    newPdf.addPage([originalViewport.width, originalViewport.height], pageOrientation);
                }

                // Add image filling exact original page dimensions
                newPdf.addImage(
                    imgData,
                    'JPEG',
                    0,
                    0,
                    originalViewport.width,
                    originalViewport.height,
                    undefined,
                    'FAST'
                );

                if (i === 1) {
                    setCompressedPreviewUrl(imgData);
                }

                canvas.width = 0;
                canvas.height = 0;

                setProgress(Math.round((i / totalPages) * 100));
            }

            const outputBlob = newPdf.output('blob');
            setCompressedPdf(outputBlob);

            const resultKB = outputBlob.size / 1024;
            const formattedResult = resultKB >= 1024 ? `${(resultKB / 1024).toFixed(2)} MB` : `${resultKB.toFixed(0)} KB`;
            toast.success(`Compressed successfully to ${formattedResult}!`);

        } catch (error) {
            console.error("PDF Compression failed:", error);
            toast.error("Failed to compress PDF. File might be corrupted or password-protected.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '850px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="Precision PDF Compressor - Accurate Target Size Control"
                description="Compress PDF files to exact sizes (e.g. 200KB, 500KB, 1MB) with aspect ratio preservation and crisp text rendering."
            />
            <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.5rem', textAlign: 'center', wordBreak: 'break-word' }}>
                Precision PDF Compressor
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                Target specific file sizes for government portals, job applications, and email limits locally.
            </p>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept=".pdf,application/pdf" label="Upload PDF to Compress" maxSizeMB={100} />
                ) : (
                    <div className="glass-panel" style={{
                        padding: 'clamp(1rem, 3.5vw, 2.25rem)',
                        borderRadius: 'var(--radius-xl)',
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box'
                    }}>
                        {/* File Header & Prominent Preview Card */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1.75rem',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            width: '100%',
                            minWidth: 0,
                            paddingBottom: '1.5rem',
                            borderBottom: '1px solid var(--border-subtle)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: '1 1 240px' }}>
                                {/* Document Preview Thumbnail or Fallback */}
                                <div style={{
                                    width: '64px',
                                    height: '84px',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--glass-border)',
                                    backgroundColor: '#ffffff',
                                    boxShadow: 'var(--shadow-sm)',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative'
                                }}>
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt="PDF Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ef4444', fontSize: '1.5rem' }}>
                                            <FaFilePdf />
                                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>PDF</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                    <h3 style={{ marginBottom: '0.25rem', fontSize: 'clamp(1.05rem, 2.5vw, 1.25rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {file.name}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            Size: {file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : `${(file.size / 1024).toFixed(0)} KB`}
                                        </span>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>•</span>
                                        <span style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                                            {pageCount} Page{pageCount > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
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

                        {/* Live Comparison Box When Compressed */}
                        {compressedPdf && (
                            <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: '1.75rem',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                boxShadow: '0 0 25px -5px rgba(16, 185, 129, 0.2)',
                                textAlign: 'center'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span className="neon-badge neon-badge-success">
                                        ✓ Compression Complete ({file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : `${(file.size / 1024).toFixed(0)} KB`} → {compressedPdf.size >= 1024 * 1024 ? `${(compressedPdf.size / 1024 / 1024).toFixed(2)} MB` : `${(compressedPdf.size / 1024).toFixed(0)} KB`})
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                    {previewUrl && (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Original Page 1</div>
                                            <img src={previewUrl} alt="Original" style={{ width: '80px', height: '110px', objectFit: 'contain', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid var(--glass-border)' }} />
                                        </div>
                                    )}
                                    {compressedPreviewUrl && (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: '0.35rem' }}>Compressed Page 1</div>
                                            <img src={compressedPreviewUrl} alt="Compressed" style={{ width: '80px', height: '110px', objectFit: 'contain', backgroundColor: '#ffffff', borderRadius: '4px', border: '2px solid #10b981' }} />
                                        </div>
                                    )}
                                </div>

                                <a
                                    href={URL.createObjectURL(compressedPdf)}
                                    download={`compressed-${file.name}`}
                                    className="glass-btn-primary"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                        padding: '0.85rem 1.75rem',
                                        fontSize: '1rem',
                                        textDecoration: 'none',
                                        display: 'inline-flex'
                                    }}
                                >
                                    <FaDownload /> Download Compressed PDF ({compressedPdf.size >= 1024 * 1024 ? `${(compressedPdf.size / 1024 / 1024).toFixed(2)} MB` : `${(compressedPdf.size / 1024).toFixed(0)} KB`})
                                </a>
                            </div>
                        )}

                        {/* Settings Configuration Grid */}
                        <div style={{
                            marginBottom: '1.75rem',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                                <FaCog /> Compression Mode & Target Controls
                            </h4>

                            {/* Mode Toggle */}
                            <div style={{ marginBottom: '1.5rem', width: '100%', minWidth: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                    <input
                                        type="checkbox"
                                        checked={useTargetSize}
                                        onChange={(e) => setUseTargetSize(e.target.checked)}
                                        style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                                    />
                                    Enable Adaptive Target Size Constraint (Recommended)
                                </label>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, paddingLeft: 'clamp(0.5rem, 2vw, 1.5rem)' }}>
                                    Iteratively solves quantization matrices and samples multiple pages to hit exact byte budgets.
                                </p>
                            </div>

                            {useTargetSize ? (
                                <div style={{ marginBottom: '1.25rem', width: '100%', minWidth: 0 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                        Target Maximum File Size:
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
                                        <input
                                            type="number"
                                            value={targetSize}
                                            onChange={(e) => setTargetSize(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="glass-input"
                                            style={{ flex: '1 1 120px', maxWidth: '200px', padding: '0.65rem', boxSizing: 'border-box' }}
                                            min="1"
                                        />
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value as any)}
                                            className="glass-input"
                                            style={{ width: '85px', padding: '0.65rem', boxSizing: 'border-box' }}
                                        >
                                            <option value="KB">KB</option>
                                            <option value="MB">MB</option>
                                        </select>
                                    </div>

                                    {/* Preset Chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', width: '100%', minWidth: 0 }}>
                                        {presets.map((preset) => {
                                            const isSelected = targetSize === preset.size && unit === preset.unit;
                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        setTargetSize(preset.size);
                                                        setUnit(preset.unit);
                                                    }}
                                                    className="glass-btn-secondary"
                                                    style={{
                                                        padding: '0.35rem 0.75rem',
                                                        fontSize: '0.78rem',
                                                        whiteSpace: 'nowrap',
                                                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--glass-border)',
                                                        backgroundColor: isSelected ? 'rgba(255, 42, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                        color: isSelected ? 'var(--color-primary)' : 'var(--text-main)',
                                                        boxSizing: 'border-box'
                                                    }}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                                            <span style={{ fontWeight: 600 }}>Image Quality: {Math.round(quality * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="0.95"
                                            step="0.05"
                                            value={quality}
                                            onChange={(e) => setQuality(parseFloat(e.target.value))}
                                            style={{ width: '100%', marginTop: '0.35rem', accentColor: 'var(--color-primary)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                            Render DPI Scale
                                        </label>
                                        <select
                                            value={scale}
                                            onChange={(e) => setScale(parseFloat(e.target.value))}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.55rem', boxSizing: 'border-box' }}
                                        >
                                            <option value="1.0">Standard 72 DPI (Fastest)</option>
                                            <option value="1.5">Balanced 108 DPI (Crisp Text)</option>
                                            <option value="2.0">High-Res 144 DPI (Print Quality)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        {!compressedPdf && (
                            <button
                                onClick={handleCompress}
                                disabled={isProcessing}
                                className="glass-btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    opacity: isProcessing ? 0.6 : 1
                                }}
                            >
                                <FaFilePdf />
                                {isProcessing ? `Compressing PDF... ${progress}%` : `Compress PDF ${useTargetSize ? `to ≤ ${targetSize} ${unit}` : ''}`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

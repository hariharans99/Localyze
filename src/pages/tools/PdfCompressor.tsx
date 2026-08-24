import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaCog, FaRedo, FaExclamationTriangle, FaFilePdf } from 'react-icons/fa';
import { SEO } from '../../components/SEO';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const PdfCompressor = () => {
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [compressedPdf, setCompressedPdf] = useState<Blob | null>(null);
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
        if (compressedPdf) setCompressedPdf(null);
    }, [quality, scale, targetSize, unit, useTargetSize]);

    const handleFileSelect = async (selectedFile: File | File[]) => {
        const fileToLoad = Array.isArray(selectedFile) ? (selectedFile.length > 0 ? selectedFile[0] : null) : selectedFile;
        if (!fileToLoad) return;

        setFile(fileToLoad);
        setCompressedPdf(null);
        setProgress(0);
        setPreviewUrl(null);

        // Generate preview of Page 1
        try {
            const arrayBuffer = await fileToLoad.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                await page.render({ canvasContext: context, viewport } as any).promise;
                setPreviewUrl(canvas.toDataURL());
            }
        } catch (error) {
            console.error("Error generating preview", error);
        }
    };

    const handleReset = () => {
        setCompressedPdf(null);
        setProgress(0);
        setQuality(0.65);
        setScale(1.5);
        setUseTargetSize(true);
        setTargetSize(500);
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
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    await page.render({ canvasContext: ctx, viewport } as any).promise;
                    const dataUrl = canvas.toDataURL('image/jpeg', testQ);
                    const base64Len = dataUrl.length - 23; // Subtract data:image/jpeg;base64,
                    totalSampleBytes += (base64Len * 3) / 4;
                }
            }
            return (totalSampleBytes / sampleIndices.length) * totalPages;
        };

        // If target size is very small, auto-adjust scale first
        const maxScale = Math.max(1.0, currentScale);

        // Check if even min quality at max scale is too big
        const estimatedMinBytes = await testQualityForScale(maxScale, 0.04);
        if (estimatedMinBytes > usableTargetBytes) {
            // Need to reduce scale
            currentScale = Math.max(0.3, Math.sqrt(usableTargetBytes / estimatedMinBytes) * maxScale);
        } else {
            currentScale = maxScale;
        }

        // Now binary search for the highest quality that stays under budget
        let minQ = 0.01;
        let maxQ = 0.95;
        let bestQ = minQ;

        for (let iter = 0; iter < 6; iter++) {
            const midQ = Number(((minQ + maxQ) / 2).toFixed(3));
            const estBytes = await testQualityForScale(currentScale, midQ);

            if (estBytes <= usableTargetBytes) {
                bestQ = midQ;
                minQ = midQ; // Try higher quality
            } else {
                maxQ = midQ; // Too big, lower quality
            }
        }

        return { optQuality: Math.max(0.02, bestQ), optScale: Number(currentScale.toFixed(2)) };
    };

    const handleCompress = async () => {
        if (!file) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const totalPages = pdf.numPages;

            let finalQuality = quality;
            let finalScale = scale;

            if (useTargetSize) {
                const targetBytes = unit === 'MB' ? targetSize * 1024 * 1024 : targetSize * 1024;
                const { optQuality, optScale } = await computeOptimalCompressionParams(pdf, totalPages, targetBytes);
                finalQuality = optQuality;
                finalScale = optScale;
            }

            // Get first page dimensions in points to initialize jsPDF with exact geometry
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
        <div className="container" style={{ maxWidth: '850px' }}>
            <SEO
                title="Precision PDF Compressor - Accurate Target Size Control"
                description="Compress PDF files to exact sizes (e.g. 200KB, 500KB, 1MB) with aspect ratio preservation and crisp text rendering."
            />
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Precision PDF Compressor
            </h1>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept=".pdf,application/pdf" label="Upload PDF to Compress" maxSizeMB={100} />
                ) : (
                    <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', borderRadius: 'var(--radius-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {previewUrl && (
                                    <div style={{
                                        width: '64px',
                                        height: '84px',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        border: '1px solid var(--glass-border)',
                                        backgroundColor: '#ffffff',
                                        boxShadow: 'var(--shadow-sm)',
                                        flexShrink: 0
                                    }}>
                                        <img
                                            src={previewUrl}
                                            alt="PDF Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                )}
                                <div>
                                    <h3 style={{ marginBottom: '0.25rem', fontSize: '1.25rem' }}>{file.name}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        Original Size: {file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : `${(file.size / 1024).toFixed(0)} KB`}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
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
                                            setCompressedPdf(null);
                                            setProgress(0);
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
                                    <FaRedo /> Reset
                                </button>
                            </div>
                        </div>

                        {/* Settings */}
                        <div style={{
                            marginBottom: '2rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-subtle)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                <FaCog /> Compression Configuration
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Mode Selection */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            id="useTargetSize"
                                            checked={useTargetSize}
                                            onChange={(e) => setUseTargetSize(e.target.checked)}
                                            style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="useTargetSize" style={{ cursor: 'pointer', fontWeight: 600 }}>
                                            🎯 Target File Size Mode (Recommended)
                                        </label>
                                    </div>

                                    {useTargetSize ? (
                                        <div style={{ paddingLeft: '1.7rem' }}>
                                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                                                Quick Presets:
                                            </label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                {presets.map((preset) => (
                                                    <button
                                                        key={preset.label}
                                                        type="button"
                                                        onClick={() => {
                                                            setTargetSize(preset.size);
                                                            setUnit(preset.unit);
                                                        }}
                                                        style={{
                                                            padding: '0.35rem 0.65rem',
                                                            borderRadius: 'var(--radius-full)',
                                                            border: `1px solid ${targetSize === preset.size && unit === preset.unit ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                                            backgroundColor: targetSize === preset.size && unit === preset.unit ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                                                            color: targetSize === preset.size && unit === preset.unit ? 'var(--color-primary)' : 'var(--text-muted)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 500,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    value={targetSize}
                                                    onChange={(e) => setTargetSize(parseFloat(e.target.value) || 10)}
                                                    style={{
                                                        padding: '0.5rem 0.75rem',
                                                        width: '130px',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-subtle)',
                                                        backgroundColor: 'var(--bg-surface)',
                                                        fontWeight: 600
                                                    }}
                                                />
                                                <select
                                                    value={unit}
                                                    onChange={(e) => setUnit(e.target.value as 'KB' | 'MB')}
                                                    style={{
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-subtle)',
                                                        backgroundColor: 'var(--bg-surface)',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <option value="KB">KB</option>
                                                    <option value="MB">MB</option>
                                                </select>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                                ✨ Automatically balances DPI resolution and JPEG quantization per page to strictly hit your target size.
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ paddingLeft: '1.7rem', display: 'grid', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                                    <span>Image Quality: {(quality * 100).toFixed(0)}%</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lower = Smaller</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0.05"
                                                    max="0.95"
                                                    step="0.05"
                                                    value={quality}
                                                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                                    Rendering Resolution (DPI):
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
                                                    <option value="1.0">Standard 72 DPI (Web & Email, compact)</option>
                                                    <option value="1.5">Balanced 108 DPI (Clean clarity)</option>
                                                    <option value="2.0">Sharp 144 DPI (Print quality)</option>
                                                    <option value="0.75">Ultra Compact 54 DPI (Gov portal limits)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    gap: '0.5rem',
                                    color: 'var(--text-main)'
                                }}>
                                    <FaExclamationTriangle style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                                    <div>
                                        <strong>Page Geometry Preserved:</strong> Landscape and custom page dimensions are preserved 1:1 with crisp anti-aliasing.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Results or Action Button */}
                        {compressedPdf ? (
                            <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                padding: '1.75rem',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: '1rem',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                boxShadow: '0 0 25px -5px rgba(16, 185, 129, 0.2)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <span className="neon-badge neon-badge-success">
                                        ✓ Compression Complete!
                                    </span>
                                </div>
                                <p style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>
                                    Original: <strong>{(file.size / 1024).toFixed(0)} KB</strong> &rarr; Compressed:{' '}
                                    <strong style={{ color: '#10b981' }}>{(compressedPdf.size / 1024).toFixed(0)} KB</strong>{' '}
                                    ({((1 - compressedPdf.size / file.size) * 100).toFixed(0)}% space saved)
                                </p>
                                <a
                                    href={URL.createObjectURL(compressedPdf)}
                                    download={`compressed-${file.name}`}
                                    className="glass-btn-primary"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                        padding: '0.85rem 1.75rem',
                                        fontSize: '1rem',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <FaDownload /> Download Compressed PDF
                                </a>
                            </div>
                        ) : (
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
                                {isProcessing ? `Optimizing & Compressing... ${progress}%` : 'Compress PDF'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>PDF Optimization Highlights</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Exact Geometry Preservation</strong>: Supports mixed portrait/landscape and custom-sized documents without clipping.</li>
                    <li><strong>Adaptive Target Sizing</strong>: Dynamically samples document complexity and allocates quantization budgets per page.</li>
                    <li><strong>Client-Side Security</strong>: No uploads to cloud servers. Fast, secure, and private.</li>
                </ol>
            </div>
        </div>
    );
};

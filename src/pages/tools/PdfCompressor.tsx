import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCog, FaRedo, FaExclamationTriangle } from 'react-icons/fa';

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const PdfCompressor = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [compressedPdf, setCompressedPdf] = useState<Blob | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // Settings
    const [quality, setQuality] = useState(0.5); // JPEG Quality (0-1)
    const [scale, setScale] = useState(1.5); // Scale factor (1 = 72dpi, 2 = 144dpi)

    useEffect(() => {
        // Reset compressed output when settings change
        if (compressedPdf) setCompressedPdf(null);
    }, [quality, scale]);

    const handleFileSelect = (selectedFile: File | File[]) => {
        if (Array.isArray(selectedFile)) {
            if (selectedFile.length > 0) setFile(selectedFile[0]);
        } else {
            setFile(selectedFile);
        }
        setCompressedPdf(null);
        setProgress(0);
    };

    const handleReset = () => {
        setFile(null);
        setCompressedPdf(null);
        setProgress(0);
    };

    const handleCompress = async () => {
        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        if (!file) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const totalPages = pdf.numPages;

            // Initialize new PDF
            const newPdf = new jsPDF();

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);

                // Calculate viewport based on scale
                const viewport = page.getViewport({ scale: scale });

                // Prepare canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (!context) throw new Error("Canvas context failed");

                // Render PDF page to canvas
                // Render PDF page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                } as any).promise;

                // Compress: Convert to JPEG data URL
                const imgData = canvas.toDataURL('image/jpeg', quality);

                // Add to new PDF
                // jsPDF measurements are in mm, assuming A4 roughly or conform to image aspect ratio
                // We'll match the PDF page size to the image size (in points) to keep layout
                const imgProps = newPdf.getImageProperties(imgData);
                const pdfWidth = newPdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                if (i > 1) newPdf.addPage();

                newPdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

                // Update progress
                setProgress(Math.round((i / totalPages) * 100));
            }

            const outputBlob = newPdf.output('blob');
            setCompressedPdf(outputBlob);
            await incrementUsage('pdf'); // Re-using 'pdf' or create new 'compress-pdf' usage type if needed? using 'pdf' for now as it's general PDF tool usage

            toast.success(`Compressed! ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`);

        } catch (error) {
            console.error("PDF Compression failed:", error);
            toast.error("Failed to compress PDF. File might be corrupted or protected.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                PDF Size Reducer
            </h1>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept=".pdf" label="Upload PDF to Compress" maxSizeMB={100} />
                ) : (
                    <div className="bg-surface p-8 rounded-lg border border-subtle">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Original Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
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

                        <div style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaCog /> Compression Level
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Presets */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {[
                                        { label: 'Extreme', q: 0.3, s: 0.75, desc: 'Smallest Size' },
                                        { label: 'Recommended', q: 0.5, s: 1.0, desc: 'Balanced' },
                                        { label: 'High Quality', q: 0.8, s: 1.5, desc: 'Best Visuals' }
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

                                <div>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Image Quality ({(quality * 100).toFixed(0)}%)</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lower = Smaller Size</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1.0"
                                        step="0.1"
                                        value={quality}
                                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Resolution (DPI)</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lower = Blurry but Tiny</span>
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
                                        <option value="1.0">Standard (72 DPI) - Good for Screens</option>
                                        <option value="1.5">Medium (108 DPI) - Balanced</option>
                                        <option value="2.0">High (144 DPI) - Sharpest</option>
                                        <option value="0.75">Low (54 DPI) - Smallest Size</option>
                                    </select>
                                </div>

                                <div style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    gap: '0.5rem',
                                    color: 'var(--text-main)'
                                }}>
                                    <FaExclamationTriangle style={{ color: '#3b82f6', marginTop: '3px' }} />
                                    <div>
                                        <strong>Note:</strong> This process converts text to images ("Rasterization").
                                        This is perfect for "Scanned" documents but means text will no longer be selectable.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {compressedPdf ? (
                            <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '2rem',
                                border: '1px solid #10b981'
                            }}>
                                <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Success!</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                    New Size: {(compressedPdf.size / 1024 / 1024).toFixed(2)} MB
                                    <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>
                                        ({((compressedPdf.size / file.size) * 100).toFixed(0)}% of original)
                                    </span>
                                </p>
                                <a
                                    href={URL.createObjectURL(compressedPdf)}
                                    download={`compressed-${file.name}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600,
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
                                    opacity: isProcessing ? 0.7 : 1
                                }}
                            >
                                {isProcessing ? `Compressing Page... ${progress}%` : 'Compress PDF'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <AdBanner />
        </div>
    );
};

import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCog, FaRedo, FaExclamationTriangle } from 'react-icons/fa';

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

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

    // Target Size State
    const [useTargetSize, setUseTargetSize] = useState(false);
    const [targetSizeMB, setTargetSizeMB] = useState(1.0);

    // Standardized Reset (Settings only)
    const handleReset = () => {
        setCompressedPdf(null);
        setProgress(0);
        // Reset settings
        setQuality(0.5);
        setScale(1.5);
        setUseTargetSize(false);
        setTargetSizeMB(1.0);
    };

    const calculateOptimumQuality = async (pdf: any, scale: number, targetBytesPerPage: number): Promise<number> => {
        // Sample the first page to estimate quality
        try {
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context!, viewport }).promise;

            // Binary search for quality
            let min = 0.1;
            let max = 1.0;
            let bestQ = 0.5;

            // Try 5 iterations
            for (let i = 0; i < 5; i++) {
                const mid = (min + max) / 2;
                const dataUrl = canvas.toDataURL('image/jpeg', mid);
                // Base64 length is approx 4/3 of bytes
                const size = (dataUrl.length - 22) * 0.75;

                if (size > targetBytesPerPage) {
                    max = mid;
                } else {
                    min = mid;
                    bestQ = mid;
                }
            }
            return bestQ;
        } catch (e) {
            console.error("Error sampling page quality", e);
            return 0.5; // fallback
        }
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

            // Determine final quality
            let finalQuality = quality;

            if (useTargetSize) {
                // Target: 90% of total limit allocated to images (10% overhead safety)
                const totalTargetBytes = targetSizeMB * 1024 * 1024;
                const targetBytesPerPage = (totalTargetBytes * 0.9) / totalPages;

                // Notify user we are calculating
                toast.success(`Calculating best quality for ${targetSizeMB}MB target...`);

                finalQuality = await calculateOptimumQuality(pdf, scale, targetBytesPerPage);
                console.log(`Optimum quality calculated: ${finalQuality.toFixed(2)}`);
            }

            // Initialize new PDF
            const newPdf = new jsPDF();

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);
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

                const imgData = canvas.toDataURL('image/jpeg', finalQuality);

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
            await incrementUsage('pdf');

            const resultMB = outputBlob.size / 1024 / 1024;
            if (useTargetSize && resultMB > targetSizeMB * 1.2) {
                toast.error(`Result (${resultMB.toFixed(2)}MB) is slightly larger than target. Try reducing resolution.`);
            } else {
                toast.success(`Compressed to ${resultMB.toFixed(2)} MB`);
            }

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
                                            // Reset result but keep settings
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
                                    <FaRedo /> Reset Settings
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaCog /> Compression Settings
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Target Size Toggle */}
                                <div style={{
                                    padding: '1rem',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: useTargetSize ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: useTargetSize ? '1rem' : 0 }}>
                                        <input
                                            type="checkbox"
                                            id="useTargetSize"
                                            checked={useTargetSize}
                                            onChange={(e) => setUseTargetSize(e.target.checked)}
                                            style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="useTargetSize" style={{ cursor: 'pointer', fontWeight: 500 }}>
                                            Reduce to specific file size
                                        </label>
                                    </div>

                                    {useTargetSize && (
                                        <div>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    min="0.1"
                                                    step="0.1"
                                                    value={targetSizeMB}
                                                    onChange={(e) => setTargetSizeMB(parseFloat(e.target.value))}
                                                    style={{
                                                        padding: '0.5rem',
                                                        width: '100px',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-subtle)'
                                                    }}
                                                />
                                                <span>MB</span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                                We'll try to adjust quality to meet this target. Lower targets might reduce clarity.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Manual Controls (Disable if Target Size is ON) */}
                                <div style={{
                                    opacity: useTargetSize ? 0.5 : 1,
                                    pointerEvents: useTargetSize ? 'none' : 'auto',
                                    transition: 'opacity 0.2s'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
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

                                    <div style={{ marginBottom: '1.5rem' }}>
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
                                </div>

                                {/* Resolution always available as it affects base size significantly */}
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
                                    <FaExclamationTriangle style={{ color: '#3b82f6', marginTop: '3px' }} flex-shrink={0} />
                                    <div>
                                        <strong>Note:</strong> This process converts pages to images ("Rasterization").
                                        Text will no longer be selectable. Great for scanned docs.
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

            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How it Works</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload your PDF</strong>: We accept any standard PDF document.</li>
                    <li><strong>Choose Target Size (Optional)</strong>: Set a specific file size (e.g., "0.5 MB") if you need to meet a limit.</li>
                    <li><strong>Adjust Quality</strong>: Or use manual presets to balance clarity vs. file size. Lower DPI saves the most space.</li>
                    <li><strong>Rasterization</strong>: We convert each page to an optimized image to achieve maximum compression.</li>
                    <li><strong>Download</strong>: Get your smaller PDF instantly. All processing happens 100% on your device.</li>
                </ol>
            </div>

            <AdBanner />
        </div>
    );
};

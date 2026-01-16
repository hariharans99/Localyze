import { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCog, FaRedo } from 'react-icons/fa';
import { ProgressBar } from '../../components/ProgressBar';

export const ImageCompressor = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
    const startTimeRef = useRef<number>(0);
    const [unit, setUnit] = useState<'MB' | 'KB'>('MB');
    const [qualityPriority, setQualityPriority] = useState<'size' | 'color'>('size');
    const [showWarning, setShowWarning] = useState(false);
    const [options, setOptions] = useState({
        maxSizeMB: 1,
        useWebWorker: true,
        maxIteration: 50,
        alwaysKeepResolution: false,
        fileType: undefined as string | undefined
    });

    const handleFileSelect = (selectedFile: File | File[]) => {
        if (Array.isArray(selectedFile)) {
            if (selectedFile.length > 0) setFile(selectedFile[0]);
        } else {
            setFile(selectedFile);
        }
        setCompressedFile(null);
        setProgress(0);
    };

    const handleReset = () => {
        setFile(null);
        setCompressedFile(null);
        setProgress(0);
    };

    const handleCompress = async () => {
        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        if (!file) return;

        // Convert to MB based on selected unit
        const targetSizeMB = unit === 'KB' ? options.maxSizeMB / 1024 : options.maxSizeMB;
        const targetSizeBytes = targetSizeMB * 1024 * 1024;

        // Check if target is unrealistic (< 2% of original)
        const compressionRatio = targetSizeBytes / file.size;
        if (compressionRatio < 0.02) {
            setShowWarning(true);
        } else {
            setShowWarning(false);
        }

        // If file is already smaller than target, skip compression
        if (file.size <= targetSizeBytes) {
            toast.info(`File is already ${(file.size / 1024 / 1024).toFixed(2)} MB, under your target of ${targetSizeMB} MB.`);
            setCompressedFile(file);
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setEstimatedTime(undefined);
        startTimeRef.current = Date.now();

        try {
            let minQ = 0;
            let maxQ = 1;
            let bestBlob: File | null = null;
            let bestSizeDiff = Infinity;

            // Binary search iterations
            const iterations = 7; // 2^7 = 128 possibilities, ~1% precision

            for (let i = 0; i < iterations; i++) {
                const midQ = (minQ + maxQ) / 2;

                // Update progress
                setProgress(Math.round(((i + 1) / iterations) * 90));

                // Update estimated time
                if (i > 0) {
                    const elapsed = (Date.now() - startTimeRef.current) / 1000;
                    const avgTimePerIter = elapsed / i;
                    const remaining = avgTimePerIter * (iterations - i);
                    setEstimatedTime(remaining);
                }

                const compressOptions = {
                    ...options,
                    maxSizeMB: options.alwaysKeepResolution ? undefined : targetSizeMB, // Only force size if we allow resizing
                    maxWidthOrHeight: undefined,
                    initialQuality: midQ,
                    useWebWorker: true,
                    fileType: qualityPriority === 'color' ? file.type : undefined
                };

                // If asking for specific size but not keeping resolution, we might want to leverage the library's resizing
                // But for pure quality tuning, we pass undefined maxSizeMB usually, unless we want the library to resize.
                // To support "Proposed Solution" of quality search first:
                if (options.alwaysKeepResolution) {
                    compressOptions.maxSizeMB = 100; // Arbitrary high number to prevent resizing
                }

                const compressed = await imageCompression(file, compressOptions);

                // Check result
                if (compressed.size <= targetSizeBytes) {
                    // It fits! Can we go higher quality?
                    // Store this as candidate
                    if (targetSizeBytes - compressed.size < bestSizeDiff) {
                        bestSizeDiff = targetSizeBytes - compressed.size;
                        bestBlob = compressed;
                    }
                    minQ = midQ; // Try closer to max
                } else {
                    // Too big
                    maxQ = midQ; // Need lower quality
                }
            }

            // Fallback: If we couldn't find ANY solution that fits (bestBlob is null), 
            // it means even at low quality (or maxQ being pushed down), we didn't fit.
            // Or maybe our binary search never hit a "valid" spot.
            // In that case, let's run one final pass with the library's aggressive resizing if allowed.
            if (!bestBlob && !options.alwaysKeepResolution) {
                const finalTryOptions = {
                    ...options,
                    maxSizeMB: targetSizeMB,
                    useWebWorker: true,
                    initialQuality: 0.5 // Start middle ground
                };
                bestBlob = await imageCompression(file, finalTryOptions);
            } else if (!bestBlob) {
                // Must return something, use minQ result
                const finalTryOptions = { ...options, maxSizeMB: 100, initialQuality: minQ };
                bestBlob = await imageCompression(file, finalTryOptions);
            }

            setProgress(100);
            if (bestBlob) {
                setCompressedFile(bestBlob);
                await incrementUsage('compress');

                if (bestBlob.size <= targetSizeBytes * 1.05) {
                    toast.success("Image compressed successfully!");
                } else {
                    toast.success(`Best effort: ${(bestBlob.size / 1024 / 1024).toFixed(2)} MB`);
                }
            }

        } catch (error) {
            console.error(error);
            toast.error("Compression failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper to calculate target size in MB for warning display
    const getTargetSizeMB = () => unit === 'KB' ? options.maxSizeMB / 1024 : options.maxSizeMB;

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Image Compressor
            </h1>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept="image/*" label="Upload Image to Compress" />
                ) : (
                    <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Original Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setFile(null)}
                                    style={{ color: 'var(--color-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Change File
                                </button>
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

                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaCog /> Compression Settings
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Max Size</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            step={unit === 'KB' ? "1" : "0.01"}
                                            value={isNaN(options.maxSizeMB) ? '' : options.maxSizeMB}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setOptions({ ...options, maxSizeMB: isNaN(val) ? 0 : val });
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '0.5rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-subtle)',
                                                background: 'var(--bg-app)',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                        <select
                                            value={unit}
                                            onChange={(e) => {
                                                const newUnit = e.target.value as 'MB' | 'KB';
                                                // Convert value when switching units
                                                if (newUnit === 'KB' && unit === 'MB') {
                                                    setOptions({ ...options, maxSizeMB: options.maxSizeMB * 1024 });
                                                } else if (newUnit === 'MB' && unit === 'KB') {
                                                    setOptions({ ...options, maxSizeMB: options.maxSizeMB / 1024 });
                                                }
                                                setUnit(newUnit);
                                            }}
                                            style={{
                                                padding: '0.5rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-subtle)',
                                                background: 'var(--bg-app)',
                                                color: 'var(--text-main)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="MB">MB</option>
                                            <option value="KB">KB</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="keepResolution"
                                        checked={options.alwaysKeepResolution}
                                        onChange={(e) => setOptions({ ...options, alwaysKeepResolution: e.target.checked })}
                                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="keepResolution" style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                                        Preserve Resolution (Uncheck to allow resizing)
                                    </label>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Quality Priority</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="quality"
                                                value="size"
                                                checked={qualityPriority === 'size'}
                                                onChange={() => setQualityPriority('size')}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.9rem' }}>Prefer Size (Allows Format Change)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="quality"
                                                value="color"
                                                checked={qualityPriority === 'color'}
                                                onChange={() => setQualityPriority('color')}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.9rem' }}>Prefer Colors (Strict Format)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {showWarning && (
                            <div style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1rem',
                                marginBottom: '1rem',
                                fontSize: '0.9rem',
                                color: 'var(--text-main)'
                            }}>
                                <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '0.25rem' }}>⚠️ Extreme Compression</strong>
                                Your target size is very aggressive ({((getTargetSizeMB() / (file.size / 1024 / 1024)) * 100).toFixed(1)}% of original).
                                {qualityPriority === 'color' ?
                                    ' Colors will be preserved but final size may be larger than target.' :
                                    ' Expect significant usage of lossy compression.'}
                            </div>
                        )}

                        {isProcessing && (
                            <div style={{ marginBottom: '2rem' }}>
                                <ProgressBar
                                    progress={progress}
                                    label="Compressing..."
                                    estimatedSeconds={estimatedTime}
                                />
                            </div>
                        )}

                        {compressedFile ? (
                            <div style={{
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '2rem',
                                border: '1px solid var(--color-primary)'
                            }}>
                                <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Compression Complete!</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                    New Size: {(compressedFile.size / 1024 / 1024).toFixed(2)} MB
                                    <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 600 }}>
                                        (-{((1 - compressedFile.size / file.size) * 100).toFixed(0)}%)
                                    </span>
                                </p>

                                {compressedFile.size > getTargetSizeMB() * 1024 * 1024 * 1.2 && (
                                    <div style={{
                                        marginTop: '1rem',
                                        marginBottom: '1rem',
                                        padding: '0.75rem',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.9rem',
                                        color: '#ef4444'
                                    }}>
                                        <strong>Target Missed:</strong> Could not compress to {getTargetSizeMB().toFixed(3)} MB while keeping resolution/format.
                                        Try unchecking "Preserve Resolution" or "Prefer Colors".
                                    </div>
                                )}

                                <a
                                    href={URL.createObjectURL(compressedFile)}
                                    download={`compressed-${file.name}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600,
                                        textDecoration: 'none'
                                    }}
                                >
                                    <FaDownload /> Download Image
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
                                    border: 'none'
                                }}
                            >
                                {isProcessing ? 'Compressing...' : 'Compress Image Now'}
                            </button>
                        )}
                    </div>
                )}
            </div>
            <AdBanner />
        </div>
    );
};

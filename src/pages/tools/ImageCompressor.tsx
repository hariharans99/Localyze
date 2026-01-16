import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCog, FaRedo } from 'react-icons/fa';

export const ImageCompressor = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [unit, setUnit] = useState<'MB' | 'KB'>('MB');
    const [qualityPriority, setQualityPriority] = useState<'size' | 'color'>('color');
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
        if (file.size / 1024 / 1024 <= targetSizeMB) {
            toast.info(`File is already ${(file.size / 1024 / 1024).toFixed(2)} MB, under your target of ${targetSizeMB} MB.`);
            setCompressedFile(file);
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        try {
            let compressed = file;
            let attempt = 0;
            const maxAttempts = 3;

            // Adjust strategy based on quality priority
            const minQuality = qualityPriority === 'color' ? 0.7 : 0.5;

            // Iterative compression approach
            while (attempt < maxAttempts) {
                attempt++;

                // Adjust quality based on attempt and priority
                const qualityFactor = attempt === 1 ? 1 : (attempt === 2 ? 0.85 : minQuality);
                const adjustedMaxSize = targetSizeMB * qualityFactor;

                const compressOptions = {
                    ...options,
                    maxSizeMB: adjustedMaxSize,
                    fileType: qualityPriority === 'color' ? file.type : undefined, // Preserve format if color priority
                    onProgress: (progress: number) => {
                        setProgress(Math.round((attempt - 1) / maxAttempts * 100 + progress / maxAttempts));
                    }
                };

                compressed = await imageCompression(compressed, compressOptions);

                // Check if we're within tolerance
                const tolerance = qualityPriority === 'color' ? 1.2 : 1.1; // More lenient if color priority
                if (compressed.size <= targetSizeBytes * tolerance) {
                    break;
                }

                // If still too large and we have more attempts, continue
                if (attempt < maxAttempts) {
                    setProgress(Math.round(attempt / maxAttempts * 100));
                }
            }

            setProgress(100);
            setCompressedFile(compressed);
            await incrementUsage('compress');

            if (compressed.size <= targetSizeBytes * 1.2) {
                toast.success("Image compressed successfully!");
            } else {
                toast.success(`Compressed to ${(compressed.size / 1024 / 1024).toFixed(2)} MB (close to ${targetSizeMB} MB target)`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Compression failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

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
                                                value="color"
                                                checked={qualityPriority === 'color'}
                                                onChange={() => setQualityPriority('color')}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.9rem' }}>Prefer Colors</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="quality"
                                                value="size"
                                                checked={qualityPriority === 'size'}
                                                onChange={() => setQualityPriority('size')}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.9rem' }}>Prefer Size</span>
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
                                Your target size is very aggressive ({((options.maxSizeMB / (file.size / 1024 / 1024)) * 100).toFixed(1)}% of original).
                                {qualityPriority === 'color' ?
                                    ' Colors will be preserved but final size may be larger than target.' :
                                    ' Expect significant color loss or grayscale conversion.'}
                            </div>
                        )}

                        {isProcessing && (
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-muted)'
                                }}>
                                    <span>Compressing...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    backgroundColor: 'var(--bg-surface-hover)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        backgroundColor: 'var(--color-primary)',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
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

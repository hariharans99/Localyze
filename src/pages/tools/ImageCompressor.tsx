import { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCog, FaRedo, FaTrash, FaFileArchive, FaImage } from 'react-icons/fa';
import JSZip from 'jszip';
import { SEO } from '../../components/SEO';
import { compressImage, type CompressionOptions, type CompressionResult } from '../../utils/imageCompression';

interface ProcessedFile {
    file: File;
    preview: string; // Original image preview URL
    status: 'pending' | 'processing' | 'done' | 'error';
    result?: CompressionResult;
    compressedPreview?: string; // Compressed image preview URL
    progress?: {
        iteration: number;
        currentSize: number;
        quality: number;
    };
}

export const ImageCompressor = () => {
    const { checkLimit, incrementUsage, profile } = useUser();
    const toast = useToast();

    const [files, setFiles] = useState<ProcessedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Settings
    const [targetSize, setTargetSize] = useState(100);
    const [unit, setUnit] = useState<'MB' | 'KB'>('KB');
    const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');
    const [preserveDimensions, setPreserveDimensions] = useState(true);
    const [maxWidth, setMaxWidth] = useState<number>(1920);
    const [maxHeight, setMaxHeight] = useState<number>(1080);

    const getFormattedSize = (bytes: number) => {
        const kb = bytes / 1024;
        const mb = kb / 1024;
        return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
    };

    const handleFileSelect = async (selectedFiles: File | File[]) => {
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        const isFreeUser = !profile || profile.plan === 'free';

        if (isFreeUser && files.length + newFiles.length > 2) {
            toast.error(`Free tier limited to 2 images. You can only add ${Math.max(0, 2 - files.length)} more.`);
            const limitedFiles = newFiles.slice(0, Math.max(0, 2 - files.length));
            if (limitedFiles.length === 0) return;
            await processNewFiles(limitedFiles);
            return;
        }

        await processNewFiles(newFiles);
    };

    const processNewFiles = async (newFiles: File[]) => {
        const processedFiles: ProcessedFile[] = await Promise.all(
            newFiles.map(async (file) => {
                const preview = URL.createObjectURL(file);
                return {
                    file,
                    preview,
                    status: 'pending' as const
                };
            })
        );
        setFiles(prev => [...prev, ...processedFiles]);
    };

    const removeFile = (fileName: string) => {
        setFiles(prev => {
            const file = prev.find(f => f.file.name === fileName);
            if (file) {
                URL.revokeObjectURL(file.preview);
                if (file.compressedPreview) URL.revokeObjectURL(file.compressedPreview);
            }
            return prev.filter(f => f.file.name !== fileName);
        });
    };

    const handleReset = () => {
        files.forEach(f => {
            URL.revokeObjectURL(f.preview);
            if (f.compressedPreview) URL.revokeObjectURL(f.compressedPreview);
        });
        setFiles([]);
        setIsProcessing(false);
        setTargetSize(100);
        setUnit('KB');
        setFormat('image/jpeg');
        setPreserveDimensions(true);
        setMaxWidth(1920);
        setMaxHeight(1080);
    };

    const resetFileToRecompress = (fileName: string) => {
        setFiles(prev => prev.map(f => {
            if (f.file.name === fileName) {
                // Revoke compressed preview URL
                if (f.compressedPreview) URL.revokeObjectURL(f.compressedPreview);
                return {
                    ...f,
                    status: 'pending' as const,
                    result: undefined,
                    compressedPreview: undefined,
                    progress: undefined
                };
            }
            return f;
        }));
    };

    const compressSingleFile = async (processedFile: ProcessedFile) => {
        setFiles(prev => prev.map(f =>
            f.file.name === processedFile.file.name ? { ...f, status: 'processing' as const } : f
        ));

        try {
            const targetSizeKB = unit === 'KB' ? targetSize : targetSize * 1024;

            const options: CompressionOptions = {
                targetSizeKB,
                format,
                preserveDimensions,
                maxWidth: !preserveDimensions && maxWidth > 0 ? maxWidth : undefined,
                maxHeight: !preserveDimensions && maxHeight > 0 ? maxHeight : undefined,
                maxIterations: 15
            };

            const result = await compressImage(
                processedFile.file,
                options,
                (iteration, currentSize, quality) => {
                    setFiles(prev => prev.map(f =>
                        f.file.name === processedFile.file.name
                            ? { ...f, progress: { iteration, currentSize, quality } }
                            : f
                    ));
                }
            );

            // Create preview of compressed image
            const compressedPreview = URL.createObjectURL(result.blob);

            setFiles(prev => prev.map(f =>
                f.file.name === processedFile.file.name
                    ? { ...f, status: 'done' as const, result, compressedPreview, progress: undefined }
                    : f
            ));

            await incrementUsage('compress');
        } catch (error) {
            console.error('Compression error:', error);
            setFiles(prev => prev.map(f =>
                f.file.name === processedFile.file.name
                    ? { ...f, status: 'error' as const, progress: undefined }
                    : f
            ));
            toast.error(`Failed to compress ${processedFile.file.name}`);
        }
    };

    const handleCompressAll = async () => {
        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        const isFreeUser = !profile || profile.plan === 'free';
        const pendingFiles = files.filter(f => f.status === 'pending');
        const filesToProcess = isFreeUser ? pendingFiles.slice(0, 2) : pendingFiles;

        if (isFreeUser && pendingFiles.length > 2) {
            toast.error(`Free tier: Processing first 2 images only.`);
        }

        setIsProcessing(true);

        for (const file of filesToProcess) {
            await compressSingleFile(file);
        }

        setIsProcessing(false);
        toast.success(`Compression complete!`);
    };

    const handleDownloadAll = async () => {
        const completedFiles = files.filter(f => f.status === 'done' && f.result);
        if (completedFiles.length === 0) return;

        const zip = new JSZip();
        completedFiles.forEach(({ file, result }) => {
            if (result) {
                const ext = format.split('/')[1];
                zip.file(`compressed-${file.name.replace(/\.[^/.]+$/, '')}.${ext}`, result.blob);
            }
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "compressed-images.zip";
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadSingle = (processedFile: ProcessedFile) => {
        if (!processedFile.result) return;

        const ext = format.split('/')[1];
        const url = URL.createObjectURL(processedFile.result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed-${processedFile.file.name.replace(/\.[^/.]+$/, '')}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <SEO
                title="Image Compressor - Precise Size Control"
                description="Compress images to exact file sizes with format choice"
            />
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Image Size Reducer
            </h1>

            <AdBanner style={{ marginBottom: '2rem' }} />

            {files.length === 0 ? (
                <>
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept="image/*"
                        label="Upload Images to Compress"
                        multiple={true}
                    />
                    {(!profile || profile.plan === 'free') && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: '#f59e0b',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                        }}>
                            ⚠️ Free tier: Maximum 2 images per compression
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-surface p-8 rounded-lg border border-subtle">
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '0.5rem' }}>{files.length} Images Selected</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Configure and compress</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => document.getElementById('add-more-input')?.click()}
                                style={{ color: 'var(--color-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                + Add More
                            </button>
                            <input
                                id="add-more-input"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    if (e.target.files?.length) {
                                        handleFileSelect(Array.from(e.target.files));
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
                                <FaRedo /> Reset All
                            </button>
                        </div>
                    </div>

                    {/* Settings */}
                    <div style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-app)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <FaCog /> Compression Settings
                        </h4>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {/* Target Size */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <label style={{ fontWeight: 500, minWidth: '100px' }}>Target Size:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={targetSize}
                                    onChange={(e) => setTargetSize(parseFloat(e.target.value) || 1)}
                                    style={{
                                        padding: '0.5rem',
                                        width: '120px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-subtle)'
                                    }}
                                />
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value as 'MB' | 'KB')}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-subtle)',
                                        backgroundColor: 'var(--bg-surface)'
                                    }}
                                >
                                    <option value="KB">KB</option>
                                    <option value="MB">MB</option>
                                </select>
                            </div>

                            {/* Format Selection */}
                            <div>
                                <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.75rem' }}>Output Format:</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                    {[
                                        { value: 'image/jpeg', label: 'JPEG', desc: 'Smallest, good for photos' },
                                        { value: 'image/webp', label: 'WebP', desc: 'Modern, 25% better' },
                                        { value: 'image/png', label: 'PNG', desc: 'Lossless, larger files' }
                                    ].map((fmt) => (
                                        <button
                                            key={fmt.value}
                                            onClick={() => setFormat(fmt.value as any)}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: `2px solid ${format === fmt.value ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                                backgroundColor: format === fmt.value ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
                                                color: format === fmt.value ? 'var(--color-primary)' : 'var(--text-main)',
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600 }}>{fmt.label}</div>
                                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>{fmt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dimensions */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        id="preserveDimensions"
                                        checked={preserveDimensions}
                                        onChange={(e) => setPreserveDimensions(e.target.checked)}
                                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="preserveDimensions" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                                        Preserve Original Dimensions
                                    </label>
                                </div>
                                {!preserveDimensions && (
                                    <div style={{ display: 'flex', gap: '1rem', marginLeft: '1.7rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Max Width (px)</label>
                                            <input
                                                type="number"
                                                value={maxWidth}
                                                onChange={(e) => setMaxWidth(parseInt(e.target.value) || 0)}
                                                style={{
                                                    padding: '0.4rem',
                                                    width: '100px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid var(--border-subtle)'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Max Height (px)</label>
                                            <input
                                                type="number"
                                                value={maxHeight}
                                                onChange={(e) => setMaxHeight(parseInt(e.target.value) || 0)}
                                                style={{
                                                    padding: '0.4rem',
                                                    width: '100px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid var(--border-subtle)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* File List with Previews */}
                    <div style={{ marginBottom: '2rem', maxHeight: '600px', overflowY: 'auto' }}>
                        {files.map((processedFile) => (
                            <div
                                key={processedFile.file.name}
                                style={{
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    backgroundColor: 'var(--bg-surface)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{processedFile.file.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Original: {getFormattedSize(processedFile.file.size)}
                                            {processedFile.result && (
                                                <>
                                                    {' → '}
                                                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                                                        {getFormattedSize(processedFile.result.compressedSize)}
                                                    </span>
                                                    {' '}({processedFile.result.compressionRatio.toFixed(1)}x smaller)
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFile(processedFile.file.name)}
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '1rem' }}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>

                                {/* Image Previews */}
                                <div style={{ display: 'grid', gridTemplateColumns: processedFile.compressedPreview ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                                    {/* Original Preview */}
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                            ORIGINAL
                                        </div>
                                        <img
                                            src={processedFile.preview}
                                            alt="Original"
                                            style={{
                                                width: '100%',
                                                height: '200px',
                                                objectFit: 'contain',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: '#000',
                                                border: '1px solid var(--border-subtle)'
                                            }}
                                        />
                                    </div>

                                    {/* Compressed Preview */}
                                    {processedFile.compressedPreview && (
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#10b981' }}>
                                                COMPRESSED
                                            </div>
                                            <img
                                                src={processedFile.compressedPreview}
                                                alt="Compressed"
                                                style={{
                                                    width: '100%',
                                                    height: '200px',
                                                    objectFit: 'contain',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: '#000',
                                                    border: '2px solid #10b981'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Progress */}
                                {processedFile.status === 'processing' && processedFile.progress && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                🔄 Compressing... Iteration {processedFile.progress.iteration}/15
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                Quality: {(processedFile.progress.quality * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Current size: {getFormattedSize(processedFile.progress.currentSize)}
                                        </div>
                                    </div>
                                )}

                                {/* Status & Actions */}
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        {processedFile.status === 'done' && (
                                            <span style={{
                                                padding: '0.4rem 0.75rem',
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}>
                                                ✓ Done
                                            </span>
                                        )}
                                        {processedFile.status === 'pending' && (
                                            <span style={{
                                                padding: '0.4rem 0.75rem',
                                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                color: '#f59e0b',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}>
                                                ⏱ Waiting
                                            </span>
                                        )}
                                        {processedFile.status === 'error' && (
                                            <span style={{
                                                padding: '0.4rem 0.75rem',
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                color: '#ef4444',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}>
                                                ✗ Error
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {processedFile.status === 'done' && (
                                            <>
                                                <button
                                                    onClick={() => resetFileToRecompress(processedFile.file.name)}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        backgroundColor: 'var(--bg-surface-hover)',
                                                        color: 'var(--color-primary)',
                                                        border: '1px solid var(--color-primary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <FaRedo /> Re-compress
                                                </button>
                                                <button
                                                    onClick={() => downloadSingle(processedFile)}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        backgroundColor: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <FaDownload /> Download
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handleCompressAll}
                            disabled={isProcessing || files.every(f => f.status !== 'pending')}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                backgroundColor: isProcessing ? 'var(--bg-surface-hover)' : 'var(--color-primary)',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: isProcessing ? 'wait' : 'pointer',
                                border: 'none',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: (isProcessing || files.every(f => f.status !== 'pending')) ? 0.7 : 1
                            }}
                        >
                            <FaImage />
                            {isProcessing ? 'Compressing...' : 'Compress All Images'}
                        </button>

                        {files.some(f => f.status === 'done') && (
                            <button
                                onClick={handleDownloadAll}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <FaFileArchive /> Download All (ZIP)
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* How it Works */}
            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How it Works</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload Images</strong>: Select one or multiple images with instant preview</li>
                    <li><strong>Set Target Size</strong>: Choose exact file size you want (e.g., 100 KB)</li>
                    <li><strong>Choose Format</strong>: JPEG (smallest), WebP (balanced), or PNG (lossless)</li>
                    <li><strong>Compress</strong>: Binary search algorithm finds the perfect quality to hit your target size</li>
                    <li><strong>Compare & Download</strong>: See before/after previews and download individually or as ZIP</li>
                </ol>
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                    💡 <strong>Tip:</strong> All compression happens 100% in your browser. Your images never leave your device!
                </div>
            </div>

            <AdBanner />
        </div>
    );
};

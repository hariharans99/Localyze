import { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaCog, FaRedo, FaTrash, FaFileArchive, FaImage, FaMagic } from 'react-icons/fa';
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
    const toast = useToast();
    const [files, setFiles] = useState<ProcessedFile[]>([]);
    const [targetSize, setTargetSize] = useState<number>(100);
    const [unit, setUnit] = useState<'MB' | 'KB'>('KB');
    const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');
    const [preserveDimensions, setPreserveDimensions] = useState<boolean>(false);
    const [maxWidth, setMaxWidth] = useState<number>(1920);
    const [maxHeight, setMaxHeight] = useState<number>(1080);
    const [isProcessing, setIsProcessing] = useState(false);
    const [compressionMode, setCompressionMode] = useState<'normal' | 'ultra'>('normal');

    // Standard preset sizes
    const targetPresets = [
        { label: '20 KB (Gov/Exam)', size: 20, unit: 'KB' as const },
        { label: '50 KB (Passport/Visa)', size: 50, unit: 'KB' as const },
        { label: '100 KB (Web/Email)', size: 100, unit: 'KB' as const },
        { label: '200 KB', size: 200, unit: 'KB' as const },
        { label: '500 KB', size: 500, unit: 'KB' as const },
        { label: '1 MB', size: 1, unit: 'MB' as const },
        { label: '2 MB', size: 2, unit: 'MB' as const },
    ];

    const handleFileSelect = (selectedFiles: File | File[]) => {
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        const processedNewFiles: ProcessedFile[] = newFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            status: 'pending'
        }));

        setFiles(prev => [...prev, ...processedNewFiles]);
    };

    const handleReset = () => {
        files.forEach(f => {
            URL.revokeObjectURL(f.preview);
            if (f.compressedPreview) URL.revokeObjectURL(f.compressedPreview);
        });
        setFiles([]);
    };

    const removeFile = (fileName: string) => {
        setFiles(prev => {
            const fileToRemove = prev.find(f => f.file.name === fileName);
            if (fileToRemove) {
                URL.revokeObjectURL(fileToRemove.preview);
                if (fileToRemove.compressedPreview) URL.revokeObjectURL(fileToRemove.compressedPreview);
            }
            return prev.filter(f => f.file.name !== fileName);
        });
    };

    const resetFileToRecompress = (fileName: string) => {
        setFiles(prev => prev.map(f => {
            if (f.file.name === fileName) {
                if (f.compressedPreview) URL.revokeObjectURL(f.compressedPreview);
                return { ...f, status: 'pending', result: undefined, compressedPreview: undefined, progress: undefined };
            }
            return f;
        }));
    };

    const getFormattedSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    const compressSingleFile = async (processedFile: ProcessedFile) => {
        setFiles(prev => prev.map(f =>
            f.file.name === processedFile.file.name
                ? { ...f, status: 'processing' as const, progress: { iteration: 0, currentSize: 0, quality: 0.9 } }
                : f
        ));

        try {
            let result: CompressionResult;

            if (compressionMode === 'ultra') {
                const targetKB = (processedFile.file.size / 1024) * 0.1;
                result = await compressImage(
                    processedFile.file,
                    {
                        targetSizeKB: Math.max(1, targetKB),
                        format: 'image/webp',
                        preserveDimensions: false,
                        maxWidth: 1280,
                        maxHeight: 1280,
                        maxIterations: 12
                    },
                    (iteration, currentSize, quality) => {
                        setFiles(prev => prev.map(f =>
                            f.file.name === processedFile.file.name
                                ? { ...f, progress: { iteration, currentSize, quality } }
                                : f
                        ));
                    }
                );
            } else {
                const targetKB = unit === 'MB' ? targetSize * 1024 : targetSize;
                const compressionOptions: CompressionOptions = {
                    targetSizeKB: targetKB,
                    format,
                    preserveDimensions,
                    maxWidth: !preserveDimensions && maxWidth > 0 ? maxWidth : undefined,
                    maxHeight: !preserveDimensions && maxHeight > 0 ? maxHeight : undefined,
                    maxIterations: 14
                };

                result = await compressImage(
                    processedFile.file,
                    compressionOptions,
                    (iteration, currentSize, quality) => {
                        setFiles(prev => prev.map(f =>
                            f.file.name === processedFile.file.name
                                ? { ...f, progress: { iteration, currentSize, quality } }
                                : f
                        ));
                    }
                );
            }

            const compressedPreview = URL.createObjectURL(result.blob);

            setFiles(prev => prev.map(f =>
                f.file.name === processedFile.file.name
                    ? { ...f, status: 'done' as const, result, compressedPreview, progress: undefined }
                    : f
            ));
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
        const pendingFiles = files.filter(f => f.status === 'pending');
        setIsProcessing(true);

        for (const file of pendingFiles) {
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
        <div className="container" style={{ maxWidth: '1000px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="Image Compressor - Precise Target Size Control"
                description="Compress images to exact file sizes (e.g. 50KB, 100KB, 200KB) with adaptive quality search and format choices."
            />
            <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.5rem', textAlign: 'center', wordBreak: 'break-word' }}>
                Precision Image Compressor
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                Target exact file size budgets with adaptive stepped bicubic scaling and multi-tier binary search.
            </p>

            {files.length === 0 ? (
                <FileUploader
                    onFileSelect={handleFileSelect}
                    accept="image/*"
                    label="Upload Images to Compress"
                    multiple={true}
                />
            ) : (
                <div className="glass-panel" style={{
                    padding: 'clamp(1rem, 3.5vw, 2.25rem)',
                    borderRadius: 'var(--radius-xl)',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1.75rem',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        width: '100%',
                        minWidth: 0
                    }}>
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                            <h3 style={{ marginBottom: '0.25rem', fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', wordBreak: 'break-word' }}>
                                {files.length} Image{files.length > 1 ? 's' : ''} Selected
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', lineHeight: '1.5' }}>
                                Total size: {getFormattedSize(files.reduce((acc, f) => acc + f.file.size, 0))}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                onClick={() => document.getElementById('add-more-input')?.click()}
                                className="glass-btn-secondary"
                                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            >
                                + Add More
                            </button>
                            <input
                                id="add-more-input"
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files?.length) {
                                        handleFileSelect(Array.from(e.target.files));
                                    }
                                }}
                            />
                            <button
                                onClick={handleReset}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 500,
                                    fontSize: '0.85rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.45rem 0.6rem'
                                }}
                            >
                                <FaRedo /> Reset All
                            </button>
                        </div>
                    </div>

                    {/* UPLOADED FILES & LIVE PREVIEWS GALLERY (Prominently Placed at the Top) */}
                    <div style={{ marginBottom: '2rem', width: '100%', minWidth: 0 }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                            gap: '1rem',
                            width: '100%',
                            minWidth: 0
                        }}>
                            {files.map((processedFile) => (
                                <div
                                    key={processedFile.file.name}
                                    style={{
                                        border: processedFile.status === 'done' ? '2px solid #10b981' : '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '1rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {processedFile.file.name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                    Original: {getFormattedSize(processedFile.file.size)}
                                                    {processedFile.result && (
                                                        <>
                                                            {' → '}
                                                            <span style={{ color: '#10b981', fontWeight: 700 }}>
                                                                {getFormattedSize(processedFile.result.compressedSize)}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFile(processedFile.file.name)}
                                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}
                                                title="Remove file"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>

                                        {/* Preview Thumbnail with Fallback */}
                                        <div style={{
                                            width: '100%',
                                            height: '140px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-subtle)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            marginBottom: '0.75rem',
                                            position: 'relative'
                                        }}>
                                            {processedFile.compressedPreview ? (
                                                <img
                                                    src={processedFile.compressedPreview}
                                                    alt="Compressed"
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                />
                                            ) : processedFile.preview ? (
                                                <img
                                                    src={processedFile.preview}
                                                    alt="Original"
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-dim)' }}>
                                                    <FaImage style={{ fontSize: '2rem', marginBottom: '0.4rem' }} />
                                                    <span style={{ fontSize: '0.75rem' }}>Image Preview</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress Probe Indicator */}
                                        {processedFile.status === 'processing' && processedFile.progress && (
                                            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255, 42, 68, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 42, 68, 0.25)', marginBottom: '0.75rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                                    🔄 Optimizing... Pass {processedFile.progress.iteration} ({(processedFile.progress.quality * 100).toFixed(0)}%)
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Bar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {processedFile.status === 'done' ? (
                                            <>
                                                <span className="neon-badge neon-badge-success" style={{ fontSize: '0.7rem' }}>
                                                    ✓ {processedFile.result ? `${((1 - (processedFile.result.compressedSize / processedFile.file.size)) * 100).toFixed(0)}% reduced` : 'Done'}
                                                </span>
                                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                    <button
                                                        onClick={() => resetFileToRecompress(processedFile.file.name)}
                                                        className="glass-btn-secondary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                                    >
                                                        <FaRedo />
                                                    </button>
                                                    <button
                                                        onClick={() => downloadSingle(processedFile)}
                                                        className="glass-btn-primary"
                                                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                                                    >
                                                        <FaDownload /> Download
                                                    </button>
                                                </div>
                                            </>
                                        ) : processedFile.status === 'error' ? (
                                            <span className="neon-badge" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', fontSize: '0.7rem' }}>
                                                ✗ Error
                                            </span>
                                        ) : (
                                            <span className="neon-badge" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)', fontSize: '0.7rem' }}>
                                                ⏱ Ready
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Settings Panel */}
                    <div style={{
                        marginBottom: '2rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--glass-border)',
                        padding: 'clamp(0.85rem, 2.5vw, 1.5rem)',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box'
                    }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: 'clamp(1rem, 2.5vw, 1.15rem)' }}>
                            <FaCog /> Compression Settings & Target Size
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: 0 }}>
                            {/* Compression Mode */}
                            <div style={{ width: '100%', minWidth: 0 }}>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.65rem', fontSize: '0.88rem' }}>
                                    Compression Mode
                                </label>
                                <div className="responsive-mode-grid">
                                    <button
                                        type="button"
                                        onClick={() => setCompressionMode('normal')}
                                        style={{
                                            padding: 'clamp(0.75rem, 2vw, 1rem)',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${compressionMode === 'normal' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                            backgroundColor: compressionMode === 'normal' ? 'rgba(255, 42, 68, 0.12)' : 'var(--bg-surface)',
                                            color: 'var(--text-main)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            width: '100%',
                                            minWidth: 0,
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, marginBottom: '0.2rem', color: compressionMode === 'normal' ? 'var(--color-primary)' : 'var(--text-main)', fontSize: '0.92rem' }}>
                                            Custom Target Size
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                                            Specify exact KB/MB for official portals.
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setCompressionMode('ultra')}
                                        style={{
                                            padding: 'clamp(0.75rem, 2vw, 1rem)',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${compressionMode === 'ultra' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                            backgroundColor: compressionMode === 'ultra' ? 'rgba(255, 42, 68, 0.12)' : 'var(--bg-surface)',
                                            color: 'var(--text-main)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            width: '100%',
                                            minWidth: 0,
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, marginBottom: '0.2rem', color: compressionMode === 'ultra' ? 'var(--color-primary)' : 'var(--text-main)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <FaMagic /> Auto Maximum
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                                            Shrinks file size by ~90% cleanly.
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Target Size Inputs & Presets (if Custom Mode) */}
                            {compressionMode === 'normal' && (
                                <div style={{ width: '100%', minWidth: 0 }}>
                                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                                        Target File Size
                                    </label>
                                    <div className="responsive-input-group" style={{ marginBottom: '0.75rem' }}>
                                        <input
                                            type="number"
                                            value={targetSize}
                                            onChange={(e) => setTargetSize(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="glass-input"
                                            style={{ padding: '0.6rem 0.75rem' }}
                                            min="1"
                                        />
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value as any)}
                                            className="glass-input"
                                            style={{ padding: '0.6rem 0.75rem' }}
                                        >
                                            <option value="KB">KB</option>
                                            <option value="MB">MB</option>
                                        </select>
                                    </div>

                                    {/* Presets Chips */}
                                    <div className="responsive-chips-wrap">
                                        {targetPresets.map((preset) => {
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
                            )}

                            {/* Output Format */}
                            <div style={{ width: '100%', minWidth: 0 }}>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                                    Output Format
                                </label>
                                <div className="responsive-format-grid">
                                    {[
                                        { mime: 'image/jpeg', label: 'JPEG (.jpg)', desc: 'Standard & Gov portals' },
                                        { mime: 'image/webp', label: 'WebP (.webp)', desc: 'Modern & compact' },
                                        { mime: 'image/png', label: 'PNG (.png)', desc: 'Lossless quality' },
                                    ].map(fmt => {
                                        const isSelected = format === fmt.mime;
                                        return (
                                            <button
                                                key={fmt.mime}
                                                type="button"
                                                onClick={() => setFormat(fmt.mime as any)}
                                                style={{
                                                    padding: '0.65rem 0.85rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                                    backgroundColor: isSelected ? 'rgba(255, 42, 68, 0.12)' : 'var(--bg-surface)',
                                                    color: 'var(--text-main)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    width: '100%',
                                                    minWidth: 0,
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                                                    {fmt.label}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {fmt.desc}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Resolution Limits */}
                            <div style={{ width: '100%', minWidth: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', marginBottom: '0.75rem', fontSize: '0.88rem', fontWeight: 500 }}>
                                    <input
                                        type="checkbox"
                                        checked={preserveDimensions}
                                        onChange={(e) => setPreserveDimensions(e.target.checked)}
                                        style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                                    />
                                    Preserve Original Dimensions
                                </label>

                                {!preserveDimensions && (
                                    <div className="responsive-resolution-grid">
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Max Width (px)</label>
                                            <input
                                                type="number"
                                                value={maxWidth}
                                                onChange={(e) => setMaxWidth(parseInt(e.target.value) || 1920)}
                                                className="glass-input"
                                                style={{ width: '100%', padding: '0.55rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Max Height (px)</label>
                                            <input
                                                type="number"
                                                value={maxHeight}
                                                onChange={(e) => setMaxHeight(parseInt(e.target.value) || 1080)}
                                                className="glass-input"
                                                style={{ width: '100%', padding: '0.55rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Primary Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
                        <button
                            onClick={handleCompressAll}
                            disabled={isProcessing || files.every(f => f.status !== 'pending')}
                            className="glass-btn-primary"
                            style={{
                                flex: '1 1 200px',
                                padding: '0.95rem',
                                fontSize: '1rem',
                                opacity: (isProcessing || files.every(f => f.status !== 'pending')) ? 0.6 : 1,
                                boxSizing: 'border-box'
                            }}
                        >
                            <FaImage />
                            {isProcessing ? 'Compressing Images...' : `Compress ${files.filter(f => f.status === 'pending').length} Ready Images`}
                        </button>

                        {files.some(f => f.status === 'done') && (
                            <button
                                onClick={handleDownloadAll}
                                className="glass-btn-primary"
                                style={{
                                    flex: '1 1 180px',
                                    padding: '0.95rem 1.25rem',
                                    fontSize: '1rem',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <FaFileArchive /> Download All (ZIP)
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

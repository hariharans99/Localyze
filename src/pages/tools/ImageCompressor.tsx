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
            <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '1.5rem', textAlign: 'center', wordBreak: 'break-word' }}>
                Precision Image Compressor
            </h1>

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
                                {files.length} Images Selected
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', lineHeight: '1.5' }}>
                                Configure precision compression parameters and target file size
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                                    gap: '0.4rem',
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

                    {/* Settings Panel */}
                    <div style={{
                        marginBottom: '2rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        padding: 'clamp(0.85rem, 2.5vw, 1.5rem)',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box'
                    }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: 'clamp(1rem, 2.5vw, 1.15rem)' }}>
                            <FaCog /> Compression Settings
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: 0 }}>
                            {/* Compression Mode (2 columns on desktop, 1 column on <= 520px) */}
                            <div style={{ width: '100%', minWidth: 0 }}>
                                <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                    Compression Mode:
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                                    gap: '0.75rem',
                                    width: '100%',
                                    minWidth: 0
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setCompressionMode('normal')}
                                        style={{
                                            padding: 'clamp(0.75rem, 2vw, 1rem)',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${compressionMode === 'normal' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                            backgroundColor: compressionMode === 'normal' ? 'rgba(255, 42, 68, 0.12)' : 'var(--bg-surface)',
                                            color: compressionMode === 'normal' ? 'var(--color-primary)' : 'var(--text-main)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            boxSizing: 'border-box',
                                            width: '100%',
                                            minWidth: 0
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                                            <FaCog /> Exact Target Size Mode
                                        </div>
                                        <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                            Hits exact KB/MB size with maximum visual quality
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCompressionMode('ultra');
                                            setFormat('image/webp');
                                        }}
                                        style={{
                                            padding: 'clamp(0.75rem, 2vw, 1rem)',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${compressionMode === 'ultra' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                            backgroundColor: compressionMode === 'ultra' ? 'rgba(255, 42, 68, 0.12)' : 'var(--bg-surface)',
                                            color: compressionMode === 'ultra' ? 'var(--color-primary)' : 'var(--text-main)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            boxSizing: 'border-box',
                                            width: '100%',
                                            minWidth: 0
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                                            <FaMagic /> Ultra Maximum Compression
                                        </div>
                                        <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                            Up to 90-95% reduction with crisp bicubic scaling
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Target Size - Normal mode */}
                            {compressionMode === 'normal' && (
                                <div style={{ width: '100%', minWidth: 0 }}>
                                    <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Target File Size:
                                    </label>
                                    
                                    {/* Preset Quick Buttons that wrap naturally */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.75rem', width: '100%', minWidth: 0 }}>
                                        {targetPresets.map((preset) => (
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
                                                    backgroundColor: targetSize === preset.size && unit === preset.unit ? 'rgba(255, 42, 68, 0.15)' : 'var(--bg-surface)',
                                                    color: targetSize === preset.size && unit === preset.unit ? 'var(--color-primary)' : 'var(--text-muted)',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    boxSizing: 'border-box',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
                                        <input
                                            type="number"
                                            min="1"
                                            value={targetSize}
                                            onChange={(e) => setTargetSize(parseFloat(e.target.value) || 1)}
                                            className="glass-input"
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                width: 'min(100%, 140px)',
                                                maxWidth: '100%',
                                                minWidth: 0,
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-subtle)',
                                                backgroundColor: 'var(--bg-surface)',
                                                color: 'var(--text-main)',
                                                fontWeight: 600,
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value as 'MB' | 'KB')}
                                            className="glass-input"
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-subtle)',
                                                backgroundColor: 'var(--bg-surface)',
                                                color: 'var(--text-main)',
                                                fontWeight: 600,
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <option value="KB">KB</option>
                                            <option value="MB">MB</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Format Selection (1 column on small screens, multi-col on larger) */}
                            <div style={{ width: '100%', minWidth: 0 }}>
                                <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                    Output Format:
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                                    gap: '0.75rem',
                                    width: '100%',
                                    minWidth: 0
                                }}>
                                    {[
                                        { value: 'image/jpeg', label: 'JPEG', desc: 'Universal, best compatibility' },
                                        { value: 'image/webp', label: 'WebP', desc: 'Modern, 25-35% more compact' },
                                        { value: 'image/png', label: 'PNG', desc: 'Lossless graphic format' }
                                    ].map((fmt) => (
                                        <button
                                            key={fmt.value}
                                            type="button"
                                            onClick={() => setFormat(fmt.value as any)}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: `2px solid ${format === fmt.value ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                                backgroundColor: format === fmt.value ? 'rgba(255, 42, 68, 0.12)' : 'var(--bg-surface)',
                                                color: format === fmt.value ? 'var(--color-primary)' : 'var(--text-main)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                width: '100%',
                                                minWidth: 0,
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{fmt.label}</div>
                                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                                {fmt.desc}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dimension Options */}
                            <div style={{ width: '100%', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        id="preserveDimensions"
                                        checked={preserveDimensions}
                                        onChange={(e) => setPreserveDimensions(e.target.checked)}
                                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', marginTop: '0.1rem', flexShrink: 0 }}
                                    />
                                    <label htmlFor="preserveDimensions" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500, lineHeight: '1.4' }}>
                                        Strictly Preserve Original Resolution
                                    </label>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.5', wordBreak: 'break-word' }}>
                                    {preserveDimensions
                                        ? 'Dimensions will never change (quality is compressed up to its technical limit).'
                                        : '✨ Adaptive scaling enabled: If an image resolution is too high to fit in the target size, it will be automatically and crisply scaled down to strictly hit your target size.'}
                                </p>
                                {!preserveDimensions && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', minWidth: 0 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Max Resolution Cap:</span>
                                            {[
                                                { label: '4K (3840px)', w: 3840, h: 2160 },
                                                { label: '1080p (1920px)', w: 1920, h: 1080 },
                                                { label: '720p (1280px)', w: 1280, h: 720 },
                                                { label: 'Compact (800px)', w: 800, h: 600 }
                                            ].map(r => (
                                                <button
                                                    key={r.label}
                                                    type="button"
                                                    onClick={() => { setMaxWidth(r.w); setMaxHeight(r.h); }}
                                                    className="glass-btn-secondary"
                                                    style={{
                                                        padding: '0.25rem 0.55rem',
                                                        fontSize: '0.75rem',
                                                        whiteSpace: 'nowrap',
                                                        boxSizing: 'border-box',
                                                        borderColor: maxWidth === r.w ? 'var(--color-primary)' : 'var(--glass-border)',
                                                        color: maxWidth === r.w ? 'var(--color-primary)' : 'inherit'
                                                    }}
                                                >
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Max Width:</label>
                                                <input
                                                    type="number"
                                                    value={maxWidth}
                                                    onChange={(e) => setMaxWidth(parseInt(e.target.value) || 0)}
                                                    className="glass-input"
                                                    style={{
                                                        padding: '0.35rem 0.6rem',
                                                        width: '85px',
                                                        fontSize: '0.85rem',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>px</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Max Height:</label>
                                                <input
                                                    type="number"
                                                    value={maxHeight}
                                                    onChange={(e) => setMaxHeight(parseInt(e.target.value) || 0)}
                                                    className="glass-input"
                                                    style={{
                                                        padding: '0.35rem 0.6rem',
                                                        width: '85px',
                                                        fontSize: '0.85rem',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>px</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* File List with Responsive Previews */}
                    <div style={{ marginBottom: '2rem', maxHeight: '600px', overflowY: 'auto', width: '100%', minWidth: 0 }}>
                        {files.map((processedFile) => (
                            <div
                                key={processedFile.file.name}
                                className="glass-panel"
                                style={{
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'clamp(0.85rem, 2.5vw, 1.25rem)',
                                    marginBottom: '1rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    width: '100%',
                                    maxWidth: '100%',
                                    minWidth: 0,
                                    boxSizing: 'border-box'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', wordBreak: 'break-word' }}>
                                            {processedFile.file.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                            Original: {getFormattedSize(processedFile.file.size)}
                                            {processedFile.result && (
                                                <>
                                                    {' → '}
                                                    <span style={{ color: '#10b981', fontWeight: 700 }}>
                                                        {getFormattedSize(processedFile.result.compressedSize)}
                                                    </span>
                                                    {' '}({processedFile.result.compressionRatio >= 1
                                                        ? `${((1 - 1 / processedFile.result.compressionRatio) * 100).toFixed(0)}% smaller`
                                                        : 'same size'})
                                                    {' • '}{processedFile.result.dimensions.width}×{processedFile.result.dimensions.height}px
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFile(processedFile.file.name)}
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', flexShrink: 0 }}
                                        title="Remove file"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>

                                {/* Responsive Image Previews Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: processedFile.compressedPreview ? 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' : '1fr',
                                    gap: '1rem',
                                    width: '100%',
                                    minWidth: 0
                                }}>
                                    {/* Original Preview */}
                                    <div style={{ width: '100%', minWidth: 0 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                                            ORIGINAL
                                        </div>
                                        <img
                                            src={processedFile.preview}
                                            alt="Original"
                                            style={{
                                                width: '100%',
                                                height: '180px',
                                                objectFit: 'contain',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                border: '1px solid var(--border-subtle)',
                                                display: 'block'
                                            }}
                                        />
                                    </div>

                                    {/* Compressed Preview */}
                                    {processedFile.compressedPreview && (
                                        <div style={{ width: '100%', minWidth: 0 }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.4rem', color: '#10b981' }}>
                                                COMPRESSED ({processedFile.result ? getFormattedSize(processedFile.result.compressedSize) : ''})
                                            </div>
                                            <img
                                                src={processedFile.compressedPreview}
                                                alt="Compressed"
                                                style={{
                                                    width: '100%',
                                                    height: '180px',
                                                    objectFit: 'contain',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                    border: '2px solid #10b981',
                                                    display: 'block'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Progress Indicator */}
                                {processedFile.status === 'processing' && processedFile.progress && (
                                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255, 42, 68, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 42, 68, 0.25)', width: '100%', boxSizing: 'border-box' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                🔄 Optimizing quality... Pass {processedFile.progress.iteration}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                Quality: {(processedFile.progress.quality * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Current probe size: {getFormattedSize(processedFile.progress.currentSize)}
                                        </div>
                                    </div>
                                )}

                                {/* Status & Actions */}
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', width: '100%', minWidth: 0 }}>
                                    <div>
                                        {processedFile.status === 'done' && (
                                            <span className="neon-badge neon-badge-success">
                                                ✓ Compressed
                                            </span>
                                        )}
                                        {processedFile.status === 'pending' && (
                                            <span className="neon-badge" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)' }}>
                                                ⏱ Ready
                                            </span>
                                        )}
                                        {processedFile.status === 'error' && (
                                            <span className="neon-badge" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)' }}>
                                                ✗ Error
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {processedFile.status === 'done' && (
                                            <>
                                                <button
                                                    onClick={() => resetFileToRecompress(processedFile.file.name)}
                                                    className="glass-btn-secondary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                                >
                                                    <FaRedo /> Re-compress
                                                </button>
                                                <button
                                                    onClick={() => downloadSingle(processedFile)}
                                                    className="glass-btn-primary"
                                                    style={{
                                                        padding: '0.4rem 1rem',
                                                        fontSize: '0.85rem',
                                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                        boxShadow: '0 0 15px -3px rgba(16, 185, 129, 0.4)',
                                                        whiteSpace: 'nowrap'
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
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
                        <button
                            onClick={handleCompressAll}
                            disabled={isProcessing || files.every(f => f.status !== 'pending')}
                            className="glass-btn-primary"
                            style={{
                                flex: '1 1 200px',
                                padding: '0.9rem',
                                fontSize: '1rem',
                                opacity: (isProcessing || files.every(f => f.status !== 'pending')) ? 0.6 : 1,
                                boxSizing: 'border-box'
                            }}
                        >
                            <FaImage />
                            {isProcessing ? 'Compressing...' : 'Compress All Images'}
                        </button>

                        {files.some(f => f.status === 'done') && (
                            <button
                                onClick={handleDownloadAll}
                                className="glass-btn-primary"
                                style={{
                                    flex: '1 1 180px',
                                    padding: '0.9rem 1.25rem',
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

            {/* How it Works Information Block */}
            <div style={{
                marginTop: '3rem',
                backgroundColor: 'var(--bg-surface)',
                padding: 'clamp(1rem, 3vw, 2rem)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                boxSizing: 'border-box'
            }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', wordBreak: 'break-word' }}>
                    Adaptive Compression Technology
                </h3>
                <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: '1.8', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', wordBreak: 'break-word' }}>
                    <li><strong>Exact Size Matching</strong>: Our 2-tier bisection algorithm iteratively tests quantization tables until your target size is reached within &le; 1% margin.</li>
                    <li><strong>Bicubic Anti-Aliasing</strong>: Images downscaled by large ratios pass through stepped downsampling to eliminate moiré and edge artifacts.</li>
                    <li><strong>Adaptive Resolution</strong>: If a high-megapixel image cannot reach extreme targets (e.g., 20KB or 50KB) through quality alone, it adaptively downscales resolution cleanly.</li>
                    <li><strong>100% Privacy</strong>: No data is sent over the internet. Everything is computed in your browser using modern Web APIs.</li>
                </ol>
            </div>
        </div>
    );
};

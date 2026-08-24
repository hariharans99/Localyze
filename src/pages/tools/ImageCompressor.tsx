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
    const [isProcessing, setIsProcessing] = useState(false);

    // Compression Settings
    const [targetSize, setTargetSize] = useState(100);
    const [unit, setUnit] = useState<'MB' | 'KB'>('KB');
    const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');
    const [preserveDimensions, setPreserveDimensions] = useState(false);
    const [maxWidth, setMaxWidth] = useState<number>(1920);
    const [compressionMode, setCompressionMode] = useState<'normal' | 'ultra'>('normal');
    const [maxHeight, setMaxHeight] = useState<number>(1080);

    const targetPresets = [
        { label: '20 KB (Gov/Exam)', size: 20, unit: 'KB' as const },
        { label: '50 KB (Passport/Form)', size: 50, unit: 'KB' as const },
        { label: '100 KB (Web/Email)', size: 100, unit: 'KB' as const },
        { label: '200 KB', size: 200, unit: 'KB' as const },
        { label: '500 KB', size: 500, unit: 'KB' as const },
        { label: '1 MB', size: 1, unit: 'MB' as const },
        { label: '2 MB', size: 2, unit: 'MB' as const }
    ];

    const getFormattedSize = (bytes: number) => {
        const kb = bytes / 1024;
        const mb = kb / 1024;
        return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
    };

    const handleFileSelect = async (selectedFiles: File | File[]) => {
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
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
        setPreserveDimensions(false);
        setMaxWidth(1920);
        setMaxHeight(1080);
    };

    const resetFileToRecompress = (fileName: string) => {
        setFiles(prev => prev.map(f => {
            if (f.file.name === fileName) {
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
            let result: CompressionResult;

            if (compressionMode === 'ultra') {
                // Ultra mode: High-efficiency WebP/JPEG with max compression & crisp downsampling
                const ultraOptions: CompressionOptions = {
                    targetSizeKB: Math.max(10, Math.round(processedFile.file.size / 1024 * 0.1)), // Aim for 90% reduction
                    format: format === 'image/png' ? 'image/webp' : format,
                    preserveDimensions: false,
                    maxWidth: 1280,
                    maxHeight: 1280,
                    maxIterations: 14
                };

                result = await compressImage(
                    processedFile.file,
                    ultraOptions,
                    (iteration, currentSize, quality) => {
                        setFiles(prev => prev.map(f =>
                            f.file.name === processedFile.file.name
                                ? { ...f, progress: { iteration, currentSize, quality } }
                                : f
                        ));
                    }
                );
            } else {
                // Normal mode: High-precision adaptive target size search
                const targetSizeKB = unit === 'KB' ? targetSize : targetSize * 1024;

                const compressionOptions: CompressionOptions = {
                    targetSizeKB,
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

            // Create preview of compressed image
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
        <div className="container" style={{ maxWidth: '1000px' }}>
            <SEO
                title="Image Compressor - Precise Target Size Control"
                description="Compress images to exact file sizes (e.g. 50KB, 100KB, 200KB) with adaptive quality search and format choices."
            />
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
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
                <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', borderRadius: 'var(--radius-xl)' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '0.25rem', fontSize: '1.4rem' }}>{files.length} Images Selected</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure precision compression parameters and target file size</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => document.getElementById('add-more-input')?.click()}
                                className="glass-btn-secondary"
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
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
                    <div style={{
                        marginBottom: '2rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <FaCog /> Compression Settings
                        </h4>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {/* Compression Mode */}
                            <div>
                                <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.75rem' }}>Compression Mode:</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => setCompressionMode('normal')}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${compressionMode === 'normal' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                            backgroundColor: compressionMode === 'normal' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
                                            color: compressionMode === 'normal' ? 'var(--color-primary)' : 'var(--text-main)',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FaCog /> Exact Target Size Mode
                                        </div>
                                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>Hits exact KB/MB size with maximum visual quality</div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCompressionMode('ultra');
                                            setFormat('image/webp');
                                        }}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${compressionMode === 'ultra' ? '#ef4444' : 'var(--border-subtle)'}`,
                                            backgroundColor: compressionMode === 'ultra' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-surface)',
                                            color: compressionMode === 'ultra' ? '#ef4444' : 'var(--text-main)',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FaMagic /> Ultra Maximum Compression
                                        </div>
                                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>Up to 90-95% reduction with crisp bicubic scaling</div>
                                    </button>
                                </div>
                            </div>

                            {/* Target Size - Normal mode */}
                            {compressionMode === 'normal' && (
                                <div>
                                    <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>Target File Size:</label>
                                    
                                    {/* Preset Quick Buttons */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
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
                                            min="1"
                                            value={targetSize}
                                            onChange={(e) => setTargetSize(parseFloat(e.target.value) || 1)}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                width: '130px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-subtle)',
                                                backgroundColor: 'var(--bg-surface)',
                                                color: 'var(--text-main)',
                                                fontWeight: 600
                                            }}
                                        />
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value as 'MB' | 'KB')}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-subtle)',
                                                backgroundColor: 'var(--bg-surface)',
                                                color: 'var(--text-main)',
                                                fontWeight: 600
                                            }}
                                        >
                                            <option value="KB">KB</option>
                                            <option value="MB">MB</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Format Selection */}
                            <div>
                                <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.75rem' }}>Output Format:</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                                    {[
                                        { value: 'image/jpeg', label: 'JPEG', desc: 'Universal, best compatibility' },
                                        { value: 'image/webp', label: 'WebP', desc: 'Modern, 25-35% more compact' },
                                        { value: 'image/png', label: 'PNG', desc: 'Lossless graphic format' }
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

                            {/* Dimension Options */}
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
                                        Strictly Preserve Original Resolution
                                    </label>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                    {preserveDimensions
                                        ? 'Dimensions will never change (quality is compressed up to its technical limit).'
                                        : '✨ Adaptive scaling enabled: If an image resolution is too high to fit in the target size, it will be automatically and crisply scaled down to strictly hit your target size.'}
                                </p>
                                {!preserveDimensions && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Max Resolution Cap:</span>
                                            <button
                                                type="button"
                                                onClick={() => { setMaxWidth(3840); setMaxHeight(2160); }}
                                                className="glass-btn-secondary"
                                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                            >
                                                4K (3840px)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setMaxWidth(1920); setMaxHeight(1080); }}
                                                className="glass-btn-secondary"
                                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                            >
                                                1080p (1920px)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setMaxWidth(1280); setMaxHeight(720); }}
                                                className="glass-btn-secondary"
                                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                            >
                                                720p (1280px)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setMaxWidth(800); setMaxHeight(600); }}
                                                className="glass-btn-secondary"
                                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                            >
                                                Compact (800px)
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Max Width:</label>
                                                <input
                                                    type="number"
                                                    value={maxWidth}
                                                    onChange={(e) => setMaxWidth(parseInt(e.target.value) || 0)}
                                                    className="glass-input"
                                                    style={{
                                                        padding: '0.35rem 0.6rem',
                                                        width: '90px',
                                                        fontSize: '0.85rem'
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>px</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Max Height:</label>
                                                <input
                                                    type="number"
                                                    value={maxHeight}
                                                    onChange={(e) => setMaxHeight(parseInt(e.target.value) || 0)}
                                                    className="glass-input"
                                                    style={{
                                                        padding: '0.35rem 0.6rem',
                                                        width: '90px',
                                                        fontSize: '0.85rem'
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

                    {/* File List with Previews */}
                    <div style={{ marginBottom: '2rem', maxHeight: '600px', overflowY: 'auto' }}>
                        {files.map((processedFile) => (
                            <div
                                key={processedFile.file.name}
                                className="glass-panel"
                                style={{
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '1.25rem',
                                    marginBottom: '1rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{processedFile.file.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
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
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '1rem', padding: '0.5rem' }}
                                        title="Remove file"
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
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                border: '1px solid var(--border-subtle)'
                                            }}
                                        />
                                    </div>

                                    {/* Compressed Preview */}
                                    {processedFile.compressedPreview && (
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#10b981' }}>
                                                COMPRESSED ({processedFile.result ? getFormattedSize(processedFile.result.compressedSize) : ''})
                                            </div>
                                            <img
                                                src={processedFile.compressedPreview}
                                                alt="Compressed"
                                                style={{
                                                    width: '100%',
                                                    height: '200px',
                                                    objectFit: 'contain',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                    border: '2px solid #10b981'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Progress */}
                                {processedFile.status === 'processing' && processedFile.progress && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(0, 210, 255, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        {processedFile.status === 'done' && (
                                            <span className="neon-badge neon-badge-success">
                                                ✓ Compressed Successfully
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
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {processedFile.status === 'done' && (
                                            <>
                                                <button
                                                    onClick={() => resetFileToRecompress(processedFile.file.name)}
                                                    className="glass-btn-secondary"
                                                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                                                >
                                                    <FaRedo /> Re-compress
                                                </button>
                                                <button
                                                    onClick={() => downloadSingle(processedFile)}
                                                    className="glass-btn-primary"
                                                    style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 0 15px -3px rgba(16, 185, 129, 0.4)' }}
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
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleCompressAll}
                            disabled={isProcessing || files.every(f => f.status !== 'pending')}
                            className="glass-btn-primary"
                            style={{
                                flex: 1,
                                padding: '1rem',
                                fontSize: '1rem',
                                opacity: (isProcessing || files.every(f => f.status !== 'pending')) ? 0.6 : 1
                            }}
                        >
                            <FaImage />
                            {isProcessing ? 'Compressing with Precision Search...' : 'Compress All Images'}
                        </button>

                        {files.some(f => f.status === 'done') && (
                            <button
                                onClick={handleDownloadAll}
                                className="glass-btn-primary"
                                style={{
                                    padding: '1rem 1.5rem',
                                    fontSize: '1rem',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)'
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
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Adaptive Compression Technology</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Exact Size Matching</strong>: Our 2-tier bisection algorithm iteratively tests quantization tables until your target size is reached within &le; 1% margin.</li>
                    <li><strong>Bicubic Anti-Aliasing</strong>: Images downscaled by large ratios pass through stepped downsampling to eliminate moiré and edge artifacts.</li>
                    <li><strong>Adaptive Resolution</strong>: If a high-megapixel image cannot reach extreme targets (e.g., 20KB or 50KB) through quality alone, it adaptively downscales resolution cleanly.</li>
                    <li><strong>100% Privacy</strong>: No data is sent over the internet. Everything is computed in your browser using modern Web APIs.</li>
                </ol>
            </div>
        </div>
    );
};

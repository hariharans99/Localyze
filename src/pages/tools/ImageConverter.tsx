import { useState } from 'react';
import JSZip from 'jszip';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaRandom, FaFileArchive, FaRedo } from 'react-icons/fa';
import { ProgressBar } from '../../components/ProgressBar';
import { SEO } from '../../components/SEO';
import { usePlan } from '../../contexts/PlanContext';
import { ToolUsageBanner } from '../../components/ToolUsageBanner';

interface ConvertedFileItem {
    file: File;
    originalPreview: string;
    convertedUrl: string | null;
    convertedSize: number;
    isConverting: boolean;
}

export const ImageConverter = () => {
    const { error, success } = useToast();
    const { checkCanProcess, incrementUsage } = usePlan();
    const [files, setFiles] = useState<ConvertedFileItem[]>([]);
    const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/bmp' | 'image/x-icon'>('image/jpeg');
    const [quality, setQuality] = useState(0.92);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const supportedFormats = [
        { mime: 'image/jpeg', label: 'JPEG (.jpg)', desc: 'Universal compatibility' },
        { mime: 'image/png', label: 'PNG (.png)', desc: 'Lossless quality & transparency' },
        { mime: 'image/webp', label: 'WebP (.webp)', desc: 'Next-gen compact format' },
        { mime: 'image/avif', label: 'AVIF (.avif)', desc: 'Ultra-efficient modern compression' },
        { mime: 'image/bmp', label: 'BMP (.bmp)', desc: 'Uncompressed raw bitmap' },
        { mime: 'image/x-icon', label: 'ICO (.ico)', desc: 'Favicon & icon format' },
    ] as const;

    const processFileToCanvas = async (inputFile: File): Promise<HTMLCanvasElement> => {
        const fileType = inputFile.type.toLowerCase();
        const fileName = inputFile.name.toLowerCase();

        // 1. Handle HEIC / HEIF
        if (fileType === 'image/heic' || fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
            const heic2any = (await import('heic2any')).default;
            const blob = await heic2any({ blob: inputFile, toType: 'image/jpeg' });
            const convertedBlob = Array.isArray(blob) ? blob[0] : blob;
            const img = new Image();
            const url = URL.createObjectURL(convertedBlob);
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
                img.src = url;
            });
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            return canvas;
        }

        // 2. Handle TIFF / TIF
        if (fileType === 'image/tiff' || fileName.endsWith('.tiff') || fileName.endsWith('.tif')) {
            const UTIF = (await import('utif')).default;
            const buffer = await inputFile.arrayBuffer();
            const ifds = UTIF.decode(buffer);
            if (ifds.length === 0) throw new Error("Invalid TIFF");
            const ifd = ifds[0];
            UTIF.decodeImage(buffer, ifd);
            const rgba = UTIF.toRGBA8(ifd);

            const canvas = document.createElement('canvas');
            canvas.width = ifd.width;
            canvas.height = ifd.height;
            const ctx = canvas.getContext('2d')!;
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            imageData.data.set(rgba);
            ctx.putImageData(imageData, 0, 0);
            return canvas;
        }

        // 3. Standard images (PNG, JPG, WebP, BMP, AVIF, SVG, ICO)
        const img = new Image();
        const url = URL.createObjectURL(inputFile);
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = url;
        });
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return canvas;
    };

    const handleFileSelect = async (selectedFiles: File | File[]) => {
        const fileList = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        if (fileList.length === 0) return;

        const newItems: ConvertedFileItem[] = [];
        for (const file of fileList) {
            let preview = '';
            try {
                const canvas = await processFileToCanvas(file);
                preview = canvas.toDataURL('image/jpeg', 0.6);
                canvas.width = 0;
                canvas.height = 0;
            } catch (e) {
                console.error("Preview creation error:", e);
                preview = URL.createObjectURL(file);
            }

            newItems.push({
                file,
                originalPreview: preview,
                convertedUrl: null,
                convertedSize: 0,
                isConverting: false
            });
        }

        setFiles(prev => [...prev, ...newItems]);
    };

    const handleConvert = async () => {
        if (files.length === 0) return;
        if (!checkCanProcess()) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const updated = [...files];

            for (let i = 0; i < files.length; i++) {
                const item = files[i];
                const canvas = await processFileToCanvas(item.file);

                // If converting to JPEG, fill white background to avoid black transparency
                if (format === 'image/jpeg') {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const tempCtx = tempCanvas.getContext('2d')!;
                    tempCtx.fillStyle = '#ffffff';
                    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                    tempCtx.drawImage(canvas, 0, 0);

                    const dataUrl = tempCanvas.toDataURL(format, quality);
                    tempCanvas.width = 0;
                    tempCanvas.height = 0;
                    canvas.width = 0;
                    canvas.height = 0;

                    const base64Len = dataUrl.split(',')[1]?.length || 0;
                    const sizeBytes = Math.round((base64Len * 3) / 4);

                    updated[i] = {
                        ...item,
                        convertedUrl: dataUrl,
                        convertedSize: sizeBytes,
                        isConverting: false
                    };
                } else {
                    const dataUrl = canvas.toDataURL(format, quality);
                    canvas.width = 0;
                    canvas.height = 0;

                    const base64Len = dataUrl.split(',')[1]?.length || 0;
                    const sizeBytes = Math.round((base64Len * 3) / 4);

                    updated[i] = {
                        ...item,
                        convertedUrl: dataUrl,
                        convertedSize: sizeBytes,
                        isConverting: false
                    };
                }

                setProgress(Math.round(((i + 1) / files.length) * 100));
            }

            setFiles(updated);
            await incrementUsage();
            const extLabel = getExtension(format).toUpperCase();
            success(`Converted ${files.length} file${files.length > 1 ? 's' : ''} to ${extLabel}!`);
        } catch (e) {
            console.error('Conversion error:', e);
            error('Failed to convert files. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const getExtension = (mimeType: string) => {
        switch (mimeType) {
            case 'image/jpeg': return 'jpg';
            case 'image/png': return 'png';
            case 'image/webp': return 'webp';
            case 'image/bmp': return 'bmp';
            case 'image/avif': return 'avif';
            case 'image/x-icon': return 'ico';
            default: return 'jpg';
        }
    };

    const downloadSingle = (item: ConvertedFileItem) => {
        if (!item.convertedUrl) return;
        const ext = getExtension(format);
        const name = item.file.name.replace(/\.[^/.]+$/, '');
        const a = document.createElement('a');
        a.href = item.convertedUrl;
        a.download = `${name}.${ext}`;
        a.click();
    };

    const downloadAllZip = async () => {
        const converted = files.filter(f => f.convertedUrl);
        if (converted.length === 0) return;

        try {
            const zip = new JSZip();
            const ext = getExtension(format);

            for (let i = 0; i < converted.length; i++) {
                const item = converted[i];
                if (item.convertedUrl) {
                    const base64Data = item.convertedUrl.split(',')[1];
                    const name = item.file.name.replace(/\.[^/.]+$/, '');
                    zip.file(`${name}.${ext}`, base64Data, { base64: true });
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converted-images-${ext}.zip`;
            a.click();
            URL.revokeObjectURL(url);

            success(`Downloaded ${converted.length} converted images in ZIP!`);
        } catch (err) {
            console.error('ZIP generation error:', err);
            error('Failed to generate ZIP archive');
        }
    };

    const handleReset = () => {
        setFiles([]);
        setProgress(0);
        setFormat('image/jpeg');
        setQuality(0.92);
    };

    return (
        <div className="container" style={{ maxWidth: '900px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="Universal Image Format Converter - PNG, JPG, WebP, HEIC, AVIF, TIFF"
                description="Fast batch conversion between 9 image formats with zero quality loss and 100% private in-browser processing."
            />
            <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.5rem', textAlign: 'center', wordBreak: 'break-word' }}>
                Universal Format Converter
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                Batch convert images across PNG, JPG, WebP, AVIF, HEIC, TIFF, BMP, SVG & ICO locally.
            </p>

            <ToolUsageBanner />


            <div style={{ marginBottom: '2rem' }}>
                {files.length === 0 ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept="image/*,.heic,.heif,.avif,.tiff,.tif"
                        label="Upload Images to Convert (Single or Batch)"
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem', width: '100%', minWidth: 0 }}>
                            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                <h3 style={{ marginBottom: '0.25rem', fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', wordBreak: 'break-word' }}>
                                    {files.length} Image{files.length > 1 ? 's' : ''} Selected
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Total Size: {(files.reduce((a, b) => a + b.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                    onClick={() => document.getElementById('add-more-convert')?.click()}
                                    className="glass-btn-secondary"
                                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                >
                                    + Add More
                                </button>
                                <input
                                    id="add-more-convert"
                                    type="file"
                                    accept="image/*,.heic,.heif,.avif,.tiff,.tif"
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

                        {/* Format Selection Grid */}
                        <div style={{
                            marginBottom: '1.75rem',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                                Convert All Files To:
                            </label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))',
                                gap: '0.6rem',
                                marginBottom: '1.25rem'
                            }}>
                                {supportedFormats.map(fmt => {
                                    const isSelected = format === fmt.mime;
                                    return (
                                        <button
                                            key={fmt.mime}
                                            type="button"
                                            onClick={() => setFormat(fmt.mime)}
                                            style={{
                                                padding: '0.6rem 0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                                                backgroundColor: isSelected ? 'rgba(255, 42, 68, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                                                color: isSelected ? 'var(--color-primary)' : 'var(--text-main)',
                                                fontWeight: isSelected ? 700 : 500,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.2s',
                                                boxShadow: isSelected ? '0 0 15px -3px rgba(255, 42, 68, 0.4)' : 'none'
                                            }}
                                        >
                                            {fmt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {format !== 'image/png' && format !== 'image/bmp' && format !== 'image/x-icon' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                        <span style={{ fontWeight: 600 }}>Quality: {Math.round(quality * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.3"
                                        max="1.0"
                                        step="0.05"
                                        value={quality}
                                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                                        style={{ width: '100%', marginTop: '0.35rem', accentColor: 'var(--color-primary)' }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* File Thumbnails & Conversion Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))',
                            gap: '0.75rem',
                            maxHeight: '380px',
                            overflowY: 'auto',
                            padding: '0.75rem',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'rgba(0, 0, 0, 0.15)',
                            marginBottom: '1.75rem',
                            boxSizing: 'border-box'
                        }}>
                            {files.map((item, idx) => (
                                <div
                                    key={`${item.file.name}-${idx}`}
                                    style={{
                                        border: item.convertedUrl ? '2px solid #10b981' : '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.5rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        textAlign: 'center',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <img
                                            src={item.originalPreview}
                                            alt={item.file.name}
                                            style={{
                                                width: '100%',
                                                height: '110px',
                                                objectFit: 'contain',
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                borderRadius: 'var(--radius-sm)',
                                                marginBottom: '0.4rem'
                                            }}
                                        />
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>
                                            {item.file.name}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                                            {(item.file.size / 1024).toFixed(0)} KB
                                            {item.convertedSize > 0 && ` → ${(item.convertedSize / 1024).toFixed(0)} KB`}
                                        </div>
                                    </div>

                                    {item.convertedUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => downloadSingle(item)}
                                            className="glass-btn-primary"
                                            style={{
                                                width: '100%',
                                                padding: '0.3rem',
                                                fontSize: '0.75rem',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                            }}
                                        >
                                            <FaDownload /> Download
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ready</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {isProcessing && (
                            <div style={{ width: '100%', marginBottom: '1.25rem' }}>
                                <ProgressBar progress={progress} label="Converting Images..." />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleConvert}
                                disabled={isProcessing || files.length === 0}
                                className="glass-btn-primary"
                                style={{
                                    flex: '1 1 220px',
                                    padding: '0.9rem',
                                    fontSize: '0.95rem',
                                    opacity: isProcessing ? 0.6 : 1
                                }}
                            >
                                <FaRandom />
                                {isProcessing ? `Converting... ${progress}%` : `Convert ${files.length} Image${files.length > 1 ? 's' : ''} to ${getExtension(format).toUpperCase()}`}
                            </button>

                            {files.some(f => f.convertedUrl) && (
                                <button
                                    onClick={downloadAllZip}
                                    className="glass-btn-primary"
                                    style={{
                                        padding: '0.9rem 1.4rem',
                                        fontSize: '0.95rem',
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
            </div>
        </div>
    );
};

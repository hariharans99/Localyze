import { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import {
    FaDownload,
    FaLock,
    FaUnlock,
    FaRedo,
    FaSyncAlt,
    FaExchangeAlt
} from 'react-icons/fa';
import { ProgressBar } from '../../components/ProgressBar';
import { SEO } from '../../components/SEO';
import { usePlan } from '../../contexts/PlanContext';
import { ToolUsageBanner } from '../../components/ToolUsageBanner';

export const ImageResizer = () => {
    const toast = useToast();
    const { checkCanProcess, incrementUsage } = usePlan();
    const [file, setFile] = useState<File | null>(null);
    const [originalPreview, setOriginalPreview] = useState<string | null>(null);
    const [resizedImage, setResizedImage] = useState<string | null>(null);
    const [width, setWidth] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);
    const [originalWidth, setOriginalWidth] = useState<number>(0);
    const [originalHeight, setOriginalHeight] = useState<number>(0);
    const [aspectRatio, setAspectRatio] = useState<number>(0);
    const [maintainAspect, setMaintainAspect] = useState(true);
    const [mode, setMode] = useState<'pixels' | 'percentage'>('pixels');
    const [percentage, setPercentage] = useState<number>(100);
    const [rotation, setRotation] = useState<number>(0);
    const [flipH, setFlipH] = useState<boolean>(false);
    const [outputFormat, setOutputFormat] = useState<string>('image/jpeg');
    const [quality, setQuality] = useState<number>(0.92);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);

    const handleFileSelect = (selectedFile: File | File[]) => {
        const f = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
        if (!f) return;

        setFile(f);
        const preview = URL.createObjectURL(f);
        setOriginalPreview(preview);

        const img = new Image();
        img.src = preview;
        img.onload = () => {
            setWidth(img.width);
            setHeight(img.height);
            setOriginalWidth(img.width);
            setOriginalHeight(img.height);
            setAspectRatio(img.width / img.height);
            setPercentage(100);
            setRotation(0);
            setFlipH(false);
            setOutputFormat(f.type || 'image/jpeg');
        };
        setResizedImage(null);
    };

    const handleWidthChange = (w: number) => {
        const validW = Math.max(1, w || 1);
        setWidth(validW);
        if (maintainAspect && aspectRatio > 0) {
            setHeight(Math.round(validW / aspectRatio));
        }
    };

    const handleHeightChange = (h: number) => {
        const validH = Math.max(1, h || 1);
        setHeight(validH);
        if (maintainAspect && aspectRatio > 0) {
            setWidth(Math.round(validH * aspectRatio));
        }
    };

    const handlePercentageChange = (pct: number) => {
        setPercentage(pct);
        const factor = pct / 100;
        setWidth(Math.max(1, Math.round(originalWidth * factor)));
        setHeight(Math.max(1, Math.round(originalHeight * factor)));
    };

    const applyAspectRatioPreset = (wRatio: number, hRatio: number) => {
        const newRatio = wRatio / hRatio;
        setAspectRatio(newRatio);
        setHeight(Math.max(1, Math.round(width / newRatio)));
    };

    const applyExactDimensionPreset = (targetW: number, targetH: number) => {
        setWidth(targetW);
        setHeight(targetH);
        setAspectRatio(targetW / targetH);
    };

    const handleRotate = () => {
        setRotation((prev) => {
            const nextRot = (prev + 90) % 360;
            // Swap width & height if maintaining aspect ratio
            if (maintainAspect) {
                setWidth(height);
                setHeight(width);
                setAspectRatio(height / width);
            }
            return nextRot;
        });
        setResizedImage(null);
    };

    const handleResize = async () => {
        if (!file) return;
        if (!checkCanProcess()) return;

        setIsProcessing(true);
        setProgress(20);
        setEstimatedTime(1.5);

        const img = new Image();
        const imgUrl = URL.createObjectURL(file);

        img.onload = async () => {
            URL.revokeObjectURL(imgUrl);

            // Intermediate canvas for rotation & flipping
            const transformCanvas = document.createElement('canvas');
            const isRotated90or270 = rotation === 90 || rotation === 270;
            const tWidth = isRotated90or270 ? img.height : img.width;
            const tHeight = isRotated90or270 ? img.width : img.height;

            transformCanvas.width = tWidth;
            transformCanvas.height = tHeight;
            const tCtx = transformCanvas.getContext('2d')!;
            tCtx.imageSmoothingEnabled = true;
            tCtx.imageSmoothingQuality = 'high';

            // Fill solid white background if exporting to JPEG to prevent black transparent areas
            if (outputFormat === 'image/jpeg') {
                tCtx.fillStyle = '#ffffff';
                tCtx.fillRect(0, 0, tWidth, tHeight);
            }

            tCtx.translate(tWidth / 2, tHeight / 2);
            if (flipH) tCtx.scale(-1, 1);
            tCtx.rotate((rotation * Math.PI) / 180);
            tCtx.drawImage(img, -img.width / 2, -img.height / 2);

            setProgress(60);

            // Stepped anti-aliasing downsampling
            const { steppedDownsample } = await import('../../utils/imageCompression');
            const finalCanvas = steppedDownsample(transformCanvas, width, height);

            setProgress(90);

            const mime = outputFormat === 'original' ? (file.type || 'image/jpeg') : outputFormat;
            const dataUrl = finalCanvas.toDataURL(mime, quality);

            setResizedImage(dataUrl);
            await incrementUsage();

            // Direct instant auto-download
            const ext = outputFormat === 'image/png' ? 'png' : outputFormat === 'image/webp' ? 'webp' : 'jpg';
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `resized-${file.name.replace(/\.[^/.]+$/, '')}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            toast.success('Resized & downloaded successfully!');
            setIsProcessing(false);
            setProgress(0);
        };

        img.onerror = () => {
            URL.revokeObjectURL(imgUrl);
            toast.error('Failed to load image');
            setIsProcessing(false);
            setProgress(0);
        };

        img.src = imgUrl;
    };

    return (
        <div className="container" style={{ maxWidth: '850px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="Precision Image Resizer - Dimensions, Percentage & Aspect Ratios"
                description="Resize pixel dimensions, crop aspect ratios, or scale percentages with stepped bicubic anti-aliasing."
            />
            <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.5rem', textAlign: 'center', wordBreak: 'break-word' }}>
                Precision Image Resizer
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                Scale by exact pixels, percentage, or aspect presets with smooth anti-aliased resampling.
            </p>

            <ToolUsageBanner />

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept="image/*" label="Upload Image to Resize" />
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
                                <h3 style={{ marginBottom: '0.25rem', fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', wordBreak: 'break-word' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Original: {originalWidth} × {originalHeight}px • {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                    onClick={() => document.getElementById('change-file-input')?.click()}
                                    className="glass-btn-secondary"
                                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                >
                                    Change File
                                </button>
                                <input
                                    id="change-file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            handleFileSelect(e.target.files[0]);
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => {
                                        setWidth(originalWidth);
                                        setHeight(originalHeight);
                                        setPercentage(100);
                                        setRotation(0);
                                        setFlipH(false);
                                        setResizedImage(null);
                                    }}
                                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                                >
                                    <FaRedo /> Reset
                                </button>
                            </div>
                        </div>

                        {/* Image Preview Box */}
                        {originalPreview && (
                            <div style={{
                                width: '100%',
                                height: '200px',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                marginBottom: '1.75rem',
                                padding: '0.5rem',
                                boxSizing: 'border-box'
                            }}>
                                <img
                                    src={originalPreview}
                                    alt="Preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
                                        transition: 'transform 0.25s ease'
                                    }}
                                />
                            </div>
                        )}

                        {/* Mode Selector: By Pixels vs Percentage */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            padding: '0.35rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.75rem',
                            width: 'fit-content'
                        }}>
                            <button
                                type="button"
                                onClick={() => setMode('pixels')}
                                className={mode === 'pixels' ? 'glass-btn-primary' : 'glass-btn-secondary'}
                                style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
                            >
                                Exact Pixels (px)
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('percentage')}
                                className={mode === 'percentage' ? 'glass-btn-primary' : 'glass-btn-secondary'}
                                style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
                            >
                                Percentage (%)
                            </button>
                        </div>

                        {/* Resolution Inputs & Presets */}
                        {mode === 'pixels' ? (
                            <div style={{ marginBottom: '1.75rem', width: '100%', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
                                    <div style={{ flex: '1 1 130px', minWidth: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                            Width (px)
                                        </label>
                                        <input
                                            type="number"
                                            value={width}
                                            onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1)}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.65rem', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setMaintainAspect(!maintainAspect)}
                                        className="glass-btn-secondary"
                                        style={{
                                            padding: '0.65rem 0.85rem',
                                            marginTop: '1.4rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            color: maintainAspect ? 'var(--color-primary)' : 'var(--text-muted)',
                                            borderColor: maintainAspect ? 'var(--color-primary)' : 'var(--glass-border)'
                                        }}
                                        title={maintainAspect ? 'Lock Aspect Ratio (Active)' : 'Unlock Aspect Ratio (Freeform)'}
                                    >
                                        {maintainAspect ? <FaLock /> : <FaUnlock />}
                                    </button>

                                    <div style={{ flex: '1 1 130px', minWidth: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                            Height (px)
                                        </label>
                                        <input
                                            type="number"
                                            value={height}
                                            onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1)}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.65rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                {/* Aspect Ratio & Quick Standard Resolution Presets */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Presets:</span>
                                    <button
                                        type="button"
                                        onClick={() => applyExactDimensionPreset(1080, 1080)}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    >
                                        Instagram (1080×1080)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyExactDimensionPreset(1080, 1920)}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    >
                                        Story / Reel (1080×1920)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyExactDimensionPreset(1920, 1080)}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    >
                                        1080p FHD
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyExactDimensionPreset(1200, 675)}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    >
                                        Twitter / Web (1200×675)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyExactDimensionPreset(600, 600)}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    >
                                        Passport (600×600)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyAspectRatioPreset(1, 1)}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    >
                                        1:1 Square
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyAspectRatioPreset(16, 9)}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    >
                                        16:9 Wide
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyAspectRatioPreset(9, 16)}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    >
                                        9:16 Vertical
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '1.75rem', width: '100%', minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <span style={{ fontWeight: 600 }}>Scale: {percentage}%</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{width} × {height} px</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="300"
                                    step="5"
                                    value={percentage}
                                    onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                                    style={{ width: '100%', marginBottom: '1rem', accentColor: 'var(--color-primary)' }}
                                />
                                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                    {[25, 50, 75, 100, 150, 200].map(pct => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => handlePercentageChange(pct)}
                                            className="glass-btn-secondary"
                                            style={{
                                                padding: '0.35rem 0.75rem',
                                                fontSize: '0.8rem',
                                                borderColor: percentage === pct ? 'var(--color-primary)' : 'var(--glass-border)'
                                            }}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Transform Options: Rotate & Flip & Output Format */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                            gap: '1rem',
                            marginBottom: '1.75rem',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Transform Orientation
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={handleRotate}
                                        className="glass-btn-secondary"
                                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                                    >
                                        <FaSyncAlt /> Rotate {rotation > 0 ? `(${rotation}°)` : '90°'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFlipH(!flipH)}
                                        className="glass-btn-secondary"
                                        style={{
                                            padding: '0.45rem 0.85rem',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            color: flipH ? 'var(--color-primary)' : 'var(--text-main)',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <FaExchangeAlt /> Flip H
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Target Format
                                </label>
                                <select
                                    value={outputFormat}
                                    onChange={(e) => setOutputFormat(e.target.value)}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
                                >
                                    <option value="original">Keep Original</option>
                                    <option value="image/jpeg">JPEG (.jpg)</option>
                                    <option value="image/png">PNG (.png - Lossless)</option>
                                    <option value="image/webp">WebP (.webp - Compact)</option>
                                </select>
                            </div>

                            {outputFormat !== 'image/png' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                                        <span style={{ fontWeight: 600 }}>Quality: {(quality * 100).toFixed(0)}%</span>
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

                        {/* Action Buttons & Results */}
                        {resizedImage && (
                            <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                padding: '1.75rem',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: '1rem',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                boxShadow: '0 0 25px -5px rgba(16, 185, 129, 0.2)',
                                textAlign: 'center'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span className="neon-badge neon-badge-success">
                                        ✓ Resize Complete ({width} × {height} px)
                                    </span>
                                </div>
                                <a
                                    href={resizedImage}
                                    download={`resized-${file.name}`}
                                    className="glass-btn-primary"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                        padding: '0.85rem 1.75rem',
                                        fontSize: '1rem',
                                        textDecoration: 'none',
                                        display: 'inline-flex'
                                    }}
                                >
                                    <FaDownload /> Download Resized Image
                                </a>
                            </div>
                        )}

                        {isProcessing && (
                            <div style={{ width: '100%', marginBottom: '1rem' }}>
                                <ProgressBar progress={progress} label="Resizing with Stepped Anti-Aliasing..." estimatedSeconds={estimatedTime} />
                            </div>
                        )}

                        <button
                            onClick={handleResize}
                            disabled={isProcessing}
                            className="glass-btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1rem',
                                opacity: isProcessing ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <FaDownload />
                            {isProcessing ? 'Resizing & Downloading...' : `Resize & Download Image (${width} × ${height} px)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

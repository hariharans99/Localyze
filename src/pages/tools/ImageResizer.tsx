import { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaExpand } from 'react-icons/fa';

import { ProgressBar } from '../../components/ProgressBar';

export const ImageResizer = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [resizedImage, setResizedImage] = useState<string | null>(null);
    const [width, setWidth] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);
    const [aspectRatio, setAspectRatio] = useState<number>(0);
    const [maintainAspect, setMaintainAspect] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);

    const handleFileSelect = (selectedFile: File | File[]) => {
        const file = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
        if (!file) return;

        setFile(file);
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            setWidth(img.width);
            setHeight(img.height);
            setAspectRatio(img.width / img.height);
        };
        setResizedImage(null);
    };

    const handleWidthChange = (w: number) => {
        setWidth(w);
        if (maintainAspect) {
            setHeight(Math.round(w / aspectRatio));
        }
    };

    const handleHeightChange = (h: number) => {
        setHeight(h);
        if (maintainAspect) {
            setWidth(Math.round(h * aspectRatio));
        }
    };

    const handleResize = async () => {
        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }
        if (!file) return;

        setIsProcessing(true);
        // Simulate start
        setProgress(10);
        setEstimatedTime(3);

        const img = new Image();

        // Brief delay to let UI update
        await new Promise(r => setTimeout(r, 100));
        setProgress(30);
        setEstimatedTime(2.5);

        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Simulate processing
                setProgress(60);
                setEstimatedTime(1.5);
                await new Promise(r => setTimeout(r, 100));

                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL(file.type);

                setProgress(100);
                setEstimatedTime(0.5);
                await new Promise(r => setTimeout(r, 200));

                setResizedImage(dataUrl);
                await incrementUsage('resize');
                toast.success("Image resized successfully!");
            }
            setIsProcessing(false);
            setProgress(0);
        };

        img.onerror = () => {
            toast.error("Failed to load image");
            setIsProcessing(false);
            setProgress(0);
        };

        img.src = URL.createObjectURL(file);
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Image Resizer
            </h1>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept="image/*" label="Upload Image to Resize" />
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
                                <p style={{ color: 'var(--text-muted)' }}>Original: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
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
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            handleFileSelect(e.target.files[0]);
                                            // Reset result but keep settings? 
                                            // Usually change file implies keeping the workflow.
                                            // But for Resizer, new image might have different dims.
                                            // handleFileSelect recalculates dims automatically.
                                            setResizedImage(null);
                                            setProgress(0);
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => {
                                        setResizedImage(null);
                                        setProgress(0);
                                        // Restore original dimensions
                                        if (file) {
                                            const img = new Image();
                                            img.src = URL.createObjectURL(file);
                                            img.onload = () => {
                                                setWidth(img.width);
                                                setHeight(img.height);
                                                setAspectRatio(img.width / img.height);
                                            };
                                        }
                                        setMaintainAspect(true);
                                    }}
                                    style={{ color: 'var(--text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Reset Settings
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaExpand /> Resize Dimensions
                            </h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                {[
                                    { w: 1920, h: 1080, label: '1080p' },
                                    { w: 1280, h: 720, label: '720p' },
                                    { w: 3840, h: 2160, label: '4K' },
                                ].map(preset => (
                                    <button
                                        key={preset.label}
                                        onClick={() => {
                                            setWidth(preset.w);
                                            setHeight(preset.h);
                                            // If maintaining aspect, we should probably update the ratio to match this preset
                                            if (maintainAspect) {
                                                setAspectRatio(preset.w / preset.h);
                                            }
                                        }}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            fontSize: '0.8rem',
                                            backgroundColor: 'var(--bg-surface-hover)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-full)',
                                            cursor: 'pointer',
                                            color: 'var(--text-main)'
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Width (px)</label>
                                    <input
                                        type="number"
                                        value={width}
                                        onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-app)',
                                            color: 'var(--text-main)'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Height (px)</label>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-app)',
                                            color: 'var(--text-main)'
                                        }}
                                    />
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={maintainAspect}
                                    onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setMaintainAspect(isChecked);
                                        if (isChecked && width > 0 && height > 0) {
                                            // If checking the box, lock the CURRENT aspect ratio, 
                                            // not necessarily the original image's. 
                                            // This allows users to type "1280x720", check the box, and keep 16:9.
                                            setAspectRatio(width / height);
                                        } else if (!isChecked && file) {
                                            // Optional: If unchecking, maybe reset to original image ratio? 
                                            // Or just leave it detached.
                                            // If they re-check, it will recapture current.
                                            // But for correctness, if they uncheck, modify w/h freely.
                                        }
                                    }}
                                />
                                <span>Maintain Aspect Ratio</span>
                            </label>
                        </div>

                        {resizedImage ? (
                            <div style={{
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '2rem',
                                border: '1px solid var(--color-primary)'
                            }}>
                                <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Resize Complete!</h3>
                                <a
                                    href={resizedImage}
                                    download={`resized-${file.name}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600
                                    }}
                                >
                                    <FaDownload /> Download Image
                                </a>
                            </div>
                        ) : isProcessing ? (
                            <div style={{ width: '100%' }}>
                                <ProgressBar progress={progress} label="Resizing..." estimatedSeconds={estimatedTime} />
                            </div>
                        ) : (
                            <button
                                onClick={handleResize}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '1rem'
                                }}
                            >
                                Resize Image Now
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How it Works</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload Image:</strong> Select the image you want to resize.</li>
                    <li><strong>Set Dimensions:</strong> Enter custom width/height or choose a standard preset (1080p, 4K, etc.).</li>
                    <li><strong>Maintain Aspect Ratio:</strong> Check this box to keep the image from distorting. Uncheck to stretch.</li>
                    <li><strong>Resize:</strong> Click the button to process the image instantly.</li>
                    <li><strong>Download:</strong> Save the resized image to your computer.</li>
                </ol>
            </div>

            <AdBanner />
        </div >
    );
};

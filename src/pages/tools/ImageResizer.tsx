import { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaExpand } from 'react-icons/fa';

export const ImageResizer = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [resizedImage, setResizedImage] = useState<string | null>(null);
    const [width, setWidth] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);
    const [aspectRatio, setAspectRatio] = useState<number>(0);
    const [maintainAspect, setMaintainAspect] = useState(true);

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

        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL(file.type);
                setResizedImage(dataUrl);
                await incrementUsage('resize');
                toast.success("Image resized successfully!");
            }
        };
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
                            <button
                                onClick={() => setFile(null)}
                                style={{ color: 'var(--color-accent)', fontWeight: 500 }}
                            >
                                Change File
                            </button>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaExpand /> Resize Dimensions
                            </h4>
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
                                    onChange={(e) => setMaintainAspect(e.target.checked)}
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
        </div>
    );
};

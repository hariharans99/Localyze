import { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { AdBanner } from '../../components/AdBanner';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaRandom } from 'react-icons/fa';

import { ProgressBar } from '../../components/ProgressBar';
import { SEO } from '../../components/SEO';

export const ImageConverter = () => {
    const { checkLimit, incrementUsage, logActivity } = useUser();
    const { error, success } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [convertedImage, setConvertedImage] = useState<string | null>(null);
    const [format, setFormat] = useState('image/jpeg');
    const [quality, setQuality] = useState(0.92);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);

    const handleFileSelect = (selectedFile: File | File[]) => {
        if (Array.isArray(selectedFile)) {
            if (selectedFile.length > 0) setFile(selectedFile[0]);
        } else {
            setFile(selectedFile);
        }
        setConvertedImage(null);
    };

    const processFile = async (inputFile: File): Promise<string> => {
        const fileType = inputFile.type.toLowerCase();
        const fileName = inputFile.name.toLowerCase();

        // Handle HEIC
        if (fileType === 'image/heic' || fileName.endsWith('.heic')) {
            const heic2any = (await import('heic2any')).default;
            const blob = await heic2any({ blob: inputFile, toType: 'image/jpeg' });
            const convertedBlob = Array.isArray(blob) ? blob[0] : blob;
            return URL.createObjectURL(convertedBlob);
        }

        // Handle TIFF
        if (fileType === 'image/tiff' || fileName.endsWith('.tiff') || fileName.endsWith('.tif')) {
            const UTIF = (await import('utif')).default;

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const buffer = e.target?.result as ArrayBuffer;
                        const ifds = UTIF.decode(buffer);
                        if (ifds.length === 0) throw new Error("Invalid TIFF");
                        const ifd = ifds[0];
                        UTIF.decodeImage(buffer, ifd);
                        const rgba = UTIF.toRGBA8(ifd);

                        const canvas = document.createElement('canvas');
                        canvas.width = ifd.width;
                        canvas.height = ifd.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) throw new Error("Canvas context failed");

                        const imageData = ctx.createImageData(canvas.width, canvas.height);
                        imageData.data.set(rgba);
                        ctx.putImageData(imageData, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg')); // Intermediate representation
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.readAsArrayBuffer(inputFile);
            });
        }

        // Default handling for standard images (JPEG, PNG, WebP, SVG, BMP, AVIF, ICO)
        // Browser can natively read these in an <img> tag usually
        return URL.createObjectURL(inputFile);
    };

    const handleConvert = async () => {
        if (!checkLimit()) {
            error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        if (!file) return;

        setIsProcessing(true);
        // Step 1: Simulated "Reading"
        setProgress(15);
        setEstimatedTime(3);
        await new Promise(r => setTimeout(r, 100));

        try {
            // 1. Get a standard image URL (process specialized formats first)
            const sourceUrl = await processFile(file);
            setProgress(40);
            setEstimatedTime(2.5);

            // 2. Load into Image object
            const img = new Image();
            img.src = sourceUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            setProgress(60);
            setEstimatedTime(2);

            // 3. Draw to canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Background color based on format transparency support
                if (!['image/png', 'image/webp'].includes(format)) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // Simulate drawing delay
                await new Promise(r => setTimeout(r, 100));
                ctx.drawImage(img, 0, 0);
                setProgress(80);
                setEstimatedTime(1);

                // 4. Export to target format
                await new Promise(r => setTimeout(r, 100)); // Give UI time to paint 80%
                const dataUrl = canvas.toDataURL(format, quality);

                setProgress(100);
                setEstimatedTime(0.5);
                await new Promise(r => setTimeout(r, 200));

                setConvertedImage(dataUrl);
                await incrementUsage('convert');
                logActivity('convert', `${getExtension(file.type)} -> ${format.split('/')[1]}`);
                success("Image converted successfully!");
            }
        } catch (e) {
            console.error(e);
            error("Failed to convert image");
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const supportedFormats = [
        { mime: 'image/jpeg', label: 'JPEG' },
        { mime: 'image/png', label: 'PNG' },
        { mime: 'image/webp', label: 'WebP' },
        { mime: 'image/bmp', label: 'BMP' },
        { mime: 'image/avif', label: 'AVIF' },
        { mime: 'image/x-icon', label: 'ICO' },
    ];

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

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <SEO
                title="Image Converter - Convert to JPG, PNG, WebP"
                description="Convert images between formats (HEIC to JPG, PNG to basic WebP, etc). Privacy-focused, local conversion."
            />
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Format Converter
            </h1>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept="image/*,.heic,.heif,.avif,.tiff,.tif"
                        label="Upload Image to Convert"
                    />
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
                                <p style={{ color: 'var(--text-muted)' }}>Original: {file.type || getExtension(file.name).toUpperCase()}</p>
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
                                    accept="image/*,.heic,.heif,.avif,.tiff,.tif"
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            handleFileSelect(e.target.files[0]);
                                            setConvertedImage(null);
                                            setProgress(0);
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => {
                                        setConvertedImage(null);
                                        setProgress(0);
                                        // Reset settings
                                        setFormat('image/jpeg');
                                        setQuality(0.92);
                                    }}
                                    style={{ color: 'var(--text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Reset Settings
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-app)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>📥 Supported Input Formats</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                {['PNG', 'JPG', 'WebP', 'BMP', 'TIFF', 'HEIC', 'AVIF', 'SVG', 'ICO'].map(fmt => (
                                    <span key={fmt} style={{
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        color: '#10b981',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>{fmt}</span>
                                ))}
                            </div>
                            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>📤 Supported Output Formats</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                {['PNG', 'JPG', 'WebP', 'BMP', 'AVIF', 'ICO'].map(fmt => (
                                    <span key={fmt} style={{
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                        color: 'var(--color-primary)',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>{fmt}</span>
                                ))}
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                ⚠️ TIFF, HEIC & SVG cannot be output formats due to browser limitations.
                            </p>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaRandom /> Target Format
                            </h4>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {supportedFormats.map(fmt => (
                                    <button
                                        key={fmt.mime}
                                        onClick={() => setFormat(fmt.mime)}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: `1px solid ${format === fmt.mime ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                            backgroundColor: format === fmt.mime ? 'var(--color-primary)' : 'var(--bg-app)',
                                            color: format === fmt.mime ? 'white' : 'var(--text-main)',
                                            fontWeight: 500,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {fmt.label}
                                    </button>
                                ))}
                            </div>
                            {format !== 'image/png' && format !== 'image/bmp' && format !== 'image/x-icon' && (
                                <div style={{ marginTop: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Quality: {Math.round(quality * 100)}%</label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.01"
                                        value={quality}
                                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                                        style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                    />
                                </div>
                            )}
                        </div>

                        {convertedImage ? (
                            <div style={{
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '2rem',
                                border: '1px solid var(--color-primary)'
                            }}>
                                <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Conversion Complete!</h3>
                                <a
                                    href={convertedImage}
                                    download={`converted-${file.name.split('.')[0]}.${getExtension(format)}`}
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
                                <ProgressBar progress={progress} label="Converting..." estimatedSeconds={estimatedTime} />
                            </div>
                        ) : (
                            <button
                                onClick={handleConvert}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Convert Now
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How it Works</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload Image:</strong> Support for PNG, JPG, WebP, TIFF, HEIC, AVIF, and more.</li>
                    <li><strong>Select Format:</strong> Choose your desired output format (JPEG, PNG, WebP, etc.).</li>
                    <li><strong>Adjust Quality:</strong> For some formats like JPEG/WebP, you can tune the quality slider.</li>
                    <li><strong>Convert:</strong> We process the image locally in your browser.</li>
                    <li><strong>Download:</strong> Save the converted image immediately.</li>
                </ol>
            </div>

            <AdBanner />
        </div >
    );
};

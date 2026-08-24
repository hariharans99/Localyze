import { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import {
    FaDownload,
    FaTrash,
    FaArrowUp,
    FaArrowDown,
    FaCog,
    FaSyncAlt,
    FaLink,
    FaUnlink,
    FaFilePdf,
    FaLayerGroup
} from 'react-icons/fa';
import { ProgressBar } from '../../components/ProgressBar';
import { SEO } from '../../components/SEO';
import { usePlan } from '../../contexts/PlanContext';
import { ToolUsageBanner } from '../../components/ToolUsageBanner';

interface MarginSettings {
    top: number;
    bottom: number;
    left: number;
    right: number;
    isLinked: boolean;
}

interface PdfSettings {
    pageSize: 'a4' | 'letter' | 'a3' | 'a5' | 'fit';
    orientation: 'p' | 'l' | 'auto';
    margins: MarginSettings;
    imageFit: 'contain' | 'cover' | 'stretch';
    alignment: 'center' | 'top' | 'bottom';
}

export const ImageToPdf = () => {
    const { error, success } = useToast();
    const { checkCanProcess, incrementUsage } = usePlan();
    const [files, setFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [rotations, setRotations] = useState<number[]>([]); // rotation degrees (0, 90, 180, 270)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
    const startTimeRef = useRef<number>(0);

    const [settings, setSettings] = useState<PdfSettings>({
        pageSize: 'a4',
        orientation: 'p',
        margins: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
            isLinked: true
        },
        imageFit: 'contain',
        alignment: 'center'
    });

    const [imageQuality, setImageQuality] = useState(0.85);

    // Clear generated PDF when settings change
    useEffect(() => {
        setPdfUrl(null);
    }, [settings, imageQuality, rotations]);

    const handleFileSelect = (selectedFiles: File | File[]) => {
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        setFiles(prev => [...prev, ...newFiles]);
        setRotations(prev => [...prev, ...newFiles.map(() => 0)]);

        newFiles.forEach(file => {
            const url = URL.createObjectURL(file);
            setImagePreviews(prev => [...prev, url]);
        });

        setPdfUrl(null);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setRotations(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            URL.revokeObjectURL(prev[index]);
            return newPreviews;
        });
        setPdfUrl(null);
    };

    const moveFile = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= files.length) return;

        setFiles(prev => {
            const arr = [...prev];
            [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
            return arr;
        });
        setRotations(prev => {
            const arr = [...prev];
            [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
            return arr;
        });
        setImagePreviews(prev => {
            const arr = [...prev];
            [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
            return arr;
        });
        setPdfUrl(null);
    };

    const rotateImage = (index: number) => {
        setRotations(prev => {
            const arr = [...prev];
            arr[index] = (arr[index] + 90) % 360;
            return arr;
        });
    };

    const updateMargin = (side: 'top' | 'bottom' | 'left' | 'right', value: number) => {
        const val = Math.max(0, Math.min(100, isNaN(value) ? 0 : value));
        setSettings(prev => {
            if (prev.margins.isLinked) {
                return {
                    ...prev,
                    margins: {
                        top: val,
                        bottom: val,
                        left: val,
                        right: val,
                        isLinked: true
                    }
                };
            }
            return {
                ...prev,
                margins: {
                    ...prev.margins,
                    [side]: val
                }
            };
        });
    };

    const applyMarginPreset = (top: number, bottom: number, left: number, right: number) => {
        setSettings(prev => ({
            ...prev,
            margins: {
                top,
                bottom,
                left,
                right,
                isLinked: top === bottom && bottom === left && left === right
            }
        }));
    };

    const handleConvert = async () => {
        if (files.length === 0) return;
        if (!checkCanProcess()) return;
        setIsProcessing(true);
        setEstimatedTime(undefined);
        startTimeRef.current = Date.now();

        try {
            const { jsPDF } = await import('jspdf');

            const doc = new jsPDF({
                orientation: settings.orientation === 'auto' ? 'p' : settings.orientation,
                unit: 'mm',
                format: settings.pageSize === 'fit' ? 'a4' : settings.pageSize
            });

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const rotation = rotations[i] || 0;
                const img = new Image();
                const imgUrl = URL.createObjectURL(file);
                img.src = imgUrl;

                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        URL.revokeObjectURL(imgUrl);
                        resolve(true);
                    };
                    img.onerror = reject;
                });

                // Create intermediate canvas for rotation & high quality smoothing
                const canvas = document.createElement('canvas');
                const isRotated90or270 = rotation === 90 || rotation === 270;
                const canvasWidth = isRotated90or270 ? img.height : img.width;
                const canvasHeight = isRotated90or270 ? img.width : img.height;

                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Fill clean white background so transparent PNGs never render black in PDF
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                // Apply rotation
                ctx.translate(canvasWidth / 2, canvasHeight / 2);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);

                const compressedImageData = canvas.toDataURL('image/jpeg', imageQuality);

                // Dimensions in mm (1px = 0.264583mm at 96dpi)
                const imgWidthMm = canvasWidth * 0.264583;
                const imgHeightMm = canvasHeight * 0.264583;

                if (settings.pageSize === 'fit') {
                    // Fit to exact image dimensions + margins
                    const isLandscape = imgWidthMm > imgHeightMm;
                    const pageOrientation = isLandscape ? 'l' : 'p';
                    const pageWidth = imgWidthMm + settings.margins.left + settings.margins.right;
                    const pageHeight = imgHeightMm + settings.margins.top + settings.margins.bottom;

                    doc.addPage([pageWidth, pageHeight], pageOrientation);
                    doc.addImage(
                        compressedImageData,
                        'JPEG',
                        settings.margins.left,
                        settings.margins.top,
                        imgWidthMm,
                        imgHeightMm,
                        undefined,
                        'FAST'
                    );
                } else {
                    // Standard formats (A4, Letter, etc.)
                    const isLandscape = settings.orientation === 'l' || (settings.orientation === 'auto' && imgWidthMm > imgHeightMm);
                    doc.addPage(settings.pageSize, isLandscape ? 'l' : 'p');

                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();

                    const { top, bottom, left, right } = settings.margins;
                    const printableWidth = Math.max(1, pageWidth - left - right);
                    const printableHeight = Math.max(1, pageHeight - top - bottom);

                    const imgRatio = imgWidthMm / imgHeightMm;
                    const printableRatio = printableWidth / printableHeight;

                    let finalWidth = printableWidth;
                    let finalHeight = printableHeight;

                    if (settings.imageFit === 'contain') {
                        if (imgRatio > printableRatio) {
                            finalWidth = printableWidth;
                            finalHeight = printableWidth / imgRatio;
                        } else {
                            finalHeight = printableHeight;
                            finalWidth = printableHeight * imgRatio;
                        }
                    } else if (settings.imageFit === 'cover') {
                        if (imgRatio > printableRatio) {
                            finalHeight = printableHeight;
                            finalWidth = printableHeight * imgRatio;
                        } else {
                            finalWidth = printableWidth;
                            finalHeight = printableWidth / imgRatio;
                        }
                    }

                    // Positioning
                    let x = left + (printableWidth - finalWidth) / 2;
                    let y = top + (printableHeight - finalHeight) / 2;

                    if (settings.alignment === 'top') {
                        y = top;
                    } else if (settings.alignment === 'bottom') {
                        y = top + printableHeight - finalHeight;
                    }

                    doc.addImage(
                        compressedImageData,
                        'JPEG',
                        x,
                        y,
                        finalWidth,
                        finalHeight,
                        undefined,
                        'FAST'
                    );
                }

                // Cleanup canvas
                canvas.width = 0;
                canvas.height = 0;

                setProgress(Math.round(((i + 1) / files.length) * 100));

                if (i > 0) {
                    const elapsed = (Date.now() - startTimeRef.current) / 1000;
                    const avgTime = elapsed / (i + 1);
                    const remaining = avgTime * (files.length - (i + 1));
                    setEstimatedTime(remaining);
                }
            }

            // Remove initial default blank page
            if (files.length > 0) {
                doc.deletePage(1);
            }

            const pdfBlob = doc.output('blob');
            setPdfUrl(URL.createObjectURL(pdfBlob));
            await incrementUsage();
            success('PDF generated successfully with custom margins!');
        } catch (e) {
            console.error('PDF creation error:', e);
            error('Failed to generate PDF. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1050px' }}>
            <SEO
                title="Images to PDF Converter - Independent Margins & Layouts"
                description="Convert images to PDF with independent top, bottom, left, and right margin controls, per-image 90° rotation, and multi-page alignment."
            />

            <h1 className="text-gradient" style={{ fontSize: '2.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                Image to PDF Studio
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Combine and customize images into high-resolution PDF documents with full margin and rotation control.
            </p>

            <ToolUsageBanner />

            {files.length === 0 ? (
                <FileUploader
                    onFileSelect={handleFileSelect}
                    accept="image/*"
                    label="Upload Images to Create PDF (Select Multiple)"
                    multiple={true}
                />
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '2rem',
                    alignItems: 'start'
                }}>
                    {/* Left Column: Image List & Reordering */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FaLayerGroup style={{ color: 'var(--color-primary)' }} /> {files.length} Images Selected
                            </h3>
                            <button
                                onClick={() => document.getElementById('add-more-input')?.click()}
                                className="glass-btn-secondary"
                                style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                            >
                                + Add More
                            </button>
                            <input
                                id="add-more-input"
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '580px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="glass-panel"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.85rem 1.1rem',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid var(--glass-border)',
                                        gap: '0.75rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                        <span style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(0, 210, 255, 0.12)',
                                            color: 'var(--color-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            flexShrink: 0
                                        }}>
                                            {index + 1}
                                        </span>

                                        {/* Image Thumbnail with Live Rotation */}
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: 'var(--radius-sm)',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <img
                                                src={imagePreviews[index]}
                                                alt={file.name}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '100%',
                                                    objectFit: 'contain',
                                                    transform: `rotate(${rotations[index] || 0}deg)`,
                                                    transition: 'transform 0.25s ease'
                                                }}
                                            />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: 600,
                                                fontSize: '0.95rem',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {file.name}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                                {rotations[index] ? ` • Rotated ${rotations[index]}°` : ''}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons: Rotate, Reorder, Delete */}
                                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                        <button
                                            onClick={() => rotateImage(index)}
                                            style={{
                                                padding: '0.5rem',
                                                color: 'var(--color-primary)',
                                                background: 'rgba(0, 210, 255, 0.08)',
                                                border: '1px solid rgba(0, 210, 255, 0.2)',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Rotate 90° Clockwise"
                                        >
                                            <FaSyncAlt />
                                        </button>
                                        <button
                                            onClick={() => moveFile(index, 'up')}
                                            disabled={index === 0}
                                            style={{
                                                padding: '0.5rem',
                                                color: 'var(--text-muted)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                opacity: index === 0 ? 0.3 : 1
                                            }}
                                            title="Move Up"
                                        >
                                            <FaArrowUp />
                                        </button>
                                        <button
                                            onClick={() => moveFile(index, 'down')}
                                            disabled={index === files.length - 1}
                                            style={{
                                                padding: '0.5rem',
                                                color: 'var(--text-muted)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: index === files.length - 1 ? 'not-allowed' : 'pointer',
                                                opacity: index === files.length - 1 ? 0.3 : 1
                                            }}
                                            title="Move Down"
                                        >
                                            <FaArrowDown />
                                        </button>
                                        <button
                                            onClick={() => removeFile(index)}
                                            style={{
                                                padding: '0.5rem',
                                                color: '#ef4444',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                            title="Remove Image"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: PDF Settings & Independent Margin Controls */}
                    <div className="glass-panel" style={{
                        padding: '1.75rem',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <h3 style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '1.5rem',
                            fontSize: '1.2rem'
                        }}>
                            <FaCog /> Page & Margin Configuration
                        </h3>

                        {/* Page Format & Orientation */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                    Page Size
                                </label>
                                <select
                                    value={settings.pageSize}
                                    onChange={(e) => setSettings({ ...settings, pageSize: e.target.value as any })}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.6rem' }}
                                >
                                    <option value="a4">A4 (210 × 297 mm)</option>
                                    <option value="letter">US Letter</option>
                                    <option value="a3">A3 (Poster size)</option>
                                    <option value="a5">A5 (Compact)</option>
                                    <option value="fit">Fit to Image Size</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                    Orientation
                                </label>
                                <select
                                    value={settings.orientation}
                                    onChange={(e) => setSettings({ ...settings, orientation: e.target.value as any })}
                                    disabled={settings.pageSize === 'fit'}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.6rem', opacity: settings.pageSize === 'fit' ? 0.5 : 1 }}
                                >
                                    <option value="p">Portrait (Vertical)</option>
                                    <option value="l">Landscape (Horizontal)</option>
                                    <option value="auto">Auto (Match Image)</option>
                                </select>
                            </div>
                        </div>

                        {/* Independent Margins Section */}
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                    Page Margins (mm)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setSettings(prev => ({
                                        ...prev,
                                        margins: { ...prev.margins, isLinked: !prev.margins.isLinked }
                                    }))}
                                    className="glass-btn-secondary"
                                    style={{
                                        padding: '0.25rem 0.65rem',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        color: settings.margins.isLinked ? 'var(--color-primary)' : 'var(--text-muted)'
                                    }}
                                >
                                    {settings.margins.isLinked ? <FaLink /> : <FaUnlink />}
                                    {settings.margins.isLinked ? 'Linked' : 'Separate'}
                                </button>
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => applyMarginPreset(0, 0, 0, 0)}
                                    className="glass-btn-secondary"
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                >
                                    No Margins (0mm)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyMarginPreset(0, 0, 15, 15)}
                                    className="glass-btn-secondary"
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                    title="Removes top/header and bottom/footer while preserving side margins for hole punching"
                                >
                                    Left/Right Only (15mm)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyMarginPreset(5, 5, 5, 5)}
                                    className="glass-btn-secondary"
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                >
                                    Compact (5mm)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyMarginPreset(10, 10, 10, 10)}
                                    className="glass-btn-secondary"
                                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                >
                                    Standard (10mm)
                                </button>
                            </div>

                            {/* 4 Sides Grid: Top, Bottom, Left, Right */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Top Margin
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={settings.margins.top}
                                            onChange={(e) => updateMargin('top', parseInt(e.target.value))}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                                        />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mm</span>
                                    </div>
                                </div>

                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Bottom Margin
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={settings.margins.bottom}
                                            onChange={(e) => updateMargin('bottom', parseInt(e.target.value))}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                                        />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mm</span>
                                    </div>
                                </div>

                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Left Margin
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={settings.margins.left}
                                            onChange={(e) => updateMargin('left', parseInt(e.target.value))}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                                        />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mm</span>
                                    </div>
                                </div>

                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Right Margin
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={settings.margins.right}
                                            onChange={(e) => updateMargin('right', parseInt(e.target.value))}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                                        />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mm</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Image Alignment & Quality Slider */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                                <span style={{ fontWeight: 600 }}>Image Quality: {(imageQuality * 100).toFixed(0)}%</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Recommended: 85%</span>
                            </div>
                            <input
                                type="range"
                                min="0.2"
                                max="1.0"
                                step="0.05"
                                value={imageQuality}
                                onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                            />
                        </div>

                        {/* Convert Button or Download Box */}
                        {pdfUrl ? (
                            <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                textAlign: 'center'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                                    <span className="neon-badge neon-badge-success">
                                        ✓ PDF Ready for Download
                                    </span>
                                </div>
                                <a
                                    href={pdfUrl}
                                    download="localyze-document.pdf"
                                    className="glass-btn-primary"
                                    style={{
                                        width: '100%',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        padding: '0.85rem 1.5rem',
                                        fontSize: '1rem',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <FaDownload /> Download Generated PDF
                                </a>
                            </div>
                        ) : isProcessing ? (
                            <div style={{ width: '100%' }}>
                                <ProgressBar
                                    progress={progress}
                                    label={`Processing image ${Math.ceil((progress / 100) * files.length)} of ${files.length}...`}
                                    estimatedSeconds={estimatedTime}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={handleConvert}
                                className="glass-btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1.05rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <FaFilePdf /> Create PDF Document
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Explanatory Footer */}
            <div style={{ marginTop: '3rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.15rem' }}>Image to PDF Features</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>4-Side Margin System</strong>: Remove header/footer white space by setting Top and Bottom to 0mm while retaining Left/Right margins for document binding.</li>
                    <li><strong>Individual 90° Image Rotation</strong>: Click the rotate button on any image thumbnail to adjust sideways orientation before PDF assembly.</li>
                    <li><strong>Automatic Orientation</strong>: Set orientation to "Auto" to dynamically adjust each page between Portrait and Landscape based on image aspect ratio.</li>
                </ol>
            </div>
        </div>
    );
};

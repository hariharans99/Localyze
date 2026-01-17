import { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaTrash, FaArrowUp, FaArrowDown, FaCog } from 'react-icons/fa';

import { ProgressBar } from '../../components/ProgressBar';

interface PdfSettings {
    pageSize: 'a4' | 'fit';
    orientation: 'p' | 'l';
    margin: number; // in mm
}

export const ImageToPdf = () => {
    const { checkLimit, incrementUsage, logActivity } = useUser();
    const { error, success } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
    const startTimeRef = useRef<number>(0);
    const [settings, setSettings] = useState<PdfSettings>({
        pageSize: 'a4',
        orientation: 'p',
        margin: 10
    });

    // Clear generated PDF when settings change
    useEffect(() => {
        setPdfUrl(null);
    }, [settings]);

    const handleFileSelect = (selectedFiles: File | File[]) => {
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        setFiles(prev => [...prev, ...newFiles]);

        // Create previews for new files
        newFiles.forEach(file => {
            const url = URL.createObjectURL(file);
            setImagePreviews(prev => [...prev, url]);
        });

        setPdfUrl(null);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            URL.revokeObjectURL(prev[index]); // Clean up
            return newPreviews;
        });
        setPdfUrl(null);
    };

    const moveFile = (index: number, direction: 'up' | 'down') => {
        setFiles(prev => {
            const newFiles = [...prev];
            if (direction === 'up' && index > 0) {
                [newFiles[index], newFiles[index - 1]] = [newFiles[index - 1], newFiles[index]];
            } else if (direction === 'down' && index < newFiles.length - 1) {
                [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
            }
            return newFiles;
        });
        setImagePreviews(prev => {
            const newPreviews = [...prev];
            if (direction === 'up' && index > 0) {
                [newPreviews[index], newPreviews[index - 1]] = [newPreviews[index - 1], newPreviews[index]];
            } else if (direction === 'down' && index < newPreviews.length - 1) {
                [newPreviews[index], newPreviews[index + 1]] = [newPreviews[index + 1], newPreviews[index]];
            }
            return newPreviews;
        });
        setPdfUrl(null);
    };

    const handleConvert = async () => {
        if (!checkLimit()) {
            error("Daily limit reached! Please upgrade to continue.");
            return;
        }
        if (files.length === 0) return;
        setIsProcessing(true);
        setEstimatedTime(undefined);
        startTimeRef.current = Date.now();

        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({
                orientation: settings.orientation,
                unit: 'mm',
                format: settings.pageSize === 'fit' ? undefined : settings.pageSize
            });

            // Remove default first page if we are going to add custom pages
            // But jsPDF starts with one page. We will fill it first.

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const img = new Image();
                img.src = URL.createObjectURL(file);

                await new Promise((resolve) => {
                    img.onload = () => resolve(true);
                });

                const pageWidth = settings.pageSize === 'a4' ? (settings.orientation === 'p' ? 210 : 297) : img.width * 0.264583; // pixel to mm
                const pageHeight = settings.pageSize === 'a4' ? (settings.orientation === 'p' ? 297 : 210) : img.height * 0.264583;

                // If fit to image, we resize page to image
                if (settings.pageSize === 'fit') {
                    if (i > 0) {
                        doc.addPage([pageWidth, pageHeight], settings.orientation);
                    } else {
                        // Resize first page
                        doc.internal.pageSize.width = pageWidth;
                        doc.internal.pageSize.height = pageHeight;
                    }

                    doc.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);
                } else {
                    // A4 logic with margins
                    if (i > 0) doc.addPage(settings.pageSize, settings.orientation);

                    const margin = settings.margin;
                    const maxWidth = pageWidth - (margin * 2);
                    const maxHeight = pageHeight - (margin * 2);

                    // Calculate scaling to fit within margins
                    const imgRatio = img.width / img.height;
                    const pageRatio = maxWidth / maxHeight;

                    let finalWidth, finalHeight;

                    if (imgRatio > pageRatio) {
                        finalWidth = maxWidth;
                        finalHeight = maxWidth / imgRatio;
                    } else {
                        finalHeight = maxHeight;
                        finalWidth = maxHeight * imgRatio;
                    }

                    // Center image
                    const x = margin + (maxWidth - finalWidth) / 2;
                    const y = margin + (maxHeight - finalHeight) / 2;

                    doc.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
                    doc.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
                }

                setProgress(((i + 1) / files.length) * 100);

                // Estimate time
                if (i > 0) {
                    const elapsed = (Date.now() - startTimeRef.current) / 1000;
                    const avgTimePerImg = elapsed / (i + 1); // Using i+1 because we just finished one
                    const remaining = avgTimePerImg * (files.length - (i + 1));
                    setEstimatedTime(remaining);
                }
            }

            const pdfBlob = doc.output('blob');
            setPdfUrl(URL.createObjectURL(pdfBlob));
            await incrementUsage('pdf');
            logActivity('pdf', `Merged ${files.length} images`);
            success("PDF generated successfully!");
        } catch (e) {
            console.error(e);
            error('Failed to generate PDF');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Image to PDF
            </h1>

            {files.length === 0 ? (
                <FileUploader
                    onFileSelect={handleFileSelect}
                    accept="image/*"
                    label="Upload Images (Select Multiple)"
                    multiple={true}
                />
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '2fr 1fr',
                    gap: 'clamp(1rem, 3vw, 2rem)',
                    alignItems: 'start'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {files.map((file, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'clamp(0.75rem, 2vw, 1rem)',
                                backgroundColor: 'var(--bg-surface)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)',
                                gap: '0.5rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 1rem)', flex: 1, minWidth: 0 }}>
                                    <span style={{
                                        width: 'clamp(24px, 5vw, 32px)',
                                        height: 'clamp(24px, 5vw, 32px)',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--bg-app)',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                                        fontWeight: 600,
                                        flexShrink: 0
                                    }}>{index + 1}</span>
                                    <span style={{
                                        fontWeight: 500,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontSize: 'clamp(0.85rem, 2vw, 1rem)'
                                    }}>
                                        {file.name}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                    <button
                                        onClick={() => moveFile(index, 'up')}
                                        disabled={index === 0}
                                        style={{
                                            padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                                            color: 'var(--text-muted)',
                                            minWidth: '44px',
                                            minHeight: '44px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        <FaArrowUp />
                                    </button>
                                    <button
                                        onClick={() => moveFile(index, 'down')}
                                        disabled={index === files.length - 1}
                                        style={{
                                            padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                                            color: 'var(--text-muted)',
                                            minWidth: '44px',
                                            minHeight: '44px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        <FaArrowDown />
                                    </button>
                                    <button
                                        onClick={() => removeFile(index)}
                                        style={{
                                            padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                                            color: '#ef4444',
                                            minWidth: '44px',
                                            minHeight: '44px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => {
                                    document.getElementById('add-more-input')?.click();
                                }}
                                style={{
                                    flex: 1,
                                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                                    border: '2px dashed var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-muted)',
                                    backgroundColor: 'var(--bg-surface)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    minHeight: '44px',
                                    fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                                }}
                            >
                                + Add More
                            </button>
                            <button
                                onClick={() => {
                                    setPdfUrl(null);
                                    setProgress(0);
                                    // Reset settings
                                    setSettings({
                                        pageSize: 'a4',
                                        orientation: 'p',
                                        margin: 10
                                    });
                                }}
                                style={{
                                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-muted)',
                                    backgroundColor: 'var(--bg-surface)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    minHeight: '44px',
                                    fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                                }}
                            >
                                <FaCog /> Reset Settings
                            </button>
                        </div>
                        <input
                            id="add-more-input"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
                            style={{ display: 'none' }}
                        />


                        {/* Image Preview Grid */}
                        {imagePreviews.length > 0 && (
                            <div style={{ marginTop: '2rem' }}>
                                <h4 style={{ marginBottom: '1rem' }}>Preview ({files.length} {files.length === 1 ? 'image' : 'images'})</h4>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                    gap: '0.75rem'
                                }}>
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} style={{
                                            position: 'relative',
                                            aspectRatio: '1',
                                            border: '2px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            overflow: 'hidden',
                                            backgroundColor: 'var(--bg-app)'
                                        }}>
                                            <img
                                                src={preview}
                                                alt={`Image ${index + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                top: '4px',
                                                left: '4px',
                                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                color: 'white',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                {index + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        padding: 'clamp(1rem, 3vw, 1.5rem)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        top: window.innerWidth < 768 ? '0' : '80px',
                        position: window.innerWidth < 768 ? 'relative' : 'sticky'
                    }}>
                        <h3 style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '1.5rem',
                            fontSize: 'clamp(1rem, 3vw, 1.25rem)'
                        }}>
                            <FaCog /> PDF Settings
                        </h3>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                            }}>Page Size</label>
                            <select
                                value={settings.pageSize}
                                onChange={(e) => setSettings({ ...settings, pageSize: e.target.value as any })}
                                style={{
                                    width: '100%',
                                    padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)',
                                    backgroundColor: 'var(--bg-app)',
                                    color: 'var(--text-main)',
                                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                                    minHeight: '44px'
                                }}
                            >
                                <option value="a4">A4 (Standard PDF)</option>
                                <option value="fit">Fit to Image Size</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                            }}>Orientation</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setSettings({ ...settings, orientation: 'p' })}
                                    style={{
                                        flex: 1,
                                        padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${settings.orientation === 'p' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                        backgroundColor: settings.orientation === 'p' ? 'var(--color-primary)' : 'var(--bg-app)',
                                        color: settings.orientation === 'p' ? 'white' : 'var(--text-main)',
                                        minHeight: '44px',
                                        fontSize: 'clamp(0.85rem, 2vw, 1rem)'
                                    }}
                                >
                                    Portrait
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, orientation: 'l' })}
                                    style={{
                                        flex: 1,
                                        padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${settings.orientation === 'l' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                        backgroundColor: settings.orientation === 'l' ? 'var(--color-primary)' : 'var(--bg-app)',
                                        color: settings.orientation === 'l' ? 'white' : 'var(--text-main)',
                                        minHeight: '44px',
                                        fontSize: 'clamp(0.85rem, 2vw, 1rem)'
                                    }}
                                >
                                    Landscape
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                            }}>Margin (mm): {settings.margin}</label>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                value={settings.margin}
                                onChange={(e) => setSettings({ ...settings, margin: parseInt(e.target.value) })}
                                disabled={settings.pageSize === 'fit'}
                                style={{
                                    width: '100%',
                                    accentColor: 'var(--color-primary)',
                                    minHeight: '44px'
                                }}
                            />
                        </div>

                        {pdfUrl ? (
                            <a
                                href={pdfUrl}
                                download="localyze-converted.pdf"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    minHeight: '44px',
                                    fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                                }}
                            >
                                <FaDownload /> Download PDF
                            </a>
                        ) : !checkLimit() ? (
                            <div style={{
                                width: '100%',
                                padding: 'clamp(0.75rem, 2vw, 1rem)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 600,
                                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                                textAlign: 'center',
                                border: '1px solid #ef4444',
                                minHeight: '44px'
                            }}>
                                Daily Limit Reached (2/2)
                            </div>
                        ) : (
                            isProcessing ? (
                                <div style={{ width: '100%' }}>
                                    <ProgressBar
                                        progress={progress}
                                        label={`Processing image ${Math.ceil((progress / 100) * files.length)} of ${files.length}`}
                                        estimatedSeconds={estimatedTime}
                                    />
                                </div>
                            ) : (
                                <button
                                    onClick={handleConvert}
                                    style={{
                                        width: '100%',
                                        padding: 'clamp(0.75rem, 2vw, 1rem)',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600,
                                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        minHeight: '44px'
                                    }}
                                >
                                    Create PDF
                                </button>
                            )
                        )}
                    </div>
                </div>
            )
            }

            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How it Works</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload Images:</strong> Select one or multiple images from your device.</li>
                    <li><strong>Arrange & Edit:</strong> Reorder images using the arrow buttons or remove unwanted ones.</li>
                    <li><strong>Configure PDF:</strong> Choose page size (A4 or Fit), orientation, and margins.</li>
                    <li><strong>Generate:</strong> Click "Create PDF" to merge your images into a single document.</li>
                    <li><strong>Download:</strong> Save your newly created PDF file locally.</li>
                </ol>
            </div>
        </div >
    );
};

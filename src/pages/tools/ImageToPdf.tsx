import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaTrash, FaArrowUp, FaArrowDown, FaCog } from 'react-icons/fa';

interface PdfSettings {
    pageSize: 'a4' | 'fit';
    orientation: 'p' | 'l';
    margin: number; // in mm
}

export const ImageToPdf = () => {
    const { checkLimit, incrementUsage, logActivity } = useUser();
    const { error, success } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
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
        setPdfUrl(null);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
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
        setPdfUrl(null);
    };

    const handleConvert = async () => {
        if (!checkLimit()) {
            error("Daily limit reached! Please upgrade to continue.");
            return;
        }
        if (files.length === 0) return;
        setIsProcessing(true);

        try {
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
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {files.map((file, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                backgroundColor: 'var(--bg-surface)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--bg-app)',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}>{index + 1}</span>
                                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                        {file.name}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => moveFile(index, 'up')} disabled={index === 0} style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                                        <FaArrowUp />
                                    </button>
                                    <button onClick={() => moveFile(index, 'down')} disabled={index === files.length - 1} style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                                        <FaArrowDown />
                                    </button>
                                    <button onClick={() => removeFile(index)} style={{ padding: '0.5rem', color: '#ef4444' }}>
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                // Trigger file input again - simplistic approach or add distinct button
                                // For now, let's just show a small uploader or button
                                document.getElementById('add-more-input')?.click();
                            }}
                            style={{
                                padding: '1rem',
                                border: '2px dashed var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-muted)',
                                backgroundColor: 'var(--bg-surface)',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            + Add More Images
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

                    <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        padding: '1.5rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        top: '80px',
                        position: 'sticky'
                    }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <FaCog /> PDF Settings
                        </h3>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Page Size</label>
                            <select
                                value={settings.pageSize}
                                onChange={(e) => setSettings({ ...settings, pageSize: e.target.value as any })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)',
                                    backgroundColor: 'var(--bg-app)',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <option value="a4">A4 (Standard PDF)</option>
                                <option value="fit">Fit to Image Size</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Orientation</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setSettings({ ...settings, orientation: 'p' })}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${settings.orientation === 'p' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                        backgroundColor: settings.orientation === 'p' ? 'var(--color-primary)' : 'var(--bg-app)',
                                        color: settings.orientation === 'p' ? 'white' : 'var(--text-main)'
                                    }}
                                >
                                    Portrait
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, orientation: 'l' })}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${settings.orientation === 'l' ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                                        backgroundColor: settings.orientation === 'l' ? 'var(--color-primary)' : 'var(--bg-app)',
                                        color: settings.orientation === 'l' ? 'white' : 'var(--text-main)'
                                    }}
                                >
                                    Landscape
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Margin (mm): {settings.margin}</label>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                value={settings.margin}
                                onChange={(e) => setSettings({ ...settings, margin: parseInt(e.target.value) })}
                                disabled={settings.pageSize === 'fit'}
                                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
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
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    textDecoration: 'none'
                                }}
                            >
                                <FaDownload /> Download PDF
                            </a>
                        ) : !checkLimit() ? (
                            <div style={{
                                width: '100%',
                                padding: '1rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 600,
                                fontSize: '1rem',
                                textAlign: 'center',
                                border: '1px solid #ef4444'
                            }}>
                                Daily Limit Reached (2/2)
                            </div>
                        ) : (
                            <button
                                onClick={handleConvert}
                                disabled={isProcessing}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    backgroundColor: isProcessing ? 'var(--bg-surface-hover)' : 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {isProcessing ? 'Generating...' : 'Create PDF'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

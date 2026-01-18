import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaTrash, FaArrowUp, FaArrowDown, FaDownload } from 'react-icons/fa';
import { SEO } from '../../components/SEO';

export const PdfMerge = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = async (selectedFiles: File | File[]) => {
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');

        if (pdfFiles.length !== newFiles.length) {
            toast.error('Only PDF files are supported');
        }

        const MAX_SIZE_MB = 100;
        const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
        const currentTotalSize = files.reduce((acc, file) => acc + file.size, 0);
        const newFilesSize = pdfFiles.reduce((acc, file) => acc + file.size, 0);

        if (currentTotalSize + newFilesSize > MAX_SIZE_BYTES) {
            toast.error(`Total file size cannot exceed ${MAX_SIZE_MB}MB to ensure browser stability.`);
            return;
        }

        // Generate thumbnails for new files
        const newThumbnails = await Promise.all(pdfFiles.map(async (file) => {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 0.5 }); // Thumbnail scale

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport } as any).promise;
                    return canvas.toDataURL();
                }
                return '';
            } catch (err) {
                console.error("Error generating thumbnail", err);
                return '';
            }
        }));

        setFiles(prev => [...prev, ...pdfFiles]);
        setThumbnails(prev => [...prev, ...newThumbnails]);
        setMergedPdfUrl(null); // Reset previous merge
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setThumbnails(prev => prev.filter((_, i) => i !== index));
        setMergedPdfUrl(null);
    };

    const moveFile = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === files.length - 1)
        ) return;

        setFiles(prev => {
            const newFiles = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
            return newFiles;
        });
        setThumbnails(prev => {
            const newThumbs = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            [newThumbs[index], newThumbs[targetIndex]] = [newThumbs[targetIndex], newThumbs[index]];
            return newThumbs;
        });
        setMergedPdfUrl(null);
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            toast.error('Please select at least 2 PDF files to merge');
            return;
        }

        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        setIsProcessing(true);
        try {
            const mergedPdf = await PDFDocument.create();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const mergedPdfBytes = await mergedPdf.save({ useObjectStreams: false, addDefaultPage: false });
            const blob = new Blob([mergedPdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setMergedPdfUrl(url);
            await incrementUsage('pdf_merge');
            toast.success('PDFs merged successfully!');
        } catch (error) {
            console.error('Error merging PDFs:', error);
            toast.error('Failed to merge PDFs. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <SEO
                title="Merge PDF Files - Combine PDFs Online"
                description="Merge multiple PDF files into one document. Drag and drop to reorder pages. 100% local and secure."
            />
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Merge PDF Files
            </h1>

            <AdBanner style={{ marginBottom: '2rem' }} />

            <div style={{ marginBottom: '2rem' }}>
                {files.length === 0 ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".pdf,application/pdf"
                        label="Upload PDFs to Merge"
                        multiple={true}
                        maxSizeMB={100}
                    />
                ) : (
                    <div className="bg-surface p-8 rounded-lg border border-subtle">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{files.length} PDFs Selected</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Arrange files in the order you want them merged</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => document.getElementById('add-more-pdf')?.click()}
                                    style={{ color: 'var(--color-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    + Add More
                                </button>
                                <input
                                    id="add-more-pdf"
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            handleFileSelect(Array.from(e.target.files));
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => {
                                        setFiles([]);
                                        setThumbnails([]);
                                        setMergedPdfUrl(null);
                                    }}
                                    style={{ color: 'var(--text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {files.map((file, idx) => (
                                <div key={`${file.name}-${idx}`} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--bg-surface)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'var(--bg-app)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-muted)'
                                        }}>
                                            {idx + 1}
                                        </div>

                                        {/* Thumbnail */}
                                        {thumbnails[idx] && (
                                            <div style={{
                                                width: '40px',
                                                height: '50px',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: 'var(--radius-sm)',
                                                overflow: 'hidden',
                                                backgroundColor: 'white',
                                                flexShrink: 0
                                            }}>
                                                <img
                                                    src={thumbnails[idx]}
                                                    alt="Preview"
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                />
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500 }}>{file.name}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => moveFile(idx, 'up')}
                                            disabled={idx === 0}
                                            style={{
                                                padding: '0.5rem', background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                                color: idx === 0 ? 'var(--text-muted)' : 'var(--text-main)'
                                            }}
                                            title="Move Up"
                                        >
                                            <FaArrowUp />
                                        </button>
                                        <button
                                            onClick={() => moveFile(idx, 'down')}
                                            disabled={idx === files.length - 1}
                                            style={{
                                                padding: '0.5rem', background: 'none', border: 'none', cursor: idx === files.length - 1 ? 'not-allowed' : 'pointer',
                                                color: idx === files.length - 1 ? 'var(--text-muted)' : 'var(--text-main)'
                                            }}
                                            title="Move Down"
                                        >
                                            <FaArrowDown />
                                        </button>
                                        <button
                                            onClick={() => removeFile(idx)}
                                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}
                                            title="Remove"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleMerge}
                            disabled={isProcessing || files.length < 2}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                backgroundColor: isProcessing || files.length < 2 ? 'var(--bg-surface-hover)' : 'var(--color-primary)',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: isProcessing || files.length < 2 ? 'not-allowed' : 'pointer',
                                border: 'none',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            {isProcessing ? 'Merging PDFs...' : 'Merge PDFs'}
                        </button>

                        {mergedPdfUrl && (
                            <div style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ marginBottom: '1rem', color: '#10b981' }}>Merge Successful!</h3>
                                <a
                                    href={mergedPdfUrl}
                                    download="merged-document.pdf"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        borderRadius: 'var(--radius-full)',
                                        textDecoration: 'none',
                                        fontWeight: 600
                                    }}
                                >
                                    <FaDownload /> Download Merged PDF
                                </a>
                                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    💡 Need a smaller file? Use the <a href="/tools/compress-pdf" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>PDF Compressor</a> to reduce the size.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How to Merge PDFs</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload Files</strong>: Select multiple PDF files you want to combine.</li>
                    <li><strong>Reorder</strong>: Use the arrow buttons to arrange them in the correct order.</li>
                    <li><strong>Merge</strong>: Click "Merge PDFs" to combine them into a single document.</li>
                    <li><strong>Download</strong>: Save your new merged PDF file.</li>
                </ol>
            </div>

            <AdBanner />
        </div >
    );
};

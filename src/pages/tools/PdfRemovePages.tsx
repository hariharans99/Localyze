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
import { FaDownload, FaTrash } from 'react-icons/fa';
import { SEO } from '../../components/SEO';

export const PdfRemovePages = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number>(0);
    const [rangeInput, setRangeInput] = useState('');
    const [previews, setPreviews] = useState<string[]>([]);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = async (selectedFile: File | File[]) => {
        const fileToLoad = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
        if (fileToLoad.type !== 'application/pdf') {
            toast.error('Please upload a valid PDF file');
            return;
        }

        try {
            const arrayBuffer = await fileToLoad.arrayBuffer();
            const pdfBlob = await pdfjsLib.getDocument(arrayBuffer).promise;

            const count = pdfBlob.numPages;
            setPageCount(count);
            setFile(fileToLoad);
            setResultPdfUrl(null);
            setRangeInput('');
            setSelectedPages(new Set());
            setPreviews([]);

            // Generate thumbnails
            const newPreviews: string[] = [];
            for (let i = 1; i <= count; i++) {
                try {
                    const page = await pdfBlob.getPage(i);
                    const viewport = page.getViewport({ scale: 0.2 }); // Low res for grid

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        await page.render({ canvasContext: context, viewport } as any).promise;
                        newPreviews.push(canvas.toDataURL());
                    } else {
                        newPreviews.push('');
                    }
                } catch (e) {
                    console.error('Error generating preview for page', i, e);
                    newPreviews.push('');
                }
            }
            setPreviews(newPreviews);

        } catch (error) {
            console.error('Error loading PDF:', error);
            toast.error('Failed to load PDF info');
        }
    };

    const togglePageSelection = (pageIndex: number) => {
        const newSelected = new Set(selectedPages);
        if (newSelected.has(pageIndex)) {
            newSelected.delete(pageIndex);
        } else {
            newSelected.add(pageIndex);
        }
        setSelectedPages(newSelected);

        // Update range input
        const sorted = Array.from(newSelected).sort((a, b) => a - b);
        // Convert to 1-based index string
        setRangeInput(sorted.map(i => i + 1).join(', '));
    };

    const parsePageRanges = (input: string, maxPages: number): number[] => {
        const pages = new Set<number>();
        const parts = input.split(',').map(p => p.trim());

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(num => parseInt(num));
                if (!isNaN(start) && !isNaN(end)) {
                    // Ensure range is valid and within bounds
                    const min = Math.max(1, Math.min(start, end));
                    const max = Math.min(maxPages, Math.max(start, end));
                    for (let i = min; i <= max; i++) {
                        pages.add(i - 1); // Convert to 0-based index
                    }
                }
            } else {
                const pageNum = parseInt(part);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
                    pages.add(pageNum - 1); // Convert to 0-based index
                }
            }
        }
        return Array.from(pages).sort((a, b) => a - b);
    };

    const handleRemovePages = async () => {
        if (!file || !rangeInput.trim()) return;

        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        const indicesToRemove = parsePageRanges(rangeInput, pageCount);

        if (indicesToRemove.length === 0) {
            toast.error('No pages selected for removal.');
            return;
        }

        if (indicesToRemove.length === pageCount) {
            toast.error('Cannot remove all pages.');
            return;
        }

        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const srcPdf = await PDFDocument.load(arrayBuffer);
            const newPdf = await PDFDocument.create();

            const allIndices = Array.from({ length: pageCount }, (_, i) => i);
            const indicesToKeep = allIndices.filter(i => !indicesToRemove.includes(i));

            const copiedPages = await newPdf.copyPages(srcPdf, indicesToKeep);
            copiedPages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save({ useObjectStreams: false, addDefaultPage: false });
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResultPdfUrl(url);
            await incrementUsage('pdf_remove_pages');
            toast.success('Pages removed successfully!');
        } catch (error) {
            console.error('Error removing pages:', error);
            toast.error('Failed to process PDF.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <SEO
                title="Remove PDF Pages - Delete Pages Online"
                description="Delete unwanted pages from your PDF document easily. Fast, free, and secure local processing."
            />
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Remove PDF Pages
            </h1>

            <AdBanner style={{ marginBottom: '2rem' }} />

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".pdf,application/pdf"
                        label="Upload PDF"
                        multiple={false}
                    />
                ) : (
                    <div className="bg-surface p-8 rounded-lg border border-subtle">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)' }}>{pageCount} pages detected</p>
                            </div>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setResultPdfUrl(null);
                                    setRangeInput('');
                                    setPreviews([]);
                                    setSelectedPages(new Set());
                                }}
                                style={{ color: '#ef4444', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Change File
                            </button>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#ef4444' }}>
                                Pages to Remove (Selected pages will be deleted)
                            </label>
                            <input
                                type="text"
                                value={rangeInput}
                                onChange={(e) => setRangeInput(e.target.value)}
                                placeholder="e.g. 1-3, 5, 8-10"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)',
                                    backgroundColor: 'var(--bg-app)',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem'
                                }}
                            />
                            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Use commas for separate pages and dashes for ranges.
                            </p>
                        </div>

                        {/* Page Selection Grid */}
                        {previews.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 500 }}>
                                    Select Pages to Remove (Click to select)
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                    gap: '1rem',
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    padding: '0.5rem',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    {previews.map((src, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => togglePageSelection(idx)}
                                            style={{
                                                position: 'relative',
                                                cursor: 'pointer',
                                                border: selectedPages.has(idx) ? '3px solid #ef4444' : '1px solid var(--border-subtle)',
                                                borderRadius: 'var(--radius-sm)',
                                                overflow: 'hidden',
                                                opacity: selectedPages.has(idx) ? 0.6 : 1,
                                                transform: selectedPages.has(idx) ? 'scale(0.95)' : 'scale(1)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <img src={src} alt={`Page ${idx + 1}`} style={{ width: '100%', display: 'block' }} />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                background: selectedPages.has(idx) ? '#ef4444' : 'rgba(0,0,0,0.5)',
                                                color: 'white',
                                                padding: '2px 6px',
                                                fontSize: '0.75rem',
                                                borderTopLeftRadius: '4px'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            {selectedPages.has(idx) && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    color: '#ef4444',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                    borderRadius: '50%',
                                                    width: '40px',
                                                    height: '40px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}>
                                                    <FaTrash />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleRemovePages}
                            disabled={isProcessing || !rangeInput.trim()}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                backgroundColor: isProcessing || !rangeInput.trim() ? 'var(--bg-surface-hover)' : '#ef4444',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: isProcessing || !rangeInput.trim() ? 'not-allowed' : 'pointer',
                                border: 'none',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            {isProcessing ? 'Processing...' : (
                                <>
                                    <FaTrash /> Remove Selected Pages
                                </>
                            )}
                        </button>

                        {resultPdfUrl && (
                            <div style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ marginBottom: '1rem', color: '#10b981' }}>Pages Removed Successfully!</h3>
                                <a
                                    href={resultPdfUrl}
                                    download={`edited-${file.name}`}
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
                                    <FaDownload /> Download PDF
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
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How to Remove Pages from PDF</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload</strong>: Select the PDF file you want to edit.</li>
                    <li><strong>Select Pages</strong>: Click on the pages or enter page numbers you want to REMOVE.
                        <ul style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <li>Single pages: <code>1, 5, 8</code> (will be deleted)</li>
                            <li>Ranges: <code>1-5</code> (pages 1 to 5 will be deleted)</li>
                        </ul>
                    </li>
                    <li><strong>Remove</strong>: Click the button to create a new PDF without the selected pages.</li>
                </ol>
            </div>

            <AdBanner />
        </div>
    );
};

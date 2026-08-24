import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaTrash, FaSquare } from 'react-icons/fa';
import { SEO } from '../../components/SEO';

export const PdfRemovePages = () => {
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
                    const viewport = page.getViewport({ scale: 0.25 });

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

        const sorted = Array.from(newSelected).sort((a, b) => a - b);
        setRangeInput(sorted.map(i => i + 1).join(', '));
    };

    const selectOddPages = () => {
        const odds = new Set<number>();
        for (let i = 0; i < pageCount; i += 2) odds.add(i);
        setSelectedPages(odds);
        const sorted = Array.from(odds).sort((a, b) => a - b);
        setRangeInput(sorted.map(i => i + 1).join(', '));
    };

    const selectEvenPages = () => {
        const evens = new Set<number>();
        for (let i = 1; i < pageCount; i += 2) evens.add(i);
        setSelectedPages(evens);
        const sorted = Array.from(evens).sort((a, b) => a - b);
        setRangeInput(sorted.map(i => i + 1).join(', '));
    };

    const selectFirstPage = () => {
        const set = new Set(selectedPages);
        set.add(0);
        setSelectedPages(set);
        const sorted = Array.from(set).sort((a, b) => a - b);
        setRangeInput(sorted.map(i => i + 1).join(', '));
    };

    const selectLastPage = () => {
        const set = new Set(selectedPages);
        set.add(pageCount - 1);
        setSelectedPages(set);
        const sorted = Array.from(set).sort((a, b) => a - b);
        setRangeInput(sorted.map(i => i + 1).join(', '));
    };

    const clearAll = () => {
        setSelectedPages(new Set());
        setRangeInput('');
    };

    const parsePageRanges = (input: string, maxPages: number): number[] => {
        const pages = new Set<number>();
        const parts = input.split(',').map(p => p.trim());

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(num => parseInt(num));
                if (!isNaN(start) && !isNaN(end)) {
                    const min = Math.max(1, Math.min(start, end));
                    const max = Math.min(maxPages, Math.max(start, end));
                    for (let i = min; i <= max; i++) {
                        pages.add(i - 1);
                    }
                }
            } else {
                const pageNum = parseInt(part);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
                    pages.add(pageNum - 1);
                }
            }
        }
        return Array.from(pages).sort((a, b) => a - b);
    };

    const handleRemovePages = async () => {
        if (!file || !rangeInput.trim()) return;

        const indicesToRemove = parsePageRanges(rangeInput, pageCount);

        if (indicesToRemove.length === 0) {
            toast.error('No pages selected for removal.');
            return;
        }

        if (indicesToRemove.length === pageCount) {
            toast.error('Cannot remove all pages from the document.');
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
            toast.success(`Removed ${indicesToRemove.length} pages. Saved ${indicesToKeep.length} pages!`);
        } catch (error) {
            console.error('Error removing pages:', error);
            toast.error('Failed to process PDF.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '950px' }}>
            <SEO
                title="Remove PDF Pages - Delete Specific Pages Online"
                description="Select and delete unwanted pages from your PDF document. Use quick filters for odd/even pages with live thumbnail preview."
            />
            <h1 className="text-gradient" style={{ fontSize: '2.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                Remove PDF Pages
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                Visually select pages to discard, or use quick batch removal chips to produce a streamlined document.
            </p>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".pdf,application/pdf"
                        label="Upload PDF to Remove Pages"
                        multiple={false}
                    />
                ) : (
                    <div className="glass-panel" style={{
                        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                        borderRadius: 'var(--radius-xl)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.25rem', fontSize: '1.25rem' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {pageCount} total pages • <span style={{ color: '#ef4444', fontWeight: 600 }}>{selectedPages.size} marked for removal</span> • <span style={{ color: '#10b981', fontWeight: 600 }}>{pageCount - selectedPages.size} pages remaining</span>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setResultPdfUrl(null);
                                    setRangeInput('');
                                    setPreviews([]);
                                    setSelectedPages(new Set());
                                }}
                                className="glass-btn-secondary"
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            >
                                Change File
                            </button>
                        </div>

                        {/* Page Selection Controls & Quick Chips */}
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ef4444' }}>
                                    Pages to Remove (e.g. 1-3, 5, 8-10)
                                </label>
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={selectOddPages} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        Remove Odd
                                    </button>
                                    <button type="button" onClick={selectEvenPages} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        Remove Even
                                    </button>
                                    <button type="button" onClick={selectFirstPage} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        First Page
                                    </button>
                                    <button type="button" onClick={selectLastPage} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        Last Page
                                    </button>
                                    <button type="button" onClick={clearAll} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        <FaSquare /> Clear
                                    </button>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={rangeInput}
                                onChange={(e) => {
                                    setRangeInput(e.target.value);
                                    const parsed = parsePageRanges(e.target.value, pageCount);
                                    setSelectedPages(new Set(parsed));
                                }}
                                placeholder="e.g. 1-3, 5, 8-10"
                                className="glass-input"
                                style={{
                                    width: '100%',
                                    padding: '0.85rem',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        {/* Page Selection Grid */}
                        {previews.length > 0 && (
                            <div style={{ marginBottom: '1.75rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                    Click Pages to Mark for Deletion:
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                                    gap: '0.85rem',
                                    maxHeight: '420px',
                                    overflowY: 'auto',
                                    padding: '0.75rem',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'rgba(0, 0, 0, 0.15)'
                                }}>
                                    {previews.map((src, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => togglePageSelection(idx)}
                                            style={{
                                                position: 'relative',
                                                cursor: 'pointer',
                                                border: selectedPages.has(idx) ? '3px solid #ef4444' : '1px solid var(--glass-border)',
                                                borderRadius: 'var(--radius-md)',
                                                overflow: 'hidden',
                                                opacity: selectedPages.has(idx) ? 0.45 : 1,
                                                transform: selectedPages.has(idx) ? 'scale(0.95)' : 'scale(1)',
                                                transition: 'all 0.2s',
                                                boxShadow: selectedPages.has(idx) ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none',
                                                backgroundColor: '#ffffff'
                                            }}
                                        >
                                            <img src={src} alt={`Page ${idx + 1}`} style={{ width: '100%', display: 'block' }} />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                background: selectedPages.has(idx) ? '#ef4444' : 'rgba(0,0,0,0.7)',
                                                color: 'white',
                                                padding: '2px 6px',
                                                fontSize: '0.75rem',
                                                borderTopLeftRadius: '4px',
                                                fontWeight: 700
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
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    borderRadius: '50%',
                                                    width: '38px',
                                                    height: '38px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
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
                            disabled={isProcessing || selectedPages.size === 0 || selectedPages.size === pageCount}
                            className="glass-btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1rem',
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                boxShadow: '0 0 20px -3px rgba(239, 68, 68, 0.4)',
                                opacity: isProcessing || selectedPages.size === 0 || selectedPages.size === pageCount ? 0.5 : 1
                            }}
                        >
                            {isProcessing ? 'Processing...' : (
                                <>
                                    <FaTrash /> Remove {selectedPages.size} Marked Pages
                                </>
                            )}
                        </button>

                        {resultPdfUrl && (
                            <div style={{
                                marginTop: '2rem',
                                textAlign: 'center',
                                padding: '2rem',
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                boxShadow: '0 0 25px -5px rgba(16, 185, 129, 0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                                    <span className="neon-badge neon-badge-success">
                                        ✓ Document Saved ({pageCount - selectedPages.size} Pages)
                                    </span>
                                </div>
                                <a
                                    href={resultPdfUrl}
                                    download={`edited-${file.name}`}
                                    className="glass-btn-primary"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                        padding: '0.85rem 1.75rem',
                                        fontSize: '1rem',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <FaDownload /> Download Edited PDF
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

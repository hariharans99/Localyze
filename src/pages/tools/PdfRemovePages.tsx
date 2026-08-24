import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaTrash, FaSquare, FaTimesCircle } from 'react-icons/fa';
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
        if (!fileToLoad) return;
        if (fileToLoad.type !== 'application/pdf' && !fileToLoad.name.toLowerCase().endsWith('.pdf')) {
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
                        context.fillStyle = '#ffffff';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        await page.render({ canvasContext: context, viewport } as any).promise;
                        newPreviews.push(canvas.toDataURL());
                        canvas.width = 0;
                        canvas.height = 0;
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

    const handleRangeInputChange = (value: string) => {
        setRangeInput(value);
        const parsed = parsePageRanges(value, pageCount);
        setSelectedPages(new Set(parsed));
    };

    const handleRemovePages = async () => {
        if (!file || selectedPages.size === 0) {
            toast.error('Please select at least one page to delete');
            return;
        }

        if (selectedPages.size >= pageCount) {
            toast.error('Cannot remove all pages. At least one page must remain.');
            return;
        }

        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const srcDoc = await PDFDocument.load(arrayBuffer);
            const newDoc = await PDFDocument.create();

            // Calculate remaining pages
            const remainingIndices: number[] = [];
            for (let i = 0; i < pageCount; i++) {
                if (!selectedPages.has(i)) {
                    remainingIndices.push(i);
                }
            }

            const copiedPages = await newDoc.copyPages(srcDoc, remainingIndices);
            copiedPages.forEach(p => newDoc.addPage(p));

            const pdfBytes = await newDoc.save({ useObjectStreams: false });
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            setResultPdfUrl(URL.createObjectURL(blob));
            toast.success(`Removed ${selectedPages.size} pages! ${remainingIndices.length} pages remaining.`);
        } catch (error) {
            console.error('Error removing pages:', error);
            toast.error('Failed to remove pages. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '900px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="Remove Pages from PDF - Delete Unwanted Pages"
                description="Select and delete unwanted, duplicate, or blank pages from any PDF document locally in your browser."
            />
            <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.5rem', textAlign: 'center', wordBreak: 'break-word' }}>
                Remove PDF Pages
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                Visually select pages to permanently remove and generate a clean, trimmed PDF.
            </p>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".pdf,application/pdf"
                        label="Upload PDF to Delete Pages"
                        maxSizeMB={100}
                    />
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
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pageCount} total pages detected</p>
                            </div>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setResultPdfUrl(null);
                                }}
                                className="glass-btn-secondary"
                                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            >
                                Change PDF
                            </button>
                        </div>

                        {/* Range Input & Helper Buttons */}
                        <div style={{ marginBottom: '1.5rem', width: '100%', minWidth: 0 }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                Pages to Delete (e.g. 1, 3-5):
                            </label>
                            <input
                                type="text"
                                value={rangeInput}
                                onChange={(e) => handleRangeInputChange(e.target.value)}
                                placeholder="Click thumbnails below or type page numbers..."
                                className="glass-input"
                                style={{ width: '100%', padding: '0.65rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                            />

                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button type="button" onClick={selectFirstPage} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                                    First Page
                                </button>
                                <button type="button" onClick={selectLastPage} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                                    Last Page
                                </button>
                                <button type="button" onClick={selectOddPages} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                                    Odd Pages
                                </button>
                                <button type="button" onClick={selectEvenPages} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                                    Even Pages
                                </button>
                                <button type="button" onClick={clearAll} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    <FaSquare /> Clear Selection
                                </button>
                            </div>
                        </div>

                        {/* Visual Thumbnail Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 110px), 1fr))',
                            gap: '0.75rem',
                            maxHeight: '380px',
                            overflowY: 'auto',
                            padding: '0.75rem',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'rgba(0, 0, 0, 0.15)',
                            marginBottom: '1.75rem',
                            boxSizing: 'border-box'
                        }}>
                            {previews.map((preview, index) => {
                                const isMarkedForDeletion = selectedPages.has(index);
                                return (
                                    <div
                                        key={index}
                                        onClick={() => togglePageSelection(index)}
                                        style={{
                                            border: isMarkedForDeletion ? '2px solid #ef4444' : '1px solid var(--glass-border)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '0.45rem',
                                            backgroundColor: isMarkedForDeletion ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                            opacity: isMarkedForDeletion ? 0.65 : 1
                                        }}
                                    >
                                        <div style={{ position: 'absolute', top: '6px', right: '6px', color: isMarkedForDeletion ? '#ef4444' : 'var(--text-muted)' }}>
                                            {isMarkedForDeletion ? <FaTimesCircle /> : <FaSquare />}
                                        </div>
                                        <img
                                            src={preview}
                                            alt={`Page ${index + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '100px',
                                                objectFit: 'contain',
                                                backgroundColor: '#ffffff',
                                                borderRadius: 'var(--radius-sm)',
                                                marginBottom: '0.35rem'
                                            }}
                                        />
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isMarkedForDeletion ? '#ef4444' : 'inherit' }}>
                                            {isMarkedForDeletion ? `Delete P.${index + 1}` : `Page ${index + 1}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action Buttons & Results */}
                        {resultPdfUrl ? (
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
                                        ✓ Removed {selectedPages.size} Pages ({pageCount - selectedPages.size} pages remaining)
                                    </span>
                                </div>
                                <a
                                    href={resultPdfUrl}
                                    download={`trimmed-${file.name}`}
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
                                    <FaDownload /> Download Trimmed PDF
                                </a>
                            </div>
                        ) : (
                            <button
                                onClick={handleRemovePages}
                                disabled={isProcessing || selectedPages.size === 0 || selectedPages.size >= pageCount}
                                className="glass-btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    boxShadow: '0 0 20px -3px rgba(239, 68, 68, 0.5)',
                                    opacity: isProcessing || selectedPages.size === 0 || selectedPages.size >= pageCount ? 0.6 : 1
                                }}
                            >
                                <FaTrash />
                                {isProcessing ? 'Removing Pages...' : `Delete ${selectedPages.size} Selected Page${selectedPages.size > 1 ? 's' : ''}`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { FaDownload, FaCut, FaCheckSquare, FaSquare, FaExchangeAlt, FaFileArchive } from 'react-icons/fa';
import { SEO } from '../../components/SEO';

export const PdfSplit = () => {
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number>(0);
    const [rangeInput, setRangeInput] = useState('');
    const [previews, setPreviews] = useState<string[]>([]);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [splitPdfUrl, setSplitPdfUrl] = useState<string | null>(null);
    const [zipDownloadUrl, setZipDownloadUrl] = useState<string | null>(null);
    const [exportMode, setExportMode] = useState<'single' | 'individual'>('single');
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
            setSplitPdfUrl(null);
            setZipDownloadUrl(null);
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

    const selectAll = () => {
        const all = new Set<number>();
        for (let i = 0; i < pageCount; i++) all.add(i);
        setSelectedPages(all);
        setRangeInput(`1-${pageCount}`);
    };

    const clearAll = () => {
        setSelectedPages(new Set());
        setRangeInput('');
    };

    const invertSelection = () => {
        const inverted = new Set<number>();
        for (let i = 0; i < pageCount; i++) {
            if (!selectedPages.has(i)) inverted.add(i);
        }
        setSelectedPages(inverted);
        const sorted = Array.from(inverted).sort((a, b) => a - b);
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

    const handleSplit = async () => {
        if (!file || selectedPages.size === 0) {
            toast.error('Please select at least one page to extract');
            return;
        }

        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const srcDoc = await PDFDocument.load(arrayBuffer);
            const indices = Array.from(selectedPages).sort((a, b) => a - b);

            if (exportMode === 'single') {
                const newDoc = await PDFDocument.create();
                const copiedPages = await newDoc.copyPages(srcDoc, indices);
                copiedPages.forEach(p => newDoc.addPage(p));

                const pdfBytes = await newDoc.save({ useObjectStreams: false });
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                setSplitPdfUrl(URL.createObjectURL(blob));
                toast.success(`Extracted ${indices.length} pages into a single PDF!`);
            } else {
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();
                const originalName = file.name.replace(/\.[^/.]+$/, '');

                for (let i = 0; i < indices.length; i++) {
                    const pageIndex = indices[i];
                    const singleDoc = await PDFDocument.create();
                    const [copied] = await singleDoc.copyPages(srcDoc, [pageIndex]);
                    singleDoc.addPage(copied);
                    const bytes = await singleDoc.save({ useObjectStreams: false });
                    zip.file(`${originalName}-page-${pageIndex + 1}.pdf`, bytes);
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                setZipDownloadUrl(URL.createObjectURL(zipBlob));
                toast.success(`Created ZIP with ${indices.length} individual PDF files!`);
            }
        } catch (error) {
            console.error('Error splitting PDF:', error);
            toast.error('Failed to split PDF. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '900px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <SEO
                title="Split PDF - Extract Pages or Split by Ranges"
                description="Split PDF pages by range, select odd/even pages, or extract individual pages to a ZIP archive locally."
            />
            <h1 className="text-gradient" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.5rem', textAlign: 'center', wordBreak: 'break-word' }}>
                Split & Extract PDF Pages
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                Extract specific pages, page ranges, or split entire documents with instant visual selection.
            </p>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".pdf,application/pdf"
                        label="Upload PDF to Split"
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
                                    setSplitPdfUrl(null);
                                    setZipDownloadUrl(null);
                                }}
                                className="glass-btn-secondary"
                                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            >
                                Change PDF
                            </button>
                        </div>

                        {/* Export Mode Toggle */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            padding: '0.35rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem',
                            width: 'fit-content',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                type="button"
                                onClick={() => { setExportMode('single'); setSplitPdfUrl(null); setZipDownloadUrl(null); }}
                                className={exportMode === 'single' ? 'glass-btn-primary' : 'glass-btn-secondary'}
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            >
                                Single Combined PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => { setExportMode('individual'); setSplitPdfUrl(null); setZipDownloadUrl(null); }}
                                className={exportMode === 'individual' ? 'glass-btn-primary' : 'glass-btn-secondary'}
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            >
                                Individual PDFs (ZIP)
                            </button>
                        </div>

                        {/* Range Input & Helper Buttons */}
                        <div style={{ marginBottom: '1.5rem', width: '100%', minWidth: 0 }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                Selected Page Range (e.g. 1-3, 5, 8-10):
                            </label>
                            <input
                                type="text"
                                value={rangeInput}
                                onChange={(e) => handleRangeInputChange(e.target.value)}
                                placeholder={`1-${pageCount}`}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.65rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                            />

                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button type="button" onClick={selectAll} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                                    <FaCheckSquare /> All Pages
                                </button>
                                <button type="button" onClick={selectOddPages} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                                    Odd Pages
                                </button>
                                <button type="button" onClick={selectEvenPages} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                                    Even Pages
                                </button>
                                <button type="button" onClick={invertSelection} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}>
                                    <FaExchangeAlt /> Invert
                                </button>
                                <button type="button" onClick={clearAll} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    <FaSquare /> Clear
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
                                const isSelected = selectedPages.has(index);
                                return (
                                    <div
                                        key={index}
                                        onClick={() => togglePageSelection(index)}
                                        style={{
                                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--glass-border)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '0.45rem',
                                            backgroundColor: isSelected ? 'rgba(255, 42, 68, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', top: '6px', right: '6px', color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                                            {isSelected ? <FaCheckSquare /> : <FaSquare />}
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
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                            Page {index + 1}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action Buttons & Results */}
                        {splitPdfUrl ? (
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
                                        ✓ Extracted {selectedPages.size} Pages Successfully
                                    </span>
                                </div>
                                <a
                                    href={splitPdfUrl}
                                    download={`extracted-${file.name}`}
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
                                    <FaDownload /> Download Extracted PDF
                                </a>
                            </div>
                        ) : zipDownloadUrl ? (
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
                                        ✓ Created {selectedPages.size} Standalone PDFs
                                    </span>
                                </div>
                                <a
                                    href={zipDownloadUrl}
                                    download={`split-${file.name.replace(/\.[^/.]+$/, '')}.zip`}
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
                                    <FaFileArchive /> Download All PDFs (ZIP)
                                </a>
                            </div>
                        ) : (
                            <button
                                onClick={handleSplit}
                                disabled={isProcessing || selectedPages.size === 0}
                                className="glass-btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    opacity: isProcessing || selectedPages.size === 0 ? 0.6 : 1
                                }}
                            >
                                <FaCut />
                                {isProcessing ? 'Processing PDF Split...' : `Extract ${selectedPages.size} Selected Page${selectedPages.size > 1 ? 's' : ''}`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

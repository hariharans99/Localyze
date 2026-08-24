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

    const handleSplit = async () => {
        if (!file || !rangeInput.trim()) return;

        const indicesToKeep = parsePageRanges(rangeInput, pageCount);

        if (indicesToKeep.length === 0) {
            toast.error('Invalid page range. Please check your input.');
            return;
        }

        setIsProcessing(true);
        setSplitPdfUrl(null);
        setZipDownloadUrl(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const srcPdf = await PDFDocument.load(arrayBuffer);

            if (exportMode === 'single') {
                // Merge all selected into 1 PDF
                const newPdf = await PDFDocument.create();
                const copiedPages = await newPdf.copyPages(srcPdf, indicesToKeep);
                copiedPages.forEach(page => newPdf.addPage(page));

                const pdfBytes = await newPdf.save({ useObjectStreams: false, addDefaultPage: false });
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                setSplitPdfUrl(URL.createObjectURL(blob));
                toast.success(`Extracted ${indicesToKeep.length} pages into one PDF!`);
            } else {
                // ZIP of individual PDFs
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();

                for (let idx of indicesToKeep) {
                    const singleDoc = await PDFDocument.create();
                    const [copiedPage] = await singleDoc.copyPages(srcPdf, [idx]);
                    singleDoc.addPage(copiedPage);
                    const bytes = await singleDoc.save({ useObjectStreams: false, addDefaultPage: false });
                    zip.file(`page-${idx + 1}.pdf`, bytes);
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                setZipDownloadUrl(URL.createObjectURL(zipBlob));
                toast.success(`Created ZIP with ${indicesToKeep.length} individual page PDFs!`);
            }
        } catch (error) {
            console.error('Error splitting PDF:', error);
            toast.error('Failed to split PDF.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '950px' }}>
            <SEO
                title="Split PDF Pages - Extract Single or Multiple PDF Pages"
                description="Extract specific pages or ranges from PDF documents. Batch select even/odd pages, or export pages individually as a ZIP."
            />
            <h1 className="text-gradient" style={{ fontSize: '2.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                Precision PDF Splitter
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                Extract, re-bundle, or separate individual PDF pages with 1-click batch selection shortcuts.
            </p>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".pdf,application/pdf"
                        label="Upload PDF to Split"
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
                                    {pageCount} total pages • {selectedPages.size} pages selected
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setSplitPdfUrl(null);
                                    setZipDownloadUrl(null);
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

                        {/* Export Mode Toggle */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            padding: '0.35rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem',
                            width: 'fit-content'
                        }}>
                            <button
                                type="button"
                                onClick={() => setExportMode('single')}
                                className={exportMode === 'single' ? 'glass-btn-primary' : 'glass-btn-secondary'}
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            >
                                Combine Selected into 1 PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => setExportMode('individual')}
                                className={exportMode === 'individual' ? 'glass-btn-primary' : 'glass-btn-secondary'}
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            >
                                Separate Pages (ZIP File)
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
                                <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    Page Range or Expression
                                </label>
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={selectAll} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        <FaCheckSquare /> All
                                    </button>
                                    <button type="button" onClick={clearAll} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        <FaSquare /> Clear
                                    </button>
                                    <button type="button" onClick={invertSelection} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        <FaExchangeAlt /> Invert
                                    </button>
                                    <button type="button" onClick={selectOddPages} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        Odd Pages
                                    </button>
                                    <button type="button" onClick={selectEvenPages} className="glass-btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                                        Even Pages
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
                                    Click Pages to Toggle Selection:
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
                                                border: selectedPages.has(idx) ? '3px solid var(--color-primary)' : '1px solid var(--glass-border)',
                                                borderRadius: 'var(--radius-md)',
                                                overflow: 'hidden',
                                                opacity: selectedPages.has(idx) ? 1 : 0.6,
                                                transform: selectedPages.has(idx) ? 'scale(1.03)' : 'scale(1)',
                                                transition: 'all 0.2s',
                                                boxShadow: selectedPages.has(idx) ? '0 0 15px rgba(0, 210, 255, 0.3)' : 'none',
                                                backgroundColor: '#ffffff'
                                            }}
                                        >
                                            <img src={src} alt={`Page ${idx + 1}`} style={{ width: '100%', display: 'block' }} />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                background: selectedPages.has(idx) ? 'var(--color-primary)' : 'rgba(0,0,0,0.7)',
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
                                                    top: '4px',
                                                    right: '4px',
                                                    color: '#ffffff',
                                                    backgroundColor: 'var(--color-primary)',
                                                    borderRadius: '50%',
                                                    width: '20px',
                                                    height: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                }}>✓</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleSplit}
                            disabled={isProcessing || !rangeInput.trim()}
                            className="glass-btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1rem',
                                opacity: isProcessing || !rangeInput.trim() ? 0.5 : 1
                            }}
                        >
                            {isProcessing ? 'Processing...' : (
                                <>
                                    <FaCut /> {exportMode === 'single' ? `Extract ${selectedPages.size} Pages to PDF` : `Extract ${selectedPages.size} Pages as ZIP`}
                                </>
                            )}
                        </button>

                        {/* Single Download Link */}
                        {splitPdfUrl && (
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
                                        ✓ PDF Extracted Successfully!
                                    </span>
                                </div>
                                <a
                                    href={splitPdfUrl}
                                    download={`split-${file.name}`}
                                    className="glass-btn-primary"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                        padding: '0.85rem 1.75rem',
                                        fontSize: '1rem',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <FaDownload /> Download Extracted PDF
                                </a>
                            </div>
                        )}

                        {/* ZIP Download Link */}
                        {zipDownloadUrl && (
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
                                        ✓ ZIP Archive Ready!
                                    </span>
                                </div>
                                <a
                                    href={zipDownloadUrl}
                                    download={`pages-${file.name.replace('.pdf', '')}.zip`}
                                    className="glass-btn-primary"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                        padding: '0.85rem 1.75rem',
                                        fontSize: '1rem',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <FaFileArchive /> Download Individual Pages (ZIP)
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

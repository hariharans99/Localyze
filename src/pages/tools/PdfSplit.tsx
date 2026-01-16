import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCut } from 'react-icons/fa';

export const PdfSplit = () => {
    const { checkLimit, incrementUsage } = useUser();
    const toast = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number>(0);
    const [rangeInput, setRangeInput] = useState('');
    const [splitPdfUrl, setSplitPdfUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = async (selectedFile: File | File[]) => {
        const fileToLoad = Array.isArray(selectedFile) ? selectedFile[0] : selectedFile;
        if (fileToLoad.type !== 'application/pdf') {
            toast.error('Please upload a valid PDF file');
            return;
        }

        try {
            const arrayBuffer = await fileToLoad.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            setPageCount(pdf.getPageCount());
            setFile(fileToLoad);
            setSplitPdfUrl(null);
            setRangeInput(''); // Reset input
        } catch (error) {
            console.error('Error loading PDF:', error);
            toast.error('Failed to load PDF info');
        }
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

    const handleSplit = async () => {
        if (!file || !rangeInput.trim()) return;

        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        const indicesToKeep = parsePageRanges(rangeInput, pageCount);

        if (indicesToKeep.length === 0) {
            toast.error('Invalid page range. Please check your input.');
            return;
        }

        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const srcPdf = await PDFDocument.load(arrayBuffer);
            const newPdf = await PDFDocument.create();

            const copiedPages = await newPdf.copyPages(srcPdf, indicesToKeep);
            copiedPages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setSplitPdfUrl(url);
            await incrementUsage('pdf_split');
            toast.success('PDF split successfully!');
        } catch (error) {
            console.error('Error splitting PDF:', error);
            toast.error('Failed to split PDF.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Split PDF Pages
            </h1>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".pdf,application/pdf"
                        label="Upload PDF to Split"
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
                                    setSplitPdfUrl(null);
                                    setRangeInput('');
                                }}
                                style={{ color: '#ef4444', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Change File
                            </button>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                Enter Page Numbers to Extract
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

                        <button
                            onClick={handleSplit}
                            disabled={isProcessing || !rangeInput.trim()}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                backgroundColor: isProcessing || !rangeInput.trim() ? 'var(--bg-surface-hover)' : 'var(--color-primary)',
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
                                    <FaCut /> Extract Pages
                                </>
                            )}
                        </button>

                        {splitPdfUrl && (
                            <div style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ marginBottom: '1rem', color: '#10b981' }}>Pages Extracted Successfully!</h3>
                                <a
                                    href={splitPdfUrl}
                                    download={`split-${file.name}`}
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
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How to Split PDF</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload</strong>: Select the PDF file you want to split.</li>
                    <li><strong>Define Range</strong>: Type the page numbers you want to keep.
                        <ul style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <li>Single pages: <code>1, 5, 8</code></li>
                            <li>Ranges: <code>1-5</code> or <code>10-15</code></li>
                            <li>Mixed: <code>1-3, 5, 8-10</code></li>
                        </ul>
                    </li>
                    <li><strong>Extract</strong>: Click the button to create a new PDF with only your selected pages.</li>
                </ol>
            </div>

            <AdBanner />
        </div>
    );
};

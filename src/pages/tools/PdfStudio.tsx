import { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FileUploader } from '../../components/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import {
    FaDownload,
    FaTrash,
    FaSyncAlt,
    FaArrowLeft,
    FaArrowRight,
    FaPlus,
    FaFilePdf,
    FaCheckSquare,
    FaSquare,
    FaExchangeAlt,
    FaFileArchive,
    FaLayerGroup
} from 'react-icons/fa';
import { SEO } from '../../components/SEO';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PageItem {
    id: string; // unique id
    sourceFileId: string;
    sourceFileName: string;
    pageIndex: number; // 0-based page index in original file
    thumbnail: string;
    rotation: number; // 0, 90, 180, 270 degrees
    isSelected: boolean;
}

interface SourceFile {
    id: string;
    file: File;
    numPages: number;
}

export const PdfStudio = () => {
    const toast = useToast();
    const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportResultUrl, setExportResultUrl] = useState<string | null>(null);
    const [zipResultUrl, setZipResultUrl] = useState<string | null>(null);
    const [exportMode, setExportMode] = useState<'all' | 'selected'>('all');

    const handleFileSelect = async (selectedFiles: File | File[]) => {
        const filesToAdd = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        const validPdfs = filesToAdd.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));

        if (validPdfs.length === 0) {
            toast.error('Please upload valid PDF files');
            return;
        }

        setIsLoading(true);
        setExportResultUrl(null);
        setZipResultUrl(null);

        try {
            const newSourceFiles: SourceFile[] = [];
            const newPageItems: PageItem[] = [];

            for (const file of validPdfs) {
                const fileId = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const numPages = pdfDoc.numPages;

                newSourceFiles.push({
                    id: fileId,
                    file,
                    numPages
                });

                for (let i = 1; i <= numPages; i++) {
                    try {
                        const page = await pdfDoc.getPage(i);
                        const viewport = page.getViewport({ scale: 0.28 });

                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d');

                        if (ctx) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            await page.render({ canvasContext: ctx, viewport } as any).promise;
                            const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

                            newPageItems.push({
                                id: `${fileId}-p${i}`,
                                sourceFileId: fileId,
                                sourceFileName: file.name,
                                pageIndex: i - 1,
                                thumbnail,
                                rotation: 0,
                                isSelected: true
                            });
                        }
                    } catch (err) {
                        console.error('Error rendering thumbnail for page', i, err);
                    }
                }
            }

            setSourceFiles(prev => [...prev, ...newSourceFiles]);
            setPages(prev => [...prev, ...newPageItems]);
            toast.success(`Loaded ${newPageItems.length} pages into PDF Studio`);
        } catch (e) {
            console.error('PDF Studio loading error:', e);
            toast.error('Failed to load PDF files');
        } finally {
            setIsLoading(false);
        }
    };

    const rotatePage = (pageId: string) => {
        setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                return { ...p, rotation: (p.rotation + 90) % 360 };
            }
            return p;
        }));
    };

    const deletePage = (pageId: string) => {
        setPages(prev => prev.filter(p => p.id !== pageId));
        setExportResultUrl(null);
    };

    const movePage = (index: number, direction: 'left' | 'right') => {
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= pages.length) return;

        setPages(prev => {
            const arr = [...prev];
            [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
            return arr;
        });
        setExportResultUrl(null);
    };

    const toggleSelect = (pageId: string) => {
        setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                return { ...p, isSelected: !p.isSelected };
            }
            return p;
        }));
    };

    const selectAll = () => {
        setPages(prev => prev.map(p => ({ ...p, isSelected: true })));
    };

    const clearSelection = () => {
        setPages(prev => prev.map(p => ({ ...p, isSelected: false })));
    };

    const invertSelection = () => {
        setPages(prev => prev.map(p => ({ ...p, isSelected: !p.isSelected })));
    };

    const handleExportMasterPdf = async () => {
        const pagesToExport = exportMode === 'selected' ? pages.filter(p => p.isSelected) : pages;

        if (pagesToExport.length === 0) {
            toast.error('No pages selected to export');
            return;
        }

        setIsExporting(true);
        setExportResultUrl(null);
        setZipResultUrl(null);

        try {
            // Load all source PDF documents into memory map
            const loadedSourceDocs = new Map<string, PDFDocument>();

            for (const sf of sourceFiles) {
                const buffer = await sf.file.arrayBuffer();
                const doc = await PDFDocument.load(buffer);
                loadedSourceDocs.set(sf.id, doc);
            }

            // Create Master Document
            const masterPdf = await PDFDocument.create();

            for (const pageItem of pagesToExport) {
                const srcDoc = loadedSourceDocs.get(pageItem.sourceFileId);
                if (!srcDoc) continue;

                const [copiedPage] = await masterPdf.copyPages(srcDoc, [pageItem.pageIndex]);

                // Apply rotation if any
                if (pageItem.rotation > 0) {
                    const currentRotation = copiedPage.getRotation().angle;
                    copiedPage.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
                }

                masterPdf.addPage(copiedPage);
            }

            const pdfBytes = await masterPdf.save({ useObjectStreams: false, addDefaultPage: false });
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            setExportResultUrl(URL.createObjectURL(blob));
            toast.success(`Successfully generated Master PDF (${pagesToExport.length} pages)!`);
        } catch (error) {
            console.error('PDF export error:', error);
            toast.error('Failed to export master PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportZip = async () => {
        const pagesToExport = exportMode === 'selected' ? pages.filter(p => p.isSelected) : pages;

        if (pagesToExport.length === 0) {
            toast.error('No pages selected to export');
            return;
        }

        setIsExporting(true);
        setZipResultUrl(null);

        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            const loadedSourceDocs = new Map<string, PDFDocument>();
            for (const sf of sourceFiles) {
                const buffer = await sf.file.arrayBuffer();
                const doc = await PDFDocument.load(buffer);
                loadedSourceDocs.set(sf.id, doc);
            }

            for (let i = 0; i < pagesToExport.length; i++) {
                const pageItem = pagesToExport[i];
                const srcDoc = loadedSourceDocs.get(pageItem.sourceFileId);
                if (!srcDoc) continue;

                const singleDoc = await PDFDocument.create();
                const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageItem.pageIndex]);

                if (pageItem.rotation > 0) {
                    const currentRotation = copiedPage.getRotation().angle;
                    copiedPage.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
                }

                singleDoc.addPage(copiedPage);
                const bytes = await singleDoc.save({ useObjectStreams: false, addDefaultPage: false });
                zip.file(`page-${i + 1}-${pageItem.sourceFileName.replace('.pdf', '')}.pdf`, bytes);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            setZipResultUrl(URL.createObjectURL(zipBlob));
            toast.success(`Created ZIP with ${pagesToExport.length} standalone page PDFs!`);
        } catch (e) {
            console.error('ZIP export error:', e);
            toast.error('Failed to create ZIP package');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1150px' }}>
            <SEO
                title="All-in-One PDF Studio - Organize, Merge, Rotate, Split & Delete"
                description="Visual PDF organizer studio. Merge multiple documents, reorder pages, rotate sideways scans, remove unwanted pages, and export in 1 click."
            />

            <h1 className="text-gradient" style={{ fontSize: '2.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                All-in-One PDF Studio
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                Merge, rearrange, rotate, delete, and split multiple PDF documents visually in a single unified workspace.
            </p>

            {isLoading ? (
                <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
                    <div className="spinner" style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: 'var(--color-primary)',
                        borderRadius: '50%',
                        margin: '0 auto 1.5rem auto',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Loading & Parsing PDF Pages...</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Extracting high-resolution thumbnails for visual editing</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : pages.length === 0 ? (
                <FileUploader
                    onFileSelect={handleFileSelect}
                    accept=".pdf,application/pdf"
                    label="Upload PDF Files to Open Studio (Select One or Multiple)"
                    multiple={true}
                    maxSizeMB={100}
                />
            ) : (
                <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', borderRadius: 'var(--radius-xl)' }}>
                    {/* Top Control Bar */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.75rem',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        paddingBottom: '1.25rem'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <FaLayerGroup style={{ color: 'var(--color-primary)' }} />
                                {pages.length} Pages • {sourceFiles.length} Source Document{sourceFiles.length > 1 ? 's' : ''}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {pages.filter(p => p.isSelected).length} of {pages.length} pages selected
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                onClick={() => document.getElementById('studio-add-files')?.click()}
                                className="glass-btn-primary"
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            >
                                <FaPlus /> Add More PDFs
                            </button>
                            <input
                                id="studio-add-files"
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
                                style={{ display: 'none' }}
                            />

                            <button
                                onClick={() => {
                                    setPages([]);
                                    setSourceFiles([]);
                                    setExportResultUrl(null);
                                    setZipResultUrl(null);
                                }}
                                className="glass-btn-secondary"
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            >
                                Reset Studio
                            </button>
                        </div>
                    </div>

                    {/* Batch Selection & Export Configuration */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.75rem',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        padding: '1rem 1.25rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: '0.35rem' }}>Selection:</span>
                            <button type="button" onClick={selectAll} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                                <FaCheckSquare /> Select All
                            </button>
                            <button type="button" onClick={clearSelection} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                                <FaSquare /> Deselect All
                            </button>
                            <button type="button" onClick={invertSelection} className="glass-btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                                <FaExchangeAlt /> Invert
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Export Scope:</span>
                            <select
                                value={exportMode}
                                onChange={(e) => setExportMode(e.target.value as any)}
                                className="glass-input"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                            >
                                <option value="all">All {pages.length} Pages</option>
                                <option value="selected">Selected ({pages.filter(p => p.isSelected).length}) Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Interactive Thumbnail Visual Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                        gap: '1.25rem',
                        maxHeight: '620px',
                        overflowY: 'auto',
                        padding: '1rem',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        marginBottom: '2rem'
                    }}>
                        {pages.map((page, index) => (
                            <div
                                key={page.id}
                                style={{
                                    borderRadius: 'var(--radius-lg)',
                                    border: page.isSelected ? '2px solid var(--color-primary)' : '1px solid var(--glass-border)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    boxShadow: page.isSelected ? '0 0 16px -2px rgba(255, 42, 68, 0.4)' : 'none',
                                    padding: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    position: 'relative',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Top Badge & Checkbox */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(255, 42, 68, 0.15)',
                                        color: 'var(--color-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 700
                                    }}>
                                        {index + 1}
                                    </span>

                                    <input
                                        type="checkbox"
                                        checked={page.isSelected}
                                        onChange={() => toggleSelect(page.id)}
                                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                    />
                                </div>

                                {/* Thumbnail Box with live rotation */}
                                <div
                                    onClick={() => toggleSelect(page.id)}
                                    style={{
                                        height: '160px',
                                        backgroundColor: '#ffffff',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <img
                                        src={page.thumbnail}
                                        alt={`Page ${index + 1}`}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                            transform: `rotate(${page.rotation}deg)`,
                                            transition: 'transform 0.25s ease'
                                        }}
                                    />
                                </div>

                                {/* Source File Info */}
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center'
                                }}>
                                    {page.sourceFileName}
                                    {page.rotation > 0 && <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}> • {page.rotation}°</span>}
                                </div>

                                {/* Actions Toolbar: Move Left, Rotate, Delete, Move Right */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingTop: '0.35rem',
                                    borderTop: '1px solid var(--border-subtle)'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => movePage(index, 'left')}
                                        disabled={index === 0}
                                        style={{
                                            color: index === 0 ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)',
                                            padding: '0.3rem',
                                            cursor: index === 0 ? 'not-allowed' : 'pointer'
                                        }}
                                        title="Move Left"
                                    >
                                        <FaArrowLeft style={{ fontSize: '0.8rem' }} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => rotatePage(page.id)}
                                        style={{
                                            color: 'var(--color-primary)',
                                            padding: '0.3rem',
                                            background: 'rgba(255, 42, 68, 0.1)',
                                            borderRadius: 'var(--radius-sm)'
                                        }}
                                        title="Rotate 90° Clockwise"
                                    >
                                        <FaSyncAlt style={{ fontSize: '0.8rem' }} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => deletePage(page.id)}
                                        style={{
                                            color: '#ef4444',
                                            padding: '0.3rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            borderRadius: 'var(--radius-sm)'
                                        }}
                                        title="Delete Page"
                                    >
                                        <FaTrash style={{ fontSize: '0.8rem' }} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => movePage(index, 'right')}
                                        disabled={index === pages.length - 1}
                                        style={{
                                            color: index === pages.length - 1 ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)',
                                            padding: '0.3rem',
                                            cursor: index === pages.length - 1 ? 'not-allowed' : 'pointer'
                                        }}
                                        title="Move Right"
                                    >
                                        <FaArrowRight style={{ fontSize: '0.8rem' }} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Export Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleExportMasterPdf}
                            disabled={isExporting || pages.length === 0}
                            className="glass-btn-primary"
                            style={{
                                flex: 2,
                                minWidth: '220px',
                                padding: '1rem',
                                fontSize: '1rem',
                                opacity: isExporting ? 0.6 : 1
                            }}
                        >
                            <FaFilePdf />
                            {isExporting ? 'Compiling Master PDF...' : `Export Master PDF (${exportMode === 'selected' ? pages.filter(p => p.isSelected).length : pages.length} Pages)`}
                        </button>

                        <button
                            onClick={handleExportZip}
                            disabled={isExporting || pages.length === 0}
                            className="glass-btn-secondary"
                            style={{
                                flex: 1,
                                minWidth: '180px',
                                padding: '1rem',
                                fontSize: '1rem',
                                opacity: isExporting ? 0.6 : 1
                            }}
                        >
                            <FaFileArchive /> Export Individual Pages (ZIP)
                        </button>
                    </div>

                    {/* Master PDF Download Box */}
                    {exportResultUrl && (
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
                                    ✓ Master PDF Compiled Successfully!
                                </span>
                            </div>
                            <a
                                href={exportResultUrl}
                                download="master-organized-document.pdf"
                                className="glass-btn-primary"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                    padding: '0.85rem 1.75rem',
                                    fontSize: '1rem',
                                    textDecoration: 'none'
                                }}
                            >
                                <FaDownload /> Download Organized Master PDF
                            </a>
                        </div>
                    )}

                    {/* ZIP Archive Download Box */}
                    {zipResultUrl && (
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
                                    ✓ Individual Pages Archived!
                                </span>
                            </div>
                            <a
                                href={zipResultUrl}
                                download="organized-pages-archive.zip"
                                className="glass-btn-primary"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 0 20px -3px rgba(16, 185, 129, 0.5)',
                                    padding: '0.85rem 1.75rem',
                                    fontSize: '1rem',
                                    textDecoration: 'none'
                                }}
                            >
                                <FaFileArchive /> Download ZIP Package
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

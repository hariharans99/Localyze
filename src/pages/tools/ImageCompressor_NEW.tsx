import { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCog, FaRedo, FaTrash, FaFileArchive } from 'react-icons/fa';
import JSZip from 'jszip';
import { SEO } from '../../components/SEO';
import { compressImage, type CompressionOptions, type CompressionResult } from '../../utils/imageCompression';

interface ProcessedFile {
    file: File;
    status: 'pending' | 'processing' | 'done' | 'error';
    result?: CompressionResult;
    progress?: {
        iteration: number;
        currentSize: number;
        quality: number;
    };
}

export const ImageCompressor = () => {
    const { checkLimit, incrementUsage, profile } = useUser();
    const toast = useToast();

    // State
    const [files, setFiles] = useState<ProcessedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Compression Settings
    const [targetSize, setTargetSize] = useState(1);
    const [unit, setUnit] = useState<'MB' | 'KB'>('MB');
    const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');
    const [preserveDimensions, setPreserveDimensions] = useState(true);
    const [maxWidth, setMaxWidth] = useState<number>(0);
    const [maxHeight, setMaxHeight] = useState<number>(0);

    // Helpers
    const getFormattedSize = (bytes: number) => {
        const kb = bytes / 1024;
        const mb = kb / 1024;
        return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
    };

    const handleFileSelect = (selectedFiles: File | File[]) => {
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        const isFreeUser = !profile || profile.plan === 'free';

        // For free users, limit to 2 images
        if (isFreeUser) {
            const totalFiles = files.length + newFiles.length;
            if (totalFiles > 2) {
                toast.error(`Free tier limited to 2 images per compression. You can only add ${Math.max(0, 2 - files.length)} more image(s).`);
                const allowedCount = Math.max(0, 2 - files.length);
                const limitedFiles = newFiles.slice(0, allowedCount);
                if (limitedFiles.length === 0) return;

                const processedFiles: ProcessedFile[] = limitedFiles.map(f => ({
                    file: f,
                    status: 'pending'
                }));
                setFiles(prev => [...prev, ...processedFiles]);
                return;
            }
        }

        const processedFiles: ProcessedFile[] = newFiles.map(f => ({
            file: f,
            status: 'pending'
        }));
        setFiles(prev => [...prev, ...processedFiles]);
    };

    const removeFile = (fileName: string) => {
        setFiles(prev => prev.filter(f => f.file.name !== fileName));
    };

    const handleReset = () => {
        setFiles([]);
        setTargetSize(1);
        setUnit('MB');
        setFormat('image/jpeg');
        setPreserveDimensions(true);
        setMaxWidth(0);
        setMaxHeight(0);
    };

    const compressSingleFile = async (processedFile: ProcessedFile) => {
        // Update status to processing
        setFiles(prev => prev.map(f =>
            f.file.name === processedFile.file.name
                ? { ...f, status: 'processing' as const }
                : f
        ));

        try {
            const targetSizeKB = unit === 'KB' ? targetSize : targetSize * 1024;

            const options: CompressionOptions = {
                targetSizeKB,
                format,
                preserveDimensions,
                maxWidth: maxWidth > 0 ? maxWidth : undefined,
                maxHeight: maxHeight > 0 ? maxHeight : undefined,
                maxIterations: 15
            };

            const result = await compressImage(
                processedFile.file,
                options,
                (iteration, currentSize, quality) => {
                    // Update progress
                    setFiles(prev => prev.map(f =>
                        f.file.name === processedFile.file.name
                            ? { ...f, progress: { iteration, currentSize, quality } }
                            : f
                    ));
                }
            );

            // Update with result
            setFiles(prev => prev.map(f =>
                f.file.name === processedFile.file.name
                    ? { ...f, status: 'done' as const, result, progress: undefined }
                    : f
            ));

            await incrementUsage('compress');
        } catch (error) {
            console.error('Compression error:', error);
            setFiles(prev => prev.map(f =>
                f.file.name === processedFile.file.name
                    ? { ...f, status: 'error' as const, progress: undefined }
                    : f
            ));
            toast.error(`Failed to compress ${processedFile.file.name}`);
        }
    };

    const handleCompressAll = async () => {
        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        const isFreeUser = !profile || profile.plan === 'free';
        const pendingFiles = files.filter(f => f.status === 'pending');
        const filesToProcess = isFreeUser ? pendingFiles.slice(0, 2) : pendingFiles;

        if (isFreeUser && pendingFiles.length > 2) {
            toast.error(`Free tier can only process 2 images. Processing first 2 only.`);
        }

        setIsProcessing(true);

        for (const file of filesToProcess) {
            await compressSingleFile(file);
        }

        setIsProcessing(false);
        toast.success(`Compression complete!`);
    };

    const handleDownloadAll = async () => {
        const completedFiles = files.filter(f => f.status === 'done' && f.result);
        if (completedFiles.length === 0) return;

        const zip = new JSZip();
        completedFiles.forEach(({ file, result }) => {
            if (result) {
                const ext = format.split('/')[1];
                zip.file(`compressed-${file.name.replace(/\.[^/.]+$/, '')}.${ext}`, result.blob);
            }
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "compressed-images.zip";
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadSingle = (processedFile: ProcessedFile) => {
        if (!processedFile.result) return;

        const ext = format.split('/')[1];
        const url = URL.createObjectURL(processedFile.result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed-${processedFile.file.name.replace(/\.[^/.]+$/, '')}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container" style={{ maxWidth: '900px' }}>
            <SEO
                title="Image Compressor - Precise Size Control"
                description="Compress images to exact file sizes. Choose JPEG, WebP, or PNG for your quality needs."
            />
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Image Size Reducer
            </h1>

            <AdBanner style={{ marginBottom: '2rem' }} />

            <div style={{ marginBottom: '2rem' }}>
                {files.length === 0 ? (
                    <>
                        <FileUploader
                            onFileSelect={handleFileSelect}
                            accept="image/*"
                            label="Upload Images to Compress"
                            multiple={true}
                        />
                        {(!profile || profile.plan === 'free') && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem 1rem',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                color: '#f59e0b',
                                fontSize: '0.9rem',
                                textAlign: 'center'
                            }}>
                                ⚠️ Free tier: Maximum 2 images per compression. Upgrade for unlimited!
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-surface p-8 rounded-lg border border-subtle">
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{files.length} Images Selected</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Ready to compress</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => document.getElementById('add-more-input')?.click()}
                                    style={{ color: 'var(--color-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    + Add More
                                </button>
                                <input
                                    id="add-more-input"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            handleFileSelect(Array.from(e.target.files));
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={handleReset}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        color: 'var(--text-muted)',
                                        fontWeight: 500,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <FaRedo /> Reset All
                                </button>
                            </div>
                        </div>

                        {/* Compression Settings - CONTINUED IN NEXT MESSAGE */}

import { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { AdBanner } from '../../components/AdBanner';
import { FaDownload, FaCog, FaRedo, FaTrash, FaFileArchive } from 'react-icons/fa';
import JSZip from 'jszip';
import { SEO } from '../../components/SEO';

export const ImageCompressor = () => {
    const { checkLimit, incrementUsage, profile } = useUser();
    const toast = useToast();

    // Batch State
    const [files, setFiles] = useState<File[]>([]);
    const [compressedFiles, setCompressedFiles] = useState<{ [key: string]: Blob }>({});
    const [processingStatus, setProcessingStatus] = useState<{ [key: string]: 'pending' | 'processing' | 'done' | 'error' }>({});
    const [progressMap, setProgressMap] = useState<{ [key: string]: number }>({});
    const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
    const [globalEstimatedTime, setGlobalEstimatedTime] = useState<string>('');
    const batchStartTimeRef = useRef<number>(0);

    // Settings (Applied to all)
    const [options, setOptions] = useState({
        maxSizeMB: 1,
        useWebWorker: true,
        maxIteration: 50,
        alwaysKeepResolution: false,
        fileType: undefined as string | undefined
    });

    const [unit, setUnit] = useState<'MB' | 'KB'>('MB');
    const [qualityPriority, setQualityPriority] = useState<'size' | 'color'>('size');

    // UI Helpers
    const getFormattedSize = (sizeInBytes: number) => {
        return (sizeInBytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    const handleFileSelect = (selectedFiles: File | File[]) => {
        const newFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
        const isFreeUser = !profile || profile.plan === 'free';

        // For free users, limit to 2 images total
        if (isFreeUser) {
            const totalFiles = files.length + newFiles.length;
            if (totalFiles > 2) {
                toast.error(`Free tier limited to 2 images per compression. You can only add ${Math.max(0, 2 - files.length)} more image(s).`);
                // Only take files that fit within the limit
                const allowedCount = Math.max(0, 2 - files.length);
                const limitedFiles = newFiles.slice(0, allowedCount);

                if (limitedFiles.length === 0) return;

                setFiles(prev => [...prev, ...limitedFiles]);
                setProcessingStatus(prev => {
                    const next = { ...prev };
                    limitedFiles.forEach(f => next[f.name] = 'pending');
                    return next;
                });
                return;
            }
        }

        // Append new files
        setFiles(prev => [...prev, ...newFiles]);
        // Reset process states for new files
        setProcessingStatus(prev => {
            const next = { ...prev };
            newFiles.forEach(f => next[f.name] = 'pending');
            return next;
        });
    };

    const removeFile = (fileName: string) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        setCompressedFiles(prev => {
            const next = { ...prev };
            delete next[fileName];
            return next;
        });
        setProcessingStatus(prev => {
            const next = { ...prev };
            delete next[fileName];
            return next;
        });
    };

    const handleReset = () => {
        setFiles([]);
        setCompressedFiles({});
        setProcessingStatus({});
        setProgressMap({});
        // Reset settings
        setOptions({
            maxSizeMB: 1,
            useWebWorker: true,
            maxIteration: 50,
            alwaysKeepResolution: false,
            fileType: undefined
        });
        setUnit('MB');
        setQualityPriority('size');
    };

    const compressSingleFile = async (file: File, onProgress?: (progress: number) => void) => {
        setProcessingStatus(prev => ({ ...prev, [file.name]: 'processing' }));
        setProgressMap(prev => ({ ...prev, [file.name]: 0 }));

        try {
            // Apply current settings
            const currentOptions = {
                ...options,
                // If priority is color, strict type
                fileType: qualityPriority === 'color' ? file.type : undefined
            };

            // Adjust max size relative to unit if needed (library takes MB)
            if (unit === 'KB') {
                currentOptions.maxSizeMB = options.maxSizeMB / 1024;
            }

            // Mock progress start
            setProgressMap(prev => ({ ...prev, [file.name]: 10 }));
            if (onProgress) onProgress(10);

            const compressedBlob = await imageCompression(file, {
                ...currentOptions,
                onProgress: (p) => {
                    setProgressMap(prev => ({ ...prev, [file.name]: p }));
                    if (onProgress) onProgress(p);
                }
            });

            setCompressedFiles(prev => ({ ...prev, [file.name]: compressedBlob }));
            setProcessingStatus(prev => ({ ...prev, [file.name]: 'done' }));
            await incrementUsage('compress');
        } catch (error) {
            console.error(`Error compressing ${file.name}:`, error);
            setProcessingStatus(prev => ({ ...prev, [file.name]: 'error' }));
            toast.error(`Failed to compress ${file.name}`);
        }
    };

    const handleCompressAll = async () => {
        if (!checkLimit()) {
            toast.error("Daily limit reached! Please upgrade to continue.");
            return;
        }

        const isFreeUser = !profile || profile.plan === 'free';
        const pendingFiles = files.filter(f => !compressedFiles[f.name]);

        // For free users, only process first 2 images
        const filesToProcess = isFreeUser ? pendingFiles.slice(0, 2) : pendingFiles;

        if (isFreeUser && pendingFiles.length > 2) {
            toast.error(`Free tier can only process 2 images per compression. Processing first 2 images only. Upgrade for unlimited!`);
        }

        setIsGlobalProcessing(true);
        setGlobalEstimatedTime('Calculating...');
        batchStartTimeRef.current = Date.now();

        const totalBytes = filesToProcess.reduce((acc, f) => acc + f.size, 0);
        let completedBytes = 0;
        let processedCount = 0;

        // Process sequentially
        for (const file of filesToProcess) {
            await compressSingleFile(file, (progress) => {
                const currentFileBytes = (progress / 100) * file.size;
                const totalProcessed = completedBytes + currentFileBytes;
                const elapsed = (Date.now() - batchStartTimeRef.current) / 1000;

                // Only update if we have meaningful progress and some time has passed to stabilize
                if (elapsed > 0.5 && totalProcessed > 0) {
                    const bytesPerSecond = totalProcessed / elapsed;
                    const remainingBytes = totalBytes - totalProcessed;
                    const remainingSeconds = remainingBytes / bytesPerSecond;

                    if (remainingSeconds > 60) {
                        setGlobalEstimatedTime(`~${Math.ceil(remainingSeconds / 60)} min remaining`);
                    } else {
                        setGlobalEstimatedTime(`~${Math.ceil(remainingSeconds)}s remaining`);
                    }
                }
            });

            completedBytes += file.size;
            processedCount++;

            // For free users, stop after 2 images
            if (isFreeUser && processedCount >= 2) {
                break;
            }
        }

        setIsGlobalProcessing(false);
        setGlobalEstimatedTime('');

        if (isFreeUser && pendingFiles.length > 2) {
            toast.success(`Processed 2 images. Upgrade to process unlimited images!`);
        } else {
            toast.success("Batch compression complete!");
        }
    };


    const handleDownloadAll = async () => {
        if (Object.keys(compressedFiles).length === 0) return;

        const zip = new JSZip();
        Object.entries(compressedFiles).forEach(([name, blob]) => {
            zip.file(`compressed-${name}`, blob);
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "compressed-images.zip";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <SEO
                title="Image Compressor - Reduce File Size"
                description="Compress JPG, PNG, and WebP images locally in your browser. Batch processing supported."
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
                            label="Upload Images to Compress (Batch Supported)"
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
                        {/* Header Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{files.length} Images Selected</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Ready to process batch</p>
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

                        {/* Settings (Global) */}
                        <div style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaCog /> Batch Settings
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 500 }}>Target Size:</span>
                                        <input
                                            type="number"
                                            min="0.1"
                                            step={unit === 'KB' ? "1" : "0.01"}
                                            value={options.maxSizeMB}
                                            onChange={(e) => setOptions({ ...options, maxSizeMB: parseFloat(e.target.value) })}
                                            style={{
                                                padding: '0.5rem',
                                                width: '100px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-subtle)'
                                            }}
                                        />
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value as 'MB' | 'KB')}
                                            style={{
                                                padding: '0.5rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-subtle)',
                                                backgroundColor: 'var(--bg-surface)'
                                            }}
                                        >
                                            <option value="MB">MB</option>
                                            <option value="KB">KB</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            id="keepResolution"
                                            checked={options.alwaysKeepResolution}
                                            onChange={(e) => setOptions({ ...options, alwaysKeepResolution: e.target.checked })}
                                            style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="keepResolution" style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                                            Preserve Resolution
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* File Iteration List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {files.map((file, idx) => {
                                const status = processingStatus[file.name] || 'pending';
                                const result = compressedFiles[file.name];
                                const prog = progressMap[file.name] || 0;

                                return (
                                    <div key={idx} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'var(--bg-surface)'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{file.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {getFormattedSize(file.size)}
                                                {result && ` → ${getFormattedSize(result.size)} (${((result.size / file.size) * 100).toFixed(0)}%)`}
                                            </div>
                                            {status === 'processing' && (
                                                <div style={{ height: '4px', background: 'var(--border-subtle)', marginTop: '0.5rem', borderRadius: '2px', width: '100%' }}>
                                                    <div style={{ height: '100%', background: 'var(--color-primary)', width: `${prog}%`, borderRadius: '2px' }} />
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {status === 'done' && result ? (
                                                <a
                                                    href={URL.createObjectURL(result)}
                                                    download={`compressed-${file.name}`}
                                                    style={{ color: '#10b981', cursor: 'pointer', fontSize: '1.2rem' }}
                                                    title="Download"
                                                >
                                                    <FaDownload />
                                                </a>
                                            ) : status === 'error' ? (
                                                <span style={{ color: '#ef4444' }}>Error</span>
                                            ) : status === 'pending' || status === 'processing' ? (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    {status === 'processing' ? `${prog}%` : 'Waiting'}
                                                </span>
                                            ) : null}

                                            <button
                                                onClick={() => removeFile(file.name)}
                                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Global Actions */}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={handleCompressAll}
                                disabled={isGlobalProcessing}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    backgroundColor: isGlobalProcessing ? 'var(--bg-surface-hover)' : 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    cursor: isGlobalProcessing ? 'wait' : 'pointer',
                                    border: 'none',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                {isGlobalProcessing ? `Processing... (${globalEstimatedTime})` : 'Compress All Images'}
                            </button>

                            {Object.keys(compressedFiles).length > 0 && (
                                <button
                                    onClick={handleDownloadAll}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        border: 'none',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                                    }}
                                >
                                    <FaFileArchive /> Download All (ZIP)
                                </button>
                            )}
                        </div>

                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem', backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>How it Works</h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                    <li><strong>Upload Images</strong>: Select one or multiple images at once.</li>
                    <li><strong>Adjust Settings</strong>: Set your target size (e.g., 0.5 MB). This applies to ALL selected images.</li>
                    <li><strong>Process Batch</strong>: Click "Compress All". We process them one by one to save your memory.</li>
                    <li><strong>Download</strong>: Download individual images or grab everything as a single ZIP file.</li>
                </ol>
            </div>

            <AdBanner />
        </div>
    );
};

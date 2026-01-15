import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { FileUploader } from '../../components/FileUploader';
import { useUser } from '../../contexts/UserContext';
import { FaDownload, FaCog } from 'react-icons/fa';

export const ImageCompressor = () => {
    const { checkLimit, incrementUsage } = useUser();
    const [file, setFile] = useState<File | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [options, setOptions] = useState({
        maxSizeMB: 1,
        useWebWorker: true
    });

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setCompressedFile(null);
    };

    const handleCompress = async () => {
        if (!checkLimit()) {
            alert("Daily limit reached! Please upgrade to continue.");
            return;
        }

        if (!file) return;

        setIsProcessing(true);
        try {
            const compressed = await imageCompression(file, options);
            setCompressedFile(compressed);
            await incrementUsage();
        } catch (error) {
            console.error(error);
            alert("Compression failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                Image Compressor
            </h1>

            <div style={{ marginBottom: '2rem' }}>
                {!file ? (
                    <FileUploader onFileSelect={handleFileSelect} accept="image/*" label="Upload Image to Compress" />
                ) : (
                    <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Original Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                style={{ color: 'var(--color-accent)', fontWeight: 500 }}
                            >
                                Change File
                            </button>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <FaCog /> Compression Settings
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Max Size (MB)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={options.maxSizeMB}
                                        onChange={(e) => setOptions({ ...options, maxSizeMB: parseFloat(e.target.value) })}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-app)',
                                            color: 'var(--text-main)'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {compressedFile ? (
                            <div style={{
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '2rem',
                                border: '1px solid var(--color-primary)'
                            }}>
                                <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Compression Complete!</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                    New Size: {(compressedFile.size / 1024 / 1024).toFixed(2)} MB
                                    <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 600 }}>
                                        (-{((1 - compressedFile.size / file.size) * 100).toFixed(0)}%)
                                    </span>
                                </p>
                                <a
                                    href={URL.createObjectURL(compressedFile)}
                                    download={`compressed-${file.name}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600
                                    }}
                                >
                                    <FaDownload /> Download Image
                                </a>
                            </div>
                        ) : (
                            <button
                                onClick={handleCompress}
                                disabled={isProcessing}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    backgroundColor: isProcessing ? 'var(--bg-surface-hover)' : 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    cursor: isProcessing ? 'wait' : 'pointer'
                                }}
                            >
                                {isProcessing ? 'Compressing...' : 'Compress Image Now'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

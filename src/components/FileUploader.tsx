import React, { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaFolderOpen, FaLock } from 'react-icons/fa';

interface FileUploaderProps {
    onFileSelect: (file: File | File[]) => void;
    accept?: string;
    label?: string;
    maxSizeMB?: number;
    multiple?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
    onFileSelect,
    accept = "image/*",
    label = "Click or Drag Files to Upload",
    maxSizeMB = 50,
    multiple = false
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (fileList: FileList) => {
        const validFiles: File[] = [];
        Array.from(fileList).forEach(file => {
            if (file.size <= maxSizeMB * 1024 * 1024) {
                validFiles.push(file);
            } else {
                alert(`File ${file.name} is too large. Max size is ${maxSizeMB}MB.`);
            }
        });

        if (validFiles.length > 0) {
            if (multiple) {
                onFileSelect(validFiles);
            } else {
                onFileSelect(validFiles[0]);
            }
        }
    };

    return (
        <div
            className={`file-uploader glass-panel ${isDragOver ? 'drag-over-pulse' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
                border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: 'var(--radius-xl)',
                padding: 'clamp(2.5rem, 5vw, 4rem) 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragOver ? 'rgba(0, 210, 255, 0.08)' : 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                boxShadow: isDragOver ? 'var(--shadow-glow)' : 'var(--glass-highlight), var(--shadow-md)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                if (!isDragOver) {
                    e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isDragOver) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'none';
                }
            }}
        >
            <input
                type="file"
                ref={inputRef}
                onChange={handleChange}
                accept={accept}
                multiple={multiple}
                style={{ display: 'none' }}
            />

            {/* Glowing Icon Container */}
            <div style={{
                width: '76px',
                height: '76px',
                borderRadius: 'var(--radius-lg)',
                background: isDragOver
                    ? 'linear-gradient(135deg, rgba(0, 210, 255, 0.3), rgba(99, 102, 241, 0.3))'
                    : 'linear-gradient(135deg, rgba(0, 210, 255, 0.12), rgba(99, 102, 241, 0.12))',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                boxShadow: '0 0 24px -4px rgba(0, 210, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.25rem',
                color: isDragOver ? '#ffffff' : 'var(--color-primary)',
                transition: 'all 0.3s ease'
            }}>
                <FaCloudUploadAlt />
            </div>

            <div>
                <h3 style={{
                    fontSize: 'clamp(1.2rem, 3vw, 1.45rem)',
                    marginBottom: '0.5rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: 'var(--text-main)'
                }}>
                    {label}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    Drag & drop {multiple ? 'multiple files' : 'your file'} here, or click to browse
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <span className="glass-btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                        <FaFolderOpen /> Browse Files
                    </span>
                </div>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-dim)'
            }}>
                <FaLock style={{ color: '#10b981' }} /> Local Browser Execution &bull; Max {maxSizeMB}MB
            </div>
        </div>
    );
};

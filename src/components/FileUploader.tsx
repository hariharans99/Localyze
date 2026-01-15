import React, { useRef, useState } from 'react';
import { FaCloudUploadAlt } from 'react-icons/fa';

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
    label = "Click or Drag to Upload",
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
            className={`file-uploader ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
                border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '3rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-surface)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
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

            <div style={{
                fontSize: '3rem',
                color: isDragOver ? 'var(--color-primary)' : 'var(--text-dim)'
            }}>
                <FaCloudUploadAlt />
            </div>

            <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                    {label}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Max file size: {maxSizeMB}MB
                </p>
            </div>
        </div>
    );
};

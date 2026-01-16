import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    warningText?: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    warningText,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                animation: 'fadeIn 0.2s ease-out'
            }}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                    maxWidth: '450px',
                    width: '90%',
                    overflow: 'hidden',
                    animation: 'slideUp 0.25s ease-out'
                }}>

                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {isDangerous && (
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '1rem' }} />
                            </div>
                        )}
                        <h3 style={{
                            color: isDangerous ? '#ef4444' : 'var(--text-main)',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            margin: 0
                        }}>
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    <p style={{
                        color: 'var(--text-main)',
                        fontSize: '1rem',
                        marginBottom: warningText ? '1rem' : '1.5rem',
                        lineHeight: 1.6
                    }}>
                        {message}
                    </p>

                    {warningText && (
                        <div style={{
                            display: 'flex',
                            gap: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            marginBottom: '1.5rem'
                        }}>
                            <FaExclamationTriangle style={{
                                color: '#ef4444',
                                fontSize: '1rem',
                                flexShrink: 0,
                                marginTop: '2px'
                            }} />
                            <p style={{
                                color: '#dc2626',
                                fontSize: '0.9rem',
                                margin: 0,
                                lineHeight: 1.5
                            }}>
                                {warningText}
                            </p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)',
                                backgroundColor: 'var(--bg-app)',
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                                e.currentTarget.style.borderColor = 'var(--text-muted)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-app)';
                                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                backgroundColor: isDangerous ? '#ef4444' : 'var(--color-primary)',
                                color: 'white',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = isDangerous ? '#dc2626' : '#5558e3';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = isDangerous ? '#ef4444' : 'var(--color-primary)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { 
                            transform: translateY(20px);
                            opacity: 0;
                        }
                        to { 
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

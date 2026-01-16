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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxWidth: '420px',
                width: '90%',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    background: isDangerous
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                        {title}
                    </h3>
                    <button
                        onClick={onCancel}
                        style={{
                            color: 'rgba(255,255,255,0.8)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex'
                        }}
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    <p style={{
                        color: 'var(--text-main)',
                        fontSize: '1rem',
                        marginBottom: warningText ? '1rem' : '1.5rem',
                        lineHeight: 1.5
                    }}>
                        {message}
                    </p>

                    {warningText && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            marginBottom: '1.5rem'
                        }}>
                            <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '1.25rem', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{
                                color: '#ef4444',
                                fontSize: '0.9rem',
                                fontWeight: 500,
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
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
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
                                background: isDangerous
                                    ? '#ef4444'
                                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isDangerous
                                    ? '0 4px 14px rgba(239, 68, 68, 0.4)'
                                    : '0 4px 14px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>

                <style>
                    {`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideUp {
                            from { transform: translateY(20px); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                    `}
                </style>
            </div>
        </div>
    );
};

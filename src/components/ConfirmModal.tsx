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
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                animation: 'modalFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, var(--bg-surface) 0%, rgba(255,255,255,0.05) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: `
                        0 25px 60px -15px rgba(0, 0, 0, 0.5),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1)
                    `,
                    maxWidth: '480px',
                    width: '92%',
                    overflow: 'hidden',
                    animation: 'modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                }}>

                {/* Gradient Orb Effect */}
                <div style={{
                    position: 'absolute',
                    top: '-100px',
                    right: '-100px',
                    width: '250px',
                    height: '250px',
                    background: isDangerous
                        ? 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(40px)',
                    pointerEvents: 'none'
                }} />

                {/* Header */}
                <div style={{
                    background: isDangerous
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    borderBottom: `1px solid ${isDangerous ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
                    padding: '1.75rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {isDangerous && (
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                            }}>
                                <FaExclamationTriangle style={{ color: 'white', fontSize: '1.1rem' }} />
                            </div>
                        )}
                        <h3 style={{
                            background: isDangerous
                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontSize: '1.35rem',
                            fontWeight: 700,
                            margin: 0,
                            letterSpacing: '-0.02em'
                        }}>
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="modal-close-btn"
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '2rem' }}>
                    <p style={{
                        color: 'var(--text-main)',
                        fontSize: '1.05rem',
                        marginBottom: warningText ? '1.25rem' : '2rem',
                        lineHeight: 1.6,
                        fontWeight: 400
                    }}>
                        {message}
                    </p>

                    {warningText && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem',
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.03) 100%)',
                            padding: '1.25rem',
                            borderRadius: '14px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            marginBottom: '2rem',
                            backdropFilter: 'blur(10px)',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '1rem' }} />
                            </div>
                            <p style={{
                                color: '#dc2626',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                margin: 0,
                                lineHeight: 1.6
                            }}>
                                {warningText}
                            </p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onCancel}
                            className="modal-cancel-btn"
                            style={{
                                padding: '0.875rem 1.75rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="modal-confirm-btn"
                            style={{
                                padding: '0.875rem 1.75rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: isDangerous
                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: 'white',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isDangerous
                                    ? '0 4px 16px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                    : '0 4px 16px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <span style={{ position: 'relative', zIndex: 1 }}>{confirmText}</span>
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes modalFadeIn {
                        from { 
                            opacity: 0;
                        }
                        to { 
                            opacity: 1;
                        }
                    }
                    @keyframes modalSlideUp {
                        from { 
                            transform: translateY(30px) scale(0.95);
                            opacity: 0;
                        }
                        to { 
                            transform: translateY(0) scale(1);
                            opacity: 1;
                        }
                    }
                    
                    .modal-close-btn:hover {
                        background: rgba(255, 255, 255, 0.1) !important;
                        border-color: rgba(255, 255, 255, 0.2) !important;
                        transform: scale(1.05);
                    }
                    
                    .modal-cancel-btn:hover {
                        background: rgba(255, 255, 255, 0.1) !important;
                        border-color: rgba(255, 255, 255, 0.25) !important;
                        transform: translateY(-1px);
                        box-shadow: 
                            0 4px 12px rgba(0, 0, 0, 0.1),
                            inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
                    }
                    
                    .modal-confirm-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: ${isDangerous
                        ? '0 6px 20px rgba(239, 68, 68, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important'
                        : '0 6px 20px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important'
                    };
                    }
                    
                    .modal-confirm-btn:active {
                        transform: translateY(0);
                    }
                `}</style>
            </div>
        </div>
    );
};

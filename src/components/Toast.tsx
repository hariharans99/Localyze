import React, { useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, 3000);

        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <FaCheckCircle />;
            case 'error': return <FaExclamationCircle />;
            default: return <FaInfoCircle />;
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success': return { bg: '#dcfce7', border: '#86efac', text: '#166534', icon: '#15803d' };
            case 'error': return { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', icon: '#b91c1c' };
            default: return { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3', icon: '#4338ca' };
        }
    };

    const colors = getColors();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 'var(--radius-md)',
            color: colors.text,
            boxShadow: 'var(--shadow-lg)',
            minWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <span style={{ color: colors.icon, fontSize: '1.25rem' }}>
                {getIcon()}
            </span>
            <p style={{ flex: 1, margin: 0, fontWeight: 500 }}>{toast.message}</p>
            <button
                onClick={() => onClose(toast.id)}
                style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer', padding: 0 }}
            >
                <FaTimes />
            </button>
            <style>
                {`
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
};

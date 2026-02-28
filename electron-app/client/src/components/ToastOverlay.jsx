import React from 'react';
import { X } from 'lucide-react';

const ToastOverlay = ({ toasts, removeToast }) => (
    <div className="toast-container">
        {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type} flex items-center justify-between`}>
                <span>{t.message}</span>
                <button onClick={() => removeToast(t.id)} className="ml-3 opacity-70 hover:opacity-100">
                    <X size={14} />
                </button>
            </div>
        ))}
    </div>
);

export default ToastOverlay;

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, Bell, X } from 'lucide-react';

// Global helper to trigger toast events
export const toast = {
  success: (message) => {
    window.dispatchEvent(new CustomEvent('toastAlert', { detail: { type: 'success', message } }));
  },
  error: (message) => {
    window.dispatchEvent(new CustomEvent('toastAlert', { detail: { type: 'error', message } }));
  },
  warning: (message) => {
    window.dispatchEvent(new CustomEvent('toastAlert', { detail: { type: 'warning', message } }));
  },
  info: (message) => {
    window.dispatchEvent(new CustomEvent('toastAlert', { detail: { type: 'info', message } }));
  }
};

export function ToastNotification() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { type, message } = e.detail;
      const id = Date.now();
      
      setToasts(prev => [...prev, { id, type, message }]);

      // Auto delete after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    window.addEventListener('toastAlert', handleToast);
    return () => {
      window.removeEventListener('toastAlert', handleToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIcons = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg animate-fadeIn transition-all duration-300 ${getBorderColor(t.type)}`}
        >
          {getIcons(t.type)}
          <div className="flex-1 text-xs font-semibold leading-normal pr-2">
            {t.message}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-slate-650 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastNotification;

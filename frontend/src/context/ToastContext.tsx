import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const error = useCallback((msg: string) => addToast('error', msg), [addToast]);
  const info = useCallback((msg: string) => addToast('info', msg), [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      
      {/* Toast Notification Container Overlay */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start p-4 rounded-2xl shadow-xl transition-all duration-300 transform translate-y-0 scale-100 border animate-slide-in ${
              t.type === 'success'
                ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-250 dark:border-emerald-800 text-emerald-800 dark:text-emerald-250'
                : t.type === 'error'
                ? 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-250 dark:border-rose-800 text-rose-800 dark:text-rose-250'
                : 'bg-sky-50/95 dark:bg-sky-950/90 border-sky-250 dark:border-sky-800 text-sky-800 dark:text-sky-250'
            } backdrop-blur-md`}
          >
            <div className="shrink-0 mr-3">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {t.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
            </div>
            
            <p className="flex-1 text-xs sm:text-sm font-semibold leading-relaxed">{t.message}</p>
            
            <button
              onClick={() => removeToast(t.id)}
              className="ml-3 shrink-0 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

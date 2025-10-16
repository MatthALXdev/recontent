import { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    const newToast = { id, message, type };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 md:right-4 md:top-4 left-4 md:left-auto z-[100] flex flex-col items-center md:items-end gap-2 pointer-events-none">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const { message, type } = toast;

  const styles = {
    success: {
      bg: 'bg-green-500/90',
      border: 'border-green-400',
      icon: '✓'
    },
    error: {
      bg: 'bg-red-500/90',
      border: 'border-red-400',
      icon: '✕'
    },
    warning: {
      bg: 'bg-orange-500/90',
      border: 'border-orange-400',
      icon: '⚠'
    },
    info: {
      bg: 'bg-primary-500/90',
      border: 'border-primary-400',
      icon: 'ℹ'
    }
  };

  const style = styles[type] || styles.info;

  return (
    <div
      className={`${style.bg} ${style.border} border backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg pointer-events-auto animate-slide-in-right flex items-center gap-3 min-w-[280px] max-w-[400px]`}
      style={{
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <span className="text-white font-bold text-lg">{style.icon}</span>
      <p className="text-white text-sm flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

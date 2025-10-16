import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, type = 'warning' }) {
  if (!isOpen) return null;

  const styles = {
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/10',
      confirmBtn: 'bg-orange-600 hover:bg-orange-700'
    },
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/10',
      confirmBtn: 'bg-red-600 hover:bg-red-700'
    }
  };

  const style = styles[type] || styles.warning;
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-md w-full animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full ${style.iconBg} flex items-center justify-center mb-4`}>
            <Icon className={style.iconColor} size={24} />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-6">{message}</p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium ${style.confirmBtn}`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

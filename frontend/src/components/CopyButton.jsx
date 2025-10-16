import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    if (copied) return; // Prevent double-click

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Copied to clipboard!', 'success');

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={copied}
      className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium transform ${
        copied
          ? 'bg-green-600 cursor-not-allowed scale-105'
          : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:scale-105 active:scale-95'
      }`}
    >
      {copied ? (
        <>
          <Check size={16} className="animate-scale-check" />
          Copied!
        </>
      ) : (
        <>
          <Copy size={16} />
          Copy
        </>
      )}
    </button>
  );
}

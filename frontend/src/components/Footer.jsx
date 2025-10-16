import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-800 border-t border-slate-700 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-gray-400 text-sm">
          <p>© 2025 ReContent.dev</p>
          <span className="hidden sm:inline">•</span>
          <p className="flex items-center gap-1">
            Made with <Heart size={14} className="text-red-500 fill-red-500" /> using Claude Code
          </p>
        </div>
      </div>
    </footer>
  );
}

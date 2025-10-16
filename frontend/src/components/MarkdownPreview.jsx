import { useState } from 'react';
import { Eye, Code, Download, FileText } from 'lucide-react';
import CopyButton from './CopyButton';

export default function MarkdownPreview({ content, platform }) {
  const [viewMode, setViewMode] = useState('preview'); // 'preview' ou 'raw'

  // Fonction simple pour convertir Markdown en HTML (basique)
  const renderMarkdown = (text) => {
    let html = text;

    // Titres
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white mt-5 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>');

    // Gras et italique
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold text-white"><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

    // Code inline
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-800 text-blue-400 rounded text-sm font-mono">$1</code>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre class="bg-slate-900 border border-slate-700 rounded-lg p-4 my-3 overflow-x-auto"><code class="text-sm text-gray-300 font-mono">$2</code></pre>');

    // Listes non ordonnées
    html = html.replace(/^\- (.+)$/gim, '<li class="ml-4 text-gray-300">• $1</li>');
    html = html.replace(/(<li class="ml-4 text-gray-300">.*<\/li>\n?)+/g, '<ul class="my-2 space-y-1">$&</ul>');

    // Liens
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Paragraphes (séparer par double saut de ligne)
    html = html.split('\n\n').map(para => {
      if (!para.trim().startsWith('<')) {
        return `<p class="text-gray-300 my-3 leading-relaxed">${para}</p>`;
      }
      return para;
    }).join('\n');

    return html;
  };

  const downloadAsText = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform}-post-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform}-post-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            <Eye size={16} />
            Preview
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'raw'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            <Code size={16} />
            Raw Markdown
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadAsText}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white transition-all duration-200"
          >
            <Download size={16} />
            .txt
          </button>
          <button
            onClick={downloadAsMarkdown}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white transition-all duration-200"
          >
            <FileText size={16} />
            .md
          </button>
          <CopyButton text={content} />
        </div>
      </div>

      {/* Canvas de prévisualisation */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
        {viewMode === 'preview' ? (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
            {content}
          </pre>
        )}
      </div>

      {/* Info note */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
        <p className="text-sm text-purple-300">
          💡 <strong>Info :</strong> Le Markdown (**, ##, -) sera automatiquement interprété par {platform === 'linkedin' ? 'LinkedIn' : 'Dev.to'} lors de la publication.
        </p>
      </div>

      {/* Character counter */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {content.length} caractères
        </span>
        {platform === 'linkedin' && content.length > 3000 && (
          <span className="text-orange-400 font-medium">
            ⚠️ Approche de la limite LinkedIn (3000 caractères)
          </span>
        )}
      </div>
    </div>
  );
}

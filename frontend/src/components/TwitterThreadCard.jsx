import { useState } from 'react';
import { Twitter, Download, Check } from 'lucide-react';
import CopyButton from './CopyButton';

export default function TwitterThreadCard({ content }) {
  // Parser le thread: séparer par les numéros (1/, 2/, etc.)
  const tweets = content
    .split(/\n(?=\d+\/)/)
    .map(tweet => tweet.trim())
    .filter(tweet => tweet.length > 0);

  const [selectedTweets, setSelectedTweets] = useState(
    tweets.map((_, index) => ({ id: index, selected: false }))
  );

  const toggleTweet = (id) => {
    setSelectedTweets(prev =>
      prev.map(tweet => tweet.id === id ? { ...tweet, selected: !tweet.selected } : tweet)
    );
  };

  const selectAll = () => {
    setSelectedTweets(prev => prev.map(tweet => ({ ...tweet, selected: true })));
  };

  const deselectAll = () => {
    setSelectedTweets(prev => prev.map(tweet => ({ ...tweet, selected: false })));
  };

  const downloadSelected = () => {
    const selectedContent = tweets
      .filter((_, index) => selectedTweets[index].selected)
      .join('\n\n');

    const blob = new Blob([selectedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twitter-thread-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedCount = selectedTweets.filter(t => t.selected).length;

  return (
    <div className="space-y-4">
      {/* Header avec actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Twitter className="text-blue-400" size={20} />
          <h3 className="text-lg font-semibold text-white">
            Thread X ({tweets.length} tweets)
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white transition-all duration-200"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white transition-all duration-200"
          >
            Deselect All
          </button>
          <button
            onClick={downloadSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Download ({selectedCount})
          </button>
        </div>
      </div>

      {/* Liste des tweets */}
      <div className="space-y-3">
        {tweets.map((tweet, index) => {
          const isSelected = selectedTweets[index].selected;
          const charCount = tweet.replace(/^\d+\/\s*/, '').length;
          const isOverLimit = charCount > 280;

          return (
            <div
              key={index}
              onClick={() => toggleTweet(index)}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-blue-500/10 border-blue-500 shadow-lg'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Checkbox indicator */}
              <div className="absolute top-3 right-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-slate-800 border-slate-600'
                }`}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
              </div>

              {/* Tweet content */}
              <div className="pr-8">
                <p className="text-gray-300 whitespace-pre-wrap">
                  {tweet}
                </p>
              </div>

              {/* Footer: char count + copy */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                <span className={`text-sm font-medium ${
                  isOverLimit ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {charCount} / 280 caractères
                </span>

                <div onClick={(e) => e.stopPropagation()}>
                  <CopyButton text={tweet} size="sm" />
                </div>
              </div>

              {isOverLimit && (
                <p className="text-xs text-red-400 mt-2">
                  ⚠️ Ce tweet dépasse la limite de 280 caractères
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
        <p className="text-sm text-blue-300">
          💡 <strong>Astuce :</strong> Sélectionnez les tweets que vous voulez utiliser, puis téléchargez-les ou copiez-les individuellement.
        </p>
      </div>
    </div>
  );
}

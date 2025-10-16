import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import { Trash2, Calendar, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import ResultsTabs from '../components/ResultsTabs';

export default function History() {
  const [history, setHistory] = useState(() => storage.get('history') || []);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFullContent, setShowFullContent] = useState(false);
  const navigate = useNavigate();

  const deleteItem = (id) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    storage.save('history', newHistory);
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };


  const clearAllHistory = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer tout l\'historique ?')) {
      setHistory([]);
      storage.save('history', []);
      setSelectedItem(null);
    }
  };

  return (
    <div className="container mx-auto px-2 md:px-4 py-3 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">History</h1>
          <p className="text-sm md:text-base text-gray-400">
            {history.length} génération{history.length > 1 ? 's' : ''} sauvegardée{history.length > 1 ? 's' : ''}
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearAllHistory}
            className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm md:text-base"
          >
            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="hidden sm:inline">Clear All</span>
            <span className="sm:hidden">Clear</span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {history.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
          <p className="text-gray-400 text-lg mb-6">Aucune génération pour le moment.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Créer une génération
          </button>
        </div>
      ) : selectedItem ? (
        /* Vue détaillée d'un item */
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => {
              setSelectedItem(null);
              setShowFullContent(false);
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft size={20} />
            Retour à la liste
          </button>

          {/* Original content card */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Contenu original</h2>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Calendar size={14} />
                  <span>{formatDate(selectedItem.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="flex items-center gap-2 px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
                  title={showFullContent ? "Masquer" : "Afficher tout"}
                >
                  {showFullContent ? (
                    <>
                      <ChevronUp size={18} />
                      <span className="text-sm">Hide</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={18} />
                      <span className="text-sm">Show more</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => deleteItem(selectedItem.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {showFullContent
                ? selectedItem.content
                : truncateText(selectedItem.content, 50)}
            </p>
          </div>

          {/* Results with tabs */}
          <ResultsTabs results={selectedItem.results} />
        </div>
      ) : (
        /* Liste des items */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer group"
              onClick={() => {
                setSelectedItem(item);
                setShowFullContent(false);
              }}
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                <Calendar size={14} />
                <span>{formatDate(item.date)}</span>
              </div>

              <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                {item.content}
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {item.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded"
                  >
                    {platform}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {Object.keys(item.results).length} format{Object.keys(item.results).length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-all"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

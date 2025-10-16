import { useState } from 'react';
import { Twitter, Linkedin, FileText, Github, Mail, Sparkles, AlertCircle } from 'lucide-react';
import { generateContent } from '../services/mistralAPI';
import { storage } from '../services/storage';
import LoadingSpinner from '../components/LoadingSpinner';
import ResultsTabs from '../components/ResultsTabs';

export default function Home() {
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState({
    twitter: false,
    linkedin: false,
    devto: false,
    github: false,
    newsletter: false,
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => storage.get('history') || []);
  const [textareaExpanded, setTextareaExpanded] = useState(false);
  const [shakeButton, setShakeButton] = useState(false);

  const handlePlatformToggle = (platform) => {
    setPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const addToHistory = (item) => {
    const newHistory = [
      {
        id: Date.now(),
        date: new Date().toISOString(),
        ...item
      },
      ...history
    ].slice(0, 20); // Garde seulement les 20 derniers
    setHistory(newHistory);
    storage.save('history', newHistory);
  };

  const handleGenerate = async (e) => {
    // Retirer le focus du bouton
    if (e && e.currentTarget) {
      e.currentTarget.blur();
    }

    // Vérifier les conditions
    const hasContent = content && content.length >= 100;
    const hasPlatforms = Object.values(platforms).some(v => v);

    if (!hasContent || !hasPlatforms) {
      // Déclencher l'animation de shake
      setShakeButton(true);
      setTimeout(() => setShakeButton(false), 500);

      // Afficher un message d'erreur approprié
      if (!hasContent && !hasPlatforms) {
        setError('Veuillez sélectionner au moins une plateforme et ajouter du contenu (min 100 caractères)');
      } else if (!hasContent) {
        setError('Le contenu doit contenir au moins 100 caractères');
      } else {
        setError('Veuillez sélectionner au moins une plateforme');
      }
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const selectedPlatforms = Object.keys(platforms).filter(p => platforms[p]);
      const data = await generateContent(content, selectedPlatforms);
      setResults(data);

      // Sauvegarder dans l'historique
      addToHistory({
        content,
        platforms: selectedPlatforms,
        results: data
      });
    } catch (err) {
      console.error('Error generating content:', err);
      setError(err.message || 'Erreur API. Vérifie ta clé Mistral dans le fichier .env');
    } finally {
      setLoading(false);
    }
  };

  const isGenerateDisabled = !content.trim() || !Object.values(platforms).some(v => v);

  return (
    <div className="container mx-auto px-2 md:px-4 py-3 md:py-8 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-4 md:mb-12 animate-fade-in">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-4 gradient-text">
          Repurpose Your Content
        </h1>
        <p className="text-sm md:text-xl text-gray-400 max-w-2xl mx-auto">
          Transform your technical content into optimized posts for multiple platforms with AI
        </p>
      </div>

      {/* Layout en 1 colonne pour toutes les tailles */}
      <div className="space-y-4 md:space-y-6">

        {/* Platform Selector - Au-dessus */}
        <div className="animate-slide-up stagger-1">
          <label className="block text-white font-medium mb-2 md:mb-3 text-sm md:text-base">
            Target Platforms
          </label>

          {/* Mode Tags pour toutes les tailles d'écran */}
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            <button
              onClick={() => handlePlatformToggle('twitter')}
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all duration-200 ${
                platforms.twitter
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg'
                  : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-blue-500/50'
              }`}
            >
              <Twitter size={14} />
              <span className="text-xs font-medium">X</span>
            </button>

            <button
              onClick={() => handlePlatformToggle('linkedin')}
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all duration-200 ${
                platforms.linkedin
                  ? 'bg-blue-600/20 border-blue-600 text-blue-400 shadow-lg'
                  : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-blue-600/50'
              }`}
            >
              <Linkedin size={14} />
              <span className="text-xs font-medium">LinkedIn</span>
            </button>

            <button
              onClick={() => handlePlatformToggle('devto')}
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all duration-200 ${
                platforms.devto
                  ? 'bg-gray-500/20 border-gray-500 text-gray-400 shadow-lg'
                  : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-gray-500/50'
              }`}
            >
              <FileText size={14} />
              <span className="text-xs font-medium">Dev.to</span>
            </button>

            <button
              onClick={() => handlePlatformToggle('github')}
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all duration-200 ${
                platforms.github
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-lg'
                  : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-purple-500/50'
              }`}
            >
              <Github size={14} />
              <span className="text-xs font-medium">GitHub</span>
            </button>

            <button
              onClick={() => handlePlatformToggle('newsletter')}
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all duration-200 ${
                platforms.newsletter
                  ? 'bg-green-500/20 border-green-500 text-green-400 shadow-lg'
                  : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-green-500/50'
              }`}
            >
              <Mail size={14} />
              <span className="text-xs font-medium">Newsletter</span>
            </button>
          </div>
        </div>

        {/* Content Input - En dessous */}
        <div className="animate-slide-up stagger-2">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <label className="block text-white font-medium text-sm md:text-base">
              Your Content
            </label>
            <span className={`text-xs md:text-sm font-medium ${content.length < 100 ? 'text-red-400' : 'text-green-400'}`}>
              {content.length} / 100
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setTextareaExpanded(true)}
            placeholder={textareaExpanded ? "Paste your blog post, article, or any content you want to repurpose for social media platforms..." : "Click to expand and paste content..."}
            className={`textarea transition-all duration-300 ${
              textareaExpanded ? 'h-32 md:h-48' : 'h-10 md:h-48'
            }`}
            rows={textareaExpanded ? 5 : 3}
          />
        </div>

      </div>

      {/* Generate Button - Toujours visible */}
      <div className="mt-4 md:mt-6 animate-slide-up stagger-3">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`btn btn-primary w-full text-sm md:text-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            shakeButton ? 'animate-shake' : ''
          }`}
        >
          <Sparkles size={16} className={`md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Génération en cours...' : 'Generate Content'}
        </button>
      </div>

      {error && (
        <div className="mt-3 md:mt-6 bg-red-900/20 border border-red-500/50 rounded-lg p-3 md:p-4 flex items-start gap-2 md:gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-red-300 text-sm md:text-base">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mt-6 md:mt-8 card">
          <LoadingSpinner />
        </div>
      )}

      {/* Results - Apparait uniquement quand il y a des résultats */}
      {!loading && results && (
        <ResultsTabs results={results} />
      )}
    </div>
  );
}

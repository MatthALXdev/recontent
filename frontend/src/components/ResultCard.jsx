import { Twitter, Linkedin, FileText, Github, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PLATFORM_LIMITS } from '../utils/constants';
import TwitterThreadCard from './TwitterThreadCard';
import MarkdownPreview from './MarkdownPreview';

const platformConfig = {
  twitter: {
    icon: Twitter,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    title: 'X Thread'
  },
  linkedin: {
    icon: Linkedin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10',
    borderColor: 'border-blue-600/30',
    title: 'LinkedIn Post'
  },
  devto: {
    icon: FileText,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    title: 'Dev.to Article'
  },
  github: {
    icon: Github,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    title: 'GitHub README'
  },
  newsletter: {
    icon: Mail,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    title: 'Newsletter Email'
  }
};

export default function ResultCard({ platform, content, onRegenerate }) {
  const [currentContent, setCurrentContent] = useState(content);
  const config = platformConfig[platform];
  const Icon = config.icon;
  const limit = PLATFORM_LIMITS[platform];

  // Check if content is an error object
  const isError = typeof content === 'object' && content !== null && content.error;

  // Synchroniser currentContent quand content change (changement d'onglet)
  useEffect(() => {
    if (!isError) {
      console.log('📝 ResultCard - Platform:', platform, 'Content preview:', content?.substring(0, 50));
    } else {
      console.error('❌ ResultCard - Platform:', platform, 'Error:', content);
    }
    setCurrentContent(content);
  }, [content, platform, isError]);

  return (
    <div className="animate-fade-in">
      <div className="card">
        {/* Header avec badge et titre sur la même ligne */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor} flex items-center gap-2`}>
            <Icon className={config.color} size={14} />
            <span className={`text-xs font-medium ${config.color}`}>{limit.name}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{config.title}</h2>
        </div>

        {/* Show error message if content is an error object */}
        {isError ? (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <h3 className="text-red-400 font-semibold mb-2">⚠️ Generation Failed</h3>
            <p className="text-red-300 text-sm mb-2">{currentContent.error}</p>
            {currentContent.details && (
              <p className="text-red-400 text-xs font-mono bg-red-950/50 p-2 rounded">
                {currentContent.details}
              </p>
            )}
          </div>
        ) : (
          /* Rendu conditionnel selon la plateforme */
          platform === 'twitter' ? (
            <TwitterThreadCard content={currentContent} />
          ) : (
            <MarkdownPreview content={currentContent} platform={platform} />
          )
        )}
      </div>
    </div>
  );
}

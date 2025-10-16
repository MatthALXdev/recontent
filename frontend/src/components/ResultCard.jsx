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

  // Synchroniser currentContent quand content change (changement d'onglet)
  useEffect(() => {
    console.log('📝 ResultCard - Platform:', platform, 'Content preview:', content?.substring(0, 50));
    setCurrentContent(content);
  }, [content, platform]);

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

        {/* Rendu conditionnel selon la plateforme */}
        {platform === 'twitter' ? (
          <TwitterThreadCard content={currentContent} />
        ) : (
          <MarkdownPreview content={currentContent} platform={platform} />
        )}
      </div>
    </div>
  );
}

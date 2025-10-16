import { useState, useEffect } from 'react';
import { Twitter, Linkedin, FileText, Github, Mail } from 'lucide-react';
import ResultCard from './ResultCard';
import { PLATFORM_LIMITS } from '../utils/constants';

const platformIcons = {
  twitter: { icon: Twitter, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500' },
  linkedin: { icon: Linkedin, color: 'text-blue-600', bgColor: 'bg-blue-600/10', borderColor: 'border-blue-600' },
  devto: { icon: FileText, color: 'text-gray-300', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500' },
  github: { icon: Github, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500' },
  newsletter: { icon: Mail, color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500' }
};

export default function ResultsTabs({ results }) {
  const [activeTab, setActiveTab] = useState(Object.keys(results)[0]);

  // Debug: Log results pour vérifier le contenu
  useEffect(() => {
    console.log('📊 ResultsTabs - Results object:', results);
    console.log('📊 Available platforms:', Object.keys(results));
    console.log('📊 Active tab:', activeTab);
    console.log('📊 Content for active tab:', results[activeTab]?.substring(0, 100));
  }, [results, activeTab]);

  return (
    <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-700 overflow-x-auto">
        {Object.keys(results).map((platform) => {
          const config = platformIcons[platform];
          const Icon = config.icon;
          const isActive = activeTab === platform;

          return (
            <button
              key={platform}
              onClick={() => {
                console.log('🖱️ Tab clicked:', platform);
                setActiveTab(platform);
              }}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? `${config.color} ${config.bgColor} border-b-2 ${config.borderColor}`
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon size={18} />
              {PLATFORM_LIMITS[platform].name}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <ResultCard platform={activeTab} content={results[activeTab]} />
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { storage } from '../services/storage';
import { User, Save, CheckCircle, Download, Upload, Trash2, Database } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/common/ConfirmModal';

export default function Profile() {
  const [profile, setProfile] = useState(() => storage.get('profile') || {
    name: '',
    bio: '',
    tone: 'professional'
  });
  const [saved, setSaved] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const handleSave = () => {
    storage.save('profile', profile);
    setSaved(true);
    showToast('Profile saved successfully!', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const data = {
      profile: storage.get('profile') || {},
      history: storage.get('history') || []
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recontent-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Data exported successfully!', 'success');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Validate JSON structure
        if (!data.profile && !data.history) {
          showToast('Invalid backup file format', 'error');
          return;
        }

        setImportData(data);
        setShowImportModal(true);
      } catch (err) {
        showToast('Failed to parse JSON file', 'error');
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!importData) return;

    if (importData.profile) {
      storage.save('profile', importData.profile);
      setProfile(importData.profile);
    }
    if (importData.history) {
      storage.save('history', importData.history);
    }

    showToast('Data imported successfully!', 'success');
    setImportData(null);
  };

  const handleClearAll = () => {
    localStorage.clear();
    setProfile({ name: '', bio: '', tone: 'professional' });
    showToast('All data cleared successfully!', 'success');
  };

  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return (total / 1024).toFixed(2);
  };

  return (
    <div className="container mx-auto px-2 md:px-4 py-3 md:py-8 max-w-2xl">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-3">Profile</h1>
        <p className="text-sm md:text-base text-gray-400">
          Personnalisez votre profil pour adapter le ton des générations
        </p>
      </div>

      <div className="bg-slate-800 rounded-lg p-3 md:p-6 border border-slate-700 space-y-3 md:space-y-6">
        {/* Nom */}
        <div>
          <label className="block text-white font-medium mb-2 text-sm md:text-base">
            <User className="inline mr-2" size={16} />
            Nom
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Ex: Marie Dupont"
            className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-white font-medium mb-2">
            Bio (optionnel)
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="Ex: Développeuse full-stack passionnée par le web et l'open source"
            rows={4}
            className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          />
        </div>

        {/* Tone */}
        <div>
          <label className="block text-white font-medium mb-2">
            Ton de communication
          </label>
          <select
            value={profile.tone}
            onChange={(e) => setProfile({ ...profile, tone: e.target.value })}
            className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="casual">Casual - Décontracté et friendly</option>
            <option value="professional">Professional - Professionnel et formel</option>
            <option value="technical">Technical - Technique et précis</option>
          </select>
        </div>

        {/* Bouton Save */}
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-violet-700 transition-all flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <CheckCircle size={20} />
              Profil sauvegardé !
            </>
          ) : (
            <>
              <Save size={20} />
              Sauvegarder
            </>
          )}
        </button>

        {/* Info */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            💡 <strong>Astuce :</strong> Ces informations seront utilisées pour personnaliser
            le ton et le style de vos contenus générés.
          </p>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="mt-6 md:mt-8 bg-slate-800 rounded-lg p-3 md:p-6 border border-slate-700">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Database size={24} />
            Data Management
          </h2>
          <p className="text-gray-400 text-sm">
            Export, import, or clear your data
          </p>
        </div>

        {/* Storage Info */}
        <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Storage Used</span>
            <span className="text-white font-mono font-semibold">{getStorageSize()} KB</span>
          </div>
        </div>

        {/* Export/Import Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 font-medium"
          >
            <Download size={20} />
            Export All Data
          </button>

          <button
            onClick={handleImportClick}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg transition-all duration-200 font-medium"
          >
            <Upload size={20} />
            Import Data
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Clear All */}
        <button
          onClick={() => setShowClearModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-600/30 rounded-lg transition-all duration-200 font-medium"
        >
          <Trash2 size={20} />
          Clear All Data
        </button>

        <p className="text-xs text-gray-500 mt-4">
          ⚠️ Export your data before clearing to prevent data loss
        </p>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportData(null);
        }}
        onConfirm={handleImportConfirm}
        title="Import Data?"
        message="This will replace your current profile and history with the imported data. Make sure you've exported your current data if needed."
        type="warning"
      />

      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearAll}
        title="Clear All Data?"
        message="This action cannot be undone. All your profile settings and history will be permanently deleted."
        type="danger"
      />
    </div>
  );
}

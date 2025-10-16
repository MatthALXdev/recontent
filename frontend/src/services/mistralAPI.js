import axios from 'axios';
import { storage } from './storage';

// URL de l'API backend (via Nginx reverse proxy)
const API_BASE_URL = '/api/recontent';

/**
 * Génère du contenu repurposé pour les plateformes sélectionnées
 * @param {string} content - Le contenu original
 * @param {Array<string>} platforms - Les plateformes cibles ['twitter', 'linkedin', 'devto', 'github', 'newsletter']
 * @returns {Promise<Object>} - Les contenus générés pour chaque plateforme
 */
export async function generateContent(content, platforms) {
  // Récupérer le profil utilisateur depuis le storage local
  const profile = storage.get('profile') || {
    name: '',
    bio: '',
    tone: 'professional'
  };

  try {
    // Appel à VOTRE API backend (pas directement Mistral)
    // La clé API est sécurisée côté serveur
    const response = await axios.post(`${API_BASE_URL}/generate`, {
      content,
      platforms,
      profile
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60s timeout pour génération multi-plateformes
    });

    if (response.data.success) {
      return response.data.results;
    } else {
      throw new Error('API returned unsuccessful response');
    }

  } catch (error) {
    console.error('[mistralAPI] Error generating content:', error);

    // Gestion des erreurs détaillées
    if (error.response) {
      // Erreur HTTP de l'API
      const errorMessage = error.response.data?.error || 'API Error';
      const errorDetails = error.response.data?.details || error.response.data?.message || '';
      throw new Error(`${errorMessage}: ${errorDetails}`);
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      throw new Error('Request timeout: La génération a pris trop de temps. Essayez avec moins de plateformes.');
    } else if (error.request) {
      // Pas de réponse du serveur
      throw new Error('No response from server. Vérifiez votre connexion.');
    } else {
      // Erreur de configuration ou autre
      throw new Error(`Error: ${error.message}`);
    }
  }
}

/**
 * Test de connexion à l'API (health check)
 * @returns {Promise<Object>} - Status de l'API
 */
export async function checkAPIHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error('[mistralAPI] Health check failed:', error);
    throw new Error('API backend non accessible');
  }
}

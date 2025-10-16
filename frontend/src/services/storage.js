/**
 * Service de gestion du LocalStorage
 */
export const storage = {
  /**
   * Sauvegarde des données dans le localStorage
   * @param {string} key - Clé de stockage
   * @param {any} data - Données à sauvegarder
   */
  save: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  },

  /**
   * Récupération des données du localStorage
   * @param {string} key - Clé de stockage
   * @returns {any} - Données récupérées ou null
   */
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error('Failed to get from localStorage:', err);
      return null;
    }
  },

  /**
   * Suppression d'une clé du localStorage
   * @param {string} key - Clé à supprimer
   */
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error('Failed to remove from localStorage:', err);
    }
  }
};

/**
 * Limites de caractères et configurations par plateforme
 */
export const PLATFORM_LIMITS = {
  twitter: {
    chars: 280,
    name: 'X',
    description: 'Thread X - chaque post limité à 280 caractères'
  },
  linkedin: {
    chars: 3000,
    name: 'LinkedIn',
    description: 'Post LinkedIn - limite de 3000 caractères'
  },
  devto: {
    chars: null,
    name: 'Dev.to',
    description: 'Article Dev.to - pas de limite stricte'
  },
  github: {
    chars: null,
    name: 'GitHub',
    description: 'README.md GitHub - pas de limite stricte'
  },
  newsletter: {
    chars: null,
    name: 'Newsletter',
    description: 'Email Newsletter - format optimisé'
  }
};

/**
 * Seuils d'avertissement pour les limites de caractères
 */
export const WARNING_THRESHOLDS = {
  ERROR: 1.0,   // 100% - dépassement
  WARNING: 0.9  // 90% - proche de la limite
};

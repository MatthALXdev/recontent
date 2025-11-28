import { vi } from 'vitest';

// Mock global de console.log pour les tests (éviter la pollution des logs)
global.console = {
  ...console,
  log: vi.fn(),
  error: console.error, // On garde console.error pour le debugging
  warn: console.warn,
};

// Mock dotenv pour tester avec/sans clé API
export const mockEnv = (key, value) => {
  process.env[key] = value;
};

export const clearEnv = (key) => {
  delete process.env[key];
};

export const resetEnv = () => {
  // Restaurer les variables d'environnement par défaut pour les tests
  process.env.MISTRAL_API_KEY = 'test_mock_key_123';
  process.env.API_PORT = '3002';
};

// Helpers pour mocker les réponses Mistral
export const mockMistralSuccess = (content) => {
  return {
    data: {
      choices: [
        {
          message: {
            content: content || 'Mocked Mistral response'
          }
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200
      }
    }
  };
};

export const mockMistralError = (status, message) => {
  const error = new Error(message || 'Mistral API Error');
  error.response = {
    status: status,
    data: { error: message || 'Mistral API Error' }
  };
  return error;
};

export const mockMistralTimeout = () => {
  const error = new Error('Request timeout');
  error.code = 'ECONNABORTED';
  return error;
};

// Mock data pour les tests
export const mockPlatforms = ['twitter', 'linkedin', 'devto'];

export const mockProfile = {
  name: 'Test User',
  bio: 'Software Developer',
  tone: 'professional'
};

export const mockContent = 'This is a test content for repurposing. It needs to be at least 100 characters long to pass validation. This should be enough content for testing purposes.';

// Initialiser l'environnement de test
resetEnv();

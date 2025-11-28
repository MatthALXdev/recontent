import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import MistralService from '../services/mistral.js';

// Mock helpers
// Content must be at least 100 characters to pass validation
const mockContent = 'This is test content about web development and best practices. We will discuss various topics including architecture, testing, and deployment strategies for modern web applications.';
const mockProfile = {
  name: 'Test User',
  bio: 'Developer',
  tone: 'professional'
};

// Créer un mock du service Mistral
const createMockMistralService = (options = {}) => {
  const mockHttpClient = {
    post: vi.fn()
  };

  const service = new MistralService({
    // Utilise hasOwnProperty pour permettre de passer explicitement une string vide
    apiKey: options.hasOwnProperty('apiKey') ? options.apiKey : 'test-api-key',
    httpClient: mockHttpClient
  });

  return { service, mockHttpClient };
};

describe('POST /generate', () => {
  let mockHttpClient;
  let mockService;

  beforeEach(() => {
    const { service, mockHttpClient: client } = createMockMistralService();
    mockService = service;
    mockHttpClient = client;
    app.setMistralService(service);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // TESTS DE VALIDATION DES INPUTS
  // ============================================
  describe('Validation des inputs', () => {
    it('devrait rejeter si content manquant', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ platforms: ['twitter'] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
    });

    it('devrait rejeter si platforms manquant', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ content: mockContent });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('devrait rejeter si platforms est vide', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ content: mockContent, platforms: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('devrait rejeter si platforms n\'est pas un array', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ content: mockContent, platforms: 'twitter' });

      expect(response.status).toBe(400);
    });

    it('devrait accepter profile optionnel', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Mocked response' } }]
        }
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter'],
          profile: mockProfile
        });

      expect(response.status).toBe(200);
    });

    it('devrait fonctionner sans profile', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Mocked response' } }]
        }
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // TESTS DU PROXY MISTRAL AI
  // ============================================
  describe('Appel à Mistral AI', () => {
    it('devrait appeler Mistral avec les bons headers', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Thread Twitter...' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(mockHttpClient.post).toHaveBeenCalled();

      const [url, body, config] = mockHttpClient.post.mock.calls[0];

      expect(url).toBe('https://api.mistral.ai/v1/chat/completions');
      expect(config.headers['Authorization']).toContain('Bearer');
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.timeout).toBe(30000);
    });

    it('devrait utiliser le modèle mistral-small-latest', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const [, body] = mockHttpClient.post.mock.calls[0];
      expect(body.model).toBe('mistral-small-latest');
    });

    it('devrait générer un prompt spécifique pour Twitter', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '1/ Test thread' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const [, body] = mockHttpClient.post.mock.calls[0];
      const prompt = body.messages[0].content;

      expect(prompt).toContain('thread');
      expect(prompt).toContain('280 caractères');
      expect(prompt).toContain(mockContent);
    });

    it('devrait générer un prompt spécifique pour LinkedIn', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'LinkedIn post' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['linkedin']
        });

      const [, body] = mockHttpClient.post.mock.calls[0];
      const prompt = body.messages[0].content;

      expect(prompt).toContain('LinkedIn');
      expect(prompt).toContain('1300 caractères');
    });

    it('devrait générer un prompt spécifique pour Dev.to', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '# Article' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['devto']
        });

      const [, body] = mockHttpClient.post.mock.calls[0];
      const prompt = body.messages[0].content;

      expect(prompt).toContain('Dev.to');
      expect(prompt).toContain('Markdown');
    });

    it('devrait inclure les informations du profil dans le prompt', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter'],
          profile: {
            name: 'John Doe',
            bio: 'Developer advocate',
            tone: 'casual'
          }
        });

      const [, body] = mockHttpClient.post.mock.calls[0];
      const prompt = body.messages[0].content;

      expect(prompt).toContain('John Doe');
      expect(prompt).toContain('Developer advocate');
      expect(prompt).toContain('décontracté');
    });

    it('devrait appeler Mistral plusieurs fois pour plusieurs plateformes', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter', 'linkedin', 'devto']
        });

      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });

    it('devrait utiliser max_tokens adapté pour Dev.to', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Article' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['devto']
        });

      const [, body] = mockHttpClient.post.mock.calls[0];
      expect(body.max_tokens).toBe(2500);
    });

    it('devrait utiliser max_tokens par défaut pour Twitter', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Thread' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const [, body] = mockHttpClient.post.mock.calls[0];
      expect(body.max_tokens).toBe(1200);
    });
  });

  // ============================================
  // TESTS DE RÉPONSE API
  // ============================================
  describe('Réponse de l\'API', () => {
    it('devrait retourner success: true en cas de succès', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response' } }]
        }
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('devrait retourner les résultats pour chaque plateforme', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Generated content' } }]
        }
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter', 'linkedin']
        });

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveProperty('twitter');
      expect(response.body.results).toHaveProperty('linkedin');
    });

    it('devrait retourner le nombre de plateformes traitées', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Content' } }]
        }
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter', 'linkedin', 'devto']
        });

      expect(response.body.platforms_processed).toBe(3);
    });

    it('devrait retourner le contenu généré par Mistral', async () => {
      const generatedContent = '1/ This is a Twitter thread\n2/ Second tweet';
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: generatedContent } }]
        }
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.body.results.twitter).toBe(generatedContent);
    });
  });

  // ============================================
  // TESTS DE GESTION D'ERREURS
  // ============================================
  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs Mistral API', async () => {
      const error = new Error('API Error');
      error.response = {
        status: 401,
        data: { error: 'Invalid API key' }
      };
      mockHttpClient.post.mockRejectedValue(error);

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      // L'erreur est capturée par plateforme, donc on a quand même un 200
      expect(response.status).toBe(200);
      expect(response.body.results.twitter).toHaveProperty('error');
    });

    it('devrait continuer si une plateforme échoue', async () => {
      mockHttpClient.post
        .mockResolvedValueOnce({
          data: {
            choices: [{ message: { content: 'Twitter OK' } }]
          }
        })
        .mockRejectedValueOnce(new Error('Server error'));

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter', 'linkedin']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results.twitter).toBe('Twitter OK');
      expect(response.body.results.linkedin).toHaveProperty('error');
    });

    it('devrait rejeter les plateformes non supportées', async () => {
      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter', 'unknown_platform']
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Invalid platforms');
    });

    it('devrait rejeter si API key non configurée', async () => {
      // Créer un service sans API key
      const { service } = createMockMistralService({ apiKey: '' });
      app.setMistralService(service);

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service configuration error');
    });
  });

  // ============================================
  // TESTS DE PERFORMANCE
  // ============================================
  describe('Performance', () => {
    it('devrait traiter une plateforme rapidement', async () => {
      mockHttpClient.post.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            data: {
              choices: [{ message: { content: 'Fast response' } }]
            }
          }), 50)
        )
      );

      const start = Date.now();

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it('devrait respecter le timeout de 30s pour Mistral', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Content' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const [, , config] = mockHttpClient.post.mock.calls[0];
      expect(config.timeout).toBe(30000);
    });
  });
});

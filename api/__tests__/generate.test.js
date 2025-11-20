import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock axios pour ne pas appeler Mistral réellement (DOIT être avant les imports)
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

import request from 'supertest';
import axios from 'axios';
import app from '../index.js';
import {
  mockMistralSuccess,
  mockMistralError,
  mockMistralTimeout,
  mockContent,
  mockProfile,
  mockPlatforms
} from './helpers/setup.js';

describe('POST /generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body).toHaveProperty('required');
    });

    it('devrait rejeter si platforms manquant', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ content: mockContent });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    it('devrait rejeter si platforms est vide', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ content: mockContent, platforms: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('devrait rejeter si platforms n\'est pas un array', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ content: mockContent, platforms: 'twitter' });

      expect(response.status).toBe(400);
    });

    it('devrait accepter profile optionnel', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Mocked response'));

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
      axios.post.mockResolvedValue(mockMistralSuccess('Mocked response'));

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('devrait retourner un message d\'aide si validation échoue', async () => {
      const response = await request(app)
        .post('/generate')
        .send({});

      expect(response.body).toHaveProperty('required');
      expect(response.body.required).toHaveProperty('content');
      expect(response.body.required).toHaveProperty('platforms');
      expect(response.body.required).toHaveProperty('profile');
    });
  });

  // ============================================
  // TESTS DU PROXY MISTRAL AI
  // ============================================
  describe('Appel à Mistral AI', () => {
    it('devrait appeler Mistral avec les bons headers', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Thread Twitter...'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      // Vérifier que axios.post a été appelé
      expect(axios.post).toHaveBeenCalled();

      const [url, body, config] = axios.post.mock.calls[0];

      expect(url).toBe('https://api.mistral.ai/v1/chat/completions');
      expect(config.headers['Authorization']).toContain('Bearer');
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.timeout).toBe(30000);
    });

    it('devrait utiliser le modèle mistral-small-latest', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Response'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const [, body] = axios.post.mock.calls[0];
      expect(body.model).toBe('mistral-small-latest');
    });

    it('devrait générer un prompt spécifique pour Twitter', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('1/ Test thread'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const [, body] = axios.post.mock.calls[0];
      const prompt = body.messages[0].content;

      expect(prompt).toContain('thread');
      expect(prompt).toContain('280 caractères');
      expect(prompt).toContain('8 à 12 tweets');
      expect(prompt).toContain(mockContent);
    });

    it('devrait générer un prompt spécifique pour LinkedIn', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('LinkedIn post'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['linkedin']
        });

      const [, body] = axios.post.mock.calls[0];
      const prompt = body.messages[0].content;

      expect(prompt).toContain('LinkedIn');
      expect(prompt).toContain('1300 caractères');
    });

    it('devrait générer un prompt spécifique pour Dev.to', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('# Article'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['devto']
        });

      const [, body] = axios.post.mock.calls[0];
      const prompt = body.messages[0].content;

      expect(prompt).toContain('Dev.to');
      expect(prompt).toContain('Markdown');
    });

    it('devrait inclure les informations du profil dans le prompt', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Response'));

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

      const [, body] = axios.post.mock.calls[0];
      const prompt = body.messages[0].content;

      expect(prompt).toContain('John Doe');
      expect(prompt).toContain('Developer advocate');
      expect(prompt).toContain('décontracté');
    });

    it('devrait appeler Mistral plusieurs fois pour plusieurs plateformes', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Response'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter', 'linkedin', 'devto']
        });

      // axios.post devrait être appelé 3 fois (une fois par plateforme)
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    it('devrait utiliser max_tokens adapté pour Dev.to', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Article'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['devto']
        });

      const [, body] = axios.post.mock.calls[0];
      expect(body.max_tokens).toBe(2500); // Plus grand pour les articles
    });

    it('devrait utiliser max_tokens par défaut pour Twitter', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Thread'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const [, body] = axios.post.mock.calls[0];
      expect(body.max_tokens).toBe(1200); // Valeur par défaut
    });
  });

  // ============================================
  // TESTS DE RÉPONSE API
  // ============================================
  describe('Réponse de l\'API', () => {
    it('devrait retourner success: true en cas de succès', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Response'));

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
      axios.post.mockResolvedValue(mockMistralSuccess('Generated content'));

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
      axios.post.mockResolvedValue(mockMistralSuccess('Content'));

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter', 'linkedin', 'devto']
        });

      expect(response.body.platforms_processed).toBe(3);
    });

    it('devrait retourner le contenu généré par Mistral', async () => {
      const mockContent = '1/ This is a Twitter thread\n2/ Second tweet';
      axios.post.mockResolvedValue(mockMistralSuccess(mockContent));

      const response = await request(app)
        .post('/generate')
        .send({
          content: 'Test content',
          platforms: ['twitter']
        });

      expect(response.body.results.twitter).toBe(mockContent);
    });
  });

  // ============================================
  // TESTS DE GESTION D'ERREURS
  // ============================================
  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs Mistral API 401 Unauthorized', async () => {
      axios.post.mockRejectedValue(mockMistralError(401, 'Invalid API key'));

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Mistral API error');
      expect(response.body).toHaveProperty('details');
    });

    it('devrait gérer les erreurs Mistral API 429 Rate Limit', async () => {
      axios.post.mockRejectedValue(mockMistralError(429, 'Rate limit exceeded'));

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Mistral API error');
    });

    it('devrait gérer les timeouts (ECONNABORTED)', async () => {
      axios.post.mockRejectedValue(mockMistralTimeout());

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.status).toBe(504);
      expect(response.body.error).toContain('timeout');
    });

    it('devrait gérer les erreurs réseau (pas de réponse)', async () => {
      const networkError = new Error('Network error');
      networkError.request = {}; // Indique qu'il y a eu une requête mais pas de réponse
      axios.post.mockRejectedValue(networkError);

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('devrait continuer si une plateforme échoue', async () => {
      // Premier appel réussit (Twitter), second échoue (LinkedIn)
      axios.post
        .mockResolvedValueOnce(mockMistralSuccess('Twitter OK'))
        .mockRejectedValueOnce(mockMistralError(500, 'Server error'));

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

    it('devrait logger les erreurs par plateforme', async () => {
      axios.post.mockRejectedValue(new Error('Platform error'));

      const consoleSpy = vi.spyOn(console, 'error');

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      // Vérifier qu'une erreur a été loggée
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('devrait gérer les plateformes non supportées', async () => {
      axios.post.mockResolvedValue(mockMistralSuccess('Content'));

      const consoleSpy = vi.spyOn(console, 'warn');

      const response = await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter', 'unknown_platform']
        });

      expect(response.status).toBe(200);
      expect(response.body.results.unknown_platform).toHaveProperty('error');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown platform')
      );
    });
  });

  // ============================================
  // TESTS DE PERFORMANCE
  // ============================================
  describe('Performance', () => {
    it('devrait traiter une plateforme en moins de 2 secondes', async () => {
      axios.post.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockMistralSuccess('Fast response')), 100)
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
      axios.post.mockResolvedValue(mockMistralSuccess('Content'));

      await request(app)
        .post('/generate')
        .send({
          content: mockContent,
          platforms: ['twitter']
        });

      const [, , config] = axios.post.mock.calls[0];
      expect(config.timeout).toBe(30000);
    });
  });
});

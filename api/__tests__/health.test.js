import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { mockEnv, clearEnv } from './helpers/setup.js';

describe('GET /health', () => {
  describe('Endpoint disponibilité', () => {
    it('devrait retourner status 200', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    it('devrait retourner Content-Type JSON', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Structure de la réponse', () => {
    it('devrait retourner la structure JSON correcte', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('mistral_configured');
    });

    it('devrait retourner status "OK"', async () => {
      const response = await request(app).get('/health');
      expect(response.body.status).toBe('OK');
    });

    it('devrait retourner le nom du service "ReContent API"', async () => {
      const response = await request(app).get('/health');
      expect(response.body.service).toBe('ReContent API');
    });

    it('devrait retourner un timestamp ISO valide', async () => {
      const response = await request(app).get('/health');

      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('devrait retourner un timestamp proche de l\'heure actuelle', async () => {
      const before = new Date();
      const response = await request(app).get('/health');
      const after = new Date();

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Vérification de la clé Mistral API', () => {
    it('devrait indiquer mistral_configured en fonction de la clé disponible', async () => {
      const response = await request(app).get('/health');

      // La clé est configurée dans setup.js (test_mock_key_123)
      // En environnement de test, elle est toujours présente
      expect(response.body.mistral_configured).toBe(true);
      expect(typeof response.body.mistral_configured).toBe('boolean');
    });

    it('devrait retourner un booléen pour mistral_configured', async () => {
      const response = await request(app).get('/health');
      expect(typeof response.body.mistral_configured).toBe('boolean');
    });

    it('devrait vérifier la logique de la clé API', async () => {
      const response = await request(app).get('/health');

      // Le endpoint vérifie que:
      // 1. La clé existe
      // 2. La clé n'est pas la valeur par défaut 'your_mistral_api_key_here'
      // Dans notre test, la clé est 'test_mock_key_123' donc configured = true

      if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY !== 'your_mistral_api_key_here') {
        expect(response.body.mistral_configured).toBe(true);
      } else {
        expect(response.body.mistral_configured).toBe(false);
      }
    });
  });

  describe('Comportement de l\'endpoint', () => {
    it('devrait répondre rapidement (< 100ms)', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('devrait accepter les requêtes GET uniquement', async () => {
      const getResponse = await request(app).get('/health');
      expect(getResponse.status).toBe(200);

      const postResponse = await request(app).post('/health');
      expect(postResponse.status).toBe(404);

      const putResponse = await request(app).put('/health');
      expect(putResponse.status).toBe(404);

      const deleteResponse = await request(app).delete('/health');
      expect(deleteResponse.status).toBe(404);
    });

    it('devrait gérer les requêtes multiples simultanées', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
      });
    });
  });
});

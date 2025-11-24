import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { generateContent, checkAPIHealth } from '../mistralAPI';

// Mock axios
vi.mock('axios');

describe('mistralAPI service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('generateContent', () => {
    it('devrait retourner les résultats en cas de succès', async () => {
      const mockResults = {
        twitter: '1/ Thread content...',
        linkedin: 'LinkedIn post...'
      };

      axios.post.mockResolvedValue({
        data: {
          success: true,
          results: mockResults
        }
      });

      const result = await generateContent('Test content', ['twitter', 'linkedin']);

      expect(result).toEqual(mockResults);
      expect(axios.post).toHaveBeenCalledWith(
        '/api/recontent/generate',
        expect.objectContaining({
          content: 'Test content',
          platforms: ['twitter', 'linkedin']
        }),
        expect.any(Object)
      );
    });

    it('devrait lancer une erreur en cas d\'échec API', async () => {
      axios.post.mockRejectedValue({
        response: {
          data: {
            error: 'API Error',
            details: 'Invalid request'
          }
        }
      });

      await expect(generateContent('Test', ['twitter']))
        .rejects
        .toThrow('API Error');
    });
  });

  describe('checkAPIHealth', () => {
    it('devrait retourner le status de l\'API', async () => {
      const mockHealth = {
        status: 'OK',
        service: 'ReContent API'
      };

      axios.get.mockResolvedValue({ data: mockHealth });

      const result = await checkAPIHealth();

      expect(result).toEqual(mockHealth);
      expect(axios.get).toHaveBeenCalledWith(
        '/api/recontent/health',
        expect.objectContaining({ timeout: 5000 })
      );
    });
  });
});

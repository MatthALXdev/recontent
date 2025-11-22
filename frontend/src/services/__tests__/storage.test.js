import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('storage service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('devrait sauvegarder et récupérer des données', () => {
    const testData = { name: 'Test User', bio: 'Developer' };

    storage.save('profile', testData);
    const result = storage.get('profile');

    expect(result).toEqual(testData);
  });

  it('devrait retourner null pour une clé inexistante', () => {
    const result = storage.get('nonexistent');

    expect(result).toBeNull();
  });

  it('devrait supprimer une clé', () => {
    storage.save('toDelete', { test: true });
    storage.remove('toDelete');
    const result = storage.get('toDelete');

    expect(result).toBeNull();
  });
});

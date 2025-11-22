import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../Home';
import * as mistralAPI from '../../services/mistralAPI';

// Mock mistralAPI
vi.mock('../../services/mistralAPI');

// Mock des composants enfants
vi.mock('../../components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}));

vi.mock('../../components/ResultsTabs', () => ({
  default: ({ results }) => (
    <div data-testid="results-tabs">
      {Object.keys(results).map(key => (
        <div key={key}>{results[key]}</div>
      ))}
    </div>
  )
}));

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('devrait afficher le rendu initial', () => {
    render(<Home />);

    expect(screen.getByText('Repurpose Your Content')).toBeInTheDocument();
    expect(screen.getByText('Target Platforms')).toBeInTheDocument();
    expect(screen.getByText('Your Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate content/i })).toBeInTheDocument();
  });

  it('devrait permettre de sélectionner des plateformes', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const twitterButton = screen.getByRole('button', { name: /x/i });
    await user.click(twitterButton);

    // Vérifier que le bouton a changé de style (classe active)
    expect(twitterButton).toHaveClass('bg-blue-500/20');
  });

  it('devrait permettre de saisir du contenu', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textarea = screen.getByPlaceholderText(/click to expand/i);
    await user.type(textarea, 'Test content for generation');

    expect(textarea).toHaveValue('Test content for generation');
  });

  it('devrait afficher une erreur si contenu trop court', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Sélectionner une plateforme
    await user.click(screen.getByRole('button', { name: /x/i }));

    // Saisir un contenu trop court
    const textarea = screen.getByPlaceholderText(/click to expand/i);
    await user.type(textarea, 'Short');

    // Cliquer sur générer
    await user.click(screen.getByRole('button', { name: /generate content/i }));

    expect(screen.getByText(/100 caractères/i)).toBeInTheDocument();
  });

  it('devrait afficher une erreur si aucune plateforme sélectionnée', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Saisir du contenu suffisant (100+ caractères)
    const textarea = screen.getByPlaceholderText(/click to expand/i);
    const longContent = 'A'.repeat(150);
    await user.type(textarea, longContent);

    // Cliquer sur générer sans plateforme
    await user.click(screen.getByRole('button', { name: /generate content/i }));

    expect(screen.getByText(/sélectionner au moins une plateforme/i)).toBeInTheDocument();
  });

  it('devrait afficher le loading pendant la génération', async () => {
    const user = userEvent.setup();

    // Mock API qui prend du temps
    mistralAPI.generateContent.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ twitter: 'Result' }), 100))
    );

    render(<Home />);

    // Préparer le formulaire
    await user.click(screen.getByRole('button', { name: /x/i }));
    const textarea = screen.getByPlaceholderText(/click to expand/i);
    await user.type(textarea, 'A'.repeat(150));

    // Générer
    await user.click(screen.getByRole('button', { name: /generate content/i }));

    // Vérifier le loading
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // Attendre la fin
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  it('devrait afficher les résultats après génération', async () => {
    const user = userEvent.setup();

    const mockResults = {
      twitter: '1/ Thread about testing...'
    };

    mistralAPI.generateContent.mockResolvedValue(mockResults);

    render(<Home />);

    // Préparer le formulaire
    await user.click(screen.getByRole('button', { name: /x/i }));
    const textarea = screen.getByPlaceholderText(/click to expand/i);
    await user.type(textarea, 'A'.repeat(150));

    // Générer
    await user.click(screen.getByRole('button', { name: /generate content/i }));

    // Attendre les résultats
    await waitFor(() => {
      expect(screen.getByTestId('results-tabs')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CopyButton from '../CopyButton';

// Mock du ToastContext
const mockShowToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast
  })
}));

describe('CopyButton component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait afficher le feedback visuel après clic', async () => {
    const user = userEvent.setup();

    render(<CopyButton text="Test content" />);

    const button = screen.getByRole('button', { name: /copy/i });
    expect(button).not.toBeDisabled();

    await user.click(button);

    // Vérifier que le texte change en "Copied!"
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    // Vérifier que le bouton est disabled après copie
    expect(button).toBeDisabled();

    // Vérifier que le toast a été appelé
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('devrait afficher le bouton avec le texte Copy initialement', () => {
    render(<CopyButton text="Some text" />);

    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });
});

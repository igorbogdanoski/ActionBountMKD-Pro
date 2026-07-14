import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

const generateQuest = vi.hoisted(() => vi.fn());
vi.mock('../utils/aiService', () => ({ generateQuest }));

import { GenerateQuestModal } from '../components/ai/GenerateQuestModal';

beforeEach(() => {
  navigateSpy.mockReset();
  generateQuest.mockReset();
});

function renderModal(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <GenerateQuestModal open onClose={onClose} />
    </MemoryRouter>
  );
  return onClose;
}

describe('GenerateQuestModal', () => {
  it('does not render when closed', () => {
    render(
      <MemoryRouter>
        <GenerateQuestModal open={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the topic field and disables generate until a topic is entered', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Генерирај/ })).toBeDisabled();
  });

  it('navigates to the creator with the generated quest on success', async () => {
    generateQuest.mockResolvedValue({ title: 'Т', description: 'Д', stages: [] });
    const onClose = renderModal();
    fireEvent.change(screen.getByLabelText('Тема'), { target: { value: 'Сончевиот систем' } });
    fireEvent.click(screen.getByRole('button', { name: /Генерирај/ }));

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/creator', { state: { templateData: { title: 'Т', description: 'Д', stages: [] } } }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows an error message and does not navigate when generation fails', async () => {
    generateQuest.mockRejectedValue(new Error('network down'));
    const onClose = renderModal();
    fireEvent.change(screen.getByLabelText('Тема'), { target: { value: 'Сончевиот систем' } });
    fireEvent.click(screen.getByRole('button', { name: /Генерирај/ }));

    await waitFor(() => expect(screen.getByText(/Грешка при генерирање/)).toBeTruthy());
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape (gained from the shared Modal)', () => {
    const onClose = renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

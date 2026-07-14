// BoundCreator.tsx wires useQuestEditor + useAutoSave + StageList/StageEditor
// together but, like MobilePlayer.tsx, had no dedicated test of its own —
// the reducer (useQuestEditor) and the autosave debounce (useAutoSave) each
// have their own tests, but nothing exercised the orchestration connecting
// them: loading a quest, editing it, adding/deleting stages, saving.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Quest } from 'shared';

const navigateSpy = vi.hoisted(() => vi.fn());
const useParamsMock = vi.hoisted(() => vi.fn(() => ({ questId: undefined as string | undefined })));
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateSpy,
  useParams: () => useParamsMock(),
  useLocation: () => ({ state: null }),
}));

const authState = vi.hoisted(() => ({ user: { uid: 'teacher-1' } }));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));

// components/upload/ImageUploader.tsx (pulled in transitively via
// StageEditor -> InfoStageEditor) imports utils/firebase directly, which
// throws auth/invalid-api-key in the test environment.
vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));

const getQuestById = vi.hoisted(() => vi.fn());
const saveQuest = vi.hoisted(() => vi.fn());
vi.mock('../utils/storage', () => ({ getQuestById, saveQuest }));

import { BoundCreator } from '../components/creator/BoundCreator';

function existingQuest(): Quest {
  return {
    id: 'q1',
    creatorId: 'teacher-1',
    title: 'Постоечка авантура',
    description: 'Опис',
    visibility: 'secret',
    playMode: 'singleplayer',
    sequence: 'fixed',
    stages: [{ id: 's1', type: 'INFO', title: 'Прва етапа', description: '', order: 0, mediaType: 'none' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Quest;
}

beforeEach(() => {
  navigateSpy.mockReset();
  useParamsMock.mockReturnValue({ questId: undefined });
  getQuestById.mockReset();
  saveQuest.mockReset().mockResolvedValue(undefined);
});

describe('BoundCreator', () => {
  it('starts a new quest with an empty title and Save disabled', () => {
    render(<BoundCreator />);
    expect(screen.getByPlaceholderText('Наслов на авантурата...')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Зачувај/ })).toBeDisabled();
  });

  it('marks the quest dirty when the title is edited, and saves on manual Save click', async () => {
    render(<BoundCreator />);

    fireEvent.change(screen.getByPlaceholderText('Наслов на авантурата...'), {
      target: { value: 'Нова авантура' },
    });

    expect(screen.getByText('● Незачувано')).toBeTruthy();
    const saveButton = screen.getByRole('button', { name: /Зачувај/ });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(saveQuest).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Нова авантура' })
    ));
  });

  it('loads an existing quest by id and displays its title and stage', async () => {
    useParamsMock.mockReturnValue({ questId: 'q1' });
    getQuestById.mockResolvedValue(existingQuest());

    render(<BoundCreator />);

    expect(await screen.findByDisplayValue('Постоечка авантура')).toBeTruthy();
    expect(screen.getByText('Етапи (1)')).toBeTruthy();
    expect(getQuestById).toHaveBeenCalledWith('q1');
  });

  it('adding a stage from the empty state selects it and opens the stage editor', () => {
    render(<BoundCreator />);

    expect(screen.getByText('Етапи (0)')).toBeTruthy();
    fireEvent.click(screen.getByText('Информација'));

    expect(screen.getByText('Етапи (1)')).toBeTruthy();
    expect(screen.getByText('● Незачувано')).toBeTruthy();
  });

  it('deletes a stage through the confirmation Modal', async () => {
    useParamsMock.mockReturnValue({ questId: 'q1' });
    getQuestById.mockResolvedValue(existingQuest());

    render(<BoundCreator />);
    await screen.findByDisplayValue('Постоечка авантура');
    expect(screen.getByText('Етапи (1)')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Избриши'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Избриши' }));

    expect(screen.getByText('Етапи (0)')).toBeTruthy();
  });
});

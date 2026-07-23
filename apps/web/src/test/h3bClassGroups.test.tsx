import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ClassGroup, Quest } from 'shared';

const getGroups = vi.hoisted(() => vi.fn());
const saveGroup = vi.hoisted(() => vi.fn());
const deleteGroup = vi.hoisted(() => vi.fn());
const getQuests = vi.hoisted(() => vi.fn());
const getQuestResults = vi.hoisted(() => vi.fn());
const downloadClassCertificates = vi.hoisted(() => vi.fn());
const planState = vi.hoisted(() => ({ planId: 'free' }));
const authState = vi.hoisted(() => ({ user: { uid: 'teacher-1' } }));

vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => planState }));
vi.mock('../utils/storage', () => ({ getGroups, saveGroup, deleteGroup, getQuests, getQuestResults }));
vi.mock('../utils/certificate', () => ({ downloadClassCertificates }));

import { ClassGroups } from '../components/dashboard/ClassGroups';

const group: ClassGroup = {
  id: 'group-1',
  ownerId: 'teacher-1',
  name: '6-Б',
  description: 'Morning class',
  students: [{ id: 'student-1', name: 'Ana' }],
  assignedQuestIds: [],
  createdAt: '2026-07-17T00:00:00.000Z',
  updatedAt: '2026-07-17T00:00:00.000Z',
};

const quest = {
  id: 'quest-1',
  title: 'City geometry',
  stages: [],
} as unknown as Quest;

beforeEach(() => {
  planState.planId = 'free';
  getGroups.mockReset();
  getGroups.mockResolvedValue([group]);
  getQuests.mockReset();
  getQuests.mockResolvedValue([quest]);
  saveGroup.mockReset();
  saveGroup.mockResolvedValue(undefined);
  deleteGroup.mockReset();
  deleteGroup.mockResolvedValue(undefined);
  getQuestResults.mockReset();
  getQuestResults.mockResolvedValue([]);
  downloadClassCertificates.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:roster-links');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('H3b ClassGroups controls', () => {
  it('creates and selects a group through an explicitly labelled action', async () => {
    getGroups.mockResolvedValue([]);
    render(<ClassGroups />);
    const input = await screen.findByPlaceholderText('Нова група, напр. 6-в');
    fireEvent.change(input, { target: { value: '  7-А  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создај група' }));

    const selectedGroup = screen.getByRole('button', { name: /7-А/ });
    expect(selectedGroup).toHaveAttribute('aria-pressed', 'true');
    expect(input).toHaveValue('');
    expect(saveGroup).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'teacher-1', name: '7-А' }));
  });

  it('preserves student and quest assignment state as accessible toggles', async () => {
    render(<ClassGroups />);
    const selectedGroup = await screen.findByRole('button', { name: /6-Б/ });
    expect(selectedGroup).toHaveAttribute('aria-pressed', 'true');

    const studentInput = screen.getByPlaceholderText('Име на ученик...');
    fireEvent.change(studentInput, { target: { value: 'Boris' } });
    fireEvent.click(screen.getByRole('button', { name: 'Додај' }));
    expect(screen.getByText('Boris')).toBeInTheDocument();
    expect(saveGroup).toHaveBeenCalledWith(expect.objectContaining({
      students: expect.arrayContaining([expect.objectContaining({ name: 'Boris' })]),
    }));

    const assignment = screen.getByRole('button', { name: /City geometry/ });
    expect(assignment).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(assignment);
    expect(assignment).toHaveAttribute('aria-pressed', 'true');
    expect(saveGroup).toHaveBeenLastCalledWith(expect.objectContaining({ assignedQuestIds: ['quest-1'] }));
  });

  it('exports one roster-bound launch link per student for an assigned quest', async () => {
    getGroups.mockResolvedValue([{ ...group, assignedQuestIds: ['quest-1'] }]);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ClassGroups />);
    await screen.findByRole('button', { name: /6-Б/ });

    fireEvent.change(screen.getByTitle('Избери авантура за индивидуални линкови'), {
      target: { value: 'quest-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Извези индивидуални линкови' }));

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });

  it('requires the app confirmation modal before deleting a group', async () => {
    render(<ClassGroups />);
    await screen.findByRole('button', { name: /6-Б/ });
    fireEvent.click(screen.getByRole('button', { name: 'Избриши група' }));

    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Дали сте сигурни дека сакате да ја избришете оваа група?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Откажи' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteGroup).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Избриши група' }));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Избриши' }));
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledOnce());
    expect(deleteGroup).toHaveBeenCalledWith('group-1');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /6-Б/ })).not.toBeInTheDocument();
    });
  });

  it('reports an empty certificate cohort in-app without invoking a native alert', async () => {
    getGroups.mockResolvedValue([{ ...group, assignedQuestIds: ['quest-1'] }]);
    render(<ClassGroups />);
    await screen.findByRole('button', { name: /6-Б/ });
    fireEvent.change(screen.getByTitle('Избери авантура за сертификати'), { target: { value: 'quest-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сертификати за класа' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Ниту еден ученик/);
    expect(downloadClassCertificates).not.toHaveBeenCalled();
  });
});

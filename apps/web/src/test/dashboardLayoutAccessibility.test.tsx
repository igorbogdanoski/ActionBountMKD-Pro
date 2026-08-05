import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';

const mocks = vi.hoisted(() => ({
  getUserTheme: vi.fn(),
  saveUserTheme: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../utils/storage', () => ({
  getUserTheme: mocks.getUserTheme,
  saveUserTheme: mocks.saveUserTheme,
}));
vi.mock('../utils/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'teacher@example.com' },
    isAdmin: false,
    logout: mocks.logout,
  }),
}));
vi.mock('../hooks/usePlan', () => ({
  usePlan: () => ({ planId: 'free', limits: { maxQuests: 3 } }),
}));

import { DashboardLayout } from '../components/layout/DashboardLayout';

beforeEach(() => {
  mocks.getUserTheme.mockReset().mockResolvedValue('dark');
  mocks.saveUserTheme.mockReset().mockResolvedValue(undefined);
  mocks.logout.mockReset();
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe('DashboardLayout mobile drawer accessibility', () => {
  it('hides the closed drawer from keyboard/AT and restores focus after Escape', async () => {
    render(
      <MemoryRouter>
        <DashboardLayout currentView="settings" onNavigate={() => {}}>
          <p>Содржина</p>
        </DashboardLayout>
      </MemoryRouter>,
    );

    const menu = screen.getByRole('button', { name: 'Отвори мени' });
    const drawer = document.getElementById('app-sidebar-drawer')!;
    const main = screen.getByRole('main');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'app-sidebar-drawer');
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
    expect(drawer).toHaveAttribute('inert');

    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(drawer).not.toHaveAttribute('aria-hidden');
    expect(drawer).not.toHaveAttribute('inert');
    expect(drawer).toHaveAttribute('role', 'dialog');
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(main).toHaveAttribute('inert');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Затвори мени' })).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(drawer).toHaveAttribute('inert');
    expect(main).not.toHaveAttribute('inert');
    await waitFor(() => expect(menu).toHaveFocus());
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  upsertUserProfile: vi.fn(),
  getUserTheme: vi.fn(),
  getUserSettings: vi.fn(),
  saveUserTheme: vi.fn(),
  sendTestPushNotification: vi.fn(),
  changeLanguage: vi.fn(),
  user: { uid: 'u1', email: 'teacher@example.com', displayName: 'Teacher', photoURL: null },
  profile: { uid: 'u1', displayName: 'Teacher', createdAt: '2025-01-02T00:00:00.000Z' },
}));

vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));
vi.mock('firebase/auth', () => ({ updateProfile: mocks.updateProfile }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});
vi.mock('../utils/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.user,
    profile: mocks.profile,
    isAdmin: true,
    logout: mocks.logout,
  }),
}));
vi.mock('../hooks/usePlan', () => ({
  usePlan: () => ({ planId: 'free', limits: { maxQuests: 3, canExportCSV: false, canCollaborate: false } }),
}));
vi.mock('../utils/storage', () => ({
  upsertUserProfile: mocks.upsertUserProfile,
  getUserTheme: mocks.getUserTheme,
  getUserSettings: mocks.getUserSettings,
  saveUserTheme: mocks.saveUserTheme,
}));
vi.mock('../utils/pushNotifications', () => ({ sendTestPushNotification: mocks.sendTestPushNotification }));
vi.mock('../i18n', () => ({
  LANGUAGES: [
    { code: 'mk', label: 'Македонски', flag: '🇲🇰' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ],
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'mk', changeLanguage: mocks.changeLanguage } }),
}));

import { SettingsPage } from '../components/settings/SettingsPage';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  Object.values(mocks).forEach(value => {
    if (typeof value === 'function' && 'mockReset' in value) value.mockReset();
  });
  mocks.getUserTheme.mockResolvedValue('dark');
  mocks.getUserSettings.mockResolvedValue(null);
  mocks.updateProfile.mockResolvedValue(undefined);
  mocks.upsertUserProfile.mockResolvedValue(undefined);
  mocks.saveUserTheme.mockResolvedValue(undefined);
  mocks.sendTestPushNotification.mockResolvedValue(undefined);
  document.documentElement.classList.add('dark');
});

describe('SettingsPage', () => {
  it('switches tabs and preserves selected semantics and navigation actions', async () => {
    await act(async () => { render(<SettingsPage />); });
    const profile = screen.getByRole('button', { name: 'Профил' });
    expect(profile).toHaveAttribute('aria-pressed', 'true');
    expect(profile.className).toContain('!rounded-none');
    expect(profile.className).toContain('border-b-2');

    fireEvent.click(screen.getByRole('button', { name: 'Изглед' }));
    expect(screen.getByRole('button', { name: 'Изглед' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Сметка' }));
    const upgrade = screen.getByRole('button', { name: /Надгради/ });
    expect(upgrade.className).toContain('!p-0');
    expect(upgrade.className).toContain('!text-xs');
    expect(upgrade.className).toContain('text-indigo-400');
    fireEvent.click(upgrade);
    expect(mocks.navigate).toHaveBeenCalledWith('/pricing');

    fireEvent.click(profile);
    const admin = screen.getByRole('button', { name: /Admin панел/ });
    expect(admin.className).toContain('w-full');
    expect(admin.className).toContain('!justify-between');
    expect(admin.className).toContain('bg-indigo-500/5');
    fireEvent.click(admin);
    expect(mocks.navigate).toHaveBeenCalledWith('/admin');
  });

  it('keeps save disabled until the name changes and shows the saved state after success', async () => {
    const pending = deferred<void>();
    mocks.updateProfile.mockReturnValue(pending.promise);
    render(<SettingsPage />);
    const save = screen.getByRole('button', { name: 'Зачувај' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Teacher' } });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith(expect.anything(), { displayName: 'New Teacher' }));
    expect(save).toBeDisabled();
    expect(save.querySelector('.animate-spin')).toBeTruthy();
    await act(async () => { pending.resolve(); await pending.promise; });
    expect(await screen.findByText('Зачувано')).toBeTruthy();
  });

  it('reports display-name failures and restores the save action', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.updateProfile.mockRejectedValue(new Error('offline'));
    render(<SettingsPage />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Teacher' } });
    fireEvent.click(screen.getByRole('button', { name: 'Зачувај' }));
    expect(await screen.findByText(/Не успеа зачувувањето/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Зачувај' })).not.toBeDisabled();
    consoleError.mockRestore();
  });

  it('persists theme choice and changes language from the appearance tab', async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Изглед' }));
    fireEvent.click(screen.getByRole('button', { name: 'Темна' }));
    await waitFor(() => expect(mocks.saveUserTheme).toHaveBeenCalledWith('u1', 'light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    const activeLanguage = screen.getByTitle('Македонски');
    expect(activeLanguage.className).toContain('bg-indigo-600');
    expect(activeLanguage.className).toContain('!text-xs');
    fireEvent.click(screen.getByTitle('English'));
    expect(mocks.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('covers disabled, registered-device error, success and logout account actions', async () => {
    const { unmount } = render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Сметка' }));
    expect(screen.getByRole('button', { name: /Испрати тест push/ })).toBeDisabled();
    const logout = screen.getByRole('button', { name: 'Одјави се' });
    expect(logout.className).toContain('text-red-400');
    expect(logout.className).toContain('!p-0');
    expect(logout.className).not.toContain('bg-rose-600');
    fireEvent.click(logout);
    expect(mocks.logout).toHaveBeenCalledOnce();
    unmount();

    mocks.getUserSettings.mockResolvedValue({
      expoPushToken: 'ExponentPushToken[test]',
      notificationsEnabled: true,
      notificationPermissionStatus: 'granted',
      notificationError: 'Push failed',
    });
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Сметка' }));
    const push = await screen.findByRole('button', { name: /Испрати тест push/ });
    await waitFor(() => expect(push).not.toBeDisabled());
    expect(screen.getByText('Push failed')).toBeTruthy();
    fireEvent.click(push);
    await waitFor(() => expect(mocks.sendTestPushNotification).toHaveBeenCalledWith('ExponentPushToken[test]'));
    await waitFor(() => expect(screen.queryByText('Push failed')).toBeNull());
  });

  it('disables push with a shared spinner while pending, then restores it after success', async () => {
    const pending = deferred<void>();
    mocks.getUserSettings.mockResolvedValue({
      expoPushToken: 'ExponentPushToken[test]', notificationsEnabled: true, notificationPermissionStatus: 'granted',
    });
    mocks.sendTestPushNotification.mockReturnValue(pending.promise);
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Сметка' }));
    const push = await screen.findByRole('button', { name: /Испрати тест push/ });
    await waitFor(() => expect(push).not.toBeDisabled());
    fireEvent.click(push);
    await waitFor(() => expect(push).toBeDisabled());
    expect(push.querySelector('.animate-spin')).toBeTruthy();
    await act(async () => { pending.resolve(); await pending.promise; });
    await waitFor(() => expect(push).not.toBeDisabled());
  });

  it('renders a live rejected push-send error and re-enables retry', async () => {
    mocks.getUserSettings.mockResolvedValue({
      expoPushToken: 'ExponentPushToken[test]', notificationsEnabled: true, notificationPermissionStatus: 'granted',
    });
    mocks.sendTestPushNotification.mockRejectedValue(new Error('Push delivery failed'));
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Сметка' }));
    const push = await screen.findByRole('button', { name: /Испрати тест push/ });
    await waitFor(() => expect(push).not.toBeDisabled());
    fireEvent.click(push);
    expect(await screen.findByText('Push delivery failed')).toBeTruthy();
    expect(push).not.toBeDisabled();
  });
});

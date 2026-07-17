import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

const authState = vi.hoisted(() => ({
  user: { email: 'nastavnik@example.com' } as { email: string } | null,
  isAdmin: false,
  logout: vi.fn(),
}));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));

const planState = vi.hoisted(() => ({ planId: 'free', limits: { maxQuests: 3 } }));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => planState }));

import { Sidebar } from '../components/layout/Sidebar';

beforeEach(() => {
  navigateSpy.mockReset();
  authState.isAdmin = false;
  authState.logout.mockReset();
  planState.planId = 'free';
});

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  const onNavigate = props.onNavigate ?? vi.fn();
  render(
    <MemoryRouter>
      <Sidebar currentView="dashboard" onNavigate={onNavigate} {...props} />
    </MemoryRouter>
  );
  return { onNavigate };
}

describe('Sidebar', () => {
  it('renders the Help link as a real mailto contact, not a dead button', () => {
    renderSidebar();
    const help = screen.getByText('Помош').closest('a');
    expect(help).not.toBeNull();
    expect(help?.getAttribute('href')).toBe('mailto:igor.bogdanoski@mismath.net');
  });

  it('does not show the admin panel link for non-admin users', () => {
    renderSidebar();
    expect(screen.queryByText('Admin панел')).toBeNull();
  });

  it('shows the admin panel link for admin users', () => {
    authState.isAdmin = true;
    renderSidebar();
    expect(screen.getByText('Admin панел')).toBeTruthy();
  });

  it('marks the active navigation item and preserves navigation callbacks', () => {
    const { onNavigate } = renderSidebar();
    const navButtons = within(screen.getByRole('navigation')).getAllByRole('button');
    expect(navButtons).toHaveLength(6);
    expect(navButtons[0]).toHaveAttribute('aria-current', 'page');
    navButtons.slice(1).forEach(button => expect(button).not.toHaveAttribute('aria-current'));

    fireEvent.click(navButtons[1]);
    expect(onNavigate).toHaveBeenCalledWith('creator');
  });

  it('keeps language and theme controls explicit and interactive', () => {
    const onToggleTheme = vi.fn();
    renderSidebar({ onToggleTheme });
    const languageButtons = screen.getAllByRole('button').filter(button => button.hasAttribute('aria-pressed'));
    expect(languageButtons).toHaveLength(2);
    languageButtons.forEach(button => expect(button).toHaveAttribute('type', 'button'));

    const theme = screen.getAllByRole('button').find(button => button.querySelector('svg.lucide-sun'))!;
    fireEvent.click(theme);
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });

  it('preserves upgrade, explore, admin and logout actions', () => {
    authState.isAdmin = true;
    const { container } = render(
      <MemoryRouter>
        <Sidebar currentView="dashboard" onNavigate={() => {}} />
      </MemoryRouter>,
    );

    fireEvent.click(container.querySelector('svg.lucide-zap')!.closest('button')!);
    expect(navigateSpy).toHaveBeenCalledWith('/pricing');
    fireEvent.click(container.querySelector('svg.lucide-compass')!.closest('button')!);
    expect(navigateSpy).toHaveBeenCalledWith('/explore');
    fireEvent.click(container.querySelector('svg.lucide-shield')!.closest('button')!);
    expect(navigateSpy).toHaveBeenCalledWith('/admin');
    fireEvent.click(container.querySelector('svg.lucide-log-out')!.closest('button')!);
    expect(authState.logout).toHaveBeenCalledOnce();
  });
});

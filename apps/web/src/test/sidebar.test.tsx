import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  planState.planId = 'free';
});

function renderSidebar() {
  render(
    <MemoryRouter>
      <Sidebar currentView="dashboard" onNavigate={vi.fn()} />
    </MemoryRouter>
  );
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
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/SEO', () => ({ SEO: () => null }));

import { ChangelogPage } from '../components/changelog/ChangelogPage';
import { Footer } from '../components/layout/Footer';

describe('ChangelogPage', () => {
  it('renders dated releases as accessible articles', () => {
    render(
      <MemoryRouter>
        <ChangelogPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Новости во Авантура' })).toBeInTheDocument();
    const releases = screen.getAllByRole('article');
    expect(releases).toHaveLength(3);
    expect(within(releases[0]).getByText('23 јули 2026')).toBeInTheDocument();
    expect(within(releases[0]).getAllByRole('listitem')).toHaveLength(3);
  });

  it('exposes the changelog from the shared footer navigation', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Новости' })).toHaveAttribute('href', '/changelog');
  });
});

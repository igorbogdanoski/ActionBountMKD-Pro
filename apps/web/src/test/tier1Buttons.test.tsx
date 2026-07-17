import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.hoisted(() => vi.fn());
const planState = vi.hoisted(() => ({
  planId: 'free' as const,
  can: vi.fn(() => false),
  limits: {},
}));
const getPublicQuests = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('../hooks/usePlan', () => ({ usePlan: () => planState }));
vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
vi.mock('../utils/storage', () => ({ getPublicQuests }));
vi.mock('../utils/errorReporting', () => ({ captureError: vi.fn() }));
vi.mock('../components/SEO', () => ({ SEO: () => null, BreadcrumbSchema: () => null }));
vi.mock('../components/layout/Footer', () => ({ Footer: () => null }));

import { PlanGate } from '../components/PlanGate';
import { ImageUploader } from '../components/upload/ImageUploader';
import { TrackUploader } from '../components/upload/TrackUploader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ExplorePage } from '../components/explore/ExplorePage';

beforeEach(() => {
  navigate.mockReset();
  planState.can.mockReset();
  planState.can.mockReturnValue(false);
  getPublicQuests.mockReset();
});

describe('Tier 1 Button migrations', () => {
  it('keeps the PlanGate upgrade control as a non-submit button and navigates to pricing', () => {
    render(
      <MemoryRouter>
        <PlanGate feature="canExportCSV"><div>protected</div></PlanGate>
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: /надгради план/i });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(navigate).toHaveBeenCalledWith('/pricing');
  });

  it('keeps the ImageUploader URL action and saves a trimmed URL', () => {
    const onChange = vi.fn();
    render(<ImageUploader onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'URL' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  https://example.test/image.png  ' } });
    const save = screen.getByRole('button', { name: 'OK' });
    expect(save).toHaveAttribute('type', 'button');
    fireEvent.click(save);

    expect(onChange).toHaveBeenCalledWith('https://example.test/image.png');
  });

  it('removes an ImageUploader preview without opening the file picker', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ImageUploader value="https://example.test/image.png" onChange={onChange} />,
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const pickerClick = vi.spyOn(fileInput, 'click');

    fireEvent.click(screen.getAllByRole('button').find(button => button.getAttribute('aria-label'))!);

    expect(onChange).toHaveBeenCalledWith('');
    expect(pickerClick).not.toHaveBeenCalled();
  });

  it('keeps the TrackUploader remove control isolated from the upload zone', () => {
    const onChange = vi.fn();
    render(
      <TrackUploader
        points={[
          { latitude: 41.99, longitude: 21.43 },
          { latitude: 42, longitude: 21.44 },
        ]}
        trackName="route.gpx"
        onChange={onChange}
      />,
    );

    const remove = screen.getByRole('button', { name: /отстрани рута/i });
    expect(remove).toHaveAttribute('type', 'button');
    fireEvent.click(remove);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('resets ErrorBoundary state and renders its children again', () => {
    let shouldThrow = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function CrashOnce() {
      if (shouldThrow) throw new Error('boom');
      return <div>recovered content</div>;
    }

    render(
      <ErrorBoundary>
        <CrashOnce />
      </ErrorBoundary>,
    );
    expect(screen.getByText('boom')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('recovered content')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('clears ExplorePage filters through the migrated link-like action', async () => {
    getPublicQuests.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>,
    );

    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'history' } });
    const clear = await screen.findByRole('button');
    fireEvent.click(clear);

    await waitFor(() => expect(search).toHaveValue(''));
  });
});

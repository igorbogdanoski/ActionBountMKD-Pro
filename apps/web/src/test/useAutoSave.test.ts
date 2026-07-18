import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../components/creator/hooks/useAutoSave';
import type { Quest } from 'shared';

const saveQuest = vi.hoisted(() => vi.fn());
vi.mock('../utils/storage', () => ({ saveQuest }));

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'q1',
    creatorId: 'u1',
    title: 'Т',
    description: 'Д',
    stages: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Quest;
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveQuest.mockReset();
  });

  it('debounces the save and clears the dirty flag on success', async () => {
    saveQuest.mockResolvedValue(undefined);
    const onSaved = vi.fn();
    const { result } = renderHook(() => useAutoSave(makeQuest(), true, onSaved));

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(saveQuest).toHaveBeenCalledOnce();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
    expect(result.current.lastSaved).not.toBeNull();
  });

  it('surfaces a visible error instead of failing silently when the save rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    saveQuest.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useAutoSave(makeQuest(), true, vi.fn()));

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(result.current.error).not.toBeNull();
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(consoleError).toHaveBeenCalledWith('[AutoSave]', expect.any(Error));
    consoleError.mockRestore();
  });

  it('retry() re-attempts the save and clears the error on success', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    saveQuest.mockRejectedValueOnce(new Error('network down'));
    saveQuest.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAutoSave(makeQuest(), true, vi.fn()));

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.error).not.toBeNull();

    await act(async () => { await result.current.retry(); });

    expect(result.current.error).toBeNull();
    expect(result.current.lastSaved).not.toBeNull();
    expect(saveQuest).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('never saves when creatorId is missing', async () => {
    renderHook(() => useAutoSave(makeQuest({ creatorId: '' }), true, vi.fn()));
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(saveQuest).not.toHaveBeenCalled();
  });

  it('suspends pending saves and waits for an in-flight save before destructive work continues', async () => {
    let resolveSave!: () => void;
    saveQuest.mockImplementation(() => new Promise<void>(resolve => { resolveSave = resolve; }));
    const { result } = renderHook(() => useAutoSave(makeQuest(), false, vi.fn()));

    let retryPromise!: Promise<void>;
    act(() => { retryPromise = result.current.retry(); });
    expect(saveQuest).toHaveBeenCalledOnce();

    let suspended = false;
    const suspendPromise = result.current.suspend().then(() => { suspended = true; });
    await Promise.resolve();
    expect(suspended).toBe(false);

    resolveSave();
    await act(async () => { await Promise.all([retryPromise, suspendPromise]); });
    expect(suspended).toBe(true);

    await act(async () => { await result.current.retry(); });
    expect(saveQuest).toHaveBeenCalledOnce();
  });

  it('does not clear a newer dirty edit when an older in-flight snapshot finishes', async () => {
    let resolveSave!: () => void;
    saveQuest.mockImplementation(() => new Promise<void>(resolve => { resolveSave = resolve; }));
    const onSaved = vi.fn();
    const firstQuest = makeQuest({ title: 'Прва верзија', updatedAt: '2026-07-18T10:00:00.000Z' });
    const { result, rerender } = renderHook(
      ({ quest }) => useAutoSave(quest, true, onSaved),
      { initialProps: { quest: firstQuest } },
    );

    let savePromise!: Promise<void>;
    act(() => { savePromise = result.current.retry(); });
    rerender({ quest: makeQuest({ title: 'Понова верзија', updatedAt: '2026-07-18T10:00:01.000Z' }) });
    resolveSave();
    await act(async () => { await savePromise; });

    expect(saveQuest).toHaveBeenCalledWith(firstQuest);
    expect(onSaved).not.toHaveBeenCalled();
  });
});

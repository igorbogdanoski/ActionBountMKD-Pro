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

  // A new adventure starts untitled, and the /quests rule requires 1–200
  // characters. Sending it anyway comes back as a permission error the teacher
  // cannot act on, so the hook reports what is missing and writes nothing.
  it('reports a missing title instead of attempting a write the rule refuses', async () => {
    const { result } = renderHook(() => useAutoSave(makeQuest({ title: '' }), true, vi.fn()));

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(saveQuest).not.toHaveBeenCalled();
    expect(result.current.blocker).toBe('missing-title');
    expect(result.current.error).toBeNull();
  });

  it('treats a whitespace-only title as missing', async () => {
    const { result } = renderHook(() => useAutoSave(makeQuest({ title: '   ' }), true, vi.fn()));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(saveQuest).not.toHaveBeenCalled();
    expect(result.current.blocker).toBe('missing-title');
  });

  it('reports an overlong title and refuses the write', async () => {
    const { result } = renderHook(() => useAutoSave(makeQuest({ title: 'x'.repeat(201) }), true, vi.fn()));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(saveQuest).not.toHaveBeenCalled();
    expect(result.current.blocker).toBe('title-too-long');
  });

  it('retry() writes nothing while the title is missing', async () => {
    const { result } = renderHook(() => useAutoSave(makeQuest({ title: '' }), true, vi.fn()));
    let saved!: boolean;
    await act(async () => { saved = await result.current.retry(); });
    expect(saved).toBe(false);
    expect(saveQuest).not.toHaveBeenCalled();
  });

  it('saves as soon as a title is typed into a previously blocked quest', async () => {
    saveQuest.mockResolvedValue(undefined);
    const titled = makeQuest({ title: 'Прошетка низ чаршија' });
    const { result, rerender } = renderHook(({ quest }) => useAutoSave(quest, true, vi.fn()), {
      initialProps: { quest: makeQuest({ title: '' }) },
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(saveQuest).not.toHaveBeenCalled();

    rerender({ quest: titled });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(saveQuest).toHaveBeenCalledOnce();
    expect(saveQuest).toHaveBeenCalledWith(titled);
    expect(result.current.blocker).toBeNull();
  });

  it('suspends pending saves and waits for an in-flight save before destructive work continues', async () => {
    let resolveSave!: () => void;
    saveQuest.mockImplementation(() => new Promise<void>(resolve => { resolveSave = resolve; }));
    const { result } = renderHook(() => useAutoSave(makeQuest(), false, vi.fn()));

    let retryPromise!: Promise<boolean>;
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

    let savePromise!: Promise<boolean>;
    act(() => { savePromise = result.current.retry(); });
    rerender({ quest: makeQuest({ title: 'Понова верзија', updatedAt: '2026-07-18T10:00:01.000Z' }) });
    resolveSave();
    await act(async () => { await savePromise; });

    expect(saveQuest).toHaveBeenCalledWith(firstQuest);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('restarts the debounce when the quest changes while it is already dirty', async () => {
    saveQuest.mockResolvedValue(undefined);
    const onSaved = vi.fn();
    const firstQuest = makeQuest({ title: 'Прва верзија' });
    const secondQuest = makeQuest({ title: 'Понова верзија' });
    const { rerender } = renderHook(
      ({ quest }) => useAutoSave(quest, true, onSaved),
      { initialProps: { quest: firstQuest } },
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    rerender({ quest: secondQuest });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(saveQuest).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1400); });
    expect(saveQuest).toHaveBeenCalledOnce();
    expect(saveQuest).toHaveBeenCalledWith(secondQuest);
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it('saves the latest edit after its debounce expires during an older write', async () => {
    let finish!: () => void;
    saveQuest.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    saveQuest.mockResolvedValueOnce(undefined);
    const onSaved = vi.fn();
    const first = makeQuest({ title: 'First' });
    const latest = makeQuest({ title: 'Latest' });
    const { rerender } = renderHook(({ quest }) => useAutoSave(quest, true, onSaved), {
      initialProps: { quest: first },
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    rerender({ quest: latest });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saveQuest).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
    expect(saveQuest).toHaveBeenCalledTimes(2);
    expect(saveQuest).toHaveBeenLastCalledWith(latest);
    expect(onSaved).toHaveBeenCalledOnce();
  });

});

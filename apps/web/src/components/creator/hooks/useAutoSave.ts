import { useCallback, useEffect, useRef, useState } from 'react';
import { saveQuest } from '../../../utils/storage';
import { questSaveBlocker } from 'shared';
import type { Quest } from 'shared';

export function useAutoSave(quest: Quest, isDirty: boolean, onSaved: () => void) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const suspendedRef = useRef(false);
  const questRef = useRef(quest);
  const savedQuestRef = useRef<Quest | null>(null);
  questRef.current = quest;

  const doSave = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // A quest the rule will refuse is never sent: the rejection comes back as a
    // permission error that says nothing a teacher can act on.
    if (suspendedRef.current || !questRef.current.creatorId) return false;
    if (questSaveBlocker(questRef.current)) return false;
    if (inFlightRef.current) {
      const pendingSnapshot = questRef.current;
      const succeeded = await inFlightRef.current;
      if (!succeeded || suspendedRef.current) return false;
      if (pendingSnapshot === savedQuestRef.current && questRef.current === pendingSnapshot) return true;
      return doSave();
    }
    setSaving(true);
    const questToSave = questRef.current;
    const operation = (async () => {
      try {
        await saveQuest(questToSave);
        savedQuestRef.current = questToSave;
        setLastSaved(new Date());
        setError(null);
        if (questRef.current === questToSave) onSaved();
        return true;
      } catch (err) {
        console.error('[AutoSave]', err);
        setError('Не успеа зачувувањето. Провери ја интернет врската и обиди се повторно.');
        return false;
      } finally {
        setSaving(false);
      }
    })();
    inFlightRef.current = operation;
    const succeeded = await operation;
    if (inFlightRef.current === operation) inFlightRef.current = null;
    return succeeded && questRef.current === questToSave;
  }, [onSaved]);

  const suspend = useCallback(async () => {
    suspendedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await inFlightRef.current;
  }, []);

  const blocker = questSaveBlocker(quest);

  useEffect(() => {
    // Never save if creatorId is missing, or while the quest is still short of
    // what the rule requires — Firestore rejects both as a permissions error.
    if (suspendedRef.current || !isDirty || !questRef.current.creatorId || blocker) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(doSave, 2000); // 2s debounce

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isDirty, quest, doSave, blocker]); // restart the debounce for every editor snapshot

  return { lastSaved, saving, error, blocker, retry: doSave, suspend };
}

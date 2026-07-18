import { useCallback, useEffect, useRef, useState } from 'react';
import { saveQuest } from '../../../utils/storage';
import type { Quest } from 'shared';

export function useAutoSave(quest: Quest, isDirty: boolean, onSaved: () => void) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const suspendedRef = useRef(false);
  const questRef = useRef(quest);
  questRef.current = quest;

  const doSave = useCallback(async () => {
    if (suspendedRef.current) return;
    if (inFlightRef.current) return inFlightRef.current;
    setSaving(true);
    const questToSave = questRef.current;
    const operation = (async () => {
      try {
        await saveQuest(questToSave);
        setLastSaved(new Date());
        setError(null);
        if (questRef.current === questToSave) onSaved();
      } catch (err) {
        console.error('[AutoSave]', err);
        setError('Не успеа зачувувањето. Провери ја интернет врската и обиди се повторно.');
      } finally {
        setSaving(false);
      }
    })();
    inFlightRef.current = operation;
    await operation;
    if (inFlightRef.current === operation) inFlightRef.current = null;
  }, [onSaved]);

  const suspend = useCallback(async () => {
    suspendedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await inFlightRef.current;
  }, []);

  useEffect(() => {
    // Never save if creatorId is missing — Firestore will reject with permissions error
    if (suspendedRef.current || !isDirty || !questRef.current.creatorId) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(doSave, 2000); // 2s debounce

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isDirty, quest.updatedAt, doSave]); // trigger on quest change

  return { lastSaved, saving, error, retry: doSave, suspend };
}

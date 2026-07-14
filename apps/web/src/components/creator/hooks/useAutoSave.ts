import { useCallback, useEffect, useRef, useState } from 'react';
import { saveQuest } from '../../../utils/storage';
import type { Quest } from 'shared';

export function useAutoSave(quest: Quest, isDirty: boolean, onSaved: () => void) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questRef = useRef(quest);
  questRef.current = quest;

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveQuest(questRef.current);
      setLastSaved(new Date());
      setError(null);
      onSaved();
    } catch (err) {
      console.error('[AutoSave]', err);
      setError('Не успеа зачувувањето. Провери ја интернет врската и обиди се повторно.');
    } finally {
      setSaving(false);
    }
  }, [onSaved]);

  useEffect(() => {
    // Never save if creatorId is missing — Firestore will reject with permissions error
    if (!isDirty || !questRef.current.creatorId) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(doSave, 2000); // 2s debounce

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isDirty, quest.updatedAt, doSave]); // trigger on quest change

  return { lastSaved, saving, error, retry: doSave };
}

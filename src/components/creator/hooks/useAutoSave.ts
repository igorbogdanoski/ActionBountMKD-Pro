import { useEffect, useRef, useState } from 'react';
import { saveQuest } from '../../../utils/storage';
import type { Quest } from '../../../types';

export function useAutoSave(quest: Quest, isDirty: boolean, onSaved: () => void) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questRef = useRef(quest);
  questRef.current = quest;

  useEffect(() => {
    // Never save if creatorId is missing — Firestore will reject with permissions error
    if (!isDirty || !questRef.current.creatorId) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await saveQuest(questRef.current);
        setLastSaved(new Date());
        onSaved();
      } catch (err) {
        console.error('[AutoSave]', err);
      } finally {
        setSaving(false);
      }
    }, 2000); // 2s debounce

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isDirty, quest.updatedAt]); // trigger on quest change

  return { lastSaved, saving };
}

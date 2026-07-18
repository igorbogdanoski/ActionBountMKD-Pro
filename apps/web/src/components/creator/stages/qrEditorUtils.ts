import { useEffect, useRef, useState } from 'react';

export type CopyStatus = 'idle' | 'success' | 'error';

export function useClipboardFeedback(resetAfterMs = 2000) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const copy = async (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setStatus('success');
    } catch {
      setStatus('error');
    }
    timerRef.current = setTimeout(() => setStatus('idle'), resetAfterMs);
  };

  return { status, copy };
}

export function downloadSvgById(svgId: string, filename: string) {
  const svg = document.getElementById(svgId);
  if (!svg) return false;
  const svgData = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml' }));
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}

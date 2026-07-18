import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ShareModalProps {
  questId: string;
  questTitle: string;
  publicLeaderboard?: boolean;
  onClose: () => void;
}

interface CopyRowProps {
  label: string;
  url: string;
  inputTitle?: string;
  buttonLabel?: string;
  tone?: 'indigo' | 'amber';
}

function CopyRow({ label, url, inputTitle = label, buttonLabel = 'Копирај', tone = 'indigo' }: CopyRowProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
    }
  };

  const isAmber = tone === 'amber';
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        {isAmber && <Trophy className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />}
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      </div>
      <div className="flex min-w-0 gap-2">
        <input
          type="text"
          readOnly
          title={inputTitle}
          value={url}
          className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm text-slate-600 focus:outline-none ${isAmber ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}`}
        />
        <Button
          type="button"
          variant={isAmber ? undefined : 'app-primary'}
          size={isAmber ? 'icon' : 'sm'}
          colorClassName={isAmber ? 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500' : undefined}
          aria-label={isAmber ? buttonLabel : undefined}
          onClick={handleCopy}
          className={isAmber ? 'shrink-0' : 'min-w-[100px] shrink-0'}
          leftIcon={copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        >
          {isAmber ? null : copyState === 'copied' ? 'Копирано' : buttonLabel}
        </Button>
      </div>
      <span className={copyState === 'error' ? 'mt-1 block text-xs font-medium text-rose-600' : 'sr-only'} role="status" aria-live="polite">
        {copyState === 'copied' ? `Линкот „${label}“ е копиран` : copyState === 'error' ? 'Копирањето не успеа. Означете го и копирајте го линкот рачно.' : ''}
      </span>
    </div>
  );
}

export function ShareModal({ questId, questTitle, publicLeaderboard, onClose }: ShareModalProps) {
  const questUrl = `${window.location.origin}/play/${questId}`;
  const leaderboardUrl = `${window.location.origin}/leaderboard/${questId}`;

  return (
    <Modal open onClose={onClose} title="Сподели Авантура">
      <div className="flex flex-col items-center gap-5">
        <h4 className="text-lg font-bold text-slate-800 text-center">{questTitle}</h4>
        <p className="text-sm text-slate-500 text-center -mt-3">Скенирајте го QR кодот или споделете го линкот.</p>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <QRCodeSVG value={questUrl} size={200} />
        </div>

        <CopyRow label="Линк за игра" url={questUrl} />

        {publicLeaderboard && <CopyRow label="Јавна табела со резултати" inputTitle="Линк за јавна табела" buttonLabel="Копирај линк за табела" url={leaderboardUrl} tone="amber" />}
      </div>
    </Modal>
  );
}

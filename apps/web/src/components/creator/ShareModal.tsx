import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../ui/Modal';

interface ShareModalProps {
  questId: string;
  questTitle: string;
  publicLeaderboard?: boolean;
  onClose: () => void;
}

function CopyRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          title={label}
          value={url}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 min-w-[100px] justify-center"
        >
          {copied ? <><Check className="w-4 h-4" /> Копирано</> : <><Copy className="w-4 h-4" /> Копирај</>}
        </button>
      </div>
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

        {publicLeaderboard && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Јавна табела со резултати</label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                title="Линк за јавна табела"
                value={leaderboardUrl}
                className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Копирај линк за табела"
                onClick={() => { navigator.clipboard.writeText(leaderboardUrl); }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

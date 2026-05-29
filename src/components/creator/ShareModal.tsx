import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ShareModalProps {
  questId: string;
  questTitle: string;
  onClose: () => void;
}

export function ShareModal({ questId, questTitle, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const questUrl = `${window.location.origin}/play/${questId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(questUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Сподели Авантура</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center">
          <h4 className="text-lg font-bold text-slate-800 text-center mb-2">{questTitle}</h4>
          <p className="text-sm text-slate-500 text-center mb-6">Скенирајте го овој QR код со мобилниот телефон за да започнете со играње.</p>
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
            <QRCodeSVG value={questUrl} size={200} />
          </div>
          
          <div className="w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Или сподели линк:</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={questUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button 
                onClick={handleCopy}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 min-w-[100px] justify-center"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Копирано
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Копирај
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

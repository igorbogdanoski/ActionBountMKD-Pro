import type { ScanCodeStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';

interface Props {
  stage: ScanCodeStage;
  isNightMode: boolean;
  scanError: string | null;
}

/** The actual QR scanner attaches to the #reader div via html5-qrcode,
 * wired up in a separate effect in MobilePlayer — this component only
 * owns the surrounding UI/messaging. */
export function ScanCodeStagePlayer({ stage, isNightMode, scanError }: Props) {
  return (
    <div className="flex-1 flex flex-col p-6 items-center justify-center text-center">
      <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>{stage.title}</h2>
      <MathRenderer text={stage.description} className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-4`} />

      {scanError && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold w-full mb-4 animate-pulse">
          {scanError}
        </div>
      )}

      <div className="w-full max-w-[280px] bg-slate-900 rounded-3xl border-4 border-slate-200 flex flex-col items-center justify-center text-slate-500 mb-6 shadow-xl relative overflow-hidden">
        {/* Container for html5-qrcode */}
        <div id="reader" className="w-full bg-black min-h-[280px] rounded-2xl overflow-hidden [&_video]:object-cover" />
        <div className="absolute inset-0 border-[6px] border-emerald-500/0 pointer-events-none rounded-3xl z-10 transition-colors"></div>
      </div>

      <p className={`text-xs mt-auto ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
        Насочи ја камерата кон QR кодот — поените се доделуваат автоматски по скенирање.
      </p>
    </div>
  );
}

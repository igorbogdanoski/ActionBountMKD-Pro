import type { InfoStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { StageMedia } from './StageMedia';

interface Props {
  stage: InfoStage;
  isNightMode: boolean;
  onContinue: () => void;
}

export function InfoStagePlayer({ stage, isNightMode, onContinue }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-4`}>{stage.title}</h2>
      <StageMedia mediaUrl={stage.mediaUrl} audioUrl={stage.audioUrl} />
      <div className={`${isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} p-6 rounded-2xl shadow-sm border mb-6 transition-colors`}>
        <MathRenderer text={stage.description} className="leading-relaxed" />
      </div>
      <div className="mt-auto">
        <button onClick={onContinue} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
          Разбрав, понатаму
        </button>
      </div>
    </div>
  );
}

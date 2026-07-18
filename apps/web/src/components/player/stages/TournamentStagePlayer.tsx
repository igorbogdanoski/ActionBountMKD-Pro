import { Trophy } from 'lucide-react';
import type { TournamentStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { Button } from '../../ui/Button';

interface Props {
  stage: TournamentStage;
  isNightMode: boolean;
  onFinish: () => void;
}

export function TournamentStagePlayer({ stage, isNightMode, onFinish }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6">
        <Trophy className={`w-10 h-10 ${isNightMode ? 'text-orange-400' : 'text-orange-500'}`} />
      </div>
      <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-3`}>{stage.title}</h2>
      <MathRenderer text={stage.description} className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-4`} />
      {stage.taskDescription && (
        <div className={`w-full p-4 rounded-2xl border mb-6 text-left ${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-orange-50 border-orange-200'}`}>
          <p className="text-sm font-semibold text-orange-500 mb-1">Задача за тимовите:</p>
          <MathRenderer text={stage.taskDescription} className={`text-sm ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`} />
        </div>
      )}
      {stage.teamCount && stage.teamCount > 0 && (
        <p className={`text-xs ${isNightMode ? 'text-slate-500' : 'text-slate-400'} mb-8`}>
          {stage.teamCount} тима се натпреваруваат
        </p>
      )}
      <div className="mt-auto w-full">
        <Button
          onClick={onFinish}
          fullWidth
          size="lg"
          colorClassName="bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500"
          className="py-4 uppercase shadow-lg"
        >
          Турнирот заврши (+{stage.points})
        </Button>
      </div>
    </div>
  );
}

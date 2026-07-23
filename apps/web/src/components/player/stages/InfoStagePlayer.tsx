import type { InfoStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
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
      <Card
        padded={false}
        data-testid="info-description-card"
        className={`${isNightMode ? '!bg-slate-800 !border-slate-700 text-slate-300' : '!bg-white !border-slate-200 text-slate-600'} !shadow-sm p-6 mb-6 transition-colors`}
      >
        <MathRenderer text={stage.description} className="leading-relaxed" />
      </Card>
      <div className="mt-auto">
        <Button onClick={onContinue} fullWidth size="lg" variant="success" className="py-4 uppercase shadow-lg shadow-emerald-500/20">
          Разбрав, понатаму
        </Button>
      </div>
    </div>
  );
}

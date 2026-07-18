import type { SwitchStage, Stage, InventoryItem } from 'shared';
import { evaluateSwitchTarget } from '../../../lib/inventory';
import { Button } from '../../ui/Button';

interface Props {
  stage: SwitchStage;
  isNightMode: boolean;
  allStages: Stage[];
  points: number;
  completedStageIds: string[];
  collectedItemIds: string[];
  inventoryItems: InventoryItem[];
  onChoosePath: (targetStageId?: string) => void;
}

export function SwitchStagePlayer({
  stage, isNightMode, allStages, points, completedStageIds, collectedItemIds, inventoryItems, onChoosePath,
}: Props) {
  // When showPathsToPlayer is false, routing happens silently via a separate
  // effect in the parent (auto-advances as soon as this stage becomes
  // current) — this is just the brief loading state shown while that
  // happens, not itself responsible for calling onChoosePath.
  if (!stage.showPathsToPlayer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <p className={`text-sm ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>Насочување...</p>
      </div>
    );
  }

  const matchedId = evaluateSwitchTarget(stage, points, completedStageIds, collectedItemIds);

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
      <h2 className={`text-xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'}`}>
        {stage.title || 'Избери го следниот чекор'}
      </h2>
      {stage.description && (
        <p className={`text-sm ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>{stage.description}</p>
      )}
      <div className="space-y-3 mt-2">
        {stage.conditions.filter(c => c.targetStageId).map(cond => {
          const target = allStages.find(s => s.id === cond.targetStageId);
          const isRecommended = cond.id === stage.conditions.find(c => {
            const minOk = c.minPoints === undefined || points >= c.minPoints;
            const maxOk = c.maxPoints === undefined || points <= c.maxPoints;
            const reqOk = !c.requiredStageIds?.length || c.requiredStageIds.every(id => completedStageIds.includes(id));
            const itemOk = !c.requiredItemId || collectedItemIds.includes(c.requiredItemId);
            return minOk && maxOk && reqOk && itemOk && c.targetStageId;
          })?.id;
          const neededItem = inventoryItems.find(item => item.id === cond.requiredItemId);
          const isLocked = !!cond.requiredItemId && !collectedItemIds.includes(cond.requiredItemId);
          const label = cond.label || `Патека ${cond.id.slice(-4)}`;
          return (
            <Button
              key={cond.id}
              aria-label={`${label}${isRecommended ? ', препорачана патека' : ''}${isLocked ? ', заклучена' : ''}`}
              onClick={() => onChoosePath(cond.targetStageId)}
              disabled={isLocked}
              fullWidth
              colorClassName={`border focus-visible:ring-violet-500 ${
                isRecommended
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : isNightMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-700'
              }`}
              className="text-left p-4 rounded-xl justify-start"
            >
              <div>
              <p className="font-semibold text-sm">{label}</p>
              {target && <p className={`text-xs mt-1 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>{target.title || `Етапа ${target.order + 1}`}</p>}
              {neededItem && !collectedItemIds.includes(neededItem.id) && (
                <p className="text-xs mt-1 text-amber-400">Потребно: {neededItem.icon ? `${neededItem.icon} ` : ''}{neededItem.name}</p>
              )}
              </div>
            </Button>
          );
        })}
        {stage.defaultTargetStageId && !matchedId && (
          <Button
            onClick={() => onChoosePath(stage.defaultTargetStageId)}
            fullWidth
            colorClassName={`border focus-visible:ring-violet-500 ${isNightMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}
            className="text-left p-4 rounded-xl justify-start"
          >
            <p className="font-semibold text-sm">Стандарден пат</p>
          </Button>
        )}
      </div>
    </div>
  );
}

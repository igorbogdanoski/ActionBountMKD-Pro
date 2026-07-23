import { useNavigate } from 'react-router-dom';
import { Zap, Crown } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const PLAN_LABELS: Record<string, string> = {
  free:       'Free',
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-slate-500/20 text-slate-400 border-slate-500/30',
  starter:    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  pro:        'bg-violet-500/20 text-violet-400 border-violet-500/30',
  enterprise: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const BAR_COLORS: Record<string, string> = {
  free:       'bg-slate-400',
  starter:    'bg-indigo-500',
  pro:        'bg-violet-500',
  enterprise: 'bg-amber-400',
};

interface Props {
  questCount: number;
}

export function PlanUsageWidget({ questCount }: Props) {
  const { planId, limits } = usePlan();
  const navigate = useNavigate();

  const maxQuests = limits.maxQuests;
  const isUnlimited = maxQuests === -1;
  const pct = isUnlimited ? 0 : Math.min((questCount / maxQuests) * 100, 100);
  const nearLimit = !isUnlimited && pct >= 80;
  const atLimit = !isUnlimited && questCount >= maxQuests;
  const usageState = atLimit ? 'exhausted' : nearLimit ? 'warning' : 'normal';

  return (
    <Card
      tone="dark"
      padded={false}
      data-testid="plan-usage-card"
      data-state={usageState}
      className={`!shadow-none p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
      atLimit
        ? '!bg-rose-500/5 !border-rose-500/20'
        : nearLimit
          ? '!bg-amber-500/5 !border-amber-500/20'
          : '!bg-slate-800/50 !border-slate-700'
      }`}
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[planId]}`}>
              {PLAN_LABELS[planId]}
            </span>
            <span className="text-sm font-semibold text-slate-200">
              {isUnlimited
                ? `${questCount} квестови`
                : `${questCount} / ${maxQuests} квестови`}
            </span>
          </div>
          {atLimit && (
            <span className="text-xs font-semibold text-rose-400">Достигнат лимит</span>
          )}
          {nearLimit && !atLimit && (
            <span className="text-xs font-semibold text-amber-400">Скоро полно</span>
          )}
        </div>

        {!isUnlimited && (
          <div
            role="progressbar"
            aria-label="Искористеност на лимитот за квестови"
            aria-valuemin={0}
            aria-valuemax={maxQuests}
            aria-valuenow={Math.min(questCount, maxQuests)}
            className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                atLimit ? 'bg-rose-500' : nearLimit ? 'bg-amber-400' : BAR_COLORS[planId]
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {(planId === 'free' || planId === 'starter') && (
        <Button
          type="button"
          onClick={() => navigate('/pricing')}
          variant="app-primary"
          size="sm"
          className="shrink-0 !gap-1.5 !py-2 !rounded-xl hover:!bg-indigo-700 whitespace-nowrap"
        >
          {planId === 'free' ? <Zap className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
          {planId === 'free' ? 'Надгради план' : 'Надгради во Pro'}
        </Button>
      )}
    </Card>
  );
}

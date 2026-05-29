import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { usePlan } from '../hooks/usePlan';
import type { PlanLimits, PlanId } from '../types';

interface PlanGateProps {
  /** Feature flag that must be true for this plan */
  feature?: keyof PlanLimits;
  /** Minimum plan required */
  minPlan?: PlanId;
  /** Children shown when access is granted */
  children: ReactNode;
  /** Custom message shown on the upgrade prompt */
  message?: string;
  /** Render a dimmed overlay instead of hiding completely */
  overlay?: boolean;
}

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];

export function PlanGate({ feature, minPlan, children, message, overlay = false }: PlanGateProps) {
  const { planId, can, limits } = usePlan();
  const navigate = useNavigate();

  let hasAccess = true;

  if (feature) {
    hasAccess = can(feature);
  }

  if (minPlan) {
    hasAccess = PLAN_ORDER.indexOf(planId) >= PLAN_ORDER.indexOf(minPlan);
  }

  if (hasAccess) return <>{children}</>;

  const prompt = (
    <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
      <Lock className="w-8 h-8 text-amber-400" />
      <p className="text-sm text-slate-300 max-w-xs">
        {message ?? 'Оваа функција е достапна на повисок план.'}
      </p>
      <button
        type="button"
        onClick={() => navigate('/pricing')}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-bold transition-colors"
      >
        <Zap className="w-4 h-4" />
        Надгради план
      </button>
    </div>
  );

  if (overlay) {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-30 select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-xl">
          {prompt}
        </div>
      </div>
    );
  }

  return prompt;
}

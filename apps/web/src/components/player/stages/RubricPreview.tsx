import type { Rubric } from 'shared';
import { Card } from '../../ui/Card';

interface Props {
  rubric: Rubric | undefined;
  isNightMode: boolean;
}

/** Read-only "how this will be graded" card shown to the player before a
 * rubric-graded MISSION/SURVEY submission. Shared by both stage players. */
export function RubricPreview({ rubric, isNightMode }: Props) {
  if (!rubric?.criteria?.length) return null;
  return (
    <Card
      padded={false}
      data-testid="rubric-preview-card"
      className={`w-full max-w-sm mx-auto mb-6 !shadow-none p-4 text-left ${isNightMode ? '!bg-slate-800/60 !border-slate-700' : '!bg-slate-50 !border-slate-200'}`}
    >
      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>📋 Како се оценува</p>
      <div className="space-y-3">
        {rubric.criteria.map(c => (
          <div key={c.id}>
            <p className={`text-sm font-semibold ${isNightMode ? 'text-slate-200' : 'text-slate-700'}`}>{c.title || 'Критериум'}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {c.levels.map(l => (
                <span key={l.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isNightMode ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  {l.label || 'Ниво'} <span className="font-bold text-indigo-400">{l.points}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

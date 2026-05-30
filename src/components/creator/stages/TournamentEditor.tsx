import type { TournamentStage } from '../../../types';
import { Field, inputCls, textareaCls } from './shared';

interface Props { stage: TournamentStage; onChange: (u: Partial<TournamentStage>) => void; }

export function TournamentEditor({ stage, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Field label="Наслов на турнирот">
        <input type="text" className={inputCls} placeholder="Тимско натпреварување..."
          value={stage.title} onChange={e => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Задача / Опис">
        <textarea className={textareaCls} rows={4} placeholder="Опиши ја задачата за тимовите..."
          value={stage.description} onChange={e => onChange({ description: e.target.value })} />
      </Field>
      <Field label="Специфична задача за тимовите" hint="Дополнителни упатства за натпреварот">
        <textarea className={textareaCls} rows={3} placeholder="Тимовите треба да..."
          value={stage.taskDescription ?? ''} onChange={e => onChange({ taskDescription: e.target.value })} />
      </Field>
      <Field label="Број на тимови">
        <input type="number" className={inputCls} min={2} max={20}
          value={stage.teamCount ?? 2} onChange={e => onChange({ teamCount: Number(e.target.value) })} />
      </Field>
      <Field label="Начин на оценување">
        <select className={inputCls} value={stage.judgingMode ?? 'points'}
          onChange={e => onChange({ judgingMode: e.target.value as TournamentStage['judgingMode'] })}>
          <option value="points">По поени</option>
          <option value="time">По брзина (времен лимит)</option>
          <option value="manual">Рачно (судија одлучува)</option>
        </select>
      </Field>
      <Field label="Поени за победнички тим">
        <input type="number" className={inputCls} min={0} max={10000}
          value={stage.points ?? 200} onChange={e => onChange({ points: Number(e.target.value) })} />
      </Field>
    </div>
  );
}

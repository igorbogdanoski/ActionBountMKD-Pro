import type { MissionStage } from 'shared';
import { Field, inputCls, textareaCls } from './shared';

interface Props { stage: MissionStage; onChange: (u: Partial<MissionStage>) => void; }

export function MissionStageEditor({ stage, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Field label="Наслов">
        <input type="text" className={inputCls} placeholder="Наслов на мисијата..."
          value={stage.title} onChange={e => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Опис / Упатство">
        <textarea className={textareaCls} rows={4} placeholder="Што треба да направи играчот..."
          value={stage.description} onChange={e => onChange({ description: e.target.value })} />
      </Field>
      <Field label="Тип на испраќање" hint="Играчот ја снима/снима задачата">
        <select className={inputCls} value={stage.submissionType}
          onChange={e => onChange({ submissionType: e.target.value as MissionStage['submissionType'] })}>
          <option value="photo">Фотографија</option>
          <option value="video">Видео</option>
          <option value="audio">Аудио</option>
        </select>
      </Field>
      <Field label="Поени">
        <input type="number" className={inputCls} min={0} max={10000}
          value={stage.points ?? 75} onChange={e => onChange({ points: Number(e.target.value) })} />
      </Field>
    </div>
  );
}


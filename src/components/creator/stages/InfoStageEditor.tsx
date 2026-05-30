import type { InfoStage } from '../../../types';
import { Field, inputCls } from './shared';
import { MathRichEditor } from '../../editor/MathRichEditor';

interface Props { stage: InfoStage; onChange: (u: Partial<InfoStage>) => void; }

export function InfoStageEditor({ stage, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Field label="Наслов">
        <input type="text" className={inputCls} placeholder="Наслов на информацијата..."
          value={stage.title} onChange={e => onChange({ title: e.target.value })} />
      </Field>

      <MathRichEditor
        label="Содржина / Опис"
        rows={5}
        placeholder="Текст за играчот... Користи $x^2$ за математика"
        value={stage.description}
        onChange={v => onChange({ description: v })}
        hint="Поддржува KaTeX математика: $inline$ или $$блок$$"
      />

      <Field label="Тип на медија">
        <select aria-label="Тип на медија" className={inputCls} value={stage.mediaType ?? 'none'}
          onChange={e => onChange({ mediaType: e.target.value as InfoStage['mediaType'] })}>
          <option value="none">Без медија</option>
          <option value="image">Слика (URL)</option>
          <option value="video">YouTube видео</option>
        </select>
      </Field>

      {(stage.mediaType === 'image' || stage.mediaType === 'video') && (
        <Field label="Медија URL" hint={stage.mediaType === 'video' ? 'YouTube линк' : 'URL на слика'}>
          <input type="url" className={inputCls} placeholder="https://..."
            value={stage.mediaUrl ?? ''} onChange={e => onChange({ mediaUrl: e.target.value })} />
        </Field>
      )}

      <Field label="Аудио URL (опционално)">
        <input type="url" className={inputCls} placeholder="https://..."
          value={stage.audioUrl ?? ''} onChange={e => onChange({ audioUrl: e.target.value })} />
      </Field>

      <Field label="Поени">
        <input type="number" aria-label="Поени" className={inputCls} min={0} max={10000}
          value={stage.points ?? 10} onChange={e => onChange({ points: Number(e.target.value) })} />
      </Field>
    </div>
  );
}

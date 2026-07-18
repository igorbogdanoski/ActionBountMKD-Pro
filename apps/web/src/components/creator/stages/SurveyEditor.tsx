import { Plus, Trash2 } from 'lucide-react';
import type { SurveyStage } from 'shared';
import { Field, inputCls, textareaCls } from './shared';
import { RubricEditor } from './RubricEditor';
import { Button } from '../../ui/Button';

interface Props { stage: SurveyStage; onChange: (u: Partial<SurveyStage>) => void; }

export function SurveyEditor({ stage, onChange }: Props) {
  const questions = stage.surveyQuestions.length > 0 ? stage.surveyQuestions : [''];

  const updateQ = (i: number, val: string) => {
    const qs = [...questions]; qs[i] = val;
    onChange({ surveyQuestions: qs });
  };
  const addQ    = () => onChange({ surveyQuestions: [...questions, ''] });
  const removeQ = (i: number) => onChange({ surveyQuestions: questions.filter((_, j) => j !== i) });

  return (
    <div className="space-y-4">
      <Field label="Наслов">
        <input type="text" className={inputCls} placeholder="Наслов на анкетата..."
          value={stage.title} onChange={e => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Вовед / Опис">
        <textarea className={textareaCls} rows={2} placeholder="Вовед во анкетата..."
          value={stage.description} onChange={e => onChange({ description: e.target.value })} />
      </Field>
      <Field label={`Прашања (${questions.length})`} hint="Максимум 20 прашања">
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-xs text-slate-500 mt-2.5 w-5 shrink-0">{i + 1}.</span>
              <input type="text" className={inputCls} placeholder={`Прашање ${i + 1}...`}
                value={q} onChange={e => updateQ(i, e.target.value)} />
              {questions.length > 1 && (
                <Button type="button" onClick={() => removeQ(i)}
                  variant="ghost" size="icon" aria-label={`Отстрани прашање ${i + 1}`}
                  colorClassName="text-slate-500 hover:text-rose-400 focus-visible:ring-rose-400"
                  className="shrink-0">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          {questions.length < 20 && (
            <Button type="button" onClick={addQ} variant="ghost" size="sm"
              colorClassName="text-indigo-400 hover:text-indigo-300 focus-visible:ring-indigo-400"
              leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}>
              Додај прашање
            </Button>
          )}
        </div>
      </Field>
      <RubricEditor rubric={stage.rubric} onChange={r => onChange({ rubric: r })} />
    </div>
  );
}

import { Plus, Trash2 } from 'lucide-react';
import type { SurveyStage } from 'shared';
import { Field, inputCls, textareaCls } from './shared';
import { RubricEditor } from './RubricEditor';

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
                <button type="button" onClick={() => removeQ(i)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {questions.length < 20 && (
            <button type="button" onClick={addQ}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Додај прашање
            </button>
          )}
        </div>
      </Field>
      <RubricEditor rubric={stage.rubric} onChange={r => onChange({ rubric: r })} />
    </div>
  );
}


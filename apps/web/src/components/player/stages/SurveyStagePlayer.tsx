import type { SurveyStage, StageSubmission } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { RubricPreview } from './RubricPreview';

interface Props {
  stage: SurveyStage;
  isNightMode: boolean;
  answers: Record<number, string>;
  onAnswerChange: (index: number, value: string) => void;
  onSubmit: (submission: StageSubmission) => void;
}

export function SurveyStagePlayer({ stage, isNightMode, answers, onAnswerChange, onSubmit }: Props) {
  const questions: string[] = stage.surveyQuestions || [];
  const hasRubric = !!stage.rubric?.criteria?.length;
  const complete = questions.length > 0 && questions.every((_, i) => (answers[i] || '').trim().length >= 3);

  const handleSubmit = () => {
    if (!complete) return;
    onSubmit({
      stageId: stage.id,
      type: 'survey',
      surveyAnswers: questions.map((_, i) => answers[i] || ''),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2 text-center`}>{stage.title}</h2>
      <MathRenderer text={stage.description} className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-8 text-center`} />

      <RubricPreview rubric={stage.rubric} isNightMode={isNightMode} />

      <div className="mb-8 space-y-5">
        {questions.map((q, i) => (
          <div key={i}>
            <label className={`block text-base font-bold mb-2 ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>{q}</label>
            <textarea
              value={answers[i] || ''}
              onChange={e => onAnswerChange(i, e.target.value)}
              className={`w-full rounded-2xl p-4 min-h-[100px] resize-none outline-none border-2 transition-colors ${
                isNightMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500'
                  : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
              }`}
              placeholder="Вашето мислење овде..."
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!complete}
        className="w-full py-4 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase shadow-xl active:scale-95 transition-all mt-auto"
      >
        {hasRubric ? 'Испрати за оценување' : 'Поднеси анкета'}
      </button>
    </div>
  );
}

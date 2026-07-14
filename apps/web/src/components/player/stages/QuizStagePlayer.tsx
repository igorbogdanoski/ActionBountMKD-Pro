import { AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import type { QuizStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { StageMedia } from './StageMedia';
import { shouldRevealHint } from '../../../utils/hints';

interface Props {
  stage: QuizStage;
  isNightMode: boolean;
  timeLeft: number | null;
  quizAnswer: string;
  quizFeedback: 'success' | 'error' | null;
  quizAttempts: number;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}

export function QuizStagePlayer({
  stage, isNightMode, timeLeft, quizAnswer, quizFeedback, quizAttempts,
  onAnswerChange, onSubmit, onSkip,
}: Props) {
  const timeLimitSec = stage.timeLimitSeconds;
  const timerUrgent = timeLeft !== null && timeLeft <= 10;
  const timerPct = timeLimitSec && timeLeft !== null ? Math.max(0, (timeLeft / timeLimitSec) * 100) : 100;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col relative">
      <div className="flex justify-between items-center mb-4">
        <div className="bg-amber-100 text-amber-700 py-1.5 px-4 rounded-full font-bold text-xs uppercase shadow-sm">
          Коин: {stage.points} Поени
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 py-1.5 px-3 rounded-full text-xs font-bold transition-colors ${
            timerUrgent ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-700 text-slate-300'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>
      {timeLeft !== null && timeLimitSec && (
        <div className="w-full h-1 rounded-full bg-slate-700 mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerUrgent ? 'bg-rose-500' : 'bg-amber-400'}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}
      <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-3`}>{stage.title}</h2>
      <StageMedia mediaUrl={(stage as any).mediaUrl} audioUrl={stage.audioUrl} />
      <MathRenderer text={stage.description} className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-8`} />

      <div className="space-y-3 mb-6">
        {stage.options?.map((opt: string) => (
          <button
            key={opt}
            disabled={timeLeft === 0 || quizFeedback !== null}
            onClick={() => onAnswerChange(opt)}
            className={`w-full p-4 rounded-xl text-left font-semibold transition-all border-2 ${
              quizAnswer === opt
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 shadow-sm'
                : isNightMode
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt}
          </button>
        ))}
      </div>

      {quizFeedback === 'error' && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 mb-4 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{timeLeft === 0 ? 'Времето истече!' : 'Погрешен одговор, обиди се повторно!'}</span>
        </div>
      )}

      {shouldRevealHint(quizAttempts, stage.hintText) && (
        <div className="p-4 bg-amber-50 text-amber-800 rounded-xl flex items-start gap-2 mb-4 border border-amber-200" role="status">
          <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <span className="text-sm font-semibold">Совет: {stage.hintText}</span>
        </div>
      )}

      {quizFeedback === 'success' && (
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 mb-4 border border-emerald-100">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <span className="font-bold text-lg">Точно! +{stage.points}</span>
        </div>
      )}

      <div className="mt-auto">
        {quizFeedback === 'error' && timeLeft === 0 ? (
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-4 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold uppercase shadow-lg active:scale-95 transition-all"
          >
            Продолжи →
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!quizAnswer || quizFeedback === 'success'}
            className="w-full py-4 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
          >
            Потврди
          </button>
        )}
      </div>
    </div>
  );
}

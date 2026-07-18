import { AlertCircle, CheckCircle2, Lightbulb, ChevronUp, ChevronDown } from 'lucide-react';
import type { QuizStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { Button } from '../../ui/Button';
import { StageMedia } from './StageMedia';
import { shouldRevealHint } from '../../../utils/hints';

interface Props {
  stage: QuizStage;
  isNightMode: boolean;
  timeLeft: number | null;
  quizAnswer: string;
  quizFeedback: 'success' | 'error' | null;
  quizAttempts: number;
  matchingSelections: Record<string, string>;
  matchingRightOptions: string[];
  orderingSequence: string[];
  onAnswerChange: (value: string) => void;
  onMatchingSelect: (pairId: string, rightText: string) => void;
  onOrderingMove: (index: number, direction: 'up' | 'down') => void;
  onSubmit: () => void;
  onSkip: () => void;
}

export function QuizStagePlayer({
  stage, isNightMode, timeLeft, quizAnswer, quizFeedback, quizAttempts,
  matchingSelections, matchingRightOptions, orderingSequence,
  onAnswerChange, onMatchingSelect, onOrderingMove, onSubmit, onSkip,
}: Props) {
  const timeLimitSec = stage.timeLimitSeconds;
  const timerUrgent = timeLeft !== null && timeLeft <= 10;
  const timerPct = timeLimitSec && timeLeft !== null ? Math.max(0, (timeLeft / timeLimitSec) * 100) : 100;
  const locked = timeLeft === 0 || quizFeedback !== null;

  const hasAnswer = stage.questionType === 'matching'
    ? (stage.matchingPairs ?? []).length > 0 && (stage.matchingPairs ?? []).every(p => !!matchingSelections[p.id])
    : stage.questionType === 'ordering'
      ? orderingSequence.length > 0
      : !!quizAnswer;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col relative">
      <div className="flex justify-between items-center mb-4">
        <div className="bg-amber-100 text-amber-700 py-1.5 px-4 rounded-full font-bold text-xs uppercase shadow-sm">
          Коин: {stage.points} Поени
        </div>
        {timeLeft !== null && (
          <div role="timer" aria-live={timerUrgent ? 'polite' : 'off'} className={`flex items-center gap-2 py-1.5 px-3 rounded-full text-xs font-bold transition-colors ${
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
        <div role="progressbar" aria-label="Преостанато време" aria-valuemin={0} aria-valuemax={timeLimitSec} aria-valuenow={timeLeft ?? 0} className="w-full h-1 rounded-full bg-slate-700 mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerUrgent ? 'bg-rose-500' : 'bg-amber-400'}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}
      <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-3`}>{stage.title}</h2>
      <StageMedia mediaUrl={(stage as any).mediaUrl} audioUrl={stage.audioUrl} />
      <MathRenderer text={stage.description} className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-8`} />

      {stage.questionType === 'multiple_choice' ? (
        <div className="space-y-3 mb-6">
          {stage.options?.map((opt: string) => (
            <Button
              key={opt}
              aria-pressed={quizAnswer === opt}
              disabled={locked}
              onClick={() => onAnswerChange(opt)}
              fullWidth
              colorClassName={`border-2 focus-visible:ring-indigo-500 ${
                quizAnswer === opt
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 shadow-sm'
                  : isNightMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
              }`}
              className="p-4 rounded-xl text-left justify-start"
            >
              {opt}
            </Button>
          ))}
        </div>
      ) : stage.questionType === 'estimate_number' ? (
        <input
          type="number"
          inputMode="decimal"
          value={quizAnswer}
          onChange={e => onAnswerChange(e.target.value)}
          disabled={locked}
          placeholder="Внеси број..."
          className={`w-full p-4 rounded-xl border-2 mb-6 outline-none transition-colors ${
            isNightMode
              ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-indigo-400'
              : 'border-slate-200 bg-white text-slate-800 focus:border-indigo-400'
          } disabled:opacity-50`}
        />
      ) : stage.questionType === 'matching' ? (
        <div className="space-y-3 mb-6">
          {(stage.matchingPairs ?? []).map(pair => (
            <div key={pair.id} className="flex items-center gap-3">
              <span className={`flex-1 p-3 rounded-xl text-sm font-semibold ${isNightMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                {pair.left}
              </span>
              <select
                aria-label={`Поврзи со: ${pair.left}`}
                value={matchingSelections[pair.id] ?? ''}
                onChange={e => onMatchingSelect(pair.id, e.target.value)}
                disabled={locked}
                className={`flex-1 p-3 rounded-xl border-2 outline-none transition-colors text-sm font-semibold ${
                  isNightMode
                    ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-indigo-400'
                    : 'border-slate-200 bg-white text-slate-800 focus:border-indigo-400'
                } disabled:opacity-50`}
              >
                <option value="">— избери —</option>
                {matchingRightOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : stage.questionType === 'ordering' ? (
        <div className="space-y-2 mb-6">
          {orderingSequence.map((itemId, i) => {
            const item = stage.orderingItems?.find(it => it.id === itemId);
            return (
              <div
                key={itemId}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                  isNightMode ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <span className="text-xs font-bold text-slate-500 w-5 shrink-0">{i + 1}.</span>
                <span className="flex-1 text-sm font-semibold">{item?.text}</span>
                <Button
                  aria-label={`Помести нагоре: ${item?.text ?? `ставка ${i + 1}`}`}
                  disabled={locked || i === 0}
                  onClick={() => onOrderingMove(i, 'up')}
                  size="icon"
                  variant="ghost"
                  className="p-1.5"
                  colorClassName="text-slate-500 hover:text-indigo-400 focus-visible:ring-indigo-500"
                >
                  <ChevronUp aria-hidden="true" className="w-4 h-4" />
                </Button>
                <Button
                  aria-label={`Помести надолу: ${item?.text ?? `ставка ${i + 1}`}`}
                  disabled={locked || i === orderingSequence.length - 1}
                  onClick={() => onOrderingMove(i, 'down')}
                  size="icon"
                  variant="ghost"
                  className="p-1.5"
                  colorClassName="text-slate-500 hover:text-indigo-400 focus-visible:ring-indigo-500"
                >
                  <ChevronDown aria-hidden="true" className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <textarea
          rows={4}
          value={quizAnswer}
          onChange={e => onAnswerChange(e.target.value)}
          disabled={locked}
          placeholder="Внеси го твојот одговор..."
          className={`w-full p-4 rounded-xl border-2 mb-6 outline-none transition-colors ${
            isNightMode
              ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-indigo-400'
              : 'border-slate-200 bg-white text-slate-800 focus:border-indigo-400'
          } disabled:opacity-50`}
        />
      )}

      {quizFeedback === 'error' && (
        <div role="alert" className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 mb-4 border border-red-100">
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
        <div role="status" className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 mb-4 border border-emerald-100">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <span className="font-bold text-lg">Точно! +{stage.points}</span>
        </div>
      )}

      <div className="mt-auto">
        {quizFeedback === 'error' && timeLeft === 0 ? (
          <Button
            onClick={onSkip}
            fullWidth
            size="lg"
            colorClassName="bg-slate-600 text-white hover:bg-slate-500 focus-visible:ring-slate-500"
            className="py-4 uppercase shadow-lg"
          >
            Продолжи →
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={!hasAnswer || quizFeedback === 'success'}
            fullWidth
            size="lg"
            variant="app-primary"
            className="py-4 uppercase shadow-lg shadow-indigo-600/20"
          >
            Потврди
          </Button>
        )}
      </div>
    </div>
  );
}

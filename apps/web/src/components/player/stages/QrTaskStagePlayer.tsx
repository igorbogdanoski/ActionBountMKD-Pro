import { Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import type { QrTaskStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { Button } from '../../ui/Button';

interface Props {
  stage: QrTaskStage;
  isNightMode: boolean;
  scanError: string | null;
  qrTaskScanned: boolean;
  quizAnswer: string;
  quizFeedback: 'success' | 'error' | null;
  onAnswerChange: (value: string) => void;
  onPhotoSelected: () => void;
  onSubmit: () => void;
  onSkip: () => void;
}

export function QrTaskStagePlayer({
  stage, isNightMode, scanError, qrTaskScanned, quizAnswer, quizFeedback,
  onAnswerChange, onPhotoSelected, onSubmit, onSkip,
}: Props) {
  // Phase 1 — scan the QR code to reveal the task
  if (!qrTaskScanned) {
    return (
      <div className="flex-1 flex flex-col p-6 items-center justify-center text-center">
        <div className="bg-teal-100 text-teal-700 py-1.5 px-4 rounded-full font-bold text-xs uppercase shadow-sm mb-3">
          QR Задача · {stage.points} поени
        </div>
        <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>{stage.title}</h2>
        <MathRenderer text={stage.description} className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-4`} />

        {scanError && (
          <div role="alert" className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold w-full mb-4 animate-pulse">
            {scanError}
          </div>
        )}

        <div className="w-full max-w-[280px] bg-slate-900 rounded-3xl border-4 border-slate-200 flex flex-col items-center justify-center text-slate-500 mb-6 shadow-xl relative overflow-hidden">
          <div id="reader" className="w-full bg-black min-h-[280px] rounded-2xl overflow-hidden [&_video]:object-cover" />
        </div>

        <p className={`text-xs mt-auto ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Насочи ја камерата кон QR кодот за да ја откриеш задачата.
        </p>
      </div>
    );
  }

  // Phase 2 — answer the revealed task
  const autoGrade = stage.answerType !== 'photo' && !!stage.correctAnswer?.trim();
  const canSubmit = stage.answerType === 'photo'
    ? !!quizAnswer
    : !!quizAnswer && String(quizAnswer).trim().length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase mb-3">
        <CheckCircle2 className="w-4 h-4" /> QR скениран
      </div>
      <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-3`}>
        {stage.taskTitle || stage.title}
      </h2>

      {stage.taskMediaUrl && (
        <img src={stage.taskMediaUrl} alt="" className="w-full rounded-2xl mb-4 max-h-64 object-cover" />
      )}

      <MathRenderer text={stage.taskDescription} className={`${isNightMode ? 'text-slate-300' : 'text-slate-700'} mb-6`} />

      {/* Multiple choice */}
      {stage.answerType === 'multiple_choice' && (
        <div className="space-y-3 mb-4">
          {(stage.options || []).map((opt, i) => (
            <Button
              key={i}
              aria-pressed={quizAnswer === opt}
              disabled={quizFeedback !== null}
              onClick={() => onAnswerChange(opt)}
              fullWidth
              colorClassName={`border-2 focus-visible:ring-teal-500 ${
                quizAnswer === opt
                  ? 'border-teal-500 bg-teal-500/10 text-teal-500 shadow-sm'
                  : isNightMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-teal-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
              }`}
              className="p-4 rounded-xl text-left justify-start"
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
            </Button>
          ))}
        </div>
      )}

      {/* Free text */}
      {stage.answerType === 'text' && (
        <textarea
          rows={4}
          value={quizAnswer || ''}
          onChange={e => onAnswerChange(e.target.value)}
          disabled={quizFeedback === 'success'}
          placeholder="Внеси го твојот одговор..."
          className={`w-full p-4 rounded-xl border-2 mb-4 outline-none transition-colors ${
            isNightMode
              ? 'border-slate-700 bg-slate-800 text-slate-200 focus:border-teal-400'
              : 'border-slate-200 bg-white text-slate-800 focus:border-teal-400'
          } disabled:opacity-60`}
        />
      )}

      {/* Photo proof */}
      {stage.answerType === 'photo' && (
        <div className={`w-full rounded-2xl border-2 border-dashed ${isNightMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'} flex flex-col items-center justify-center p-8 mb-4`}>
          <div className={`w-14 h-14 rounded-full ${isNightMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600'} flex items-center justify-center mb-3`}>
            <Camera className="w-7 h-7" />
          </div>
          <label className={`mt-2 px-6 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all ${quizAnswer ? 'bg-emerald-500 text-white' : (isNightMode ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-200')}`}>
            {quizAnswer ? 'Прикачено!' : 'Сликај / Избери фото'}
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={onPhotoSelected} />
          </label>
        </div>
      )}

      {quizFeedback === 'error' && (
        <div role="alert" className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 mb-4 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">Погрешен одговор, обиди се повторно!</span>
        </div>
      )}
      {quizFeedback === 'success' && (
        <div role="status" className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 mb-4 border border-emerald-100">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <span className="font-bold text-lg">{autoGrade ? `Точно! +${stage.points}` : `Зачувано! +${stage.points}`}</span>
        </div>
      )}

      <div className="mt-auto">
        {!stage.requiredToAdvance && quizFeedback === 'error' ? (
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
            disabled={!canSubmit || quizFeedback === 'success'}
            fullWidth
            size="lg"
            colorClassName="bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-500"
            className="py-4 uppercase shadow-lg shadow-teal-600/20"
          >
            Потврди
          </Button>
        )}
      </div>
    </div>
  );
}

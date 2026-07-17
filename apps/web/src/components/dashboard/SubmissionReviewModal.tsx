import { useState } from 'react';
import type { Quest, QuestResult, RubricGrade, MissionStage, SurveyStage } from 'shared';
import { gradeSubmission } from '../../utils/storage';
import { Modal } from '../ui/Modal';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface SubmissionReviewModalProps {
  open: boolean;
  onClose: () => void;
  quest: Quest;
  result: QuestResult;
  stageId: string;
  onGraded: (updated: QuestResult) => void;
}

export function SubmissionReviewModal({ open, onClose, quest, result, stageId, onGraded }: SubmissionReviewModalProps) {
  const stage = quest.stages.find(s => s.id === stageId) as (MissionStage | SurveyStage | undefined);
  const submission = result.submissions?.find(s => s.stageId === stageId);
  const existingGrade = result.grades?.find(g => g.stageId === stageId);
  const rubric = stage?.rubric;

  const [scores, setScores] = useState<Record<string, number>>(() => existingGrade?.criterionScores ?? {});
  const [feedback, setFeedback] = useState(existingGrade?.feedback ?? '');
  const [saving, setSaving] = useState(false);

  if (!stage || !rubric) return null;

  const totalPoints = rubric.criteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0);
  const maxPoints = rubric.criteria.reduce((sum, c) => sum + Math.max(0, ...c.levels.map(l => l.points)), 0);
  const allScored = rubric.criteria.every(c => scores[c.id] !== undefined);

  const handleSave = async () => {
    setSaving(true);
    try {
      const grade: RubricGrade = {
        stageId,
        criterionScores: scores,
        totalPoints,
        feedback: feedback.trim() || undefined,
        gradedAt: new Date().toISOString(),
      };
      await gradeSubmission(result, grade);
      onGraded({
        ...result,
        grades: [...(result.grades ?? []).filter(g => g.stageId !== stageId), grade],
        points: result.points - (existingGrade?.totalPoints ?? 0) + totalPoints,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Оцени: ${stage.title}`} size="lg" footer={
      <>
        <Button type="button" variant="ghost" colorClassName="text-slate-400 hover:text-slate-200 focus-visible:ring-slate-400" className="!rounded-lg !py-2 !font-semibold" onClick={onClose}>
          Откажи
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!allScored || saving}
          variant="app-primary"
          className="!px-5 !py-2 !rounded-lg disabled:opacity-40"
        >
          {existingGrade ? 'Ажурирај оценка' : 'Зачувај оценка'} ({totalPoints}/{maxPoints})
        </Button>
      </>
    }>
      <div className="space-y-6">
        {/* Submission content */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Поднесок на ученикот</p>
          {submission?.type === 'photo' && submission.mediaUrl && (
            <img src={submission.mediaUrl} alt="Поднесена слика" className="max-h-80 w-full object-contain rounded-lg bg-black/20" />
          )}
          {submission?.type === 'video' && submission.mediaUrl && (
            <video src={submission.mediaUrl} controls className="max-h-80 w-full rounded-lg" />
          )}
          {submission?.type === 'audio' && submission.mediaUrl && (
            <audio src={submission.mediaUrl} controls className="w-full" />
          )}
          {submission?.type === 'survey' && (
            <div className="space-y-3">
              {(stage as SurveyStage).surveyQuestions.map((q, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-slate-300">{q}</p>
                  <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{submission.surveyAnswers?.[i] || '—'}</p>
                </div>
              ))}
            </div>
          )}
          {!submission && (
            <p className="text-sm text-slate-500 italic">Нема зачуван поднесок за оваа етапа.</p>
          )}
        </div>

        {/* Rubric criteria */}
        <div className="space-y-4">
          {rubric.criteria.map(c => (
            <div key={c.id}>
              <p className="text-sm font-bold text-slate-200 mb-2">{c.title}</p>
              <div className="flex flex-wrap gap-2">
                {c.levels.map(l => (
                  <Button
                    key={l.id}
                    type="button"
                    onClick={() => setScores(prev => ({ ...prev, [c.id]: l.points }))}
                    title={l.descriptor}
                    size="sm"
                    aria-pressed={scores[c.id] === l.points}
                    colorClassName={scores[c.id] === l.points
                      ? 'bg-indigo-600 border-indigo-500 text-white focus-visible:ring-indigo-500'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 focus-visible:ring-slate-500'}
                    className="!font-semibold border"
                  >
                    {scores[c.id] === l.points && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {l.label} · {l.points}п.
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div>
          <p className="text-sm font-bold text-slate-200 mb-2">Повратна информација (опционално)</p>
          {rubric.feedbackPresets && rubric.feedbackPresets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {rubric.feedbackPresets.map((preset, i) => (
                <Button
                  key={i}
                  type="button"
                  onClick={() => setFeedback(f => (f ? `${f} ${preset}` : preset))}
                  size="sm"
                  colorClassName="bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-300 focus-visible:ring-indigo-500"
                  className="!px-2.5 !py-1 !rounded-full !font-medium border"
                >
                  + {preset}
                </Button>
              ))}
            </div>
          )}
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Напиши коментар за ученикот..."
            className="w-full rounded-lg p-3 min-h-[80px] resize-none outline-none border border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 text-sm"
          />
        </div>
      </div>
    </Modal>
  );
}

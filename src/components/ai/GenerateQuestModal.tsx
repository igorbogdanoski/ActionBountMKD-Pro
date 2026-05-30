import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Loader2, AlertTriangle, Wand2 } from 'lucide-react';
import { generateQuest, isAiConfigured } from '../../utils/aiService';
import { AiQuestError, clampStageCount, MIN_STAGES, MAX_STAGES } from '../../lib/aiQuest';
import type { TemplateSubject } from '../../types';

interface GenerateQuestModalProps {
  open: boolean;
  onClose: () => void;
}

const SUBJECTS: TemplateSubject[] = [
  'Математика', 'Природни науки', 'Јазици', 'Историја', 'Физичко', 'Уметност', 'Останато',
];

const GRADES = ['1-3 одд.', '4-6 одд.', '7-9 одд.', 'Средно', 'Возрасни'];

export function GenerateQuestModal({ open, onClose }: GenerateQuestModalProps) {
  const navigate = useNavigate();

  const [topic, setTopic]           = useState('');
  const [subject, setSubject]       = useState<TemplateSubject>('Останато');
  const [grade, setGrade]           = useState(GRADES[1]);
  const [stageCount, setStageCount] = useState(5);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  if (!open) return null;

  const configured = isAiConfigured();

  const handleGenerate = async () => {
    const t = topic.trim();
    if (t.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const quest = await generateQuest({
        topic: t,
        subject,
        grade,
        stageCount: clampStageCount(stageCount),
      });
      navigate('/creator', { state: { templateData: quest } });
      onClose();
    } catch (err) {
      if (err instanceof AiQuestError) {
        setError(err.message);
      } else {
        setError('Грешка при генерирање. Провери ја интернет врската и обиди се повторно.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Генерирај авантура со AI"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">AI Генератор на авантури</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Опиши тема — AI ќе создаде нацрт за уредување</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Затвори"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!configured && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>AI генераторот не е конфигуриран. Постави <code className="font-mono">VITE_GEMINI_API_KEY</code>.</span>
            </div>
          )}

          <div>
            <label htmlFor="ai-topic" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Тема
            </label>
            <input
              id="ai-topic"
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="на пр. Сончевиот систем, Втора светска војна, Дропки…"
              maxLength={200}
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ai-subject" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Предмет
              </label>
              <select
                id="ai-subject"
                value={subject}
                onChange={e => setSubject(e.target.value as TemplateSubject)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ai-grade" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Возраст
              </label>
              <select
                id="ai-grade"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ai-stages" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Број на етапи: <span className="text-indigo-500 dark:text-indigo-400 font-bold">{stageCount}</span>
            </label>
            <input
              id="ai-stages"
              type="range"
              min={MIN_STAGES}
              max={MAX_STAGES}
              value={stageCount}
              onChange={e => setStageCount(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-sm text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Откажи
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !configured || topic.trim().length < 3}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:from-fuchsia-400 hover:to-indigo-500 shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Генерирам…</>
              : <><Wand2 className="w-4 h-4" /> Генерирај</>}
          </button>
        </div>
      </div>
    </div>
  );
}

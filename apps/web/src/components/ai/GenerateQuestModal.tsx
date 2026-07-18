import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertTriangle, Wand2 } from 'lucide-react';
import { generateQuest } from '../../utils/aiService';
import { trackEvent } from '../../utils/analytics';
import { AiQuestError, clampStageCount, MIN_STAGES, MAX_STAGES, type TemplateSubject } from 'shared';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
      trackEvent('ai_generation_used', { subject, grade, stage_count: clampStageCount(stageCount) });
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
    <Modal
      open={open}
      onClose={onClose}
      title="AI Генератор на авантури"
      size="lg"
      footer={
        <>
          <Button
            onClick={onClose}
            variant="ghost"
          >
            Откажи
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || topic.trim().length < 3}
            loading={loading}
            colorClassName="text-white bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:from-fuchsia-400 hover:to-indigo-500 focus-visible:ring-indigo-500"
            className="shadow-lg shadow-indigo-600/20"
          >
            {loading ? 'Генерирам…' : <><Wand2 aria-hidden="true" className="w-4 h-4" /> Генерирај</>}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Опиши тема — AI ќе создаде нацрт за уредување</p>
      </div>

      <div className="space-y-4">
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
          <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-sm text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

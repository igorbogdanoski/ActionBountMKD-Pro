import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Share2, Settings2, Eye, EyeOff, Loader2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { getQuestById, saveQuest } from '../../utils/storage';
import { useQuestEditor } from './hooks/useQuestEditor';
import { useAutoSave }    from './hooks/useAutoSave';
import { StageList }      from './StageList';
import { StageEditor }    from './StageEditor';
import { QuestSettingsPanel } from './QuestSettingsPanel';
import { ShareModal }     from './ShareModal';
import type { Quest, StageType } from '../../types';

// ─── Default empty quest ──────────────────────────────────────────────────────

function makeNewQuest(creatorId: string): Quest {
  return {
    id: crypto.randomUUID(),
    creatorId,
    title: '',
    description: '',
    visibility: 'secret',
    playMode: 'singleplayer',
    sequence: 'fixed',
    publicResults: false,
    hasIntro: false,
    hasOutro: false,
    stages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Panel modes ──────────────────────────────────────────────────────────────

type RightPanel = 'stage' | 'settings';

// ─── BoundCreator ─────────────────────────────────────────────────────────────

export function BoundCreator() {
  const { user } = useAuth();
  const { questId } = useParams<{ questId?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading]       = useState(!!questId);
  const [rightPanel, setRightPanel] = useState<RightPanel>('stage');
  const [shareOpen, setShareOpen]   = useState(false);

  // Editor state managed by useReducer
  const editor = useQuestEditor(makeNewQuest(user?.uid ?? ''));
  const { state, setField, addStage, dupStage, delStage, updateStage, reorder, select, load, setClean } = editor;
  const { quest, selectedStageId, isDirty } = state;

  // Load existing quest
  useEffect(() => {
    if (!questId) return;
    setLoading(true);
    getQuestById(questId)
      .then(q => { if (q) load(q); })
      .finally(() => setLoading(false));
  }, [questId]);

  // Auto-save with 2s debounce
  const { lastSaved, saving } = useAutoSave(quest, isDirty, setClean);

  // Manual save
  const handleSave = async () => {
    await saveQuest(quest);
    setClean();
  };

  const selectedStage = quest.stages.find(s => s.id === selectedStageId) ?? null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <button type="button" aria-label="Назад кон Dashboard" onClick={() => navigate('/dashboard')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Title inline edit */}
        <input
          type="text"
          placeholder="Наслов на авантурата..."
          value={quest.title}
          onChange={e => setField('title', e.target.value)}
          maxLength={200}
          className="flex-1 bg-transparent text-base font-bold text-white placeholder:text-slate-600 focus:outline-none min-w-0"
        />

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          {saving && <><Loader2 className="w-3 h-3 animate-spin" /> Зачувување...</>}
          {!saving && lastSaved && <>✓ {lastSaved.toLocaleTimeString('mk-MK', { hour: '2-digit', minute: '2-digit' })}</>}
          {!saving && !lastSaved && isDirty && <span className="text-amber-400">● Незачувано</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setRightPanel(p => p === 'settings' ? 'stage' : 'settings')}
            title="Поставки на квестот"
            className={`p-2 rounded-lg transition-colors ${rightPanel === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Settings2 className="w-4.5 h-4.5" />
          </button>
          <button type="button" aria-label="Сподели квест" onClick={() => setShareOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Share2 className="w-4.5 h-4.5" />
          </button>
          <button type="button" onClick={handleSave} disabled={!isDirty}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold transition-colors">
            <Save className="w-4 h-4" />
            Зачувај
          </button>
        </div>
      </header>

      {/* Three-column workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Stage list */}
        <div className="w-72 shrink-0 border-r border-slate-800 flex flex-col bg-slate-900">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Етапи ({quest.stages.length})
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <StageList
              stages={quest.stages}
              selectedId={selectedStageId}
              onSelect={select}
              onAdd={(type: StageType, afterIndex: number) => {
                addStage(type, afterIndex);
                setRightPanel('stage');
              }}
              onDuplicate={dupStage}
              onDelete={delStage}
              onReorder={reorder}
            />
          </div>
        </div>

        {/* Right panel: Stage editor OR Quest settings */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-950">
          {rightPanel === 'settings' ? (
            <QuestSettingsPanel quest={quest} onChange={setField} />
          ) : selectedStage ? (
            <StageEditor
              stage={selectedStage}
              onChange={updates => updateStage(selectedStage.id, updates)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
                <Eye className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm max-w-xs">
                Избери постоечка етапа или додај нова за да почнеш да уредуваш.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {shareOpen && (
        <ShareModal questId={quest.id} questTitle={quest.title} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

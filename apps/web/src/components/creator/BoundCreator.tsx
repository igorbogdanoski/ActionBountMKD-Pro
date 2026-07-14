import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, Share2, Settings2, Eye, EyeOff, Loader2, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { getQuestById, saveQuest } from '../../utils/storage';
import { trackEvent } from '../../utils/analytics';
import { useQuestEditor } from './hooks/useQuestEditor';
import { useAutoSave }    from './hooks/useAutoSave';
import { StageList }      from './StageList';
import { StageEditor }    from './StageEditor';
import { QuestSettingsPanel } from './QuestSettingsPanel';
import { FindSpotPlannerPanel } from './FindSpotPlannerPanel';
import { ShareModal }     from './ShareModal';
import type { Coordinates, Quest, StageType } from 'shared';

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
    inventoryItems: [],
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
  const location = useLocation();

  const [loading, setLoading]       = useState(!!questId);
  const [rightPanel, setRightPanel] = useState<RightPanel>('stage');
  const [shareOpen, setShareOpen]   = useState(false);
  // Mobile: which panel is visible (stages | editor)
  const [mobilePanel, setMobilePanel] = useState<'stages' | 'editor'>('stages');
  const [pendingFindSpotCoordinates, setPendingFindSpotCoordinates] = useState<Coordinates | null>(null);

  // Editor state managed by useReducer
  const editor = useQuestEditor(makeNewQuest(user?.uid ?? ''));
  const { state, setField, addStage, dupStage, delStage, updateStage, reorder, select, load, setClean } = editor;
  const { quest, selectedStageId, isDirty } = state;

  // Activation/publish tracking refs — declared here (not inline where used
  // below) since the quest-load effect needs to seed
  // lastPersistedVisibilityRef before the save-tracking effect reads it.
  const createdTrackedRef = useRef(false);
  const lastPersistedVisibilityRef = useRef<Quest['visibility'] | null>(null);

  // Sync creatorId once user is confirmed (avoids Firestore permission error on cold load)
  useEffect(() => {
    if (user?.uid && !quest.creatorId) {
      setField('creatorId', user.uid);
    }
  }, [user?.uid]);

  // Load existing quest or template from navigation state
  useEffect(() => {
    const tpl = (location.state as any)?.templateData;
    if (tpl && !questId) {
      load({
        ...makeNewQuest(user?.uid ?? ''),
        title: tpl.title ?? '',
        description: tpl.description ?? '',
        stages: tpl.stages ?? [],
        ...(tpl.curriculumRef ? { pedagogy: { curriculumRef: tpl.curriculumRef } } : {}),
      });
      return;
    }
    if (!questId) return;
    setLoading(true);
    getQuestById(questId)
      .then(q => { if (q) { load(q); lastPersistedVisibilityRef.current = q.visibility; } })
      .finally(() => setLoading(false));
  }, [questId]);

  // Auto-save with 2s debounce
  const { lastSaved, saving, error: saveError, retry: retrySave } = useAutoSave(quest, isDirty, setClean);

  // Manual save
  const handleSave = async () => {
    await saveQuest(quest);
    setClean();
  };

  // Activation/publish signals — fired once a save actually persists, not
  // on every keystroke. quest_created: the first successful save of a
  // brand-new quest (opened via /creator, no questId param). quest_published:
  // each time a save persists visibility flipping to 'public'.
  useEffect(() => {
    if (!lastSaved) return;
    if (!questId && !createdTrackedRef.current) {
      createdTrackedRef.current = true;
      trackEvent('quest_created', { quest_id: quest.id });
    }
    if (quest.visibility === 'public' && lastPersistedVisibilityRef.current !== 'public') {
      trackEvent('quest_published', { quest_id: quest.id });
    }
    lastPersistedVisibilityRef.current = quest.visibility;
  }, [lastSaved]);

  const selectedStage = quest.stages.find(s => s.id === selectedStageId) ?? null;

  useEffect(() => {
    if (!pendingFindSpotCoordinates || !selectedStageId) return;
    const pendingStage = quest.stages.find(stage => stage.id === selectedStageId);
    if (!pendingStage || pendingStage.type !== 'FIND_SPOT') return;

    updateStage(pendingStage.id, { targetCoordinates: pendingFindSpotCoordinates });
    setPendingFindSpotCoordinates(null);
  }, [pendingFindSpotCoordinates, quest.stages, selectedStageId, updateStage]);

  const handleAddFindSpotAtCoordinates = (coordinates: Coordinates) => {
    setPendingFindSpotCoordinates(coordinates);
    addStage('FIND_SPOT');
    setRightPanel('stage');
    setMobilePanel('editor');
  };

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
          {!saving && saveError && (
            <button type="button" onClick={() => retrySave()} title={saveError}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors">
              <AlertTriangle className="w-3 h-3" /> Грешка при зачувување — обиди се
            </button>
          )}
          {!saving && !saveError && lastSaved && <>✓ {lastSaved.toLocaleTimeString('mk-MK', { hour: '2-digit', minute: '2-digit' })}</>}
          {!saving && !saveError && !lastSaved && isDirty && <span className="text-amber-400">● Незачувано</span>}
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

      {/* Workspace — desktop: 2 columns | mobile: single panel with bottom tabs */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Stage list — hidden on mobile when editor is active */}
        <div className={`
          w-full md:w-72 md:shrink-0 border-r border-slate-800 flex flex-col bg-slate-900
          ${mobilePanel === 'editor' ? 'hidden md:flex' : 'flex'}
        `}>
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Етапи ({quest.stages.length})
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <StageList
              stages={quest.stages}
              selectedId={selectedStageId}
              onSelect={id => { select(id); setMobilePanel('editor'); }}
              onAdd={(type: StageType, afterIndex: number) => {
                addStage(type, afterIndex);
                setRightPanel('stage');
                setMobilePanel('editor');
              }}
              onDuplicate={dupStage}
              onDelete={delStage}
              onReorder={reorder}
            />
          </div>
          <FindSpotPlannerPanel
            stages={quest.stages}
            selectedStageId={selectedStageId}
            onSelectStage={id => { select(id); setRightPanel('stage'); setMobilePanel('editor'); }}
            onMoveStage={(id, coordinates) => updateStage(id, { targetCoordinates: coordinates })}
            onAddStageAtCoordinates={handleAddFindSpotAtCoordinates}
          />
        </div>

        {/* Right panel: Stage editor OR Quest settings — hidden on mobile when stages panel is active */}
        <div className={`
          flex-1 overflow-hidden flex flex-col bg-slate-950
          ${mobilePanel === 'stages' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Mobile back button */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 md:hidden shrink-0">
            <button
              type="button"
              onClick={() => setMobilePanel('stages')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Назад кон етапи
            </button>
          </div>
          {rightPanel === 'settings' ? (
            <QuestSettingsPanel quest={quest} onChange={setField} />
          ) : selectedStage ? (
            <StageEditor
              stage={selectedStage}
              allStages={quest.stages}
              inventoryItems={quest.inventoryItems ?? []}
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
        <ShareModal questId={quest.id} questTitle={quest.title} publicLeaderboard={quest.publicLeaderboard} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}


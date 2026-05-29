import { SVGProps, useState, useEffect, useRef } from 'react';
import { 
  AlignLeft, 
  HelpCircle, 
  Image as ImageIcon, 
  MapPin, 
  QrCode, 
  ListTodo, 
  Settings as SettingsIcon,
  Play,
  Save,
  Share2,
  Trash2,
  GripVertical,
  Settings,
  X,
  RefreshCw,
  Users
} from 'lucide-react';
import { ShareModal } from './ShareModal';
import { MapSelector } from '../MapSelector';
import { Stage, StageType, SequenceType } from '../../types';
import { saveQuest } from '../../utils/storage';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableStageItem({ stage, index, stageTypes, isSelected, onClick, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeInfo = stageTypes.find((t: any) => t.id === stage.type.toLowerCase().replace('_', '')) || stageTypes[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-800 rounded-xl border-2 ${isSelected ? 'border-emerald-500' : 'border-slate-700 hover:border-slate-600'} p-4 shadow-sm relative ml-3 transition-colors flex items-start gap-4 mb-4`}
      onClick={onClick}
    >
      <div className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 ${isSelected ? 'bg-emerald-500' : 'bg-slate-600'} text-white text-[10px] flex items-center justify-center rounded-full font-bold border-4 border-slate-900 transition-colors`}>{index + 1}</div>
      
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing hover:bg-slate-700 p-2 rounded text-slate-500 self-center"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className={`w-12 h-12 ${typeInfo.bgColor} rounded-lg flex items-center justify-center ${typeInfo.color} shrink-0`}>
        <typeInfo.icon className="w-6 h-6" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-200 truncate">{stage.title}</h3>
        <p className="text-sm text-slate-400 line-clamp-2">{stage.description}</p>
        {(stage as any).timeLimitSeconds > 0 && (
          <p className="text-xs text-amber-400 mt-1 font-mono">⏱ Време: {(stage as any).timeLimitSeconds}s</p>
        )}
        {stage.type === 'FIND_SPOT' && (
          <div className="mt-4" onClick={e => e.stopPropagation()}>
             <MapSelector 
               height="120px" 
               initialCoordinates={(stage as any).targetCoordinates} 
               onLocationSelect={() => {}} 
             />
          </div>
        )}
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(stage.id);
        }}
        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

import { MobilePlayer } from '../player/MobilePlayer';
import { QRCodeSVG } from 'qrcode.react';

function CollaboratorsList({ collaborators, onChange }: { collaborators: any[], onChange: (c: any[]) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');

  const handleAdd = () => {
    if (!email.trim() || !email.includes('@')) return;
    onChange([...collaborators, { email: email.trim(), role }]);
    setEmail('');
  };

  const handleRemove = (index: number) => {
    const newQuests = [...collaborators];
    newQuests.splice(index, 1);
    onChange(newQuests);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
        <Users className="w-4 h-4" /> Соработници
      </label>
      <div className="flex gap-2">
        <input 
          type="email" 
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Емаил адреса"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 transition-colors"
        />
        <select 
          value={role}
          onChange={e => setRole(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="viewer">Само преглед</option>
          <option value="editor">Уредувач</option>
        </select>
        <button 
          onClick={handleAdd}
          disabled={!email.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          Додај
        </button>
      </div>
      
      {collaborators.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col gap-2 max-h-32 overflow-y-auto">
          {collaborators.map((c, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded-md">
              <span className="text-sm font-medium text-slate-300">{c.email}</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.role === 'editor' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
                  {c.role === 'editor' ? 'Уредувач' : 'Преглед'}
                </span>
                <button onClick={() => handleRemove(idx)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BoundCreator({ initialData }: { initialData?: any } = {}) {
  const [title, setTitle] = useState(initialData?.title || 'Нова Авантура');
  const [description, setDescription] = useState(initialData?.description || 'Опис на авантурата');
  const [coverImage, setCoverImage] = useState<string>(initialData?.coverImage || '');
  const [collaborators, setCollaborators] = useState<any[]>(initialData?.collaborators || []);
  const [sequence, setSequence] = useState<any>(initialData?.sequence || 'fixed');
  const [stages, setStages] = useState<Stage[]>(initialData?.stages || [
    {
      id: '1',
      type: 'INFO',
      title: 'Информации: Почеток кај Камени Мост',
      description: 'Добредојдовте во авантурата. Погледнете го видеото пред да почнете...',
      order: 0,
    } as any
  ]);
  const [selectedStageId, setSelectedStageId] = useState<string>(initialData?.stages?.[0]?.id || '1');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [questId] = useState(`quest-${Date.now()}`);
  const [lastSavedMark, setLastSavedMark] = useState<Date | null>(null);

  const stateRef = useRef({ title, description, coverImage, sequence, stages, questId, collaborators });
  useEffect(() => {
    stateRef.current = { title, description, coverImage, sequence, stages, questId, collaborators };
  }, [title, description, coverImage, sequence, stages, questId, collaborators]);

  useEffect(() => {
    const handleAutoSave = async () => {
      const { title, description, coverImage, sequence, stages, questId, collaborators } = stateRef.current;
      await saveQuest({
        id: questId,
        title,
        description,
        coverImage,
        creatorId: 'user-1',
        collaborators,
        visibility: 'public',
        playMode: 'singleplayer',
        sequence,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stages: stages.map((s, idx) => ({ ...s, order: idx }))
      });
      setLastSavedMark(new Date());
    };

    const intervalId = setInterval(handleAutoSave, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setStages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async (silent = false) => {
    await saveQuest({
      id: questId,
      title,
      description,
      coverImage,
      creatorId: 'user-1',
      visibility: 'public',
      playMode: 'singleplayer',
      sequence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stages: stages.map((s, idx) => ({ ...s, order: idx }))
    });
    setLastSavedMark(new Date());
    if (silent !== true) {
      alert('Авантурата е успешно зачувана!');
    }
  };

  const stageTypes = [
    { id: 'info', name: 'Информации', icon: AlignLeft, color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
    { id: 'quiz', name: 'Квиз', icon: HelpCircle, color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
    { id: 'mission', name: 'Мисија', icon: ImageIcon, color: 'text-pink-400', bgColor: 'bg-pink-400/20' },
    { id: 'spot', name: 'Најди локација', icon: MapPin, color: 'text-green-400', bgColor: 'bg-green-400/20' },
    { id: 'scan', name: 'Скенирај код', icon: QrCode, color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
    { id: 'survey', name: 'Анкета', icon: ListTodo, color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  ];

  const selectedStage = stages.find(s => s.id === selectedStageId);
  
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Top Toolbar */}
      <header className="h-16 bg-slate-800 border-b border-slate-700 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-bold text-slate-100 bg-transparent border-none focus:ring-0 p-0"
          />
          <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs font-bold rounded uppercase">Нацрт</span>
          
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          
          <select 
            value={sequence} 
            onChange={e => setSequence(e.target.value as SequenceType)}
            className="bg-slate-700 border-none rounded text-xs font-bold text-slate-300 py-1 pl-2 pr-6 focus:ring-0"
          >
            <option value="fixed">Линеарна</option>
            <option value="selectable">Избор од играч</option>
            <option value="random">Случаен редослед</option>
          </select>

          {lastSavedMark && <span className="text-xs text-slate-500 font-medium ml-4">Зачувано {lastSavedMark.toLocaleTimeString()}</span>}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-2 border rounded-lg text-sm font-semibold border-slate-600 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" /> Поставки
          </button>
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-2 border rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${showPreview ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'border-slate-600 hover:bg-slate-700'}`}
          >
            <Play className="w-4 h-4" /> Преглед
          </button>
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg text-sm font-semibold hover:bg-indigo-500/20 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Сподели
          </button>
          <button 
            onClick={() => handleSave()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all whitespace-nowrap flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Зачувај промени
          </button>
        </div>
      </header>

      {/* Builder Workspace */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Stage List */}
        <div className="flex-1 flex flex-col overflow-y-auto pr-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-400 uppercase text-xs tracking-wider">Етапи на квестувањето</h2>
            <button className="text-emerald-400 text-xs font-bold hover:underline">+ Додај нова етапа</button>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {stages.map((stage, index) => (
                <SortableStageItem 
                  key={stage.id} 
                  stage={stage} 
                  index={index} 
                  stageTypes={stageTypes} 
                  isSelected={stage.id === selectedStageId}
                  onClick={() => setSelectedStageId(stage.id)}
                  onDelete={(id: string) => setStages(s => s.filter(x => x.id !== id))}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Empty Drop Zone */}
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 mt-6 bg-slate-800/50">
            <div className="p-3 bg-slate-700 rounded-full mb-3">
              <PlusIcon className="w-8 h-8" />
            </div>
            <p className="font-medium">Довлечи елемент за да додадеш нова етапа</p>
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pb-4">
          {/* Element Drawer */}
          <div className="bg-slate-800 rounded-2xl shadow-xl p-4 border border-slate-700 shrink-0">
            <h2 className="font-bold mb-4 px-2 text-slate-200">Елементи</h2>
            <div className="grid grid-cols-2 gap-3">
              {stageTypes.map((type) => (
                <div 
                  key={type.id} 
                  onClick={() => {
                    const newStage: any = {
                      id: Math.random().toString(),
                      type: type.id === 'spot' ? 'FIND_SPOT' : type.id === 'scan' ? 'SCAN_CODE' : type.id.toUpperCase(),
                      title: `Нова етапа: ${type.name}`,
                      description: 'Опис на етапата...',
                      order: stages.length,
                    };
                    if (type.id === 'spot') {
                      newStage.targetCoordinates = { latitude: 41.9981, longitude: 21.4254 };
                    } else if (type.id === 'quiz') {
                      newStage.questionType = 'multiple_choice';
                      newStage.options = ['Опција 1', 'Опција 2', 'Опција 3'];
                    }
                    setStages([...stages, newStage]);
                    setSelectedStageId(newStage.id);
                  }}
                  className="p-3 bg-slate-900/50 border border-slate-700/50 rounded-xl flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform hover:border-slate-600 hover:bg-slate-700"
                >
                  <div className={`w-10 h-10 ${type.bgColor} ${type.color} rounded-lg flex items-center justify-center`}>
                    <type.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 text-center">{type.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Edit (Instead of just mobile preview, make it editable) */}
          {selectedStage && (
            <div className="bg-slate-800 rounded-2xl shadow-xl p-4 border border-slate-700 shrink-0">
               {/* Quick Edit code is untouched here, we're just matching the block closure and adding preview */}
               <h2 className="font-bold mb-4 px-2 text-slate-200">Уредувач на етапа</h2>
              <div className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Наслов</label>
                   <input 
                     value={selectedStage.title}
                     onChange={(e) => setStages(s => s.map(x => x.id === selectedStage.id ? { ...x, title: e.target.value } : x))}
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Опис & Мултимедија</label>
                   <textarea 
                     value={selectedStage.description}
                     onChange={(e) => setStages(s => s.map(x => x.id === selectedStage.id ? { ...x, description: e.target.value } : x))}
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none h-24 resize-none"
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Аудио URL (опционално, mp3/wav)</label>
                   <input 
                     placeholder="https://example.com/audio.mp3"
                     value={selectedStage.audioUrl || ''}
                     onChange={(e) => setStages(s => s.map(x => x.id === selectedStage.id ? { ...x, audioUrl: e.target.value } : x))}
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none mb-3"
                   />
                </div>
                {(selectedStage.type === 'INFO' || selectedStage.type === 'QUIZ') && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">YouTube URL / Слика (опционално)</label>
                    <input 
                      placeholder="https://youtube.com/watch?v=..."
                      value={(selectedStage as any).mediaUrl || ''}
                      onChange={(e) => setStages(s => s.map(x => x.id === selectedStage.id ? { ...x, mediaUrl: e.target.value } : x))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none mb-3"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Време (секунди, 0=неограничено)</label>
                  <input 
                    type="number"
                    value={(selectedStage as any).timeLimitSeconds || 0}
                    onChange={(e) => setStages(s => s.map(x => x.id === selectedStage.id ? { ...x, timeLimitSeconds: parseInt(e.target.value) || 0 } : x))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                  />
                </div>
                {selectedStage.type === 'SCAN_CODE' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Целен QR код (Вредност)</label>
                    <div className="flex flex-col gap-3">
                      <input 
                        placeholder="На пример: TAJNA_KODA_123"
                        value={(selectedStage as any).targetCode || ''}
                        onChange={(e) => setStages(s => s.map(x => x.id === selectedStage.id ? { ...x, targetCode: e.target.value } : x))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                      />
                      {(selectedStage as any).targetCode && (
                        <div className="bg-slate-900 p-4 rounded-xl flex flex-col items-center justify-center border border-slate-700">
                          <div className="bg-white p-2 rounded-lg" id={`qr-code-${selectedStage.id}`}>
                            <QRCodeSVG value={(selectedStage as any).targetCode} size={150} />
                          </div>
                          <button 
                            className="mt-4 text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg w-full font-bold flex items-center justify-center gap-2"
                            onClick={() => {
                              const svg = document.getElementById(`qr-code-${selectedStage.id}`)?.querySelector('svg');
                              if (svg) {
                                const svgData = new XMLSerializer().serializeToString(svg);
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                const img = new Image();
                                img.onload = () => {
                                  canvas.width = img.width;
                                  canvas.height = img.height;
                                  ctx?.drawImage(img, 0, 0);
                                  const pngFile = canvas.toDataURL('image/png');
                                  const downloadLink = document.createElement('a');
                                  downloadLink.download = `qr_${(selectedStage as any).targetCode}.png`;
                                  downloadLink.href = `${pngFile}`;
                                  downloadLink.click();
                                };
                                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                              }
                            }}
                          >
                            <QrCode className="w-4 h-4" /> Преземи за печатење
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedStage.type === 'FIND_SPOT' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Икона на мапата</label>
                    <select 
                      value={(selectedStage as any).mapIcon || 'map-pin'}
                      onChange={(e) => setStages(s => s.map(x => x.id === selectedStage.id ? { ...x, mapIcon: e.target.value } : x))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                    >
                      <option value="map-pin">Стандардна игла (Pin)</option>
                      <option value="museum">Музеј (Museum)</option>
                      <option value="park">Парк (Tree)</option>
                      <option value="statue">Статуа (Monument)</option>
                      <option value="school">Училиште (School)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="w-[375px] shrink-0 border border-slate-700 bg-black relative rounded-3xl overflow-hidden shadow-2xl ml-4">
             <MobilePlayer 
               questId={questId} 
               questProp={{
                 id: questId, 
                 title, 
                 description: 'Preview', 
                 creatorId: 'me', 
                 visibility: 'public', 
                 playMode: 'singleplayer', 
                 sequence, 
                 createdAt: '', 
                 updatedAt: '', 
                 stages: stages.map((s, idx) => ({ ...s, order: idx }))
               }} 
               isPreview={true} 
             />
          </div>
        )}
      </div>
      
      {isShareModalOpen && (
        <ShareModal 
          questId={questId} 
          questTitle={title} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}

      {/* Quest Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex flex-row items-center gap-2">Поставки за Авантурата</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Опис</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 outline-none h-24 resize-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Link од насловна слика</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <CollaboratorsList collaborators={collaborators} onChange={setCollaborators} />
            
            <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 flex flex-col items-center">
               <p className="text-sm font-bold text-indigo-300 mb-2">Генерирај слика со AI (Imagen)</p>
               <p className="text-xs text-indigo-400 mb-4 text-center">Создајте уникатна насловна слика базирана на насловот и описот на авантурата.</p>
               <button 
                 onClick={() => {
                   setIsGeneratingImg(true);
                   setTimeout(() => {
                     // Fake generation
                     setCoverImage('https://images.unsplash.com/photo-1548345680-f5475ea90f1b?auto=format&fit=crop&q=80&w=800');
                     setIsGeneratingImg(false);
                   }, 2000);
                 }}
                 disabled={isGeneratingImg}
                 className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-600/20 disabled:scale-100 disabled:opacity-50 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
               >
                 {isGeneratingImg ? <><RefreshCw className="w-4 h-4 animate-spin" /> Се генерира...</> : 'Генерирај слика'}
               </button>
            </div>
            
            {coverImage && (
              <img src={coverImage} alt="Cover Preview" className="w-full h-32 object-cover rounded-xl mt-2 border border-slate-700" />
            )}
            
            <button onClick={() => { handleSave(true); setIsSettingsOpen(false); }} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all shadow-md mt-4">Зачувај промени</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ImagePlaceholderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
  );
}

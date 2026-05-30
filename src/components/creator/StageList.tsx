import { Plus, GripVertical, Copy, Trash2, MapPin, HelpCircle, Camera, QrCode, ListTodo, AlignLeft, Trophy, GitBranch } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Stage, StageType } from '../../types';

// ─── Stage type config ────────────────────────────────────────────────────────

export const STAGE_TYPE_CONFIG: Record<StageType, {
  label: string; icon: React.ElementType;
  color: string; bg: string;
}> = {
  INFO:       { label: 'Информација', icon: AlignLeft,   color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  QUIZ:       { label: 'Квиз',        icon: HelpCircle,  color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  MISSION:    { label: 'Мисија',      icon: Camera,      color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  FIND_SPOT:  { label: 'GPS Место',   icon: MapPin,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  SCAN_CODE:  { label: 'QR Код',      icon: QrCode,      color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  SURVEY:     { label: 'Анкета',      icon: ListTodo,    color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  TOURNAMENT: { label: 'Турнир',      icon: Trophy,      color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  SWITCH:     { label: 'Услов/Гранка', icon: GitBranch,  color: 'text-violet-400',  bg: 'bg-violet-500/10' },
};

// ─── Add stage button (between stages) ───────────────────────────────────────

function InsertButton({ onInsert }: { onInsert: (type: StageType) => void }) {
  return (
    <div className="relative group flex items-center justify-center my-1">
      <div className="absolute inset-x-0 h-px bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 shadow-lg">
          {(Object.keys(STAGE_TYPE_CONFIG) as StageType[]).map(type => {
            const cfg = STAGE_TYPE_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                type="button"
                title={cfg.label}
                onClick={() => onInsert(type)}
                className={`p-1.5 rounded-md ${cfg.bg} ${cfg.color} hover:scale-110 transition-transform`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable stage card ──────────────────────────────────────────────────────

interface StageCardProps {
  stage: Stage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SortableStageCard({ stage, index, isSelected, onSelect, onDuplicate, onDelete }: StageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const cfg = STAGE_TYPE_CONFIG[stage.type];
  const Icon = cfg.icon;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-xl border-2 transition-all cursor-pointer select-none ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${
        isSelected
          ? 'border-indigo-500 bg-indigo-950/60 shadow-md shadow-indigo-500/10'
          : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
      }`}
      onClick={onSelect}
    >
      {/* Index bubble */}
      <span className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-slate-900 ${
        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-600 text-slate-300'
      }`}>
        {index + 1}
      </span>

      <div className="flex items-center gap-3 p-3 pr-2">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 shrink-0 touch-none"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Type icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">
            {stage.title || <span className="text-slate-500 italic">Без наслов</span>}
          </p>
          <p className="text-xs text-slate-500">{cfg.label}</p>
        </div>

        {/* Actions */}
        <div
          className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            title="Дупликат"
            onClick={onDuplicate}
            className="p-1.5 rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Избриши"
            onClick={onDelete}
            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stage List ───────────────────────────────────────────────────────────────

interface StageListProps {
  stages: Stage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: StageType, afterIndex: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
}

export function StageList({
  stages, selectedId, onSelect, onAdd, onDuplicate, onDelete, onReorder,
}: StageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) onReorder(oldIndex, newIndex);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Add first stage */}
      {stages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-slate-500 text-sm">Нема етапи уште</p>
          <div className="grid grid-cols-2 gap-2 w-full">
            {(Object.keys(STAGE_TYPE_CONFIG) as StageType[]).map(type => {
              const cfg = STAGE_TYPE_CONFIG[type];
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onAdd(type, -1)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border border-slate-700 hover:border-slate-500 ${cfg.bg} text-left transition-colors`}
                >
                  <Icon className={`w-4 h-4 ${cfg.color} shrink-0`} />
                  <span className="text-xs font-medium text-slate-300">{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stage list with insert buttons */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0 group">
            {/* Insert before first */}
            {stages.length > 0 && (
              <InsertButton onInsert={type => onAdd(type, -1)} />
            )}

            {stages.map((stage, idx) => (
              <div key={stage.id}>
                <SortableStageCard
                  stage={stage}
                  index={idx}
                  isSelected={selectedId === stage.id}
                  onSelect={() => onSelect(stage.id)}
                  onDuplicate={() => onDuplicate(stage.id)}
                  onDelete={() => onDelete(stage.id)}
                />
                {/* Insert after each stage */}
                <InsertButton onInsert={type => onAdd(type, idx)} />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

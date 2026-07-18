import { useState } from 'react';
import { Plus, GripVertical, Copy, Trash2, MapPin, HelpCircle, Camera, QrCode, ScanLine, ListTodo, AlignLeft, Trophy, GitBranch } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Stage, StageType } from 'shared';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
  QR_TASK:    { label: 'QR Задача',   icon: ScanLine,    color: 'text-teal-400',    bg: 'bg-teal-500/10' },
  SURVEY:     { label: 'Анкета',      icon: ListTodo,    color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  TOURNAMENT: { label: 'Турнир',      icon: Trophy,      color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  SWITCH:     { label: 'Услов/Гранка', icon: GitBranch,  color: 'text-violet-400',  bg: 'bg-violet-500/10' },
};

// ─── Add stage button (between stages) ───────────────────────────────────────

function InsertButton({ onInsert }: { onInsert: (type: StageType) => void }) {
  return (
    <div className="relative group flex items-center justify-center my-1">
      <div className="absolute inset-x-0 h-px bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
      <div className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 shadow-lg">
          {(Object.keys(STAGE_TYPE_CONFIG) as StageType[]).map(type => {
            const cfg = STAGE_TYPE_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <Button
                key={type}
                type="button"
                size="icon"
                aria-label={`Вметни: ${cfg.label}`}
                onClick={() => onInsert(type)}
                colorClassName={`${cfg.bg} ${cfg.color} hover:brightness-125 focus-visible:ring-indigo-500`}
                className="p-1.5 transition-transform hover:scale-110"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
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
  onRequestDelete: () => void;
}

/** The image a stage actually shows to players, if any — used as the card thumbnail. */
function getStageThumbnail(stage: Stage): string | undefined {
  if (stage.type === 'INFO' && stage.mediaType === 'image' && stage.mediaUrl) return stage.mediaUrl;
  if (stage.type === 'QR_TASK' && stage.taskMediaUrl) return stage.taskMediaUrl;
  return undefined;
}

function SortableStageCard({ stage, index, isSelected, onSelect, onDuplicate, onRequestDelete }: StageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const cfg = STAGE_TYPE_CONFIG[stage.type];
  const Icon = cfg.icon;
  const thumbnail = getStageThumbnail(stage);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative overflow-hidden rounded-xl border-2 transition-all select-none ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${
        isSelected
          ? 'border-indigo-500 bg-indigo-950/60 shadow-md shadow-indigo-500/10'
          : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
      }`}
    >
      <Button
        type="button"
        size="icon"
        aria-label={`Избери етапа ${index + 1}: ${stage.title.trim() || cfg.label}`}
        aria-pressed={isSelected}
        onClick={onSelect}
        colorClassName="bg-transparent focus-visible:ring-indigo-400"
        className="absolute inset-0 z-0 h-full w-full cursor-pointer rounded-xl p-0 focus-visible:ring-inset"
      />
      {/* Thumbnail */}
      <div className={`pointer-events-none relative z-[1] flex h-20 w-full items-center justify-center ${thumbnail ? 'bg-slate-950' : cfg.bg}`}>
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon className={`w-7 h-7 ${cfg.color}`} />
        )}

        {/* Index bubble */}
        <span className={`absolute left-2 top-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
          isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-900/90 text-slate-200'
        }`}>
          {index + 1}
        </span>

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          aria-label={`Пререди етапа ${index + 1}`}
          className="pointer-events-auto absolute right-2 top-2 cursor-grab touch-none rounded bg-slate-900/70 p-1 text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 active:cursor-grabbing"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
        </div>

        {/* Actions */}
        <div
          className="pointer-events-auto absolute bottom-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={e => e.stopPropagation()}
        >
          <Button
            type="button"
            size="icon"
            aria-label={`Дуплирај етапа ${index + 1}`}
            onClick={onDuplicate}
            colorClassName="bg-slate-900/70 text-slate-300 hover:bg-slate-900 hover:text-indigo-400 focus-visible:ring-indigo-400"
            className="p-1.5"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            aria-label={`Избриши етапа ${index + 1}`}
            onClick={onRequestDelete}
            colorClassName="bg-slate-900/70 text-slate-300 hover:bg-slate-900 hover:text-rose-400 focus-visible:ring-rose-400"
            className="p-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="pointer-events-none relative z-[1] flex items-center gap-2 px-3 py-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">
            {stage.title || <span className="text-slate-500 italic">Без наслов</span>}
          </p>
          <p className="text-xs text-slate-500">{cfg.label}</p>
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

export function getStageReorderIndices(
  stages: Stage[],
  activeId: string | number,
  overId: string | number | null,
): [oldIndex: number, newIndex: number] | null {
  if (overId === null || activeId === overId) return null;
  const oldIndex = stages.findIndex(stage => stage.id === activeId);
  const newIndex = stages.findIndex(stage => stage.id === overId);
  return oldIndex === -1 || newIndex === -1 ? null : [oldIndex, newIndex];
}

export function StageList({
  stages, selectedId, onSelect, onAdd, onDuplicate, onDelete, onReorder,
}: StageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const indices = getStageReorderIndices(stages, active.id, over?.id ?? null);
    if (indices) onReorder(...indices);
  };

  const confirmDelete = () => {
    if (deleteTarget) onDelete(deleteTarget.id);
    setDeleteTarget(null);
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
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  onClick={() => onAdd(type, -1)}
                  colorClassName={`${cfg.bg} text-slate-300 hover:border-slate-500 focus-visible:ring-indigo-500`}
                  className="justify-start border border-slate-700 p-2.5 text-left"
                  leftIcon={<Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} aria-hidden="true" />}
                >
                  <span className="text-xs font-medium">{cfg.label}</span>
                </Button>
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
                  onRequestDelete={() => setDeleteTarget({ id: stage.id, label: stage.title.trim() || `Етапа ${idx + 1}` })}
                />
                {/* Insert after each stage */}
                <InsertButton onInsert={type => onAdd(type, idx)} />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Избриши етапа?"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Откажи
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={confirmDelete}
            >
              Избриши
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Дали сакаш да ја избришеш „{deleteTarget?.label}“? Ова не може да се врати.
        </p>
      </Modal>
    </div>
  );
}


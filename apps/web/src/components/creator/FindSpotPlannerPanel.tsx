import { lazy, Suspense, useMemo, useState } from 'react';
import { Loader2, MapPin, Plus } from 'lucide-react';
import type { Coordinates, Stage } from 'shared';
import { getFindSpotMarkers } from '../../lib/findSpotPlanner';
import { Button } from '../ui/Button';

const MapSelector = lazy(() =>
  import('../MapSelector').then(module => ({ default: module.MapSelector }))
);

interface Props {
  stages: Stage[];
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
  onMoveStage: (stageId: string, coordinates: Coordinates) => void;
  onAddStageAtCoordinates: (coordinates: Coordinates) => void;
}

export function FindSpotPlannerPanel({ stages, selectedStageId, onSelectStage, onMoveStage, onAddStageAtCoordinates }: Props) {
  const [addingPoint, setAddingPoint] = useState(false);
  const markers = useMemo(() => getFindSpotMarkers(stages), [stages]);
  const plannerMarkers = useMemo(() => markers.map((marker, index) => ({
    id: marker.stageId,
    coordinates: marker.coordinates,
    label: `${index + 1}`,
    title: marker.title || `Точка ${index + 1}`,
    draggable: true,
  })), [markers]);

  return (
    <div className="border-t border-slate-800 bg-slate-950/70 p-3 space-y-3 shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Мапа на точки</p>
          <p className="text-xs text-slate-400">
            {addingPoint
              ? 'Кликни на мапата за да додадеш нова FIND_SPOT етапа.'
              : 'Повлечи маркер за промена на координати. Бројките го следат редоследот на етапите.'}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setAddingPoint(value => !value)}
          variant={addingPoint ? 'success' : 'secondary'}
          size="sm"
          aria-pressed={addingPoint}
          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          className="shrink-0"
        >
          {addingPoint ? 'Откажи додавање' : 'Нова точка'}
        </Button>
      </div>

      <Suspense fallback={
        <div className="h-56 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      }>
        <MapSelector
          markers={plannerMarkers}
          onMarkerMove={onMoveStage}
          onMarkerSelect={onSelectStage}
          onMapClick={addingPoint ? coords => {
            onAddStageAtCoordinates(coords);
            setAddingPoint(false);
          } : undefined}
          connectMarkers
          height="240px"
        />
      </Suspense>

      {markers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 px-3 py-4 text-xs text-slate-500 text-center">
          Сѐ уште нема FIND_SPOT етапи. Користи „Нова точка“ или додај етапа од листата.
        </div>
      ) : (
        <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
          {markers.map((marker, index) => {
            const isActive = marker.stageId === selectedStageId;
            return (
              <Button
                key={marker.stageId}
                type="button"
                onClick={() => onSelectStage(marker.stageId)}
                size="sm"
                fullWidth
                aria-label={`Избери точка ${index + 1}: ${marker.title || `Точка ${index + 1}`}`}
                aria-pressed={isActive}
                colorClassName={isActive
                  ? 'border border-indigo-500 bg-indigo-500/10 text-white focus-visible:ring-indigo-500'
                  : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800 focus-visible:ring-slate-500'}
                className="justify-start gap-3 rounded-xl px-3 py-2 text-left"
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{marker.title || `Точка ${index + 1}`}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {marker.coordinates.latitude.toFixed(5)}, {marker.coordinates.longitude.toFixed(5)}
                  </p>
                </div>
                <MapPin className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

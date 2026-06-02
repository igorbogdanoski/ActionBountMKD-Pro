import { lazy, Suspense, useMemo, useState } from 'react';
import { Loader2, MapPin, Plus } from 'lucide-react';
import type { Coordinates, Stage } from 'shared';
import { getFindSpotMarkers } from '../../lib/findSpotPlanner';

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
  const plannerMarkers = markers.map((marker, index) => ({
    id: marker.stageId,
    coordinates: marker.coordinates,
    label: `${index + 1}`,
    title: marker.title || `Точка ${index + 1}`,
    draggable: true,
  }));

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
        <button
          type="button"
          onClick={() => setAddingPoint(value => !value)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${addingPoint ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
        >
          <Plus className="w-3.5 h-3.5" />
          {addingPoint ? 'Откажи додавање' : 'Нова точка'}
        </button>
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
              <button
                key={marker.stageId}
                type="button"
                onClick={() => onSelectStage(marker.stageId)}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${isActive ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800'}`}
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
                <MapPin className="w-4 h-4 shrink-0 text-emerald-400" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
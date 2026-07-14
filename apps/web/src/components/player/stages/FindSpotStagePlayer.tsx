import { MapContainer, TileLayer, Marker, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, AlertCircle, Navigation, RefreshCw } from 'lucide-react';
import type { FindSpotStage, Coordinates } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';

const MAP_ICON_EMOJI: Record<string, string> = {
  museum: '🏛️', park: '🌳', statue: '🗽', school: '🏫',
};

interface Props {
  stage: FindSpotStage;
  isNightMode: boolean;
  otherPendingTargets: FindSpotStage[];
  currentLocation: Coordinates | null;
  pathHistory: [number, number][];
  distanceToTarget: number | null;
  gpsError: 'denied' | 'unavailable' | null;
  isStageCompleted: boolean;
  onRetryGps: () => void;
  onSkip: () => void;
  onArrived: () => void;
  onContinue: () => void;
}

export function FindSpotStagePlayer({
  stage, isNightMode, otherPendingTargets, currentLocation, pathHistory,
  distanceToTarget, gpsError, isStageCompleted, onRetryGps, onSkip, onArrived, onContinue,
}: Props) {
  const target = stage.targetCoordinates;
  const rad = stage.radiusMeters || 20;
  const isCloseEnough = distanceToTarget !== null && distanceToTarget <= rad;

  return (
    <div className="flex-1 flex flex-col relative">
      <div className="absolute inset-0 z-0">
        <MapContainer center={[target.latitude, target.longitude]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle center={[target.latitude, target.longitude]} radius={rad} pathOptions={{ color: 'emerald', fillColor: 'emerald', fillOpacity: 0.2 }} />
          <Marker
            position={[target.latitude, target.longitude]}
            icon={stage.mapIcon ? L.divIcon({ html: `<div style="font-size: 28px; line-height: 1; text-align: center; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">${MAP_ICON_EMOJI[stage.mapIcon] ?? '📍'}</div>`, className: '' }) : new L.Icon.Default()}
          />

          {otherPendingTargets.map(s => (
            <Circle key={s.id} center={[s.targetCoordinates.latitude, s.targetCoordinates.longitude]} radius={s.radiusMeters || 20} pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 0.2, dashArray: '4' }} />
          ))}

          <Polyline positions={pathHistory} pathOptions={{ color: '#4f46e5', weight: 5, opacity: 0.8 }} />
          {currentLocation && (
            <Marker position={[currentLocation.latitude, currentLocation.longitude]} />
          )}
        </MapContainer>
      </div>
      <div className={`z-10 p-4 sticky top-0 ${isNightMode ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-transparent' : 'bg-gradient-to-b from-slate-50 via-slate-50/90 to-transparent'} pt-6`}>
        <div className={`${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-4 rounded-2xl shadow-lg border`}>
          <h2 className={`font-bold ${isNightMode ? 'text-white' : 'text-slate-800'} text-lg`}>{stage.title}</h2>
          <MathRenderer text={stage.description} className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-slate-500'} mt-1 mb-3`} />
          <div className={`flex items-center justify-between p-3 rounded-xl border ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-sm">Растојание:</span>
            </div>
            <span className={`font-bold text-lg ${isCloseEnough || isStageCompleted ? 'text-emerald-500' : gpsError ? 'text-red-500' : (isNightMode ? 'text-slate-300' : 'text-slate-700')}`}>
              {isStageCompleted
                ? 'Решено'
                : gpsError === 'denied'
                  ? 'Локацијата е одбиена'
                  : gpsError === 'unavailable'
                    ? 'Нема GPS сигнал'
                    : distanceToTarget !== null ? `${Math.round(distanceToTarget)} метри` : 'Се пресметува...'}
            </span>
          </div>
          {gpsError && (
            <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-sm ${isNightMode ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-700'}`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {gpsError === 'denied'
                  ? 'Дозволи пристап до локацијата во поставките на прелистувачот, потоа обиди се повторно.'
                  : 'Не можеме да добиеме GPS сигнал. Провери дали локацијата е вклучена и обиди се повторно.'}
              </span>
            </div>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-3 flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${isNightMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
          >
            <Navigation className="w-4 h-4 mr-2" /> Отвори во Maps
          </a>
        </div>
      </div>

      <div className={`z-10 mt-auto p-6 pb-8 ${isNightMode ? 'bg-gradient-to-t from-slate-900 via-slate-900 to-transparent' : 'bg-gradient-to-t from-slate-50 via-slate-50 to-transparent'}`}>
        {isStageCompleted ? (
          <button onClick={onContinue} className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold uppercase shadow-xl hover:bg-indigo-600 active:scale-95 transition-all">
            Продолжи напред
          </button>
        ) : isCloseEnough ? (
          <button onClick={onArrived} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold uppercase shadow-xl hover:bg-emerald-600 animate-pulse active:scale-95 transition-all">
            Ја најдов! (+{stage.points})
          </button>
        ) : gpsError ? (
          <div className="space-y-2">
            <button
              onClick={onRetryGps}
              className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold uppercase shadow-xl hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Обиди се повторно
            </button>
            {!stage.requiredToAdvance && (
              <button
                onClick={onSkip}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold ${isNightMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Прескокни без поени
              </button>
            )}
          </div>
        ) : !stage.requiredToAdvance ? (
          <button
            onClick={onSkip}
            className={`w-full py-4 rounded-xl text-sm font-semibold ${isNightMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Прескокни без поени
          </button>
        ) : (
          <div className={`w-full py-4 text-center rounded-xl text-sm font-semibold ${isNightMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            Мора физички да пристигнеш до локацијата
          </div>
        )}
      </div>
    </div>
  );
}

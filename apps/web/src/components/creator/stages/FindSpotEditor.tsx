import { useState, lazy, Suspense } from 'react';
import { AlertTriangle, MapPin, Loader2, Map } from 'lucide-react';
import type { FindSpotStage } from 'shared';
import { Tabs, Field, Toggle, inputCls, textareaCls } from './shared';

const MapSelector = lazy(() =>
  import('../../MapSelector').then(m => ({ default: m.MapSelector }))
);

interface Props {
  stage: FindSpotStage;
  onChange: (updates: Partial<FindSpotStage>) => void;
}

const TABS = ['Мисија', 'Координати', 'Поставки'];

export function FindSpotEditor({ stage, onChange }: Props) {
  const [tab, setTab] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const getMyLocation = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        onChange({
          targetCoordinates: {
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6)),
          },
        });
        setGpsLoading(false);
        setShowMap(true);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const hasCoords = stage.targetCoordinates.latitude !== 0 || stage.targetCoordinates.longitude !== 0;

  return (
    <div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Tab 0: Mission */}
      {tab === 0 && (
        <div className="space-y-4">
          <Field label="Наслов">
            <input
              type="text"
              className={inputCls}
              placeholder="Пронајди го местото..."
              value={stage.title}
              onChange={e => onChange({ title: e.target.value })}
            />
          </Field>
          <Field label="Опис / Упатство">
            <textarea
              className={textareaCls}
              rows={4}
              placeholder="Упатство за играчот..."
              value={stage.description}
              onChange={e => onChange({ description: e.target.value })}
            />
          </Field>
          <Field label="Поени">
            <input
              type="number"
              className={inputCls}
              min={0} max={10000}
              value={stage.points ?? 100}
              onChange={e => onChange({ points: Number(e.target.value) })}
            />
          </Field>
        </div>
      )}

      {/* Tab 1: Coordinates */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>GPS функционалноста бара прецизност. Избери локација на отворен простор, подалеку од згради.</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={getMyLocation}
              disabled={gpsLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {gpsLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Земање локација...</>
                : <><MapPin className="w-4 h-4" /> Земи ја мојата локација</>
              }
            </button>
            <button
              type="button"
              onClick={() => setShowMap(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                showMap
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <Map className="w-4 h-4" />
              {showMap ? 'Скриј мапа' : 'Отвори мапа'}
            </button>
          </div>

          {/* Interactive map */}
          {showMap && (
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Кликни на мапата за да поставиш локација</p>
              <Suspense fallback={
                <div className="h-64 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              }>
                <MapSelector
                  initialCoordinates={hasCoords ? stage.targetCoordinates : undefined}
                  onLocationSelect={coords => onChange({ targetCoordinates: coords })}
                  height="280px"
                />
              </Suspense>
            </div>
          )}

          {/* Coordinate inputs */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude (ширина)">
              <input
                type="number"
                className={inputCls}
                step="0.000001"
                min={-90} max={90}
                title="Географска ширина" placeholder="41.9981"
                value={stage.targetCoordinates.latitude}
                onChange={e => onChange({
                  targetCoordinates: { ...stage.targetCoordinates, latitude: Number(e.target.value) },
                })}
              />
            </Field>
            <Field label="Longitude (должина)">
              <input
                type="number"
                className={inputCls}
                step="0.000001"
                min={-180} max={180}
                title="Географска должина" placeholder="21.4254"
                value={stage.targetCoordinates.longitude}
                onChange={e => onChange({
                  targetCoordinates: { ...stage.targetCoordinates, longitude: Number(e.target.value) },
                })}
              />
            </Field>
          </div>

          <Field label="Радиус (метри)" hint="Колку близу мора да е играчот">
            <input
              type="number"
              className={inputCls}
              min={5} max={10000}
              value={stage.radiusMeters}
              onChange={e => onChange({ radiusMeters: Number(e.target.value) })}
            />
          </Field>

          {hasCoords && (
            <a
              href={`https://www.google.com/maps?q=${stage.targetCoordinates.latitude},${stage.targetCoordinates.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline"
            >
              Погледни на Google Maps ↗
            </a>
          )}
        </div>
      )}

      {/* Tab 2: Settings */}
      {tab === 2 && (
        <div className="space-y-5">
          <Field label="Режим на приказ">
            <select
              className={inputCls}
              title="Режим на приказ"
              value={stage.showMode ?? 'map'}
              onChange={e => onChange({ showMode: e.target.value as FindSpotStage['showMode'] })}
            >
              <option value="map">Покажи мапа</option>
              <option value="arrow">Покажи стрела (насока)</option>
              <option value="none">Без помош</option>
            </select>
          </Field>
          <Toggle
            label="Потребно за продолжување"
            hint="Играчот мора физички да дојде до локацијата"
            checked={stage.requiredToAdvance ?? true}
            onChange={v => onChange({ requiredToAdvance: v })}
          />
          <Field label="Аудио URL (опционално)">
            <input
              type="url"
              className={inputCls}
              placeholder="https://..."
              value={stage.audioUrl ?? ''}
              onChange={e => onChange({ audioUrl: e.target.value })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

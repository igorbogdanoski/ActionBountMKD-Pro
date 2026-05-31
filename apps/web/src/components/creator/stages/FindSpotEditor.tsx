import { useState } from 'react';
import { AlertTriangle, MapPin, Loader2 } from 'lucide-react';
import type { FindSpotStage } from 'shared';
import { Tabs, Field, Toggle, inputCls, textareaCls } from './shared';

interface Props {
  stage: FindSpotStage;
  onChange: (updates: Partial<FindSpotStage>) => void;
}

const TABS = ['Мисија', 'Координати', 'Поставки'];

export function FindSpotEditor({ stage, onChange }: Props) {
  const [tab, setTab] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);

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
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

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

      {/* Tab 1: Coordinate */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>GPS функционалноста бара прецизност. Избери локација на отворен простор, подалеку од згради.</p>
          </div>
          <button
            type="button"
            onClick={getMyLocation}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {gpsLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Земање локација...</>
              : <><MapPin className="w-4 h-4" /> Земи ја мојата локација</>
            }
          </button>
          <Field label="Географска ширина (Latitude)">
            <input
              type="number"
              className={inputCls}
              step="0.000001"
              min={-90} max={90}
              value={stage.targetCoordinates.latitude}
              onChange={e => onChange({
                targetCoordinates: { ...stage.targetCoordinates, latitude: Number(e.target.value) },
              })}
            />
          </Field>
          <Field label="Географска должина (Longitude)">
            <input
              type="number"
              className={inputCls}
              step="0.000001"
              min={-180} max={180}
              value={stage.targetCoordinates.longitude}
              onChange={e => onChange({
                targetCoordinates: { ...stage.targetCoordinates, longitude: Number(e.target.value) },
              })}
            />
          </Field>
          <Field label="Радиус (метри)" hint="Колку близу мора да е играчот">
            <input
              type="number"
              className={inputCls}
              min={5} max={10000}
              value={stage.radiusMeters}
              onChange={e => onChange({ radiusMeters: Number(e.target.value) })}
            />
          </Field>
          <a
            href={`https://www.google.com/maps?q=${stage.targetCoordinates.latitude},${stage.targetCoordinates.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            Погледни на Google Maps ↗
          </a>
        </div>
      )}

      {/* Tab 2: Settings */}
      {tab === 2 && (
        <div className="space-y-5">
          <Field label="Режим на приказ">
            <select
              className={inputCls}
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


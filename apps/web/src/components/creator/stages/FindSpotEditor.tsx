import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FindSpotStage } from 'shared';
import { Tabs, Field, Toggle, inputCls, textareaCls } from './shared';

interface Props {
  stage: FindSpotStage;
  onChange: (updates: Partial<FindSpotStage>) => void;
}

const TABS = ['Мисија', 'Координати', 'Поставки'];

export function FindSpotEditor({ stage, onChange }: Props) {
  const [tab, setTab] = useState(0);

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


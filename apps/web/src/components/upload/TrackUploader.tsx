import { useCallback, useRef, useState } from 'react';
import { Route, Upload, X, Loader2, MapPin } from 'lucide-react';
import type { Coordinates } from 'shared';
import { parseTrack } from '../../utils/trackParser';
import { Button } from '../ui/Button';

export interface TrackResult {
  points: Coordinates[];
  name: string;
  lengthKm: number;
}

interface TrackUploaderProps {
  points?: Coordinates[];
  trackName?: string;
  onChange: (result: TrackResult | null) => void;
  label?: string;
  hint?: string;
}

const MAX_SIZE_MB = 10;

export function TrackUploader({
  points,
  trackName,
  onChange,
  label = 'GPX / KML рута',
  hint,
}: TrackUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Максимална големина е ${MAX_SIZE_MB}MB.`);
        return;
      }

      setBusy(true);
      try {
        const text = await file.text();
        const { points: parsed, lengthKm } = parseTrack(file.name, text);
        onChange({ points: parsed, name: file.name, lengthKm });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не успеа парсирање на датотеката.');
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const hasTrack = !!points && points.length > 1;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all ${
          dragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {busy && (
          <div className="h-28 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
            <p className="text-xs">Парсирање на рутата...</p>
          </div>
        )}

        {!busy && hasTrack && (
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Route className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate">
                {trackName ?? 'Рута'}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {points!.length} точки
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              aria-label="Отстрани рута"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              colorClassName="bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500"
              className="!p-1.5 !rounded-full shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {!busy && !hasTrack && (
          <div className="h-28 flex flex-col items-center justify-center gap-2 text-slate-500">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium">Влечи .gpx / .kml или клик за upload</p>
            <p className="text-[11px] text-slate-600">GPX, KML · max {MAX_SIZE_MB}MB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}


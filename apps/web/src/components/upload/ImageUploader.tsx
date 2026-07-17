import { useRef, useState, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../utils/firebase';
import { useAuth } from '../../utils/AuthContext';
import { Upload, X, Image as ImageIcon, Loader2, Link } from 'lucide-react';
import { Button } from '../ui/Button';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;          // storage path prefix e.g. 'covers' | 'stages'
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  hint?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageUploader({
  value,
  onChange,
  folder = 'uploads',
  maxSizeMB = 5,
  label = 'Слика',
  hint,
}: ImageUploaderProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl]   = useState(false);
  const [urlInput, setUrlInput] = useState(value ?? '');

  const upload = useCallback(async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Само JPEG, PNG, WebP или GIF се дозволени.');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Максимална големина е ${maxSizeMB}MB.`);
      return;
    }
    if (!user) {
      setError('Мора да бидете најавени за upload.');
      return;
    }

    const ext  = file.name.split('.').pop() ?? 'jpg';
    const name = `${folder}/${user.uid}/${Date.now()}.${ext}`;
    const storageRef = ref(storage, name);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: { uploadedBy: user.uid },
    });

    setProgress(0);

    task.on(
      'state_changed',
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err  => { setError(`Upload failed: ${err.message}`); setProgress(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange(url);
        setProgress(null);
      },
    );
  }, [user, folder, maxSizeMB, onChange]);

  const handleFile = (file: File | undefined) => { if (file) upload(file); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUrlSave = () => {
    const url = urlInput.trim();
    if (url) { onChange(url); setShowUrl(false); }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrl(p => !p)}
            leftIcon={<Link className="w-3 h-3" />}
            colorClassName="text-indigo-400 hover:text-indigo-300 focus-visible:ring-indigo-400"
            className="!p-0 !gap-1 !rounded-none !font-normal"
          >
            URL
          </Button>
        </div>
      )}

      {/* URL input mode */}
      {showUrl && (
        <div className="flex gap-2">
          <input
            type="url"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            placeholder="https://..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlSave()}
          />
          <Button type="button" variant="app-primary" size="sm" onClick={handleUrlSave}
            className="!py-2 text-sm !font-semibold !shadow-none">
            OK
          </Button>
        </div>
      )}

      {/* Drag & drop zone */}
      {!showUrl && (
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden ${
            dragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={e => handleFile(e.target.files?.[0])}
          />

          {/* Current image preview */}
          {value && !progress && (
            <div className="relative group">
              <img
                src={value}
                alt="Preview"
                className="w-full h-40 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <span className="text-white text-sm font-semibold">Замени слика</span>
                <Button
                  type="button"
                  size="icon"
                  aria-label="Отстрани слика"
                  onClick={e => { e.stopPropagation(); onChange(''); setUrlInput(''); }}
                  colorClassName="bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500"
                  className="!p-1.5 !rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {progress !== null && (
            <div className="h-40 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <div className="w-48">
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-slate-400 mt-1">{progress}%</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!value && progress === null && (
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium">Влечи слика или клик за upload</p>
              <p className="text-[11px] text-slate-600">JPEG, PNG, WebP · max {maxSizeMB}MB</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

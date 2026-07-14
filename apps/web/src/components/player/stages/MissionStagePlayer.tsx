import { Camera, Mic, Square } from 'lucide-react';
import type { MissionStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { RubricPreview } from './RubricPreview';

interface Props {
  stage: MissionStage;
  isNightMode: boolean;
  isRecording: boolean;
  recordedAudioURL: string | null;
  missionUploading: boolean;
  missionUploadedUrl: string | null;
  missionUploadError: string | null;
  onToggleRecording: () => void;
  onRetakeAudio: () => void;
  onFileSelected: (file: File) => void;
  onFinish: () => void;
}

export function MissionStagePlayer({
  stage, isNightMode, isRecording, recordedAudioURL,
  missionUploading, missionUploadedUrl, missionUploadError,
  onToggleRecording, onRetakeAudio, onFileSelected, onFinish,
}: Props) {
  const isAudio = stage.submissionType === 'audio';
  const hasRubric = !!stage.rubric?.criteria?.length;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center">
      <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>{stage.title}</h2>
      <MathRenderer text={stage.description} className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-8`} />

      <RubricPreview rubric={stage.rubric} isNightMode={isNightMode} />

      <div className={`w-full max-w-sm rounded-3xl border-2 border-dashed ${isNightMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'} flex flex-col items-center justify-center p-8 mb-6`}>
        {isAudio ? (
          <>
            <div className={`w-16 h-16 rounded-full ${isNightMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'} flex items-center justify-center mb-4`}>
              <Mic className="w-8 h-8" />
            </div>
            <p className={`text-sm font-bold ${isNightMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Снимете го вашиот одговор</p>

            {recordedAudioURL ? (
              <div className="flex flex-col items-center w-full mt-4">
                <audio src={recordedAudioURL} controls className="w-full h-10 outline-none mb-3" />
                {missionUploading && <p className="text-xs text-slate-500 mt-1">Се прикачува...</p>}
                {missionUploadedUrl && !missionUploading && <p className="text-xs text-emerald-500 mt-1 font-bold">✓ Прикачено</p>}
                <button onClick={onRetakeAudio} className="text-sm font-bold text-slate-500 hover:text-rose-500 transition-colors mt-2">Сними повторно</button>
              </div>
            ) : (
              <button
                onClick={onToggleRecording}
                className={`mt-4 px-6 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isRecording ? 'bg-rose-500 text-white animate-pulse' : (isNightMode ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-300 shadow-sm')}`}
              >
                {isRecording ? <><Square className="w-4 h-4 fill-current" /> Стопирај Снимање</> : <><Mic className="w-4 h-4" /> Започни Снимање</>}
              </button>
            )}
          </>
        ) : (
          <>
            <div className={`w-16 h-16 rounded-full ${isNightMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} flex items-center justify-center mb-4`}>
              <Camera className="w-8 h-8" />
            </div>
            <p className={`text-sm font-bold ${isNightMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Прикачете медија</p>
            <p className={`text-xs ${isNightMode ? 'text-slate-500' : 'text-slate-500'}`}>{stage.submissionType === 'video' ? 'Видео' : 'Слика'} · max 20MB</p>

            <label className={`mt-4 px-6 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all ${missionUploadedUrl ? 'bg-emerald-500 text-white' : missionUploading ? 'bg-slate-400 text-white' : (isNightMode ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-200')}`}>
              {missionUploading ? 'Се прикачува...' : missionUploadedUrl ? '✓ Прикачено' : 'Избери датотека'}
              <input
                type="file"
                accept={stage.submissionType === 'video' ? 'video/*' : 'image/*'}
                capture="environment"
                className="hidden"
                disabled={missionUploading}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelected(file);
                }}
              />
            </label>
          </>
        )}
        {missionUploadError && <p className="text-xs text-red-500 mt-3">{missionUploadError}</p>}
      </div>

      <button
        onClick={onFinish}
        disabled={!missionUploadedUrl || isRecording || missionUploading}
        className="w-full py-4 bg-emerald-500 disabled:bg-slate-300 hover:bg-emerald-600 text-white rounded-xl font-bold uppercase shadow-xl active:scale-95 transition-all mt-auto"
      >
        {hasRubric ? 'Испрати за оценување' : `Заврши ја мисијата (+${stage.points})`}
      </button>
    </div>
  );
}

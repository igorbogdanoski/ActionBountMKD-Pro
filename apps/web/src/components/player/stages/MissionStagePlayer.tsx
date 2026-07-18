import { Camera, Mic, Square } from 'lucide-react';
import type { MissionStage } from 'shared';
import { MathRenderer } from '../../editor/MathRenderer';
import { Button } from '../../ui/Button';
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
                <Button onClick={onRetakeAudio} variant="ghost" size="sm" className="mt-2" colorClassName="text-slate-500 hover:text-rose-500 focus-visible:ring-rose-500">Сними повторно</Button>
              </div>
            ) : (
              <Button
                onClick={onToggleRecording}
                aria-pressed={isRecording}
                size="md"
                className={`mt-4 rounded-full ${isRecording ? 'animate-pulse' : ''}`}
                colorClassName={isRecording
                  ? 'bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-500'
                  : isNightMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 focus-visible:ring-slate-400'
                    : 'bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 focus-visible:ring-slate-400'}
              >
                {isRecording ? <><Square aria-hidden="true" className="w-4 h-4 fill-current" /> Стопирај Снимање</> : <><Mic aria-hidden="true" className="w-4 h-4" /> Започни Снимање</>}
              </Button>
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
        {missionUploadError && <p role="alert" className="text-xs text-red-500 mt-3">{missionUploadError}</p>}
      </div>

      <Button
        onClick={onFinish}
        disabled={!missionUploadedUrl || isRecording || missionUploading}
        fullWidth
        size="lg"
        variant="success"
        className="py-4 uppercase shadow-xl mt-auto"
      >
        {hasRubric ? 'Испрати за оценување' : `Заврши ја мисијата (+${stage.points})`}
      </Button>
    </div>
  );
}

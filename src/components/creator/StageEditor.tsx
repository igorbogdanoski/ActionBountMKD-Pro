import type { Stage } from '../../types';
import { STAGE_TYPE_CONFIG } from './StageList';
import { InfoStageEditor }    from './stages/InfoStageEditor';
import { QuizStageEditor }    from './stages/QuizStageEditor';
import { MissionStageEditor } from './stages/MissionStageEditor';
import { FindSpotEditor }     from './stages/FindSpotEditor';
import { ScanCodeEditor }     from './stages/ScanCodeEditor';
import { SurveyEditor }       from './stages/SurveyEditor';
import { TournamentEditor }   from './stages/TournamentEditor';
import type { InfoStage, QuizStage, MissionStage, FindSpotStage, ScanCodeStage, SurveyStage, TournamentStage } from '../../types';

interface Props {
  stage: Stage;
  onChange: (updates: Partial<Stage>) => void;
}

export function StageEditor({ stage, onChange }: Props) {
  const cfg = STAGE_TYPE_CONFIG[stage.type];
  const Icon = cfg.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Stage type header */}
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-700 ${cfg.bg}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</p>
          <p className="text-sm font-semibold text-slate-200 truncate max-w-xs">
            {stage.title || 'Без наслов'}
          </p>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto p-6">
        {stage.type === 'INFO'       && <InfoStageEditor    stage={stage as InfoStage}      onChange={u => onChange(u)} />}
        {stage.type === 'QUIZ'       && <QuizStageEditor    stage={stage as QuizStage}      onChange={u => onChange(u)} />}
        {stage.type === 'MISSION'    && <MissionStageEditor stage={stage as MissionStage}   onChange={u => onChange(u)} />}
        {stage.type === 'FIND_SPOT'  && <FindSpotEditor     stage={stage as FindSpotStage}  onChange={u => onChange(u)} />}
        {stage.type === 'SCAN_CODE'  && <ScanCodeEditor     stage={stage as ScanCodeStage}  onChange={u => onChange(u)} />}
        {stage.type === 'SURVEY'     && <SurveyEditor       stage={stage as SurveyStage}    onChange={u => onChange(u)} />}
        {stage.type === 'TOURNAMENT' && <TournamentEditor   stage={stage as TournamentStage} onChange={u => onChange(u)} />}
      </div>
    </div>
  );
}

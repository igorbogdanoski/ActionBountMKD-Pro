import type { Stage, InfoStage, QuizStage, MissionStage, FindSpotStage, ScanCodeStage, QrTaskStage, SurveyStage, TournamentStage, SwitchStage, InventoryItem } from 'shared';
import { STAGE_TYPE_CONFIG } from './StageList';
import { InfoStageEditor }    from './stages/InfoStageEditor';
import { QuizStageEditor }    from './stages/QuizStageEditor';
import { MissionStageEditor } from './stages/MissionStageEditor';
import { FindSpotEditor }     from './stages/FindSpotEditor';
import { ScanCodeEditor }     from './stages/ScanCodeEditor';
import { QrTaskEditor }       from './stages/QrTaskEditor';
import { SurveyEditor }       from './stages/SurveyEditor';
import { TournamentEditor }   from './stages/TournamentEditor';
import { SwitchStageEditor }  from './stages/SwitchStageEditor';
import { Field, inputCls } from './stages/shared';

interface Props {
  stage: Stage;
  allStages: Stage[];
  inventoryItems: InventoryItem[];
  onChange: (updates: Partial<Stage>) => void;
}

export function StageEditor({ stage, allStages, inventoryItems, onChange }: Props) {
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
        {stage.type === 'INFO'       && <InfoStageEditor    stage={stage as InfoStage}       onChange={u => onChange(u)} />}
        {stage.type === 'QUIZ'       && <QuizStageEditor    stage={stage as QuizStage}       onChange={u => onChange(u)} />}
        {stage.type === 'MISSION'    && <MissionStageEditor stage={stage as MissionStage}    onChange={u => onChange(u)} />}
        {stage.type === 'FIND_SPOT'  && <FindSpotEditor     stage={stage as FindSpotStage}   onChange={u => onChange(u)} />}
        {stage.type === 'SCAN_CODE'  && <ScanCodeEditor     stage={stage as ScanCodeStage}   onChange={u => onChange(u)} />}
        {stage.type === 'QR_TASK'    && <QrTaskEditor       stage={stage as QrTaskStage}     onChange={u => onChange(u)} />}
        {stage.type === 'SURVEY'     && <SurveyEditor       stage={stage as SurveyStage}     onChange={u => onChange(u)} />}
        {stage.type === 'TOURNAMENT' && <TournamentEditor   stage={stage as TournamentStage} onChange={u => onChange(u)} />}
        {stage.type === 'SWITCH'     && <SwitchStageEditor  stage={stage as SwitchStage} allStages={allStages} inventoryItems={inventoryItems} onChange={u => onChange(u as Partial<Stage>)} />}

        <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Инвентар</p>
          {inventoryItems.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-500">
              Додај предмети во Поставки на квестот за оваа етапа да доделува или бара предмет.
            </div>
          ) : (
            <>
              <Field label="Додели предмет по завршување" hint="Играчот го добива предметот по успешна етапа">
                <select className={inputCls} value={stage.grantsItemId ?? ''} onChange={e => onChange({ grantsItemId: e.target.value || undefined })}>
                  <option value="">— Не доделува предмет —</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.icon ? `${item.icon} ` : ''}{item.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Бара предмет за отворање" hint="Етапата е заклучена додека играчот не го поседува предметот">
                <select className={inputCls} value={stage.requiresItemId ?? ''} onChange={e => onChange({ requiresItemId: e.target.value || undefined })}>
                  <option value="">— Без услов за предмет —</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.icon ? `${item.icon} ` : ''}{item.name}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


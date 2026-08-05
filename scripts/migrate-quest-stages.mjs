import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  QUEST_STAGE_SCHEMA_VERSION,
  QUEST_STAGES_COLLECTION,
  hydrateQuestFromStageStorage,
  questStageDocumentId,
  splitQuestForStageStorage,
} from '../packages/shared/questStageStorage.ts';

const QUESTS_COLLECTION = 'quests';
const SAFE_PROJECT_ID = /^demo-[a-z0-9-]+$/;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

export function migrationRevision(questId, stages) {
  const digest = createHash('sha256')
    .update(JSON.stringify(canonicalize({ questId, stages })))
    .digest('hex')
    .slice(0, 40);
  return `migration-v2-${digest}`;
}

export function planLegacyQuest(questId, data) {
  const quest = { ...data, id: questId };
  const stageRevision = migrationRevision(questId, quest.stages);
  return splitQuestForStageStorage(quest, stageRevision);
}

export function parseMigrationArgs(argv) {
  const options = { apply: false, projectId: '', questId: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') options.apply = true;
    else if (argument === '--dry-run') options.apply = false;
    else if (argument === '--project') options.projectId = argv[++index] ?? '';
    else if (argument.startsWith('--project=')) options.projectId = argument.slice('--project='.length);
    else if (argument === '--quest') options.questId = argv[++index] ?? '';
    else if (argument.startsWith('--quest=')) options.questId = argument.slice('--quest='.length);
    else throw new TypeError(`Unknown migration argument: ${argument}`);
  }
  if (!options.projectId) throw new TypeError('--project is required');
  if (!SAFE_PROJECT_ID.test(options.projectId)) {
    throw new TypeError('Quest migration is restricted to demo-* emulator project IDs');
  }
  if (options.questId.includes('/')) throw new TypeError('--quest must be a Firestore document ID');
  return options;
}

export function assertEmulatorOnlyEnvironment(environment) {
  if (!environment.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required; this tool cannot connect to production');
  }
}

async function stageSnapshotsForQuest(db, questId) {
  const snapshot = await db.collection(QUEST_STAGES_COLLECTION).where('questId', '==', questId).get();
  return snapshot.docs.map(document => ({ id: document.id, data: document.data() }));
}

export async function runQuestStageMigration(db, { apply = false, questId = '' } = {}) {
  const questSnapshots = questId
    ? [await db.collection(QUESTS_COLLECTION).doc(questId).get()].filter(snapshot => snapshot.exists)
    : (await db.collection(QUESTS_COLLECTION).get()).docs;
  const report = {
    mode: apply ? 'apply' : 'dry-run',
    scanned: questSnapshots.length,
    legacyReady: 0,
    migrated: 0,
    v2Valid: 0,
    invalid: 0,
    conflicts: 0,
    quests: [],
  };

  for (const snapshot of questSnapshots) {
    const id = snapshot.id;
    const data = { ...snapshot.data(), id };
    const existingStages = await stageSnapshotsForQuest(db, id);

    if (data.stageSchemaVersion === QUEST_STAGE_SCHEMA_VERSION) {
      try {
        hydrateQuestFromStageStorage(data, existingStages.map(stage => stage.data));
        report.v2Valid += 1;
        report.quests.push({ id, status: 'v2-valid', stageCount: data.stageCount });
      } catch (error) {
        report.invalid += 1;
        report.quests.push({ id, status: 'v2-invalid', error: error.message });
      }
      continue;
    }

    if (existingStages.length > 0) {
      report.conflicts += 1;
      report.quests.push({ id, status: 'legacy-conflict', stageDocuments: existingStages.length });
      continue;
    }

    try {
      const plan = planLegacyQuest(id, data);
      report.legacyReady += 1;
      if (apply) {
        const batch = db.batch();
        batch.set(snapshot.ref, plan.document);
        for (const stage of plan.stages) {
          batch.set(
            db.collection(QUEST_STAGES_COLLECTION).doc(questStageDocumentId(id, stage.id)),
            stage,
          );
        }
        await batch.commit();
        report.migrated += 1;
      }
      report.quests.push({
        id,
        status: apply ? 'migrated' : 'legacy-ready',
        stageCount: plan.stages.length,
        stageRevision: plan.document.stageRevision,
      });
    } catch (error) {
      report.invalid += 1;
      report.quests.push({ id, status: 'legacy-invalid', error: error.message });
    }
  }

  return report;
}

async function main() {
  assertEmulatorOnlyEnvironment(process.env);
  const options = parseMigrationArgs(process.argv.slice(2));
  const app = getApps()[0] ?? initializeApp({ projectId: options.projectId });
  const report = await runQuestStageMigration(getFirestore(app), options);
  console.log(JSON.stringify(report, null, 2));
  if (report.invalid > 0 || report.conflicts > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(error => {
    console.error(`Quest-stage migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

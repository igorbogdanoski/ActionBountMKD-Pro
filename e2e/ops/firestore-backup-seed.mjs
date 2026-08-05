import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import {
  BACKUP_DRILL_DOCUMENTS,
  BACKUP_DRILL_PROJECT_ID,
} from './firestore-backup-fixture.mjs';

const testEnv = await initializeTestEnvironment({ projectId: BACKUP_DRILL_PROJECT_ID });

try {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const fixture of BACKUP_DRILL_DOCUMENTS) {
      await setDoc(doc(db, fixture.path), fixture.data);
    }
  });
  console.log(`Backup drill seed PASS: ${BACKUP_DRILL_DOCUMENTS.length} documents written.`);
} finally {
  await testEnv.cleanup();
}

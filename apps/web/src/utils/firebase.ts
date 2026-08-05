import { getStorage } from 'firebase/storage';
import { firebaseApp } from './firebaseCore';

export { db } from './firebaseDb';
export { auth, provider } from './firebaseAuth';
export const storage = getStorage(firebaseApp);

import {FirestoreBatchStorage} from '../storages';
import {getMetadataStore} from '../utils';

export const createBatch = (): FirestoreBatchStorage => {
  const metadataStorage = getMetadataStore();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  return new FirestoreBatchStorage(metadataStorage.firestoreRef);
};

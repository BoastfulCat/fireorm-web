import {FirestoreBatchStorage} from '@orm/storages';
import {getMetadataStore} from '@orm/utils';

export const createBatch = (): FirestoreBatchStorage => {
  const metadataStorage = getMetadataStore();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  return new FirestoreBatchStorage(metadataStorage.firestoreRef);
};

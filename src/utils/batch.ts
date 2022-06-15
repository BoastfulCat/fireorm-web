import {FirestoreBatch} from '@orm/batches';
import {getMetadataStore} from '@orm/utils';

export const createBatch = (): FirestoreBatch => {
  const metadataStorage = getMetadataStore();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  return new FirestoreBatch(metadataStorage.firestoreRef);
};

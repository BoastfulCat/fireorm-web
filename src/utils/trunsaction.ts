import {runTransaction as firestoreRunTransaction} from '@firebase/firestore';
import {FirestoreTransactionStorage} from '../storages';
import {TransactionReferenceStorage} from '../types';
import {getMetadataStore, getRepository} from '../utils';

export const runTransaction = async <T>(executor: (tran: FirestoreTransactionStorage) => Promise<T>): Promise<T> => {
  const metadataStorage = getMetadataStore();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  return firestoreRunTransaction(metadataStorage.firestoreRef, async (transaction) => {
    const tranRefStorage: TransactionReferenceStorage = new Set();
    const result = await executor(new FirestoreTransactionStorage(transaction, tranRefStorage));

    tranRefStorage.forEach(({entity, path, propertyKey}) => {
      const record = entity as unknown as Record<string, unknown>;
      record[propertyKey] = getRepository(path);
    });

    return result;
  });
};

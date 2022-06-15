import {runTransaction as firestoreRunTransaction} from '@firebase/firestore';
import {FirestoreTransaction} from '@orm/trunsactions';
import {TransactionReferenceStorage} from '@orm/types';
import {getMetadataStore, getRepository} from '@orm/utils';

export const runTransaction = async <T>(executor: (tran: FirestoreTransaction) => Promise<T>): Promise<T> => {
  const metadataStorage = getMetadataStore();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  return firestoreRunTransaction(metadataStorage.firestoreRef, async (transaction) => {
    const tranRefStorage: TransactionReferenceStorage = new Set();
    const result = await executor(new FirestoreTransaction(transaction, tranRefStorage));

    tranRefStorage.forEach(({entity, path, propertyKey}) => {
      const record = entity as unknown as Record<string, unknown>;
      record[propertyKey] = getRepository(path);
    });

    return result;
  });
};

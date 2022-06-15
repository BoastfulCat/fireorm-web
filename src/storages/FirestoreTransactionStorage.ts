import {FirestoreTransactionRepository} from '../repositories';
import {
  Entity,
  EntityConstructorOrPath,
  FirestoreTransaction,
  TransactionReferenceStorage,
} from '../types';
import {getMetadataStore} from '../utils';
import {Transaction} from 'firebase/firestore';

export class FirestoreTransactionStorage implements FirestoreTransaction {
  public constructor(
    private transaction: Transaction,
    private tranRefStorage: TransactionReferenceStorage,
  ) {
  }

  public getRepository<T extends Entity = Entity>(entityOrConstructor: EntityConstructorOrPath<T>): FirestoreTransactionRepository<T> {
    if (!getMetadataStore().firestoreRef) {
      throw new Error('Firestore must be initialized first');
    }

    return new FirestoreTransactionRepository<T>(entityOrConstructor, this.transaction, this.tranRefStorage);
  }
}

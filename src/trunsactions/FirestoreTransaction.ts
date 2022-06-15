import {BaseTransactionRepository} from '@orm/repositories';
import {
  Entity,
  EntityConstructorOrPath,
  FirestoreTransaction as FirestoreTransactionInterface,
  TransactionReferenceStorage,
} from '@orm/types';
import {getMetadataStore} from '@orm/utils';
import {Transaction} from 'firebase/firestore';

export class FirestoreTransaction implements FirestoreTransactionInterface {
  public constructor(
    private transaction: Transaction,
    private tranRefStorage: TransactionReferenceStorage,
  ) {
  }

  public getRepository<T extends Entity = Entity>(entityOrConstructor: EntityConstructorOrPath<T>): BaseTransactionRepository<T> {
    if (!getMetadataStore().firestoreRef) {
      throw new Error('Firestore must be initialized first');
    }

    return new BaseTransactionRepository<T>(entityOrConstructor, this.transaction, this.tranRefStorage);
  }
}

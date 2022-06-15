import {SetOptions} from '@firebase/firestore';
import {AbstractFirestoreRepository} from '@orm/repositories/AbstractFirestoreRepository';
import {
  Entity,
  EntityConstructorOrPath,
  QueryBuilder,
  TransactionReferenceStorage,
  TransactionRepository,
  WithOptionalId,
} from '@orm/types';
import {doc, FirestoreError, Transaction, Unsubscribe} from 'firebase/firestore';

export class BaseTransactionRepository<T extends Entity> extends AbstractFirestoreRepository<T> implements TransactionRepository<T> {
  public constructor(
    public pathOrConstructor: EntityConstructorOrPath<T>,
    private readonly transaction: Transaction,
    private readonly tranRefStorage: TransactionReferenceStorage,
  ) {
    super(pathOrConstructor);
    this.transaction = transaction;
    this.tranRefStorage = tranRefStorage;
  }

  public async execute(): Promise<T[]> {
    throw new Error('`execute` is not available for transactions');
  }

  public findById(id: string): Promise<T | null> {
    return this
      .transaction
      .get(doc(this.firestoreColRef.firestore, id))
      .then((docSnp) =>
        docSnp.exists() ? this.extractTFromDocSnap(docSnp, this.transaction, this.tranRefStorage) : null,
      );
  }

  public findByIdAndListen(): Unsubscribe {
    throw new Error('`findByIdAndListen` is not available for transactions');
  }

  public findOne(): Promise<T | null> {
    throw new Error('`findOne` is not available for transactions');
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  public findOneAndListen(next?: (items: T[]) => void, error?: (error: FirestoreError) => void): Unsubscribe {
    throw new Error('`findOneAndListen` is not available for transactions');
  }

  public find(): Promise<T[]> {
    throw new Error('`find` is not available for transactions');
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  public findAndListen(next?: (items: T[]) => void, error?: (error: FirestoreError) => void): Unsubscribe {
    throw new Error('`findAndListen` is not available for transactions');
  }

  public async create(item: WithOptionalId<T>): Promise<T> {
    if (this.config.validateModels) {
      const errors = await this.validate(item as T);

      if (errors.length) {
        throw errors;
      }
    }

    const docRef = item._id ? doc(this.firestoreColRef, item._id) : doc(this.firestoreColRef);

    if (!item._id) {
      item._id = docRef.id;
    }

    this.transaction.set(docRef, this.toSerializableObject(item as T));
    this.initializeSubCollections(item as T, this.transaction, this.tranRefStorage);

    return item as T;
  }

  public async update(item: T, options?: SetOptions): Promise<T> {
    if (this.config.validateModels) {
      const errors = await this.validate(item);

      if (errors.length) {
        throw errors;
      }
    }

    // const query = this.firestoreColRef.doc(item.id);
    this.transaction.set(
      doc(this.firestoreColRef, item._id),
      this.toSerializableObject(item),
      options ?? {},
    );

    return item;
  }

  public async delete(id: string): Promise<void> {
    this.transaction.delete(doc(this.firestoreColRef, id));
  }

  public limit(): QueryBuilder<T> {
    throw new Error('`limit` is not available for transactions');
  }

  public orderByAscending(): QueryBuilder<T> {
    throw new Error('`orderByAscending` is not available for transactions');
  }

  public orderByDescending(): QueryBuilder<T> {
    throw new Error('`orderByDescending` is not available for transactions');
  }
}

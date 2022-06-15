import {Firestore} from '@firebase/firestore';
import {FirestoreBatchUnit} from '@orm/batches';
import {BaseFirestoreBatchRepository, BaseFirestoreBatchSingleRepository} from '@orm/repositories';
import {Entity, EntityConstructorOrPath, FirestoreBatch as FirestoreBatchInterface} from '@orm/types';

export class FirestoreBatch implements FirestoreBatchInterface {
  private readonly batch: FirestoreBatchUnit;

  public constructor(
    protected firestoreRef: Firestore,
  ) {
    this.batch = new FirestoreBatchUnit(firestoreRef);
  }

  /**
   * Returns a batch repository of T.
   *
   * @template T
   * @param {EntityConstructorOrPath<T>} pathOrConstructor path or constructor
   * @return  {BaseFirestoreBatchRepository<T>}
   * @memberof FirestoreBatch
   */
  public getRepository<T extends Entity>(pathOrConstructor: EntityConstructorOrPath<T>): BaseFirestoreBatchRepository<T> {
    return new BaseFirestoreBatchRepository(pathOrConstructor, this.batch);
  }

  /**
   * Returns a batch repository of a single entity. Required to maintain
   * current features and will be deleted in the next major version.
   *
   * @template T
   * @param {EntityConstructorOrPath<T>} pathOrConstructor path or constructor
   * @return {BaseFirestoreBatchSingleRepository<T>}
   * @memberof FirestoreBatch
   */
  public getSingleRepository<T extends Entity>(pathOrConstructor: EntityConstructorOrPath<T>): BaseFirestoreBatchSingleRepository<T> {
    return new BaseFirestoreBatchSingleRepository(pathOrConstructor, this.batch);
  }

  /**
   * Commits current batch.
   *
   * @template T
   * @return {Promise<void>}
   * @memberof FirestoreBatch
   */
  public commit(): Promise<void> {
    return this.batch.commit();
  }
}

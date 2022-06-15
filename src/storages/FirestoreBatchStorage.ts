import {Firestore} from '@firebase/firestore';
import {FirestoreBatchUnit} from '../units';
import {FirestoreBatchRepository, FirestoreBatchSingleRepository} from '../repositories';
import {Entity, EntityConstructorOrPath, FirestoreBatch} from '../types';

export class FirestoreBatchStorage implements FirestoreBatch {
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
   * @return  {FirestoreBatchRepository<T>}
   * @memberof FirestoreBatch
   */
  public getRepository<T extends Entity>(pathOrConstructor: EntityConstructorOrPath<T>): FirestoreBatchRepository<T> {
    return new FirestoreBatchRepository(pathOrConstructor, this.batch);
  }

  /**
   * Returns a batch repository of a single entity. Required to maintain
   * current features and will be deleted in the next major version.
   *
   * @template T
   * @param {EntityConstructorOrPath<T>} pathOrConstructor path or constructor
   * @return {FirestoreBatchSingleRepository<T>}
   * @memberof FirestoreBatch
   */
  public getSingleRepository<T extends Entity>(pathOrConstructor: EntityConstructorOrPath<T>): FirestoreBatchSingleRepository<T> {
    return new FirestoreBatchSingleRepository(pathOrConstructor, this.batch);
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

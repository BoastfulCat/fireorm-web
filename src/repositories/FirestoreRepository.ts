import {FirestoreError, QueryConstraint, SetOptions} from '@firebase/firestore';
import {FirestoreBatchStorage} from '../storages';
import {AbstractFirestoreRepository} from '../repositories/AbstractFirestoreRepository';
import {FirestoreBatchSingleRepository} from '../repositories/FirestoreBatchSingleRepository';
import {Entity, PartialBy, PipeOperator, QueryExecutorConfig, Repository, TransactionRepository} from '../types';
import {getMetadataStore, runTransaction} from '../utils';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  Unsubscribe,
  where,
  WhereFilterOp,
} from 'firebase/firestore';

export class FirestoreRepository<T extends Entity> extends AbstractFirestoreRepository<T> implements Repository<T> {
  public findById(id: string): Promise<T | null> {
    return getDoc(doc(this.firestoreColRef, id))
      .then((docRef) => docRef.exists() ? this.extractTFromDocSnap(docRef) : null);
  }

  public findByIdAndListen(
    id: string,
    // options?: SnapshotListenOptions,
    next?: (item: T | null) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(this.firestoreColRef, id),
      (docRef) => {
        next && next(docRef.exists() ? this.extractTFromDocSnap(docRef) : null);
      },
      (e) => {
        error && error(e);
      },
    );
  }

  public async create(item: PartialBy<T, '_id'>): Promise<T> {
    if (this.config.validateModels) {
      const errors = await this.validate(item as T);

      if (errors.length) {
        throw errors;
      }
    }

    if (item._id && await this.findById(item._id)) {
      throw new Error(`A document with id ${item._id} already exists.`);
    }

    const docRef = item._id ? doc(this.firestoreColRef, item._id) : doc(this.firestoreColRef);

    if (!item._id) {
      item._id = docRef.id;
    }

    await setDoc(docRef, this.toSerializableObject(item as T));
    this.initializeSubCollections(item as T);

    return item as T;
  }

  public async update(item: T, options?: SetOptions): Promise<T> {
    if (this.config.validateModels) {
      const errors = await this.validate(item);

      if (errors.length) {
        throw errors;
      }
    }

    if (item._id && !await this.findById(item._id)) {
      throw new Error(`A document with id ${item._id} not exists.`);
    }

    return setDoc(
      doc(this.firestoreColRef, item._id),
      this.toSerializableObject(item),
      options ?? {},
    ).then(() => item);
  }

  public delete(id: string): Promise<void> {
    return deleteDoc(doc(this.firestoreColRef, id));
  }

  public runTransaction<R>(executor: (tran: TransactionRepository<T>) => Promise<R>): Promise<R> {
    return runTransaction<R>((tran) => {
      const repository = tran.getRepository<T>(this.path);
      return executor(repository);
    });
  }

  public createBatch(): FirestoreBatchSingleRepository<T> {
    const {firestoreRef} = getMetadataStore();
    return new FirestoreBatchStorage(firestoreRef).getSingleRepository(this.path);
  }

  public execute(config: QueryExecutorConfig<T>): Promise<T[]> | Unsubscribe {
    const queryConstraints = config.queries.reduce<QueryConstraint[]>((acc, cur) => {
      return [...acc, where(cur.prop, cur.operator as WhereFilterOp, cur.val)];
    }, []);

    if (config.orderByObj) {
      queryConstraints.push(orderBy(config.orderByObj.fieldPath, config.orderByObj.directionStr));
    }

    if (config.single) {
      queryConstraints.push(limit(1));
    }

    if (config.limit) {
      queryConstraints.push(limit(config.limit));
    }

    if (config.offset) {
      queryConstraints.push(startAfter(config.limit));
    }

    if (config.customQuery) {
      queryConstraints.push(config.customQuery(queryConstraints, this.firestoreColRef));
    }

    if (config.listen) {
      return onSnapshot(
        query(this.firestoreColRef, ...queryConstraints),
        config.listen?.options ?? {},
        (snapshot) => {
          config.listen?.next && config.listen.next(this.pipeProcess(this.extractTFromColSnap(snapshot), config.pipeOperators));
        },
        (error) => {
          config.listen?.error && config.listen.error(error);
        },
      );
    }

    let sourceFn = getDocs;

    if (config.source) {
      switch (config.source) {
        case 'server':
          sourceFn = getDocsFromServer;
          break;
        case 'cache':
          sourceFn = getDocsFromCache;
          break;
      }
    }

    return sourceFn(query(this.firestoreColRef, ...queryConstraints))
      .then((items) => this.pipeProcess(this.extractTFromColSnap(items), config.pipeOperators));
  }

  protected pipeProcess(items: T[], operators: PipeOperator<T>[] = []): T[] {
    return operators.reduce((acc, operator) => {
      return operator(items);
    }, items);
  }
}

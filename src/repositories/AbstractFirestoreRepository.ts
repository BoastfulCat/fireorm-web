import {FieldValue, FirestoreError, SetOptions} from '@firebase/firestore';
import {plainToInstance} from 'class-transformer';
import {validate, ValidationError} from 'class-validator';
import {
  collection,
  CollectionReference,
  DocumentSnapshot,
  QuerySnapshot,
  Transaction,
  Unsubscribe,
} from 'firebase/firestore';
import {serializeKey} from '../decorators';
import {NoMetadataError} from '../errors';
import {DummyRepository} from '../repositories/DummyRepository';
import {
  CustomQuery,
  Entity,
  EntityConstructor,
  FirestoreVal,
  FullCollectionMetadata,
  MetadataStorageConfig,
  PartialBy,
  PipeOperator,
  QueryBuilder as QueryBuilderInterface,
  QueryExecutorConfig,
  Repository,
  TransactionReferenceStorage,
  WherePropParam,
} from '../types';
import {QueryBuilderUnit} from '../units';
import {
  getMetadataStore,
  getRepository,
  getTransactionRepository,
  isDocumentReference,
  isGeoPoint,
  isObject,
  isTimestamp,
  serializeEntity,
} from '../utils';

export abstract class AbstractFirestoreRepository<T extends Entity> extends DummyRepository implements Repository<T> {
  protected readonly colMetadata: FullCollectionMetadata;
  protected readonly path: string;
  protected readonly config: MetadataStorageConfig;
  protected readonly firestoreColRef: CollectionReference;

  public constructor(pathOrConstructor: string | EntityConstructor) {
    super();

    const metaStore = getMetadataStore();

    if (!metaStore.firestoreRef) {
      throw new Error('Firestore must be initialized first');
    }

    this.config = metaStore.config;
    const colMetadata = metaStore.getCollection(pathOrConstructor);

    if (!colMetadata) {
      throw new NoMetadataError(pathOrConstructor);
    }

    this.colMetadata = colMetadata;
    this.path = typeof pathOrConstructor === 'string' ? pathOrConstructor : this.colMetadata.name;
    this.firestoreColRef = collection(metaStore.firestoreRef, this.path);
  }

  protected toSerializableObject = (obj: T): Record<string, FieldValue | Partial<unknown> | undefined> =>
    serializeEntity(obj, this.colMetadata.subCollections);

  protected transformFirestoreTypes = (obj: Record<string, unknown>): Record<string, unknown> => {
    Object.keys(obj).forEach((key) => {
      const val = obj[key];

      if (!obj[key]) {
        return;
      }

      if (isTimestamp(val)) {
        obj[key] = val.toDate();
      } else if (isGeoPoint(val)) {
        const {latitude, longitude} = val;
        obj[key] = {latitude, longitude};
      } else if (isDocumentReference(val)) {
        const {id, path} = val;
        obj[key] = {id, path};
      } else if (isObject(val)) {
        this.transformFirestoreTypes(val);
      }
    });

    return obj;
  };

  protected initializeSubCollections = (
    entity: T,
    tran?: Transaction,
    tranRefStorage?: TransactionReferenceStorage,
  ): void => {
    this.colMetadata.subCollections.forEach((subCol) => {
      const pathWithSubCol = `${this.path}/${entity._id}/${subCol.name}`;
      const {propertyKey} = subCol;

      // If we are inside a transaction, our sub-collections should also be TransactionRepositories
      if (tran && tranRefStorage) {
        // const firestoreTransaction = new FirestoreTransaction(tran, tranRefStorage);
        // firestoreTransaction.getRepository(pathWithSubCol);

        tranRefStorage.add({propertyKey, path: pathWithSubCol, entity});
        Object.assign(entity, {
          [propertyKey]: getTransactionRepository(pathWithSubCol, tran, tranRefStorage),
        });
      } else {
        Object.assign(entity, {
          [propertyKey]: getRepository(pathWithSubCol),
        });
      }
    });
  };

  protected initializeSerializedObjects(entity: T): void {
    Object.keys(entity).forEach((propertyKey) => {
      if (Reflect.getMetadata(serializeKey, entity, propertyKey) !== undefined) {
        const constructor = Reflect.getMetadata(serializeKey, entity, propertyKey);
        const data = entity as unknown as { [k: string]: unknown };
        const subData = data[propertyKey] as { [k: string]: unknown };

        if (Array.isArray(subData)) {
          (entity as unknown as { [key: string]: unknown })[propertyKey] = subData.map((value) => {
            const subEntity = new constructor();

            // eslint-disable-next-line guard-for-in
            for (const i in value) {
              subEntity[i] = value[i];
            }

            this.initializeSerializedObjects(subEntity);

            return subEntity;
          });
        } else {
          const subEntity = new constructor();

          // eslint-disable-next-line guard-for-in
          for (const i in subData) {
            subEntity[i] = subData[i];
          }

          this.initializeSerializedObjects(subEntity);

          (entity as unknown as { [key: string]: unknown })[propertyKey] = subEntity;
        }
      }
    });
  }

  protected extractTFromDocSnap = (
    doc: DocumentSnapshot,
    tran?: Transaction,
    tranRefStorage?: TransactionReferenceStorage,
  ): T => {
    const entity = plainToInstance(
      this.colMetadata.entityConstructor,
      {
        _id: doc.id,
        ...this.transformFirestoreTypes(doc.data() || {}),
      },
      this.config.transformOptions,
    ) as T;

    this.initializeSubCollections(entity, tran, tranRefStorage);
    this.initializeSerializedObjects(entity);

    return entity;
  };

  protected extractTFromColSnap = (
    querySnp: QuerySnapshot,
    tran?: Transaction,
    tranRefStorage?: TransactionReferenceStorage,
  ): T[] => {
    return querySnp
      .docs
      .filter((docSnp) => docSnp.exists)
      .map((docSnp) => this.extractTFromDocSnap(docSnp, tran, tranRefStorage));
  };

  /**
   * return a new QueryBuilder with a filter specifying that the
   * value in @param prop must be equal to @param val.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal} val value to compare in the filter
   * @return {QueryBuilderUnit<Entity>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereEqualTo(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereEqualTo(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * value in @param prop must not be equal to @param val.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal} val value to compare in the filter
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereNotEqualTo(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereNotEqualTo(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * value in @param prop must be greater than @param val.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal} val value to compare in the filter
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereGreaterThan(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereGreaterThan(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * value in @param prop must be greater or equal than @param val.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal} val value to compare in the filter
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereGreaterOrEqualThan(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereGreaterOrEqualThan(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * value in @param prop must be less than @param val.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal} val value to compare in the filter
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereLessThan(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereLessThan(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * value in @param prop must be less or equal than @param val.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal} val value to compare in the filter
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereLessOrEqualThan(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereLessOrEqualThan(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * value in @param val must be contained in @param prop.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal} val value to compare in the filter
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereArrayContains(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereArrayContains(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * field @param prop is an array that contains one or more of the comparison values in @param val
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal[]} val array of values to compare in the filter (max 10 items in array)
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereArrayContainsAny(prop: WherePropParam<T>, val: FirestoreVal[]): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereArrayContainsAny(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * field @param prop matches any of the comparison values in @param val
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal[]} val array of values to compare in the filter (max 10 items in array)
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereIn(prop: WherePropParam<T>, val: FirestoreVal[]): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereIn(prop, val);
  }

  /**
   * return a new QueryBuilder with a filter specifying that the
   * field @param prop matches none of the comparison values in @param val
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be filtered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @param {FirestoreVal[]} val array of values to compare in the filter (max 10 items in array)
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * query applied.
   * @memberof AbstractFirestoreRepository
   */
  public whereNotIn(prop: WherePropParam<T>, val: FirestoreVal[]): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).whereNotIn(prop, val);
  }

  /**
   * return a new QueryBuilder with a maximum number of results
   * to return. Can only be used once per query.
   *
   * @template T
   * @param {number} limitVal maximum number of results to return
   * Must be greater or equal than 0
   * @return {QueryBuilderInterface<T>} QueryBuilder A new QueryBuilder with
   * the specified limit applied
   * @memberof AbstractFirestoreRepository
   */
  public limit(limitVal: number): QueryBuilderInterface<T> {
    if (limitVal < 0) {
      throw new Error(`limitVal must be greater than 0. It received: ${limitVal}`);
    }

    return new QueryBuilderUnit<T>(this).limit(limitVal);
  }

  public offset(value: number): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).offset(value);
  }

  /**
   * return a new QueryBuilder with an additional ascending order
   * specified by @param prop. Can only be used once per query.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be ordered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * ordering applied.
   * @memberof AbstractFirestoreRepository
   */
  public orderByAscending(prop: WherePropParam<T>): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).orderByAscending(prop);
  }

  /**
   * return a new QueryBuilder with an additional descending order
   * specified by @param prop. Can only be used once per query.
   *
   * @template T
   * @param {WherePropParam<T>} prop field to be ordered on, where
   * prop could be keyof T or a lambda where T is the first parameter
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * ordering applied.
   * @memberof AbstractFirestoreRepository
   */
  public orderByDescending(prop: WherePropParam<T>): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).orderByDescending(prop);
  }

  public pipe(...prop: PipeOperator<T>[]): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).pipe(...prop);
  }

  /**
   * Execute the query and applies all the filters (if specified)
   *
   * @template T
   * @return {Promise<T[]>} List of documents that matched the filters
   * (if specified)
   * @memberof AbstractFirestoreRepository
   */
  public find(): Promise<T[]> {
    return new QueryBuilderUnit<T>(this).find();
  }

  public findAndListen(
    next?: (items: T[]) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe {
    return new QueryBuilderUnit<T>(this).findAndListen(next, error);
  }

  /**
   * Execute the query to find at least one document matching all
   * filters (if specified)
   *
   * @template T
   * @return {Promise<T | null>} One document that matched the filters
   * (if specified), or null if none exists.
   *
   * @memberof AbstractFirestoreRepository
   */
  public findOne(): Promise<T | null> {
    return new QueryBuilderUnit<T>(this).findOne();
  }

  public findOneAndListen(
    next?: (items: T[]) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe {
    return new QueryBuilderUnit<T>(this).findOneAndListen(next, error);
  }

  /**
   * return a new QueryBuilder with an custom query
   * specified by @param func. Can only be used once per query.
   *
   * @template T
   * @param {CustomQuery<T>} func function to run in a new query
   * @return {QueryBuilderUnit<T>} A new QueryBuilder with the specified
   * custom query applied.
   * @memberof AbstractFirestoreRepository
   */
  public customQuery(func: CustomQuery<T>): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).customQuery(func);
  }

  public query(): QueryBuilderInterface<T> {
    return new QueryBuilderUnit<T>(this).query();
  }

  /**
   * Uses class-validator to validate an entity using decorators set in the collection class
   *
   * @template T
   * @param {T} item class or object representing an entity
   * @return {Promise<ValidationError[]>} An array of class-validator errors
   */
  public async validate(item: T): Promise<ValidationError[]> {
    const {entityConstructor: Entity} = this.colMetadata;

    /**
     * Instantiate plain objects into an entity class
     */
    const entity = item instanceof Entity ? item : Object.assign(new Entity(), item);

    return validate(entity, this.config.validatorOptions);
  }

  /**
   * Takes all the queries stored by QueryBuilder and executes them.
   * Must be implemented by base repositores
   *
   * @template T
   * @abstract
   * @param {QueryExecutorConfig<T>} config list of queries stored in QueryBuilder
   * @return {Promise<T[]>} results from firestore converted into entities <T>
   * @memberof AbstractFirestoreRepository
   */
  public abstract execute(config: QueryExecutorConfig<T>): Promise<T[]> | Unsubscribe;

  /**
   * Retrieve a document with the specified id.
   * Must be implemented by base repositores
   *
   * @template T
   * @abstract
   * @param {string} id
   * @return {Promise<T>}
   * @memberof AbstractFirestoreRepository
   */
  public abstract findById(id: string): Promise<T | null>;

  public abstract findByIdAndListen(
    id: string,
    next?: (item: T | null) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe;

  /**
   * Creates a document.
   * If no id is passed, is automatically generated.
   * Must be implemented by base repositores
   *
   * @template T
   * @abstract
   * @param {PartialBy<T, 'id'>} item
   * @return {Promise<T>}
   * @memberof AbstractFirestoreRepository
   */
  public abstract create(item: PartialBy<T, '_id'>): Promise<T>;

  /**
   * Updates a document.
   * Must be implemented by base repositores
   *
   * @template T
   * @abstract
   * @param {T} item
   * @param {SetOptions} options
   * @return {Promise<T>}
   * @memberof AbstractFirestoreRepository
   */
  public abstract update(item: T, options?: SetOptions): Promise<T>;

  /**
   * Deletes a document.
   * Must be implemented by base repositores
   *
   * @template T
   * @abstract
   * @param {string} id
   * @return {Promise<T>}
   * @memberof AbstractFirestoreRepository
   */
  public abstract delete(id: string): Promise<void>;
}

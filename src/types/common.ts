import {FirestoreError, QueryConstraint, SetOptions, SnapshotListenOptions} from '@firebase/firestore';
import {ClassTransformOptions} from 'class-transformer';
import {ValidatorOptions} from 'class-validator';
import {CollectionReference, DocumentReference, OrderByDirection, Unsubscribe} from 'firebase/firestore';

export enum FirestoreOperators {
  equal = '==',
  notEqual = '!=',
  lessThan = '<',
  greaterThan = '>',
  lessThanEqual = '<=',
  greaterThanEqual = '>=',
  arrayContains = 'array-contains',
  arrayContainsAny = 'array-contains-any',
  in = 'in',
  notIn = 'not-in',
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type PartialWithRequiredBy<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
export type WithOptionalId<T extends { _id: unknown }> = Pick<T, Exclude<keyof T, '_id'>> & Partial<Pick<T, '_id'>>;
export type WherePropParam<T> = keyof T | ((t: T) => unknown);
export type FirestoreVal = string | number | Date | boolean | DocumentReference | null;
export type Constructor<T> = { new(): T };
export type EntityConstructor = Constructor<Entity>;
export type EntityConstructorOrPath<T> = Constructor<T> | string;
export type RepositoryType = 'default' | 'base' | 'custom' | 'transaction';
export type EntityRepositoryConstructor = Constructor<Repository<Entity>>;
export type Repository<T extends Entity> = BaseRepository<T> & QueryBuilder<T> & QueryExecutor<T>;
export type QueryBuilder<T extends Entity> = Queryable<T> & Orderable<T> & Limitable<T> & Offsetable<T> & QueryPipe<T>;
export type TransactionRepository<T extends Entity> = Repository<T>;
export type TransactionReferenceStorage = Set<TransactionReference>;

export interface Queryable<T extends Entity> {
  whereEqualTo(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilder<T>;

  whereNotEqualTo(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilder<T>;

  whereGreaterThan(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilder<T>;

  whereGreaterOrEqualThan(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilder<T>;

  whereLessThan(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilder<T>;

  whereLessOrEqualThan(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilder<T>;

  whereArrayContains(prop: WherePropParam<T>, val: FirestoreVal): QueryBuilder<T>;

  whereArrayContainsAny(prop: WherePropParam<T>, val: FirestoreVal[]): QueryBuilder<T>;

  whereIn(prop: WherePropParam<T>, val: FirestoreVal[]): QueryBuilder<T>;

  whereNotIn(prop: WherePropParam<T>, val: FirestoreVal[]): QueryBuilder<T>;

  find(): Promise<T[]>;

  findOne(): Promise<T | null>;

  findAndListen(
    next?: (items: T[]) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe;

  findOne(): Promise<T | null>;

  findOneAndListen(
    next?: (items: T[]) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe;

  customQuery(func: CustomQuery<T>): QueryBuilder<T>;

  query(): QueryBuilder<T>;
}

export interface Orderable<T extends Entity> {
  orderByAscending(prop: WherePropParam<T>): QueryBuilder<T>;

  orderByDescending(prop: WherePropParam<T>): QueryBuilder<T>;
}

export interface Limitable<T extends Entity> {
  limit(limitVal: number): QueryBuilder<T>;
}

export interface Offsetable<T extends Entity> {
  offset(value: number): QueryBuilder<T>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type CustomQuery<T> = (
  queryConstraint: QueryConstraint[],
  firestoreColRef: CollectionReference,
) => QueryConstraint;

export interface FireOrmQueryLine {
  prop: string;
  val: FirestoreVal | FirestoreVal[];
  operator: FirestoreOperators;
}

export interface QueryPipe<T extends Entity> {
  pipe(...operators: PipeOperator<T>[]): QueryBuilder<T>;
}

export interface QueryExecutor<T> {
  execute(config: QueryExecutorConfig<T>): Promise<T[]> | Unsubscribe;
}

export interface QueryExecutorListener<T> {
  options?: SnapshotListenOptions;
  next?: (items: T[]) => void;
  error?: (error: FirestoreError) => void;
}

export interface QueryExecutorConfig<T> {
  queries: FireOrmQueryLine[];
  limit?: number;
  offset?: number;
  orderByObj?: OrderByParams;
  single?: boolean;
  customQuery?: CustomQuery<T>;
  listen?: QueryExecutorListener<T>;
  source?: 'server' | 'cache' | 'default';
  pipeOperators?: PipeOperator<T>[];
}

export type PipeOperator<T> = (items: T[]) => T[];

export interface OrderByParams {
  fieldPath: string;
  directionStr: OrderByDirection;
}

export interface Entity {
  _id: string;
}

export interface TransactionReference<T = Entity> {
  entity: T;
  propertyKey: string;
  path: string;
}

export interface BaseRepository<T extends Entity> {
  findById(id: string): Promise<T | null>;

  findByIdAndListen(
    id: string,
    next?: (item: T | null) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe;

  create(item: PartialBy<T, '_id'>): Promise<T>;

  update(item: PartialWithRequiredBy<T, '_id'>, options?: SetOptions): Promise<PartialWithRequiredBy<T, '_id'>>;

  delete(id: string): Promise<void>;
}

export interface CollectionMetadata {
  name: string;
  entityConstructor: EntityConstructor;
  parentEntityConstructor?: EntityConstructor;
  propertyKey?: string;
}

export interface CollectionMetadataWithSegments extends CollectionMetadata {
  segments: string[];
}

export interface SubCollectionMetadata extends CollectionMetadata {
  parentEntityConstructor: EntityConstructor;
  propertyKey: string;
}

export interface SubCollectionMetadataWithSegments extends SubCollectionMetadata {
  segments: string[];
}

export interface RepositoryMetadata {
  target: EntityRepositoryConstructor;
  entity: EntityConstructor;
}

export interface FullCollectionMetadata extends CollectionMetadataWithSegments {
  subCollections: SubCollectionMetadataWithSegments[];
}

export interface MetadataStorageConfig {
  validateModels?: boolean;
  validatorOptions?: ValidatorOptions;
  // transformModels: boolean;
  transformOptions?: ClassTransformOptions;
}

export interface FirestoreTransaction<T extends Entity = Entity> {
  getRepository(entityOrConstructor: EntityConstructorOrPath<T>): Repository<T>;
}

export interface BatchRepository<T extends Entity> {
  create(item: WithOptionalId<T>): void;

  update(item: T): void;

  delete(item: T): void;
}

export interface BaseFirestoreBatchSingleRepository<T extends Entity> extends BatchRepository<T> {
  commit(): Promise<void>;
}

export interface FirestoreBatch {
  getRepository<T extends Entity>(entity: Constructor<T>): BatchRepository<T>;

  getSingleRepository<T extends Entity>(
    pathOrConstructor: EntityConstructorOrPath<T>,
  ): BaseFirestoreBatchSingleRepository<T>;

  commit(): Promise<unknown>;
}

export interface BatchOperation<T extends Entity> {
  type: 'create' | 'update' | 'delete';
  item: T;
  ref: DocumentReference;
  collectionMetadata: FullCollectionMetadata;
  validateModels: boolean;
  validatorOptions?: ValidatorOptions;
}

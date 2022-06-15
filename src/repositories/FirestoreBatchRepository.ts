import {collection, CollectionReference, doc} from 'firebase/firestore';
import {NoMetadataError} from '../errors';
import {
  BatchRepository,
  Entity,
  EntityConstructorOrPath,
  FullCollectionMetadata,
  MetadataStorageConfig,
  WithOptionalId,
} from '../types';
import {FirestoreBatchUnit} from '../units';
import {getMetadataStore} from '../utils';

export class FirestoreBatchRepository<T extends Entity> implements BatchRepository<T> {
  protected colMetadata: FullCollectionMetadata;
  protected colRef: CollectionReference;
  protected config: MetadataStorageConfig;
  protected path: string;

  public constructor(
    protected pathOrConstructor: EntityConstructorOrPath<T>,
    protected batch: FirestoreBatchUnit,
  ) {
    const {getCollection, firestoreRef, config} = getMetadataStore();

    const colMetadata = getCollection(pathOrConstructor);

    if (!colMetadata) {
      throw new NoMetadataError(pathOrConstructor);
    }

    this.colMetadata = colMetadata;
    this.path = typeof pathOrConstructor === 'string' ? pathOrConstructor : this.colMetadata.name;
    this.colRef = collection(firestoreRef, this.path);
    this.config = config;
  }

  public create(item: WithOptionalId<T>): void {
    const docRef = item._id ? doc(this.colRef, item._id) : doc(this.colRef);

    if (!item._id) {
      item._id = docRef.id;
    }

    this.batch.add({
      type: 'create',
      item: item as T,
      ref: docRef,
      collectionMetadata: this.colMetadata,
      validateModels: Boolean(this.config.validateModels),
      validatorOptions: this.config.validatorOptions,
    });
  }

  public update(item: T): void {
    this.batch.add({
      type: 'update',
      item: item,
      ref: doc(this.colRef, item._id),
      collectionMetadata: this.colMetadata,
      validateModels: Boolean(this.config.validateModels),
      validatorOptions: this.config.validatorOptions,
    });
  }

  public delete(item: T): void {
    this.batch.add({
      type: 'delete',
      item: item,
      ref: doc(this.colRef, item._id),
      collectionMetadata: this.colMetadata,
      validateModels: Boolean(this.config.validateModels),
      validatorOptions: this.config.validatorOptions,
    });
  }
}

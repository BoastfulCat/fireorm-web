import {Firestore} from '@firebase/firestore';
import {DummyRepository} from '@orm/repositories';
import {
  CollectionMetadata,
  CollectionMetadataWithSegments,
  Constructor,
  Entity,
  EntityConstructor,
  MetadataStorageConfig,
  RepositoryMetadata,
  SubCollectionMetadataWithSegments,
} from '@orm/types';
import {isEqual} from 'lodash';

export class MetadataStore {
  public readonly collections: CollectionMetadataWithSegments[] = [];
  protected readonly repositories: Map<EntityConstructor, RepositoryMetadata> = new Map();
  public firestoreRef!: Firestore;
  public static instance: MetadataStore;

  public config: MetadataStorageConfig = {
    validateModels: false,
    validatorOptions: {},
    transformOptions: {},
  };

  public setCollection(col: CollectionMetadata): void {
    const existing = this.getCollection(col.entityConstructor);

    if (existing) {
      throw new Error(`Collection with name ${existing.name} has already been registered`);
    }

    const colToAdd = {
      ...col,
      segments: [col.name],
    };

    this.collections.push(colToAdd);

    const getWhereImParent = (parent: Constructor<Entity>): CollectionMetadataWithSegments[] =>
      this.collections.filter((collection) => collection.parentEntityConstructor === parent);

    const colsToUpdate = getWhereImParent(col.entityConstructor);

    // Update segments for sub-collections and sub-collections of sub-collections
    while (colsToUpdate.length) {
      const collection = colsToUpdate.pop();

      if (!collection) {
        return;
      }

      const parent = this.collections.find((parentItem) => parentItem.entityConstructor === collection.parentEntityConstructor);

      collection.segments = parent?.segments.concat(collection.name) || [];
      getWhereImParent(collection.entityConstructor).forEach((col) => colsToUpdate.push(col));
    }
  }

  public getCollection(pathOrConstructor: string | EntityConstructor): CollectionMetadataWithSegments & { subCollections: SubCollectionMetadataWithSegments[] } | null {
    let collection: CollectionMetadataWithSegments | undefined;
    // If is a path like users/user-id/messages/message-id/senders,
    // take all the even segments [users/messages/senders] and
    // look for an entity with those segments

    if (typeof pathOrConstructor === 'string') {
      const segments = pathOrConstructor.split('/');

      // Return null if incomplete segment
      if (segments.length % 2 === 0) {
        throw new Error(`Invalid collection path: ${pathOrConstructor}`);
      }

      const collectionSegments = segments.reduce<string[]>(
        (acc, cur, index) => (index % 2 === 0 ? acc.concat(cur) : acc),
        [],
      );
      collection = this.collections.find((c) => isEqual(c.segments, collectionSegments));
    } else {
      collection = this.collections.find((c) => c.entityConstructor === pathOrConstructor);
    }

    if (!collection) {
      return null;
    }

    const subCollections = this.collections.filter(
      (s) => s.parentEntityConstructor === collection?.entityConstructor,
    ) as SubCollectionMetadataWithSegments[];

    return {
      ...collection,
      subCollections,
    };
  }

  public getRepository(param: EntityConstructor): RepositoryMetadata | undefined | null {
    return this.repositories.get(param) || null;
  }

  public setRepository(repo: RepositoryMetadata): void {
    const savedRepo = this.getRepository(repo.entity);

    if (savedRepo && repo.target !== savedRepo.target) {
      throw new Error('Cannot register a custom repository twice with two different targets');
    }

    if (!(repo.target.prototype instanceof DummyRepository)) {
      throw new Error(
        'Cannot register a custom repository on a class that does not inherit from BaseFirestoreRepository',
      );
    }

    this.repositories.set(repo.entity, repo);
  }

  public getRepositories(): Map<EntityConstructor, RepositoryMetadata> {
    return this.repositories;
  }
}


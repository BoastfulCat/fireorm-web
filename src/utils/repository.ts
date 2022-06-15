import {BaseFirestoreRepository, BaseTransactionRepository} from '@orm/repositories';
import {FirestoreTransaction} from '@orm/trunsactions';
import {Entity, EntityConstructorOrPath, RepositoryType, TransactionReferenceStorage} from '@orm/types';
import {getMetadataStore} from '@orm/utils';
import {Transaction} from 'firebase/firestore';

function _getRepository<T extends Entity = Entity>(
  entityConstructorOrPath: EntityConstructorOrPath<T>,
  repositoryType: RepositoryType,
): BaseFirestoreRepository<T> {
  const metadataStorage = getMetadataStore();

  if (!metadataStorage.firestoreRef) {
    throw new Error('Firestore must be initialized first');
  }

  const collection = metadataStorage.getCollection(entityConstructorOrPath);
  const isPath = typeof entityConstructorOrPath === 'string';
  const collectionName = typeof entityConstructorOrPath === 'string' ? entityConstructorOrPath : entityConstructorOrPath.name;

  if (!collection) {
    const error = isPath ? `'${collectionName}' is not a valid path for a collection` : `'${collectionName}' is not a valid collection`;
    throw new Error(error);
  }

  const repository = metadataStorage.getRepository(collection.entityConstructor);

  if (repositoryType === 'custom' && !repository) {
    throw new Error(`'${collectionName}' does not have a custom repository.`);
  }

  // If the collection has a parent, check that we have registered the parent
  if (collection.parentEntityConstructor) {
    const parentCollection = metadataStorage.getCollection(collection.parentEntityConstructor);

    if (!parentCollection) {
      throw new Error(`'${collectionName}' does not have a valid parent collection.`);
    }
  }

  if (repositoryType === 'custom' || (repositoryType === 'default' && repository)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (repository?.target as any)(entityConstructorOrPath);
  } else {
    return new BaseFirestoreRepository<T>(entityConstructorOrPath);
  }
}

export function getRepository<T extends Entity>(
  entityConstructorOrPath: EntityConstructorOrPath<T>,
): BaseFirestoreRepository<T> {
  return _getRepository(entityConstructorOrPath, 'default');
}

export function getCustomRepository<T extends Entity>(
  entityOrPath: EntityConstructorOrPath<T>,
): BaseFirestoreRepository<T> {
  return _getRepository(entityOrPath, 'custom');
}

export function getBaseRepository<T extends Entity>(
  entityOrPath: EntityConstructorOrPath<T>,
): BaseFirestoreRepository<T> {
  return _getRepository(entityOrPath, 'base');
}

export function getTransactionRepository<T extends Entity>(
  pathWithSubCol: string,
  tran: Transaction,
  tranRefStorage: TransactionReferenceStorage,
): BaseTransactionRepository<T> {
  const firestoreTransaction = new FirestoreTransaction(tran, tranRefStorage);
  return firestoreTransaction.getRepository(pathWithSubCol);
}

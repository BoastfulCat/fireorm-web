import {BaseFirestoreBatchRepository} from '@orm/repositories/BaseFirestoreBatchRepository';
import {BaseFirestoreBatchSingleRepository as BaseFirestoreBatchSingleRepositoryInterface, Entity} from '@orm/types';

/**
 *
 * This class is only needed to maintain current batch functionality
 * inside repositories and might be deleted in the next major version
 *
 * @export
 * @class FirestoreBatchRepository
 * @extends {BaseFirestoreBatchRepository<T>}
 * @template T
 */
export class BaseFirestoreBatchSingleRepository<T extends Entity> extends BaseFirestoreBatchRepository<T> implements BaseFirestoreBatchSingleRepositoryInterface<T> {
  public async commit(): Promise<void> {
    await this.batch.commit();
  }
}

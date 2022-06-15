import {FirestoreBatchRepository} from '@orm/repositories/FirestoreBatchRepository';
import {BaseFirestoreBatchSingleRepository, Entity} from '@orm/types';

/**
 *
 * This class is only needed to maintain current batch functionality
 * inside repositories and might be deleted in the next major version
 *
 * @export
 * @class FirestoreBatchRepository
 * @extends {FirestoreBatchRepository<T>}
 * @template T
 */
export class FirestoreBatchSingleRepository<T extends Entity> extends FirestoreBatchRepository<T> implements BaseFirestoreBatchSingleRepository<T> {
  public async commit(): Promise<void> {
    await this.batch.commit();
  }
}

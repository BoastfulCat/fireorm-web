import {Firestore} from '@firebase/firestore';
import {BatchOperation, Constructor, Entity} from '@orm/types';
import {serializeEntity} from '@orm/utils';
import {validate, ValidationError, ValidatorOptions} from 'class-validator';
import {writeBatch} from 'firebase/firestore';

export class FirestoreBatchUnit {
  private status: 'pending' | 'committing' = 'pending';
  public operations: BatchOperation<Entity>[] = [];

  public constructor(private firestoreRef: Firestore) {
  }

  public add<T extends Entity>(operation: BatchOperation<T>): void {
    this.operations.push(operation);
  }

  public commit = async (): Promise<void> => {
    if (this.status === 'committing') {
      throw new Error('This Batch is being committed');
    }

    if (this.operations.length === 0) {
      throw new Error('Cannot commit a batch with zero operations');
    }

    this.status = 'committing';
    const batch = writeBatch(this.firestoreRef);

    for (const op of this.operations) {
      if (op.validateModels && ['create', 'update'].includes(op.type)) {
        const errors = await this.validate(
          op.item,
          op.collectionMetadata.entityConstructor,
          op.validatorOptions,
        );

        if (errors.length) {
          throw errors;
        }
      }

      const serialized = serializeEntity(op.item, op.collectionMetadata.subCollections);

      switch (op.type) {
        case 'create':
          batch.set(op.ref, serialized);
          break;
        case 'update':
          batch.update(op.ref, serialized);
          break;
        case 'delete':
          batch.delete(op.ref);
          break;
      }
    }

    const result = await batch.commit();
    this.operations = [];
    this.status = 'pending';

    return result;
  };

  public async validate(
    item: Entity,
    Entity: Constructor<Entity>,
    validatorOptions?: ValidatorOptions,
  ): Promise<ValidationError[]> {
    /**
     * Instantiate plain objects into an entity class
     */
    const entity = item instanceof Entity ? item : Object.assign(new Entity(), item);

    return validate(entity, validatorOptions);
  }
}

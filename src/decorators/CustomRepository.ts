import {FirebaseCustomRepository} from '../repositories';
import {Constructor, Entity} from '../types';

export function CustomRepository<T extends Entity = Entity>(entity: Constructor<T>) {
  return FirebaseCustomRepository(entity);
}

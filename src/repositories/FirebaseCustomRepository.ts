import {DummyRepository} from '../repositories/DummyRepository';
import {Constructor, Entity, Repository} from '../types';
import {getMetadataStore} from '../utils';

/*
  Cannot enforce the type in target presumably becasuse Typescript
  cannot verify than the T from the entity param is the same T from
  the repository. Might be interesting to revisit later
*/
export function FirebaseCustomRepository<T extends Entity>(entity: Constructor<T>) {
  /* eslint-disable-next-line space-before-function-paren */
  return function (target: DummyRepository): void {
    getMetadataStore().setRepository({
      entity,
      target: target as Constructor<Repository<Entity>>,
    });
  };
}

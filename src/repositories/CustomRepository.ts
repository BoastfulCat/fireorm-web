import {BaseRepository} from '@orm/repositories/BaseRepository';
import {Constructor, Entity, Repository} from '@orm/types';
import {getMetadataStore} from '@orm/utils';

/*
  Cannot enforce the type in target presumably becasuse Typescript
  cannot verify than the T from the entity param is the same T from
  the repository. Might be interesting to revisit later
*/
export function CustomRepository<T extends Entity>(entity: Constructor<T>) {
  return function(target: BaseRepository): void {
    getMetadataStore().setRepository({
      entity,
      target: target as Constructor<Repository<Entity>>,
    });
  };
}

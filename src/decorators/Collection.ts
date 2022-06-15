import {EntityConstructor} from '@orm/types';
import {getMetadataStore} from '@orm/utils';
import {plural} from 'pluralize';

export function Collection(entityName?: string) {
  return function(entityConstructor: EntityConstructor): void {
    const name = entityName || plural(entityConstructor.name.toLowerCase());
    getMetadataStore().setCollection({
      name,
      entityConstructor,
    });
  };
}

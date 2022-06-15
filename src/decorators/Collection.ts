import {plural} from 'pluralize';
import {EntityConstructor} from '../types';
import {getMetadataStore} from '../utils';

export function Collection(entityName?: string) {
  /* eslint-disable-next-line space-before-function-paren */
  return function (entityConstructor: EntityConstructor): void {
    const name = entityName || plural(entityConstructor.name.toLowerCase());

    getMetadataStore().setCollection({
      name,
      entityConstructor,
    });
  };
}

import {Entity, EntityConstructor} from '../types';
import {getMetadataStore} from '../utils';
import {plural} from 'pluralize';

export function SubCollection(entityConstructor: EntityConstructor, entityName?: string) {
  return function(parentEntity: Entity, propertyKey: string): void {
    getMetadataStore().setCollection({
      entityConstructor,
      name: entityName || plural(entityConstructor.name),
      parentEntityConstructor: parentEntity.constructor as EntityConstructor,
      propertyKey,
    });
  };
}

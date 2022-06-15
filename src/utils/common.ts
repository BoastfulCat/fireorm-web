import {FieldValue} from '@firebase/firestore';
import {ignoreKey, serializeKey} from '../decorators';
import {Entity, SubCollectionMetadata} from '../types';
import {getMetadataStore} from '../utils';
import {instanceToPlain} from 'class-transformer';

/**
 * Returns a serializable object from entity<T>
 *
 * @template T
 * @param {Partial<T>} obj Object
 * @param {SubCollectionMetadata[]} subColMetadata Sub-collection
 * metadata to remove runtime-created fields
 * @return {Object} Serialiable object
 */
export function serializeEntity<T extends Entity>(
  obj: Partial<T>,
  subColMetadata: SubCollectionMetadata[],
): Record<string, FieldValue | Partial<unknown> | undefined> {
  const objectGetters = extractAllGetters(obj as Record<string, unknown>);
  const metadataStore = getMetadataStore();
  const serializableObj = {
    ...instanceToPlain(obj, metadataStore.config.transformOptions),
    ...objectGetters,
  };

  subColMetadata.forEach((scm) => {
    delete serializableObj[scm.propertyKey];
  });

  Object.entries(serializableObj).forEach(([propertyKey, propertyValue]) => {
    if (Reflect.getMetadata(ignoreKey, obj, propertyKey) === true) {
      delete serializableObj[propertyKey];
    }
    if (Reflect.getMetadata(serializeKey, obj, propertyKey) !== undefined) {
      if (Array.isArray(propertyValue)) {
        (serializableObj as { [key: string]: unknown })[propertyKey] = propertyValue.map((element) =>
          serializeEntity(element, []),
        );
      } else {
        (serializableObj as { [key: string]: unknown })[propertyKey] = serializeEntity(
          propertyValue as Partial<T>,
          [],
        );
      }
    }
  });

  return serializableObj;
}

/**
 * Extract getters and object in form of data properties
 *
 * @param {Record<string, unknown>} obj object
 * @return {Object} with only data properties
 */
export function extractAllGetters(obj: Record<string, unknown>): Record<string, unknown> {
  const prototype = Object.getPrototypeOf(obj);
  const fromInstanceObj = Object.keys(obj);
  const fromInstance = Object.getOwnPropertyNames(obj);
  const fromPrototype = Object.getOwnPropertyNames(Object.getPrototypeOf(obj));

  const keys = [...fromInstanceObj, ...fromInstance, ...fromPrototype];

  const getters = keys
    .map((key) => Object.getOwnPropertyDescriptor(prototype, key))
    .map((descriptor, index) => {
      if (descriptor && typeof descriptor.get === 'function') {
        return keys[index];
      } else {
        return undefined;
      }
    })
    .filter((d) => d !== undefined);

  return getters.reduce<Record<string, unknown>>((accumulator, currentValue) => {
    if (typeof currentValue === 'string' && obj[currentValue]) {
      accumulator[currentValue] = obj[currentValue];
    }
    return accumulator;
  }, {});
}

import {Constructor} from '@orm/types';
import 'reflect-metadata';

export const serializeKey = Symbol('Serialize');

export function Serialize(entityConstructor: Constructor<unknown>): {
  (target: Function): void;
  (target: Object, propertyKey: string | symbol): void;
} {
  return Reflect.metadata(serializeKey, entityConstructor);
}

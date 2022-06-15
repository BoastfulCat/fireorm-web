import 'reflect-metadata';

export const ignoreKey = Symbol('Ignore');

export function Ignore(): {
  (target: Function): void;
  (target: Object, propertyKey: string | symbol): void;
} {
  return Reflect.metadata(ignoreKey, true);
}

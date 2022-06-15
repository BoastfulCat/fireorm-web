import {escapeRegExp} from '../utils';

export const searchKey = Symbol('Search');

const regExpSearch = (search: string, value: string): boolean => {
  return (new RegExp(escapeRegExp(search), 'i')).test(String(value));
};

export function Search(searchFn?: (search: string, value: string) => boolean): {
  (target: Function): void;
  (target: Object, propertyKey: string | symbol): void;
} {
  return Reflect.metadata(searchKey, searchFn ?? regExpSearch);
}

import {filterKey, searchKey} from '@orm/decorators';
import {Entity} from '@orm/types';
import 'reflect-metadata';

export function searchInData<T extends Entity>(search: string | undefined, data: T): boolean {
  if (!search) {
    return true;
  }

  return Object
    .entries(data)
    .filter(([key, value]) => value !== undefined && Reflect.getMetadata(searchKey, data, key) !== undefined)
    .some(([key, value]) => {
      if (Array.isArray(value)) {
        return value.some((item) => searchInData(search, item));
      }

      if (typeof value === 'object' && value !== null) {
        return searchInData(search, value);
      }

      return Reflect.getMetadata(searchKey, data, key)(search, value);
    });
}

export function filterDataByParams<T extends Entity>(filter: { field: string, value: string }[], data: T): boolean {
  if (!filter?.length) {
    return true;
  }

  return Object
    .entries(data)
    .filter(([key, value]) => value !== undefined && Reflect.getMetadata(filterKey, data, key) !== undefined)
    .every(([key, value]) => {
      if (Array.isArray(value)) {
        return value.some((item) => filterDataByParams(filter, item));
      }

      if (typeof value === 'object' && value !== null) {
        return filterDataByParams(filter, value);
      }

      return Reflect.getMetadata(filterKey, data, key)(filter, key, value);
    });
}

// export function postProcess<T extends Entity>(items: T[], config?: PostProcessConfig): T[] {
//   let list = items;
//
//   if (config?.search) {
//     list = items.filter((item) => searchInData(config.search, item));
//   }
//
//   if (config?.filter) {
//     list = items.filter((item) => filterDataByParams(config.filter ?? [], item));
//   }
//
//   if (config?.order) {
//     list = orderBy(list, [config.order.field], [config.order.dir]);
//   }
//
//   return list;
// }

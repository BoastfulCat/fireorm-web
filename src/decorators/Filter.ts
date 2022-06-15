import 'reflect-metadata';

export const filterKey = Symbol('Filter');

const someFilter = (filter: { field: string, value: string }[], key: string, value: string): boolean => {
  const filetForFiled = filter.filter((param) => param.field === key);

  return filetForFiled.length ? filetForFiled.some((param) => String(param.value) === String(value)) : true;
};

export function Filter(filterFn?: (filter: { field: string, value: string }[], key: string, value: string) => boolean): {
  (target: Function): void;
  (target: Object, propertyKey: string | symbol): void;
} {
  return Reflect.metadata(filterKey, filterFn ?? someFilter);
}

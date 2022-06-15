import {Entity, EntityConstructorOrPath} from '@orm/types';

export class NoMetadataError extends Error {
  public constructor(pathOrConstructor: EntityConstructorOrPath<Entity>) {
    super(
      `There is no metadata stored for "${
        typeof pathOrConstructor === 'string' ? pathOrConstructor : pathOrConstructor.name
      }"`,
    );
  }
}

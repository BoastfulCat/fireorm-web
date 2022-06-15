import {MetadataStore} from '@orm/storages';

export {};

declare global {
  /* eslint-disable-next-line */
  var ormmetadata = new MetadataStore();
}

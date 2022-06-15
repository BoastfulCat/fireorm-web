import {MetadataStore} from '@orm/storages';

export {};

declare global {
  var ormmetadata = new MetadataStore();
}

import {Firestore} from '@firebase/firestore';
import {MetadataStore} from '@orm/storages';
import {MetadataStorageConfig} from '@orm/types';

export const initialize = (
  firestore: Firestore,
  config: MetadataStorageConfig,
): void => {
  const metadataStorage = getMetadataStore();

  metadataStorage.firestoreRef = firestore;
  metadataStorage.config = {
    validateModels: false,
    validatorOptions: {},
    transformOptions: {},
    ...config,
  };
};

export function getMetadataStore(): MetadataStore {
  if (!global.ormmetadata) {
    global.ormmetadata = new MetadataStore();
  }

  return global.ormmetadata;

  // if (!MetadataStore.instance) {
  //   MetadataStore.instance = new MetadataStore();
  // }
  //
  // return MetadataStore.instance;
}

import "server-only";

import { localPersistentStorage } from "./local-persistent-storage";

export const storageProvider = localPersistentStorage;
export const writeStorageFile = storageProvider.write.bind(storageProvider);
export const readStorageFile = storageProvider.read.bind(storageProvider);
export const resolveStorageFile = storageProvider.resolve.bind(storageProvider);
export const deleteStorageFile = storageProvider.delete.bind(storageProvider);
export const storageFileExists = storageProvider.exists.bind(storageProvider);

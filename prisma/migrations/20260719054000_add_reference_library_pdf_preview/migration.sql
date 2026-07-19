ALTER TABLE `ReferenceLibraryItem`
  ADD COLUMN `previewStorageKey` VARCHAR(255) NULL,
  ADD COLUMN `previewMimeType` VARCHAR(150) NULL,
  ADD COLUMN `previewSizeBytes` INTEGER NULL,
  ADD COLUMN `previewGeneratedAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `ReferenceLibraryItem_previewStorageKey_key`
  ON `ReferenceLibraryItem`(`previewStorageKey`);
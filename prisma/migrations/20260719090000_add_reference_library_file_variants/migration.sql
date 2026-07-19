ALTER TABLE `ReferenceLibraryItem`
  ADD COLUMN `pdfFileName` VARCHAR(255) NULL,
  ADD COLUMN `pdfStorageKey` VARCHAR(255) NULL,
  ADD COLUMN `pdfMimeType` VARCHAR(150) NULL,
  ADD COLUMN `pdfSizeBytes` INTEGER NULL,
  ADD COLUMN `docxFileName` VARCHAR(255) NULL,
  ADD COLUMN `docxStorageKey` VARCHAR(255) NULL,
  ADD COLUMN `docxMimeType` VARCHAR(150) NULL,
  ADD COLUMN `docxSizeBytes` INTEGER NULL;

CREATE UNIQUE INDEX `ReferenceLibraryItem_pdfStorageKey_key` ON `ReferenceLibraryItem`(`pdfStorageKey`);
CREATE UNIQUE INDEX `ReferenceLibraryItem_docxStorageKey_key` ON `ReferenceLibraryItem`(`docxStorageKey`);

UPDATE `ReferenceLibraryItem`
SET
  `pdfFileName` = `originalFileName`,
  `pdfStorageKey` = `storageKey`,
  `pdfMimeType` = COALESCE(`mimeType`, 'application/pdf'),
  `pdfSizeBytes` = `sizeBytes`
WHERE `itemType` = 'FILE'
  AND `storageKey` IS NOT NULL
  AND (`fileExtension` = 'pdf' OR `mimeType` = 'application/pdf');

UPDATE `ReferenceLibraryItem`
SET
  `docxFileName` = `originalFileName`,
  `docxStorageKey` = `storageKey`,
  `docxMimeType` = COALESCE(`mimeType`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  `docxSizeBytes` = `sizeBytes`
WHERE `itemType` = 'FILE'
  AND `storageKey` IS NOT NULL
  AND (
    `fileExtension` = 'docx'
    OR `mimeType` = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

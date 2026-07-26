-- AlterTable
ALTER TABLE `Workflow`
    ADD COLUMN `originalFileName` VARCHAR(255) NULL,
    ADD COLUMN `originalFileStorageKey` VARCHAR(255) NULL,
    ADD COLUMN `originalFileMimeType` VARCHAR(150) NULL,
    ADD COLUMN `originalFileSize` INTEGER NULL,
    ADD COLUMN `originalFileUploadedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Workflow_originalFileStorageKey_key`
ON `Workflow`(`originalFileStorageKey`);

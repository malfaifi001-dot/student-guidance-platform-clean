CREATE TABLE `GuidanceVideo` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `storageKey` VARCHAR(255) NOT NULL,
  `originalFileName` VARCHAR(255) NOT NULL,
  `mimeType` VARCHAR(100) NOT NULL,
  `sizeBytes` INTEGER NOT NULL,
  `targetRoles` JSON NOT NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `GuidanceVideo_storageKey_key`(`storageKey`),
  INDEX `GuidanceVideo_isPublished_sortOrder_idx`(`isPublished`, `sortOrder`),
  INDEX `GuidanceVideo_createdById_idx`(`createdById`),
  INDEX `GuidanceVideo_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `GuidanceVideo`
  ADD CONSTRAINT `GuidanceVideo_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

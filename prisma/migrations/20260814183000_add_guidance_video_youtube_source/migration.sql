ALTER TABLE `GuidanceVideo`
  ADD COLUMN `sourceType` ENUM('UPLOAD', 'YOUTUBE') NOT NULL DEFAULT 'UPLOAD' AFTER `description`,
  MODIFY COLUMN `storageKey` VARCHAR(255) NULL,
  MODIFY COLUMN `originalFileName` VARCHAR(255) NULL,
  MODIFY COLUMN `mimeType` VARCHAR(100) NULL,
  MODIFY COLUMN `sizeBytes` INTEGER NULL,
  ADD COLUMN `youtubeVideoId` VARCHAR(32) NULL AFTER `sizeBytes`;

CREATE INDEX `GuidanceVideo_sourceType_idx` ON `GuidanceVideo`(`sourceType`);

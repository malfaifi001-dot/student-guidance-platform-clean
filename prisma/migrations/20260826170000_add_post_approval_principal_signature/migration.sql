ALTER TABLE `GuidanceReport`
  ADD COLUMN `principalSignatureUrl` TEXT NULL,
  ADD COLUMN `principalSignatureSignedAt` DATETIME(3) NULL,
  ADD COLUMN `principalSignatureSignedById` VARCHAR(191) NULL;

ALTER TABLE `ReportSnapshot`
  ADD COLUMN `principalSignatureUrl` TEXT NULL,
  ADD COLUMN `principalSignatureSignedAt` DATETIME(3) NULL,
  ADD COLUMN `principalSignatureSignedById` VARCHAR(191) NULL;

ALTER TABLE `ReportTwoActive`
  ADD COLUMN `principalSignatureUrl` TEXT NULL,
  ADD COLUMN `principalSignatureSignedAt` DATETIME(3) NULL,
  ADD COLUMN `principalSignatureSignedById` VARCHAR(191) NULL;

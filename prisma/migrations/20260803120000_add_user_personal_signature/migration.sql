ALTER TABLE `User`
    ADD COLUMN `signatureUrl` TEXT NULL,
    ADD COLUMN `signatureSignedAt` DATETIME(3) NULL;

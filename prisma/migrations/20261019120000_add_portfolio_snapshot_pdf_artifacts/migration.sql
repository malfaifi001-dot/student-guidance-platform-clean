CREATE TABLE `PortfolioSnapshotPdfArtifact` (
  `id` VARCHAR(191) NOT NULL,
  `snapshotId` VARCHAR(191) NOT NULL,
  `contentHash` VARCHAR(64) NOT NULL,
  `status` ENUM('PENDING','PROCESSING','READY','FAILED') NOT NULL DEFAULT 'PENDING',
  `storageKey` VARCHAR(512) NULL,
  `byteSize` INTEGER NULL,
  `attemptCount` INTEGER NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME(3) NULL,
  `leaseExpiresAt` DATETIME(3) NULL,
  `claimToken` VARCHAR(64) NULL,
  `lastError` TEXT NULL,
  `generatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PortfolioSnapshotPdfArtifact_snapshotId_key`(`snapshotId`),
  INDEX `PortfolioSnapshotPdfArtifact_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
  INDEX `PortfolioSnapshotPdfArtifact_leaseExpiresAt_idx`(`leaseExpiresAt`),
  INDEX `PortfolioSnapshotPdfArtifact_contentHash_idx`(`contentHash`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PortfolioSnapshotPdfArtifact_snapshotId_fkey`
    FOREIGN KEY (`snapshotId`) REFERENCES `PortfolioSnapshot`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PortfolioSnapshotShare` (
    `id` VARCHAR(191) NOT NULL,
    `snapshotId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `encryptedToken` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PortfolioSnapshotShare_snapshotId_key`(`snapshotId`),
    UNIQUE INDEX `PortfolioSnapshotShare_tokenHash_key`(`tokenHash`),
    INDEX `PortfolioSnapshotShare_revokedAt_idx`(`revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PortfolioSnapshotShare`
    ADD CONSTRAINT `PortfolioSnapshotShare_snapshotId_fkey`
    FOREIGN KEY (`snapshotId`) REFERENCES `PortfolioSnapshot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

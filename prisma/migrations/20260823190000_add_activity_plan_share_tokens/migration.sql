CREATE TABLE `ActivityPlanShareToken` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `encryptedToken` TEXT NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ActivityPlanShareToken_tokenHash_key`(`tokenHash`),
    INDEX `ActivityPlanShareToken_schoolAccountId_revokedAt_idx`(`schoolAccountId`, `revokedAt`),
    INDEX `ActivityPlanShareToken_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ActivityPlanShareToken`
    ADD CONSTRAINT `ActivityPlanShareToken_schoolAccountId_fkey`
    FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ActivityPlanShareToken`
    ADD CONSTRAINT `ActivityPlanShareToken_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

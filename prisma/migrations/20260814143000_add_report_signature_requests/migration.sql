CREATE TABLE `ReportSignatureRequest` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `requesterDisplayName` VARCHAR(191) NOT NULL,
    `principalName` VARCHAR(191) NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'SIGNED', 'EXPIRED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `reportSnapshot` JSON NOT NULL,
    `signatureUrl` TEXT NULL,
    `consentedToReuse` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `signedAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReportSignatureRequest_tokenHash_key`(`tokenHash`),
    INDEX `ReportSignatureRequest_reportId_status_idx`(`reportId`, `status`),
    INDEX `ReportSignatureRequest_schoolAccountId_status_idx`(`schoolAccountId`, `status`),
    INDEX `ReportSignatureRequest_requestedById_idx`(`requestedById`),
    INDEX `ReportSignatureRequest_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ReportSignatureRequest`
    ADD CONSTRAINT `ReportSignatureRequest_reportId_fkey`
    FOREIGN KEY (`reportId`) REFERENCES `GuidanceReport`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ReportSignatureRequest`
    ADD CONSTRAINT `ReportSignatureRequest_schoolAccountId_fkey`
    FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ReportSignatureRequest`
    ADD CONSTRAINT `ReportSignatureRequest_requestedById_fkey`
    FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

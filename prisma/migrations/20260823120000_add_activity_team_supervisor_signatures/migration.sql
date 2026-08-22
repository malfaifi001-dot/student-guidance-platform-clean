CREATE TABLE `SchoolActivityTeamSupervisorSignature` (
    `id` VARCHAR(191) NOT NULL,
    `activityTeamId` VARCHAR(191) NOT NULL,
    `supervisorName` VARCHAR(160) NOT NULL,
    `fieldKeys` JSON NOT NULL,
    `signatureUrl` TEXT NOT NULL,
    `signedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ActivityTeamSign_uq`(`activityTeamId`, `supervisorName`),
    INDEX `ATS_time_idx`(`activityTeamId`, `signedAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `SchoolActivityTeamSupervisorSignature_activityTeamId_fkey` FOREIGN KEY (`activityTeamId`) REFERENCES `SchoolActivityTeam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

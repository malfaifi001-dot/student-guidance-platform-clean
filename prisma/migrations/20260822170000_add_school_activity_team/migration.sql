CREATE TABLE `SchoolActivityTeam` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NOT NULL,
    `assignments` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SchoolActivityTeam_schoolAccountId_key`(`schoolAccountId`),
    INDEX `SchoolActivityTeam_schoolAccountId_idx`(`schoolAccountId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `SchoolActivityTeam_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SalesExperienceConfig` (
    `id` VARCHAR(191) NOT NULL,
    `singletonKey` VARCHAR(80) NOT NULL,
    `globalMode` ENUM('SERVICE', 'BAG') NOT NULL DEFAULT 'SERVICE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `SalesExperienceConfig_singletonKey_key` (`singletonKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SalesExperienceUserOverride` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `mode` ENUM('SERVICE', 'BAG') NOT NULL DEFAULT 'BAG',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `SalesExperienceUserOverride_userId_key` (`userId`),
    INDEX `SalesExperienceUserOverride_mode_idx` (`mode`),
    CONSTRAINT `SalesExperienceUserOverride_userId_fkey`
      FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

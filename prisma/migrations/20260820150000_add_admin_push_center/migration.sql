CREATE TABLE `PushCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `title` VARCHAR(120) NOT NULL,
    `body` TEXT NOT NULL,
    `route` VARCHAR(255) NOT NULL,
    `type` ENUM('MANUAL', 'SCHEDULED', 'RECURRING', 'AUTOMATIC', 'SYSTEM_TEST') NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PROCESSING', 'SENT', 'PARTIALLY_FAILED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `audienceType` ENUM('ALL_USERS', 'ROLE', 'USER', 'USERS', 'SCHOOL') NOT NULL,
    `audienceConfig` JSON NOT NULL,
    `internalNote` TEXT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `timezone` VARCHAR(80) NULL,
    `recurrenceFrequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'WEEKDAYS') NULL,
    `recurrenceDays` JSON NULL,
    `recurrenceEndAt` DATETIME(3) NULL,
    `recurrenceActive` BOOLEAN NOT NULL DEFAULT false,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `estimatedUserCount` INTEGER NOT NULL DEFAULT 0,
    `estimatedDeviceCount` INTEGER NOT NULL DEFAULT 0,
    `sentCount` INTEGER NOT NULL DEFAULT 0,
    `successCount` INTEGER NOT NULL DEFAULT 0,
    `failureCount` INTEGER NOT NULL DEFAULT 0,
    `openedCount` INTEGER NOT NULL DEFAULT 0,
    `lastErrorCode` VARCHAR(120) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `PushCampaign_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `PushCampaign_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `PushCampaign_createdById_createdAt_idx`(`createdById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PushAutomaticRule` (
    `id` VARCHAR(191) NOT NULL,
    `triggerKey` VARCHAR(120) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `audienceType` ENUM('ALL_USERS', 'ROLE', 'USER', 'USERS', 'SCHOOL') NOT NULL,
    `audienceConfig` JSON NOT NULL,
    `titleTemplate` VARCHAR(120) NOT NULL,
    `bodyTemplate` TEXT NOT NULL,
    `route` VARCHAR(255) NOT NULL,
    `lastTriggeredAt` DATETIME(3) NULL,
    `totalSends` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PushAutomaticRule_triggerKey_key`(`triggerKey`),
    INDEX `PushAutomaticRule_enabled_triggerKey_idx`(`enabled`, `triggerKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PushTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `body` TEXT NOT NULL,
    `route` VARCHAR(255) NOT NULL,
    `type` ENUM('MANUAL', 'SCHEDULED', 'RECURRING', 'AUTOMATIC', 'SYSTEM_TEST') NOT NULL DEFAULT 'MANUAL',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PushTemplate_name_key`(`name`),
    INDEX `PushTemplate_enabled_createdAt_idx`(`enabled`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PushDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attemptedAt` DATETIME(3) NULL,
    `firebaseMessageId` VARCHAR(255) NULL,
    `errorCode` VARCHAR(120) NULL,
    `invalidToken` BOOLEAN NOT NULL DEFAULT false,
    `openedAt` DATETIME(3) NULL,
    `openedRoute` VARCHAR(255) NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PushDelivery_campaignId_deviceId_key`(`campaignId`, `deviceId`),
    INDEX `PushDelivery_campaignId_status_idx`(`campaignId`, `status`),
    INDEX `PushDelivery_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `PushDelivery_deviceId_createdAt_idx`(`deviceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PushCampaign`
    ADD CONSTRAINT `PushCampaign_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PushAutomaticRule`
    ADD CONSTRAINT `PushAutomaticRule_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PushTemplate`
    ADD CONSTRAINT `PushTemplate_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PushDelivery`
    ADD CONSTRAINT `PushDelivery_campaignId_fkey`
    FOREIGN KEY (`campaignId`) REFERENCES `PushCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PushDelivery_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PushDelivery_deviceId_fkey`
    FOREIGN KEY (`deviceId`) REFERENCES `PushDevice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

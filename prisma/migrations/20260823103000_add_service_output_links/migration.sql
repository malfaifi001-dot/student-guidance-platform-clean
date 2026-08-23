CREATE TABLE `ServiceOutputLink` (
    `id` VARCHAR(191) NOT NULL,
    `schoolAccountId` VARCHAR(191) NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `roleKey` VARCHAR(40) NOT NULL,
    `serviceSlug` VARCHAR(120) NOT NULL,
    `performanceItemKey` VARCHAR(180) NOT NULL,
    `resourceType` VARCHAR(80) NOT NULL,
    `sourceKey` VARCHAR(255) NOT NULL,
    `sourceReferenceJson` JSON NOT NULL,
    `displayTitle` VARCHAR(255) NOT NULL,
    `metadataJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceOutputLink_owner_scope_source_key`(`ownerUserId`, `roleKey`, `performanceItemKey`, `serviceSlug`, `resourceType`, `sourceKey`),
    INDEX `ServiceOutputLink_owner_performance_idx`(`ownerUserId`, `roleKey`, `performanceItemKey`),
    INDEX `ServiceOutputLink_school_service_idx`(`schoolAccountId`, `serviceSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ServiceOutputLink` ADD CONSTRAINT `ServiceOutputLink_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
